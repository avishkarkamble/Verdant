# Verdant & Co Support Tool

Customers message the brand (webhook or the built-in Customer view), an LLM drafts a reply from the knowledge base, and a signed-in agent edits and approves it.

**Live app:** <PASTE VERCEL URL> | **Webhook:** `<PASTE VERCEL URL>/api/webhook` | **Agent login:** <email> / <password>

## Run locally
1. Install Node.js 18+. Run `npm install`.
2. Create a free Supabase project. In its SQL Editor, run all of `schema.sql`.
3. Copy `.env.example` to `.env.local` and fill it in (Supabase pooler URL, free Gemini key, agent login, session secret).
4. `npm run dev`, then open http://localhost:3000.
5. Test the webhook: `node scripts/send-webhook.js http://localhost:3000 "What is your return policy?"`

## Decisions
- **Next.js + Supabase Postgres + Gemini free tier:** one codebase (React UI and API), one deploy, free tiers. Raw SQL via `postgres` keeps data access easy to read.
- **Whole KB in the prompt:** it is 7 lines. This stops working when the KB no longer fits comfortably in the prompt (roughly dozens of pages) or per-brand KBs grow; then I would use embeddings and retrieve top chunks.
- **Webhook:** HMAC-SHA256 checked on the raw body with constant-time compare; `unique(brand_id, event_id)` makes retries harmless; the message is saved before the AI is called, so an AI failure never loses a message or fails the webhook.
- **Draft states:** pending / ready / failed / used. Approve is one transaction that only the first click can win.
- **AI rules:** KB-only, no invented order status, asks when information is missing, flags `needs_human` for out-of-KB questions (Dubai) and health issues (allergy).
- **Auth:** single agent from environment variables and a signed, httpOnly cookie.
- **Cut for time:** multiple agents/roles, realtime (it polls every 4s), rate limiting, automated tests, customer-view authentication.

## AI help
<WRITE HONESTLY: which tool you used, for what, and ONE real mistake it made that you caught and fixed.>

## Two questions
**1. A message arrives at 2 a.m. and something fails.** The message is saved before the AI is called, so the agent sees it in the morning. If the AI failed, the draft shows "draft unavailable" with a Regenerate button and room to type manually; a draft stuck in "pending" for 2 minutes is also shown as failed. To find the cause, I check the `webhook_events` table (raw payload) and the structured error logs, plus the `drafts.error` column, using the event_id.

**2. 20 brands, each with its own KB and agents.** First, tenant isolation: add `brand_id` everywhere (already in the schema) plus a `brands` table, per-brand KB and agent tables, and Postgres row-level security so one brand can never see another's data. Next, move AI drafting to a queue so one busy brand can't slow the others, and use retrieval for larger KBs.
