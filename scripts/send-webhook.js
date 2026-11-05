// Usage: node scripts/send-webhook.js <base-url> "<message text>" [event_id]
// Example: node scripts/send-webhook.js http://localhost:3000 "What is your return policy?"
const crypto = require('crypto');
const [baseUrl, text, eventId] = process.argv.slice(2);
if (!baseUrl || !text) { console.log('Usage: node scripts/send-webhook.js <base-url> "<message>" [event_id]'); process.exit(1); }

const body = JSON.stringify({
  event_id: eventId || 'evt_' + crypto.randomBytes(4).toString('hex'),
  type: 'message.received',
  brand_id: 'verdant-co',
  timestamp: new Date().toISOString(),
  customer: { id: 'cust_1042', name: 'Aisha Khan', phone: '+919800000001' },
  message: { id: 'msg_' + crypto.randomBytes(4).toString('hex'), type: 'text', text },
});
const sig = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET || 'verdant-demo-secret-2026').update(body).digest('hex');

fetch(baseUrl.replace(/\/$/, '') + '/api/webhook', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig }, body,
}).then(async (r) => console.log(r.status, await r.text()));
