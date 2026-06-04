# Portal PhiHau — QwanKiDo Club Management

Portal web pentru **Federația QwanKiDo România** și cluburile afiliate. Gestionează ciclul complet al unui practicant: înregistrare → antrenamente → examene de grad → competiții → plăți. Țintă: 35 cluburi, 3500+ sportivi. Stare actuală: 7 cluburi cu date reale, în testare.

## Stack rapid

**React 18 + TypeScript + Vite** | **Supabase** (PostgreSQL + Auth + RLS) | **Tailwind CSS** | **React Query v5** | **Vercel** deploy

## Convenții esențiale

- **Limbă**: română pentru domeniu (DB, UI, variabile), engleză pentru hook-uri/patternuri tehnice
- **Tipuri**: toate în `types.ts` la rădăcină — fișier unic de referință
- **UI**: `components/ui.tsx` = design system intern — nu se importă Shadcn/MUI
- **Navigare**: SPA fără URL routing intern — `activeView` string în `NavigationContext`
- **Permisiuni**: `usePermissions(activeRoleContext)` + RLS Supabase — nu duplica logica
- **Supabase client**: `supabaseClient.ts` injectează `active-role-context-id` header în toate requesturile

## Roluri

`SUPER_ADMIN_FEDERATIE` > `ADMIN_CLUB` > `INSTRUCTOR` > `SPORTIV`

Un utilizator poate avea roluri multiple la cluburi diferite — contextul activ se alege la login și e trimis ca header la fiecare request Supabase.

## Documentație detaliată

| Fișier | Conținut |
|--------|----------|
| [docs/arhitectura.md](docs/arhitectura.md) | Stack complet, structura folderelor, navigare SPA, Supabase client |
| [docs/baza-de-date.md](docs/baza-de-date.md) | Schema DB completă — toate tabelele cu descriere, views, convenții |
| [docs/roluri-permisiuni.md](docs/roluri-permisiuni.md) | Roluri, `usePermissions`, RLS, GDPR, roluri planificate |
| [docs/module.md](docs/module.md) | Fiecare modul: stare, componente cheie, hooks, servicii |
| [docs/fluxuri.md](docs/fluxuri.md) | Fluxuri complete: auth, plăți, examene, competiții, prezență, AI |
| [docs/conventii-cod.md](docs/conventii-cod.md) | Naming, stilizare, state management, gestionare erori |
| [docs/HARTA_APLICATIE.md](docs/HARTA_APLICATIE.md) | Viziunea produsului: module, restricții business, plan 5 faze |
| [docs/ARHITECTURA_COMPETITII.md](docs/ARHITECTURA_COMPETITII.md) | Tipuri competiții QwanKiDo, probe, categorii, reguli oficiale |
| [docs/RAG_IMPLEMENTARE.md](docs/RAG_IMPLEMENTARE.md) | AI Assistant: Gemini embeddings + pgvector + Claude API |

<!-- GSD:project-start source:PROJECT.md -->

## Project

**Sistem Filtrare Unificat — Competiții**

Un sistem de filtrare unificat (gen, vârstă, grad, probă) aplicat consistent pe toate tab-urile principale din modulul de Competiții al portalului PhiHau: Categorii, Înscrieri, Raport și Template (admin). Filtrele funcționează combinat (AND) și sunt inline, deasupra listei de conținut, pe fiecare tab.

**Core Value:** Orice admin sau instructor poate filtra rapid sportivii/categoriile după gen + vârstă + grad simultan, pe orice tab din competiție, folosind o interfață identică pretutindeni.

### Constraints

- **Tech Stack**: React 18 + TypeScript + Tailwind — fără librării externe noi
- **UI**: `components/ui.tsx` design system intern — nu Shadcn/MUI
- **Compatibilitate**: Nu se sparge API-ul existent al componentelor
- **Performance**: Filtrare client-side pe date deja încărcate — fără query-uri noi Supabase
- **Scope fișier**: Modificări în `index.tsx` monolitic — atenție la re-rendere nedorite

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.5.3 - Application frontend, backend API handlers, type definitions
- JavaScript (via JSX) - React component templates
- SQL - Database migrations and RLS policies in `sql/` directory

## Runtime

- Node.js (inferred from package.json type: "module" and API handlers)
- npm (package-lock.json present, lockfile committed)

## Frameworks

- React 18.3.1 - UI component framework
- React Router DOM 6.23.1 - Client-side routing (SPA mode, not URL-based)
- Vite 5.3.4 - Build tool and dev server
- TanStack React Query 5.90.21 - Server state caching, data synchronization
- Zustand 5.0.11 - Global application state (`src/store/useAppStore.ts`)
- Vercel Node.js runtime (via `@vercel/node` v5.6.12) - API endpoint execution
- TypeScript compiler for type checking (via `lint` script running `tsc --noEmit`)
- @vitejs/plugin-react 4.3.1 - React JSX compilation for Vite
- Tailwind CSS 3.4.6 - Utility-first CSS styling
- PostCSS 8.4.39 - CSS processing (paired with Tailwind)
- Autoprefixer 10.4.19 - Browser vendor prefix injection

## Key Dependencies

- @supabase/supabase-js 2.98.0 - PostgreSQL database client with auth integration
- @supabase/postgrest-js 2.97.0 - Supabase REST API client
- react-hot-toast 2.6.0 - Toast notification system (critical for UX feedback)
- @google/generative-ai 0.24.1 - Google Gemini API integration for embeddings and text generation
- express 5.2.1 - API middleware (used in development/serverless context)
- tsx 4.21.0 - TypeScript executor for Node.js
- Lucide-react 0.400.0 - Icon library
- Recharts 2.15.4 - Chart/graph rendering for financial reports
- Motion 12.34.5 - Animation library
- clsx 2.1.1 - Conditional className utility
- xlsx 0.18.5 - Excel file import/export
- PapaParse 5.4.1 - CSV parsing and generation
- date-fns 4.1.0 - Date manipulation and formatting
- jsPDF 4.2.1 - PDF document creation
- jspdf-autotable 5.0.7 - Table generation in PDF documents
- react-easy-crop 5.5.6 - User photo/avatar cropping UI
- tailwind-merge 2.3.0 - Merge Tailwind CSS class names intelligently
- vite-plugin-pwa 1.2.0 - Progressive Web App support (service workers registered but deprecated in favor of native browser PWA)

## Configuration

- Variables loaded via `.env` file
- Client-side environment variables prefixed with `VITE_` (Vite convention)
- Server-side environment variables accessible via `process.env` in API handlers
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
- vite.config.ts - Build configuration with React plugin, path aliases, code splitting
- tsconfig.json - TypeScript compiler options, path aliases (@components, @hooks, @contexts)
- tailwind.config.js - Tailwind CSS theme customization (colors, shadows, animations)
- postcss.config.js - PostCSS configuration for Tailwind
- vercel.json - Deployment configuration, SPA rewrite rules, cache headers

## Platform Requirements

- Node.js (version not explicitly pinned in .nvmrc but inferred ES2022 target)
- npm or compatible package manager
- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required for local dev
- Deployment target: Vercel (configured via vercel.json)
- Edge runtime: Vercel Node.js Functions for serverless API handlers
- Static asset hosting via Vercel CDN
- Custom domain support via Vercel

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Language

- **Domain** (DB, UI, variables, comments): română
- **Technical** (hooks, patterns, types, services): engleză

## TypeScript

- Strict mode: **disabled** — permite tipuri flexibile
- Toate tipurile centralizate în `types.ts` (rădăcina proiectului)
- Fișier unic de referință — nu se creează fișiere de tipuri separate
- Import tipuri: `import type { X } from '../types'`

## Naming

| Construct | Convention | Exemplu |
|---|---|---|
| Componente React | PascalCase | `SportivCard.tsx` |
| Hooks | camelCase cu prefix `use` | `usePermissions`, `useAuth` |
| Servicii | camelCase cu sufix `Service` | `sportiviService` |
| Fișiere servicii | camelCase | `sportiviService.ts` |
| Variabile/funcții | camelCase | `activeRoleContext` |
| Constante | SCREAMING_SNAKE sau camelCase | depinde de context |
| Tabele DB | snake_case | `sportivi`, `orar_saptamanal` |

## Component Structure

## State Management

| Tip | Tool |
|---|---|
| Server state | React Query v5 (`useQuery`, `useMutation`) |
| UI state global | Zustand (`useAppStore`) |
| Navigation | `NavigationContext` — `activeView` string, SPA fără URL routing |
| Date globale | `DataContext` |
| Erori globale | `ErrorProvider` |
| Auth | `useAuth` hook |

## Permissions Pattern

## Supabase Client

## Error Handling

- `ErrorBoundary` la nivel de pagină
- `ErrorProvider` + context pentru erori aplicație
- Servicii returnează `{ data, error }` — nu throw
- Erori UI: componenta `ui.tsx` → `Alert`, `ErrorState`

## UI / Styling

- Design system intern: `components/ui.tsx` — **nu** Shadcn, **nu** MUI
- Tailwind CSS — clase utilitare direct în JSX
- Responsive: breakpoints Tailwind (`sm:`, `md:`, `lg:`)
- Niciun fișier CSS separat — tot în Tailwind

## Lazy Loading

## No Linting / Formatting Tools

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **App** | Root orchestration, session mgmt, role selection, layout wrapper | `App.tsx` |
| **AppRouter** | View dispatcher — switches between 40+ views based on activeView | `components/AppRouter.tsx` |
| **AppLayout** | Master layout: sidebar, header, main content, AI widget | `components/AppLayout.tsx` |
| **Sidebar** | Navigation menu, role switcher, club selector per role | `components/Sidebar.tsx` |
| **Sportivi** | Athlete CRUD, import/export, deduplication, group assignment | `components/Sportivi/index.tsx` |
| **GestiuneExamene** | Grade exam sessions, athlete registration, results entry | `components/GestiuneExamene/index.tsx` |
| **Grupe** | Training groups, schedule mgmt, attendance tracking | `components/Grupe/index.tsx` |
| **Competitii** | Competitions (tehnica/giao_dau/cvd), registration, brackets | `components/Competitii/index.tsx` |
| **Plati** | Invoicing, subscription types, financial dashboards, collections | `components/Plati/*` |
| **Prezenta** | Attendance marking, reports, archive by month | `components/Prezenta/index.tsx` |
| **Grade** | Grade chains, nomenclature, linking rules | `components/Grade/*` |
| **Design System** | 20+ UI components (Button, Modal, Card, Input, etc.) | `components/ui.tsx` |
| **AIAssistant** | RAG-powered help widget, Gemini embeddings + Claude API | `components/AIAssistant/` |

## Pattern Overview

- **No URL routing** — Navigation via `activeView` string in NavigationContext, not browser URL
- **SPA history stack** — Back button navigates views, not browser history (overrides popstate)
- **Multi-role RBAC** — User can hold multiple roles at different clubs; context selected at login
- **Header injection** — Supabase client injects `active-role-context-id` header in all requests
- **Optimistic updates** — Changes written to state immediately, sync to DB in background
- **Lazy component loading** — Code splitting via `LazyComponents.tsx` for mobile performance

## Layers

- Purpose: Render UI, handle user interaction, display filtered data
- Location: `components/`
- Contains: React components, modals, forms, pages, design system
- Depends on: Hooks, contexts, services
- Used by: AppRouter for view rendering
- Purpose: Manage client state, cache server data, track navigation
- Location: `contexts/`, `src/store/`, React Query cache
- Contains: NavigationContext, DataContext, Zustand stores
- Depends on: Services, Supabase client
- Used by: All components via hooks (useData, useNavigation, useAppStore)
- Purpose: Query Supabase, cache results, refresh on schedule
- Location: `hooks/` (useSportivi, usePlati, useGrupe, useDataProvider, etc.)
- Contains: React Query hooks, custom fetch logic, caching utilities
- Depends on: Supabase client, RLS rules
- Used by: DataContext, components
- Purpose: Business logic, import/export, AI integration, complex mutations
- Location: `services/`
- Contains: importSportiviService, ragService, claudeService, agents
- Depends on: Supabase client, external APIs
- Used by: Components for batch operations, AI queries
- Purpose: Data persistence, authentication, authorization
- Location: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Contains: Tables, RLS policies, SQL functions, Auth rules
- Depends on: None
- Used by: All frontend queries via supabaseClient

## Data Flow

### Primary Request Path (View Navigation)

### Authentication Flow

### Data Mutation Flow

- Navigation state: NavigationContext (activeView, viewParams, history stack)
- User state: Session (Supabase Auth), currentUser (custom User object)
- Data cache: React Query (sportivi, grupe, plati, etc. with 5 min staleTime)
- Client state: Zustand stores (sidebar expanded, AI widget open, etc.)
- Global settings: Themes, permissions, role list stored in localStorage

## Key Abstractions

- Purpose: Identifies which component to render; replaces URL routing
- Examples: `'sportivi'`, `'profil-sportiv'`, `'examene'`, `'plati-scadente'`, `'dashboard'`
- Pattern: Defined in `types.ts` as string union; stored in NavigationContext; dispatched by AppRouter
- Purpose: Represents active role + club for current user session
- Examples: `{ id: 'uuid', user_id: '...', club_id: '...', rol_denumire: 'ADMIN_CLUB', roluri: { nume: 'ADMIN_CLUB' } }`
- Pattern: Queried on login, persisted in localStorage, injected as header in all Supabase requests
- Used by: RLS policies to enforce row-level security
- Purpose: Computed access control derived from activeRole (role + club)
- Examples: `{ isFederationAdmin: true, canManageFinances: true, visibleClubIds: 'all' }`
- Pattern: Computed by `usePermissions()` hook; cached; used to show/hide UI elements
- Applied at: View level (renderProtected), component level (permissions?.canManageFinances)
- Purpose: Role-aware filtered view of all cached data
- Examples: `{ sportivi: [], grupe: [], plati: [], ...alle dati filtrate pe club/rol }`
- Pattern: Computed in DataContext after all hooks load; passed to all components
- Updated: When any hook refetches; invalidation triggers re-filter

## Entry Points

- Location: `index.tsx`
- Triggers: Page load or refresh
- Responsibilities: Initializes React, mounts root element, wraps with providers (ErrorProvider, QueryClientProvider, DataProvider, NavigationProvider, BrowserRouter)
- Location: `App.tsx`
- Triggers: After providers mount
- Responsibilities: Orchestrates session + auth, shows LoadingScreen or LoginPage or AppLayout, manages hardware back button
- Location: `components/AppLayout.tsx`
- Triggers: User logged in + role selected
- Responsibilities: Renders Sidebar + Header + AppRouter, manages mobile sidebar, AI widget toggle
- Location: `components/AppRouter.tsx` (switch statement at line 115-350)
- Triggers: activeView changes
- Responsibilities: Dispatches to correct component based on View enum

## Architectural Constraints

- **Threading:** JavaScript event loop — single-threaded, async operations via Promises/async-await
- **Global state:** 
- **Circular imports:** None known; component/hook dependencies are acyclic
- **Navigation:** SPA model — no server-side routing; history maintained by NavigationContext stack (15 max entries)
- **Headers:** Custom header `active-role-context-id` injected by supabaseClient for RLS filtering
- **RLS enforcement:** All table queries MUST use header or `auth.uid()` in WHERE clause
- **Data filtering:** Frontend also filters by `visibleClubIds` to defend against RLS bypass
- **Mobile:** Responsive design via Tailwind; sidebar collapses to hamburger on <768px; modals touch-friendly

## Anti-Patterns

### Anti-Pattern: Direct Prop Drilling

### Anti-Pattern: Fetching Data in Multiple Places

### Anti-Pattern: Mutations Without Cache Invalidation

### Anti-Pattern: Side Effects in Render

### Anti-Pattern: URL-Based Navigation

### Anti-Pattern: Hardcoded Club IDs

## Error Handling

- **Service layer:** Catch Supabase errors, log, re-throw with context  (`services/sportivService.ts`)
- **Component layer:** Wrap mutations in try-catch, call `useError().showError(title, message)`  (`components/ErrorProvider.tsx`)
- **Boundaries:** ErrorBoundary catches React render crashes and displays fallback UI  (`components/ErrorBoundary.tsx`)
- **Network:** React Query retries failed queries (3 times by default); user sees loading state
- **Validation:** Form fields validate on blur; submit button disabled if errors exist

## Cross-Cutting Concerns

- Client-side: React Hook Form for input validation, custom validators for age/grade rules
- Server-side: Supabase RLS blocks unauthorized rows, NOT NULL/UNIQUE constraints enforced
- Business rules: Custom SQL functions encode domain logic (e.g., valid grade chains)
- Supabase Auth handles password hashing, JWT tokens, session refresh
- App maintains activeRoleContext to track selected role + club
- Header injection enables RLS to enforce multi-role access control
- Force password change on first login (trebuie_schimbata_parola flag)
- Two-layer: RLS at database (hard security), permissions checks in UI (UX)
- FE checks don't prevent access (user can manipulate); RLS is the gate
- Menu items hidden based on permissions (UX optimization, not security)

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| portal-debug | > Skill de intake/triage pentru portal-phihau. Colectează cerințele în seturi progresive de întrebări înainte de orice modificare de cod, prevenind regresii și features dispărute. FOLOSEȘTE OBLIGATORIU când utilizatorul spune: "repară", "fix", "nu merge", "dispare", "nu funcționează", "a dispărut", "nu se vede", "s-a stricat", "schimbă", "adaugă", "modifică", "vreau să", "cum fac", "problema la", "ajută-mă cu", "nu afișează", "eroare la", "bug în", sau orice altceva legat de modificarea, repararea sau extinderea funcționalităților din portal-phihau (portal QwanKiDo / PhiHau). | `.claude/skills/portal-debug/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
