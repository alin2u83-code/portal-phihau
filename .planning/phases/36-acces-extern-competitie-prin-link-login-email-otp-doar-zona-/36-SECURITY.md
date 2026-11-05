---
phase: 36
slug: acces-extern-competitie-prin-link-login-email-otp-doar-zona-
status: open_threats
threats_open: 8
threats_total: 60
threats_closed: 47
threats_accepted_documented: 5
asvs_level: 1
created: 2026-11-05
---

# Phase 36 — Security

> Contract de securitate al fazei: registrul de amenintari, riscuri acceptate si jurnal de audit.
> Auditor: gsd-security-auditor. Implementarea este read-only; nimic din cod nu a fost modificat.

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
| T-36-05 | Denial of Service | `trimite_cerere_acces` | mitigate | **OPEN (decizie caller: plafon cereri).** Prezente: index unic partial `20261106a:62-63`, plafon 200 `:193-196`, validari lungime/format `:181-185`. Lipsesc: nicio limitare per IP/captcha pe RPC-ul anon; plafonul PER COMPETITIE permite oricarui anonim sa ocupe cele 200 de locuri cu emailuri diferite si sa blocheze cererile legitime (`prea_multe_cereri`); `count(*)` apoi `INSERT` nu e atomic (depasire usoara posibila). Plafonul nu are nicio verificare in teste (`record(` pentru `prea_multe_cereri` absent in `tests/*faza36*`) | open |
| T-36-06 | Tampering | `acces_competitie_extern` | mitigate | `20261106a:99-107`: politici doar `user_id = auth.uid()` (SELECT) si `is_super_admin()` (ALL); `GRANT SELECT, UPDATE` fara INSERT/DELETE pentru `authenticated`; `REVOKE ALL FROM anon`. `20261106c:94-100` blocheaza INSERT/UPDATE/DELETE pentru "doar extern". Live anon (re-probat): `42501 permission denied` pe tabel. Test `rls_acces_extern_faza36.ts:341-354` (rezultat nereprodus) | closed |
| T-36-07 | Elevation of Privilege | helperi definer | mitigate | `SET search_path = public, pg_catalog` pe toate functiile definer: `20261106a:16,111,119,125,131,137,144,152,157,163,175,210,221` (cea cu `auth` in path e `user_id_dupa_email`), `20261106c:7`, `20261106d:4`. `REVOKE ... FROM PUBLIC, anon` `20261106a:226-231`; `user_id_dupa_email` revocat si de la `authenticated` `:239-240`. Live anon (re-probat): `este_doar_extern` si `user_id_dupa_email` -> `42501`. Test `acces_extern_fundatie_faza36.ts:195` (authenticated respins). Exceptie voita: `get_competitie_publica`, `trimite_cerere_acces`, `lista_cluburi_publice` apelabile de `anon` | closed |
| T-36-08 | Information Disclosure | enumerare conturi prin cerere | accept | **OPEN (decizie caller: enumerare email, nu se accepta).** Partea RPC e verificata: `20261106a:198-204` nu spune daca emailul are cont. Reziduu: (a) enumerarea prin `signInWithOtp` (vezi T-36-19/T-36-60); (b) RPC-ul intoarce `'ok'` vs `'deja_trimisa'` (`:202,204`), deci un anonim poate afla daca exista o cerere in asteptare pentru un (email, competitie); UI-ul le uniformizeaza (`SolicitaContForm.tsx:44`) dar PostgREST nu | open |
| T-36-09 | Information Disclosure | CompetitieDetail mode extern | mitigate | `components/Competitii/index.tsx:64` (set fix de tab-uri), `:103` (tab in afara setului ignorat), `:123` (`doarClubul` filtru club); RLS `20261106c:49,61,81-87` | closed |
| T-36-10 | Elevation of Privilege | tab-uri admin/financiar | mitigate | `Competitii/index.tsx:103,214,266,279,289,295,301,307` (toate sub `!extern`), `:706` (`&& !extern`); `utils/accesExtern.ts:44-61` (`isSuperAdmin/isAdmin/isFederationAdmin:false`). Scriere pe competitii/probe/categorii blocata si in DB: `20261106b:144-202`, `20261106c:94-100`; test `rls_acces_extern_faza36.ts:320-330` (nereprodus) | closed |
| T-36-11 | Tampering | `taxa_achitata` | mitigate | `components/Competitii/PlatiClubExtern.tsx`: zero utilizari `supabase` (verificat). DB: `20261106c:51` (WITH CHECK `taxa_achitata=false`), `:53` (DELETE doar neachitate), `:113-130` (trigger care reseteaza `taxa_achitata` si limiteaza `status` la retras). `plati`/`tranzactii` -> `ext_r_deny_all` (`:133-149`). Teste `rls_acces_extern_faza36.ts:298-315` (nereprodus) | closed |
| T-36-12 | Information Disclosure | cereri inter-club | mitigate | `InscriereClubWizard/Pas3Echipe.tsx:53` (fetch sarit), `:392` (UI ascuns), `Pas4Sumar.tsx:368,411`, `Competitii/index.tsx:517`. Backstop DB: `ext_r_deny_all` pe `cereri_coechipier`/`solicitari_echipe_incomplete` (`20261106c:133-149`; presupune RLS activ, `AUDIT-LIVE.md:154`). Nota: handlerele `Pas3Echipe.tsx:72,115` nu sunt ele insele garduite (doar ascunse din UI); nu exista test de scriere pe aceste tabele | closed |
| T-36-13 | Tampering/Elevation | scriere cross-club | mitigate | RESTRICTIVE `ic_r_scope_*` `20261106b:26-39`, `ec_r_scope_*` `:72-83`, `es_r_scope_*` `:117-132`; permisive curate pe `has_access_to_club` `:22-23,62-69,103-114`. Test `rls_competitii_scriere_faza36.ts:130-143` (nereprodus) | closed |
| T-36-14 | Tampering | inscriere inchisa / categorie straina / sportiv strain | mitigate | **OPEN (verifier W1).** Gate complet doar la INSERT: `20261106b:41-47, 85-90, 134-140`. La UPDATE: `ic_r_gate_upd` (`:49-54`) si `ec_r_gate_upd` (`:91-96`) verifica doar categoria; NU exista `es_r_gate_upd`; `ext_p_*_upd` (`20261106c:52`) cere doar grantul (fara status/deadline/sportiv in club), `ext_p_*_del` (`:53`) doar `taxa_achitata=false`. Consecinte: extern poate modifica/retrage/sterge neachitate DUPA inchiderea inscrierilor si poate schimba `sportiv_id` pe un rand propriu spre un sportiv din alt club (daca ii cunoaste UUID-ul). Interpretare documentata in antetul `20261106b:9-12` (randuri legacy inter-club), dar netestata. Impact: integritate, nu citire (`ext_r_sportivi_sel` ramane) | open |
| T-36-15 | Tampering | scriere competitii/probe/categorii de ADMIN_CLUB | mitigate | `20261106b:150-202`: permisive + RESTRICTIVE `get_active_role() IN ('SUPER_ADMIN_FEDERATIE','ADMIN')`. Test `rls_competitii_scriere_faza36.ts:162-170` (nereprodus) | closed |
| T-36-16 | Information Disclosure | pierdere date reale la teste | mitigate | Cleanup + verificare reziduuri: `rls_competitii_scriere_faza36.ts:204`, `rls_acces_extern_faza36.ts:394`, `acces_extern_aprobare_faza36.ts:262`, `acces_extern_fundatie_faza36.ts:221`. Output doar PASS/FAIL + detalii (id/numarator), fara `console.log` de nume/email | closed |
| T-36-17 | Denial of Service | performanta RLS | mitigate | `(select public.este_doar_extern())` `20261106c:35-36,144`; helperi `STABLE` `20261106a:110-159`. Performanta nu a fost masurata (nicio proba in teste) | closed |
| T-36-18 | Spoofing | login OTP | mitigate | `services/accesExternService.ts:23-26` (`signInWithOtp`, `shouldCreateUser:false`), `:33` (`verifyOtp type:'email'`); fara parola. Continutul emailului (cod fara link) si dezactivarea signup-urilor la nivel de proiect Auth NU se pot verifica din repo (vezi Neverificat) | closed |
| T-36-19 | Information Disclosure | enumerare prin eroarea `signInWithOtp` | accept | **OPEN (decizie caller: enumerare email, nu se accepta).** `utils/accesExtern.ts:16-22` clasifica 422/`otp_disabled` ca `fara_cont`; `LoginOtp.tsx:35` muta UI pe formularul de cerere, deci oricine poate testa daca un email are cont. Atenuare partiala: plafon DB (vezi T-36-05, ea insasi OPEN) | open |
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
| T-36-37 | Information Disclosure | view-uri definer / RPC definer fara garda / storage.objects | accept(conditionat) | **OPEN (decizie caller: RPC SECURITY DEFINER ~170 + view prezenta).** (a) RPC: nicio garda `NOT este_doar_extern()` si niciun `REVOKE EXECUTE` pe functiile riscante (grep in `supabase/` si `sql/`: `este_doar_extern` apare doar in `20261106a/c`, ca helper/politici/trigger; `adauga_sportiv_complet`, `export_sportivi_selectati`, `decrypt_cnp`, `get_all_app_data`, `merge_sportivi`, `transfer_sportiv` neatinse); inventarul din `AUDIT-LIVE.md:170-179` le clasifica CRITIC/RIDICAT si nu au fost apelate in teste. (b) View-uri: doar 2 convertite, `20261106c:163-164`; regresie posibila netestata (W4), vezi R-05. (c) Storage: `20261106c:152-160` inghite `insufficient_privilege` (poate fi no-op tacut); crearea politicii e doar raportata in `36-11-SUMMARY.md:23`. Decizia utilizatorului inainte de lansare nu exista | open |
| T-36-38 | Denial of Service | cost RLS | mitigate | Idem T-36-17: `20261106c:35-36,144`, `20261106a:110-159` | closed |
| T-36-39 | Spoofing | utilizator mixt | accept | Documentat `36-VERIFICARE.md:76`; testat `rls_acces_extern_faza36.ts:374` (nereprodus); `este_doar_extern()` `20261106a:110-116` | accepted-doc |
| T-36-40 | Information Disclosure | card public pre-auth | mitigate | `20261106a:162-171`; `CompetitieExterna/index.tsx:98` (mesaj identic pentru inexistent/draft: `:19`). Teste `acces_extern_fundatie_faza36.ts:80-89` | closed |
| T-36-41 | Information Disclosure | PII minori in clientul extern | mitigate | **OPEN (decizie caller: coloane `sportivi`; verifier W3).** In client: `ExternDataProvider.tsx:35` cere doar coloane minime, `.eq('club_id')` `:36`. Dar controlul e doar in client: politica `ext_p_sportivi_sel` (`20261106c:61`) permite TOATE coloanele (`cnp`, `adresa`, `telefon`, `email`) pentru clubul din grant, iar nu exista column grants / view limitat (grep `GRANT SELECT (` / `REVOKE SELECT` in `supabase/` si `sql/`: zero). Un cont extern poate cere orice coloana direct prin PostgREST. Date de minori (GDPR) | open |
| T-36-42 | Elevation of Privilege | manipulare UI/URL spre alt club/competitie | mitigate | Poarta e RLS: `20261106c:44-90`; teste `rls_acces_extern_faza36.ts:185-188,223` (nereprodus) | closed |
| T-36-43 | Information Disclosure | scurgere date portal prin DataProvider | mitigate | `index.tsx:43-58` (ramura `/competitie/` fara `DataProvider`/`NavigationProvider`/`ThemeProvider`/`App`); `ExternDataProvider.tsx:78-86` (campuri sintetice) | closed |
| T-36-44 | Tampering | context activ gresit | mitigate | `CompetitieExterna/index.tsx:69` (`seteazaContextActiv` inainte de citire), `:212` (`key={ctx.roleRowId}`) | closed |
| T-36-45 | Denial of Service | bucla getSession/onAuthStateChange | accept | `CompetitieExterna/index.tsx:91-107` (cleanup, dezabonare, `anulat`). Verificarea Playwright citata in plan: spec 5/6 in `36-VERIFICARE.md`, 6/6 in commit `4a58fa9`, nereprodus | accepted-doc |
| T-36-46 | Elevation of Privilege | tab vizibil non-federatiei | mitigate | `Competitii/index.tsx:301-307` (`!extern && isSuperAdmin`), `:706`; RLS `20261106a:68-76,99-104`; endpoint 403 `aproba-cerere-acces.ts:36-38` | closed |
| T-36-47 | Tampering | XSS prin cereri anonime | mitigate | Grep `dangerouslySetInnerHTML`/`innerHTML` in `CereriAccesAdmin.tsx`, `CompetitieExterna/*`, `PlatiClubExtern.tsx`: zero; randare ca text `CereriAccesAdmin.tsx:175-183` | closed |
| T-36-48 | Repudiation | cine a aprobat/revocat | mitigate | Aprobare/respingere: `_aprobaCerereAcces.ts:81` (`procesat_de`), `:169,175` (`creat_de`). Revocarea: `CereriAccesAdmin.tsx:136` seteaza `activ=false` (rand pastrat). Reziduu (U-3): revocarea NU inregistreaza actorul (`20261106a:79-91` nu are `revocat_de/revocat_la`) | closed |
| T-36-49 | Information Disclosure | link competitie circula public | accept | `CereriAccesAdmin.tsx:160-162` spune explicit ca linkul nu da acces; decizia produsului: `36-CONTEXT.md` D-02/D-03 | accepted-doc |
| T-36-50 | Denial of Service | spam cereri in coada | accept | **OPEN (decizie caller: plafon cereri, nu se accepta).** Acelasi mecanism si aceleasi lipsuri ca T-36-05 (plafon 200 per competitie, fara throttling per IP, neacoperit de teste) | open |
| T-36-51 | Information Disclosure | tabele/view-uri neprevazute | mitigate | Sweep pe 229 relatii in `rls_acces_extern_faza36.ts:268` (rezultat ALLOW=30/OK=199/LEAK=0 din `36-11-SUMMARY.md:14`, nereprodus). Verificare statica: `20261106c:133-149` | closed |
| T-36-52 | Information Disclosure | PII in output test | mitigate | Output-ul testelor: `rls_acces_extern_faza36.ts:33,35`, `acces_extern_aprobare_faza36.ts:32` (doar nume de verificare + detalii id/numarator) | closed |
| T-36-53 | Tampering | teste polueaza date reale | mitigate | Prefix `ZZ_TEST_FAZA36_*`, cleanup in `finally`, reziduuri verificate: `rls_acces_extern_faza36.ts:394` (`plati`/`vize_sportivi`), `rls_competitii_scriere_faza36.ts:204` | closed |
| T-36-54 | Elevation of Privilege | header falsificat | mitigate | Test dedicat `rls_acces_extern_faza36.ts:223` (nereprodus); structural: `has_access_to_club`/`is_super_admin` valideaza `user_id = auth.uid()` (`AUDIT-LIVE.md:131-133`), politicile extern nu depind de header (`20261106a:118-141`) | closed |
| T-36-55 | Repudiation | scurgere nedetectata (test relaxat) | mitigate | Aserturile din testele extern sunt stricte (`!ok(r)` etc., `rls_acces_extern_faza36.ts:283-362`); `36-11-SUMMARY.md:13` declara zero relaxari; singura schimbare (36-12) vizeaza un rol intern ADMIN_CLUB si e documentata: `36-12-SUMMARY.md:20`, `acces_extern_aprobare_faza36.ts:234` | closed |
| T-36-56 | Tampering | reziduuri de test | mitigate | `acces_extern_aprobare_faza36.ts:262`, `acces_extern_fundatie_faza36.ts:221`, `rls_acces_extern_faza36.ts:394` | closed |
| T-36-57 | Information Disclosure | PII in screenshot | mitigate | Screenshot `screens/36-12-extern-mobil.png` inspectat vizual: fara nume de sportivi (0 inscrieri afisate); apar numele real al clubului si un email de test `@example.test` | closed |
| T-36-58 | Denial of Service | lansare fara SMTP custom | accept (documentat) | Prerechizit documentat explicit: `36-VERIFICARE.md:63-65` (plan 32-08 neexecutat). Documentul insusi concluzioneaza "NU este gata de lansare publica" (`:7`) | accepted-doc |
| T-36-59 | Elevation of Privilege | endpoint de aprobare fara garda | mitigate | Ordinea garzilor `aproba-cerere-acces.ts:9,13,32-38`; test de contract `acces_extern_aprobare_faza36.ts:150-160,179` (401/403/400/405/409; rezultat nereprodus, handler importat direct, nu prin Vercel) | closed |
| T-36-60 | Spoofing | enumerare emailuri prin `signInWithOtp` | accept | **OPEN (decizie caller: enumerare email, nu se accepta).** Vezi T-36-19; documentata ca D-05/`36-VERIFICARE.md:75`, dar fara semnatura utilizatorului | open |

**Totaluri:** 60 amenintari = 47 closed + 5 accepted-doc + 8 open.
**OPEN (blocante):** T-36-05, T-36-08, T-36-14, T-36-19, T-36-37, T-36-41, T-36-50, T-36-60.

---

## Riscuri din 36-VERIFICARE.md (d) si 36-VERIFICATION.md (W1-W5), mapate pe registru

| Ref | Risc | Mapare | Status |
|-----|------|--------|--------|
| (d)1 / W2 / R-01 | ~170 RPC `SECURITY DEFINER` apelabile de orice `authenticated`, inclusiv extern | T-36-37 | open |
| (d)2 / W3 / R-02 | `sportivi` SELECT pe toate coloanele pentru clubul din grant | T-36-41 | open |
| (d)3 / R-03 | `storage.objects`: politica `ext_r_storage_deny` creata doar conform raportului; restul politicilor de storage neauditat | T-36-37 (c) | open (neverificat) |
| (d)4 / R-04 | `cluburi_public_select` expune `cif`, `setari` oricarui `authenticated` | neinregistrat (WARNING) | open, risc scazut (`AUDIT-LIVE.md:162`) |
| (d)5 / W4 / R-05 | `vedere_prezenta_sportiv` / `vedere_istoric_grade_sportiv` pe `security_invoker` (`20261106c:163-164`): regresie posibila pe prezentele fratilor. Raza e mai larga decat cea listata: `vedere_istoric_grade_sportiv` e citit de incarcarea de baza a portalului pentru toate rolurile (`hooks/useDataProvider.ts:390,409,411`), alaturi de `FamilieWidget.tsx:70`, `IstoricPrezentaGlobal.tsx:28`, `usePrezenteLuna.ts:41`, `usePrezenteLunare.ts:80`. Nu s-a testat nimic in browser. Inventarul `AUDIT-LIVE.md:154` zice ca doar aceste 2 view-uri erau definer, `36-VERIFICARE.md:73` zice ca restul nu au fost inventariate exhaustiv: contradictie nerezolvata | T-36-37 (b) | open |
| (d)6 | cheie `localStorage` comuna | T-36-31 | accepted-doc |
| (d)7 | enumerare email prin `otp_disabled` | T-36-19, T-36-60, T-36-08 | open |
| (d)8 | INSTRUCTOR extern nu poate edita arme CVD | informativ: `Competitii/index.tsx:198` (UI), nu este amenintare de securitate | info |
| (d)9 | cont mixt vede reuniunea | T-36-39 | accepted-doc |
| (d)10 | rate limit in-memory | T-36-25 | closed |
| (d)11 | SELECT intern larg pe `inscrieri_competitie` | decizie utilizator `36-CONTEXT.md` D-16 (linia 43) | accepted (vezi log) |
| (d)12 | lista publica de cluburi: `lista_cluburi_publice` da (id, nume) ale TUTORA oricarui anonim (`20261106d:2-8`; live anon re-probat: HTTP 200, 36 randuri) | neinregistrat (WARNING); `36-VERIFICARE.md:46,84` cere "decizie de acceptat" | open, decizie pendinte |
| W1 | gate status/deadline/sportiv doar la INSERT | T-36-14 | open |
| W5 | documente de stare nealiniate (`36-VERIFICARE.md` inca spune "lista cluburi goala"; defectul e rezolvat live) | nu e risc de securitate | info |

---

## Unregistered Flags (WARNING, nu blocheaza)

Threat Flags din SUMMARY-urile 36-05, 36-06, 36-09, 36-10 sunt "None"/mapate pe amenintari existente (36-09 mentioneaza `tipuri_competitie` citit ca anon inainte de login: cade pe etichete hardcodate, fara impact). Suprafata noua gasita de auditor, fara mapare in plan:

| ID | Constatare | Evidenta | Severitate |
|----|-----------|----------|------------|
| U-1 | Default-deny extern este static: `ext_r_deny_all` se aplica doar tabelelor cu RLS existente la rularea migrarii. Orice tabel creat ulterior nu primeste politica; politicile generice permisive de tip `auth.uid() IS NOT NULL` ar deveni citibile de contul extern. Nu exista event trigger, test CI sau regula in plan care sa previna asta | `20261106c:133-149` | Medie |
| U-3 | Revocarea accesului extern nu inregistreaza cine a revocat (doar `activ=false`, fara `revocat_de/revocat_la`) | `CereriAccesAdmin.tsx:136`, `20261106a:79-91` | Scazuta |
| U-4 | `REPREZENTANT_COMPETITIE` lipseste din `ROLE_WEIGHTS`; `creare-cont` nu il respinge explicit (`undefined > gClub` = `false`), contrar formularii din plan ("greutate 0") | `api/_permisiuniCont.ts:11-17,86` | Scazuta (fara grant nu da acces) |
| R-04/(d)12 | Expunere `cif`/`setari` (authenticated) si lista de cluburi (anon) | `20261106d`, `AUDIT-LIVE.md:162` | Scazuta |

---

## Accepted Risks Log

Nicio acceptare nu poarta semnatura utilizatorului in acest audit. Intrarile de mai jos sunt acceptari DOCUMENTATE in plan, verificate ca prezente; raman necerificate de utilizator pana la bifarea Sign-Off. Riscurile deschise cerute explicit ca OPEN (RPC definer, coloane `sportivi`, enumerare email, plafon cereri, view prezenta) NU sunt in acest log.

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-36-31 | Cheie `localStorage` comuna intre zona externa si portal; efect: schimbare de context, fara escaladare | Plan 36-07 (planificator); utilizator: nesemnat | 2026-11-05 |
| AR-02 | T-36-39 | Cont mixt (rol intern + grant) pastreaza drepturile interne si primeste in plus grantul; nicio escaladare noua | Plan 36-08 (planificator); utilizator: nesemnat | 2026-11-05 |
| AR-03 | T-36-45 | Efect idempotent cu dezabonare; verificare Playwright citata | Plan 36-09 (planificator); utilizator: nesemnat | 2026-11-05 |
| AR-04 | T-36-49 | Linkul competitiei nu confera acces; intra doar conturi eligibile | Decizie de produs D-02/D-03 (`36-CONTEXT.md:21-22`); utilizator: decizie de design | 2026-11-05 |
| AR-05 | T-36-58 | Lansare fara SMTP custom: OTP real nu functioneaza la volum; prerechizit documentat | Plan 36-12 (planificator); utilizator: nesemnat. Atentie: documentul insusi spune ca faza nu e gata de lansare publica | 2026-11-05 |
| AR-06 | (d)11 | `inscrieri_competitie` ramane vizibil intre cluburi pentru rolurile interne | Utilizator, decizie D-16 (`36-CONTEXT.md:43`) | 2026-11-05 |

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

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-05 | 60 | 47 (+5 accepted-doc, nesemnate) | 8 | gsd-security-auditor (Claude), reluat de la inceput la cererea coordonatorului |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [ ] Accepted risks documented in Accepted Risks Log (documentate, dar nesemnate de utilizator: AR-01..AR-05)
- [ ] `threats_open: 0` confirmed (acum 8)
- [ ] `status: verified` set in frontmatter

**Approval:** pending. Blocante pentru lansare: T-36-37 (RPC definer + view-uri + storage), T-36-41 (coloane `sportivi`), T-36-14 (UPDATE/DELETE fara gate), T-36-05/T-36-50 (plafon cereri), T-36-08/T-36-19/T-36-60 (enumerare email). Prerechizit extern: planul 32-08 (SMTP custom).
