<!-- refreshed: 2026-06-04 -->
# Architecture

**Analysis Date:** 2026-06-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     Frontend Layer (React 18 + TypeScript)              │
├──────────────┬──────────────────┬──────────────────┬────────────────────┤
│   AppRouter  │   Components     │   Contexts       │   Hooks            │
│  `AppRouter` │  (60+ modules)   │  (Navigation,    │  (35+ custom)      │
│              │  `components/`   │   Data, Auth)    │  `hooks/`          │
└────────┬─────┴────────┬─────────┴────────┬─────────┴──────┬────────────┘
         │              │                  │                │
         ▼              ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           State Management Layer (React Query v5 + Zustand)            │
│  - Server state: TanStack React Query (5 min staleTime)                 │
│  - Client state: Zustand stores (useAppStore, useAIStore)              │
│  - Navigation: NavigationContext (activeView + history stack)           │
│  - Data: DataContext (filteredData per role + club)                    │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Backend Layer (Supabase PostgreSQL)                  │
│  - Auth: Supabase Auth (email/password, multi-role RBAC)               │
│  - RLS: Row-Level Security per role_context_id (header injected)       │
│  - Storage: File uploads (foto, documente), Vector embeddings (pgvector)
│  - Real-time subscriptions (presence, activity feeds)                  │
└─────────────────────────────────────────────────────────────────────────┘
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

**Overall:** Multi-role SPA (Single Page Application) with context-aware data filtering and RLS enforcement

**Key Characteristics:**
- **No URL routing** — Navigation via `activeView` string in NavigationContext, not browser URL
- **SPA history stack** — Back button navigates views, not browser history (overrides popstate)
- **Multi-role RBAC** — User can hold multiple roles at different clubs; context selected at login
- **Header injection** — Supabase client injects `active-role-context-id` header in all requests
- **Optimistic updates** — Changes written to state immediately, sync to DB in background
- **Lazy component loading** — Code splitting via `LazyComponents.tsx` for mobile performance

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle user interaction, display filtered data
- Location: `components/`
- Contains: React components, modals, forms, pages, design system
- Depends on: Hooks, contexts, services
- Used by: AppRouter for view rendering

**State Management Layer:**
- Purpose: Manage client state, cache server data, track navigation
- Location: `contexts/`, `src/store/`, React Query cache
- Contains: NavigationContext, DataContext, Zustand stores
- Depends on: Services, Supabase client
- Used by: All components via hooks (useData, useNavigation, useAppStore)

**Data Fetching Layer:**
- Purpose: Query Supabase, cache results, refresh on schedule
- Location: `hooks/` (useSportivi, usePlati, useGrupe, useDataProvider, etc.)
- Contains: React Query hooks, custom fetch logic, caching utilities
- Depends on: Supabase client, RLS rules
- Used by: DataContext, components

**Service Layer:**
- Purpose: Business logic, import/export, AI integration, complex mutations
- Location: `services/`
- Contains: importSportiviService, ragService, claudeService, agents
- Depends on: Supabase client, external APIs
- Used by: Components for batch operations, AI queries

**Backend Layer:**
- Purpose: Data persistence, authentication, authorization
- Location: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Contains: Tables, RLS policies, SQL functions, Auth rules
- Depends on: None
- Used by: All frontend queries via supabaseClient

## Data Flow

### Primary Request Path (View Navigation)

1. User clicks menu item → Sidebar calls `setActiveView(newView)`  (`components/Sidebar.tsx`)
2. NavigationContext updates and pushes previous view to history stack  (`contexts/NavigationContext.tsx`)
3. AppRouter switches `case activeView` and renders matching component  (`components/AppRouter.tsx:115-350`)
4. Component mounts, calls hooks (useSportivi, usePlati, etc.) which query Supabase
5. useDataProvider aggregates results into `filteredData` object  (`hooks/useDataProvider.ts:110-120`)
6. DataContext distributes `filteredData` to all child components via `useData()` hook
7. Component renders using cached data; Supabase RLS filters rows by `active-role-context-id` header
8. User interaction (e.g., add athlete) → component calls service function
9. Service updates DB via Supabase mutations
10. React Query invalidates cache; hooks refetch; UI updates

### Authentication Flow

1. User visits `/login` (no session) → LoginPage renders  (`components/LoginPage.tsx`)
2. User enters email + password → calls `supabase.auth.signInWithPassword()`
3. Supabase Auth returns `session` + `user` object
4. useAppLogic initializes; calls `useDataProvider()` to fetch user roles  (`hooks/useAppLogic.ts:14-37`)
5. useUserRoles queries `usuarios_roles_contexto` table filtered by `user_id`  (inherited from DataProvider)
6. If user has multiple roles → RoleSelectionPage shows options  (`components/RoleSelectionPage.tsx`)
7. User selects role (e.g., ADMIN_CLUB for Club A) → saves `active-role-context-id` to localStorage
8. supabaseClient.customFetch() injects header into all subsequent requests  (`supabaseClient.ts:11-15`)
9. Supabase RLS policies use `auth.jwt()` + header to filter data per role/club
10. App renders authenticated layout (Sidebar, AppRouter, etc.)

### Data Mutation Flow

1. User fills form, clicks "Save" → component calls `actualizeazaSportiv()` or similar service function  (`services/sportivService.ts`)
2. Service validates data, builds mutation object
3. Calls `supabase.from('sportivi').update(data).eq('id', id)`
4. Supabase RLS checks: user's role + club must match row's club_id
5. Row updated in DB; Supabase returns success/error
6. Service calls `queryClient.invalidateQueries()` to bust React Query cache
7. useSportivi hook refetches from DB automatically
8. Component's `sportivi` state updates; UI re-renders with fresh data
9. Toast notification shows success/error

**State Management:**
- Navigation state: NavigationContext (activeView, viewParams, history stack)
- User state: Session (Supabase Auth), currentUser (custom User object)
- Data cache: React Query (sportivi, grupe, plati, etc. with 5 min staleTime)
- Client state: Zustand stores (sidebar expanded, AI widget open, etc.)
- Global settings: Themes, permissions, role list stored in localStorage

## Key Abstractions

**View (String Enum):**
- Purpose: Identifies which component to render; replaces URL routing
- Examples: `'sportivi'`, `'profil-sportiv'`, `'examene'`, `'plati-scadente'`, `'dashboard'`
- Pattern: Defined in `types.ts` as string union; stored in NavigationContext; dispatched by AppRouter

**activeRoleContext:**
- Purpose: Represents active role + club for current user session
- Examples: `{ id: 'uuid', user_id: '...', club_id: '...', rol_denumire: 'ADMIN_CLUB', roluri: { nume: 'ADMIN_CLUB' } }`
- Pattern: Queried on login, persisted in localStorage, injected as header in all Supabase requests
- Used by: RLS policies to enforce row-level security

**Permissions:**
- Purpose: Computed access control derived from activeRole (role + club)
- Examples: `{ isFederationAdmin: true, canManageFinances: true, visibleClubIds: 'all' }`
- Pattern: Computed by `usePermissions()` hook; cached; used to show/hide UI elements
- Applied at: View level (renderProtected), component level (permissions?.canManageFinances)

**FilteredData:**
- Purpose: Role-aware filtered view of all cached data
- Examples: `{ sportivi: [], grupe: [], plati: [], ...alle dati filtrate pe club/rol }`
- Pattern: Computed in DataContext after all hooks load; passed to all components
- Updated: When any hook refetches; invalidation triggers re-filter

## Entry Points

**Browser Entry:**
- Location: `index.tsx`
- Triggers: Page load or refresh
- Responsibilities: Initializes React, mounts root element, wraps with providers (ErrorProvider, QueryClientProvider, DataProvider, NavigationProvider, BrowserRouter)

**App Root:**
- Location: `App.tsx`
- Triggers: After providers mount
- Responsibilities: Orchestrates session + auth, shows LoadingScreen or LoginPage or AppLayout, manages hardware back button

**Authenticated Entry:**
- Location: `components/AppLayout.tsx`
- Triggers: User logged in + role selected
- Responsibilities: Renders Sidebar + Header + AppRouter, manages mobile sidebar, AI widget toggle

**View Rendering:**
- Location: `components/AppRouter.tsx` (switch statement at line 115-350)
- Triggers: activeView changes
- Responsibilities: Dispatches to correct component based on View enum

## Architectural Constraints

- **Threading:** JavaScript event loop — single-threaded, async operations via Promises/async-await
- **Global state:** 
  - Supabase session in localStorage (`pi-hau-active-role-context-id`, `activeRole`, `phi-hau-global-club-filter`)
  - Zustand stores (`useAppStore`, `useAIStore`)
  - React Query cache (shared instance via QueryClientProvider)
  - No module-level singletons besides supabaseClient
- **Circular imports:** None known; component/hook dependencies are acyclic
- **Navigation:** SPA model — no server-side routing; history maintained by NavigationContext stack (15 max entries)
- **Headers:** Custom header `active-role-context-id` injected by supabaseClient for RLS filtering
- **RLS enforcement:** All table queries MUST use header or `auth.uid()` in WHERE clause
- **Data filtering:** Frontend also filters by `visibleClubIds` to defend against RLS bypass
- **Mobile:** Responsive design via Tailwind; sidebar collapses to hamburger on <768px; modals touch-friendly

## Anti-Patterns

### Anti-Pattern: Direct Prop Drilling

**What happens:** Components pass data 15+ levels deep (e.g., sportivi → SportiviTable → SportiviRow → EditModal)
**Why it's wrong:** Hard to refactor, lose track of data flow, prop name changes ripple through files
**Do this instead:** Use `useData()` hook to access filteredData directly in any component  (`contexts/DataContext.tsx`)
**Example:** Instead of `<SportiviRow sportiv={props.sportiv}>`, destructure in the component: `const { filteredData } = useData(); const sportiv = filteredData.sportivi.find(...)`

### Anti-Pattern: Fetching Data in Multiple Places

**What happens:** Three different components call `supabase.from('sportivi').select()` independently
**Why it's wrong:** Stale data, network waste, cache invalidation nightmare
**Do this instead:** Single point of fetch in `useDataProvider()`, distribute via DataContext  (`hooks/useDataProvider.ts`)
**Example:** New component needs athletes? Call `const { filteredData } = useData()` — don't call Supabase

### Anti-Pattern: Mutations Without Cache Invalidation

**What happens:** Component calls `supabase.from('sportivi').insert()` but doesn't invalidate React Query
**Why it's wrong:** UI shows stale data; user thinks change failed
**Do this instead:** After mutation, call `queryClient.invalidateQueries({ queryKey: ['sportivi'] })`  (`services/sportivService.ts:30`)
**Example:** `actualizeazaSportiv()` updates DB then calls invalidate to trigger refetch

### Anti-Pattern: Side Effects in Render

**What happens:** Component calls `supabase.select()` inside JSX or without useEffect
**Why it's wrong:** Infinite loops, duplicate requests, memory leaks
**Do this instead:** Use hooks (useSportivi, useData) or useEffect with dependency array  (`hooks/useSportivi.ts`)

### Anti-Pattern: URL-Based Navigation

**What happens:** Component tries to use React Router URLs like `/sportivi/123`
**Why it's wrong:** This app is a full SPA without URL routing; routes not defined
**Do this instead:** Use NavigationContext: `const { setActiveView } = useNavigation(); setActiveView('profil-sportiv')`  (`contexts/NavigationContext.tsx`)
**Example:** In Sportivi.tsx: `setActiveView('profil-sportiv')` when user clicks row

### Anti-Pattern: Hardcoded Club IDs

**What happens:** Component assumes `activeRoleContext.club_id` exists without checking
**Why it's wrong:** SUPER_ADMIN_FEDERATIE has no club_id; crashes with "Cannot read property 'club_id' of undefined"
**Do this instead:** Check permissions first: `if (permissions.isFederationAdmin) { ... } else { const clubId = activeRoleContext.club_id; ... }`  (`hooks/usePermissions.ts`)

## Error Handling

**Strategy:** Try-catch at service layer; showError toast at component layer; error boundaries for React crashes

**Patterns:**
- **Service layer:** Catch Supabase errors, log, re-throw with context  (`services/sportivService.ts`)
- **Component layer:** Wrap mutations in try-catch, call `useError().showError(title, message)`  (`components/ErrorProvider.tsx`)
- **Boundaries:** ErrorBoundary catches React render crashes and displays fallback UI  (`components/ErrorBoundary.tsx`)
- **Network:** React Query retries failed queries (3 times by default); user sees loading state
- **Validation:** Form fields validate on blur; submit button disabled if errors exist

## Cross-Cutting Concerns

**Logging:** Console.error/warn for dev; no logging library configured (can add Sentry)

**Validation:** 
- Client-side: React Hook Form for input validation, custom validators for age/grade rules
- Server-side: Supabase RLS blocks unauthorized rows, NOT NULL/UNIQUE constraints enforced
- Business rules: Custom SQL functions encode domain logic (e.g., valid grade chains)

**Authentication:**
- Supabase Auth handles password hashing, JWT tokens, session refresh
- App maintains activeRoleContext to track selected role + club
- Header injection enables RLS to enforce multi-role access control
- Force password change on first login (trebuie_schimbata_parola flag)

**Authorization:**
- Two-layer: RLS at database (hard security), permissions checks in UI (UX)
- FE checks don't prevent access (user can manipulate); RLS is the gate
- Menu items hidden based on permissions (UX optimization, not security)

---

*Architecture analysis: 2026-06-04*
