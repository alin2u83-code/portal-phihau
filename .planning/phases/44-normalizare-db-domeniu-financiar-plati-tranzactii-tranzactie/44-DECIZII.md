# Faza 44 — DECIZII

## 44-05
Data: 18.11.2026. Răspuns user (AskUserQuestion, poarta blocking-human): **aplica-A-si-B**.
Numere prezentate: 96 plăți fără club (90 din sportivi + 6 din familii.club_id); C1 brut 5 (toate orfane, 920 RON), C1 efectiv 0; C4 = 2 și flag M = 1, neatinse (tranzactie_plata câștigă, D-02).
Decizie C4/M/O: lăsate neatinse.

Snapshot-uri proaspete (count + md5 egale cu live): backup_faza44.pre_44_05_plati (978), pre_44_05_tranzactie_plata (412), pre_44_05_tranzactii (400).

### Migrarea A (20261118a) — APLICATĂ LIVE
Trigger plati_completeaza_club_id_trg BEFORE INSERT, tgenabled O; funcția prosecdef=false, search_path=pg_catalog, public; EXECUTE false pentru anon și authenticated; club_id NULL 96 -> 0 (96 rânduri schimbate, 0 dintre cele care aveau deja club); checksum plati (suma, suma_initiala, status, suma_ramasa, tip, data, sportiv_id, familie_id) egal cu pre-apply; pg_policies pe plati 7; triggere plati toate O.

### Migrarea B (20261118b) — APLICATĂ LIVE
Triggere toate O (inclusiv tranzactie_plata_change_trigger); C1 efectiv 0; tranzactie_plata 412 (neschimbat, 0 inserate); tranzactii 400; checksum plati egal; 0 tranzacții supra-alocate; faza44_b_inserate 0 rânduri, faza44_b_nealocat 0 rânduri.
Id-uri inserate (rollback key): niciunul.

MIGRARE_B: APLICATA LIVE; C1_dupa=0

## 44-07 Decizii
Data: 18.11.2026 (răspunsuri user în AskUserQuestion). Nimic nu a fost modificat în DB de acest plan.

### D-03: plati fara club
Nu e nimic de decis: R1 = 0 rânduri fără club după migrarea A (au fost 96, backfill 90 sportivi + 6 familii).

### D-04: grupe suma_ramasa
Răspuns user: **lasa toate**.
| club_id | grup | actiune |
|---|---|---|
| 83e7f771-46cf-4c4e-b70f-356d7b0bff06 | G1 | lasa |
| cbb0b228-b3e0-4735-9658-70999eb256c6 | G1 | lasa |
| cbb0b228-b3e0-4735-9658-70999eb256c6 | G4 | lasa |
| toate celelalte cluburi | G1-G4 | lasa (G2 = G3 = 0; un club TEST are 1 factură G1) |
backfill_istoric nu a fost ales pentru nicio combinație.

### SC-01: tipuri
Răspuns user: **Y** (plati.tip rămâne; drop `tip_plata`, `tip_plata_id`, `tip_abonament_id` în 44-10).

### Cluburi reale confirmate
Răspuns user: **doar cele 2 candidate**: cbb0b228-b3e0-4735-9658-70999eb256c6 (C.S. Phi Hau), 83e7f771-46cf-4c4e-b70f-356d7b0bff06 (Kim Long Dao Falticeni). Restul tratate ca TEST/neconfirmate.

### SC-03: sold vs rest
confirmat de utilizator 18.11.2026 (după investigarea R4b): ambele rămân: soldService = sold net per entitate (inclusiv avansuri), suma_ramasa = rest per factură; frontendul nu recalculează restul per factură.

## 44-09
Data: 18.11.2026. **Nicio migrare scrisă sau aplicată.** Nu s-a modificat nimic în DB.
- Migrarea c (D-03): tabelul D-03 nu are rânduri (R1 = 0), deci nu există ASSIGN/DELETE. Rămâne doar `SET NOT NULL` pe `plati.club_id`, **amânat**: planul îl interzice dacă o cale poate ajunge la NULL, iar verificarea per cale nu e completă (vezi mai jos).
- Migrarea d (D-04): "nimic de aplicat (D-04: toate grupele = lasa)".
- Migrarea e (SC-01): opțiunea Y, nu se scrie.
- Migrarea h (backfill_istoric): nealeasă de user.
NOT NULL pe plati.club_id: AMANAT. Motive verificate 18.11.2026:
1. 2 plăți existente nu au nici sportiv_id, nici familie_id (au club_id explicit) -> triggerul nu le-ar putea deriva la inserturi similare.
2. Inserturi directe fără club_id garantat: `PlatiScadente.tsx` (club_id poate fi undefined la familie fără membri activi, review 44-04), `ManagementInscrieri.tsx` (2), `comenziService.ts:533` și `produseService.ts:218` (`input.club_id` nevalidat). Doar `ImportSportiviExamen` și funcțiile DB `factureaza_viza_taxa`, `generare_factura_examen` trimit club_id explicit.
3. Triggerul e SECURITY INVOKER: dacă RLS ascunde sportivul de cel care inserează, club_id rămâne NULL și cu NOT NULL insertul ar pica cu 23502. Testul 44-05 caz 6: INSTRUCTOR e deja refuzat de RLS (42501).
4. `familii` fără club și `sportivi` fără club: 0 live, deci backfill-ul e complet pentru rândurile existente.
Pentru a aplica NOT NULL mai târziu: verificat/forțat club_id la cele 6 căi de mai sus + decizie user.
NEAPLICATA_PE_DECIZIE: 20261118c_faza44_plati_club_id_not_null.sql (nescrisă)
