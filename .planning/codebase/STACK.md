# Technology Stack

**Analysis Date:** 2026-06-04

## Languages

**Primary:**
- TypeScript 5.5.3 - Application frontend, backend API handlers, type definitions
- JavaScript (via JSX) - React component templates

**Secondary:**
- SQL - Database migrations and RLS policies in `sql/` directory

## Runtime

**Environment:**
- Node.js (inferred from package.json type: "module" and API handlers)

**Package Manager:**
- npm (package-lock.json present, lockfile committed)

## Frameworks

**Core:**
- React 18.3.1 - UI component framework
- React Router DOM 6.23.1 - Client-side routing (SPA mode, not URL-based)
- Vite 5.3.4 - Build tool and dev server

**State Management:**
- TanStack React Query 5.90.21 - Server state caching, data synchronization
- Zustand 5.0.11 - Global application state (`src/store/useAppStore.ts`)

**Backend/Serverless:**
- Vercel Node.js runtime (via `@vercel/node` v5.6.12) - API endpoint execution

**Testing:**
- TypeScript compiler for type checking (via `lint` script running `tsc --noEmit`)

**Build/Dev:**
- @vitejs/plugin-react 4.3.1 - React JSX compilation for Vite
- Tailwind CSS 3.4.6 - Utility-first CSS styling
- PostCSS 8.4.39 - CSS processing (paired with Tailwind)
- Autoprefixer 10.4.19 - Browser vendor prefix injection

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.98.0 - PostgreSQL database client with auth integration
- @supabase/postgrest-js 2.97.0 - Supabase REST API client
- react-hot-toast 2.6.0 - Toast notification system (critical for UX feedback)

**Infrastructure:**
- @google/generative-ai 0.24.1 - Google Gemini API integration for embeddings and text generation
- express 5.2.1 - API middleware (used in development/serverless context)
- tsx 4.21.0 - TypeScript executor for Node.js

**UI & Visualization:**
- Lucide-react 0.400.0 - Icon library
- Recharts 2.15.4 - Chart/graph rendering for financial reports
- Motion 12.34.5 - Animation library
- clsx 2.1.1 - Conditional className utility

**Data Handling:**
- xlsx 0.18.5 - Excel file import/export
- PapaParse 5.4.1 - CSV parsing and generation
- date-fns 4.1.0 - Date manipulation and formatting

**PDF Generation:**
- jsPDF 4.2.1 - PDF document creation
- jspdf-autotable 5.0.7 - Table generation in PDF documents

**Image Cropping:**
- react-easy-crop 5.5.6 - User photo/avatar cropping UI

**CSS Utilities:**
- tailwind-merge 2.3.0 - Merge Tailwind CSS class names intelligently

**PWA (Legacy):**
- vite-plugin-pwa 1.2.0 - Progressive Web App support (service workers registered but deprecated in favor of native browser PWA)

## Configuration

**Environment:**
- Variables loaded via `.env` file
- Client-side environment variables prefixed with `VITE_` (Vite convention)
- Server-side environment variables accessible via `process.env` in API handlers

**Critical Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase server-side role key (backend only)
- `CLAUDE_API_KEY` - Anthropic Claude API key (optional, used for Claude chat proxy)
- `GEMINI_API_KEY` - Google Gemini API key (embeddings + text generation)
- `GROQ_API_KEY` - Groq LLM API key (alternative LLM provider)
- `RAG_INDEX_SECRET` - Shared secret for RAG indexing operations
- `SMS_PROVIDER` - SMS provider type (android_gateway, smslink, twilio, vonage)
- `SMS_CALLBACK_SECRET` - HMAC secret for SMS webhook validation
- `ANDROID_GATEWAY_URL` - Custom Android SMS gateway endpoint
- `ANDROID_GATEWAY_TOKEN` - Bearer token for Android SMS gateway

**Build:**
- vite.config.ts - Build configuration with React plugin, path aliases, code splitting
- tsconfig.json - TypeScript compiler options, path aliases (@components, @hooks, @contexts)
- tailwind.config.js - Tailwind CSS theme customization (colors, shadows, animations)
- postcss.config.js - PostCSS configuration for Tailwind
- vercel.json - Deployment configuration, SPA rewrite rules, cache headers

## Platform Requirements

**Development:**
- Node.js (version not explicitly pinned in .nvmrc but inferred ES2022 target)
- npm or compatible package manager
- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required for local dev

**Production:**
- Deployment target: Vercel (configured via vercel.json)
- Edge runtime: Vercel Node.js Functions for serverless API handlers
- Static asset hosting via Vercel CDN
- Custom domain support via Vercel

---

*Stack analysis: 2026-06-04*
