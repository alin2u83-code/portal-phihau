# Faza 44 — Normalizare DB domeniu financiar: CONTEXT

Sursa: `.planning/audit-normalizare-db-20261117.md` (audit read-only 17.11.2026). Regula: 3NF + excepții justificate scris ([CLAUDE.md], memory feedback_normalizare_db_si_refactor).

## Decizii LOCKED (user, 17.11.2026)
- **D-01 Model canonic:** `plati` + `tranzactii` + `tranzactie_plata`. `obligatii_plata` (159), `incasari_efective` (83), `alocari_plati` (83), `plata` (50), `catalog_pret` (2) NU sunt canonice. Se verifică întâi (RPC, edge functions, triggere, date nefolosite în cod — auditul NU a citit RPC), apoi se arhivează și se elimină într-un val FINAL. Nimic nu se șterge fără verificarea RPC.
- **D-02 `tranzactii.plata_ids uuid[]`:** `tranzactie_plata` devine sursa unică. Reconciliere date (117 din 400 neconcordante), mutare citire din cod (`components/Plati/FinancialDashboard.tsx:92`), apoi drop coloană într-un val ulterior.
- **D-03 `plati.club_id`:** backfill din sportiv pentru cele 90 derivabile; cele 6 fără sportiv și fără club => LISTĂ pentru decizia userului (nu se ghicește); apoi NOT NULL; corectare insert-uri fără club_id (`components/CalendarView.tsx:213`, `:243`).
- **D-04 `plati.suma_ramasa`:** convenția rămâne suma=total, suma_ramasa=rest (migrări 20261023a/b). Cele 96 desincronizate + 93 "Achitat" fără alocare => raport pe club (cele 7 cluburi reale separat), userul validează pe grup, abia apoi reconciliere. NU se corectează nimic live fără OK per grup. NU se elimină coloana acum.

## Siguranță (LOCKED)
Backup + migrări reversibile (rollback scris în fiecare migrare) + test pe clonă înainte de live. Aplicare live doar cu OK explicit al userului. Date reale: 7 cluburi (cifrele din audit sunt pe toată baza, 37 cluburi incl. test — raportează separat reale vs test).

## Scope
IN: plati, tranzactii, tranzactie_plata, tipuri (`plati.tip_plata` = "Abonament" pe toate 978 rânduri; `tip_plata_id`, `tip_abonament_id` NULL peste tot; `tip` amestecă tipuri cu FRQKD/FRAM), insert-uri plati unificate (6 locuri inserează fără funcție comună), duplicare calcul sold frontend (`soldService`, `facturaDetaliu`) vs DB, bug probabil `components/Competitii/StagiiCompetitii.tsx:320` (trimite `eveniment_id` inexistent în `plati` — de VERIFICAT, nu rulat).
OUT: istoric_grade/grupe/federatie/tabele duplicate non-financiare (faze ulterioare din același audit), RLS (doar dacă o migrare nouă atinge politici — atunci verifică live `pg_policies`).

## Gotchas din memory
- Migrări noi: `git add -f` (supabase/ e în .gitignore).
- FORCE RLS blochează bypass SECURITY DEFINER; CREATE OR REPLACE VIEW resetează security_invoker; verifică dependințe înainte de DROP CASCADE.
- Verifică live `pg_policies`/triggere, nu doar migrări.
- Execuție: gsd-executor cu worktree eșuează pe Windows; execută inline.
- Convenții anterioare: [[project_plati_conventie_suma_20261023]], soldService unic ([[project_debug_plati_sold_20261007]]).

## Ordine valuri propusă (planner poate rafina)
1 verificare RPC/triggere/dependențe + backup + clonă; 2 club_id (backfill+NOT NULL+insert-uri); 3 plata_ids -> tranzactie_plata; 4 rapoarte suma_ramasa + reconciliere după OK; 5 tipuri plati; 6 arhivare/eliminare modele paralele (după verificare).
