import { sql } from './db.js';
import { generateDraft } from './llm.js';

// Used by BOTH the webhook and the Customer view, so they behave identically.
export async function ingest({ brandId, eventId, customer, message, raw }) {
  const saved = await sql.begin(async (tx) => {
    // 1. log the event; a duplicate event_id stops here (idempotency)
    const ev = await tx`
      insert into webhook_events (brand_id, event_id, raw)
      values (${brandId}, ${eventId}, ${tx.json(raw)})
      on conflict (brand_id, event_id) do nothing returning id`;
    if (ev.length === 0) return null;

    // 2. customer (create or update name/phone)
    const [cu] = await tx`
      insert into customers (brand_id, external_id, name, phone)
      values (${brandId}, ${customer.id}, ${customer.name}, ${customer.phone})
      on conflict (brand_id, external_id) do update set name = excluded.name, phone = excluded.phone
      returning id`;

    // 3. the one open conversation (create if missing)
    await tx`
      insert into conversations (brand_id, customer_id) values (${brandId}, ${cu.id})
      on conflict (customer_id) where status = 'open' do nothing`;
    const [conv] = await tx`select id from conversations where customer_id = ${cu.id} and status = 'open'`;

    // 4. message + pending draft + bump activity time
    const [msg] = await tx`
      insert into messages (conversation_id, external_id, sender, text)
      values (${conv.id}, ${message.id}, 'customer', ${message.text}) returning id`;
    const [dr] = await tx`
      insert into drafts (message_id, conversation_id) values (${msg.id}, ${conv.id}) returning id`;
    await tx`update conversations set last_message_at = now() where id = ${conv.id}`;
    return { draftId: dr.id };
  });

  if (!saved) return { duplicate: true };
  // Message is safely stored. A failing AI must never lose it or fail the webhook.
  await runDraft(saved.draftId);
  return { duplicate: false };
}

export async function runDraft(draftId) {
  const [d] = await sql`
    select d.id, d.conversation_id, d.message_id, d.status, cu.name
    from drafts d join conversations c on c.id = d.conversation_id
    join customers cu on cu.id = c.customer_id where d.id = ${draftId}`;
  if (!d || d.status === 'used') return;
  try {
    const rows = await sql`
      select sender, text from messages
      where conversation_id = ${d.conversation_id} and id <= ${d.message_id}
      order by id desc limit 10`;
    const out = await generateDraft(rows.reverse(), d.name);
    await sql`update drafts set text = ${out.reply}, needs_human = ${out.needs_human},
              reason = ${out.reason}, status = 'ready', error = null where id = ${draftId} and status <> 'used'`;
  } catch (e) {
    console.error(JSON.stringify({ evt: 'draft_failed', draftId, error: e.message }));
    await sql`update drafts set status = 'failed', error = ${String(e.message).slice(0, 500)}
              where id = ${draftId} and status <> 'used'`;
  }
}
