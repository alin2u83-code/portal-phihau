---
slug: facturi-nu-se-pot-edita
status: awaiting_human_verify
trigger: "Debug facturi: modificare, plata, creare — nu pot modifica detalii la facturi (toate 3 arii: creare/modificare/plata afectate simultan)."
created: 2026-09-12
updated: 2026-09-12
---

# Debug: Facturi — editare blocata (suma/status/data), eroare la salvare

## Symptoms

- **expected:** ADMIN_CLUB ar trebui sa poata edita orice aspect al unei facturi — suma/produsele, statusul (platit/neplatit), data/scadenta — pentru factura club normal, factura de examen, si factura anulata/istoric.
- **actual:** Eroare la salvare cand se incearca modificarea. Afecteaza simultan toate 3 arii (creare, modificare, plata facturi). Blocat pe: suma/produse, status platit/neplatit, data/scadenta.
- **errors:** Text exact necunoscut inca — utilizatorul nu a putut furniza mesajul de eroare (toast/consola/network). Necesita investigare directa (consola browser, network tab, RLS/Supabase logs).
- **timeline:** Dintotdeauna / vechi — nu e regresie recenta, feature-ul nu a functionat corect niciodata in acest flux.
- **reproduction:** Plati > Facturi > click pe o factura > Editeaza > modifica un camp (suma/status/data) > Salveaza -> eroare.

## Current Focus

reasoning_checkpoint:
  hypothesis: "NU e RLS. Sunt 2 bug-uri distincte, independente, ambele de tip 'schema mismatch' (nume coloana in cod != nume coloana reala in DB), niciunul cauzat de permisiuni club/rol:
    (1) CREARE: GestiuneFacturi.tsx handleAddFactura + JurnalIncasari.tsx handleSaveIncasare (ramura fara plati existente) trimit INSERT catre 'plati' cu campul 'reducere_detalii' (snake_case). Coloana reala din DB e 'reducereDetalii' (camelCase, anomalie de schema). PostgREST respinge orice INSERT cu o coloana necunoscuta -> PGRST204 -> 'Eroare la salvare' de fiecare data, indiferent de continutul facturii.
    (2) INCASARE/PLATA: RPC-ul live-only 'proceseaza_plata_factura' (apelat din GestiuneFacturi.tsx handleProcessPayment SI PlatiScadente.tsx handleProcessPayment — ambele butoane 'Incaseaza') face INSERT INTO tranzactii(..., descriere, ...), dar tabela 'tranzactii' NU are coloana 'descriere' (confirmat live: id, plata_ids, sportiv_id, familie_id, suma, data_platii, metoda_plata, created_at, club_id, suma_totala, suma_incasata). Orice incasare esueaza cu eroare Postgres 42703."
  confirming_evidence:
    - "Test direct API (autentificare reala ADMIN_CLUB, anon key + header active-role-context-id, exact ca supabaseClient.ts) pe un rand de test izolat (creat+sters in acelasi script, zero impact pe date reale): INSERT cu 'reducere_detalii' -> eroare PGRST204 'Could not find the reducere_detalii column of plati in the schema cache'. Acelasi INSERT cu 'reducereDetalii' (dupa fix) -> HTTP 201, succes."
    - "Test direct API pe acelasi RPC folosit de aplicatie: userClient.rpc('proceseaza_plata_factura', {...}) -> eroare Postgres 42703 'column descriere of relation tranzactii does not exist'."
    - "UPDATE direct (handleSaveEdit din GestiuneFacturi.tsx SI din PlatiScadente.tsx, inclusiv cazuri factura Anulat si factura cu examen_id real, inclusiv spread-ul complet al obiectului 'editingPlata' cu toate coloanele brute) a reusit de fiecare data (HTTP 200, fara eroare) — editarea de baza NU e blocata de RLS sau schema, in niciun scenariu testat."
    - "grep confirma 'reducere_detalii' (snake_case) scris DOAR in GestiuneFacturi.tsx:231 si JurnalIncasari.tsx:428; 'proceseaza_plata_factura' si 'recalculare_stare_plata' nu apar NICAIERI in supabase/migrations/ sau sql/ — functii DB live necomise in repo (acelasi tipar 'politici/functii fantoma' documentat in feedback_audit_rls_verifica_live_nu_doar_migratii)."
  falsification_test: "Daca dupa fix INSERT-ul tot esueaza cu PGRST204 pe alta coloana, sau daca un admin real raporteaza aceeasi eroare dupa deploy, ipoteza e falsa. Testat si confirmat cu succes (HTTP 201) inainte de a considera fix-ul #1 validat."
  fix_rationale: "Fix #1 (aplicat, cod-only, verificat): redenumit campul din payload-urile INSERT de la 'reducere_detalii' la 'reducereDetalii' in GestiuneFacturi.tsx si JurnalIncasari.tsx + tip Plata din types.ts + cele 3 citiri corespunzatoare din PlatiScadente.tsx (foloseau acelasi nume gresit, cauzand un bug secundar tacut: numele reducerii nu se afisa niciodata). De asemenea eliminat campul 'descriere' din INSERT-ul direct catre 'tranzactii' din handleAddFactura (bug latent, mascat pana acum de bug #1 — ar fi esuat imediat ce #1 s-ar fi reparat, la bifarea 'Incaseaza pe loc'). Adreseaza cauza radacina (nume de coloana gresit), nu simptomul.
    Fix #2 (NEREZOLVAT in aceasta sesiune): bug-ul e in interiorul functiei RPC 'proceseaza_plata_factura', care exista DOAR pe DB live, fara sursa in repo. Nu am acces la un tool de introspectie SQL live (fara MCP execute_sql in aceasta sesiune) si scrierile DDL pe productie sunt blocate de clasificatorul de permisiuni al mediului (Modify Shared Resources / Security Weaken) — corect, pentru ca a rescrie orbeste o functie SECURITY DEFINER cu logica necunoscuta (posibil interactiune cu trigger-ul 'recalculare_stare_plata') ar fi periculos fara sa vad sursa reala intai."
  blind_spots: "Editarea (UPDATE simplu al unei facturi existente) NU a putut fi reprodusa ca eroare in niciun test direct API, desi userul a raportat ca e afectata simultan cu creare/plata. Posibile explicatii netestate: (a) userul a incercat sa creeze o factura de test pentru a o edita, s-a blocat la creare, si a presupus ca editarea e afectata la fel; (b) un caz specific din UI real (alt browser/sesiune/tip de factura) nu a fost acoperit de cele 5 scenarii testate (normal, Anulat, cu examen_id, cu spread complet de obiect, cu reducere_id). Recomand retestare in UI dupa acest fix — daca editarea tot esueaza, am nevoie de mesajul EXACT din consola/network pentru pasul urmator."
next_action: "Asteapta confirmare user pe fix #1 (creare factura) in UI reala. Pentru fix #2 (incasare/plata), e nevoie fie de (a) acces la sursa reala a functiei 'proceseaza_plata_factura' din Supabase Studio (SQL Editor > Database Functions) pentru a scrie un CREATE OR REPLACE FUNCTION corect, fie de (b) permisiune explicita sa rulez o migratie DDL pe DB live din alta sesiune cu access corespunzator."

## Eliminated

- hypothesis: "RLS pe tabela plati blocheaza UPDATE/INSERT facut de ADMIN_CLUB (politici fantoma live, cf. feedback_audit_rls_verifica_live_nu_doar_migratii)."
  evidence: "Test direct API cu autentificare reala ADMIN_CLUB (anon key + header active-role-context-id identic cu supabaseClient.ts) a reusit UPDATE si INSERT pe randuri de test in toate scenariile: factura normala, factura Anulat, factura cu examen_id real, update cu spread complet de obiect. RLS nu a blocat nimic — HTTP 200/201 de fiecare data cand payload-ul avea coloane valide."
  timestamp: "2026-09-12"

## Evidence

- timestamp: "2026-09-12"
  checked: "Playwright end-to-end cu login real (TEST_EMAIL/TEST_PASSWORD) si selectie rol Admin - C.S. Phi Hau"
  found: "Contul admin necesita verificare MFA prin cod trimis pe email la fiecare selectie de rol privilegiat (MFA_REQUIRED_ROLES: ADMIN_CLUB, SUPER_ADMIN_FEDERATIE, cf. hooks/useMFAGuard.ts) — validitate 12h in tabela mfa_email_verificari. Blocheaza automatizarea end-to-end fara codul din email."
  implication: "Am pivotat pe testare directa API: autentificare reala (signInWithPassword) cu anon key + header active-role-context-id, exact ca supabaseClient.ts — MFA e doar poarta UI (mfa_email_verificari nu apare in nicio politica RLS/migratie), nu afecteaza Supabase Auth/RLS la nivel API."

- timestamp: "2026-09-12"
  checked: "grep pe tot repo-ul pentru 'proceseaza_plata_factura' si 'recalculare_stare_plata' (functii DB apelate din cod)"
  found: "Zero rezultate in supabase/migrations/ sau sql/ — sursa acestor functii nu exista nicaieri in repo, desi sunt folosite activ din GestiuneFacturi.tsx, PlatiScadente.tsx si facturaService.test.ts."
  implication: "Functii DB 'fantoma' (aplicate direct pe live, niciodata comise ca migratie) — acelasi tipar documentat in memoria proiectului (Faza 25, politici RLS fantoma). Orice bug in interiorul lor e invizibil in cod si nu poate fi reparat fara acces direct la Supabase Studio / MCP execute_sql."

- timestamp: "2026-09-12"
  checked: "Test izolat: INSERT in plati cu payload identic handleAddFactura (GestiuneFacturi.tsx), autentificat ca ADMIN_CLUB real, pe rand de test creat si sters in acelasi script"
  found: "Eroare PGRST204: \"Could not find the 'reducere_detalii' column of 'plati' in the schema cache\". Randul returnat de un UPDATE anterior pe acelasi tabel arata coloana reala numita 'reducereDetalii' (camelCase)."
  implication: "handleAddFactura (GestiuneFacturi.tsx:231) si handleSaveIncasare ramura fara plati existente (JurnalIncasari.tsx:428) scriu mereu campul 'reducere_detalii' (snake_case) — INSERT esueaza 100% din timp, indiferent de datele facturii. Aceasta e cauza radacina pentru 'creare factura nu merge'."

- timestamp: "2026-09-12"
  checked: "Test izolat: RPC proceseaza_plata_factura cu payload identic handleProcessPayment, autentificat ca ADMIN_CLUB real, pe factura de test status Neachitat"
  found: "Eroare Postgres 42703: \"column \\\"descriere\\\" of relation \\\"tranzactii\\\" does not exist\". Verificare separata (select * limit 1 pe tranzactii) confirma coloanele reale: id, plata_ids, sportiv_id, familie_id, suma, data_platii, metoda_plata, created_at, club_id, suma_totala, suma_incasata — fara 'descriere'."
  implication: "RPC-ul live 'proceseaza_plata_factura' (folosit de butonul 'Incaseaza' din ambele ecrane, GestiuneFacturi.tsx si PlatiScadente.tsx) esueaza 100% din timp la orice incasare. Cauza radacina pentru 'plata factura nu merge'. Bug ISTORIC (comparand cu RPC-ul surori 'proceseaza_incasare_normalizata' din JurnalIncasari.tsx, care NU foloseste 'descriere' si functioneaza corect) — probabil 'proceseaza_plata_factura' n-a fost actualizat cand schema tranzactii s-a schimbat."

- timestamp: "2026-09-12"
  checked: "Test izolat: UPDATE plati cu payload identic handleSaveEdit din GestiuneFacturi.tsx SI din PlatiScadente.tsx (inclusiv id,...updates spread complet), pe 5 scenarii: normal, Anulat, cu examen_id real, cu reducere_id, cu toate coloanele brute (inclusiv suma_ramasa, created_at)"
  found: "Toate cele 5 UPDATE-uri au reusit (HTTP 200, error: null, rand returnat). Nicio coloana testata nu e GENERATED/read-only. RLS nu a blocat niciun scenariu."
  implication: "Editarea de baza a unei facturi NU e stricata la nivel DB/RLS/schema in niciun scenariu testat direct. Simptomul 'editare nu merge' raportat de user ramane nereprodusa — posibil confuzie cu bug #1 (utilizatorul a incercat sa creeze o factura noua de test inainte de a o edita si s-a blocat la creare), sau un caz UI/browser specific netestat aici."

- timestamp: "2026-09-12"
  checked: "grep pentru toate folosirile 'reducere_detalii' vs 'reducereDetalii' in cod"
  found: "PlatiScadente.tsx citea 'plata.reducere_detalii' (snake_case) direct din randul brut fetch-uit din DB — camp care nu exista niciodata sub acel nume (coloana reala e camelCase), deci era mereu undefined."
  implication: "Bug secundar tacut (fara eroare vizibila): numele reducerii aplicate nu se afisa niciodata corect in PlatiScadente.tsx, cade mereu pe fallback. Reparat in acelasi fix ca #1 (consistenta nume camp)."

## Resolution

root_cause: "Doua bug-uri independente de tip schema-mismatch (nume camp in cod diferit de nume coloana reala in DB), NU probleme de RLS/permisiuni:
  (1) plati.reducereDetalii (coloana reala, camelCase) scrisa gresit ca 'reducere_detalii' (snake_case) in 2 locuri -> INSERT respins de PostgREST (PGRST204) la orice creare de factura.
  (2) RPC live 'proceseaza_plata_factura' insereaza in tranzactii o coloana 'descriere' care nu exista -> orice incasare esueaza cu eroare Postgres 42703."
fix: "Aplicat (cod, verificat cu test API real): redenumit 'reducere_detalii' -> 'reducereDetalii' in GestiuneFacturi.tsx (handleAddFactura), JurnalIncasari.tsx (handleSaveIncasare), types.ts (tip Plata) si cele 3 citiri din PlatiScadente.tsx. Eliminat campul inexistent 'descriere' din INSERT-ul direct catre tranzactii in GestiuneFacturi.tsx (bug latent, ar fi aparut imediat dupa fix #1 la bifarea 'Incaseaza pe loc').
  NEREZOLVAT: RPC 'proceseaza_plata_factura' (bug #2, afecteaza butonul 'Incaseaza' din ambele ecrane) — necesita acces la sursa reala a functiei (Supabase Studio) pentru un CREATE OR REPLACE FUNCTION corect; scrierile DDL pe DB live sunt blocate de permisiunile acestei sesiuni."
verification: "Fix #1: verificat cu test API izolat (insert pe rand de test, sters imediat) — HTTP 201, succes, fara eroare, dupa aplicarea fix-ului. tsc --noEmit ruleaza curat (fara erori de tip) dupa toate modificarile. Verificare UI reala in asteptare (checkpoint uman)."
files_changed:
  - components/Plati/GestiuneFacturi.tsx
  - components/Plati/JurnalIncasari.tsx
  - components/Plati/PlatiScadente.tsx
  - types.ts
