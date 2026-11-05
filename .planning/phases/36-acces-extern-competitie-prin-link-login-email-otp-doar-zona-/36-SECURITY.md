---
phase: 36
slug: acces-extern-competitie-prin-link-login-email-otp-doar-zona-
status: open_threats
threats_open: 4
threats_total: 60
threats_closed: 50
threats_accepted_documented: 6
last_audit: 2026-11-05 (2)
asvs_level: 1
created: 2026-11-05
---

# Phase 36 — Security

> Contract de securitate al fazei: registrul de amenintari, riscuri acceptate si jurnal de audit.
> Auditor: gsd-security-auditor. Implementarea este read-only; nimic din cod nu a fost modificat.
> Actualizat dupa re-audit (2), commit `f178a5e`: vezi sectiunea "Security Audit 2026-11-05 (2)". Randurile din registru reflecta starea curenta.

**Nota ASVS:** nu s-a primit un bloc `<config>`; `asvs_level: 1` este valoarea implicita a sablonului. Faza expune date de minori (CNP, adresa) si autentificare, deci nivelul 2 ar fi mai potrivit pentru controalele de autorizare (decizie a proprietarului).

**Metoda de verificare:** fiecare mitigare `mitigate` a fost cautata in cod/migrari (citire directa, `grep` cu numar de linie), nu acceptata din SUMMARY/VERIFICARE. Dovezile "live" (rezultate de teste RLS) sunt marcate separat: testele exista in repo, dar NU au fost rulate in acest audit (scriu pe DB-ul live, interzis). Singurele probe live facute au fost 10 cereri read-only cu cheia `anon` (vezi sectiunea "Neverificat").

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Internet anonim -> RPC `get_competitie_publica`, `trimite_cerere_acces`, `lista_cluburi_publice` | Singurele puncte executabile de `anon` (migrari 20261106a:242-245, 20261106d:7-8) | Teaser competitie (fara PII), email+nume+club din cerere, lista (id, nume) a tuturor cluburilor |
| Browser extern -> Supabase Auth (email + OTP) | `signInWithOtp` / `verifyOtp`, fara parola (`services/accesExternService.ts:23-33`) | Email, cod OTP de 8 cifre |
| Sesiune extern autentificata -> PostgREST/RLS | Poarta reala de izolare: politici permisive pe grant + RESTRICTIVE de scope + default-deny (`20261106b`, `20261106c`) | Sportivi/inscrieri/echipe ale clubului din grant (PII minori), taxe |
| Sesiune extern autentificata -> RPC `SECURITY DEFINER` | NEACOPERITA de RLS; garda depinde de corpul fiecarei functii (~170 apelabile de `authenticated`) | Potential: date personale cross-club, mutatii de date |
| Super admin federatie -> `/api/aproba-cerere-acces` (service role) | Autentificare Bearer + rol din DB, apoi scrieri cu service role (`api/aproba-cerere-acces.ts:31-47`) | Creare utilizator auth, rol, grant |
| Portal principal <-> zona externa (acelasi browser) | Cheie `localStorage` comuna `phi-hau-active-role-context-id` (`services/accesExternService.ts:8,57-59`) | Id de rand rol (nu secret) |

---

## Threat Register

*Status: open · closed · accepted-doc (acceptare documentata la nivel de plan; semnatura utilizatorului NU exista inca, vezi Accepted Risks Log)*
*"Rezultat nereprodus" = testul live exista in repo (cu linie), rezultatul vine din rapoartele fazei, nu a fost rulat de auditor.*

| Threat ID | Category | Component | Disposition | Evidence (fisier:linie) | Status |
|-----------|----------|-----------|-------------|-------------------------|--------|
| T-36-01 | Information Disclosure | 36-AUDIT-LIVE.md | mitigate | Regex pe CNP (13 cifre) si emailuri in `36-AUDIT-LIVE.md`: un singur match, `zz-nu-exista-faza36@example.com` (linia 203, email inexistent). Fara nume/CNP de sportivi | closed |
| T-36-02 | Tampering | executia auditului | mitigate | `36-AUDIT-LIVE.md:203`: proba A4 cu email inexistent, `create_user:false`, "nu s-a trimis niciun mail real, nu s-a creat utilizator". Dovada este doar documentara (interogarile executate nu pot fi re-verificate) | closed |
| T-36-03 | Elevation of Privilege | politici fantoma | mitigate | Lista DEC-4/DEC-5 in `36-AUDIT-LIVE.md:216-220`; politicile largi sunt eliminate in `20261106b:15-17, 57-59, 100, 144-148` | closed |
| T-36-04 | Spoofing/Info disclosure | `get_competitie_publica` | mitigate | `20261106a:162-171`: doar denumire/tip/locatie/date/deadline/status/probe, `WHERE status <> 'draft'`; fara token. Live anon (re-probat): UUID inexistent -> `null` (HTTP 200). Test `tests/acces_extern_fundatie_faza36.ts:80-89` | closed |
| T-36-05 | Denial of Service | `trimite_cerere_acces` | mitigate | `20261106e:126` (advisory lock per competitie: count + insert atomice), `:129-133` (plafon 10 per club si 200 global, verificate INAINTE de duplicat), `:112-123` (validari), index unic partial `20261106a:62-63`; recuperare de catre federatie `20261106e:147-162` (`sterge_cereri_in_asteptare`: garda `is_super_admin()`, `REVOKE ... FROM PUBLIC, anon`; live anon re-probat: 42501). Teste (diff f178a5e, `acces_extern_aprobare_faza36.ts`; 36/36 raportat, nereprodus): 12 cereri paralele -> exact 10 ok / 2 `prea_multe_cereri`, DB = 10, alt club inca primeste cereri, anon si ADMIN_CLUB respinsi la purge, federatia sterge 11, dupa purge clubul poate trimite din nou. Cele doua defecte din auditul (1) (cursa count/insert, plafon doar global si netestat) sunt remediate. Reziduu nerezolvat (U-5): fara throttling per IP/captcha, un anonim poate satura plafonul pana la purge manual | closed |
| T-36-06 | Tampering | `acces_competitie_extern` | mitigate | `20261106a:99-107`: politici doar `user_id = auth.uid()` (SELECT) si `is_super_admin()` (ALL); `GRANT SELECT, UPDATE` fara INSERT/DELETE pentru `authenticated`; `REVOKE ALL FROM anon`. `20261106c:94-100` blocheaza INSERT/UPDATE/DELETE pentru "doar extern". Live anon (re-probat): `42501 permission denied` pe tabel. Test `rls_acces_extern_faza36.ts:341-354` (rezultat nereprodus) | closed |
| T-36-07 | Elevation of Privilege | helperi definer | mitigate | `SET search_path = public, pg_catalog` pe toate functiile definer: `20261106a:16,111,119,125,131,137,144,152,157,163,175,210,221` (cea cu `auth` in path e `user_id_dupa_email`), `20261106c:7`, `20261106d:4`. `REVOKE ... FROM PUBLIC, anon` `20261106a:226-231`; `user_id_dupa_email` revocat si de la `authenticated` `:239-240`. Live anon (re-probat): `este_doar_extern` si `user_id_dupa_email` -> `42501`. Test `acces_extern_fundatie_faza36.ts:195` (authenticated respins). Exceptie voita: `get_competitie_publica`, `trimite_cerere_acces`, `lista_cluburi_publice` apelabile de `anon` | closed |
| T-36-08 | Information Disclosure | enumerare conturi prin cerere | accept | `20261106e:139-142` (`unique_violation` inghitit, `RETURN 'ok'` identic pentru cerere noua si existenta); `:129-134` (plafoanele inaintea duplicatului: raspunsul de plin e identic pentru duplicat si email nou); `services/accesExternService.ts:71` (`return 'ok'`), `SolicitaContForm.tsx:44`; grep `deja_trimisa` in `components/ services/ utils/ api/ hooks/ types.ts`: zero. Teste (diff f178a5e): repetata -> `ok` cu un singur rand; duplicat si email nou dau acelasi raspuns cand clubul e plin. Enumerarea prin `signInWithOtp` ramane urmarita la T-36-19/T-36-60 (OPEN) | closed |
| T-36-09 | Information Disclosure | CompetitieDetail mode extern | mitigate | `components/Competitii/index.tsx:64` (set fix de tab-uri), `:103` (tab in afara setului ignorat), `:123` (`doarClubul` filtru club); RLS `20261106c:49,61,81-87` | closed |
| T-36-10 | Elevation of Privilege | tab-uri admin/financiar | mitigate | `Competitii/index.tsx:103,214,266,279,289,295,301,307` (toate sub `!extern`), `:706` (`&& !extern`); `utils/accesExtern.ts:44-61` (`isSuperAdmin/isAdmin/isFederationAdmin:false`). Scriere pe competitii/probe/categorii blocata si in DB: `20261106b:144-202`, `20261106c:94-100`; test `rls_acces_extern_faza36.ts:320-330` (nereprodus) | closed |
| T-36-11 | Tampering | `taxa_achitata` | mitigate | `components/Competitii/PlatiClubExtern.tsx`: zero utilizari `supabase` (verificat). DB: `20261106c:51` (WITH CHECK `taxa_achitata=false`), `:53` (DELETE doar neachitate), `:113-130` (trigger care reseteaza `taxa_achitata` si limiteaza `status` la retras). `plati`/`tranzactii` -> `ext_r_deny_all` (`:133-149`). Teste `rls_acces_extern_faza36.ts:298-315` (nereprodus) | closed |
| T-36-12 | Information Disclosure | cereri inter-club | mitigate | `InscriereClubWizard/Pas3Echipe.tsx:53` (fetch sarit), `:392` (UI ascuns), `Pas4Sumar.tsx:368,411`, `Competitii/index.tsx:517`. Backstop DB: `ext_r_deny_all` pe `cereri_coechipier`/`solicitari_echipe_incomplete` (`20261106c:133-149`; presupune RLS activ, `AUDIT-LIVE.md:154`). Nota: handlerele `Pas3Echipe.tsx:72,115` nu sunt ele insele garduite (doar ascunse din UI); nu exista test de scriere pe aceste tabele | closed |
| T-36-13 | Tampering/Elevation | scriere cross-club | mitigate | RESTRICTIVE `ic_r_scope_*` `20261106b:26-39`, `ec_r_scope_*` `:72-83`, `es_r_scope_*` `:117-132`; permisive curate pe `has_access_to_club` `:22-23,62-69,103-114`. Test `rls_competitii_scriere_faza36.ts:130-143` (nereprodus) | closed |
| T-36-14 | Tampering | inscriere inchisa / categorie straina / sportiv strain | mitigate | `20261106e:20-31` (`ic_r_gate_upd`: USING cere `is_super_admin()` sau competitie deschisa, WITH CHECK in plus categoria; `ic_r_gate_del` nou), `:34-45` (`ec_r_gate_upd/del`), `:48-63` (`es_r_gate_upd/del`, inexistente in auditul (1)), `:68-82` si `:84-101` (triggere `BEFORE UPDATE OF sportiv_id` pe `inscrieri_competitie` si `echipa_sportivi`: `42501` daca sportivul nu apartine clubului; exceptati `is_super_admin()` si `auth.uid() IS NULL`/service role); gate-urile INSERT raman `20261106b:41-47,85-90,134-140`. Inchidere = status sau termen (`competitie_deschisa_inscrieri`, `20261106a:143-149`). Teste (diff f178a5e, `rls_competitii_scriere_faza36.ts`; 42/42 raportat, nereprodus): ADMIN si INSTRUCTOR nu modifica/sterg dupa inchidere sau termen, nici echipe/membri; SUPER_ADMIN poate; ADMIN nu repune inscrierea pe sportiv din alt club; randul legacy inter-club ramane editabil cat e deschisa. Limite: (1) testele post-inchidere folosesc roluri interne, nu un cont extern (gate-ul e RESTRICTIVE generic pe `authenticated`, deci se aplica si extern, dar nu e probat explicit); (2) mutarea `echipa_id` a unui membru nu e verificata de trigger (doar de `es_r_scope_upd`); (3) rolul legacy `ADMIN` nu e exceptat (doar `is_super_admin()`), efect functional | closed |
| T-36-15 | Tampering | scriere competitii/probe/categorii de ADMIN_CLUB | mitigate | `20261106b:150-202`: permisive + RESTRICTIVE `get_active_role() IN ('SUPER_ADMIN_FEDERATIE','ADMIN')`. Test `rls_competitii_scriere_faza36.ts:162-170` (nereprodus) | closed |
| T-36-16 | Information Disclosure | pierdere date reale la teste | mitigate | Cleanup + verificare reziduuri: `rls_competitii_scriere_faza36.ts:204`, `rls_acces_extern_faza36.ts:394`, `acces_extern_aprobare_faza36.ts:262`, `acces_extern_fundatie_faza36.ts:221`. Output doar PASS/FAIL + detalii (id/numarator), fara `console.log` de nume/email | closed |
| T-36-17 | Denial of Service | performanta RLS | mitigate | `(select public.este_doar_extern())` `20261106c:35-36,144`; helperi `STABLE` `20261106a:110-159`. Performanta nu a fost masurata (nicio proba in teste) | closed |
| T-36-18 | Spoofing | login OTP | mitigate | `services/accesExternService.ts:23-26` (`signInWithOtp`, `shouldCreateUser:false`), `:33` (`verifyOtp type:'email'`); fara parola. Continutul emailului (cod fara link) si dezactivarea signup-urilor la nivel de proiect Auth NU se pot verifica din repo (vezi Neverificat) | closed |
| T-36-19 | Information Disclosure | enumerare prin eroarea `signInWithOtp` | accept | **OPEN (reziduu; decizie caller: nu se accepta).** Redus in UI: `LoginOtp.tsx:33-34` trateaza `fara_cont` identic cu `ok` (trece la pasul de cod), `:72` mesaj neutru, `onFaraCont` eliminat (`CompetitieExterna/index.tsx`, diff f178a5e); linkul "Nu ai cont? Solicita acces" ramane mereu vizibil (`LoginOtp.tsx:89`, satisface D-05 fara oracol). Ramane oracolul la apel direct catre GoTrue: re-probat (email inexistent, `create_user:false`, fara mail trimis si fara cont creat): HTTP 422 `otp_disabled` ("Signups not allowed for otp"); un email existent primeste 200 (jumatatea aceasta NU a fost probata, ar trimite email). Nu se poate inchide din client; ar cere un endpoint server cu raspuns uniform sau un hook Auth | open |
| T-36-20 | Tampering | extragere id din URL | mitigate | `utils/accesExtern.ts:4,7-11` (doar UUID complet, altfel `null`); `components/CompetitieExterna/index.tsx:62-63` -> `link_invalid`. `utils/accesExtern.test.ts` (22 aserti; ALL PASSED conform `36-VERIFICATION.md`, nereprodus) | closed |
| T-36-21 | Elevation of Privilege | eligibilitate in client | mitigate | `utils/accesExtern.ts:28-41` doar alege contextul; poarta reala e RLS pe grant: `20261106a:118-141` (`auth.uid()`, nu header), `20261106c:44-90`. Test spoof header `rls_acces_extern_faza36.ts:223` (nereprodus) | closed |
| T-36-22 | Denial of Service | spam de coduri | mitigate | In cod: `LoginOtp.tsx:12,34,83` (cooldown 60 s, doar cosmetic/client). Limita reala e a GoTrue/SMTP, neverificabila din repo; prerechizitul 32-08 (SMTP custom) este NEEXECUTAT, documentat in `36-VERIFICARE.md:63-65`. Reziduu tinut la T-36-58 | closed |
| T-36-23 | Elevation of Privilege | auto-aprobare / non-federatie | mitigate | `api/aproba-cerere-acces.ts:32-38` (`autentificaApelant` + `esteFederatie`) INAINTE de validare (`:40`) si de orice scriere (`:45`); `_aprobaCerereAcces.ts:42-44` esueaza inchis; cererile: SELECT/UPDATE doar `is_super_admin()` (`20261106a:68-76`). Rolul vine din DB, nu din token/header (`_autentificareApelant.ts:32-47`). Test contract `acces_extern_aprobare_faza36.ts:150-160` (nereprodus) | closed |
| T-36-24 | Tampering | body cerere | mitigate | `_aprobaCerereAcces.ts:21-39` (UUID, enum, motiv <= 300); `aproba-cerere-acces.ts:47` (`callerId` doar din token) | closed |
| T-36-25 | Denial of Service | endpoint | mitigate | `aproba-cerere-acces.ts:13` (30/min/IP, in-memory, `api/_rateLimit.ts:11,48-53`; se reseteaza la cold start, acceptat in plan si listat in `36-VERIFICARE.md:78`) | closed |
| T-36-26 | Elevation of Privilege | rol creat din greseala | mitigate | `_aprobaCerereAcces.ts:11` (constanta), `:133` (lookup dupa constanta), `:148-156` (INSERT cu `ROL_EXTERN`, nimic din body) | closed |
| T-36-27 | Information Disclosure | email in loguri | mitigate | Zero `console.*` in `aproba-cerere-acces.ts` si `_aprobaCerereAcces.ts` (grep); erori generice `_aprobaCerereAcces.ts:55-59` | closed |
| T-36-28 | Denial of Service | cont orfan dupa esec | mitigate | `_aprobaCerereAcces.ts:96-113` (rollback), apelat la `:135,141,157,165,171,177,182,189`. Reziduu minor: cand un grant dezactivat e reactivat (`:167-171`) si un pas ulterior esueaza, starea `activ` anterioara nu se restaureaza | closed |
| T-36-29 | Information Disclosure | portal incarcat cu cont extern | mitigate | `App.tsx:137-139` (`AccesLimitatPage`), `hooks/useDataProvider.ts:482-484` (sare `fetchAppData`) | closed |
| T-36-30 | Elevation of Privilege | rol extern atribuibil din UI | mitigate | `useDataProvider.ts:443` (filtrat din `allRoles`), `components/UserManagement.tsx:292` (greutate 0). Nuanta: `api/_permisiuniCont.ts:11-17` NU contine `REPREZENTANT_COMPETITIE`, deci `:86` (`undefined > gClub`) da `false` si anti-escaladarea NU il blocheaza; nu e escaladare (fara grant nu exista acces, grantul scrie doar service role: `20261106a:99-107`) | closed |
| T-36-31 | Spoofing | context activ comun cu portalul | accept | Efectul exista in cod: `accesExternService.ts:8,57-59,86`, `CompetitieExterna/index.tsx:18,85`, `hooks/useUserRoles.ts:113`. Documentat: `36-VERIFICARE.md:74`. Impact: confuzie de context, nu escaladare (rolul e validat de RLS pe `user_id = auth.uid()`) | accepted-doc |
| T-36-32 | Information Disclosure | PII minori din alte cluburi | mitigate | Permisive pe grant `20261106c:49,61`; RESTRICTIVE `:81-90`. Live anon (re-probat): `inscrieri_competitie`/`competitii`/`cluburi` -> `[]`, `sportivi` -> `42501`. Preexistent `inscrieri_select auth.uid() IS NOT NULL` (`AUDIT-LIVE.md:25`) este neutralizat pentru extern de `:84`. Teste `rls_acces_extern_faza36.ts:185-210` (nereprodus) | closed |
| T-36-33 | Information Disclosure | tabele neprevazute | mitigate | `20261106c:133-149` (`ext_r_deny_all` RESTRICTIVE FOR ALL pe orice tabel public cu RLS activ la momentul migrarii). Sweep 229 relatii: `rls_acces_extern_faza36.ts:268` (rezultat LEAK=0 nereprodus). Limita: acoperire statica, vezi U-1 | closed |
| T-36-34 | Tampering | extern marcheaza taxa achitata / schimba status | mitigate | `20261106c:51,53,113-130`; teste `rls_acces_extern_faza36.ts:298-315` (nereprodus). Nota: verificarea de la INSERT sta intr-o politica PERMISIVA (OR-abila de o eventuala politica fantoma), neacoperita de proba | closed |
| T-36-35 | Elevation of Privilege | auto-atribuire rol/grant | mitigate | RESTRICTIVE ins/upd/del cu `NOT este_doar_extern()` pe `utilizator_roluri_multicont`, `roluri`, `acces_competitie_extern`: `20261106c:94-100`. Teste `rls_acces_extern_faza36.ts:341-354` (nereprodus). Reziduu: calea prin RPC definer (vezi T-36-37) | closed |
| T-36-36 | Elevation of Privilege | politica permisiva fantoma `USING(true)` | mitigate | Politicile critice sunt RESTRICTIVE: `20261106c:81-90,94-100,144`; `20261106b:26-54,72-96` | closed |
| T-36-37 | Information Disclosure | view-uri definer / RPC definer fara garda / storage.objects | accept(conditionat) | **OPEN (decizie caller: RPC SECURITY DEFINER ~170 si view-uri; nu se accepta).** (a) RPC: neschimbat dupa f178a5e; nicio garda `NOT este_doar_extern()` si niciun `REVOKE EXECUTE` pe functiile riscante (grep `supabase/` si `sql/`: `este_doar_extern` doar in `20261106a/c`; `20261106e/f` nu adauga garzi); `AUDIT-LIVE.md:170-179` le clasifica CRITIC/RIDICAT; neapelate in teste. Functiile noi sunt corecte: `sterge_cereri_in_asteptare` (garda `is_super_admin()`, anon respins) si `get_familie_id_sportiv_curent` (anon -> 42501, re-probat). (b) View-uri: regresia W4 pe prezenta e tratata in cod prin `prezenta_familie_sel` (`20261106e:10-16`, PERMISIVA, doar randurile sportivilor cu acelasi `familie_id` ca randul `sportivi` al utilizatorului; `get_familie_id_sportiv_curent` `20261106f:6-16`: definer, `search_path public`, `ORDER BY` determinist). Nu largeste accesul extern: `ext_r_deny_all` ramane RESTRICTIVA pe tabel si un extern nu are rand `sportivi` (functia intoarce NULL). Verificata doar prin simulare SQL raportata (22 frati / 0 straini, `261105-gax-SUMMARY.md`), fara test automat si fara browser. Ramane OPEN: `vedere_istoric_grade_sportiv` (citit de `hooks/useDataProvider.ts:390,409,411` pentru toate rolurile) netratat si fara verificare; contradictia de inventar (`AUDIT-LIVE.md:154` vs `36-VERIFICARE.md:73`) nerezolvata. (c) Storage: neschimbat (`20261106c:152-160` inghite `insufficient_privilege`). Decizia utilizatorului nu exista | open |
| T-36-38 | Denial of Service | cost RLS | mitigate | Idem T-36-17: `20261106c:35-36,144`, `20261106a:110-159` | closed |
| T-36-39 | Spoofing | utilizator mixt | accept | Documentat `36-VERIFICARE.md:76`; testat `rls_acces_extern_faza36.ts:374` (nereprodus); `este_doar_extern()` `20261106a:110-116` | accepted-doc |
| T-36-40 | Information Disclosure | card public pre-auth | mitigate | `20261106a:162-171`; `CompetitieExterna/index.tsx:98` (mesaj identic pentru inexistent/draft: `:19`). Teste `acces_extern_fundatie_faza36.ts:80-89` | closed |
| T-36-41 | Information Disclosure | PII minori in clientul extern | mitigate | **OPEN (decizie caller: coloane `sportivi`; verifier W3).** In client: `ExternDataProvider.tsx:35` cere doar coloane minime, `.eq('club_id')` `:36`. Dar controlul e doar in client: politica `ext_p_sportivi_sel` (`20261106c:61`) permite TOATE coloanele (`cnp`, `adresa`, `telefon`, `email`) pentru clubul din grant, iar nu exista column grants / view limitat (grep `GRANT SELECT (` / `REVOKE SELECT` in `supabase/` si `sql/`: zero). Un cont extern poate cere orice coloana direct prin PostgREST. Date de minori (GDPR) Neschimbat dupa f178a5e: `20261106e/f` nu adauga column grants sau view limitat; `ext_p_sportivi_sel` ramane `20261106c:61` | open |
| T-36-42 | Elevation of Privilege | manipulare UI/URL spre alt club/competitie | mitigate | Poarta e RLS: `20261106c:44-90`; teste `rls_acces_extern_faza36.ts:185-188,223` (nereprodus) | closed |
| T-36-43 | Information Disclosure | scurgere date portal prin DataProvider | mitigate | `index.tsx:43-58` (ramura `/competitie/` fara `DataProvider`/`NavigationProvider`/`ThemeProvider`/`App`); `ExternDataProvider.tsx:78-86` (campuri sintetice) | closed |
| T-36-44 | Tampering | context activ gresit | mitigate | `CompetitieExterna/index.tsx:69` (`seteazaContextActiv` inainte de citire), `:212` (`key={ctx.roleRowId}`) | closed |
| T-36-45 | Denial of Service | bucla getSession/onAuthStateChange | accept | `CompetitieExterna/index.tsx:91-107` (cleanup, dezabonare, `anulat`). Verificarea Playwright citata in plan: spec 5/6 in `36-VERIFICARE.md`, 6/6 in commit `4a58fa9`, nereprodus | accepted-doc |
| T-36-46 | Elevation of Privilege | tab vizibil non-federatiei | mitigate | `Competitii/index.tsx:301-307` (`!extern && isSuperAdmin`), `:706`; RLS `20261106a:68-76,99-104`; endpoint 403 `aproba-cerere-acces.ts:36-38` | closed |
| T-36-47 | Tampering | XSS prin cereri anonime | mitigate | Grep `dangerouslySetInnerHTML`/`innerHTML` in `CereriAccesAdmin.tsx`, `CompetitieExterna/*`, `PlatiClubExtern.tsx`: zero; randare ca text `CereriAccesAdmin.tsx:175-183` | closed |
| T-36-48 | Repudiation | cine a aprobat/revocat | mitigate | Aprobare/respingere: `_aprobaCerereAcces.ts:81` (`procesat_de`), `:169,175` (`creat_de`). Revocarea: `CereriAccesAdmin.tsx:136` seteaza `activ=false` (rand pastrat). Reziduu (U-3): revocarea NU inregistreaza actorul (`20261106a:79-91` nu are `revocat_de/revocat_la`) | closed |
| T-36-49 | Information Disclosure | link competitie circula public | accept | `CereriAccesAdmin.tsx:160-162` spune explicit ca linkul nu da acces; decizia produsului: `36-CONTEXT.md` D-02/D-03 | accepted-doc |
| T-36-50 | Denial of Service | spam cereri in coada | accept | Mitigarile declarate sunt acum implementate si verificate in cod: plafon 10/club + 200 global sub advisory lock (`20261106e:126,129-133`), index unic partial (`20261106a:62-63`), tratare in bloc de catre federatie prin `sterge_cereri_in_asteptare` (`20261106e:147-162`; apel din `CereriAccesAdmin.tsx:137`). Reziduu acceptat de plan, nu de auditor: anonimii pot satura plafonul (vezi T-36-05, U-5), recuperare manuala. Acceptare nesemnata, vezi AR-07 | accepted-doc |
| T-36-51 | Information Disclosure | tabele/view-uri neprevazute | mitigate | Sweep pe 229 relatii in `rls_acces_extern_faza36.ts:268` (rezultat ALLOW=30/OK=199/LEAK=0 din `36-11-SUMMARY.md:14`, nereprodus). Verificare statica: `20261106c:133-149` | closed |
| T-36-52 | Information Disclosure | PII in output test | mitigate | Output-ul testelor: `rls_acces_extern_faza36.ts:33,35`, `acces_extern_aprobare_faza36.ts:32` (doar nume de verificare + detalii id/numarator) | closed |
| T-36-53 | Tampering | teste polueaza date reale | mitigate | Prefix `ZZ_TEST_FAZA36_*`, cleanup in `finally`, reziduuri verificate: `rls_acces_extern_faza36.ts:394` (`plati`/`vize_sportivi`), `rls_competitii_scriere_faza36.ts:204` | closed |
| T-36-54 | Elevation of Privilege | header falsificat | mitigate | Test dedicat `rls_acces_extern_faza36.ts:223` (nereprodus); structural: `has_access_to_club`/`is_super_admin` valideaza `user_id = auth.uid()` (`AUDIT-LIVE.md:131-133`), politicile extern nu depind de header (`20261106a:118-141`) | closed |
| T-36-55 | Repudiation | scurgere nedetectata (test relaxat) | mitigate | Aserturile din testele extern sunt stricte (`!ok(r)` etc., `rls_acces_extern_faza36.ts:283-362`); `36-11-SUMMARY.md:13` declara zero relaxari; singura schimbare (36-12) vizeaza un rol intern ADMIN_CLUB si e documentata: `36-12-SUMMARY.md:20`, `acces_extern_aprobare_faza36.ts:234` | closed |
| T-36-56 | Tampering | reziduuri de test | mitigate | `acces_extern_aprobare_faza36.ts:262`, `acces_extern_fundatie_faza36.ts:221`, `rls_acces_extern_faza36.ts:394` | closed |
| T-36-57 | Information Disclosure | PII in screenshot | mitigate | Screenshot `screens/36-12-extern-mobil.png` inspectat vizual: fara nume de sportivi (0 inscrieri afisate); apar numele real al clubului si un email de test `@example.test` | closed |
| T-36-58 | Denial of Service | lansare fara SMTP custom | accept (documentat) | Prerechizit documentat explicit: `36-VERIFICARE.md:63-65` (plan 32-08 neexecutat). Documentul insusi concluzioneaza "NU este gata de lansare publica" (`:7`) | accepted-doc |
| T-36-59 | Elevation of Privilege | endpoint de aprobare fara garda | mitigate | Ordinea garzilor `aproba-cerere-acces.ts:9,13,32-38`; test de contract `acces_extern_aprobare_faza36.ts:150-160,179` (401/403/400/405/409; rezultat nereprodus, handler importat direct, nu prin Vercel) | closed |
| T-36-60 | Spoofing | enumerare emailuri prin `signInWithOtp` | accept | **OPEN (reziduu; decizie caller: nu se accepta).** Acelasi oracol ca T-36-19: UI neutru (`LoginOtp.tsx:33-34,72`), oracol ramas la `POST /auth/v1/otp` direct (422 `otp_disabled` vs 200). Documentat ca D-05/`36-VERIFICARE.md:75`, fara semnatura utilizatorului | open |

**Totaluri (dupa re-audit 2):** 60 amenintari = 50 closed + 6 accepted-doc + 4 open.
**OPEN (blocante):** T-36-19, T-36-37, T-36-41, T-36-60.
*Auditul (1) avea 8 open: T-36-05, T-36-08, T-36-14 s-au inchis, T-36-50 a trecut la accepted-doc (AR-07, nesemnat).*

---

## Riscuri din 36-VERIFICARE.md (d) si 36-VERIFICATION.md (W1-W5), mapate pe registru

| Ref | Risc | Mapare | Status |
|-----|------|--------|--------|
| (d)1 / W2 / R-01 | ~170 RPC `SECURITY DEFINER` apelabile de orice `authenticated`, inclusiv extern | T-36-37 | open |
| (d)2 / W3 / R-02 | `sportivi` SELECT pe toate coloanele pentru clubul din grant | T-36-41 | open |
| (d)3 / R-03 | `storage.objects`: politica `ext_r_storage_deny` creata doar conform raportului; restul politicilor de storage neauditat | T-36-37 (c) | open (neverificat) |
| (d)4 / R-04 | `cluburi_public_select` expune `cif`, `setari` oricarui `authenticated` | neinregistrat (WARNING) | open, risc scazut (`AUDIT-LIVE.md:162`) |
| (d)5 / W4 / R-05 | `vedere_prezenta_sportiv` / `vedere_istoric_grade_sportiv` pe `security_invoker` (`20261106c:163-164`). Prezenta: regresia pentru parintele SPORTIV tratata cu `prezenta_familie_sel` (`20261106e:10-16`) + `get_familie_id_sportiv_curent` in repo (`20261106f:6-16`); verificata doar prin simulare SQL raportata, fara test automat si fara browser. Istoric grade: netratat, citit de `hooks/useDataProvider.ts:390,409,411` pentru toate rolurile, neverificat. Contradictia de inventar view-uri nerezolvata (`AUDIT-LIVE.md:154` vs `36-VERIFICARE.md:73`) | T-36-37 (b) | open (prezenta: mitigat in cod, neverificat in browser; istoric grade: neverificat) |
| (d)6 | cheie `localStorage` comuna | T-36-31 | accepted-doc |
| (d)7 | enumerare email prin `otp_disabled` | T-36-19, T-36-60 (open: oracol rezidual la apel direct GoTrue); T-36-08 (closed) | open |
| (d)8 | INSTRUCTOR extern nu poate edita arme CVD | informativ: `Competitii/index.tsx:198` (UI), nu este amenintare de securitate | info |
| (d)9 | cont mixt vede reuniunea | T-36-39 | accepted-doc |
| (d)10 | rate limit in-memory | T-36-25 | closed |
| (d)11 | SELECT intern larg pe `inscrieri_competitie` | decizie utilizator `36-CONTEXT.md` D-16 (linia 43) | accepted (vezi log) |
| (d)12 | lista publica de cluburi: `lista_cluburi_publice` da (id, nume) ale TUTORA oricarui anonim (`20261106d:2-8`; live anon re-probat: HTTP 200, 36 randuri) | neinregistrat (WARNING); `36-VERIFICARE.md:46,84` cere "decizie de acceptat" | open, decizie pendinte |
| W1 | gate status/deadline/sportiv doar la INSERT | T-36-14 (tratat de `20261106e:20-101`) | closed |
| W5 | documente de stare nealiniate (`36-VERIFICARE.md` inca spune "lista cluburi goala"; defectul e rezolvat live) | nu e risc de securitate | info |

---

## Unregistered Flags (WARNING, nu blocheaza)

Threat Flags din SUMMARY-urile 36-05, 36-06, 36-09, 36-10 sunt "None"/mapate pe amenintari existente (36-09 mentioneaza `tipuri_competitie` citit ca anon inainte de login: cade pe etichete hardcodate, fara impact). Suprafata noua gasita de auditor, fara mapare in plan:

| ID | Constatare | Evidenta | Severitate |
|----|-----------|----------|------------|
| U-1 | Default-deny extern este static: `ext_r_deny_all` se aplica doar tabelelor cu RLS existente la rularea migrarii. Orice tabel creat ulterior nu primeste politica; politicile generice permisive de tip `auth.uid() IS NOT NULL` ar deveni citibile de contul extern. Nu exista event trigger, test CI sau regula in plan care sa previna asta | `20261106c:133-149` | Medie |
| U-3 | Revocarea accesului extern nu inregistreaza cine a revocat (doar `activ=false`, fara `revocat_de/revocat_la`) | `CereriAccesAdmin.tsx:136`, `20261106a:79-91` | Scazuta |
| U-4 | `REPREZENTANT_COMPETITIE` lipseste din `ROLE_WEIGHTS`; `creare-cont` nu il respinge explicit (`undefined > gClub` = `false`), contrar formularii din plan ("greutate 0") | `api/_permisiuniCont.ts:11-17,86` | Scazuta (fara grant nu da acces) |
| U-5 | Cererile de acces pot fi saturate de un anonim (10 cereri blocheaza un club, aproximativ 20 de cluburi x 10 blocheaza competitia) fara throttling per IP/captcha; recuperarea e manuala (`sterge_cereri_in_asteptare` sterge si cererile legitime, fara jurnal de actor). Un duplicat e inghitit tacut (`RETURN 'ok'`): cine depune primul o cerere pentru un email ii ocupa locul, iar federatia vede numele/clubul declarate de acel anonim; nu exista dovada de proprietate a emailului la cerere, deci singurul control ramane verificarea umana la aprobare | `20261106e:126-142,147-162`, `20261106a:62-63` | Scazuta-medie |
| R-04/(d)12 | Expunere `cif`/`setari` (authenticated) si lista de cluburi (anon) | `20261106d`, `AUDIT-LIVE.md:162` | Scazuta |

---

## Accepted Risks Log

Nicio acceptare nu poarta semnatura utilizatorului in acest audit. Intrarile de mai jos sunt acceptari DOCUMENTATE in plan, verificate ca prezente; raman necerificate de utilizator pana la bifarea Sign-Off. NU sunt in acest log riscurile ramase OPEN: RPC definer, coloane `sportivi`, enumerare email (T-36-19/T-36-60) si view-uri/storage din T-36-37. Plafonul de cereri (T-36-50) apare ca AR-07 doar fiindca acceptarea apartine planului, nu auditorului.

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-36-31 | Cheie `localStorage` comuna intre zona externa si portal; efect: schimbare de context, fara escaladare | Plan 36-07 (planificator); utilizator: nesemnat | 2026-11-05 |
| AR-02 | T-36-39 | Cont mixt (rol intern + grant) pastreaza drepturile interne si primeste in plus grantul; nicio escaladare noua | Plan 36-08 (planificator); utilizator: nesemnat | 2026-11-05 |
| AR-03 | T-36-45 | Efect idempotent cu dezabonare; verificare Playwright citata | Plan 36-09 (planificator); utilizator: nesemnat | 2026-11-05 |
| AR-04 | T-36-49 | Linkul competitiei nu confera acces; intra doar conturi eligibile | Decizie de produs D-02/D-03 (`36-CONTEXT.md:21-22`); utilizator: decizie de design | 2026-11-05 |
| AR-05 | T-36-58 | Lansare fara SMTP custom: OTP real nu functioneaza la volum; prerechizit documentat | Plan 36-12 (planificator); utilizator: nesemnat. Atentie: documentul insusi spune ca faza nu e gata de lansare publica | 2026-11-05 |
| AR-06 | (d)11 | `inscrieri_competitie` ramane vizibil intre cluburi pentru rolurile interne | Utilizator, decizie D-16 (`36-CONTEXT.md:43`) | 2026-11-05 |
| AR-07 | T-36-50 | Saturarea cozii de cereri de catre anonimi: plafon 10/club + 200 global (atomic), recuperare prin `sterge_cereri_in_asteptare`; fara throttling per IP | Plan 36-10 (planificator), mitigari implementate in follow-up `f178a5e`; utilizator: nesemnat | 2026-11-05 |

---

## Neverificat in acest audit

- **Starea live `pg_policies` / `pg_proc` / `pg_class`:** nu exista acces; existenta politicilor din `20261106b/c` este dedusa din migrari (urmarite in git), din testele din repo si din probele `anon` de mai jos, nu citita direct.
- **Rezultatele testelor live** (57/57 RLS, 27/27 scriere, 36/36 fundatie, 28/28 aprobare, sweep 229 relatii/0 LEAK): NU rulate (scriu pe DB-ul live, interzis). Nu am rulat nici `tsc`, nici testele unitare.
- **Probe read-only `anon` facute de auditor (HTTP):** `rpc/lista_cluburi_publice` 200 cu 36 randuri; `rpc/este_doar_extern` si `rpc/user_id_dupa_email` -> 42501; `rpc/get_competitie_publica(uuid inexistent)` -> `null`; `cluburi`, `inscrieri_competitie`, `competitii` -> `[]`; `sportivi`, `cereri_acces_competitie`, `acces_competitie_extern` -> 42501.
- **Configuratia Supabase Auth (Dashboard):** continutul emailului OTP (doar cod, fara link), dezactivarea signup-urilor la nivel de proiect (`shouldCreateUser:false` e o optiune de client), limitele reale de rate pentru OTP/SMTP.
- **Corpurile celor ~170 functii RPC `SECURITY DEFINER`:** neauditate; neapelate (pot muta date).
- **Endpointul prin Vercel** (variabile de mediu, `x-forwarded-for` real, cold start): testat doar ca handler importat direct.
- **Crearea efectiva a politicii `ext_r_storage_deny`** (migrarea tolereaza lipsa privilegiului) si politicile existente de pe `storage.objects`.
- **Wizardul de inscriere cu cont extern in browser, telefon real, email OTP real, consumatorii interni ai view-urilor `security_invoker`:** netestate.
- **Code review separat pe diff:** nefacut.
- **Re-audit (2), stare live:** migrarile `20261106e/f` sunt aplicate live conform coordonatorului si `261105-gax-SUMMARY.md`, dar corpul live al `trimite_cerere_acces`, politicile `ic/ec/es_r_gate_*`, `prezenta_familie_sel` si triggerele noi NU au fost citite din `pg_proc`/`pg_policies`. Probele live confirma doar ca `sterge_cereri_in_asteptare` si `get_familie_id_sportiv_curent` exista si resping `anon` (42501) si ca `trimite_cerere_acces` valideaza (anon, email invalid -> `date_invalide`).
- **Teste extinse** (42/42, 57/57, 36/36, 36/36, Playwright 6/6 raportate): nerulate de auditor. Playwright a rulat INAINTE de fixurile UI pentru 0 randuri; login-ul neutru, butonul de curatare si mesajele 0-randuri nu au fost testate in browser (`261105-gax-SUMMARY.md`).
- **`prezenta_familie_sel`:** fara test automat; nu s-a verificat live daca un SPORTIV isi poate seta singur `familie_id` (ar citi prezentele altei familii; politica `sportivi_update` din repo cere roluri de staff, dar repo != live, cu istoric de politici fantoma).
- **Oracolul OTP pentru un email EXISTENT** (200): neprobat, ar trimite email real.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-05 (1) | 60 | 47 (+5 accepted-doc, nesemnate) | 8 | gsd-security-auditor (Claude), reluat de la inceput la cererea coordonatorului |
| 2026-11-05 (2) | 60 | 50 (+6 accepted-doc, nesemnate) | 4 | gsd-security-auditor (Claude), re-audit dupa `f178a5e`, doar amenintarile OPEN |

### Security Audit 2026-11-05 (2)

Re-audit dupa commit `f178a5e` (migrari `20261106e`, `20261106f`, UI, teste extinse). Scop: doar amenintarile OPEN din auditul (1). Cod needitat, fara teste pe DB live, fara commit/push.

| Metrica | Audit (1) | Audit (2) |
|---------|-----------|-----------|
| Amenintari totale | 60 | 60 |
| Closed | 47 | 50 |
| Accepted-doc (nesemnate) | 5 | 6 |
| Open | 8 | 4 |
| Amenintari re-verificate | 60 | 8 |
| Inchise in acest audit | - | 3 (T-36-05, T-36-08, T-36-14) |
| Mutate open -> accepted-doc | - | 1 (T-36-50, AR-07) |
| Raman open | - | 4 (T-36-19, T-36-37, T-36-41, T-36-60) |
| Avertismente noi | - | 1 (U-5) |
| Probe live read-only (anon) | 10 | 5 |

| Threat | Inainte | Acum | Motiv scurt |
|--------|---------|------|-------------|
| T-36-14 | open | closed | gate de inchidere la UPDATE/DELETE pe 3 tabele + triggere sportiv-in-club (`20261106e:20-101`); testat cu roluri interne, nu extern |
| T-36-05 | open | closed | advisory lock, plafon 10/club + 200, purge federatie, test paralel 12 -> 10/2; reziduu U-5 |
| T-36-50 | open | accepted-doc | mitigari implementate; reziduu (saturare) acceptat de plan, nesemnat (AR-07) |
| T-36-08 | open | closed | duplicatul intoarce `ok` (`20261106e:139-142`), zero `deja_trimisa` ramas |
| T-36-19 | open | open | UI neutru, dar oracol direct GoTrue (422 `otp_disabled`) re-probat |
| T-36-60 | open | open | acelasi oracol |
| T-36-37 | open | open | RPC definer neatinse; prezenta tratata in cod (`prezenta_familie_sel`), `vedere_istoric_grade_sportiv` si storage neverificate |
| T-36-41 | open | open | coloanele `sportivi` neschimbate |

Probe read-only facute in acest audit (cheia `anon`): `rpc/sterge_cereri_in_asteptare` -> 42501 (permission denied); `rpc/trimite_cerere_acces` cu email invalid -> 400 `date_invalide` (inainte de orice scriere); `rpc/get_familie_id_sportiv_curent` -> 42501; `prezenta_antrenament` -> `[]`; `POST /auth/v1/otp` cu email inexistent si `create_user:false` -> 422 `otp_disabled` (fara mail, fara cont creat).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [ ] Accepted risks documented in Accepted Risks Log (documentate, dar nesemnate de utilizator: AR-01..AR-05, AR-07)
- [ ] `threats_open: 0` confirmed (acum 4)
- [ ] `status: verified` set in frontmatter

**Approval:** pending. Blocante pentru lansare: T-36-37 (RPC definer + `vedere_istoric_grade_sportiv` + storage), T-36-41 (coloane `sportivi`), T-36-19/T-36-60 (oracol de enumerare la apel direct GoTrue). Prerechizit extern: planul 32-08 (SMTP custom).
