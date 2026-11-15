---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
verified: 2026-11-15T00:00:00Z
status: human_needed
score: 15/15 decisions in code (D-04 UI gap inchis in 0aa0aa1d, neverificat in browser)
overrides_applied: 0
gaps:
  - truth: "D-04: sportivul fara FRAM nu se poate inscrie - blocat in UI + DB (reprezentantul de club in zona externa)"
    status: partial
    reason: "DB blocheaza corect (trg_participant_fram, 21/21 live conform 42-04). UI-ul NU primeste regula pe calea normala a reprezentantului extern: dupa login se ajunge mereu in lista, iar lista incarca competitiile cu coloane fixe care nu contin fram_obligatoriu. competitie.fram_obligatoriu ajunge undefined in CompetitieDetail/Pas1/InscriereModal, deci statusFram intoarce 'avertisment', nu 'blocat'; lipsesc badge-ul 'Doar cu FRAM', linia din Detalii extern si bannerul de eroare vize. Reprezentantul vede doar eroarea DB la salvare."
    artifacts:
      - path: "services/accesExternService.ts"
        issue: "line 89: COLOANE_COMPETITIE = 'id, denumire, tip, status, data_inceput, data_sfarsit, deadline_inscrieri, locatie' - fara fram_obligatoriu; folosit la linia 99 pentru lista clubului"
      - path: "components/CompetitieExterna/index.tsx"
        issue: "linia 344-360: competitia din lista (sursa 'lista') merge direct in starea 'activ' fara re-citire; doar calea 'link' (linia 180) face select('*')"
    missing:
      - "Adauga fram_obligatoriu (si orice alta coloana folosita de CompetitieDetail, ex. config_taxe/taxa_individual/taxa_echipa daca lipsesc) in COLOANE_COMPETITIE, sau re-citeste competitia cu select('*') la intrarea in starea 'activ'"
      - "Verifica in browser cu cont REPREZENTANT_COMPETITIE (calea lista) ca apar badge-ul, sportivii blocati si exceptia lipseste"
human_verification:
  - test: "Super admin: competitie noua, optiunea FRAM debifata implicit; activeaza in draft; dupa 'Deschide Inscrierile' e read-only cu motiv; antetul arata 'Doar cu FRAM {an}'"
    expected: "D-01/D-02 in UI"
    why_human: "Nu exista test UI/browser"
  - test: "Cont club in zona externa, intrat PRIN LISTA (nu prin link direct), competitie cu FRAM obligatoriu: Pas 1 dezactiveaza sportivii fara FRAM cu badge rosu"
    expected: "Dupa inchiderea gap-ului: blocare vizibila; azi se asteapta ca blocarea sa NU apara"
    why_human: "Dovedeste gap-ul si, dupa fix, inchiderea lui"
  - test: "Super admin pentru un club: sportiv fara FRAM -> 'Exceptie FRAM' cu confirmare; apoi rand in Jurnal Audit"
    expected: "D-05"
    why_human: "Flux UI + audit"
  - test: "Inscrieri (club propriu, inscrieri deschise): 'Editeaza' schimba Q1/Q2 si muta in categorie compatibila; 'Muta categoria' la echipa; 'Editeaza componenta' pastreaza membrii daca salvarea esueaza"
    expected: "D-07/D-08"
    why_human: "Nimic din UI nu a fost rulat in browser"
  - test: "Dupa inchiderea inscrierilor reprezentantul nu vede butoane de editare, super adminul da; pe finalizata nimeni; marcarea taxei achitate merge"
    expected: "D-07"
    why_human: "Vizibilitate butoane dupa stare"
  - test: "Muta o echipa/individ intr-o categorie cu alta taxa; Financiar > 'De rezolvat' arata taxa veche -> noua; 'Vezi clubul' deschide clubul"
    expected: "D-09"
    why_human: "Date reale din audit_log + scroll"
  - test: "Competitie CVD: Pas Arme explica 'Nicio arma'; arma implicita fara drept nu blocheaza Finalizeaza; Giao Dau doar arme de lupta eligibile; De rezolvat listeaza arma neeligibila si sportivii fara arma"
    expected: "D-11..D-15"
    why_human: "Depinde de date reale (ex. Roman 2026)"
  - test: "Latime telefon: EditareInscriereModal si dialogul de exceptie utilizabile; option disabled in select pe mobil"
    expected: "Utilizabil pe mobil"
    why_human: "Neverificat vizual"
---

# Phase 42: Competitie - editare echipe/quyen, FRAM an calendaristic, arme dupa grad eligibil - Verification

**Phase Goal:** Super adminul fixeaza la deschiderea competitiei regula FRAM (an calendaristic, achitat sau scutit; blocare UI + DB, exceptii super admin confirmate si auditate); reprezentantul editeaza membri/arma echipelor, quyen si categoria (compatibila) cat timp inscrierile sunt deschise, super adminul pana la finalizare, fara recalcularea taxelor si cu audit pe autor; armele se ofera doar dupa gradul efectiv (Thao Quyen, Pas Arme, Giao Dau), cu avertismente, nu blocaje.
**Verified:** 2026-11-15
**Status:** gaps_found (1 gap, restul implementat; UI neverificat in browser)
**Re-verification:** No - initial verification

## Verificari statice rulate

| Verificare | Rezultat |
|---|---|
| `npx tsc --noEmit -p .` | exit 0, zero erori |
| `npx tsx utils/editareCompetitie.test.ts` | "Toate testele au trecut" (27 PASS per 42-09) |
| `npx tsx tests/armeCvd_reguli.ts` | "armeCvd_reguli: OK" |
| `npx tsx tests/armeCvdLipsuri.ts` | "OK" |
| Teste live DB (`tests/fram_editare_faza42.ts`, service role) | NU rulate (interzis); se bazeaza pe raportul 42-04 (21/21, 30/30 ACL, 16/16 Faza 41) - nereverificat independent |

## Decizii (D-01..D-15)

| # | Decizie | Status | Evidenta |
|---|---|---|---|
| D-01 | Setare per competitie, doar super admin, default dezactivata | VERIFIED | Migrarea `20261115b`: `fram_obligatoriu boolean NOT NULL DEFAULT false`; `trg_competitii_fram_imutabil` refuza non-super-admin (42501) si la INSERT; `CompetitieForm.tsx:35,77,210` (`poateSetaFram`, checkbox) |
| D-02 | Editabila doar in `draft`, impus si in DB | VERIFIED | Trigger: `OLD.status IS DISTINCT FROM 'draft'` -> 23514; UI `framEditabil = poateSetaFram && (!comp \|\| comp.status==='draft')` (`CompetitieForm.tsx:77`); `CompetitieForm.tsx:106` trimite campul doar daca s-a schimbat |
| D-03 | Fara retragere/reevaluare | VERIFIED | Trigger refuza schimbarea daca exista participanti activi; `trg_participant_fram` nu reevalueaza UPDATE-uri fara schimbare de sportiv/reactivare. Nicio logica de retragere in cod |
| D-04 | Blocare UI + DB fara FRAM | PARTIAL (gap) | DB: `trg_inscrieri_fram` + `trg_echipa_sportivi_fram` (BEFORE INSERT/UPDATE, 23514). UI: `statusFram` (`utils/editareCompetitie.ts:15-21`), `Pas1.tsx:89,456,461`, `InscriereModal.tsx:136,763` - functioneaza cand `competitie.fram_obligatoriu` e setat. GAP: in zona externa, calea prin lista nu aduce campul (vezi frontmatter) |
| D-05 | Super admin inscrie fara FRAM cu confirmare, in audit | VERIFIED (cod); UI neverificat | Trigger scrie rand in `audit_log` cu `date_noi.exceptie_fram=true` (operatie='INSERT', CHECK-ul nu accepta alt tip - deviatie documentata); `statusFram` -> 'exceptie' pentru super admin; confirmarea in Pas1/InscriereModal prezenta per SUMMARY 42-05/07 |
| D-06 | An calendaristic, achitat include scutit | VERIFIED | Trigger: `EXTRACT(YEAR FROM data_inceput)`, `scutit OR plati.status='Achitat'`; `anFramCompetitie` in `utils/editareCompetitie.ts`; hook `useVizeFramClub` filtreaza server-side tip FRAM + an |
| D-07 | Super admin pana la finalizata; reprezentant doar `inscrieri_deschise` | VERIFIED (cod/DB); UI neverificat | `index.tsx:256-259` `canEditEchipe`; DB: RLS gates restrictive `ic_/ec_/es_r_gate_*` (live, 20261106e) + `trg_participant_competitie_finalizata` inclusiv pentru super admin; `InscrieriView` foloseste `poateEdita` |
| D-08 | Edit membri, arma echipei, quyen, categorie compatibila | VERIFIED (cod); UI neverificat | `sincronizeazaMembriEchipa` (adauga -> rol -> scoate, `services/echipeCompetitieService.ts:16`) folosit in `InscriereModal.tsx:287` si `Pas4Sumar.tsx:383`; arma echipei update `InscriereModal.tsx:298`; `EditareInscriereModal.tsx` (quyen 1/2, categorie); compatibilitate impusa in DB in `trg_participant_categorie_activa` |
| D-09 | Taxa nu se recalculeaza; semnalat ca "de rezolvat" | VERIFIED (cod); date reale neverificate | `EditareInscriereModal` nu scrie pe taxe; `taxeDeReglatDupaMutari` + `FinanciarView` banner din `audit_log` (`cat_veche/cat_noua`); testat unitar (27 PASS) |
| D-10 | Audit cu autor | VERIFIED (per documentatie live) | Se bazeaza pe `audit_inscrieri_competitie`/`audit_echipe_competitie`/`audit_echipa_sportivi` live (confirmat in headerul migrarii + check 13/18 in 42-04); nereverificat independent (fara acces DB) |
| D-11 | Filtru arme dupa grad: Thao Quyen, Pas Arme, Giao Dau | VERIFIED (cod); UI neverificat | `armeEligibileLaGrad`/`motivFaraArme` in `utils/armeCvd.ts:77,82`; wizard `index.tsx:215-271` (drepturi pe grad efectiv), `PasArme.tsx`, `Pas2Arme.tsx`, `Pas3Echipe.tsx:153-156`, `ArmePermiseGiaoDau eligibile` (`constants.tsx:118`, `InscriereModal.tsx:387`). Song Luyen/echipe: filtru aplicat si in Pas3Echipe (decizie de planificare) |
| D-12 | Grad efectiv la data competitiei | VERIFIED | `gradEfectivLaData` folosit in wizard, Pas2Arme, Pas2Quyen, Pas3Echipe, EditareInscriereModal |
| D-13 | Nu obligat la toate armele | VERIFIED | Eligibilitatea doar ofera optiuni; arma fara drept nu produce rand blocant (`index.tsx:228-232`) |
| D-14 | Inscrieri vechi neeligibile raman + avertisment | VERIFIED (cod) | `arma-neeligibila` in `utils/armeCvdLipsuri.ts` (+`tests/armeCvdLipsuri.ts` OK); `index.tsx:277` ruteaza spre pasul Arme; nimic nu se sterge |
| D-15 | Fara arma -> avertisment, nu blocaj | VERIFIED (cod) | `fara-arma` tratat ca avertisment in De rezolvat; testat in `armeCvd_reguli.ts` |

**Score:** 14/15 verified (D-04 partial).

## Gap

**D-04 UI pe calea externa de lista** (vezi `gaps:` in frontmatter). Impact: apararea reala (DB) e intacta, deci nu se poate inscrie un sportiv fara FRAM; dar reprezentantul de club, actorul principal al regulii, nu vede sportivii blocati, badge-ul sau explicatia si primeste doar o eroare 23514 la salvare (in batch, posibil dupa inscrieri partiale ale celorlalti). Fix mic: o coloana in `COLOANE_COMPETITIE` sau `select('*')`. Nota: verifica si celelalte campuri de competitie pe care CompetitieDetail le citeste (taxe/config) - nu am auditat exhaustiv.

## Anti-pattern / debt markers

Nu am cautat exhaustiv TBD/FIXME in fisierele fazei; nicio problema vizibila in fisierele citite. Migrarea nu contine TODO-uri.

## Ce NU s-a verificat

- Nicio verificare in browser/mobil (toate elementele UI sunt doar citite in cod).
- Testele live DB nu au fost rulate aici; starea live a DB (triggere, RLS) nu a fost interogata; se bazeaza pe 42-04.
- Fara `/code-review` independent pe diff-ul fazei (SUMMARY 42-09 il lasa nerulat).
- D-05 dialog de confirmare, D-10 autor pe contul comun (Faza 39) - doar prin documentatie.

---

_Verified: 2026-11-15_
_Verifier: Claude (gsd-verifier)_

## Actualizare 2026-11-15 (orchestrator)
- Gap D-04 inchis in cod: `fram_obligatoriu` adaugat in `COLOANE_COMPETITIE` (0aa0aa1d). Neverificat in browser (cont REPREZENTANT_COMPETITIE, calea lista).
- Review 42-09: low 3 (buton Muta categoria la echipe retrase) si low 4 (garda `.eq('categorie_id')` la salvare) reparate in 0aa0aa1d.
- Review medium 2 confirmat live: `audit_log` are SELECT doar pentru super admin, ADMIN_CLUB (clubul propriu, cu actor_nume) si proprietar/actor. Un admin federatie care NU e super admin vede bannerul 'De rezolvat' (taxe) gol, fara eroare. Ramas de decis.
- Review medium 1 (mutari Faza 41 apar ca schimbari de taxa in 'De rezolvat'): ramas de decis (poate fi dorit).
- Migrare 20261115b aplicata live, corectata dupa review (freeze lasa cascade/merge sportiv); limita cunoscuta: merge_sportivi cu conflict unic pe competitie finalizata esueaza integral (nimic pierdut).
