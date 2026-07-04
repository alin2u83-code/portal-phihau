---
slug: competitii-inscriere-20260605
status: resolved
trigger: manual
goal: find_and_fix
created: 2026-06-05
updated: 2026-07-04
---

# Debug Session: competitii-inscriere-20260605

## Symptoms

- Filtrarea sportivilor la inscriere in competitie nu functioneaza
- Nu se poate intra in probe (events/categories)
- Nu se pot adauga sportivi la competitie
- Intregul modul Competitii este nefunctional

## Current Focus

hypothesis: CONFIRMED — Refactoring-ul din commit 46b7bee a introdus 3 bug-uri structurale majore
next_action: none — sesiune rezolvată și arhivată (confirmare umană 2026-07-04)

reasoning_checkpoint:
  hypothesis: "Cardurile giao_dau/echipe apar 'exclus' pentru că statusul lor era calculat din selectedSportivi/autoCategorie, populate DOAR de fluxul Pas1/Pas2 al probelor individuale"
  confirming_evidence:
    - "calculeazaStatusCard (versiunea buggy) căuta sportivi giao_dau în autoCategorie, dar computeAutoCategorie filtrează doar tip_participare=individual"
    - "Fluxul hub-first pornește cu selectedSportivi=empty; giao_dau/echipe nu au nicio cale de a-l popula"
  falsification_test: "Dacă un card giao_dau ar fi apărut 'exclus' și după eliminarea dependenței de selectedSportivi/autoCategorie, cauza ar fi fost alta"
  fix_rationale: "Statusul giao_dau/echipe se calculează acum din surse independente de selecția individuală: existența categoriilor + echipeFormate (DB) + eligibilitate directă pe sportivi prop"
  blind_spots: "Verificat doar compilarea (tsc) și citirea codului; fluxul UI end-to-end necesită confirmare umană"

## Evidence

- timestamp: 2026-06-05T14:00Z
  file: components/Competitii/InscriereClubWizard/index.tsx
  finding: |
    BUG 1 (CRITIC): Noul flux hub-first porneste cu `selectedSportivi = new Set()` (empty).
    InscriereClubCards calculeaza statusul fiecarui card INAINTE ca utilizatorul sa selecteze sportivi.
    Rezultat: TOATE cardurile probe apar ca "Nu participam" (status=exclus) si nu pot fi deschise.
    Probe giao_dau si echipe nu au nicio cale de a popula selectedSportivi inainte de a intra in Pas3.

- timestamp: 2026-06-05T14:02Z
  file: components/Competitii/InscriereClubWizard/InscriereClubCards.tsx lines 122-139
  finding: |
    BUG 2 (LOGIC): calculeazaStatusCard pentru giao_dau cauta sportivi in `autoCategorie.get(id)`
    unde cat.proba_id === proba.id. Insa `autoCategorie` e calculata DOAR pentru tip_participare=individual
    (filtru explicit in computeAutoCategorie). Giao_dau cu pereche (tip_participare=pereche) nu apare
    niciodata in autoCategorie => card-ul giao_dau va fi mereu "exclus" chiar si dupa selectie.

- timestamp: 2026-06-05T14:04Z
  file: components/Competitii/InscriereClubWizard/Pas3Echipe.tsx lines 471-474
  finding: |
    BUG 3 (LOGIC): In Pas3FormareEchipe, `sportiviSelectati` ignora selectedSportivi:
      const sportiviSelectati = useMemo(() => sportivi, [sportivi]);
    Folosi TOTI sportivii din club, nu doar cei selectati. Asta e intentionat pentru giao_dau/echipe
    (toti pot participa), dar e inconsistent cu logica din hub care asteapta selectedSportivi populat.

- timestamp: 2026-06-05T14:06Z
  file: components/Competitii/InscriereClubWizard/index.tsx (handleDeschideProba)
  finding: |
    BUG 4 (FLOW): Cand utilizatorul apasa pe un card giao_dau sau echipe din hub -> setStep(3).
    Pas3 se deschide cu selectedSportivi=empty. Pas3 afiseaza toti sportivii (ignora selectedSportivi)
    asa ca vizual pare OK, dar dupa salvare si return la hub, card-ul ramane "exclus" deoarece
    calculeazaStatusCard nu gaseste sportivi in autoCategorie pentru giao_dau.

## Resolution

root_cause: |
  Commit 46b7bee a schimbat fluxul de la "Pas1 global → hub" la "hub → Pas1 per proba".
  Problema fundamentala: InscriereClubCards foloseste selectedSportivi + autoCategorie pentru a
  calcula statusul cardurilor, dar aceste state-uri sunt populate DOAR dupa Pas1 (selectare sportivi
  pentru quyen individual). Probe de tip giao_dau si echipe (song_luyen/sincron) nu trec prin Pas1,
  deci selectedSportivi ramane empty => toate cardurile lor apar "exclus" si nu pot fi deschise.
  Al doilea bug: calculeazaStatusCard pentru giao_dau presupune ca sportivii apar in autoCategorie,
  dar autoCategorie filtreaza doar tip_participare=individual.

fix: |
  3 modificari necesare:

  FIX 1 (InscriereClubCards.tsx): In calculeazaStatusCard pentru giao_dau si probe echipa,
  nu mai depinde de selectedSportivi/autoCategorie. In schimb, verifica direct TOTI sportivii
  activi din club (sportivi prop) impotriva categoriilor probei. Daca exista cel putin un sportiv
  eligibil in club pentru proba, card-ul e deschis (status incomplet/completat, nu exclus).
  Sau mai simplu: card-urile giao_dau/echipe sa arate mereu ca "deschisibile" (nu exclus)
  daca exista categorii definite pentru proba.

  FIX 2 (InscriereClubCards.tsx - calculeazaStatusCard pentru giao_dau):
  Inlocuieste logica care cauta in autoCategorie cu o verificare directa pe categorii + sportivi.
  Sportivii eligibili = sportivi.filter(s => verificaEligibilitate(s, cat, grade, data).eligibil).

  FIX 3 (index.tsx - calculeazaStatusCard pentru giao_dau/echipe):
  Sau abordare alternativa mai simpla: pentru probe non-quyen (giao_dau, song_luyen, sincron),
  statusul cardului din hub sa fie calculat bazat pe echipeFormate (deja salvate in state),
  nu pe selectedSportivi/autoCategorie. Aceasta e logica deja existenta pentru echipe (catEchipa),
  deci doar giao_dau individual (cu categorii individual) e problema reala.

  ABORDAREA RECOMANDATA:
  - Pentru giao_dau cu categorii individual: calculeaza eligibili direct din sportivi prop (toti clubului)
  - Card-ul giao_dau: deschizibil daca exista minim 1 sportiv eligibil in club pentru probe respective
  - Status: "incomplet" daca echipeFormate nu are intrari, "completat" daca are
  - Nu mai astepta selectedSportivi pentru giao_dau/echipe

fix_applied: |
  Abordarea RECOMANDATA a fost implementata (fix-urile au fost aplicate si comise in sesiunile
  intermediare 2026-06-09..2026-06-20; aceasta sesiune a verificat ca starea curenta a codului
  corespunde integral Resolution si compileaza). Ce contine codul curent:

  1. InscriereClubCards.tsx — calculeazaStatusCard, ramura giao_dau (lines 135-155):
     - NU mai depinde de selectedSportivi/autoCategorie.
     - Card deschizibil daca exista categorii pentru proba (catProba.length > 0), altfel exclus.
     - Status bazat pe echipeFormate: "completat" daca toate echipele probei sunt configurate
       (echipaSkip || titulari > 0 || echipaIncompleta), altfel "incomplet".

  2. InscriereClubCards.tsx — ramura probe echipa song_luyen/sincron (lines 157-210):
     - Foloseste direct `sportivi` prop (toti sportivii clubului), NU selectedSportivi:
       `const sportiviSelectatiArr = sportivi;` cu eligibilitate calculata per categorie
       via verificaEligibilitate(s, cat, grade, dataComp).
     - Status per categorie din echipe DB (echipe_competitie + echipa_sportivi) si skippedCategorii.

  3. InscriereClubCards.tsx — ramura probe individuale (lines 78-84):
     - Cu selectedSportivi gol: status "incomplet" (deschizibil) daca exista categorii,
       "exclus" doar daca proba nu are categorii. Rezolva BUG 1 (carduri blocate la start).

  4. index.tsx — handleDeschideProba (lines 176-184):
     - Probe individuale → Pas1 (selectie sportivi per proba, selectedSportiviMap izolat per proba).
     - giao_dau / song_luyen / sincron → Pas3 direct, cu toti sportivii clubului.
     - echipeFormate se re-fetch-eaza din DB la revenirea in hub (useEffect step==='hub'),
       deci statusul cardului reflecta salvarile din Pas3. Rezolva BUG 4.

  Commits relevante (aplicate intre crearea sesiunii si verificare):
  - 78fe854 fix(wizard): selectedSportivi izolat per proba + INP retragere
  - 18e31fc feat(competitii): dropdown optiuni proba + fix taxa in InscriereModal
  - 4623400 fix(competitii): interclub btn echipe complete + re-fetch taxa pas4
  - 13addf3 fix(competitii): buton Retrage echipa in card + curata DB la Nu participam
  - 46bdde2 fix(wizard): Pas1 starts empty — remove auto-selection from existing inscrieri

verification: |
  Self-verified 2026-07-04:
  - npm run lint (tsc --noEmit): PASS, zero erori.
  - Grep autoCategorie in InscriereClubWizard/: folosit doar in ramura probelor individuale
    (InscriereClubCards lines 79/89, Pas2Quyen, Pas4Sumar) — nicio referinta in ramurile
    giao_dau/echipe. Corespunde abordarii recomandate.
  - Nicio modificare de cod suplimentara necesara in aceasta sesiune.

  HUMAN CONFIRMED 2026-07-04 — verificare via test automat Playwright pe localhost:5173
  (ADMIN_CLUB, competitia "Cupa" CN Tehnica):
  1. Hub Inscriere club: toate cele 3 carduri probe deschizibile ("Configureaza →"),
     niciunul blocat pe "Nu participam" — bug-ul original NU se mai reproduce.
  2. Flux echipe (Sincron perechi, acelasi code path Pas3Echipe ca giao_dau — competitia
     nu are proba giao_dau): echipa formata (3/3, validare 2M/1F OK), salvata, hub
     actualizat la "1/12 completate", Inscrieri (1).
  3. Flux individual: selectie Pas1 (Continua disabled fara selectie) → validare Q1 Pas2
     → card hub "Completat · Modifica →".
  4. Zero erori JS in consola pe toata sesiunea.
  Date de test curatate complet (echipa retrasa, Inscrieri inapoi la 0).
  Raport complet: .playwright-mcp/reports/raport-competitii-inscriere-verify-2026-07-04.md

observations_new: |
  OBSERVATIE MINORA NOUA (NU face parte din bug-ul original, NU blocheaza arhivarea):
  Dupa retragerea echipei ("Nu participam" → "← Participam"), hub-ul afiseaza in continuare
  "1/12 completate" (stale) pana la Refresh manual — retragerea nu declanseaza re-fetch-ul
  echipeFormate. Candidat pentru o sesiune /gsd-quick separata.

files_changed:
  - components/Competitii/InscriereClubWizard/InscriereClubCards.tsx (commits intermediare)
  - components/Competitii/InscriereClubWizard/index.tsx (commits intermediare)
  - components/Competitii/InscriereClubWizard/Pas3Echipe.tsx (commits intermediare)
  - .planning/debug/competitii-inscriere-20260605.md (aceasta sesiune — doar documentatie)
