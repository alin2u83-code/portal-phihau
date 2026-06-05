# External Integrations

**Analysis Date:** 2026-06-05

## APIs & External Services

**AI / LLM (three parallel providers — selected at runtime):**
- **Anthropic Claude** — AI Assistant chat responses
  - Model: `claude-haiku-4-5`
  - Proxy: `api/claude-proxy.ts` → `https://api.anthropic.com/v1/messages`
  - Auth: `CLAUDE_API_KEY` (server-side only)
- **Google Gemini** — AI Assistant chat responses + RAG embeddings
  - Chat model: `gemini-2.0-flash` via `api/gemini-proxy.ts`
  - Embedding model: `gemini-embedding-001` (1536 dims) via `api/rag-search.ts` and `api/rag-index.ts`
  - Auth: `GEMINI_API_KEY` (server-side only)
  - SDK: `@google/generative-ai 0.24.1`
- **Groq** — Alternative LLM provider (OpenAI-compatible API)
  - Model: `llama-3.3-70b-versatile`
  - Proxy: `api/groq-proxy.ts` → `https://api.groq.com/openai/v1/chat/completions`
  - Auth: `GROQ_API_KEY` (server-side only)

**SMS Gateway:**
- **Android Gateway (primary)** — Custom Android device acting as SMS gateway
  - REST API: `{ANDROID_GATEWAY_URL}/v1/message` with Bearer token
  - Auth: `ANDROID_GATEWAY_TOKEN`
  - Provider type: `SMS_PROVIDER=android_gateway`
- **smslink / Twilio / Vonage** — Alternative SMS providers (config-driven, not yet active)
  - Provider selection: `SMS_PROVIDER` env var
  - Per-club config stored in `sms_config` table (columns: `provider`, `gateway_url`, `api_key`, `activ`)
  - Webhook validation: `SMS_CALLBACK_SECRET` (HMAC)
- SMS queue managed via Supabase RPC `add_sms_to_queue`
- Status tracking in `sms_queue` table
- API handlers: `api/sms-send.ts`, `api/sms-status.ts`, `api/sms-test-connection.ts`

## Data Storage

**Databases:**
- **Supabase (PostgreSQL)**
  - Client connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (frontend)
  - Service role: `SUPABASE_SERVICE_ROLE_KEY` (API handlers — bypasses RLS)
  - Client file: `supabaseClient.ts` — injects `active-role-context-id` header on every request
  - ORM: `@supabase/supabase-js 2.98.0` + `@supabase/postgrest-js 2.97.0`
  - RLS: Row-level security enforced via `active-role-context-id` header read in policies
  - pgvector: Used for RAG knowledge base — `match_knowledge_base` SQL function does cosine similarity search

**File Storage:**
- Supabase Storage (inferred — avatar/photo cropping UI present via `react-easy-crop`)
- Local filesystem: Not used for persistence

**Caching:**
- React Query v5 client-side cache (staleTime 5 min default)
- No Redis or server-side cache

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (JWT-based, PostgreSQL-backed)
- Session persistence: `localStorage` via Supabase client (`persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`)
- Active role stored in `localStorage` key `phi-hau-active-role-context-id`
- Force password change flag: `trebuie_schimbata_parola` column on user record
- Password reset flow: `api/reset-parola-sportiv.ts`
- Email change flow: `api/schimba-email.ts`
- Username change flow: `api/schimba-username.ts`
- Account creation: `api/creare-cont.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or equivalent)

**Logs:**
- `console.error` / `console.debug` in API handlers and services
- Vercel Function logs (automatic, available in Vercel dashboard)

## CI/CD & Deployment

**Hosting:**
- Vercel — static SPA + Node.js Serverless Functions
- Config: `vercel.json` — SPA rewrite (`/*` → `/index.html`), HSTS headers, immutable asset caching for `/assets/*`

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc. in repo root)

**Build:**
- Vite 5.3.4 (`npm run build`)
- TypeScript type check: `tsc --noEmit` (`npm run lint`)

## RAG / Knowledge Base

**Pipeline:**
1. Indexing: `api/rag-index.ts` — takes text chunks, generates Gemini embeddings, stores in Supabase `knowledge_base` table
2. Search: `api/rag-search.ts` — embeds query with Gemini, calls `match_knowledge_base` SQL RPC with cosine similarity threshold (default 0.60, top 4 results)
3. Client: `services/ragService.ts` — calls `/api/rag-search`, formats results as context block for LLM
4. Secret: `RAG_INDEX_SECRET` — shared secret protecting the indexing endpoint

## Webhooks & Callbacks

**Incoming:**
- `POST /api/sms-send` — enqueue SMS (internal, called from frontend)
- `GET /api/sms-status` — read SMS queue status (internal)
- `POST /api/sms-test-connection` — live gateway connectivity test
- SMS delivery callbacks (inbound webhook) — validated via `SMS_CALLBACK_SECRET` HMAC

**Outgoing:**
- SMS messages sent to Android Gateway or configured provider
- Gemini embedding API calls (server-to-server, during RAG index/search)
- Claude / Gemini / Groq chat API calls (server-to-server, proxied from frontend)

## Environment Configuration

**Required env vars (frontend — prefixed `VITE_`):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

**Required env vars (server-side API handlers):**
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for admin operations
- `GEMINI_API_KEY` — embeddings + chat (mandatory for RAG)
- `CLAUDE_API_KEY` — Claude chat (optional; falls back to Gemini/Groq)
- `GROQ_API_KEY` — Groq LLM (optional alternative)
- `RAG_INDEX_SECRET` — protects indexing endpoint

**SMS env vars (optional, per deployment):**
- `SMS_PROVIDER` — provider type: `android_gateway` | `smslink` | `twilio` | `vonage`
- `SMS_CALLBACK_SECRET` — HMAC for webhook validation
- `ANDROID_GATEWAY_URL` — Android SMS gateway base URL
- `ANDROID_GATEWAY_TOKEN` — Bearer token for Android gateway

**Secrets location:**
- `.env` file (not committed); Vercel Environment Variables for production

---

*Integration audit: 2026-06-05*
