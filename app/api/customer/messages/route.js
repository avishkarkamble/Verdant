import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db.js';

export const dynamic = 'force-dynamic';

// Customers only ever receive messages here, never drafts.
export async function GET(req) {
  const phone = (new URL(req.url).searchParams.get('phone') || '').replace(/\D/g, '');
  if (!phone) return NextResponse.json({ messages: [] });
  const messages = await sql`
    select m.id, m.sender, m.text, m.created_at
    from messages m
    join conversations c on c.id = m.conversation_id and c.status = 'open'
    join customers cu on cu.id = c.customer_id
    where cu.brand_id = ${process.env.BRAND_ID || 'verdant-co'} and cu.external_id = ${'cust_' + phone}
    order by m.id`;
  return NextResponse.json({ messages });
}
