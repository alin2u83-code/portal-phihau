# Quick 261119-ihl — detalii club vizibile doar pentru super admin si admin club

Decizii utilizator (19.11.2026):
- Ascund: `cif`, `perioada_gratie_zile`, `factura_automata_inscriere`. Raman publice (authenticated): `id, nume, oras, federatie_id, theme_config, tema_config, logo_url, slug`.
- Doar super admin si admin club (clubul lui) vad/scriu detaliile. Instructor/sportiv/extern: nu, nici la clubul propriu.
- Abordare: tabel nou `cluburi_detalii` 1:1 (3NF), nu column privileges (ar rupe `cluburi(*)` din login).
- Schimbari de schema in valuri: backup + migrare reversibila + test pe clona; aplicare live doar cu OK.

## Stare live verificata (read-only, 19.11.2026)
- `cluburi`: 37 randuri; `cif` nenul 8; `perioada_gratie_zile` NOT NULL default 30 (37); `factura_automata_inscriere` true la 1.
- Depinde de coloane: view `rbv_cluburi_detaliu`. Nicio functie, trigger sau politica nu le refera (query pe prosrc/pg_policies).
- Consumatori cod: ClubSettings.tsx (cif), CluburiManagement.tsx (cif: formular, duplicat `.eq('cif')`, lista), Plati/TipuriAbonament.tsx (gratie, factura auto), Sportivi/index.tsx:478 (factura auto la inscriere), Plati/PlatiScadente.tsx:213 (gratie), hooks/useDataProvider.ts:400 (selecteaza `cif`), types.ts (Club.cif, perioada_gratie_zile, factura_automata_inscriere), view rbv_cluburi_detaliu.

## Atentie (regresii posibile)
1. `Sportivi/index.tsx:478` citeste `factura_automata_inscriere` pentru orice rol care inscrie un sportiv. Un INSTRUCTOR care inscrie ar primi `null` => factura automata NU se mai genereaza, fara eroare. Decizie necesara: RPC SECURITY DEFINER `factura_automata_activa(club_id)` (boolean, garduit pe acces la club) SAU factura automata doar pentru admin.
2. `PlatiScadente.tsx:213` citeste `clubs[].perioada_gratie_zile`, dar `useDataProvider` nu o selecteaza => azi foloseste mereu 30 (bug latent). Dupa mutare: citire din `cluburi_detalii` pentru admin.
3. `CluburiManagement`: verificarea de duplicat pe CIF se face cu un select pe `cluburi.cif` (RLS: super admin vede tot; OK dupa mutare doar cu SELECT pe `cluburi_detalii`).
4. View `rbv_cluburi_detaliu`: recapturat `pg_get_viewdef` inainte de DROP COLUMN; FARA CASCADE.

## Valuri
### Val 1 — DB aditiv (nu sterge nimic) — NEAPLICAT, cere OK
Migrare `supabase/migrations/20261119a_cluburi_detalii.sql` (`git add -f`):
- `CREATE TABLE cluburi_detalii (club_id uuid PRIMARY KEY REFERENCES cluburi(id) ON DELETE CASCADE, cif text, perioada_gratie_zile integer NOT NULL DEFAULT 30, factura_automata_inscriere boolean NOT NULL DEFAULT false)`; `ENABLE ROW LEVEL SECURITY`.
- Backfill din `cluburi` (toate cele 37 randuri). Copiere, coloanele vechi ramane.
- Politici: SELECT/INSERT/UPDATE/DELETE doar `is_super_admin()` sau admin club al `club_id` (reutilizeaza helperul existent de acces club + rol ADMIN_CLUB); RESTRICTIVE `NOT este_doar_extern()` ca la restul tabelelor.
- Rollback: `DROP TABLE cluburi_detalii;` (coloanele vechi neatinse).
- Backup: `CREATE TABLE backup_...` snapshot `cluburi` inainte. Test pe clona.

### Val 2 — frontend (citeste/scrie din `cluburi_detalii`)
ClubSettings, CluburiManagement, TipuriAbonament, PlatiScadente, Sportivi/index.tsx (dupa decizia din Atentie 1), useDataProvider (scoate `cif`), types.ts. Teste: unit pe helperi + verificare in browser pe 4 roluri.

### Val 3 — DB destructiv — doar dupa Val 2 verificat in productie, cere OK separat
`DROP COLUMN` cif/perioada_gratie_zile/factura_automata_inscriere din `cluburi`; recreat `rbv_cluburi_detaliu` (join pe cluburi_detalii); fara CASCADE; header migrare APLICATA.

## Verificare dupa fiecare val
- RLS pe 4 roluri + extern: SPORTIV/INSTRUCTOR/extern nu citesc `cluburi_detalii` (0 randuri); ADMIN_CLUB doar clubul propriu; SUPER_ADMIN toate.
- `select('*, cluburi(*)')` la login nu contine cif/setari dupa Val 3.
- Review separat (code-reviewer) pe fiecare val, inainte de commit/push.
