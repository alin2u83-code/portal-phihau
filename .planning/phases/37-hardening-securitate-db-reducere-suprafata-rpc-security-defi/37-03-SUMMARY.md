# 37-03 SUMMARY — Val 1: REVOKE anon/PUBLIC, C, SERVICE_ONLY, default privileges (6.11.2026)

## Aplicat live (proiect wuhidifzsutwgdfkwhmd)
- `20261107b_revoke_definer_anon_default_privileges.sql` (post-conditii OK) + fix ulterior `fix_cauta_utilizatori_comisie_cast_tipuri` (aceeasi functie, incorporat in fisier).
- anon: doar D (4): get_competitie_publica, inregistreaza_email_auth, lista_cluburi_publice, trimite_cerere_acces. `scoala_ioncreanga_*` neatinse.
- C (25) si SERVICE_ONLY (10): fara authenticated/anon/PUBLIC; service_role pastrat. authenticated 131 -> 99 in allowlist (-22 C cu auth, -10 SO).
- `cauta_utilizatori_comisie`: plpgsql + garda (auth.uid() + este_staff()/is_super_admin()). Staff: 17 randuri (identic cu inainte); anon/SPORTIV/extern: 42501.
- Default privileges: `postgres` (public: anon revocat; global: PUBLIC revocat) OK; sonda cu functie noua: anon=false.

## NEACOPERIT
- `supabase_admin` default ACL in public (f) ramane cu anon/authenticated=X (rolul migrarii nu e membru). De rulat manual din dashboard SQL editor:
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;`
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;`
  Risc: doar functii noi create de supabase_admin; ratchet-ul testului le prinde.

## Incident propriu (prins de test)
Prima versiune plpgsql a `cauta_utilizatori_comisie` dadea "structure of query does not match function result type" pentru staff (RETURN QUERY strict la tipuri). Fereastra ~minute pe live; reparat cu cast-uri `::uuid/::text`.

## Verificari pre-aplicare
- Apelanti SERVICE_ONLY: doar functii definer (is_federation_admin, get_statistici_financiare, handle_sportiv_insert_automation) + pg_cron `schedule_training_reminders` (postgres). Zero invoker/view/politici.
- Anon pe 154 tabele/view-uri inainte = dupa: 106 ok / 48 ERR 42501, aceleasi tabele. `sportivi` dadea deja 42501 pentru anon (get_familie_id_sportiv_curent).
- pg_default_acl inainte: postgres/public/f: {postgres, anon, authenticated, service_role}; dupa: {postgres, authenticated, service_role} + global {postgres}.

## Regresie
acl_definer_faza37 30/30; rls_acces_extern 57/57; acces_extern_aprobare 36/36; rls_competitii_scriere 42/42; acces_extern_fundatie 36/36; tsc curat; Playwright 6/6; rls_izolare_cross_club_faza25 ROSU preexistent (grupa fara sezon).

## Review separat (agent-skills:code-reviewer) — fara CRITICAL/HIGH; neaplicate (asteapta OK)
- MEDIUM migrare:167 — post-conditia (d) pentru scoala_ioncreanga_* e doar comentariu (nu compara proacl). Fix: snapshot proacl scoala inainte/dupa.
- LOW-MEDIUM migrare:130,135 — `ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ... FROM PUBLIC` fara IN SCHEMA = global (alte scheme). Accept+documentat sau limitat la public.
- LOW migrare:131-139 — supabase_admin deschis (vezi mai sus).
- LOW migrare:20,161 — `35` hardcodat in (c); comparatii pe nume nu pe semnatura; ON COMMIT DROP cere tranzactie unica.
- LOW test — reziduuri: listUsers perPage 200; randurile utilizator_roluri_multicont nesterse explicit (CASCADE neverificat). Notat: service_role primeste acum 42501 pe cauta_utilizatori_comisie (auth.uid() null).

## Neverificat
Browser (login, Dashboard, Examene/cautare membru comisie, reset parola); instructor/sportiv real; corpul `este_staff()` (dependenta de header context).

## Fix-uri review aplicate (OK utilizator 6.11.2026)
- MEDIUM post(d): snapshot `_scoala_inainte` + comparatie proacl + garda pe gol, in fisierul de migrare. NOTA: migrarea live a rulat fara acest snapshot (nu se mai poate reconstitui "inainte"); verificat ulterior pe live: 34 functii scoala, toate anon-callable, 2 ACL distincte, ca in triaj (neatinse).
- LOW-MEDIUM default privileges globale: pastrat intentionat (forma IN SCHEMA nu poate revoca PUBLIC), documentat in comentariu in migrare.
- LOW post(c): numara direct C+SERVICE_ONLY care aveau authenticated (fara 35 hardcodat).
- LOW test: cleanup sterge explicit utilizator_roluri_multicont, listUsers paginat, verifica si randuri de rol ramase.
- Fisierul de migrare difera acum de textul rulat live doar prin post-conditii/comentarii (efect DDL identic).
- ramas: supabase_admin default ACL (manual, dashboard).
