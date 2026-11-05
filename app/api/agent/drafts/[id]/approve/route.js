import { NextResponse } from 'next/server';
import { sql } from '../../../../../../lib/db.js';
import { isAgent } from '../../../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  if (!isAgent(req)) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const id = Number(params.id);
  const { text } = await req.json().catch(() => ({}));
  const reply = String(text || '').trim();
  if (!Number.isInteger(id) || !reply) return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });
  if (reply.length > 4000) return NextResponse.json({ error: 'Reply too long' }, { status: 400 });

  const ok = await sql.begin(async (tx) => {
    // only the first click wins: double-clicks and two agents can't send twice
    const [d] = await tx`update drafts set status = 'used', used_at = now()
                         where id = ${id} and status <> 'used' returning conversation_id`;
    if (!d) return false;
    await tx`insert into messages (conversation_id, sender, text) values (${d.conversation_id}, 'agent', ${reply})`;
    await tx`update conversations set last_message_at = now() where id = ${d.conversation_id}`;
    return true;
  });
  if (!ok) return NextResponse.json({ error: 'This draft was already approved.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
