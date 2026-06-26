---
phase: quick-260626-buf
plan: "01"
subsystem: financiar-plati
tags: [vacanta, antrenamente, participanti, crud, supabase, rls]
dependency_graph:
  requires: [types.ts, supabaseClient, usePermissions, DataContext, ui.tsx, menuConfig, LazyComponents, AppRouter]
  provides: [perioade-vacanta view, PerioadaVacanta interfaces, PerioadaVacantaView component]
  affects: [menuConfig.ts adminMenu + adminClubMenu, LazyComponents.tsx, AppRouter.tsx]
tech_stack:
  added: []
  patterns: [direct Supabase query, usePermissions hook, lazy component, ConfirmDeleteModal pattern]
key_files:
  created:
    - sql/migrations/create_perioade_vacanta.sql  # gitignored — aplicat direct în Supabase
    - components/Plati/PerioadaVacanta.tsx
  modified:
    - types.ts
    - components/menuConfig.ts
    - components/LazyComponents.tsx
    - components/AppRouter.tsx
decisions:
  - "usePermissions importat direct în componentă (permissions nu e expus din useData())"
  - "SQL migration creat dar gitignored — fișierul e pentru referință/aplicare manuală în Supabase"
  - "EditIcon (FilePenLine) folosit în locul PencilIcon — nu există PencilIcon în icons.tsx"
  - "XIcon folosit în locul XMarkIcon — denumire diferă în icons.tsx"
  - "Search input cu plain <input> HTML în modalul multi-select — Input din ui.tsx necesită prop label obligatoriu și nu suportă leftIcon"
  - "fetchParticipanti async la inițierea delete pentru a avea count corect în mesajul de confirmare"
metrics:
  duration: "~20 min"
  completed: "2026-06-26"
  tasks_completed: 3
  files_created: 2
  files_modified: 4
---

# Quick Task 260626-buf: Perioade Vacanță Antrenamente — Summary

**One-liner:** Sistem CRUD complet pentru perioade vacanță cu participanți selectați manual per club (2 tabele Supabase, 1 componentă, wiring complet meniu).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SQL Migration + TypeScript Types | 7a930d9 | `sql/migrations/create_perioade_vacanta.sql`, `types.ts` |
| 2 | Componenta PerioadaVacanta.tsx | 31dbbc6 | `components/Plati/PerioadaVacanta.tsx` |
| 2 fix | Fix permissions import | a05ca55 | `components/Plati/PerioadaVacanta.tsx` |
| 3 | App Wiring | 5a2cfde | `menuConfig.ts`, `LazyComponents.tsx`, `AppRouter.tsx` |

## Artifacts Livrate

### `sql/migrations/create_perioade_vacanta.sql` (gitignored)
- Tabelul `perioade_vacanta`: id, club_id, denumire, data_start, data_end + CHECK constraint `data_end >= data_start`
- Tabelul `participare_vacanta`: id, perioada_id, sportiv_id + UNIQUE(perioada_id, sportiv_id)
- RLS pattern identic cu `fix_rls_all_tables.sql`: SELECT USING(true), WRITE verifică rol ADMIN_CLUB/SUPER_ADMIN_FEDERATIE
- Indexuri pe `club_id`, `(data_start, data_end)`, `perioada_id`, `sportiv_id`
- **Aplicare:** SQL-ul trebuie rulat manual în Supabase SQL Editor (directorul sql/ este gitignored)

### `types.ts`
- View union extins cu `'perioade-vacanta'`
- Interfețe noi: `PerioadaVacanta`, `ParticipareVacanta` (cu joined `sportivi`)

### `components/Plati/PerioadaVacanta.tsx`
- `PerioadaVacantaView` — componentă self-contained cu `onBack` ca singur prop
- CRUD perioade: adaugă/editează cu validare data_end >= data_start, ștergere cu ConfirmDeleteModal
- Afișare nr. participanți în mesajul de confirmare ștergere
- Expand card per perioadă → lazy fetch participanți la primul expand
- Modal multi-select sportivi activi: search, toggle individual, selectează tot, counter selecție
- Scoatere participant individual cu buton X
- Helper `formatDataRo()` fără import extern (consistent cu TaxeAnuale.tsx)

### App Wiring
- `menuConfig.ts`: `{ label: 'Vacanțe Antrenamente', view: 'perioade-vacanta' }` în ambele meniuri (adminMenu linia 73, adminClubMenu linia 157)
- `LazyComponents.tsx`: lazy export `PerioadaVacantaView`
- `AppRouter.tsx`: `case 'perioade-vacanta'` cu `renderProtected(..., isAtLeastClubAdmin)`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `permissions` nu este expus din `useData()`**
- **Found during:** Task 2 TypeScript compile
- **Issue:** Plan prevedea `const { filteredData, activeRoleContext, permissions } = useData()` dar `useDataProvider.ts` nu include `permissions` în obiectul returnat
- **Fix:** Importat `usePermissions` din `hooks/usePermissions.ts`, apelat direct cu `activeRoleContext` din `useData()`
- **Files modified:** `components/Plati/PerioadaVacanta.tsx`
- **Commit:** a05ca55

### Ajustări de implementare (nu deviații funcționale)

**2. `EditIcon` în loc de `PencilIcon`**
- `PencilIcon` nu există în `components/icons.tsx`. Folosit `EditIcon` (FilePenLine din lucide-react) — visual identic cu un icon pencil.

**3. `XIcon` în loc de `XMarkIcon`**
- `XMarkIcon` nu există în icons.tsx. Folosit `XIcon` (alias la `X` din lucide-react).

**4. Search input plain HTML în modalul multi-select**
- `Input` din `ui.tsx` are `label: string` ca prop obligatoriu și nu acceptă `leftIcon`.
- Un câmp de search inline în modal nu necesită label vizibil.
- Soluție: `<input>` HTML nativ cu icon SVG absolut-poziționat, styling consistent cu design system (`bg-slate-800 border border-slate-700`).

**5. SQL migration gitignorată**
- `sql/` și `*.sql` sunt în `.gitignore` (convenție proiect). Fișierul a fost creat pentru referință dar nu poate fi commis.
- Adminul trebuie să aplice manual `sql/migrations/create_perioade_vacanta.sql` în Supabase SQL Editor.

## Threat Mitigations Implementate

| Threat ID | Mitigation |
|-----------|-----------|
| T-BUF-01 | RLS `utilizator_roluri_multicont` pe ambele tabele — implementat în SQL migration |
| T-BUF-04 | DB CHECK `data_end >= data_start` + validare UI înainte de save |
| T-BUF-05 | ConfirmDeleteModal afișează nr. participanți; fetch participanți async înainte de delete |

## Known Stubs

Niciun stub — componenta face query direct în Supabase la runtime.

## Threat Flags

Niciun surface nou de securitate față de threat model planificat.

## Self-Check

- [x] `sql/migrations/create_perioade_vacanta.sql` există cu 2 tabele CREATE TABLE
- [x] `types.ts` conține `PerioadaVacanta`, `ParticipareVacanta`, `'perioade-vacanta'` în View
- [x] `components/Plati/PerioadaVacanta.tsx` exportă `PerioadaVacantaView`
- [x] `components/menuConfig.ts` conține 2 apariții `perioade-vacanta` (adminMenu + adminClubMenu)
- [x] `components/LazyComponents.tsx` conține `PerioadaVacantaView`
- [x] `components/AppRouter.tsx` conține `case 'perioade-vacanta'`
- [x] `npx tsc --noEmit` — exit 0 (fără erori TypeScript)

## Self-Check: PASSED
