# Codebase Structure

**Analysis Date:** 2026-06-05

## Directory Layout

```
portal-phihau/
├── App.tsx                     # Root orchestrator — session, auth state machine
├── index.tsx                   # React entry, provider tree
├── index.html                  # HTML shell
├── index.css                   # Global CSS (minimal — Tailwind handles styling)
├── types.ts                    # SINGLE type registry — all 723 lines, all types here
├── supabaseClient.ts           # Supabase singleton with custom fetch / header injection
├── constants.ts                # App-wide constants
├── themes.ts                   # Theme definitions
├── metadata.json               # App metadata
├── components/                 # All React UI components
├── hooks/                      # React Query hooks and custom logic hooks
├── contexts/                   # React context providers
├── services/                   # Business logic, batch ops, AI services
├── utils/                      # Pure utility functions
├── api/                        # Vercel serverless functions (13 handlers)
├── src/
│   └── store/                  # Zustand global stores
│       ├── useAppStore.ts      # UI state (sidebar, modals)
│       └── useAIStore.ts       # AI widget state
├── sql/
│   └── migrations/             # Manual SQL migrations (applied in Supabase dashboard)
├── docs/                       # Architecture docs, module docs, conventions
├── knowledge/                  # RAG knowledge base documents
├── config/                     # App configuration files
├── scripts/                    # Build/utility scripts
├── tests/                      # Test files
├── assets/                     # Static assets
├── public/                     # Public web assets
├── supabase/                   # Supabase local config
├── vite.config.ts              # Vite build config, path aliases, code splitting
├── tsconfig.json               # TypeScript config, path aliases (@components, @hooks, @contexts)
├── tailwind.config.js          # Tailwind theme customization
├── vercel.json                 # Deployment config, SPA rewrite rules, cache headers
└── package.json                # Dependencies and scripts
```

## Directory Purposes

**`components/` — UI layer (70+ files):**
- Purpose: All React components rendered by `AppRouter`
- Contains: Feature modules, modals, pages, design system
- Key sub-directories and files:

  **`components/Sportivi/`** — Athlete management (18 files):
  - `index.tsx` — Main Sportivi view
  - `SportiviTable.tsx`, `SportiviFilter.tsx`, `SportiviMobileList.tsx` — List/filter UI
  - `SportivFormModal.tsx`, `SportivFormFields.tsx`, `SportivModals.tsx` — CRUD forms
  - `FisaDigitalaSportiv.tsx`, `SportivPassport.tsx` — Athlete digital card
  - `ImportSportiviPage/` — Multi-step import wizard
  - `DeduplicareSportivi/` — Deduplication flow

  **`components/Grupe/`** — Training groups (12 files):
  - `index.tsx` — Main Grupe view
  - `GrupaCard.tsx` — Group card (DO NOT break API)
  - `GrupaDetailView.tsx` — Drill-down detail with tabs
  - `OrarEditorModal.tsx` — Schedule editor (DO NOT break API)
  - `AdaugaSportiviModal.tsx` — Add athletes to group (DO NOT break API)
  - `GrupaFormModal.tsx` — Group CRUD form
  - `GenerareAntrenamenteModal.tsx` — Training generation
  - `ProgramAntrenamenteManagement.tsx`, `ProgramEditor.tsx` — Program management

  **`components/Competitii/`** — Competition management (8 files + wizard):
  - `index.tsx` — Main Competitii view
  - `StagiiCompetitii.tsx` — Competition stages (base, do not rewrite)
  - `StagiiManagement.tsx` — Stage management
  - `FisaCompetitie.tsx` — Competition sheet
  - `TipuriCompetitieAdmin.tsx`, `CategoriiTemplateManager.tsx` — Admin config
  - `InscriereClubWizard/` — Multi-step registration wizard:
    - `index.tsx` — Wizard shell
    - `Pas1.tsx` — Step 1: Sport selection
    - `Pas2Quyen.tsx` — Step 2: Quyen (forms kata)
    - `Pas3Echipe.tsx` — Step 3: Team events
    - `Pas4Sumar.tsx` — Step 4: Summary/confirm
    - `InscriereClubCards.tsx` — Club selection cards
    - `constants.tsx`, `shared.tsx`, `types.ts` — Wizard internals

  **`components/Plati/`** — Financial module (13 files):
  - `PlatiScadente.tsx` — Due payments main view
  - `FinancialDashboard.tsx` — Financial overview charts
  - `GestiuneFacturi.tsx` — Invoice management
  - `FacturaChitantaModal.tsx` — Invoice/receipt modal
  - `JurnalIncasari.tsx` — Collections journal
  - `TipuriAbonament.tsx` — Subscription types management
  - `ConfigurarePreturi.tsx` — Price configuration
  - `TaxeAnuale.tsx` — Annual fees management
  - `RaportFinanciar.tsx`, `AgingReport.tsx` — Reports

  **`components/GestiuneExamene/`** — Exam management (15 files):
  - `index.tsx` — Main exam view
  - `SesiuneForm.tsx`, `DetaliiSesiune.tsx` — Session management
  - `ModulInscriereExamen.tsx`, `ManagementInscrieri.tsx` — Registration
  - `ValidareRezultate.tsx`, `FinalizeExam.tsx` — Results flow
  - `ImportSportiviExamen.tsx`, `ImportExcelExamen.tsx` — Bulk import
  - `RapoarteExamen.tsx`, `IstoricExamene.tsx` — Reports

  **`components/Prezenta/`** — Attendance (15 files):
  - `index.tsx` — Main view
  - `ListaPrezentaAntrenament.tsx` — Per-training attendance list
  - `PrezentaRapida.tsx` — Quick attendance marking
  - `DashboardPrezentaAzy.tsx` — Today's attendance dashboard
  - `RaportLunarPrezenta.tsx`, `RaportPrezenta.tsx` — Monthly/general reports
  - `ArhivaPrezente.tsx`, `IstoricPrezentaGlobal.tsx` — Archive/history

  **`components/Grade/`** — Grade system (7 files):
  - `Grade.tsx` — Main grade view
  - `GestionareNomenclatoare.tsx` — Nomenclature management
  - `InlantuireGradePanel.tsx`, `InlantuireFormModal.tsx` — Grade chain rules
  - `MatriceGradePanel.tsx` — Grade matrix view

  **`components/AIAssistant/`** — AI chat widget (6 files):
  - `AIAssistantWidget.tsx` — Widget container
  - `AgentPanel.tsx` — Agent interaction panel
  - `ChatMessage.tsx` — Message rendering
  - `QuickActions.tsx` — Predefined action buttons
  - `index.ts` — Exports

  **Key top-level component files:**
  - `ui.tsx` — INTERNAL design system (Button, Modal, Card, Input, Badge, Alert, Table, etc.) — the ONLY component library; never use Shadcn/MUI
  - `AppRouter.tsx` — 58-case switch view dispatcher
  - `AppLayout.tsx` — Master layout shell
  - `Sidebar.tsx` — Navigation + role switcher
  - `LazyComponents.tsx` — All lazy import declarations for code splitting
  - `ErrorBoundary.tsx` — React error boundary
  - `ErrorProvider.tsx` — App-wide error context
  - `LoginPage.tsx`, `RoleSelectionPage.tsx`, `MandatoryPasswordChange.tsx` — Auth flow pages

**`hooks/` — Data and logic hooks (30+ files):**
- `useDataProvider.ts` — Master orchestrator; calls all data hooks; returns `AppData` aggregate
- `useSportivi.ts` — React Query hook for athletes
- `usePlati.ts` — React Query hook for payments
- `useGrupe.ts` — React Query hook for training groups
- `useUserRoles.ts` — Fetch and manage user role assignments
- `usePermissions.ts` — Compute access control from active role context
- `useFilteredData.ts` — Apply `visibleClubIds` filter to all data
- `useAttendanceData.ts` — Attendance-specific query hook
- `useAuth.ts` — Authentication state and actions
- `useNomenclatoare.ts` — Grade nomenclature data
- `useInlantuiri.ts`, `useInlantuiriGrade.ts`, `useInlantuiriPivot.ts` — Grade chain hooks
- `useExamenRegistration.ts`, `useExamManager.ts` — Exam flow hooks
- `useTipuriCompetitie.ts` — Competition type data
- `useIsMobile.ts` — Responsive breakpoint detection
- `useLocalStorage.ts` — LocalStorage sync hook
- `useUnsavedChanges.ts` — Dirty state / unsaved changes guard

**`contexts/` — React context providers (4 files):**
- `DataContext.tsx` — Central data hub; exposes all data + `filteredData` to all components via `useData()`
- `NavigationContext.tsx` — SPA navigation: `activeView`, `viewParams`, history stack, `navigateTo()`, `goBack()`
- `ErrorProvider.tsx` — App-wide error state and `showError()` utility
- `NotificationContext.tsx` — In-app notification state
- `AIAssistantContext.tsx` — AI assistant open/close state

**`services/` — Business logic layer (8+ files):**
- `importSportiviService.ts` — Excel/CSV athlete import with deduplication logic
- `sportivService.ts` — Athlete CRUD operations, complex mutations
- `ragService.ts` — RAG document indexing and retrieval (Gemini embeddings + pgvector)
- `claudeService.ts` — Claude API integration for AI chat
- `familieService.ts` — Family linking and management
- `importExcelExamenService.ts` — Excel import for exam sessions
- `authService.ts` — Auth helper operations
- `agents/` — AI agent definitions

**`utils/` — Pure utility functions (18+ files):**
- `eligibilitateCompetitie.ts` — Competition eligibility rules engine
- `competitiiTemplates.ts` — Competition category templates
- `taxeCompetitie.ts` — Competition fee calculation
- `formatareSportiv.ts` — Athlete name/data formatting (created June 2026)
- `supabaseFilters.ts` — UUID and filter helpers for Supabase queries (`withCleanUuidFilters`)
- `supabaseHelpers.ts` — `processSettledQueries`, batch query utilities
- `supabaseUtils.ts`, `supabase.ts` — Additional Supabase utilities
- `cache.ts` — `getCachedData` / `setCachedData` for localStorage caching
- `date.ts` — Date manipulation wrappers (uses `date-fns`)
- `csv.ts` — CSV parsing/export helpers
- `exportFinanciar.ts` — Financial export (Excel/PDF)
- `exportPDFCompetitie.ts` — Competition PDF export
- `grades.ts`, `gradeUtils.ts` — Grade calculation utilities
- `eligibility.ts` — General eligibility helpers
- `validation.ts` — Form validation helpers
- `paymentStatus.ts`, `pricing.ts` — Payment status and pricing logic
- `notifications.ts` — Notification helpers
- `trainingGenerator.ts` — Training schedule generator logic
- `auth.ts` — Auth utility helpers
- `error.ts` — Error formatting utilities
- `import-processor.ts` — Import processing pipeline helpers

**`api/` — Vercel serverless functions (13 handlers):**
- `claude-proxy.ts` — Claude API proxy (exposes `CLAUDE_API_KEY` server-side)
- `gemini-proxy.ts` — Gemini API proxy
- `groq-proxy.ts` — Groq LLM proxy
- `rag-index.ts` — RAG document indexing endpoint
- `rag-search.ts` — RAG semantic search endpoint
- `sms-send.ts`, `sms-status.ts`, `sms-test-connection.ts` — SMS gateway handlers
- `creare-cont.ts` — Account creation via service role
- `schimba-email.ts`, `schimba-username.ts` — Account management
- `reset-parola-sportiv.ts` — Password reset for athletes
- `health.ts` — Health check endpoint
- `checkLeakedPassword.ts` — HaveIBeenPwned check

**`sql/migrations/` — Manual SQL migrations (17 files):**
- Applied manually in Supabase dashboard (never auto-applied)
- Key migrations: `add_tipuri_competitie.sql`, `add_tipuri_stagii.sql`, `add_pret_per_categorie_stagiu.sql`, `fix_rls_all_tables.sql`, `fix_rls_security_audit.sql`, `role_based_views.sql`, `add_rag_knowledge_base.sql`, `add_status_motiv_antrenamente.sql`

**`docs/` — Architecture and domain documentation:**
- `arhitectura.md`, `baza-de-date.md`, `roluri-permisiuni.md`, `module.md`, `fluxuri.md`
- `conventii-cod.md`, `HARTA_APLICATIE.md`, `ARHITECTURA_COMPETITII.md`, `RAG_IMPLEMENTARE.md`

## Key File Locations

**Entry Points:**
- `index.tsx` — React root mount with provider tree
- `App.tsx` — Session + auth state machine
- `components/AppRouter.tsx` — 58-case view dispatcher

**Configuration:**
- `vite.config.ts` — Build config with React plugin, `@components`/`@hooks`/`@contexts` path aliases
- `tsconfig.json` — TypeScript config with same path aliases
- `tailwind.config.js` — Theme customization (colors, shadows, animations)
- `vercel.json` — SPA rewrite rules and cache headers

**Core Logic:**
- `supabaseClient.ts` — Singleton Supabase client with `active-role-context-id` header injection
- `types.ts` — All 723 type definitions (single source of truth)
- `hooks/useDataProvider.ts` — Master data orchestrator

**Design System:**
- `components/ui.tsx` — Complete internal component library (Button, Modal, Card, Input, Badge, Alert, Table, Tabs, Select, Checkbox, DatePicker, etc.)

**Testing:**
- `tests/` — Test files directory

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `SportivCard.tsx`, `GrupaFormModal.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `usePermissions.ts`, `useDataProvider.ts`)
- Services: `camelCase.ts` with `Service` suffix (e.g., `importSportiviService.ts`, `sportivService.ts`)
- Utilities: `camelCase.ts` by function (e.g., `eligibilitateCompetitie.ts`, `formatareSportiv.ts`)
- Context files: `PascalCase.tsx` (e.g., `DataContext.tsx`, `NavigationContext.tsx`)

**Directories:**
- Feature modules: `PascalCase/` with `index.tsx` entry (e.g., `Sportivi/`, `Grupe/`, `Competitii/`)
- Utilities: `camelCase/` (e.g., `hooks/`, `services/`, `utils/`)

## Where to Add New Code

**New feature view (new page/screen):**
1. Add component file: `components/MyFeature/index.tsx`
2. Add lazy import in `components/LazyComponents.tsx`
3. Add case in `components/AppRouter.tsx` switch statement
4. Add view string to `View` type in `types.ts`
5. Add navigation item in `components/menuConfig.ts`

**New data entity:**
1. Add type to `types.ts` (never create a separate types file)
2. Add React Query hook in `hooks/useMyEntity.ts`
3. Import and add to `AppData` interface in `hooks/useDataProvider.ts`
4. Include in `FilteredData` type in `types.ts` if club-filtered
5. Apply filter in `hooks/useFilteredData.ts`
6. Add SQL migration in `sql/migrations/`

**New UI component:**
- Add to `components/ui.tsx` — NOT as a separate file, NOT from Shadcn/MUI

**New utility function:**
- Add to most relevant `utils/` file, or create `utils/myDomain.ts`

**New serverless API endpoint:**
- Add `api/my-endpoint.ts` and register in `vercel.json`

**New modal in feature:**
- Place in same directory as its parent feature (e.g., `components/Grupe/MyModal.tsx`)

## Special Directories

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes
- Committed: No

**`sql/migrations/`:**
- Purpose: SQL migrations applied manually in Supabase
- Generated: No
- Committed: Yes — source of truth for DB schema changes

**`knowledge/`:**
- Purpose: RAG knowledge base documents (indexed via `api/rag-index.ts`)
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: GSD workflow planning artifacts, phase plans, codebase docs
- Generated: Partially (by GSD tooling)
- Committed: Yes

---

*Structure analysis: 2026-06-05*
