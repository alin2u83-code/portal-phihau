---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 08
subsystem: competitii-ui
tags: [fram, competitii, react-query, rpc]
requires: [42-02]
provides:
  - "CompetitieForm: optiune fram_obligatoriu + prop poateSetaFram"
  - "hooks/useVizeFramClub.ts: useVizeFramClub(competitieId, an, clubId) -> { vize, eroare }"
affects: [components/Competitii/index.tsx]
key-files:
  created: [hooks/useVizeFramClub.ts]
  modified: [components/Competitii/CompetitieForm.tsx, components/Competitii/index.tsx]
decisions:
  - "fram_obligatoriu se trimite in payload doar cand difera de valoarea salvata (sigur inainte de migrarea 20261115b)"
  - "InscrieriView si AdminPanel raman pe useData().vizeSportivi (avertismente cross-club)"
metrics:
  tasks: 2
  files: 3
  completed: 2026-11-15
---

# Phase 42 Plan 08: Optiune FRAM in formular + sursa FRAM server-side Summary

Super adminul poate seta "Doar sportivi cu viza FRAM <an>" la crearea/editarea unei competitii draft, iar wizardul de inscriere si InscriereModal primesc vizele FRAM din `vize_club_competitie` filtrat pe server (tip FRAM + an), fara trunchierea la 1000 de randuri.

## Commits
- d11a26bc: feat(42-08) optiune FRAM in CompetitieForm (D-01, D-02)
- 2cee520e: feat(42-08) useVizeFramClub + wiring, badge, linie Detalii extern (D-04, D-06)

## Ce s-a facut
- `CompetitieForm.tsx`: checkbox nativ, implicit false la competitie noua; editabil doar daca `poateSetaFram` si (competitie noua sau status salvat `draft`); trei texte de ajutor (editabil / rol / status). Payload include `fram_obligatoriu` doar daca valoarea difera de cea salvata.
- `index.tsx` `CompetitiiManagement`: `poateSetaFram={permissions.isSuperAdmin}`.
- `hooks/useVizeFramClub.ts`: `useQuery` (RQ v5), cheie `['vize-fram-club', competitieId, clubId, an]`, `rpc('vize_club_competitie').eq('tip','FRAM').eq('an', an)`, mapare identica cu ExternDataProvider.
- `CompetitieDetail`: `vizeSportivi={vizeFram.vize}` la InscriereClubWizard si InscriereModal (exact 2); banner amber cand regula e activa si hook-ul a esuat; pill "Doar cu FRAM <an>" in antet; linie "Participare: ..." in tab-ul extern Detalii.

## Siguranta inainte de migrarea 20261115b (NEAPLICATA live)
- Scriere: coloana `fram_obligatoriu` NU este trimisa la salvari obisnuite (doar cand utilizatorul schimba checkbox-ul). Daca super adminul il bifeaza inainte de migrare, UPDATE/INSERT va esua cu eroare PostgREST de coloana inexistenta, afisata prin `showError` existent; nimic altceva nu se rupe.
- Citire: `competitii` se citesc cu select `*`/`select()`, deci coloana lipsa inseamna `undefined` = regula oprita; badge/banner nu apar.
- Hook-ul foloseste RPC `vize_club_competitie` care exista deja live (Faza 36), deci nu depinde de migrare.

## Deviations from Plan
None - plan executat ca scris.

## Verificare
- `npx tsc --noEmit -p .`: fara erori (iesire goala).
- `npx tsx utils/editareCompetitie.test.ts`: toate testele au trecut.
- Greps din plan: 2x `vizeSportivi={vizeFram.vize}`, 1x "Doar cu FRAM", hook contine rpc + eq tip FRAM.
- NEVERIFICAT: browser/UI (checkbox, badge, banner, pill, tab extern), RPC live cu filtrare `.eq` pe functia table-returning (de dovedit in 42-04 check 14 / 42-09), comportament dupa aplicarea migrarii, mobil.

## Known Stubs
None.

## Riscuri / observatii
- Cat timp hook-ul incarca sau clubul nu e ales (`enabled` false), `vize` = [] si avertismentele FRAM din wizard pot aparea scurt; cu regula activa, DB ramane poarta la salvare.
- Review separat de cod (`/code-review`) nerulat in acest plan.

## Self-Check: PASSED
- hooks/useVizeFramClub.ts, CompetitieForm.tsx, index.tsx exista; commit-urile d11a26bc si 2cee520e exista.
