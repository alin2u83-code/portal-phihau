# 37-04 SUMMARY — Val 2/1: garzi pe functiile de bani (6.11.2026)

## Aplicat live
`20261107c_garzi_functii_bani.sql` (post-conditii OK): garda `auth.uid() IS NOT NULL AND (este_doar_extern() OR NOT (is_super_admin() OR has_access_to_club(club)))` => 42501 pe `proceseaza_incasare_normalizata` (club tranzactie din JSON/sportiv + club fiecarei plati; federatia fara restrictie), `recalculare_stare_plata` (club plata, fallback sportiv), `generare_factura_examen(uuid,uuid)`. `generare_factura_examen(uuid)` STEARSA (INSERT in `plati.data_platii` inexistent, zero apelanti). Rollback: `rollback/37-04-before.sql`. Allowlist: -1 intrare (authenticated 98).

## Inventar read-only (fara modificari de date, decizie utilizator)
90 plati `Achitat` fara `tranzactie_plata` (Kim Long Dao Falticeni 68, C.S. Phi Hau 20, Club Bogdan 2); 76 au suma>0.01 si ar deveni `Neachitat` la orice recalcul. Risc PREEXISTENT, garda nu il schimba. Neatins.

## Verificari
- ROSU inainte: pe live extern, SPORTIV, ADMIN@B, INSTRUCTOR@B, alocare cross-club si recalcul de catre oricine REUSEAU (H2a confirmat); `generare_factura_examen` live da deja `column "pret" does not exist` (42703) pentru oricine (functie nefunctionala, preexistent, zero apelanti).
- VERDE dupa: 45/45 (matrice 7 roluri + service_role + anon; efecte verificate cu service role; cale trigger INSERT/DELETE tranzactie_plata pe ADMIN@A/INSTRUCTOR@A OK, ADMIN@B respins), numaratori plati/tranzactii/tranzactie_plata/vize neschimbate, reziduuri 0.
- Regresie: acl 30/30, rls_acces_extern 57/57 (o rulare "fetch failed" tranzitoriu, trecut la repetare), aprobare 36/36, competitii_scriere 42/42, fundatie 36/36, flux_taxe_anuale_faza33 30/30, tsc curat, Playwright 6/6; rls_izolare_cross_club_faza25 rosu preexistent (grupa fara sezon).

## Review separat (agent-skills:code-reviewer) — fara CRITICAL; NEAPLICATE (asteapta OK)
- MEDIUM migrare:40-44,50-52 — plata cu club_id NULL si sportiv_id NULL (6 plati, toate cu familie_id, 1 neachitata) nu poate fi incasata de ADMIN_CLUB (42501), doar de federatie. Fix propus: fallback `familie_id -> club` (familii multi-club: 0) in garda platii; sau backfill/documentat.
- MEDIUM migrare:30-55 — `familie_id` din payload nevalidat (un admin poate scrie familia altui club pe tranzactia proprie). Fix: cere membru al familiei in clubul tranzactiei, sau ignora.
- MEDIUM JurnalIncasari:343-374 — familie multi-club cu club din primul sportiv vs sportiv_id per factura => 42501; date reale: 0 familii multi-club (nu loveste azi).
- MEDIUM trigger — DML pe tranzactie_plata fara header de context sau cu JWT non-staff primeste 42501; cod cautat: DML pe tranzactii doar din UI admin (JurnalIncasari, UserProfile). Neverificat in browser.
- LOW migrare:57-67 — `club_id` derivat nu ajunge in INSERT (tranzactie cu club NULL daca lipseste din payload; azi 0 tranzactii fara club). LOW — supra-alocare/sume negative nevalidate (preexistent). LOW — garda din generare_factura_examen dupa verificarea de grad (scurgere existenta sportiv, functia oricum nefunctionala).
- Respins cu dovezi: "HIGH test fals-rosu :221" — sportivii efemeri primesc grad din trigger (functia a ajuns la pasul 4 in rularea rosie), testul a trecut 45/45. Rol `ADMIN` global: 0 utilizatori.
- MEDIUM test — `audit_log` (triggere pe sportivi/plati/tranzactii) nu e curatat/numarat; numaratori globale pe cluburi reale (fals-rosu daca se lucreaza in paralel). Neacoperit.

## Neverificat
Browser (incasare in Plati hub, Jurnal incasari); instructor real; flux familie fara club; audit_log.

## Fix-uri review aplicate (OK utilizator 6.11.2026) — migrare live `garzi_functii_bani_familie_club`
- MEDIUM familie fara club: clubul platii = `plati.club_id` -> clubul sportivului -> clubul familiei (familii multi-club: 0; cele 6 plati de familie fara club pot fi incasate de ADMIN_CLUB al clubului familiei). Aplicat in `proceseaza_incasare_normalizata` si `recalculare_stare_plata`.
- MEDIUM `familie_id` din payload: cere un membru al familiei in clubul tranzactiei (29 tranzactii existente cu familie trec toate). Federatia exceptata.
- Test: +6 verificari (familie fara club ADMIN@A OK / ADMIN@B 42501, familie_id strain 42501, recalculare familie). Rezultat 51/51, numaratori neschimbate, reziduuri 0 (inclusiv familii).
- Incident test: tranzactia de familie (sportiv_id NULL) a ramas in `tranzactii` clubul A la prima rulare (169->170); stearsa dupa `id` (verificat: suma 1, Cash, azi, fara alocari, in fereastra rularii), cleanup-ul corectat sa prinda si `familie_id`.
- Raman neaplicate: LOW `club_id` derivat in INSERT; LOW garda dupa verificarea gradului (functia oricum nefunctionala); MEDIUM test `audit_log`/numaratori globale; MEDIUM trigger fara header (neverificat in browser).
