import { NextResponse } from 'next/server';
import { verifySignature } from '../../../lib/auth.js';
import { ingest } from '../../../lib/ingest.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req) {
  const raw = await req.text(); // raw body: the signature is computed over exactly this
  if (!verifySignature(raw, req.headers.get('x-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (body?.type !== 'message.received') return NextResponse.json({ ok: true, ignored: 'event type' });
  if (body?.message?.type !== 'text') return NextResponse.json({ ok: true, ignored: 'non-text message' });

  const { event_id, brand_id, customer, message } = body;
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  if (!event_id || !customer?.id || !customer?.name || !customer?.phone || !message.id || !text) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  if (text.length > 2000) return NextResponse.json({ error: 'message too long' }, { status: 400 });
  if (brand_id !== (process.env.BRAND_ID || 'verdant-co')) {
    return NextResponse.json({ error: 'unknown brand' }, { status: 400 });
  }

  try {
    const r = await ingest({
      brandId: brand_id,
      eventId: event_id,
      customer: { id: String(customer.id), name: String(customer.name).slice(0, 100), phone: String(customer.phone).slice(0, 30) },
      message: { id: String(message.id), text },
      raw: body,
    });
    return NextResponse.json({ ok: true, duplicate: r.duplicate });
  } catch (e) {
    console.error(JSON.stringify({ evt: 'webhook_failed', event_id, error: e.message }));
    return NextResponse.json({ error: 'server error' }, { status: 500 }); // sender can safely retry
  }
}
