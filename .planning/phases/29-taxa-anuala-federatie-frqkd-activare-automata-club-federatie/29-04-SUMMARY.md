---
phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie
plan: 04
subsystem: ui
tags: [react, typescript, supabase, rls, admin]

requires:
  - phase: 29-03
    provides: "utils/anFiscal.ts, TaxaAnualaFederatieConfig, useData().taxaAnualaFederatieConfig/setTaxaAnualaFederatieConfig"
provides:
  - "Tab 'Taxa Federatie (FRQKD)' in components/Plati/TaxeAnuale.tsx — singurul loc din UI unde SUPER_ADMIN_FEDERATIE seteaza pretul unui sezon"
  - "Banner de avertizare (rosu pt canManage, amber pt restul) cand sezonul curent nu are pret configurat"
affects: []

tech-stack:
  added: []
  patterns:
    - "Editare inline per card (isEditing/editState local) oglindind pattern-ul TaxaCard existent, aplicat acum si pe taxa_anuala_config"

key-files:
  created: []
  modified:
    - components/Plati/TaxeAnuale.tsx

key-decisions:
  - "Fara buton de stergere in TabTaxaFederatieFRQKD — migratia 29-01 nu defineste politica DELETE pe taxa_anuala_config (deny-by-default intentionat); UI-ul explica asta printr-un rand de text, nu ascunde limitarea"
  - "Erorile Postgres 23505 (unicitate an_fiscal) si 42501 (RLS) sunt traduse in mesaje romanesti distincte, nu afisate ca eroare tehnica bruta"
  - "Bannerul de sezon neconfigurat e independent de tabul activ (randat langa header) ca sa fie vizibil indiferent unde navigheaza utilizatorul in ecran"

patterns-established: []

requirements-completed: [TAF-08]

duration: ~20min
completed: 2026-09-12
---

# Phase 29 Plan 04: Tab admin pret sezon + banner de risc

**Tab nou "Taxa Federație (FRQKD)" în `TaxeAnuale.tsx` dă SUPER_ADMIN_FEDERATIE controlul complet asupra prețului pe sezon, iar un banner roșu/amber avertizează înainte ca lipsa prețului să blocheze toate înscrierile din portal.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments
- `TabTaxaFederatieFRQKD` complet funcțional: adăugare sezon nou, editare inline a sumei, carduri sortate cu badge "Sezon Curent", validare client (an 2020-2100, sumă ≥ 0) + tratare distinctă a erorilor RLS/unicitate
- `TabId` extins, tab vizibil doar pe ramura `canManage` — ecranul vechi bazat pe `taxe_anuale_config` neatins (3 referințe intacte)
- Banner condiționat de absența unui rând pentru `anFiscalCurent`, cu mesaj și acțiune diferite pentru federație vs. club

## Task Commits

1. **Task 1: Tab CRUD pe taxa_anuala_config** - `a4f91e7` (feat)
2. **Task 2: Banner sezon neconfigurat** - `7f5480a` (feat)

## Files Created/Modified
- `components/Plati/TaxeAnuale.tsx` - sub-componenta nouă `TabTaxaFederatieFRQKD`, `TabId` extins, banner în header

## Decisions Made
Vezi `key-decisions`.

## Deviations from Plan
None - plan executat exact cum a fost scris.

## Issues Encountered
None.

## User Setup Required

None - nicio configurare externă necesară.

## Next Phase Readiness

Faza 29 este completă din punct de vedere al implementării (4/4 planuri). **Ramas de facut, cerut explicit de plan:**

1. **Verificarea umană din `29-03-PLAN.md` Task 2** (ecran Deconturi: listă automată, confirmare cu upload real, persistență după reload, buton vizibil pentru federație) — NEEFECTUATĂ în această sesiune (execuție non-interactivă, fără acces la browser).
2. **Verificarea umană din `29-04-PLAN.md` Task 2** (tab vizibil doar pentru SUPER_ADMIN_FEDERATIE, editare sumă persistă, mesaj de eroare la duplicat, tab absent pentru ADMIN_CLUB, banner apare la ștergere temporară a rândului) — NEEFECTUATĂ, din același motiv.

Ambele verificări necesită un browser autentificat cu roluri reale (SUPER_ADMIN_FEDERATIE și ADMIN_CLUB) și ar trebui rulate de utilizator sau printr-o sesiune cu acces Chrome/Playwright înainte de a considera faza 29 complet închisă pentru producție. Codul, migrațiile live și testele SQL tranzacționale (29-01, 29-02) sunt verificate și confirmate funcționale.

---
*Phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie*
*Completed: 2026-09-12*
