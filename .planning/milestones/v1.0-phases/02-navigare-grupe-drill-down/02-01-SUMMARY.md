---
phase: 02-navigare-grupe-drill-down
plan: "01"
subsystem: grupe
tags: [grupe, drill-down, tab-bar, orar, sportivi, react-query]
dependency_graph:
  requires: []
  provides: [GrupaDetailView]
  affects: [components/Grupe/index.tsx]
tech_stack:
  added: []
  patterns: [tab-bar underline, inline-edit lifted from modal, read-only query]
key_files:
  created:
    - components/Grupe/GrupaDetailView.tsx
  modified: []
decisions:
  - "TabOrar inline: logica copiata din OrarEditorModal cu dependency [grupa.id] pe useEffect, nu [grupa]"
  - "clearCache (localStorage) rulat INAINTE de invalidateQueries (Pitfall 3)"
  - "Butonul Reseteza face undo local, nu navigheaza (D-03)"
  - "TabSportivi deleaga onOpenAdaugaSportivi la parent, nu monteaza AdaugaSportiviModal direct (D-05)"
  - "TabAntrenamente este intentional placeholder — calendarul implementat in Phase 3 (D-10)"
metrics:
  duration: "~15 minute"
  completed: "2026-06-04"
  tasks_completed: 3
  files_created: 1
  lines_added: 288
---

# Phase 02 Plan 01: GrupaDetailView Drill-Down — Summary

**One-liner:** Componenta GrupaDetailView cu tab bar (Antrenamente placeholder / Orar inline / Sportivi read-only), logica de editare orar copiata din OrarEditorModal cu invalidare cache corecta.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Schelet GrupaDetailView + tab bar + Tab Antrenamente placeholder | `6ad7862` | Done |
| 2 | Tab Orar inline (logica din OrarEditorModal, fara wrapper Modal) | `d81d918` | Done |
| 3 | Tab Sportivi (query read-only per grupa + buton Adauga Sportivi) | `28a9cb1` | Done |

## What Was Built

`components/Grupe/GrupaDetailView.tsx` (288 linii) — view drill-down complet cu 3 tab-uri:

- **Tab Antrenamente** — placeholder dashed-border cu textul "Calendar antrenamente — disponibil în curând", pregatit pentru Phase 3 (D-10)
- **Tab Orar** — editare programa saptamanala inline (adaptata din OrarEditorModal): grila pe zile, adaugare/stergere intervale, save la `orar_saptamanal` cu cache invalidation dubla (localStorage + React Query), buton Resetaza pentru undo local
- **Tab Sportivi** — lista read-only sportivi activi din grupa cu join grade, states loading/error/empty/populated, buton "Adauga Sportivi" delegat la parent

Componenta exporta `GrupaDetailView` cu props: `grupa: GrupaWithDetails`, `onBack: () => void`, `onOpenAdaugaSportivi: (g: GrupaWithDetails) => void`.

## Deviations from Plan

None — planul a fost executat exact ca scris.

## Known Stubs

| Stub | File | Linie | Motiv |
|------|------|-------|-------|
| TabAntrenamente placeholder | components/Grupe/GrupaDetailView.tsx | 25-37 | Intentional per D-10 — calendarul antrenamente implementat in Phase 3. Nu blocheaza obiectivul planului (tab Orar si tab Sportivi sunt complete). |

## Threat Surface Scan

Nu s-au introdus suprafete de securitate noi fata de threat model-ul planului:
- `orar_saptamanal` delete+insert: protejat de RLS Supabase via `active-role-context-id` header (T-02-01 accepted)
- `sportivi` query read-only: protejat de RLS via `auth.uid()` (T-02-02 accepted)
- Input-uri `type="time"` native HTML: valideaza format HH:MM (T-02-03 mitigated)

## Self-Check: PASSED

- `components/Grupe/GrupaDetailView.tsx` exista: FOUND
- Commit `6ad7862` exista: FOUND
- Commit `d81d918` exista: FOUND
- Commit `28a9cb1` exista: FOUND
- `npm run lint` trece fara erori: PASSED
- `OrarEditorModal.tsx` neschimbat (zero diff): CONFIRMED
