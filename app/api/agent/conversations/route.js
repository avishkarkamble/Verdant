import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db.js';
import { isAgent } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isAgent(req)) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const conversations = await sql`
    select c.id, cu.name, cu.phone, c.last_message_at,
      (select text from messages m where m.conversation_id = c.id order by m.id desc limit 1) as preview,
      exists (select 1 from drafts d where d.conversation_id = c.id and d.status <> 'used') as awaiting_reply
    from conversations c join customers cu on cu.id = c.customer_id
    where c.brand_id = ${process.env.BRAND_ID || 'verdant-co'} and c.status = 'open'
    order by c.last_message_at desc limit 100`;
  return NextResponse.json({ conversations });
}
