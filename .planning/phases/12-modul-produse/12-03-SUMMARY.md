---
phase: 12-modul-produse
plan: 03
subsystem: frontend
tags: [react, typescript, tailwind, produse, intrari-marfa, stoc]

# Dependency graph
requires:
  - phase: 12-02
    provides: "services/produseService.ts, components/Produse/index.tsx, ProdusFormModal.tsx"
  - phase: 12-01
    provides: "types.ts — ProdusIntrareDB, ProdusIntrareDetaliuDB, ProdusIntrare"
provides:
  - "services/produseService.ts — fetchIntrari + createIntrareMarfa adăugate"
  - "components/Produse/IntrareMarfaModal.tsx — modal intrare marfă cu linii dinamice"
  - "components/Produse/index.tsx — tab Intrări Marfă funcțional cu lista + modal"
affects:
  - 12-04-vanzari
  - 12-05-raport

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-then-write per variantă pentru actualizare stoc_curent (Promise.all)"
    - "Pre-populare pret_intrare la selecția variantei din varianta.pret_intrare"
    - "Re-fetch paralel produse + intrări după salvare pentru actualizare stoc"
    - "Tabel linii dinamic cu select produs → select variantă filtrat pe produs"

key-files:
  created:
    - components/Produse/IntrareMarfaModal.tsx
  modified:
    - services/produseService.ts
    - components/Produse/index.tsx

key-decisions:
  - "Cherry-pick commits 12-01 + 12-02 în worktree — worktree creat pe 46bdde2 (înainte de phase 12)"
  - "fetchIntrari: order by data_factura desc + created_at desc pentru istoric cronologic invers"
  - "createIntrareMarfa: insert header → insert detalii → update stoc (3 pași secvențiali)"
  - "canManage guard pe butonul Intrare Nouă — doar ADMIN_CLUB și SUPER_ADMIN pot înregistra intrări"

# Metrics
duration: 25min
completed: 2026-06-20
---

# Phase 12 Plan 03: Intrări Marfă + Stoc Summary

**Jurnal stoc: modal IntrareMarfaModal cu furnizor + nr. factură + linii variante + update stoc_curent automat + tab Intrări Marfă funcțional cu tabel desktop și carduri mobile**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-20T09:00:00Z
- **Completed:** 2026-06-20T09:25:00Z
- **Tasks:** 3
- **Files created:** 1 (IntrareMarfaModal.tsx)
- **Files modified:** 2 (produseService.ts, Produse/index.tsx)

## Accomplishments

- `services/produseService.ts` extins cu `fetchIntrari` (select cu join detalii+variante+produs, ordered desc) și `createIntrareMarfa` (insert header + detalii + update stoc_curent per variantă via Promise.all)
- `components/Produse/IntrareMarfaModal.tsx` creat cu form header (furnizor, nr. factură, data facturii, observații) + tabel linii dinamic cu select produs → select variantă filtrată → cantitate → preț intrare (pre-populat din varianta.pret_intrare) + buton X șterge linie
- `components/Produse/index.tsx` actualizat: import IntrareMarfaModal + fetchIntrari + ProdusIntrare, state intrari+showIntrareModal, useEffect extins cu fetchIntrari paralel, tab 'intrari' complet cu tabel desktop + carduri mobile + re-fetch la salvare, placeholder doar pentru 'vanzari' + 'raport'
- tsc --noEmit: zero erori | vite build: succes (25.42s)

## Task Commits

1. **Task 1: produseService.ts** — `de1fbc9`
2. **Task 2: IntrareMarfaModal.tsx** — `adbd741`
3. **Task 3: Produse/index.tsx — tab intrari** — `7876ee3`

## Files Created/Modified

- `services/produseService.ts` — +68 linii: import ProdusIntrareDB/ProdusIntrare, fetchIntrari, createIntrareMarfa
- `components/Produse/IntrareMarfaModal.tsx` — creat (299 linii): modal cu header + tabel linii dinamic
- `components/Produse/index.tsx` — +106 linii net: tab 'intrari' funcțional, modals, imports

## Decisions Made

- Cherry-pick commits 12-01 (d000b22→10ee48b) + 12-02 (aa881bb, 59be978, 887a79c, 7106df3) în worktree: worktree creat pe `46bdde2` (înainte de phase 12), deci toate commit-urile 12-01 și 12-02 lipseau
- `fetchIntrari` ordonat desc pe `data_factura` și `created_at` — cel mai recent apare primul în lista de intrări
- `createIntrareMarfa` actualizează stocul via read-then-write individual per variantă (nu RPC): simplu și clar, acceptabil pentru volum mic de linii per intrare
- `canManage` guard pe butonul "Intrare Nouă": urmează pattern existent din tab Catalog

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Cherry-pick commits 12-01 + 12-02 în worktree**
- **Found during:** Start execuție (verificare fișiere worktree)
- **Issue:** Worktree creat pe commit `46bdde2` (17 Iunie), înainte de commit-urile phase 12. Fișierele `services/produseService.ts`, `components/Produse/index.tsx`, `ProdusFormModal.tsx` și tipurile `ProdusIntrareDB` din `types.ts` nu existau în worktree
- **Fix:** `git cherry-pick d000b22` (12-01 types) + `git cherry-pick aa881bb 59be978 887a79c 7106df3` (12-02 service+UI)
- **Files modified:** types.ts (cherry-picked), services/produseService.ts (cherry-picked), components/Produse/index.tsx (cherry-picked), components/Produse/ProdusFormModal.tsx (cherry-picked), components/LazyComponents.tsx, components/AppRouter.tsx, components/menuConfig.ts, components/icons.tsx
- **Impact:** Zero pe plan — cherry-pick fără conflicte, worktree adus la paritate cu main

**Total deviations:** 1 (blocker auto-rezolvat prin cherry-pick)
**Impact pe plan:** Zero — toate sarcinile executate conform planului, build și TypeScript trec

## Known Stubs

Tab-urile "Vânzări" și "Raport" afișează placeholder "Modul în curând disponibil":
- `components/Produse/index.tsx`: intentionat — implementate în planurile 12-04, 12-05
- Nu blochează obiectivul planului 12-03 (tab Intrări Marfă funcțional)

## Threat Flags

Nicio suprafată de securitate nouă: toate query-urile folosesc clientul Supabase existent cu header `active-role-context-id`. RLS aplicat la nivel DB (din planul 12-01). `canManage` guard pe butonul Intrare Nouă (ADMIN_CLUB/SUPER_ADMIN only).

## Self-Check

- [x] `services/produseService.ts` conține `fetchIntrari` și `createIntrareMarfa`: confirmat (grep -c = 5)
- [x] `components/Produse/IntrareMarfaModal.tsx` există: confirmat
- [x] `components/Produse/index.tsx` conține `IntrareMarfaModal` + `fetchIntrari` + `intrari`: confirmat (grep -c = 15)
- [x] Commit `de1fbc9` există: confirmat
- [x] Commit `adbd741` există: confirmat
- [x] Commit `7876ee3` există: confirmat
- [x] tsc --noEmit: zero erori
- [x] vite build: succes (25.42s)

## Self-Check: PASSED

---
*Phase: 12-modul-produse*
*Completed: 2026-06-20*
