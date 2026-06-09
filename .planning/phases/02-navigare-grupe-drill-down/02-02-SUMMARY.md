---
phase: 02-navigare-grupe-drill-down
plan: "02"
subsystem: grupe
tags: [grupe, drill-down, nav, GrupaCard, GrupaDetailView, conditional-render]
dependency_graph:
  requires: [GrupaDetailView]
  provides: [drill-down-flow-end-to-end]
  affects: [components/Grupe/GrupaCard.tsx, components/Grupe/index.tsx]
tech_stack:
  - React state (useState)
  - TypeScript
commit: 0dc956a
---

# Plan 02-02 Summary — Conectare GrupaDetailView

## Ce s-a livrat

**GrupaCard.tsx:**
- Eliminat props `onAdaugaSportivi` și `onConfigurareOrar`
- Adăugat prop `onDetalii: (g: GrupaWithDetails) => void`
- Butoane principale: `[Detalii](primary)` `[Gestionează](secondary)` `[...]`
- Eliminat importuri neutilizate: `UserPlusIcon`, `CogIcon`
- Dropdown `...` (Modifică Program / Generează Antrenamente / Secundari / Șterge) neschimbat

**Grupe/index.tsx:**
- Import `GrupaDetailView` adăugat
- State `grupaSelectedForDetail` + setter
- Render condiționat: `grupaSelectedForDetail ? <GrupaDetailView/> : <grilă>`
- `GrupaCard` primește `onDetalii={setGrupaSelectedForDetail}`, fără `onAdaugaSportivi`/`onConfigurareOrar`
- `AdaugaSportiviModal` — o singură instanță, declanșat prin callback din GrupaDetailView
- `OrarEditorModal` rămâne montat (backward-compat)

## Verificare

- `npm run lint` — ✅ fără erori
- Slice end-to-end: click Detalii → GrupaDetailView cu 3 tab-uri; Înapoi → grilă

## Requirements livrate

- NAV-01: buton Detalii pe GrupaCard deschide GrupaDetailView ✓
- NAV-02: tab bar funcțional (din 02-01) ✓
- NAV-03: Tab Orar inline + Tab Sportivi + Adaugă Sportivi funcționale (din 02-01) ✓

## Checkpoint human-verify

Pending — utilizatorul trebuie să confirme fluxul vizual per Task 3 din plan.
