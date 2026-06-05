# Technology Stack

**Analysis Date:** 2026-06-05

## Languages

**Primary:**
- TypeScript 5.5.3 — all frontend components, hooks, services, API handlers
- SQL — database migrations and RLS policies in `sql/migrations/` and `supabase/`

**Secondary:**
- JavaScript (JSX via React plugin) — React component templates compiled by Vite
- Deno TypeScript — Supabase Edge Functions in `supabase/functions/` (uses `https://esm.sh` imports, `Deno.serve`)

## Runtime

**Environment:**
- Node.js — inferred from `"type": "module"` in `package.json`, ES2022 target in `tsconfig.json`
- Deno — Supabase Edge Functions runtime (`supabase/functions/*`)
- Browser (ES2022 + DOM) — compiled frontend bundle

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present and committed

## Frameworks

**Core:**
- React 18.3.1 — UI component framework, all UI in `components/`
- React Router DOM 6.23.1 — imported but navigation handled via `NavigationContext` (`contexts/`), not URL-based routing; used only for `BrowserRouter` provider at root

**State / Data:**
- TanStack React Query 5.90.21 — server state caching with 5-minute staleTime; hooks in `hooks/`
- Zustand 5.0.11 — global client state; store at `src/store/useAppStore.ts`

**Build / Dev:**
- Vite 5.3.4 — dev server, build tool; config at `vite.config.ts`
- @vitejs/plugin-react 4.3.1 — JSX compilation
- vite-plugin-pwa 1.2.0 — service worker / PWA manifest (registered but superseded by native browser PWA)
- Tailwind CSS 3.4.6 — utility-first CSS, no separate CSS files; config at `tailwind.config.js`
- PostCSS 8.4.39 — CSS processing; config at `postcss.config.js`
- Autoprefixer 10.4.19 — vendor prefix injection

**Serverless API:**
- @vercel/node 5.6.12 — Vercel Serverless Functions runtime for all `api/` handlers (`VercelRequest`, `VercelResponse`)
- Express 5.2.1 — available as middleware dependency; used in dev context only

**TypeScript Tooling:**
- tsx 4.21.0 — TypeScript executor for Node.js scripts
- TypeScript compiler (`tsc --noEmit`) — used as the only lint step via `npm run lint`

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.98.0 — PostgreSQL client, auth, realtime; singleton in `supabaseClient.ts`
- @supabase/postgrest-js 2.97.0 — REST API client (transitive, pinned)
- react-hot-toast 2.6.0 — toast notification system; used throughout for UX feedback
- @google/generative-ai 0.24.1 — Google Gemini SDK; used in `services/` for embeddings (RAG)

**UI & Visualization:**
- lucide-react 0.400.0 — icon library
- recharts 2.15.4 — chart rendering for financial reports (`components/Plati/`)
- motion 12.34.5 — animation library
- react-easy-crop 5.5.6 — avatar/photo cropping UI

**Utilities:**
- clsx 2.1.1 — conditional className composition
- tailwind-merge 2.3.0 — merge Tailwind class names without conflicts
- date-fns 4.1.0 — date manipulation and formatting throughout components
- jsPDF 4.2.1 + jspdf-autotable 5.0.7 — PDF document generation (invoices, reports)
- xlsx 0.18.5 — Excel import/export for sportivi and examene
- PapaParse 5.4.1 — CSV parsing and generation

## Configuration

**Path aliases (`tsconfig.json` and `vite.config.ts`):**
- `@components/*` -> `./components/*`
- `@hooks/*` -> `./hooks/*`
- `@contexts/*` -> `./contexts/*`
- `@/*` -> `./*`

**Environment variables:**

| Variable | Used in | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `supabaseClient.ts`, `api/` handlers | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `supabaseClient.ts` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | All `api/` handlers | Supabase admin operations (bypasses RLS) |
| `CLAUDE_API_KEY` | `api/claude-proxy.ts`, `vite.config.ts` dev plugin | Anthropic Claude API |
| `GEMINI_API_KEY` | `api/gemini-proxy.ts`, `api/rag-index.ts`, `api/rag-search.ts` | Google Gemini API |
| `GROQ_API_KEY` | `api/groq-proxy.ts` | Groq LLM API |
| `RAG_INDEX_SECRET` | `api/rag-index.ts` | Shared secret for RAG indexing (header `x-index-secret`) |
| `SMS_CALLBACK_SECRET` | `supabase/functions/sms-callback/` | HMAC validation for SMS delivery webhooks |
| `ANDROID_GATEWAY_URL` | SMS config via DB | Custom Android SMS gateway endpoint |
| `ANDROID_GATEWAY_TOKEN` | SMS config via DB | Bearer token for Android SMS gateway |

**Build config:** `vite.config.ts` — manual chunk splitting into `vendor-react`, `vendor-query`, `vendor-supabase`, `vendor-charts`, `vendor-motion`, `vendor-pdf`, `vendor-xlsx`, `vendor-ui`

**Deployment config:** `vercel.json` — SPA rewrite `/* -> /index.html`, HSTS header, immutable cache for `/assets/`, no-cache for `index.html`

## TypeScript Configuration

- `tsconfig.json` — `strict: false` (flexible types), target ES2022, `noEmit: true` (build handled by Vite)
- Includes: `src`, `components`, `utils`, `hooks`, `contexts`, `types.ts`, `supabaseClient.ts`
- Excludes: `node_modules`, `scripts`
- Single type file: `types.ts` at root — all domain types centralized; import via `import type { X } from '../types'`

## Platform Requirements

**Development:**
- Node.js (ES2022 compatible)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` required to start

**Production:**
- Vercel (configured via `vercel.json`)
- Vercel Node.js Serverless Functions for all `api/` handlers
- Static assets served via Vercel CDN
- Supabase Edge Functions (Deno runtime) for SMS queue processing and push notifications

## Notable Missing Tools

- **No ESLint or Prettier** — zero linting/formatting tooling; only `tsc --noEmit` as lint step
- **No test framework** — `tests/` directory exists at project root but no Jest, Vitest, or other runner configured in `package.json`
- **No Husky or pre-commit hooks** — no automated quality gates on commit
- **No Storybook** — no component isolation environment

---

*Stack analysis: 2026-06-05*
