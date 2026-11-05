import postgres from 'postgres';

// Reuse one connection pool (important on serverless + in dev reloads).
const g = globalThis;
if (!g._sql) {
  g._sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    prepare: false, // required for Supabase transaction pooler
    max: 3,
    idle_timeout: 20,
  });
}
export const sql = g._sql;
