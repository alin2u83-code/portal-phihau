# INTEGRATIONS.md — Portal PhiHau

**Mapped:** 2026-06-04 | **Focus:** tech/integrations

---

## Supabase (Core)

**Role:** DB + Auth + RLS + Vector storage

- PostgreSQL cu pgvector (RAG embeddings)
- Row Level Security pe toate tabelele — `active-role-context-id` header inject din `supabaseClient.ts`
- Auth: email/password, session management
- RPC functions custom: SMS queuing, knowledge base search, calcule financiare
- Realtime: nu e folosit activ

**Client:** `src/supabaseClient.ts` — singleton cu header interceptor

---

## AI / LLM

| Provider | Scop | Model |
|---|---|---|
| Google Gemini | Embeddings RAG, text generation | gemini-embedding-004 |
| Groq | LLM rapid | llama-3.3-70b-versatile |
| Anthropic Claude | LLM alternativ | via API |

**Pattern:** Proxy handlers Vercel (`/api/`) — nu se apelează direct din browser

**RAG:** Gemini embeddings + pgvector similarity search + Claude pentru răspuns

---

## SMS Gateway

Sistem configurabil cu 4 provider-i suportați:

```typescript
type SMSProvider = 'android_gateway' | 'smslink' | 'twilio' | 'vonage'
```

SMS queuing prin Supabase RPC, trimitere via edge functions.

---

## Vercel

**Role:** Deploy + hosting + serverless functions

- Node.js serverless functions în `/api/` (proxy AI, SMS, webhook handlers)
- Deploy automat din `main` branch
- Environment variables via Vercel dashboard

---

## File Processing

| Library | Scop |
|---|---|
| `xlsx` | Import/export Excel |
| `PapaParse` | Import CSV |
| `jsPDF` | Generare PDF rapoarte |
| `Recharts` | Charts/grafice |

---

## No External Payment Gateway

Plățile sunt gestionate intern (portofel sportiv). Nu există integrare Stripe/Netopia (planificat în fazele viitoare — vezi `docs/HARTA_APLICATIE.md`).
