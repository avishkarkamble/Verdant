import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ingest } from '../../../../lib/ingest.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 100);
  const phone = String(b.phone || '').trim();
  const text = String(b.text || '').trim();
  if (!name || !/^\+?[0-9]{7,15}$/.test(phone) || !text) {
    return NextResponse.json({ error: 'Name, valid phone and message are required.' }, { status: 400 });
  }
  if (text.length > 2000) return NextResponse.json({ error: 'Message too long.' }, { status: 400 });

  const customerId = 'cust_' + phone.replace(/\D/g, ''); // same phone = same customer
  const eventId = 'evt_' + crypto.randomUUID();
  const brandId = process.env.BRAND_ID || 'verdant-co';
  const payload = {
    event_id: eventId, type: 'message.received', brand_id: brandId, timestamp: new Date().toISOString(),
    customer: { id: customerId, name, phone },
    message: { id: 'msg_' + crypto.randomUUID(), type: 'text', text },
  };
  try {
    await ingest({ brandId, eventId, customer: payload.customer, message: payload.message, raw: payload });
    return NextResponse.json({ ok: true, customerId });
  } catch (e) {
    console.error(JSON.stringify({ evt: 'customer_send_failed', error: e.message }));
    return NextResponse.json({ error: 'Could not send. Please try again.' }, { status: 500 });
  }
}
