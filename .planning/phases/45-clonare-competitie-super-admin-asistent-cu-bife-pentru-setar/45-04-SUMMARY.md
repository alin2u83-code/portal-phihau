---
phase: 45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar
plan: 04
subsystem: competitii
tags: [clonare, ui, modal, super-admin]
requires: ["45-02 (utils + serviciu)"]
provides:
  - "components/Competitii/CloneazaCompetitieModal.tsx: asistent de clonare intr-un singur ecran"
  - "Buton Cloneaza pe randul competitiei (doar super admin), deschide schita noua"
affects: [45-03]
key-files:
  created:
    - components/Competitii/CloneazaCompetitieModal.tsx
  modified:
    - components/Competitii/index.tsx
    - docs/ARHITECTURA_COMPETITII.md
    - docs/module.md
    - docs/baza-de-date.md
key-decisions:
  - "Butonul se randeaza sub permissions.isSuperAdmin (nu isAdmin): federation ADMIN e refuzat de RPC"
  - "Preview-ul si argumentul RPC folosesc acelasi st.ids din structuraInitiala (o singura reconstructie)"
requirements-completed: [D-02, D-03, D-05, D-08, D-11, D-13, D-14, D-15]
completed: 2026-11-19
---

# Phase 45 Plan 04: UI clonare competitie Summary

Asistent de clonare intr-un singur Modal (casete Setari/Probe/Categorii, nume unic, tip tinta, date, deadline, previzualizare cu avertismente) legat de un buton "Cloneaza" pe randul competitiei, vizibil doar super adminului; dupa creare se deschide direct schita noua.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1. CloneazaCompetitieModal | a9aa1ed9 | modal cu preview din functiile 45-02, Creeaza prin cloneazaCompetitie |
| 2. Buton in lista + docs | f4041b89 | CopyIcon pe rand, onCloned (setCompetitii, setSelectedComp, ssDel/ssSet, setView('detail')), ARHITECTURA 7.11, module, baza-de-date |

## Deviations from Plan

None - plan executat ca scris. Detaliu: Probe e afisata bifata si dezactivata cat timp Categorii e bifata; RPC primeste `probe || categorii`.

## Verificari rulate
`npx tsc --noEmit` exit 0 dupa fiecare task. NU rulat: nimic in browser, RPC-ul real (migrarea 45-01 neaplicata, vine in 45-03), code-review separat pe diff, cele 7 verificari umane din plan (dupa 45-03).

## Known Stubs
None.

## Threat Flags
None (T-45-18..22 acoperite: buton doar super admin, garda reala server-side, buton dezactivat in timpul apelului, modal persistent).

## Self-Check: PASSED
- components/Competitii/CloneazaCompetitieModal.tsx exista; commit-uri a9aa1ed9 si f4041b89 prezente.
