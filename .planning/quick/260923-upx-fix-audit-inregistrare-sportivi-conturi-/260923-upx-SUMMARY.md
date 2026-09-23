---
quick_id: 260923-upx
status: complete
date: 2026-09-23
---

# Quick Task 260923-upx: Fix audit inregistrare sportivi/conturi

## Ce s-a facut

**Task 1 [Mediu, QUICK-260923-UPX-01]** — RPC live `public.refactor_create_user_account` (proiect Supabase `wuhidifzsutwgdfkwhmd`), overload cu 9 parametri: ramura UPDATE (activare cont pt sportiv existent, `p_sportiv_id` dat) scrie acum `cnp/gen/telefon/adresa/data_nasterii` din `p_additional_data`, cu garzi anti-suprascriere:
- gol/null -> pastreaza valoarea existenta
- `data_nasterii = '1900-01-01'` (placeholder trimis cand data lipseste) -> pastreaza valoarea existenta
- `cnp` continand `*` (CNP mascat, ex. din view-ul `sportivi_instructor`) -> pastreaza valoarea existenta

Verificat cu smoke test in bloc `DO $$ ... $$` terminat cu `RAISE EXCEPTION` (rollback garantat) — rezultat `SMOKE_OK`. Documentat in `sql/migrations/fix_refactor_create_user_account_260923.sql`, comis cu `git add -f` (`sql/` e in `.gitignore`).

**Task 2 [Foarte mic, QUICK-260923-UPX-03] + hardening securitate** — auditul apelantilor (grep pe tot repo-ul + interogare `pg_proc.prosrc` pe DB) a confirmat un singur apelant runtime al semnaturii vechi cu 8 parametri: `api/genereaza-magic-link.ts:82`. DROP pe overload-ul vechi; apelul cu 8 argumente se rezolva acum pe functia cu 9 parametri (`p_sportiv_id` DEFAULT NULL) — verificat cu bloc `DO` rollback, rezultat `RESOLVE_OK`.

Descoperit in timpul planificarii: functia SECURITY DEFINER avea EXECUTE acordat implicit catre `PUBLIC/anon/authenticated` — orice utilizator logat putea apela RPC-ul direct din browser si-si putea asigna orice rol (inclusiv `SUPER_ADMIN_FEDERATIE`), ocolind garda per-club din `api/_permisiuniCont.ts`. `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role`. Verificat cu `has_function_privilege`: anon=false, authenticated=false, service_role=true. `get_advisors(type=security)` nu mai raporteaza nimic despre aceasta functie.

`api/genereaza-magic-link.ts` si `api/creare-cont.ts` — neatinse.

**Task 3 [Mic, QUICK-260923-UPX-02]** — `utils/error.ts`: mapper pur nou, `mapeazaEroareUnicitateSportiv(error)`, care detecteaza eroarea Postgres 23505 (dupa `code` sau dupa subsirul `duplicate key value violates unique constraint` in `message`, pt erorile venite ca text prin `/api/creare-cont`) si o mapeaza la un mesaj romanesc care numeste campul (CNP / email / numar legitimatie / nume de utilizator / nume+prenume+data nasterii), fara sa propage `details`/`hint`/mesajul original (PII). Test colocat `utils/error.test.ts` (pattern `api/_permisiuniCont.test.ts`), 9 cazuri, toate PASS. Folosit in `services/sportivService.ts` (`adaugaSportiv`, fara query suplimentar inainte de insert) si `hooks/useRoleAssignment.ts` (`createAccountAndAssignRole`).

## Verificari rulate

- `node --import tsx utils/error.test.ts` — 9 PASS, 0 FAIL
- `npm run lint` (tsc --noEmit) — 0 erori
- DB live: `SMOKE_OK`, `RESOLVE_OK`, un singur overload ramas, `has_function_privilege` corect, `get_advisors` curat
- `git diff` — doar fisierele din `files_modified`; `api/`, `components/`, fluxul de import neatinse

## Fisiere modificate

- `sql/migrations/fix_refactor_create_user_account_260923.sql` (nou, documentatie + bloc ROLLBACK comentat)
- `utils/error.ts` (+ `mapeazaEroareUnicitateSportiv`)
- `utils/error.test.ts` (nou)
- `services/sportivService.ts` (`adaugaSportiv`)
- `hooks/useRoleAssignment.ts` (`createAccountAndAssignRole`)

## Follow-up (todo-uri descoperite, NEREZOLVATE aici)

1. **`api/genereaza-magic-link.ts` nu trimite `p_sportiv_id`.** RPC-ul intra pe ramura INSERT (emailul provizoriu e mereu nou), deci creeaza un rand `sportivi` duplicat sau esueaza pe `unique_sportiv_phi_hau`. Update-ul ulterior `.update({user_id, email}).eq('id', sportiv_id)` nu are eroarea verificata si intra in conflict pe emailul unic cu duplicatul. Fix recomandat: o linie, `p_sportiv_id: sportiv_id`, intr-un quick task separat — endpoint-ul e folosit si de fluxul de import (`Pas2Raport.tsx`), asa ca fix-ul trebuie testat si pe acel flux.
2. **`/api/creare-cont` nu verifica ca `sportiv_id` apartine unui club in care apelantul are drepturi** (existent dinainte de acest task, de la `ba9cc75`). Recomandare: ruleaza `verificaPermisiuneCreareCont` si pentru `club_id`-ul curent al sportivului, nu doar pentru clubul tinta din payload.
3. Modificarile DB (RPC, DROP, REVOKE/GRANT) sunt live imediat pe proiectul `wuhidifzsutwgdfkwhmd`. Modificarile de cod frontend (`utils/`, `services/`, `hooks/`) intra in productie doar dupa push + deploy Vercel.
4. Fluxul de import Excel/CSV (`components/Sportivi/ImportSportiviPage/`) nu creeaza niciodata cont de acces — ramane un gap de produs cunoscut, in afara scope-ului acestui task (semnalat in auditul initial).
