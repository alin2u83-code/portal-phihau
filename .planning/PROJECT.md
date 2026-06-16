# Portal PhiHau — Rapoarte & Analytics per Club

## What This Is

Portal de management pentru Federația QwanKiDo România și cluburile afiliate. Modulul curent (v1.1) adaugă rapoarte detaliate per club: situație financiară (restanțe per sportiv, filtrare perioadă, export) și rapoarte examene/grade (distribuție grade, promovabilitate, eligibili next grad, istoric). Fiecare ADMIN_CLUB vede clubul propriu; SUPER_ADMIN poate vedea orice club.

## Core Value

Fiecare admin de club poate vedea dintr-un singur loc situația financiară (cine datorează ce și de când) și situația gradelor (cine e eligibil pentru examen, cât de bine promovează), cu export pentru contabilitate și raportare federație.

## Current Milestone: v1.1 Rapoarte & Analytics

**Goal:** Rapoarte financiare și examene/grade per club, cu filtrare și export — zero date noi în DB, doar agregare din tabele existente.

**Target features:**
- Raport Financiar: restanțe per sportiv (sumă + vechime), filtrare pe interval dată, export CSV/PDF
- Raport Grade: distribuție grade actuală (nr. sportivi per grad), promovabilitate per sesiune (%), sportivi eligibili next grad, istoric examene per sportiv

## Requirements

### Validated (v1.0 — livrat)

- ✓ Sistem filtrare unificat Competiții (hook + FilterBar pe 4 tab-uri) — Phase 06-07
- ✓ Modul Grupe: GrupaDetailView drill-down, calendar lunar, CRUD antrenamente — Phase 01-03
- ✓ Stagii club end-to-end: prețuri dinamice, raport participanți, export CSV — Phase 04
- ✓ Color Theme System (CSS vars, ThemeEditor, persist Supabase) — Phase 05
- ✓ Button Design System extins (pill/ghost/outline, ConfirmButton, catalog) — Phase 08

### Active (v1.1)

- [ ] **FIN-01**: Admin vede tabel restanțe per sportiv (sumă totală datorată, cel mai vechi neachitat)
- [ ] **FIN-02**: Filtrare restanțe pe interval dată (de la / până la)
- [ ] **FIN-03**: Export CSV restanțe pentru contabilitate
- [ ] **FIN-04**: Export PDF restanțe (formatat, cu antet club)
- [ ] **GRD-01**: Distribuție grade actuală — nr. sportivi per grad în clubul curent (grafic + tabel)
- [ ] **GRD-02**: Promovabilitate per sesiune de examen — % promovați, nr. prezent, nr. promovat
- [ ] **GRD-03**: Lista sportivi eligibili pentru next grad (condiții timp minim la grad curent)
- [ ] **GRD-04**: Istoric examene per sportiv — timeline grad, dată, sesiune, rezultat

### Out of Scope (v1.1)

- Dashboard federație cu agregate multi-club — v2.0
- Notificări WhatsApp/SMS din rapoarte — v2.0
- Rapoarte prezență antrenamente — v2.0
- Predicții AI / recomandări — v3.0

## Context

**Tabele existente relevante:**
- `plati` — facturi sportiv: `suma`, `data_scadenta`, `status` (Achitat/Neachitat), `tip_plata`, `club_id`, `sportiv_id`
- `examene` — sesiuni examen: `data`, `club_id`, `status`
- `rezultate_examene` — rezultat per sportiv: `sportiv_id`, `examen_id`, `grad_nou_id`, `promovat` (bool)
- `grade` — nomenclator grade: `ordine`, `denumire`, `culoare`
- `sportivi` — `grad_curent_id`, `data_nasterii`, `club_id`
- `rbv_sportivi_complet` — view cu join sportiv + grad curent

**Componente existente relevante:**
- `components/Plati/` — conține PlatiScadente, RaportFinanciar (posibil de extins)
- `components/GestiuneExamene/` — conține sesiuni examene și rezultate
- `hooks/usePlati.ts`, `hooks/useExamene.ts` — date deja cached React Query

## Constraints

- **Tech Stack**: React 18 + TypeScript + Tailwind — fără librării externe noi
- **UI**: `components/ui.tsx` design system intern — nu Shadcn/MUI
- **Date**: Doar tabele existente — zero migrații DB în v1.1
- **Permisiuni**: ADMIN_CLUB vede only club propriu (RLS); SUPER_ADMIN vede orice
- **Recharts**: deja instalat (v2.15.4) — OK pentru grafice
- **jsPDF + autotable**: deja instalat — OK pentru PDF export

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hook `useCompetitieFilters` separat | Logica de filtrare reutilizabilă pe multiple tab-uri | ✓ Livrat v1.0 |
| Componentă `CompetitieFilterBar` shared | UI identic pe toate tab-urile | ✓ Livrat v1.0 |
| Filtrare client-side competiții | Date deja în state | ✓ Livrat v1.0 |
| Zero migrații DB în v1.1 | Tabele existente au tot ce e necesar pentru rapoarte | Pending |
| Rapoarte în componente separate (nu inline) | Complexitate justifică componente dedicate | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-16 — Milestone v1.1 Rapoarte & Analytics started*
