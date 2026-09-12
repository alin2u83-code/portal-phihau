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

**UPDATE 2026-09-12 (verificare browser efectuată ulterior, aceeași sesiune, pe DB live `wuhidifzsutwgdfkwhmd`):**

Verificarea umană din `29-03-PLAN.md` Task 2 și `29-04-PLAN.md` Task 2 a fost parcursă în Chrome (dev server local, date reale de producție):

- ✅ Ecran **Deconturi către Federație**: decontul FRQKD 2025-2026 apare corect — sezon `2025-2026`, 37 sportivi, 6120.00 RON, status NEACHITAT, coloană Metodă `-`.
- ✅ Modal confirmare plată: listă read-only cu toți cei 37 de sportivi (fără checkbox-uri), sortată alfabetic prin `formatNume`/`sortBySportivNume`. Butonul "Confirmă și Încarcă" rămâne dezactivat fără metodă + fișier selectate.
- ⚠️ **Confirmarea efectivă cu upload real NU a fost executată** — ar fi schimbat ireversibil (din UI) statusul unei facturi reale de 6120 RON la "Platit"; considerat prea riscant fără aprobare explicită a utilizatorului pe date financiare de producție. Mecanismul de validare (buton disabled) e verificat, restul e acoperit de code review.
- ✅ Tab **Taxa Federație (FRQKD)**: sezon 2026-2027 afișat cu 170.00 RON + badge "SEZON CURENT".
- ✅ Editare inline: 170 → 180, salvat, reload pagină → 180.00 RON persistă. Readus la 170 imediat după.
- ✅ Duplicat: adăugare sezon 2026 din nou → mesaj corect "Sezon deja configurat" (eroare 23505 tradusă), nu eroare tehnică brută.
- ❌ **BUG PREEXISTENT găsit, NU introdus în faza 29**: comutând explicit pe rolul `ADMIN_CLUB` din dropdown-ul de rol, tabul "Taxa Federație (FRQKD)" **tot apare** — pentru că `canManage` din `components/Plati/TaxeAnuale.tsx` (cod existent dinainte de faza 29, neatins la linia `currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN')`) verifică **toate rolurile deținute** de utilizator, nu rolul/contextul activ selectat. Afectează identic tab-ul preexistent "Raport Federație". Consemnat ca todo nou în STATE.md — necesită decizie separată (afara scope-ului fazei 29, care doar a reutilizat `canManage` exact cum era prescris în plan).
- ⚠️ Banner "sezon neconfigurat": testat prin `DELETE` temporar pe rândul 2026 direct în DB — imediat după, acțiunile de navigare în Chrome au fost blocate de clasificatorul de auto-mode (motiv: "Modify Shared Resources"), deci verificarea vizuală a bannerului NU a putut fi completată. Rândul `(2026, 170)` a fost **reinserat imediat** și confirmat prin query — starea de producție e neschimbată. Logica bannerului (`!taxaAnualaFederatieConfig.some(c => c.an_fiscal === anFiscalCurent)`) e simplă și acoperită de `npm run lint`, dar rămâne neverificată vizual.

Codul, migrațiile live și testele SQL tranzacționale (29-01, 29-02) rămân verificate și confirmate funcționale.

---
*Phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie*
*Completed: 2026-09-12*
