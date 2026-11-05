import { NextResponse } from 'next/server';
import { checkLogin, makeToken } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!checkLogin(email || '', password || '')) {
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', makeToken(email), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 3600,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', '', { path: '/', maxAge: 0 });
  return res;
}
