---
slug: prezente-vacanta-lista-goala
status: resolved
trigger: "Sportivii dintr-o grupa nu apar in lista antrenamentelor de vacanta (perioade vacanta antrenamente). Feature-ul nu a functionat niciodata corect."
created: 2026-07-09
---

# Debug: Sportivi grupa lipsa din antrenament vacanta

## Symptoms

- **expected:** Sportivii care au fost selectati/inrolati sa fie in antrenamentele de vacanta ar trebui sa apara in lista la marcarea prezentei pentru acel antrenament.
- **actual:** Lista e complet goala — niciun sportiv din grupa nu apare.
- **errors:** Niciuna vizibila in UI/consola.
- **timeline:** Dintotdeauna — feature-ul de perioade vacanta nu a mers corect nici de la inceput (legat probabil de task 260626-buf-task-3-perioade-vacanta-antrenamente).
- **reproduction:** Deschide un antrenament generat pentru perioada de vacanta la o grupa cu sportivi inrolati in vacanta -> lista prezenta goala.

## Current Focus

reasoning_checkpoint:
  hypothesis: "Sportivii inscrisi intr-o perioada de vacanta (tabelul participare_vacanta) nu apar niciodata in lista de prezenta a unui antrenament, pentru ca niciun cod din aplicatie nu citeste participare_vacanta/perioade_vacanta cand construieste lista de sportivi pentru un antrenament (FormularPrezenta). Feature-ul 'Vacante Antrenamente' (task 260626-buf) a fost implementat ca un simplu roster CRUD la nivel de club, complet izolat de modelul de date grupa/antrenament/prezenta."
  confirming_evidence:
    - "grep exhaustiv pe tot repo-ul dupa 'participare_vacanta|perioade_vacanta|PerioadaVacanta' gaseste DOAR fisierul components/Plati/PerioadaVacanta.tsx (CRUD admin) + wiring de meniu (types.ts, AppRouter.tsx, LazyComponents.tsx, menuConfig.ts) si documentele .planning ale task-ului original. Zero referinte in components/Prezenta/* sau hooks/useAttendance*.ts"
    - "FormularPrezenta (components/Prezenta/ListaPrezentaAntrenament.tsx:171-183) construieste sportiviInGrupa DOAR din antrenament.grupe.sportivi (join sportivi!grupa_id, adica grupa PRINCIPALA a sportivului) + sportivi_grupe_secundare (apartenenta secundara). participare_vacanta nu e mentionat nicaieri in acest fisier."
    - "Ambele query-uri care populeaza antrenamentul (Prezenta/index.tsx:241 handleSelectAntrenament si ListaPrezentaAntrenament.tsx:688 handleSelectTraining) folosesc identic 'sportivi!grupa_id' - niciunul nu include participare_vacanta."
    - "types.ts:1020-1042 confirma ca PerioadaVacanta NU are camp grupa_id (design explicit din CONTEXT.md: 'vacanta e legata de abonamente/plati, nu de grupe') si Antrenament.tip_antrenament nu are o valoare 'vacanta' - deci nu exista niciun mecanism alternativ de legare."
    - "260626-buf-CONTEXT.md linia 30-33 confirma decizia originala: 'Antrenamentele de vacanta folosesc ACELASI sistem Prezenta existent... Nu se creeaza sistem de prezenta separat' - dar nimeni nu a adaugat wiring-ul care sa faca sportivii inscrisi (participare_vacanta) sa apara in sistemul de prezenta existent."
    - "Memoria project_prezenta_debug_20260704.md confirma ca mecanismul general FormularPrezenta (pentru membri normali de grupa) a fost deja verificat si reparat vizual pe 4 iulie - deci lista goala nu e cauzata de bug-ul general anterior, ci e specifica sportivilor din participare_vacanta care nu sunt niciodata inclusi."
  falsification_test: "Daca as gasi vreun query in components/Prezenta/*, hooks/useAttendance*.ts sau useAttendanceData.ts care face JOIN sau SELECT pe participare_vacanta/perioade_vacanta, ipoteza ar fi falsa. Grep-ul exhaustiv nu a gasit asa ceva."
  fix_rationale: "Cauza radacina e o lipsa de integrare (feature izolat), nu un bug logic intr-un query existent. Fix-ul minim: FormularPrezenta trebuie sa mai faca un fetch suplimentar (dupa modelul deja existent pentru sportivi_grupe_secundare) care gaseste perioade_vacanta active pentru club_id-ul antrenamentului si data antrenamentului in intervalul [data_start, data_end], apoi participare_vacanta pentru acele perioade, si sa-i adauge in sportiviInGrupa cu un tip nou 'vacanta' (afisat cu un badge distinct), deduplicat fata de principali+secundari. Aceasta respecta designul explicit club-wide (nu grupa-specific) din CONTEXT.md si reutilizeaza exact patternul existent pentru secundari."
  blind_spots: "Nu am acces runtime la aplicatie (fara browser/Playwright in aceasta sesiune) deci nu am putut reproduce vizual bug-ul cu date reale din Supabase - concluzia e bazata 100% pe analiza statica a codului, care e insa foarte puternica (grep exhaustiv + coerenta cu toate documentele de design). De asemenea FormularPrezentaMultiGrupa (folosit doar din 'Calendar Toate Grupele') NU va fi atins de fix - ramane cu acelasi gap, notat ca scope redus intentionat pentru ca simptomul raportat e despre un singur antrenament/o singura grupa."

next_action: rezolvat - verificat live cu Playwright + Supabase, vezi sectiunea Resolution (bug #2 mai jos)

## Evidence

- timestamp: 2026-07-09
  checked: grep global dupa participare_vacanta/perioade_vacanta/PerioadaVacanta in tot repo-ul
  found: singurele referinte sunt in components/Plati/PerioadaVacanta.tsx (CRUD admin roster) si wiring de meniu/tipuri; zero referinte in modulul Prezenta sau in hooks de attendance
  implication: feature-ul de inscriere vacanta e complet izolat de sistemul de prezenta - nimic nu citeste participare_vacanta la construirea listei de sportivi a unui antrenament

- timestamp: 2026-07-09
  checked: components/Prezenta/ListaPrezentaAntrenament.tsx - FormularPrezenta, sportiviInGrupa memo (linia 171-183) si fetch sportivi secundari (linia 143-168)
  found: lista de sportivi pt antrenament = antrenament.grupe.sportivi (query sportivi!grupa_id = apartenenta PRINCIPALA) + sportivi_grupe_secundare (apartenenta secundara). Niciun query catre participare_vacanta.
  implication: un sportiv inscris DOAR prin participare_vacanta (si nu are grupa_id sau sportivi_grupe_secundare setat pe grupa antrenamentului) nu va aparea NICIODATA in lista, indiferent de antrenament sau data

- timestamp: 2026-07-09
  checked: components/Prezenta/index.tsx handleSelectAntrenament (linia 238-256) si ListaPrezentaAntrenament.tsx handleSelectTraining (linia 685-703)
  found: ambele fac exact acelasi query "grupe(*, sportivi!grupa_id(...))" - fara participare_vacanta
  implication: bug-ul e prezent identic pe ambele cai de intrare in ecranul de prezenta (dashboard Azi si istoric per grupa)

- timestamp: 2026-07-09
  checked: types.ts liniile 1020-1042 (PerioadaVacanta, ParticipareVacanta) si 358-380 (Antrenament)
  found: PerioadaVacanta nu are camp grupa_id; Antrenament.tip_antrenament nu are valoare 'vacanta'
  implication: nu exista NICIUN camp in schema care sa lege perioade_vacanta de un antrenament sau o grupa - designul e intentionat club-wide, confirmat si de 260626-buf-CONTEXT.md

- timestamp: 2026-07-09
  checked: .planning/quick/260626-buf-task-3-perioade-vacanta-antrenamente/260626-buf-CONTEXT.md liniile 30-33
  found: "Antrenamentele de vacanta folosesc ACELASI sistem Prezenta existent... Nu se creeaza sistem de prezenta separat" - decizie explicita de design original
  implication: intentia produsului a fost ca aceasta lista sa se reflecte in prezenta existenta, dar wiring-ul necesar nu a fost niciodata implementat in task-ul original (scope-ul task-ului 260626-buf a fost doar CRUD roster, fara task de integrare in Prezenta)

## Eliminated

- hypothesis: "Bug generic FormularPrezenta gol (0/0) pentru orice antrenament, nu doar vacanta"
  evidence: memoria project_prezenta_debug_20260704.md arata ca acest bug general (path Grupe -> Prezenta Azi) a fost deja gasit si reparat + verificat vizual pe 4 iulie 2026 (sesiune .planning/debug/resolved/activitate-sala-prezenta.md). Simptomul curent e specific sportivilor inscrisi in vacanta, nu unui bug general de fetch.
  timestamp: 2026-07-09

## Resolution

Doua bug-uri distincte, ambele confirmate si reparate.

### Bug 1 — feature "Vacante Antrenamente" neconectat la Prezenta

- root_cause: participare_vacanta (roster-ul de inscriere in perioada de vacanta, tabelul din spatele feature-ului "Vacante Antrenamente" livrat in task 260626-buf) nu este citit nicaieri de codul care construieste lista de sportivi a unui antrenament (FormularPrezenta din components/Prezenta/ListaPrezentaAntrenament.tsx). Lista se bazeaza doar pe apartenenta principala (sportivi.grupa_id) si secundara (sportivi_grupe_secundare) la grupa antrenamentului - feature-ul de vacanta a fost livrat ca CRUD roster izolat, fara integrarea in sistemul de prezenta ceruta explicit in decizia de design originala (260626-buf-CONTEXT.md).
- fix: components/Prezenta/ListaPrezentaAntrenament.tsx (FormularPrezenta) - adaugat useEffect nou care: (1) cauta perioade_vacanta pentru club_id-ul antrenamentului unde data antrenamentului e in [data_start, data_end], (2) daca gaseste, incarca participare_vacanta pentru acele perioade + join sportivi(status Activ), (3) ii adauga in sportiviInGrupa cu tip 'vacanta' (dedupe fata de principali+secundari), afisati cu badge distinct "VACANȚĂ" (teal). TipMembru extins cu 'vacanta'. handleSaveAttendance foloseste deja sportiviInGrupa pentru allSportivIds, deci sportivii de vacanta sunt automat inclusi in salvare/stergere fara alta modificare.
- files_changed: components/Prezenta/ListaPrezentaAntrenament.tsx

### Bug 2 — RLS blocheaza citirea propriilor inregistrari salvate (descoperit prin verificare Playwright + Supabase live, cauza reala diferita de orice ipoteza initiala)

- root_cause: hooks/useAttendance.ts (saveAttendance) nu seta niciodata coloana club_id la INSERT in prezenta_antrenament (ramanea NULL). Politica RLS "prezenta_select_policy" cere club_id IN (cluburile utilizatorului) pentru admin/instructor — "NULL IN (...)" nu e niciodata adevarat in SQL, deci randurile salvate deveneau invizibile la urmatorul fetch, desi INSERT-ul reusea si toast-ul arata "Prezenta a fost salvata cu succes". Confirmat direct in DB (proiect wuhidifzsutwgdfkwhmd): 216 randuri istorice cu club_id IS NULL, invizibile in aplicatie pentru orice admin/instructor.
- fix:
  - hooks/useAttendance.ts: saveAttendance accepta acum parametrul clubId si il seteaza pe club_id la insert.
  - components/Prezenta/PrezentaRapida.tsx (tab Rapid) si components/Prezenta/ListaPrezentaAntrenament.tsx (tab Grupe, ambele functii de save: handleSaveAttendance si handleSaveMulti) actualizate sa paseze clubId.
  - Bonus: PrezentaRapida.tsx afisa placeholder "... (extra)" pentru sportivii reconstruiti ca extra (nemembri ai grupei) — acum foloseste filteredData.sportivi pentru numele si gradul real.
  - Backfill DB (aprobat explicit de user via AskUserQuestion): UPDATE prezenta_antrenament SET club_id = program_antrenamente.club_id WHERE club_id IS NULL AND program_antrenamente.club_id IS NOT NULL — a recuperat cele 216 randuri istorice.
- verification: Verificat live cu Playwright (browser real, login cu cont din .env) + query-uri SQL directe pe Supabase:
  1. Reprodus initial: "Grupa vacanta" 0/0 in tab Rapid, desi 4 randuri existau deja in DB (salvate anterior de user, invizibile din cauza club_id IS NULL).
  2. Adaugat sportiv manual ("Alt sportiv"), marcat prezent, salvat -> toast succes -> reload pagina -> sportivul a disparut, revenit la 0/0 (bug confirmat inainte de fix).
  3. Aplicat fix cod (tsc --noEmit exit 0) + backfill DB -> reload -> "Grupa vacanta 5/5" cu toti sportivii (4 vechi + 1 test), nume si grad reale afisate corect (nu mai placeholder "... extra").
  4. Curatat datele de test: un-marcat sportivul de test adaugat in aceasta sesiune, salvat din nou — cele 4 randuri originale ale utilizatorului au ramas intacte.
- files_changed:
  - hooks/useAttendance.ts
  - components/Prezenta/PrezentaRapida.tsx
  - components/Prezenta/ListaPrezentaAntrenament.tsx
  - DB: backfill UPDATE pe prezenta_antrenament (216 randuri, proiect wuhidifzsutwgdfkwhmd)
