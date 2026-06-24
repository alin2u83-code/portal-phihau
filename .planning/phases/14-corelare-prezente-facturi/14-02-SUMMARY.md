---
phase: 14-corelare-prezente-facturi
plan: "02"
subsystem: Plăți + Profil Sportiv
tags: [plf-01, plf-04, prezente, facturi, stergere-guard]
dependency_graph:
  requires: ["14-01"]
  provides: ["PLF-01-plati-scadente", "PLF-01-financiar-tab", "PLF-04-plati-scadente", "PLF-04-financiar-tab"]
  affects: ["components/Plati/PlatiScadente.tsx", "components/UserProfile/FinanciarTab.tsx", "components/UserProfile.tsx"]
tech_stack:
  added: []
  patterns:
    - "Sub-component pattern pentru hooks care nu se pot apela condiționat în .map()"
    - "Disabled button wrapped in span[title] pentru tooltip pe element dezactivat (Pitfall 1)"
    - "Server-side guard: re-fetch status din DB înainte de delete (T-14-04)"
key_files:
  modified:
    - components/Plati/PlatiScadente.tsx
    - components/UserProfile/FinanciarTab.tsx
    - components/UserProfile.tsx
decisions:
  - "Sub-component PrezenteFacturaRow în PlatiScadente (lazy-mount) — respectă regulile React hooks în .map()"
  - "Sub-component PrezenteModalSection în FinanciarTab (montat în modal deschis) — aceeași arhitectură"
  - "Luna derivată din p.luna/p.an dacă disponibil, altfel din p.data (PlatiScadente); din data_emitere (FinanciarTab)"
  - "Guard PLF-04 adăugat și în confirmDeletePlata din UserProfile.tsx (handler-ul real apelat din FinanciarTab)"
metrics:
  duration: "~35 min"
  completed: "2026-06-24"
  tasks_completed: 2
  files_modified: 3
---

# Phase 14 Plan 02: PLF-01 + PLF-04 Summary

**One-liner:** Prezențe expandabile per factură Abonament în PlatiScadente (rând inline) și FinanciarTab (modal detalii), plus restricție ștergere cu guard server-side pentru facturi achitate în ambele module.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PLF-01 + PLF-04 în PlatiScadente | e9d1cab | components/Plati/PlatiScadente.tsx |
| 2 | PLF-01 + PLF-04 în FinanciarTab | bbe28b2 | components/UserProfile/FinanciarTab.tsx, components/UserProfile.tsx |

## What Was Built

### PLF-01: Prezențe corelate cu factura

**PlatiScadente:** Sub-component `PrezenteFacturaRow` montat per rând expandat. Butoane calendar/chevron în coloana Descriere (desktop) și în rândul de status (mobile card) deschid/închid secțiunea. Când expandat, `usePrezenteLuna(sportivId, luna, an, true)` fetch-uiește datele prezenței și le afișează ca badges. `luna/an` derivate din `p.luna`/`p.an` dacă disponibile, altfel din `p.data`.

**FinanciarTab:** Sub-component `PrezenteModalSection` în modalul de detalii factură. Secțiunea apare între "Sume + progress" și "Timeline încasări". `luna/an` derivate din `p.data_emitere` (VizualizarePlata nu are câmpurile luna/an direct). Afișaj: "Prezențe în [luna]: N ▾" cu expandare listă date.

**Facturi familie omise** în ambele contexte (`sportiv_id null` → guard complet respectat, Pitfall 4).

### PLF-04: Restricție ștergere facturi achitate

**UI (ambele module):** Butonul Șterge este wrapped în `<span title="Facturile achitate nu pot fi șterse" className="cursor-not-allowed">` cu `<Button disabled className="pointer-events-none opacity-40">` când `status === 'Achitat'` (Pitfall 1 — disabled button nu afișează tooltip nativ).

**Server-side guard (ambele module):**
- `PlatiScadente.tsx / confirmDelete`: re-fetch `plati.status` via `supabase.maybeSingle()` + block + showError înainte de verificarea înscrierii la examene
- `UserProfile.tsx / confirmDeletePlata`: același pattern — handler-ul real apelat din FinanciarTab prin `setPlataToDelete` → `ConfirmDeleteModal` → `confirmDeletePlata`

## Deviations from Plan

**[Rule 2 - Missing Critical Functionality] Guard PLF-04 adăugat în UserProfile.tsx, nu în FinanciarTab.tsx**

Planul indica că guard-ul se poate adăuga fie în FinanciarTab fie în UserProfile.tsx (în handlerul identificat). Cercetând codul, FinanciarTab nu are propriul handler de delete — apelează `setPlataToDelete` (prop) care declanșează `ConfirmDeleteModal` în `UserProfile.tsx`, care la rândul lui apelează `confirmDeletePlata`. Guard-ul server-side a fost adăugat în `confirmDeletePlata` din `UserProfile.tsx` — corect și mai sigur (handler-ul canonic, un singur punct de control).

## Known Stubs

Niciun stub identificat. `usePrezenteLuna` returnează date reale din DB (vedere_prezenta_sportiv RLS-scoped).

## Threat Flags

Niciun threat flag nou față de modelul declarat în plan. Mitigation T-14-04 și T-14-06 implementate conform planului.

## Self-Check: PASSED

- [x] components/Plati/PlatiScadente.tsx modificat și commis (e9d1cab)
- [x] components/UserProfile/FinanciarTab.tsx modificat și commis (bbe28b2)
- [x] components/UserProfile.tsx modificat și commis (bbe28b2)
- [x] `npx tsc --noEmit` fără erori noi în PlatiScadente sau FinanciarTab
- [x] types.ts, ui.tsx, DataContext, NavigationContext — nemodificate
- [x] hooks apelate doar în sub-componente (nu condiționat în .map())
