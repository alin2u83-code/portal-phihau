# TODO 19.11.2026 — termina Faza 43, apoi poarta Faza 44-10

## 1. Faza 43 — 43-06 (blocat pe Dashboard Supabase, proiect wuhidifzsutwgdfkwhmd)
Utilizator:
1. Email Templates: `{{ .Token }}`, fara `{{ .ConfirmationURL }}` (model docs/email-template-cod.html)
2. Email OTP Length = 8
3. Sessions: inactivity timeout off, time-box off sau >=720h
4. Rate limits verificate
5. SMTP custom: mail.phihau.ro:465, user/sender noreply@phihau.ro, parola de la user
Raspuns: `dashboard: sabloane OK, lungime 8, sesiuni OK, rate limits OK, SMTP custom` sau `blocat: <motiv>`

Claude dupa raspuns: 43-06 Task 2 (porti finale, query A2 read-only numaratori, checklist uman 8 puncte, 43-06-SUMMARY.md), verificare faza, STATE/ROADMAP.
Netestat: dispozitiv nou in browser, mobil, cale esec RPC revocare, test live auth_extern_parola_faza43 dupa signOut others.

## 2. Push (dupa 43)
Commit-urile 44-04/06/08 sunt LOCAL-ONLY (main e 42 inaintea origin/main 5ec49958). Push + asteapta deploy Vercel.

## 3. Faza 44-10 — poarta Task 2 (migrarea f 20261118f, NEAPLICATA)
Reia: git fetch; `git merge-base --is-ancestor <hash> origin/main` pe 2140f288 70d33d9f 56aa612c f020a83b 1c13e25c e2bc7069 8525236b 08eaf89f; deploy Vercel ok.
Cand utilizatorul zice "aplica": canary 44-02, recapturare pg_get_functiondef (3 functii) + pg_get_viewdef view_istoric_plati_detaliat in rollback/44-10-before.sql, snapshot-uri backup_faza44.pre_drop_tranzactii / pre_drop_plati_tip, apply_migration, verificari (coloane disparute, tgenabled='O', security_invoker, numaratori plati 978/tranzactii 400/tranzactie_plata 412), teste (facturaService.test.ts, plati_club_id_faza44.ts, sold_vs_rest_faza44.ts), header migrare APLICATA, SUMMARY 44-10, commit (git add -f), review separat code-reviewer.
Reguli: fara CASCADE, fara UPDATE plati.status in migrari, fara push fara OK, atribuire Co-Authored-By.
Urmeaza 44-11 (stergere model paralel). Bug extern fazei: edge function sms-parse-bank scrie 'achitat'.
