---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 02
subsystem: payments
tags: [typescript, react, supabase, bugfix, data-integrity]

# Dependency graph
requires: []
provides:
  - "Payload whitelist explicit pe toate scrierile .update() catre plati din GestiuneFacturi.tsx, RaportFinanciar.tsx si UserProfile.tsx"
  - "Merge de stare {...p, ...data} (nu inlocuire) dupa editare/incasare rapida — pastreaza campurile JOIN ale view-ului rbv_plati_club"
affects: [31-03, 31-04, 31-05, 31-06, 31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Merge de stare {...p, ...data} dupa orice update() pe un rand provenit din view (rbv_plati_club) — evita pierderea campurilor JOIN (club_nume, sportiv_nume, sportiv_prenume)"
    - "Refetch select('*').eq('id').maybeSingle() dupa un RPC care nu returneaza campul de stare modificat, urmat de merge in stare — nu de citire optimista a unui camp inexistent in raspunsul RPC"

key-files:
  modified:
    - components/Plati/GestiuneFacturi.tsx
    - components/Plati/RaportFinanciar.tsx
    - components/UserProfile.tsx

key-decisions:
  - "GestiuneFacturi.handleSaveEdit si RaportFinanciar.handleSaveEditFactura: merge {...p, ...data} in loc de inlocuire directa a randului — payload-urile de update() (chei explicite) raman neschimbate, doar rescrierea starii locale s-a corectat"
  - "GestiuneFacturi.handleProcessPayment: eliminat result.status_nou (camp care nu exista in raspunsul RPC proceseaza_plata_factura — verificat in sql/refactor/REFACTOR_FINANCIAL.sql:118-121, RPC intoarce doar { success, tranzactie_id }) — inlocuit cu refetch select('*') + merge, identic ca intentie cu fix-ul PlatiScadente.handleProcessPayment"
  - "UserProfile.handleSavePlataEdit: whitelist explicit cu exact cele 4 campuri editate de PlataEditModal (descriere, suma, data, status) — elimina spread-ul { id, ...updates } care trimitea club_nume (coloana de JOIN, inexistenta in tabela reala) si producea PGRST204"

patterns-established: []

requirements-completed: [D-07]

# Metrics
duration: ~20min
completed: 2026-09-26
---

# Phase 31 Plan 02: Audit si reparatie anti-pattern D-07 (spread din view in update plati) Summary

**Whitelist explicit pe 3 scrieri .update() catre tabela `plati` (GestiuneFacturi, RaportFinanciar, UserProfile) plus merge de stare `{...p, ...data}` dupa editare/incasare — elimina clasa de bug "spread din randul view-ului `rbv_plati_club` intr-un update pe tabela reala" (D-07), verificat exhaustiv pe toate cele 30+ site-uri de scriere din cele 5 fisiere relevante.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 3

## Accomplishments

- Reverificat pe cod real (nu doar acceptat inventarul din plan) toate site-urile `.update(`/`.insert(`/`.upsert(` din `GestiuneFacturi.tsx`, `RaportFinanciar.tsx`, `JurnalIncasari.tsx` si `SMSIncasari.tsx` — toate cele 4 fisiere confirmate identic cu inventarul de planificare, zero anti-pattern-uri suplimentare gasite.
- `GestiuneFacturi.tsx handleSaveEdit`: rand rescris cu `{ ...p, ...data }` in loc de inlocuire directa — pastreaza `club_nume`/`sportiv_nume`/`sportiv_prenume` din view dupa editare.
- `GestiuneFacturi.tsx handleProcessPayment`: eliminat `result.status_nou` (camp inexistent in raspunsul RPC, verificat in `sql/refactor/REFACTOR_FINANCIAL.sql:118-121` — RPC-ul intoarce doar `{ success, tranzactie_id }`), inlocuit cu refetch `select('*').eq('id').maybeSingle()` + merge `{ ...p, ...plataActualizata }`.
- `RaportFinanciar.tsx handleSaveEditFactura`: acelasi merge `{ ...p, ...(data as Plata) }` in loc de inlocuire.
- `UserProfile.tsx handleSavePlataEdit`: eliminat spread-ul `const { id, ...updates } = editedPlata` (anti-pattern D-07 gasit exact ca in obiectiv, nelistat initial in cele 4 fisiere din CONTEXT dar identificat corect de planificare) — inlocuit cu payload whitelist `{ descriere, suma, data, status }`, exact cele 4 campuri editate de `PlataEditModal`.
- Garda repo-wide (`grep -rnE "from('plati').update(updates)"`, `grep -rn "...updates } = editedPlata"`) confirmata cu 0 rezultate dupa fix.

## Task Commits

1. **Task 1: Audit + reparatie GestiuneFacturi.tsx / RaportFinanciar.tsx** - `ced3b97` (fix)
2. **Task 2: Reparatie UserProfile.handleSavePlataEdit + garda repo-wide** - `0f69469` (fix)

## Files Created/Modified

- `components/Plati/GestiuneFacturi.tsx` - `handleSaveEdit` merge `{...p, ...data}`; `handleProcessPayment` refetch+merge in loc de `result.status_nou`
- `components/Plati/RaportFinanciar.tsx` - `handleSaveEditFactura` merge `{...p, ...(data as Plata)}`
- `components/UserProfile.tsx` - `handleSavePlataEdit` payload whitelist (4 chei) + merge de stare

## Tabel verdict per site de scriere pe `plati`/`tranzactii`

| Fisier:linie | Apel | Verdict | Actiune |
|---|---|---|---|
| GestiuneFacturi.tsx:243 | `insert(newPlata)` | OK — literal explicit | Neschimbat |
| GestiuneFacturi.tsx:255 | `insert({ plata_ids, sportiv_id, ... })` (tranzactii) | OK — literal explicit | Neschimbat |
| GestiuneFacturi.tsx:353-357 | `update({ status, suma_initiala, suma })` | OK — payload literal (pattern de referinta) | Neschimbat |
| GestiuneFacturi.tsx:364 (era) | `p.id === data.id ? data : p` | REPARAT | `{ ...p, ...data }` |
| GestiuneFacturi.tsx:441 (era) | `{ ...p, status: result.status_nou }` | REPARAT | Refetch `select('*')` + merge `{ ...p, ...plataActualizata }` |
| RaportFinanciar.tsx:274-277 | `update({ status, suma })` | OK — payload literal | Neschimbat |
| RaportFinanciar.tsx:281 (era) | `data as Plata : p` | REPARAT | `{ ...p, ...(data as Plata) }` |
| JurnalIncasari.tsx:133 | `insert(newTranzactie)` | OK — literal explicit | Neschimbat |
| JurnalIncasari.tsx:222 | `insert({ nume, is_system_type })` (tipuri_plati) | OK — literal explicit | Neschimbat |
| JurnalIncasari.tsx:369 | `.rpc('proceseaza_incasare_normalizata', ...)` | OK — payload RPC construit din chei explicite | Neschimbat |
| JurnalIncasari.tsx:422-437 | `insert({ sportiv_id, familie_id, ... })` | OK — literal explicit | Neschimbat |
| JurnalIncasari.tsx:514 | `update({ status: 'Neachitat' }).in('id', plata_ids)` | OK — payload literal | Neschimbat (vezi Observatii business) |
| SMSIncasari.tsx:335-336 | `update({ status: 'Achitat' })` | OK — payload literal | Neschimbat (vezi Observatii business) |
| SMSIncasari.tsx:343 | `update({ status: 'manual_matched', plata_id })` (sms_incoming) | OK — payload literal | Neschimbat |
| SMSIncasari.tsx:347 | `update({ status: 'Neachitat' })` (rollback) | OK — payload literal | Neschimbat |
| SMSIncasari.tsx:363 | `update({ status: 'ignored' })` (sms_incoming) | OK — payload literal | Neschimbat |
| UserProfile.tsx:451-452 (era) | `const { id, ...updates } = editedPlata;` + `.update(updates)` | ANTI-PATTERN GASIT (PGRST204) | Whitelist `{ descriere, suma, data, status }` |
| UserProfile.tsx:481-482 | `update({ status })` (handleMutaPlata) | OK — payload literal | Neschimbat |

## Observatii in afara scope-ului (business logic — nu s-au reparat)

Per 31-CONTEXT.md ("Nu intra in scope: logica de business a platilor") — documentate, nu reparate:

1. **SMSIncasari.tsx:335-336** — `handleConfirm` marcheaza factura direct `'Achitat'` fara sa creeze o tranzactie asociata si fara sa aduca `suma` (restul de plata) la 0. Efect: factura devine "Achitat" in status dar `suma` (campul care reprezinta restul in acest flux) ramane neschimbata — inconsistenta vizibila. Ecranul de detaliu factura din 31-03 (istoric tranzactii pe factura) va semnala vizual acest caz (0 tranzactii, dar status Achitat).
2. **JurnalIncasari.tsx:514** — `handleDeleteTranzactie` seteaza `'Neachitat'` pe *toate* facturile din `plata_ids` al tranzactiei sterse, chiar daca exista alte tranzactii valide pe aceleasi facturi (ex. plata partiala in doua transe, se sterge doar una). Daca trigger-ul de recalculare a sumei/statusului (`tranzactie_change_trigger` / `on_tranzactie_change`, vezi `sql/refactor/REFACTOR_FINANCIAL.sql:71-74`) e prezent si activ live, corecteaza automat statusul dupa DELETE; altfel, factura ramane incorect marcata `Neachitat` desi are alte incasari valide.

## Decisions Made

- Payload whitelist ca fix — nu s-a schimbat semantica niciunui `.update()` existent (chei/valori identice), doar forma la site-urile deja corecte a ramas neatinsa.
- Merge de stare `{...p, ...data}` in loc de inlocuire directa — ales consecvent in toate cele 3 locuri reparate, aliniat cu fix-ul deja existent din `PlatiScadente.tsx:505` (referinta din aceeasi sesiune).
- Refetch (nu citire optimista dintr-un camp RPC inexistent) dupa `proceseaza_plata_factura` — RPC-ul intoarce doar `{ success, tranzactie_id }`; singura sursa de adevar pentru statusul real e un `select('*')` dupa ce trigger-ul DB a recalculat.

## Deviations from Plan

None - plan executed exactly as written. Toate cele 2 task-uri s-au aplicat exact conform planului; inventarul de planificare a fost confirmat identic la reverificare (Pas 1 al Task 1), fara descoperiri suplimentare.

## Issues Encountered

- Prima varianta a comentariului din `GestiuneFacturi.tsx handleProcessPayment` continea literal sirul `status_nou` (in explicatia de ce campul nu mai e folosit), ceea ce facea ca garda automata `grep -c "status_nou"` sa raporteze fals-pozitiv 1 in loc de 0. Reformulat comentariul sa explice acelasi fapt fara a repeta literal numele campului — garda trece acum cu 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Toate scrierile pe `plati` din componentele care vor fi montate in hub (31-04/05/06/08) folosesc acum payload whitelist si merge corect de stare — planurile urmatoare pot reutiliza aceste handlere fara sa mosteneasca bug-ul D-07.
- Cele 2 observatii de business (SMSIncasari fara tranzactie, JurnalIncasari status pe delete partial) raman deschise — relevante pentru ecranul de detaliu factura din 31-03 (istoric tranzactii), fara sa blocheze planul curent.
- Niciun blocker cunoscut.

## Self-Check: PASSED

- FOUND: components/Plati/GestiuneFacturi.tsx (modificat)
- FOUND: components/Plati/RaportFinanciar.tsx (modificat)
- FOUND: components/UserProfile.tsx (modificat)
- FOUND: commit ced3b97 (Task 1)
- FOUND: commit 0f69469 (Task 2)
