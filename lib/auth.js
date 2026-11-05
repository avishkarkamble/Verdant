import crypto from 'crypto';

const sign = (data) =>
  crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(data).digest('base64url');

const hashEq = (a, b) =>
  crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(a)).digest(),
    crypto.createHash('sha256').update(String(b)).digest()
  );

export function checkLogin(email, password) {
  const a = hashEq(email, process.env.AGENT_EMAIL || '');
  const b = hashEq(password, process.env.AGENT_PASSWORD || '');
  return a && b && !!process.env.AGENT_PASSWORD;
}

export function makeToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 8 * 3600 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function isAgent(req) {
  const token = req.cookies.get('session')?.value;
  if (!token || !process.env.SESSION_SECRET) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function verifySignature(rawBody, header) {
  const expected =
    'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET || '').update(rawBody).digest('hex');
  const got = header || '';
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
