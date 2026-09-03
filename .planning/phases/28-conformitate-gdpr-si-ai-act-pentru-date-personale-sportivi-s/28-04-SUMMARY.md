---
phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s
plan: 04
subsystem: frontend
tags: [gdpr, consimtamant, minori, formular, validare]

# Dependency graph
requires: ["28-01"]
provides:
  - "Camp `Sportiv.consimtamant_parinte_nume`/`consimtamant_parinte_data` in types.ts + union `View` extinsa cu 'protectia-datelor'/'cereri-gdpr'"
  - "Gate de validare varsta<16 -> consimtamant parinte obligatoriu, pe ambele cai (creare + editare)"
  - "Persistenta consimtamantului pe calea de CREARE (update de completare, ocolind whitelist-ul RPC)"
  - "Accordion nota de informare GDPR la creare sportiv nou"
affects: ["28-05"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Refolosire calculeazaVarstaLaData() din utils/eligibilitateCompetitie.ts pentru gate de varsta live (fara functie noua de calcul)"
    - "Update de completare post-creare pentru campuri excluse dintr-un whitelist multi-strat (client -> API -> RPC SQL) — evita esec silentios fara sa modifice RPC-ul"
    - "Accordion/AccordionItem din design system intern (ui.tsx), fara librarie externa"

key-files:
  created: []
  modified:
    - types.ts
    - utils/validation.ts
    - components/Sportivi/SportivFormFields.tsx
    - components/Sportivi/SportivFormModal.tsx
    - components/Sportivi/index.tsx

key-decisions:
  - "validateSportiv() nu ramifica pe data.id — o singura verificare acopera atat REQ-5 (sportiv nou) cat si D-03 (sportiv existent blocat la editare), evitand un al doilea cod path"
  - "consimtamant_parinte_data nu e expus niciun input in formular — se stampileaza programatic in SportivFormModal.handleSubmit doar cand numele parintelui e nevid si diferit de valoarea salvata anterior (D-04), previne rescrierea la fiecare editare ulterioara"
  - "Update de completare in Sportivi/index.tsx handleSave (ramura creare) dupa createAccountAndAssignRole — whitelist-ul din hooks/useRoleAssignment.ts + maparea explicita din RPC-ul SQL refactor_create_user_account ar arunca tacit consimtamant_parinte_nume/_data; eroarea de update e afisata vizibil (showError) dar NU esueaza intreaga creare a sportivului"
  - "Accordionul GDPR e randat doar cand !initialData.id (sportiv nou) — nu la editare, conform D-18"

requirements-completed: [REQ-4, REQ-5]

# Metrics
duration: ~35min
completed: 2026-09-03
---

# Phase 28 Plan 04: Consimtamant parinte digital + nota informare GDPR Summary

**Gate de validare varsta<16 ani cu consimtamant parinte obligatoriu, persistat efectiv pe ambele cai de salvare (inclusiv calea de creare cu whitelist multi-strat), plus accordion de nota de informare GDPR la crearea unui sportiv nou.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-03
- **Completed:** 2026-09-03
- **Tasks:** 3/3 complete
- **Files modified:** 5

## Accomplishments

- `types.ts`: `Sportiv.consimtamant_parinte_nume?`/`consimtamant_parinte_data?` (nullable, optional) + `View` extins cu `'protectia-datelor'`/`'cereri-gdpr'`, fara a atinge `'cereri-inscriere'` (view distinct, nelegat de GDPR)
- `utils/validation.ts`: `validateSportiv()` calculeaza varsta live cu `calculeazaVarstaLaData(data.data_nasterii, new Date().toISOString().split('T')[0])` (refolosita din `utils/eligibilitateCompetitie.ts`, fara functie noua) si blocheaza salvarea cand varsta < 16 si `consimtamant_parinte_nume` e gol, cu mesajul exact din plan
- `components/Sportivi/SportivFormFields.tsx`: camp `Input` conditional "Nume complet părinte/tutore (consimțământ) *" randat imediat sub `DateInputDMY` de Data Nașterii, aparand/disparand live la schimbarea datei; `'consimtamant_parinte_nume'` adaugat in `generalFields` pentru badge-ul de erori pe tab; zero input pentru `consimtamant_parinte_data`
- `components/Sportivi/SportivFormModal.tsx`: `handleSubmit` construieste un payload care stampileaza `consimtamant_parinte_data` cu `new Date().toISOString()` doar cand numele parintelui e nevid si a fost schimbat fata de `sportivToEdit`
- `components/Sportivi/index.tsx`: ramura de creare din `handleSave` executa un update separat `supabase.from('sportivi').update(...)` imediat dupa `createAccountAndAssignRole`, cu `showError` explicit daca update-ul esueaza (fara sa opreasca fluxul de creare); `sportivCreat` (rezultatul imbogatit) e folosit consecvent la `setSportivi` si la `return`
- `components/Sportivi/SportivFormFields.tsx`: `AccordionItem` "Notă de informare privind protecția datelor (GDPR)" din design system-ul intern (`ui.tsx`), inchis implicit, prim element in tabul "Date Personale", randat DOAR cand `!initialData.id` (sportiv nou); continut pe 4 sectiuni (ce colectam / de ce / cui transmitem / drepturi) + mentiune consimtamant minori + buton `type="button"` catre `setActiveView('protectia-datelor')`

## Task Commits

1. **Task 1: Extinde types.ts** — `b4d1c12` (feat)
2. **Task 2: Gate de validare pe varsta + camp conditional + persistenta pe ambele cai (REQ-5)** — `40d95ff` (feat)
3. **Task 3: Accordion nota de informare GDPR la sportiv nou (REQ-4)** — `89268dc` (feat)

## Files Created/Modified

- `types.ts` — 2 campuri noi `Sportiv`, 2 valori noi `View`
- `utils/validation.ts` — gate de varsta<16 in `validateSportiv()`
- `components/Sportivi/SportivFormFields.tsx` — camp conditional consimtamant + accordion nota informare
- `components/Sportivi/SportivFormModal.tsx` — stampilare automata `consimtamant_parinte_data`
- `components/Sportivi/index.tsx` — update de completare post-creare pentru consimtamant

## Decisions Made

Vezi `key-decisions` din frontmatter — sintetizat: fara ramuri pe `data.id` in validare, fara input pentru data consimtamantului, update separat post-creare cu eroare vizibila (nu blocanta), accordion strict la sportiv nou.

## Deviations from Plan

None — planul a fost executat literal, inclusiv gotcha-urile documentate (whitelist RPC, cod path unic de validare, `useSportivForm.validate()` neatins).

## Auth Gates

Niciunul intalnit.

## Manual/Human Verification — Deferred to End-of-Phase

Acest plan a fost executat integral autonom (`type="auto"` pe toate cele 3 taskuri). Scenariile `<human-check>` din plan (deschidere formular sportiv nou, variatie varsta 12/20 ani, creare efectiva sportiv sub 16 ani + redeschidere la editare, blocare sportiv existent sub 16 fara consimtamant, verificare accordion inchis/deschis + navigare buton, absenta accordionului la editare) NU au fost rulate in browser de acest agent — `human_verify_mode` din config e `"end-of-phase"`, deci verificarea vizuala e responsabilitatea fazei de verificare de la finalul intregii Faze 28, nu a acestui plan individual. Toate verificarile automate (`npm run lint`, grep-urile din plan) au trecut.

**Nota critica pentru verificarea end-of-phase:** verificarea live optionala din plan (`SELECT id, nume, consimtamant_parinte_nume, consimtamant_parinte_data FROM public.sportivi WHERE consimtamant_parinte_nume IS NOT NULL`) presupune ca migratia din 28-01 (`sql/migrations/add_gdpr_consimtamant_si_cereri.sql`) a fost deja aplicata live pe Supabase. Conform `28-01-SUMMARY.md`, la momentul acelui plan migratia NU fusese inca aplicata (blocata de lipsa acces MCP in subagentul respectiv); promptul acestui plan a indicat insa ca aplicarea a avut loc ulterior de catre orchestrator. Daca coloanele `consimtamant_parinte_nume`/`consimtamant_parinte_data` nu exista inca pe DB-ul live, update-ul din `components/Sportivi/index.tsx` (Task 2 pasul 4) va esua vizibil cu eroare Supabase la creare sportiv sub 16 ani — comportament asteptat (fail loud, nu silentios), dar de verificat inainte de UAT.

## Threat Flags

Niciuna — toate suprafetele noi (camp formular, update post-creare, buton de navigare) sunt acoperite explicit de `<threat_model>` din 28-04-PLAN.md (T-28-15..T-28-19), fara surse noi in afara acestuia.

## Known Stubs

Niciunul.

---
*Phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s*
*Completed: 2026-09-03*

## Self-Check: PASSED

- FOUND: `types.ts`
- FOUND: `utils/validation.ts`
- FOUND: `components/Sportivi/SportivFormFields.tsx`
- FOUND: `components/Sportivi/SportivFormModal.tsx`
- FOUND: `components/Sportivi/index.tsx`
- FOUND: commit `b4d1c12`
- FOUND: commit `40d95ff`
- FOUND: commit `89268dc`
