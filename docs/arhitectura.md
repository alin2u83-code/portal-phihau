# Arhitectura Tehnică — Portal PhiHau

## Stack

| Layer | Tehnologie |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS 3 |
| Routing | React Router DOM v6 (SPA, fără SSR) |
| State server | TanStack React Query v5 |
| State global | Zustand (`src/store/useAppStore.ts`) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Deploy | Vercel (SPA static) |
| PDF | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Import Excel/CSV | xlsx + PapaParse |
| AI | Google Gemini (embeddings) + Claude API (chat) |

## Structura folderelor

```
portal-phihau/
├── App.tsx                 # Root — routing, session, layout
├── types.ts                # Toate tipurile TypeScript (domeniu complet)
├── supabaseClient.ts       # Client Supabase singleton cu header custom
├── constants.ts            # Constante globale
├── themes.ts               # Configurare teme per club
│
├── components/
│   ├── AIAssistant/        # AI chat widget + RAG
│   ├── Competitii/         # Competiții + stagii (index.tsx = CompetitiiManagement)
│   ├── Grade/              # Grade QwanKiDo + înlănțuiri + nomenclatoare
│   ├── GestiuneExamene/    # Examene (index.tsx) + toate subcomponentele
│   ├── GhidUtilizator/     # Ghid utilizator
│   ├── Grupe/              # Grupe + orar + antrenamente (index.tsx)
│   ├── Plati/              # Plăți, facturi, familie, financiar
│   ├── Prezenta/           # Prezență (index.tsx) + rapoarte + arhivă
│   ├── SMS/                # Sistem SMS
│   ├── SportivDashboard/   # Dashboard sportiv (index.tsx)
│   ├── Sportivi/           # CRUD sportivi + import + fișe
│   ├── Tutorial/           # Tutorial
│   ├── UserProfile/        # Profil utilizator
│   │
│   │   # Shared — rămân în root components/:
│   ├── ui.tsx              # Design system intern (Button, Modal, Card etc.)
│   ├── icons.tsx           # Icoane
│   ├── AppRouter.tsx       # Mapare View → componentă
│   ├── AppLayout.tsx       # Layout principal
│   ├── LazyComponents.tsx  # Lazy imports pentru toate componentele majore
│   ├── menuConfig.ts       # Configurare meniu per rol
│   ├── Sidebar.tsx, Header.tsx, AdminHeader.tsx
│   ├── ErrorBoundary.tsx, ErrorProvider.tsx, SystemGuardian.tsx, ClubGuard.tsx
│   ├── ProtectedRoute.tsx, ProtectedGate.tsx, AccessDenied.tsx
│   ├── LoginPage.tsx, ResetPasswordPage.tsx, MandatoryPasswordChange.tsx
│   ├── RoleSelectionPage.tsx, InscrierePublicPage.tsx
│   └── [misc: CalendarView, Activitati, WelcomeHero, etc.]
│
├── contexts/
│   ├── DataContext.tsx      # Date globale filtrate (sportivi, grupe, plăți...)
│   ├── NavigationContext.tsx # activeView + history stack
│   ├── NotificationContext.tsx
│   └── AIAssistantContext.tsx
│
├── hooks/
│   ├── usePermissions.ts   # Permisiuni bazate pe rol activ
│   ├── useAppLogic.ts      # Auth + session + rol orchestrator
│   ├── useRoleManager.ts   # Gestionare roluri multiple
│   └── useFilteredData.ts  # Filtrare date după club/rol
│
├── services/
│   ├── ragService.ts       # Vector search Supabase + Gemini embeddings
│   ├── claudeService.ts    # Claude API chat
│   ├── importSportiviService.ts
│   └── agents/             # Agenți AI specializați
│
├── sql/
│   ├── migrations/         # Migrații DB în ordine cronologică
│   ├── rls/                # Politici RLS per tabel
│   └── SUPABASE_SQL_FUNCTIONS.md
│
└── docs/                   # Documentație (acest folder)
```

## Path Aliases

Configurate în `vite.config.ts` și `tsconfig.json` pentru import-uri scurte:

| Alias | Rezolvare |
|-------|-----------|
| `@components` | `./components` |
| `@hooks` | `./hooks` |
| `@contexts` | `./contexts` |

Exemplu: `import { Button } from '@components/ui'` în loc de `../../components/ui`.

## Navigare SPA

Aplicația nu folosește URL-uri pentru navigare internă. Starea activă e un `View` (string enum din `types.ts`) stocat în `NavigationContext`. Componentele centrale:
- `AppRouter.tsx` — switch pe `activeView`, renderează componenta corespunzătoare
- `NavigationContext` — `activeView`, `setActiveView`, `goBack()`, `canGoBack`
- `Sidebar.tsx` / `menuConfig.ts` — iteme meniu filtrate după permisiuni

## Supabase Client

`supabaseClient.ts` injectează automat header-ul `active-role-context-id` în fiecare request. Acesta e folosit de funcțiile SQL pentru a determina contextul de rol activ al utilizatorului, esențial pentru RLS multi-rol.

## Teme per club

`themes.ts` exportă configurări de culori per club. `ClubSettings.tsx` permite personalizare. Tema activă e stocată în `club.theme_config` (JSON în DB).
