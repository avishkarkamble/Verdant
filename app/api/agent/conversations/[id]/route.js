import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db.js';
import { isAgent } from '../../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  if (!isAgent(req)) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const [customer] = await sql`
    select cu.name, cu.phone from conversations c join customers cu on cu.id = c.customer_id where c.id = ${id}`;
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const messages = await sql`select id, sender, text, created_at from messages where conversation_id = ${id} order by id`;
  // A draft stuck in "pending" for over 2 minutes means the server died mid-way: show it as failed.
  const [draft] = await sql`
    select id, text, needs_human, reason, error,
      case when status = 'pending' and created_at < now() - interval '2 minutes' then 'failed' else status end as status
    from drafts where conversation_id = ${id} and status <> 'used' order by id desc limit 1`;
  return NextResponse.json({ customer, messages, draft: draft || null });
}
