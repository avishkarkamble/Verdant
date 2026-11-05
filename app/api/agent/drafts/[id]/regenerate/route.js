import { NextResponse } from 'next/server';
import { sql } from '../../../../../../lib/db.js';
import { isAgent } from '../../../../../../lib/auth.js';
import { runDraft } from '../../../../../../lib/ingest.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req, { params }) {
  if (!isAgent(req)) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  await sql`update drafts set status = 'pending', created_at = now() where id = ${id} and status <> 'used'`;
  await runDraft(id);
  return NextResponse.json({ ok: true });
}
