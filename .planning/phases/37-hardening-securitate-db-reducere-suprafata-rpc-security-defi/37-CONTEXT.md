# Phase 37: Hardening securitate DB - Context

**Gathered:** 2026-11-05
**Status:** Ready for planning
**Source:** PRD Express Path (37-PROPUNERE.md) + decizii utilizator 5.11.2026

<domain>
## Phase Boundary

Inchide suprafata de atac a bazei de date `phi-hau-db` descoperita dupa faza 36 (inventar live): RPC `SECURITY DEFINER` apelabile de `anon`/`authenticated` fara garda, si citirea cross-club a tabelei `sportivi` (CNP, minori). NU schimba logica de business a modulelor; frontend atins doar in Val 3. NU da push (utilizatorul decide). Migrarile din `supabase/` se adauga cu `git add -f`. DDL se aplica live prin MCP Supabase (`apply_migration`, project `wuhidifzsutwgdfkwhmd`); executorul gsd cu worktree esueaza in acest mediu, deci executie inline.

Ordine impusa de utilizator: **Val 0, 1, 2 INAINTE de invitarea reprezentantilor externi; Val 3 DUPA invitatii; Val 4 dupa.**

</domain>

<decisions>
## Implementation Decisions

### Val 0 - Triaj + plasa de regresie
- Clasifica manual cele 177 de functii `SECURITY DEFINER` (public): A garda ok / B are nevoie de garda / C functii trigger (nu trebuie apelabile) / D publice intentionate. Rezultat `37-TRIAJ.md` (tabel fn x rol x decizie). Regex-ul din inventar are fals pozitive/negative (ex. `genereaza_taxe_anuale` si `raport_taxe_anuale_cluburi` sunt pazite prin `poate_gestiona_taxe_club`) -> citeste corpurile, nu te baza pe regex.
- Test nou `tests/acl_definer_faza37.ts`: allowlist a functiilor apelabile de `anon`/`authenticated`; pica daca apare o functie noua neinclusa.
- Inainte de orice REVOKE: grep `.rpc(` in `components/ hooks/ services/ utils/ api/ App.tsx` ca sa nu stricam apelanti.

### Val 1 - Reducere suprafata (risc mic)
- `REVOKE EXECUTE ... FROM anon` pe toate functiile definer EXCEPTAND lista D (intentionat publice: `get_competitie_publica`, `lista_cluburi_publice`, `trimite_cerere_acces`; plus ce mai arata triajul ca necesar pe fluxuri anonime: login/reset/inregistrare).
- **`scoala_ioncreanga_*` NU se ating** (aplicatie separata folosita in alta aplicatie; discutie separata). Nici REVOKE, nici alte schimbari. Test/allowlist le trateaza ca "exceptie documentata".
- `REVOKE` de la `authenticated`/PUBLIC pe functiile trigger/interne (categoria C).
- `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon` (functiile viitoare nu mai sunt expuse implicit). Atentie la rolul care creeaza functiile (postgres) si schema public.
- `cauta_utilizatori_comisie`: cere `authenticated` + staff (azi anon cauta numele staff-ului).
- Migrarea include in comentariu GRANT-urile de rollback.

### Val 2 - Garzi in functiile de bani/date (categoria B)
- Tipar: `IF (SELECT este_doar_extern()) OR NOT (is_super_admin() OR has_access_to_club(<club>)) THEN RAISE EXCEPTION ... USING ERRCODE='42501'`.
- Tinte: `proceseaza_incasare_normalizata`, `recalculare_stare_plata`, `generare_factura_examen` (2 variante), `adauga_sportiv_complet` (verifica `p_club_id`), `process_exam_row_v4`, `export_sportivi_selectati` (repara si tipul varchar(13) vs text + garda + limita pe ids), `decrypt_cnp` (doar service_role), `get_all_app_data` (sterge daca nu e folosita, altfel garda). Triajul poate adauga altele.
- Teste live per functie pe date efemere (`ZZ_TEST_*`, cleanup in finally, reziduuri 0): extern respins, SPORTIV respins, ADMIN alt club respins, ADMIN propriu + federatie permis.
- Verifica ca fluxurile UI existente (plati/incasari, examene, adaugare sportiv) continua sa mearga pentru rolurile legitime.

### Val 3 - Model citire `sportivi` (DUPA invitatii; cea mai delicata)
- Problema masurata: un cont SPORTIV dintr-un club vede 1199 sportivi din 32 cluburi, 122 cu CNP (`Select_Sportivi_Unified` din 20260507 + `inscrieri_select auth.uid() IS NOT NULL` + EXISTS pe inscrieri/echipa_sportivi).
- **Decizie utilizator: cross-club la competitii = DOAR federatia.** ADMIN_CLUB/INSTRUCTOR vad sportivii clubului lor (+ familie). Consecinta: un club nu mai poate inscrie sportivi ai altui club (flux inter-club ramane doar federatiei) - verifica la Val 3 ce date/ecrane depind de asta.
- Contul extern (faza 36) citeste un view cu coloane limitate (`id, nume, prenume, club_id, grad, data_nasterii`, fara cnp/adresa/telefon/email), nu tabela `sportivi` (inchide T-36-41). Revizuieste `ext_p_sportivi_sel` si `ExternDataProvider`.
- Restrange `inscrieri_select`/`echipe_select` la club + federatie (+ extern pe grant).
- Audit consumatori in frontend inainte de schimbare; teste: SPORTIV vede doar clubul + familia; extern nu mai vede cnp.

### Val 4 - Restul
- Plasa default-deny pentru tabele noi (verifica functia/eventul `rls_auto_enable` existent), restrange `cluburi_public_select` (cif/setari), cheie localStorage separata pt. login extern, audit politici storage, `vedere_istoric_grade_sportiv` (citita de `useDataProvider.ts:390,409,411` pentru toate rolurile; politica "Instructor - Vizualizare grade club" arata gradele intregului club oricarui rol din club).

### Reguli de executie (toate valurile)
- Dupa orice modificare de cod/DDL netrivial: review separat pe diff (agentul `agent-skills:code-reviewer` sau `gsd-code-reviewer`), raporteaza findings cu severitate si `fisier:linie`; nu aplica fix-uri din review fara OK.
- Raporteaza explicit ce s-a verificat si ce nu (teste rulate? testat in browser?).
- Teste live existente de rulat ca regresie: `npx tsx tests/rls_acces_extern_faza36.ts` (57/57), `tests/acces_extern_aprobare_faza36.ts` (36/36), `tests/rls_competitii_scriere_faza36.ts` (42/42), `tests/acces_extern_fundatie_faza36.ts` (36/36), `tests/rls_izolare_cross_club_faza25.ts`, `npx playwright test tests/ui_acces_extern_faza36.spec.ts` (6/6), `npx tsc --noEmit`.
- Nu da push. Commit local atomic per plan.

### Claude's Discretion
- Impartirea exacta in planuri/valuri de executie, formatul `37-TRIAJ.md`, numele migrarilor (`2026110xx_...`, continua dupa `20261106g`), structura testului ACL.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sursa fazei
- `.planning/phases/37-hardening-securitate-db-reducere-suprafata-rpc-security-defi/37-PROPUNERE.md` — inventar live, masuratori, plan pe valuri, decizii luate (sectiunea 3)
- `.planning/ROADMAP.md` — Phase 37 (goal, valuri)

### Faza 36 (originea riscurilor)
- `.planning/phases/36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-/36-SECURITY.md` — amenintari T-36-37 (RPC definer), T-36-41 (coloane sportivi), status 50/6/4
- `.planning/phases/36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-/36-VERIFICARE.md` — riscuri (d)
- `supabase/migrations/20261106a..g_*.sql` — helperi `este_doar_extern`, `acces_extern_*`, politici `ext_p_*`/`ext_r_*`, `prezenta_familie_sel`, trigger `familie_id`
- `docs/roluri-permisiuni.md`, `docs/baza-de-date.md` — roluri, RLS

### Memorie relevanta (lectii)
- Verifica DB live (`pg_policies`/`pg_proc`), nu doar fisierele de migrare (politici fantoma): vezi memoria `feedback_audit_rls_verifica_live_nu_doar_migratii`.
- `FORCE ROW LEVEL SECURITY` blocheaza bypass-ul SECURITY DEFINER; `CREATE OR REPLACE VIEW` reseteaza `security_invoker`: vezi `feedback_rls_force_security_definer_recursion`.
- `supabase/` e in `.gitignore`: migrari noi cu `git add -f`.

</canonical_refs>

<specifics>
## Specific Ideas

- Cifre live 5.11.2026: 177 functii definer in `public`, 165 apelabile de authenticated, 59 de anon, ~91 fara garda aparenta dupa regex (maxim; fals pozitive existente).
- Anon-callable neintentionate: `cauta_utilizatori_comisie`, functii trigger (`sync_grad_actual_canonical`, `fn_automatizeaza_legatura_utilizator`), helperi `*_club_id`/`is_comisie_*`.
- `export_sportivi_selectati` esueaza azi cu eroare de tip (varchar(13) vs text) - nu scurge, dar devine scurgere cand e reparata.
- Simulare folosita pentru masuratori: tranzactie `BEGIN; set_config('request.jwt.claims', ...); set_config('request.headers', '{"active-role-context-id": ...}'); SET LOCAL ROLE authenticated; ...; ROLLBACK;` prin `execute_sql`.

</specifics>

<deferred>
## Deferred Ideas

- `scoala_ioncreanga_*` (~28 RPC anonime in baza portalului, aplicatie separata): discutie separata, nu in aceasta faza.
- Oracolul de enumerare email prin apel direct `signInWithOtp` (cere endpoint server): plan separat.
- Planul 32-08 (SMTP custom spatiul.ro): prerechizit de lansare separat.
- Limitare per IP/captcha la `trimite_cerere_acces`.

</deferred>

---

*Phase: 37-hardening-securitate-db*
*Context gathered: 2026-11-05 via PRD Express Path*
