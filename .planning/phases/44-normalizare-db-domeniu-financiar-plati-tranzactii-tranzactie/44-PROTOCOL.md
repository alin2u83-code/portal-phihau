# Faza 44 — PROTOCOL (siguranță pentru toate migrările)

Proiect Supabase: `wuhidifzsutwgdfkwhmd`. Instrument: Supabase MCP (`execute_sql`, `apply_migration`). Nu există supabase CLI, docker sau pg_dump pe această mașină.

## Alegerea clonei

Alegere (17.11.2026, răspuns în conversație): **dryrun-tranzactional** (dry-run cu rollback forțat pe baza reală). Backup-uri automate/PITR din Dashboard: **active** (declarat de utilizator, neverificat de mine). Canary: PASSED (vezi "Canary").

### Unde rulează dry-run-ul

| metodă | unde rulează ce |
|---|---|
| dryrun-tranzactional | totul pe proiectul live, într-un singur apel `execute_sql`, cu rollback forțat; dovedit de canary |
| branch-supabase | DDL, compilarea funcțiilor, pg_depend și verificarea scriptului de rollback pe branch; măsurătorile care depind de date (numere egale cu cele aprobate, checksum) NU pot rula pe un branch fără date: rulează ca dry-run cu rollback forțat pe proiectul live, exact ca la dryrun-tranzactional (canary obligatoriu pentru această parte) |
| proiect-restaurat | totul rulează întâi pe proiectul restaurat (id-ul lui se notează aici), inclusiv repetiția rollback-ului; numerele se compară cu live la momentul restaurării; abia apoi se aplică același fișier de migrare live, după OK |

## Stare backup

Creat 17.11.2026 cu `sql/maintenance/faza44_backup.sql`, într-un singur apel (atomic). Verificat: count și md5 (string_agg ordonat) egale cu live pentru toate 8 tabelele (egal = true).

| tabel | rânduri | md5 (primele 8) |
|---|---|---|
| plati | 978 | 8e7e96da |
| tranzactii | 400 | 0a9dff7d |
| tranzactie_plata | 412 | ed430dd3 |
| obligatii_plata | 159 | a7740ff6 |
| incasari_efective | 83 | 3fd4b8bb |
| alocari_plati | 83 | 820dbd36 |
| plata | 50 | f3472466 |
| catalog_pret | 2 | b40d9582 |

`definitii`: functie 14, trigger 7, view 20, politica 28, coloane 40.
Securitate: `has_schema_privilege` pentru anon și authenticated = false; RLS activ pe toate tabelele din schema, fără politici.
Notă: acest snapshot devine învechit la prima schimbare de date; fiecare migrare își ia snapshot proaspăt `pre_<plan>_<tabel>` (vezi Aplicare).

Restaurare după id: `INSERT INTO public.<t> SELECT * FROM backup_faza44.<t> WHERE id = '<uuid>'` pentru rând șters; `UPDATE public.<t> SET <coloana> = b.<coloana> FROM backup_faza44.<t> b WHERE b.id = public.<t>.id AND b.id IN (<lista id>)` pentru rânduri schimbate. Niciodată restaurare „în orb" a unei tabele întregi.

## Dry-run

Test pe date reale fără persistare:
1. Corpul migrării FĂRĂ liniile `begin;`/`commit;`.
2. Urmat de un bloc de aserțiuni; ultima instrucțiune e un `DO $$ ... RAISE EXCEPTION 'DRYRUN_RESULT: %', <jsonb cu măsurători> $$;`.
3. Totul într-UN SINGUR apel `execute_sql` (o tranzacție implicită). Măsurătorile se citesc din textul erorii.
4. Apoi un SELECT simplu care dovedește că nimic nu a persistat (numere și checksum-ul invariant egale cu cele luate înainte).

Condiția de bază: metoda a fost dovedită de canary (mai jos). Planurile 44-10 și 44-11 re-rulează canary-ul chiar înainte de dry-run-urile lor distructive.

### Canary

Rulat 17.11.2026, rezultat PASSED. Un singur apel `execute_sql`:

```sql
CREATE SCHEMA IF NOT EXISTS zz_canary_faza44;
CREATE TABLE zz_canary_faza44.t (x int);
INSERT INTO zz_canary_faza44.t VALUES (1);
DO $$ BEGIN RAISE EXCEPTION 'DRYRUN_RESULT: canary'; END $$;
```

Rezultat așteptat și observat: eroare `P0001: DRYRUN_RESULT: canary`. Apoi:

```sql
select count(*) from information_schema.schemata where schema_name='zz_canary_faza44';
```

Observat: 0. Deci un apel `execute_sql` multi-instrucțiune rulează într-o tranzacție care se anulează la eroare; nimic nu persistă. Planurile 44-10 și 44-11 re-rulează acest canary înainte de dry-run-urile lor.

## Invarianti standard

Înainte și după orice migrare: md5 pe `plati` (id, suma, suma_initiala, status, suma_ramasa, tip, data, sportiv_id, familie_id) și pe `tranzactii` (id, suma, data_platii, metoda_plata, sportiv_id, familie_id). Trebuie să fie egale, EXCEPTÂND coloanele pe care migrarea chiar vrea să le schimbe; în acel caz numărul de rânduri schimbate trebuie să fie egal cu numărul precalculat.

## Aplicare

1. OK explicit al utilizatorului (checkpoint).
2. Snapshot PROASPĂT imediat înainte de orice migrare care schimbă sau șterge date: `CREATE TABLE backup_faza44.pre_<plan>_<tabel> AS TABLE public.<tabel>` pentru fiecare tabel atins, `ENABLE ROW LEVEL SECURITY` fără politică, `REVOKE ALL ... FROM anon, authenticated`, count și md5 comparate cu live. Primul snapshot din 44-02 devine învechit.
3. Blocul de rollback al migrării restaurează din snapshot-ul proaspăt sau din id-urile înregistrate la aplicare.
4. `apply_migration` cu numele fișierului.
5. Se re-rulează invarianții.

## Verificare live

După fiecare aplicare: `pg_trigger` live (`tgenabled = 'O'` pentru fiecare trigger atins, mai ales cele de pe `tranzactie_plata` dezactivate în migrare și triggerul SMS `trg_plata_sms`); numărul de politici din `pg_policies` pe tabelele atinse egal cu cel dinainte (dacă migrarea nu schimbă politici); ACL funcții (`has_function_privilege` pentru anon și authenticated = false pe funcțiile de trigger); `prosecdef`/`proconfig` ale funcțiilor înlocuite.

## Rollback

Fiecare migrare are un bloc `-- Rollback:`. Rollback-ul de date restaurează din `backup_faza44` după id, niciodată „după ghicit". Rollback-ul de obiecte restaurează textul din `backup_faza44.definitii` sau din fișierul `rollback/` al planului.

## Teste efemere

Prefix `ZZ_TEST_FAZA44_`, client service-role ca în `tests/rls_definer_garzi_bani_faza37.ts`, curățare în `finally`, 0 rânduri reziduale, se tipăresc doar id-uri și numere.

## Reguli

1. Nicio migrare a fazei nu face UPDATE pe `plati.status` (`trg_plata_sms` trimite SMS).
2. O migrare care dezactivează un trigger folosește `begin; ... commit;` explicit; verificarea live de după confirmă `tgenabled = 'O'`.
3. Fără `DROP ... CASCADE`; se verifică întâi `pg_depend`.
4. `CREATE OR REPLACE VIEW` resetează `security_invoker`: orice înlocuire de view declară `WITH (security_invoker = true)` când view-ul live îl avea.
5. Fiecare fișier de migrare: `git add -f` (supabase/ e în .gitignore); antetul spune NEAPLICATA până când planul de aplicare îl trece la `APLICATA LIVE <data>`.
6. 3NF: fără denormalizare; singura excepție permisă, scrisă în antetul migrării, este `plati.club_id` din 44-03.
7. Windows: execuție inline, fără worktree.
