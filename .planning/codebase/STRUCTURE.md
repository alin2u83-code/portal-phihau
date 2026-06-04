# Codebase Structure

**Analysis Date:** 2026-06-04

## Directory Layout

```
portal-phihau/
├── App.tsx                         # Root component — session + role orchestration
├── index.tsx                       # Entry point — React mount, providers
├── index.html                      # HTML shell
├── index.css                       # Global Tailwind styles + custom theme vars
├── supabaseClient.ts               # Supabase singleton with header injection
├── types.ts                        # Single source of truth for all TypeScript types
├── constants.ts                    # Global constants (roles, views, etc.)
│
├── components/                     # React components (60+ files)
│   ├── ui.tsx                      # Design system — Button, Card, Modal, Input, etc.
│   ├── icons.tsx                   # Icon set (PlusIcon, ArrowLeftIcon, etc.)
│   ├── AppRouter.tsx               # View dispatcher (switch on activeView)
│   ├── AppLayout.tsx               # Master layout container
│   ├── Sidebar.tsx                 # Navigation + role switcher
│   ├── Header.tsx                  # Top bar + back button
│   ├── LazyComponents.tsx          # Code-split lazy imports of major views
│   ├── ErrorBoundary.tsx           # Catches React render errors
│   ├── ErrorProvider.tsx           # Toast error handler
│   ├── SystemGuardian.tsx          # Loading + error overlay wrapper
│   ├── ProtectedRoute.tsx          # Permission-based render gates
│   ├── ProtectedGate.tsx           # Secondary auth gate
│   ├── AccessDenied.tsx            # 403 fallback component
│   │
│   ├── LoginPage.tsx               # Auth entry point
│   ├── ResetPasswordPage.tsx       # Password reset flow
│   ├── InscrierePublicPage.tsx     # Public athlete registration
│   ├── RoleSelectionPage.tsx       # Role chooser (multiple roles)
│   │
│   ├── Sportivi/                   # Athlete management module
│   │   ├── index.tsx               # Main athletes CRUD
│   │   ├── SportiviFilter.tsx      # Search + filter UI
│   │   ├── SportiviTable.tsx       # Desktop athlete list
│   │   ├── SportiviMobileList.tsx  # Mobile athlete list
│   │   ├── SportivModals.tsx       # Reusable modals (delete, role, etc.)
│   │   ├── SportivFormModal.tsx    # Add/edit form
│   │   ├── FisaDigitalaSportiv.tsx # Athlete profile view
│   │   ├── ImportSportiviPage/     # Batch import (Excel/CSV)
│   │   ├── DeduplicareSportivi/    # Duplicate detection + merge
│   │   └── CereriInscriere.tsx     # Registration requests from public
│   │
│   ├── GestiuneExamene/            # Grade exam sessions
│   │   ├── index.tsx               # Main exam management
│   │   ├── RapoarteExamen.tsx      # Exam reports
│   │   └── [subcomponents]
│   │
│   ├── Grade/                      # Grade chains + nomenclature
│   │   ├── Grade.tsx               # Grade display + chain visualization
│   │   ├── GestionareNomenclatoare.tsx  # Add/edit grades per category
│   │   ├── InlantuciriAdmin.tsx    # Grade chain rules editor
│   │   └── [utilities]
│   │
│   ├── Grupe/                      # Training groups
│   │   ├── index.tsx               # Group CRUD
│   │   ├── ProgramEditor.tsx       # Weekly schedule editor
│   │   ├── ProgramAntrenamenteManagement.tsx  # Mass schedule updates
│   │   └── [subcomponents]
│   │
│   ├── Competitii/                 # Competitions (tehnica/giao_dau/cvd)
│   │   ├── index.tsx               # Competition management
│   │   ├── InscriereClubWizard/    # Multi-step registration
│   │   ├── FisaCompetitie.tsx      # Competition details
│   │   ├── StagiiManagement.tsx    # Stages + brackets
│   │   └── [subcomponents]
│   │
│   ├── Plati/                      # Financial module
│   │   ├── PlatiScadente.tsx       # Overdue payments
│   │   ├── JurnalIncasari.tsx      # Payment journal
│   │   ├── TipuriAbonament.tsx     # Subscription type config
│   │   ├── ConfigurarePreturi.tsx  # Price configuration
│   │   ├── Familii.tsx             # Family grouping
│   │   ├── RaportFinanciar.tsx     # Financial dashboard
│   │   ├── TaxeAnuale.tsx          # Annual tax tracking
│   │   ├── Reduceri.tsx            # Discounts
│   │   ├── GestiuneFacturi.tsx     # Invoice management
│   │   ├── FacturiPersonale.tsx    # Personal invoice history
│   │   ├── FinancialDashboard.tsx  # Admin financials
│   │   └── [utilities]
│   │
│   ├── Prezenta/                   # Attendance module
│   │   ├── index.tsx               # Check-in interface
│   │   ├── RaportPrezenta.tsx      # Attendance report
│   │   ├── RaportLunarPrezenta.tsx # Monthly attendance
│   │   ├── MartialAttendance.tsx   # Instructor check-in
│   │   ├── InstructorPrezentaPage.tsx # Instructor view
│   │   ├── ArhivaPrezente.tsx      # Historical records
│   │   └── [subcomponents]
│   │
│   ├── AIAssistant/                # AI help widget
│   │   ├── index.tsx               # Widget UI
│   │   ├── RAG integration         # Vector search + Claude/Gemini
│   │   └── [subcomponents]
│   │
│   ├── UserProfile/                # User account page
│   │   ├── UserProfile.tsx         # Profile + settings
│   │   └── EditareProfilPersonal.tsx # Edit personal data
│   │
│   ├── Tutorial/                   # User guide widget
│   ├── GhidUtilizator/             # Tour overlays
│   ├── SMS/                        # SMS system
│   │   ├── AdminSMS.tsx            # Admin SMS interface
│   │   └── [subcomponents]
│   │
│   ├── [Admin Pages]
│   │   ├── AdminDashboard.tsx      # Admin home
│   │   ├── AdminConsole.tsx        # Debug console
│   │   ├── CluburiManagement.tsx   # Club CRUD
│   │   ├── UserManagement.tsx      # User + role assignment
│   │   ├── FederationDashboard.tsx # Federation stats
│   │   ├── FederationStructure.tsx # Org chart
│   │   ├── FederationInvoices.tsx  # Federation billing
│   │   ├── ReportsDashboard.tsx    # Report generator
│   │   ├── BackupManager.tsx       # Data export
│   │   └── [utilities]
│   │
│   └── [Other Components] (30+)
│       └── WelcomeHero, CalendarView, Notificari, etc.
│
├── contexts/                       # React Context API
│   ├── DataContext.tsx             # Global data cache + user roles
│   ├── NavigationContext.tsx       # Active view + history stack
│   ├── NotificationContext.tsx     # Notification system
│   └── AIAssistantContext.tsx      # AI widget state
│
├── hooks/                          # Custom React hooks (35+ files)
│   ├── useAppLogic.ts              # Auth orchestration (session, roles, logout)
│   ├── useDataProvider.ts          # Aggregates all data queries
│   ├── useUserRoles.ts             # Fetch user roles from DB
│   ├── usePermissions.ts           # Compute access control from role
│   ├── useNavigation.ts            # Access NavigationContext
│   ├── useData.ts                  # Access DataContext
│   ├── useLocalStorage.ts          # Persist state to localStorage
│   │
│   ├── [Data Fetching]
│   │   ├── useSportivi.ts          # Fetch athletes (filtered by club)
│   │   ├── usePlati.ts             # Fetch payments
│   │   ├── useGrupe.ts             # Fetch groups
│   │   ├── useAttendanceData.ts    # Fetch attendance records
│   │   ├── useCachedData.ts        # Generic cache helper
│   │   └── [other data hooks]
│   │
│   ├── [Feature Hooks]
│   │   ├── useFamilyManager.ts     # Family operations
│   │   ├── useExamManager.ts       # Exam logic
│   │   ├── useSportivForm.ts       # Form state for athletes
│   │   ├── useRoleAssignment.ts    # Role assignment logic
│   │   ├── useExamenRegistration.ts
│   │   └── [others]
│   │
│   └── [Utilities]
│       ├── useIsMobile.ts          # Window size check
│       ├── useError.ts             # Access error context
│       ├── useUnsavedChanges.ts    # Warn before page exit
│       └── [others]
│
├── services/                       # Business logic layer
│   ├── sportivService.ts           # Athlete mutations (add, update, delete)
│   ├── importSportiviService.ts    # Batch import from Excel/CSV
│   ├── familieService.ts           # Family operations
│   ├── authService.ts              # Auth helpers
│   ├── ragService.ts               # Vector search for AI (Gemini embeddings)
│   ├── claudeService.ts            # Claude API calls for chat
│   │
│   └── agents/                     # AI agent functions
│       ├── orchestrator.ts         # Routes queries to agents
│       ├── sportiviAgent.ts        # Athlete queries
│       ├── financiarAgent.ts       # Financial queries
│       ├── grupeAgent.ts           # Group queries
│       ├── exameneAgent.ts         # Exam queries
│       ├── prezentaAgent.ts        # Attendance queries
│       └── [others]
│
├── sql/                            # Database migrations + utilities
│   ├── migrations/                 # Numbered SQL files (001_*, 002_*, etc.)
│   ├── rls/                        # RLS policy definitions per table
│   ├── queries/                    # Reusable SQL snippets
│   ├── fixes/                      # One-off data corrections
│   ├── refactor/                   # Schema refactoring scripts
│   ├── maintenance/                # Cleanup + optimization
│   └── SUPABASE_SQL_FUNCTIONS.md  # Custom function documentation
│
├── src/                            # Zustand + utilities
│   └── store/
│       ├── useAppStore.ts          # App state (sidebar expanded, etc.)
│       └── useAIStore.ts           # AI widget state
│
├── contexts/ + hooks/              # (Listed above)
│
├── public/                         # Static assets
│   ├── index.html                  # Served by Vite
│   └── [other static files]
│
├── docs/                           # Detailed documentation
│   ├── arhitectura.md              # Architecture (stack, routing, Supabase)
│   ├── baza-de-date.md             # DB schema complete
│   ├── roluri-permisiuni.md        # Roles + RLS rules
│   ├── module.md                   # Per-module breakdown
│   ├── fluxuri.md                  # Complete workflows
│   ├── conventii-cod.md            # Code style + naming
│   ├── HARTA_APLICATIE.md          # Product vision + phases
│   ├── ARHITECTURA_COMPETITII.md   # Competition types + rules
│   ├── RAG_IMPLEMENTARE.md         # AI integration
│   └── [others]
│
├── knowledge/                      # Knowledge base (if exists)
├── scripts/                        # Utility scripts
├── .planning/                      # Codebase maps (this folder)
├── .claude/                        # Agent skills + commands
├── .superpowers/                   # Brainstorm artifacts
│
├── config/                         # Configuration
│   └── permissionsConfig.ts        # Permission rules matrix
│
├── package.json                    # Dependencies + scripts
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite build + path aliases
├── postcss.config.js               # Tailwind CSS
├── .env                            # Local environment (git-ignored)
├── .env.example                    # Environment template
├── CLAUDE.md                       # Project conventions (THIS FILE)
└── README.md                       # Setup instructions
```

## Directory Purposes

**components/:**
- Purpose: React UI components organized by feature module
- Contains: 60+ components, 3 major dashboards, 8 full modules, design system
- Key files: `ui.tsx` (design system), `AppRouter.tsx` (dispatcher), `LazyComponents.tsx` (code splitting)
- Pattern: Each module (Sportivi, Plati, etc.) is a folder with index.tsx as entry; shared UI in root

**contexts/:**
- Purpose: React Context API providers for global state
- Contains: DataContext (data cache), NavigationContext (view routing), NotificationContext, AIAssistantContext
- Key files: `DataContext.tsx` (filteredData distribution), `NavigationContext.tsx` (view + history)
- Pattern: Provider wraps app at root (index.tsx); hooks access context (useData, useNavigation)

**hooks/:**
- Purpose: Custom React hooks for data fetching, state management, feature logic
- Contains: 35+ hooks organized by category (data fetching, permissions, forms, utilities)
- Key files: `useDataProvider.ts` (aggregator), `usePermissions.ts` (RBAC), `useSportivi.ts` (athletes)
- Pattern: Each hook exports single function; no component code; pure logic

**services/:**
- Purpose: Business logic, mutations, integrations, AI agents
- Contains: Service functions (sportivService, importSportiviService), AI agents
- Key files: `sportivService.ts` (athlete CRUD), `ragService.ts` (vector search), agents folder
- Pattern: Pure functions, no React hooks; handle errors; return Promises

**sql/:**
- Purpose: Database schema, migrations, RLS policies, custom functions
- Contains: Numbered migrations, RLS per table, reusable query snippets, one-off fixes
- Key files: `migrations/` (schema history), `rls/` (security policies), `SUPABASE_SQL_FUNCTIONS.md` (docs)
- Pattern: Each migration numbered (001_initial.sql, 002_add_athletes.sql); RLS in rls/ folder

**src/store/:**
- Purpose: Zustand global state stores
- Contains: useAppStore (sidebar, theme), useAIStore (widget visibility)
- Key files: `useAppStore.ts`, `useAIStore.ts`
- Pattern: Simple Zustand stores; minimal state; prefer Context for large trees

**docs/:**
- Purpose: Detailed project documentation
- Contains: Architecture, DB schema, roles, workflows, competition rules, AI integration
- Key files: `HARTA_APLIKATIE.md` (product vision), `baza-de-date.md` (schema reference)
- Pattern: Markdown files with diagrams, SQL examples, workflow steps

## Key File Locations

**Entry Points:**
- `index.html`: Browser loads this; contains `<div id="root">`
- `index.tsx`: React mount; wraps with providers (ErrorProvider, QueryClientProvider, etc.)
- `App.tsx`: Root component; orchestrates session, auth, layout

**Configuration:**
- `types.ts`: All TypeScript interfaces (Views, Roles, data models)
- `constants.ts`: Global constants (roleNames, viewNames, etc.)
- `supabaseClient.ts`: Supabase singleton with header injection
- `vite.config.ts`: Path aliases (@components, @hooks, @contexts)
- `tsconfig.json`: TypeScript strict mode + path aliases

**Core Logic:**
- `hooks/useAppLogic.ts`: Session + role orchestration
- `hooks/useDataProvider.ts`: Aggregates all data queries
- `contexts/DataContext.tsx`: Distributes filteredData to components
- `contexts/NavigationContext.tsx`: Manages activeView + history stack

**Testing:**
- No test files found; project uses manual QA

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `Sportivi.tsx`, `SportivFormModal.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useSportivi.ts`, `usePermissions.ts`)
- Services: camelCase with suffix (e.g., `sportivService.ts`, `importSportiviService.ts`)
- Utils: camelCase (e.g., `supabaseFilters.ts`, `date.ts`)
- Types/Constants: camelCase file, but interfaces PascalCase inside (e.g., `types.ts` exports `interface Sportiv {}`)

**Directories:**
- Feature modules: PascalCase (e.g., `Sportivi/`, `Competitii/`, `Grupe/`)
- Utilities: lowercase (e.g., `hooks/`, `services/`, `contexts/`, `sql/`)
- Nested components: PascalCase matching component name (e.g., `Sportivi/SportiviTable.tsx`)

**Variables & Functions:**
- Functions: camelCase (e.g., `handleClick`, `fetchAthletes`, `getAge`)
- Domain objects (Romanian): camelCase (e.g., `sportiv`, `grupa`, `plata`, `sesiuneExamen`)
- Types: PascalCase (e.g., `Sportiv`, `Grupa`, `User`)
- React hooks: `useXxx` (e.g., `useNavigation`, `useData`, `usePermissions`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_HISTORY = 15`)
- CSS classes: kebab-case (Tailwind default, e.g., `flex`, `pt-4`, `bg-slate-800`)

## Where to Add New Code

**New Feature (Full Module):**
1. Create folder in `components/` (e.g., `components/NouaModula/`)
2. Create `index.tsx` as entry point exporting main React component
3. Add sub-components as siblings (e.g., `NouaModulaForm.tsx`, `NouaModulaTable.tsx`)
4. Add hook in `hooks/` (e.g., `useNouaModula.ts`) for data fetching
5. Add service in `services/` (e.g., `nouaModulaService.ts`) for mutations
6. Add View to `types.ts` (e.g., `type View = ... | 'noua-modula'`)
7. Add lazy import in `components/LazyComponents.tsx`
8. Add route in `components/AppRouter.tsx` (case 'noua-modula': return ...)
9. Add menu item in `components/menuConfig.ts` with permission check
10. Add RLS policy in `sql/rls/` folder if new table created

**New Component (UI Widget):**
- If reusable: Add export to `components/ui.tsx` (with Props interface)
- If module-specific: Add to `components/NouaModula/NouaComponenta.tsx`

**New Data Entity (Table):**
1. Create migration in `sql/migrations/` (e.g., `sql/migrations/010_create_nou_entity.sql`)
2. Create RLS policies in `sql/rls/nou_entity.sql`
3. Add type in `types.ts` (interface NouEntity {})
4. Create fetch hook in `hooks/` (e.g., `useNouEntity.ts`)
5. Add to `useDataProvider.ts` aggregation
6. Create service in `services/` for mutations

**New Hook:**
- Location: `hooks/` folder
- File name: `use[CamelCase].ts` (e.g., `useSportivi.ts`)
- Pattern: Export single function returning object; use React.useCallback/useMemo; no component code
- Example: `export const useNouData = () => { const [data, setData] = useState(...); return { data, isLoading, error }; }`

**New Service Function:**
- Location: `services/` folder
- File name: `[domain]Service.ts` (e.g., `nouaModulaService.ts`)
- Pattern: Export async functions; no React hooks; handle errors; call `queryClient.invalidateQueries()` after mutation
- Example: `export const adaugaNouEntitate = async (data: NouEntity) => { const { error } = await supabase.from('nou_entity').insert(data); if (error) throw error; queryClient.invalidateQueries({ queryKey: ['nouEntity'] }); }`

**New API Integration:**
- If external service (e.g., payment gateway): Create `services/[provider]Service.ts`
- If AI (Claude/Gemini): Extend `services/claudeService.ts` or `services/ragService.ts`
- Environment variables: Add to `.env.example`, document in CLAUDE.md

**Database Change:**
- Create SQL migration in `sql/migrations/` numbered sequentially
- Run with Supabase CLI: `supabase migration up`
- If RLS change: Update `sql/rls/[table].sql` and reapply
- Update types.ts to match new schema

## Special Directories

**sql/migrations/:**
- Purpose: Versioned schema changes
- Generated: Yes (by Supabase CLI when running local dev)
- Committed: Yes (part of repo for reproducibility)
- Pattern: Each file numbered 001_*, 002_*, etc. in chronological order
- Usage: Run via Supabase CLI; applied automatically on deploy

**docs/:**
- Purpose: Reference documentation
- Generated: No (manually maintained)
- Committed: Yes (part of repo for team knowledge)
- Consumers: Developers, GSD agents via /gsd-map-codebase
- Key file: `HARTA_APLICATIE.md` (master product vision)

**.planning/codebase/:**
- Purpose: GSD codebase maps (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by /gsd-map-codebase agent)
- Committed: Yes (for context persistence across sessions)
- Consumers: /gsd-plan-phase and /gsd-execute-phase agents
- Update: Re-run /gsd-map-codebase after major refactors

**.claude/:**
- Purpose: Agent skills and commands
- Generated: Partially (some auto-created, some manual)
- Committed: Yes (project-specific customizations)
- Contains: skills/ (reusable patterns), commands/ (GSD commands)

**src/store/:**
- Purpose: Zustand global state
- Files: `useAppStore.ts` (UI state), `useAIStore.ts` (AI widget)
- Pattern: Minimal; prefer Context for data
- When to use: Client-only UI state (sidebar expanded, modal open)

---

*Structure analysis: 2026-06-04*
