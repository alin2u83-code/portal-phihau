---
phase: 14-corelare-prezente-facturi
plan: "04"
subsystem: plati
tags: [luni-lipsa, wizard, bulk-generate, raport-financiar, user-profile, badge, PLF-03, PLF-05]
dependency_graph:
  requires: [14-01]
  provides: [LuniLipsaWizard, tab-luni-lipsa, badge-luni-lipsa]
  affects: [components/Plati/RaportFinanciar.tsx, components/UserProfile.tsx]
tech_stack:
  added: []
  patterns:
    - useMemo pentru calcul luni lipsă (nu render loop)
    - useDataStartFacturareAll: un singur React Query pentru toți sportivii activi
    - isGenerating state pentru blocarea dublu-click (T-14-10)
    - Badge condiționat: sportiv activ + dataStart setat + luniLipsa.length > 0
key_files:
  created:
    - hooks/useDataStartFacturareAll.ts
    - components/Plati/LuniLipsaWizard.tsx
  modified:
    - components/Plati/RaportFinanciar.tsx
    - components/UserProfile.tsx
decisions:
  - "useDataStartFacturareAll face un singur supabase.from('sportivi').select('id, data_start_facturare').eq('status','Activ') — Record<id, string|null> — evitând hook per rând"
  - "LuniLipsaWizard foloseste Modal din ui.tsx fără modificări la ui.tsx (LOCKED)"
  - "Badge în UserProfile folosește span inline (nu Badge din ui.tsx) pentru consistență cu celelalte badge-uri din header"
  - "Control setare data_start_facturare în UserProfile: inline expand/collapse (nu modal separat) pentru a nu aglomera headerul"
metrics:
  duration: "~35 min"
  completed: "2026-06-24T10:16:19Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 2
---

# Phase 14 Plan 04: PLF-03 LuniLipsaWizard + RaportFinanciar tab + UserProfile badge Summary

**One-liner:** Wizard detectare + generare bulk luni lipsă abonament (PLF-03) cu tab centralizat în RaportFinanciar și badge pe profilul sportivului (PLF-05).

## What Was Built

### Task 1: LuniLipsaWizard + useDataStartFacturareAll

**`hooks/useDataStartFacturareAll.ts`** — React Query hook care face un singur fetch `supabase.from('sportivi').select('id, data_start_facturare').eq('status', 'Activ')` și returnează `Record<string, string | null>`. Evită N query-uri inutile dacă s-ar folosi useDataStartFacturare per rând.

**`components/Plati/LuniLipsaWizard.tsx`** — Modal wizard (PLF-03):
- Citește `data_start_facturare` via `useDataStartFacturare(sportiv.id)`
- Dacă null → cere adminului să seteze data cu câmp `<input type="date">` + mutație
- Dacă setat → calculează `luniLipsa = useMemo(() => calculeazaLuniLipsa(...), [...])` (nu render loop)
- Afișează lista lunilor lipsă cu checkbox-uri (bifate default)
- `handleGenereazaBulk`: pentru fiecare lună selectată → `genereazaFacturaAbonament` → `setPlati(prev => [data, ...prev])`; duplicate sărite cu log; `isGenerating` blochează dublu-click (T-14-10)
- Guard: `sportiv.status === 'Activ'` la nivel de wizard (suplimentar față de calculeazaLuniLipsa)

### Task 2: Tab Luni Lipsă în RaportFinanciar (PLF-05)

**`components/Plati/RaportFinanciar.tsx`** modificat:
- Extins union type `activeTab` cu `'luni_lipsa'`
- Adăugat tab în array-ul `tabs` cu `ExclamationTriangleIcon` amber
- `useDataStartFacturareAll()` → `dataStartMap: Record<string, string|null>` (un singur fetch)
- `useMemo sportiviCuLuniLipsa`: filtrare sportivi activi cu `dataStartMap[s.id]` non-null și `luniLipsa.length > 0`, sortați descrescător după numărul de luni lipsă
- Randare tabel desktop + carduri mobile urmând pattern-ul vizual al tabului Restanțe
- Buton "Generează" → `setWizardSportiv(sportiv)` → LuniLipsaWizard montat la finalul componentei
- Empty state: "Toți sportivii activi au facturile la zi."

### Task 3: Badge luni fără factură + setare data_start_facturare în UserProfile (PLF-05)

**`components/UserProfile.tsx`** modificat:
- Importă `calculeazaLuniLipsa` și `useDataStartFacturare`
- `useDataStartFacturare(sportiv.id)` → `dataStartFacturare`, `setDataStartFacturare`, `isSavingDataStart`
- `useMemo luniLipsaBadge`: `calculeazaLuniLipsa(dataStartFacturare, platiSportiv)` cu guard `sportiv.status === 'Activ'`
- Badge amber condiționat `'X luni fără factură'`: vizibil doar dacă `status === 'Activ' && dataStartFacturare && luniLipsaBadge.length > 0`
- Control inline setare `data_start_facturare` (vizibil doar `isAdminOrAbove`): toggle expand/collapse cu `<input type="date">` + buton OK; invalidare queryKey automată prin hook → badge recalculat

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a321bad | feat(14-04): LuniLipsaWizard + useDataStartFacturareAll hook |
| 2 | 2cd42e8 | feat(14-04): tab Luni Lipsă în RaportFinanciar (PLF-05) |
| 3 | 09ebf8e | feat(14-04): badge luni fără factură + setare data_start_facturare în UserProfile (PLF-05) |

## Verification

- `npx tsc --noEmit`: 0 erori noi
- `git diff --name-only` nu include types.ts, ui.tsx, DataContext, NavigationContext (LOCKED respectate)
- `calculeazaLuniLipsa` și `genereazaFacturaAbonament` confirmate prin grep în LuniLipsaWizard.tsx
- `useDataStartFacturareAll` un singur fetch (nu hook per rând) — fără warning React hooks

## Deviations from Plan

None — planul executat exact ca scris. Logica pentru suma abonamentului a folosit fallback pe `tip_abonament_id` (GestiuneFacturi lines 97-106), deoarece în contextul wizardului nu avem acces la lista completă de sportivi pentru calculul exact per familie; aceasta este o limitare documentată.

## Known Stubs

None — toate componentele sunt funcționale cu date reale din Supabase.

## Threat Flags

Nicio suprafață nouă de securitate neacoperită. Mitigările T-14-10 și T-14-11 implementate conform threat register.

## Self-Check: PASSED

- [x] `hooks/useDataStartFacturareAll.ts` — CREAT
- [x] `components/Plati/LuniLipsaWizard.tsx` — CREAT (>60 linii, exportă LuniLipsaWizard)
- [x] `components/Plati/RaportFinanciar.tsx` — conține 'luni_lipsa' (grep confirmat)
- [x] `components/UserProfile.tsx` — conține 'fără factură' (grep confirmat)
- [x] Commits a321bad, 2cd42e8, 09ebf8e — există în git log
- [x] `npx tsc --noEmit` — 0 erori
