---
phase: 14-corelare-prezente-facturi
plan: "03"
subsystem: Plati / GestiuneFacturi
tags: [plati, facturi, abonament, month-picker, delete-guard, PLF-02, PLF-04]
dependency_graph:
  requires:
    - "14-01: services/facturaService.ts (genereazaFacturaAbonament, facturaAbonamentExista)"
    - "14-01: utils/luniLipsa.ts (formatLuna)"
  provides:
    - "components/Plati/GestiuneFacturi.tsx: secțiune generare Abonament per lună (PLF-02)"
    - "components/Plati/GestiuneFacturi.tsx: guard ștergere facturi Achitat (PLF-04)"
  affects:
    - "components/Plati/GestiuneFacturi.tsx"
tech_stack:
  added: []
  patterns:
    - "usePermissions(activeRoleContext) pentru guard vizibilitate secțiune admin"
    - "input type=month cu split '-' → luna 1-indexed direct (fără offset)"
    - "span cursor-not-allowed wrap disabled Button pentru tooltip dezactivare"
    - "guard server-side re-fetch status înainte de delete (Threat T-14-08)"
key_files:
  created: []
  modified:
    - "components/Plati/GestiuneFacturi.tsx"
decisions:
  - "Folosit usePermissions(activeRoleContext) în loc de permissions prop (neexportat din useData)"
  - "permissions.canManageFinances (isFederationAdmin || isAdminClub) — acoperă toți adminii, consistent cu renderProtected din AppRouter"
  - "luna citită din input type=month cu parseInt(parts[1]) fără +1 — string 1-indexed direct"
metrics:
  duration: "~15 min"
  completed_date: "2026-06-24"
  tasks_completed: 2
  files_changed: 1
---

# Phase 14 Plan 03: PLF-02 Month Picker + PLF-04 Delete Guard in GestiuneFacturi Summary

**One-liner:** Secțiune "Generează Abonament pentru o lună" cu month picker + handler care refolosește `genereazaFacturaAbonament` din 14-01 și guard ștergere UI+server-side pentru facturi Achitat.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PLF-02: generare Abonament per lună cu month picker | 57dc2a7 | components/Plati/GestiuneFacturi.tsx |
| 2 | PLF-04: restricție ștergere în GestiuneFacturi | 57dc2a7 | components/Plati/GestiuneFacturi.tsx |

## What Was Built

### Task 1 — PLF-02: Generare Abonament per lună (month picker)

Adăugat în `GestiuneFacturi.tsx`:

- **State nou**: `lunaGen` (1-indexed, inițializat cu luna curentă), `anGen`, `sportivGenId`, `isGeneratingLuna`
- **Import** `genereazaFacturaAbonament` din `../../services/facturaService` și `formatLuna` din `../../utils/luniLipsa`
- **Import** `usePermissions` din `../../hooks/usePermissions`; derivat `permissions = usePermissions(activeRoleContext)` din `useData()`
- **Handler** `handleGenerateAbonamentLuna`: validează sportiv + luna (1–12) + an (2020–2100); calculează suma abonamentului identic cu logica useEffect din liniile 87–95 (familie vs. tip_abonament_id); apelează `genereazaFacturaAbonament`; la eroare `showError`; la succes `setPlati(prev => [data, ...prev])` + `showSuccess`; `isGeneratingLuna` blochează dublu-click
- **UI**: Card nou "Generează Abonament pentru o lună" vizibil doar `permissions.canManageFinances`, cu Select sportiv (refolosind `clubSportivi`), `Input type="month"` cu value `${anGen}-${String(lunaGen).padStart(2,'0')}`, onChange cu `split('-')` → `parseInt(parts[1])` 1-indexed fără offset, buton "Generează" cu `isLoading={isGeneratingLuna}`

### Task 2 — PLF-04: Restricție ștergere facturi Achitat

- **UI desktop** (coloana Acțiuni): când `p.status === 'Achitat'` → `<span title="Facturile achitate nu pot fi șterse" className="cursor-not-allowed">` wrap buton `disabled className="pointer-events-none opacity-40"` cu TrashIcon; altfel butonul activ existent
- **UI mobil** (renderMobileItem): același pattern span + buton disabled
- **handleDelete** — guard la TOP: `supabase.from('plati').select('status').eq('id', plataToDelete.id).maybeSingle()` → dacă `checkPlata?.status === 'Achitat'` → `showError('Ștergere imposibilă', ...)`, `setIsDeleting(false)`, `setPlataToDelete(null)`, `return`. Verificarea `inscrieri_examene` existentă rămâne după guard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `permissions` nu era exportat din `useData()`**
- **Found during:** Task 1, la compilare TypeScript
- **Issue:** Planul specifica `permissions.isAdminClub` din `useData()`, dar `useDataProvider` calculează `permissions` intern fără a-l expune în obiectul returnat
- **Fix:** Importat `usePermissions` din `../../hooks/usePermissions`; apelat `usePermissions(activeRoleContext)` cu `activeRoleContext` din `useData()` — identic cu cum e calculat intern în `useDataProvider`; folosit `permissions.canManageFinances` (isFederationAdmin || isAdminClub) care acoperă toți adminii cu acces la GestiuneFacturi
- **Files modified:** components/Plati/GestiuneFacturi.tsx (import adăugat)
- **Commit:** 57dc2a7

## Known Stubs

None — secțiunea PLF-02 este conectată live la `genereazaFacturaAbonament` din serviciu; PLF-04 guard este activ în handleDelete și în UI.

## Threat Flags

Niciun endpoint sau cale de autentificare nouă introdusă. `genereazaFacturaAbonament` este apelat cu validare input (T-14-07 mitigat). Guard server-side re-fetch status (T-14-08 mitigat). RLS pe `plati` verifică club_id la nivel DB (T-14-09 acceptat).

## Self-Check: PASSED

- [x] `components/Plati/GestiuneFacturi.tsx` modificat — confirmat via `git diff --name-only HEAD~1 HEAD`
- [x] Commit 57dc2a7 există — confirmat via `git log --oneline`
- [x] `npx tsc --noEmit` — 0 erori
- [x] grep confirmă `genereazaFacturaAbonament` importat și apelat
- [x] grep confirmă `type="month"` prezent în UI
- [x] grep confirmă `status === 'Achitat'` în handleDelete (linia 346) și în UI (liniile 523, 571)
- [x] LOCKED files (types.ts, ui.tsx, DataContext, NavigationContext) — neatinse
