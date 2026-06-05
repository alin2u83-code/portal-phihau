<!-- refreshed: 2026-06-05 -->
# Architecture

**Analysis Date:** 2026-06-05

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                     Browser SPA (React 18)                        │
│   index.tsx → App.tsx → AppLayout → AppRouter (58-case switch)   │
├────────────┬──────────────┬──────────────┬────────────────────────┤
│ Components │   Contexts   │    Hooks     │      Services          │
│ components/│ DataContext  │ useDataProv. │ importSportiviService  │
│            │ NavigationCtx│ useSportivi  │ ragService             │
│            │ ErrorProvider│ usePlati     │ claudeService          │
│            │ AIAssistant  │ useGrupe     │ sportivService         │
│            │   Context    │ usePermission│ familieService         │
└────────────┴──────┬───────┴──────┬───────┴────────────────────────┘
                    │              │
                    ▼              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    supabaseClient.ts                              │
│   customFetch — injects active-role-context-id header            │
│   reads localStorage key: phi-hau-active-role-context-id         │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│          Supabase (PostgreSQL + Auth + RLS + Storage)             │
│   RLS policies use header → set_config('app.role_context_id')    │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App | Root orchestration, session mgmt, role selection, layout wrapper | `App.tsx` |
| AppRouter | View dispatcher — 58-case switch on activeView string | `components/AppRouter.tsx` |
| AppLayout | Master layout: sidebar, header, main content, AI widget | `components/AppLayout.tsx` |
| Sidebar | Navigation menu, role switcher, club selector per role | `components/Sidebar.tsx` |
| Sportivi | Athlete CRUD, import/export, deduplication, group assignment | `components/Sportivi/index.tsx` |
| GestiuneExamene | Grade exam sessions, athlete registration, results entry | `components/GestiuneExamene/index.tsx` |
| Grupe | Training groups, schedule mgmt, attendance tracking | `components/Grupe/index.tsx` |
| Competitii | Competitions (tehnica/giao_dau/cvd), registration, brackets | `components/Competitii/index.tsx` |
| Plati | Invoicing, subscription types, financial dashboards | `components/Plati/` (13 files) |
| Prezenta | Attendance marking, reports, archive by month | `components/Prezenta/index.tsx` |
| Grade | Grade chains, nomenclature, linking rules | `components/Grade/` |
| Design System | 20+ UI components (Button, Modal, Card, Input, etc.) | `components/ui.tsx` |
| AIAssistant | RAG-powered help widget, Gemini embeddings + Claude API | `components/AIAssistant/` |
| LazyComponents | Code-split imports for all major modules | `components/LazyComponents.tsx` |

## Pattern Overview

**Overall:** SPA with string-enum view dispatch (no URL routing)

**Key Characteristics:**
- Navigation is `activeView: View` string stored in `NavigationContext`, not browser URL
- SPA back-button managed by `NavigationContext` history stack (max 15 entries), overrides `popstate`
- All Supabase requests carry `active-role-context-id` header for per-row access control
- Lazy loading via `LazyComponents.tsx` for code splitting on mobile
- Multi-role: one user holds multiple `user_roles` rows across clubs; active role chosen at login

## Layers

**UI Components:**
- Purpose: Render views, handle user interaction, display filtered data
- Location: `components/`
- Contains: React components, modals, forms, pages, design system (`ui.tsx`)
- Depends on: Hooks, contexts, services
- Used by: `AppRouter` for view rendering

**Contexts / State:**
- Purpose: Manage client state, cache server data, track navigation
- Location: `contexts/DataContext.tsx`, `contexts/NavigationContext.tsx`, `contexts/ErrorProvider.tsx`, `src/store/useAppStore.ts`
- Contains: DataContext (all fetched data + filtered views), NavigationContext (activeView, history stack), Zustand stores (UI flags)
- Depends on: Hooks, Supabase client
- Used by: All components via `useData()`, `useNavigation()`, `useAppStore()`

**Hooks (React Query layer):**
- Purpose: Query Supabase, cache results, manage server state
- Location: `hooks/` (30+ files)
- Key hooks: `useDataProvider.ts` (main orchestrator), `useSportivi.ts`, `usePlati.ts`, `useGrupe.ts`, `useUserRoles.ts`, `usePermissions.ts`, `useFilteredData.ts`, `useAttendanceData.ts`
- Depends on: Supabase client, RLS rules
- Used by: `DataContext` via `useDataProvider`; components directly for mutations

**Services:**
- Purpose: Business logic, batch operations, import/export, AI integration
- Location: `services/`
- Contains: `importSportiviService.ts`, `ragService.ts`, `claudeService.ts`, `sportivService.ts`, `familieService.ts`, `importExcelExamenService.ts`, `agents/`
- Depends on: Supabase client, external APIs (Gemini, Claude)
- Used by: Components for complex mutations; `api/` handlers for serverless

**Supabase / Data Persistence:**
- Purpose: Data persistence, authentication, row-level security
- Location: Supabase cloud (PostgreSQL + Auth + Storage)
- Contains: Tables, RLS policies, SQL functions, views
- Migrations: `sql/migrations/` (applied manually in Supabase dashboard)
- Used by: All frontend queries via `supabaseClient.ts`

## Data Flow

### Primary Request Path

1. User action in component calls service or React Query mutation
2. `supabaseClient.ts` `customFetch` reads `localStorage('phi-hau-active-role-context-id')` and injects `active-role-context-id` header (`supabaseClient.ts:11-15`)
3. Supabase RLS policy reads header via `set_config` and filters rows to permitted club(s)
4. React Query hook receives response and caches with 5 min `staleTime`
5. `useDataProvider.ts` aggregates all hook results and passes to `DataContext`
6. `useFilteredData.ts` applies frontend `visibleClubIds` filter as second defence layer
7. Component receives `filteredData` from `useData()` and renders

### Authentication Flow

1. `LoginPage` calls `supabase.auth.signInWithPassword()` — session JWT stored by Supabase SDK
2. `App.tsx` detects session and queries `user_roles` for all roles of this `auth.uid()`
3. If `trebuie_schimbata_parola = true` — `MandatoryPasswordChange` rendered before anything else
4. `RoleSelectionPage` shown when user has multiple roles — user picks active role
5. `activeRoleContext` (role row with `club_id`, `rol_denumire`) stored in `localStorage` as `phi-hau-active-role-context-id`
6. `supabaseClient.ts` reads this on every subsequent request and injects as header
7. `AppLayout` + `AppRouter` render with selected role context

### Data Mutation Flow

1. Component calls mutation (React Query `useMutation` or direct `supabase.from().insert()`)
2. Optimistic update written to local state immediately
3. Supabase responds; React Query invalidates relevant query keys and hooks refetch
4. `DataContext` re-computes `filteredData` with fresh data
5. UI re-renders with server-confirmed state

**State Management:**
- Server state: React Query (5 min `staleTime`, automatic refetch on window focus)
- Navigation state: `NavigationContext` (`activeView`, history stack, `viewParams`)
- Global UI state: Zustand `useAppStore` (`src/store/useAppStore.ts`) — sidebar expanded, AI widget open
- Auth state: Supabase session (auto-persisted) + `currentUser` object in `App.tsx`
- Filtered data: `DataContext` computed from all hooks after `useFilteredData` pass
- AI state: Zustand `useAIStore` (`src/store/useAIStore.ts`)

## Key Abstractions

**View (activeView string):**
- Purpose: Identifies which component to render; replaces URL routing
- Definition: `types.ts` — string union type `View`
- Examples: `'sportivi'`, `'profil-sportiv'`, `'examene'`, `'plati-scadente'`, `'dashboard'`, `'competitii'`, `'grupe'`, `'fisa-competitie'`
- Pattern: Stored in `NavigationContext`; dispatched by `AppRouter` 58-case switch (`components/AppRouter.tsx:117-256`)

**RoleContext (activeRoleContext):**
- Purpose: Represents active role + club for current user session
- Shape: `{ id: uuid, user_id, club_id, rol_denumire: 'ADMIN_CLUB' | 'INSTRUCTOR' | 'SPORTIV' | 'SUPER_ADMIN_FEDERATIE', roluri: { nume } }`
- Persisted: `localStorage` key `phi-hau-active-role-context-id`
- Used by: `supabaseClient.ts` (header injection), RLS policies (row filtering), `usePermissions()` (access control)

**usePermissions:**
- Purpose: Computed access control derived from `activeRoleContext`
- Returns: `{ isFederationAdmin, isClubAdmin, isInstructor, isSportiv, canManageFinances, visibleClubIds, ... }`
- Location: `hooks/usePermissions.ts`
- Pattern: Called with `activeRoleContext`; result cached; used to show/hide UI and guard mutations

**FilteredData:**
- Purpose: Role-aware, club-filtered view of all cached data
- Type defined: `types.ts` as `FilteredData`
- Computed by: `hooks/useFilteredData.ts` aggregated in `hooks/useDataProvider.ts` exposed via `contexts/DataContext.tsx`
- Contains: `sportivi`, `grupe`, `plati`, `antrenamente` etc. filtered to `visibleClubIds`

**AppData (useDataProvider aggregate):**
- Purpose: All raw + filtered data in one object passed to DataContext
- Definition: `hooks/useDataProvider.ts:23-51` (`AppData` interface, 25+ entity arrays)
- Contains: `sportivi`, `sesiuniExamene`, `inscrieriExamene`, `grade`, `istoricGrade`, `grupe`, `plati`, `tranzactii`, `evenimente`, `rezultate`, `preturiConfig`, `tipuriAbonament`, `familii`, `allRoles`, `reduceri`, `tipuriPlati`, `locatii`, `clubs`, `deconturiFederatie`, `vizeSportivi`, `decontSportivi`, `filteredData`, `allowedClubs`

## Entry Points

**Application Bootstrap:**
- Location: `index.tsx`
- Responsibilities: Initializes React, mounts root, wraps with `ErrorProvider`, `QueryClientProvider`, `DataProvider`, `NavigationProvider`, `BrowserRouter`

**Session Orchestrator:**
- Location: `App.tsx`
- Responsibilities: Auth state machine — shows `LoadingScreen` | `LoginPage` | `MandatoryPasswordChange` | `RoleSelectionPage` | `AppLayout`

**Layout Shell:**
- Location: `components/AppLayout.tsx`
- Responsibilities: Renders `Sidebar` + `Header` + `AppRouter`; manages mobile sidebar; AI widget toggle

**View Dispatcher:**
- Location: `components/AppRouter.tsx` (58-case switch from line ~117)
- Responsibilities: Maps `activeView` string to lazy-loaded component; passes data props; enforces `AccessDenied` for unauthorized views

## Architectural Constraints

- **Threading:** JavaScript event loop — single-threaded; async operations via Promises/async-await
- **Global state:** `useAppStore` (`src/store/useAppStore.ts`) for UI flags; `useAIStore` (`src/store/useAIStore.ts`) for AI widget; no shared mutable module-level state outside these stores
- **Navigation:** SPA model — no server-side routing; back handled by `NavigationContext` stack (max 15 entries); `popstate` overridden
- **Headers:** `active-role-context-id` injected by `supabaseClient.ts`; UUID validated via regex before injection (`supabaseClient.ts:12`)
- **RLS enforcement:** All table queries must pass header OR rely on `auth.uid()`; frontend `visibleClubIds` filter is defence-in-depth, not primary security
- **Type registry:** All types in single file `types.ts` (723 lines) — do NOT create separate type files
- **UI components:** Only `components/ui.tsx` design system — no Shadcn, no MUI, no external component libraries

## Anti-Patterns

### Direct Prop Drilling Past AppRouter

**What happens:** Passing data via props through AppRouter down to grandchild components
**Why it's wrong:** AppRouter already receives all data from DataContext; drilling duplicates state
**Do this instead:** Use `useData()` hook inside any component to access `DataContext` directly

### Fetching Data Directly in Components

**What happens:** Component calls `supabase.from('sportivi').select()` directly
**Why it's wrong:** Bypasses React Query cache; causes redundant requests and stale state
**Do this instead:** Use existing hooks (`useSportivi`, `usePlati`, `useGrupe`) or `useData()` from DataContext

### Mutations Without Cache Invalidation

**What happens:** Mutation updates DB but does not call `queryClient.invalidateQueries()`
**Why it's wrong:** UI shows stale data until next 5 min refetch cycle
**Do this instead:** Always invalidate relevant query keys after mutations via `useMutation` `onSuccess`

### URL-Based Navigation

**What happens:** Using `react-router-dom` `<Link>` or `useNavigate()` for internal navigation
**Why it's wrong:** App uses `NavigationContext` `activeView` string system; URL changes break SPA model
**Do this instead:** Call `setActiveView('view-name')` or `navigateTo('view-name', params)` from `NavigationContext`

### Separate Type Files

**What happens:** Creating `types/sportiv.ts` or `MyComponent.types.ts`
**Why it's wrong:** Violates single-source-of-truth; breaks project convention
**Do this instead:** Add all types to root `types.ts`

## Error Handling

**Strategy:** Multi-layer — service catches, context propagates, boundary catches render crashes

**Patterns:**
- Services return `{ data, error }` — never throw; caller checks error
- Components wrap mutations in try-catch and call `useError().showError(title, message)` from `contexts/ErrorProvider.tsx`
- `ErrorBoundary` (`components/ErrorBoundary.tsx`) catches React render crashes and displays fallback UI
- React Query retries failed queries 3 times; user sees loading state during retries
- Toast notifications via `react-hot-toast` for immediate UX feedback on mutations

## Cross-Cutting Concerns

**Validation:** Client-side custom validators for age/grade rules; server-side Supabase RLS `NOT NULL`/`UNIQUE` constraints; business rules in SQL functions
**Authentication:** Supabase Auth (JWT, session refresh, password hashing); force password change via `trebuie_schimbata_parola` flag
**Permissions:** `usePermissions(activeRoleContext)` hook — never duplicate logic; two-layer check: RLS at DB (security) + permissions checks in UI (UX)
**Logging:** `console.warn`/`console.error` in services; no structured logging service

---

*Architecture analysis: 2026-06-05*
