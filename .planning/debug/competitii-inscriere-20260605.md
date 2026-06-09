---
slug: competitii-inscriere-20260605
status: root_cause_found
trigger: manual
goal: find_and_fix
created: 2026-06-05
---

# Debug Session: competitii-inscriere-20260605

## Symptoms

- Filtrarea sportivilor la inscriere in competitie nu functioneaza
- Nu se poate intra in probe (events/categories)
- Nu se pot adauga sportivi la competitie
- Intregul modul Competitii este nefunctional

## Current Focus

hypothesis: CONFIRMED — Refactoring-ul din commit 46b7bee a introdus 3 bug-uri structurale majore
next_action: Apply fixes

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
