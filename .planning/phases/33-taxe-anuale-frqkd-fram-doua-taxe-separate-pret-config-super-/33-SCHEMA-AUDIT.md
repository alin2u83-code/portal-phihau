# Faza 33 — Audit schema live (phi-hau-db, 2026-10-05)

Rulat inline de orchestrator (subagentii nu au acces MCP Supabase). Doar SELECT-uri. Rezultatele brute
au fost obtinute in 6 interogari combinate; sunt rezumate aici cu valorile relevante (SQL-ul exact e in
istoricul sesiunii). Q1..Q16 din plan acoperite astfel: Q1-Q3,Q5,Q8 (coloane/constrangeri/indexuri/RLS/triggere),
Q6 (functii), Q7 (dependente), Q9-Q13,Q16 (date), Q14 (bypassrls).
Neexecutate separat: Q4 (pg_policies + storage) — se face in 33-03 inainte de rescrierea RLS (plan 03 cere re-interogare).

## Fapte constatate

- `taxa_anuala_config`: coloane id, an_fiscal, suma, created_at; UNIQUE `taxa_anuala_config_an_fiscal_key` (an_fiscal); 1 rand (2026, 170.00).
- `vize_sportivi`: coloane id, sportiv_id, an, plata_id (fara FK), data_platii NOT NULL, status_viza ('Activ'|'Inactiv'|'Suspendat'), observatii, created_at; UNIQUE `uq_viza_sportiv_an` (constrangere + index). 17 randuri (2025, Activ, cu plata_id).
- `decont_sportivi`: id, decont_id (FK ON DELETE CASCADE), sportiv_id (FK RESTRICT), an, created_at; UNIQUE (decont_id,sportiv_id) + index unic `decont_sportivi_sportiv_an_key` (sportiv_id,an). 17 randuri.
- `deconturi_federatie`: index unic `deconturi_federatie_club_an_fiscal_key` (club_id,an_fiscal); CHECK status_plata si metoda_plata; tip_activitate nullable default 'FRQKD'. 1 rand: decont FRQKD 2025 C.S. Phi Hau, Platit/Cash/confirmat, 17 participanti, 2720 lei.
- `notificari`: title NOT NULL, body NOT NULL, sent_by NOT NULL, tip CHECK IN ('mesaj','grad','eveniment','prezenta','document'), recipient_user_id, club_id, tip_destinatar ('INDIVIDUAL'|'CLUB_TOTAL'), titlu, is_read NOT NULL default false.
- `plati`: NOT NULL doar id, suma, data, status, descriere, created_at; status IN (Achitat, Neachitat, Achitat Parțial, Anulat); an CHECK 2020..2100; tip nu are FK; `tipuri_plati` contine deja 'Taxa FRQKD' si 'Taxa FRAM'.
- Functii: `activeaza_taxa_anuala` (SECURITY DEFINER, search_path public,pg_temp, EXECUTE pentru authenticated = true — de revocat), `trg_activeaza_taxa_anuala`, `an_fiscal_federatie`, `has_access_to_club`, `is_super_admin`, `este_staff_club` — toate dupa model (header active-role-context-id). Cele 4 triggere `trg_taxa_anuala_*` exista (inscrieri_examene, stagii_cvd_participare, participare_stagiu[practicant_id], inscrieri_competitie).
- postgres: rolbypassrls = true; RLS activ (relforcerowsecurity = true pe cele 5 tabele).
- Dependente: nicio alta functie in public nu refera cele 4 tabele; 2 view-uri pe deconturi_federatie (`rbv_deconturi_federatie`, `vedere_cluburi_deconturi_federatie`).
- Orfani / duplicate: plata_id orfan 0; decont_sportivi fara viza 0; vize cu sportiv fara club 0; duplicate (sportiv,an) 0.
- `familii.reprezentant_id`, `sportivi.user_id` (248/695 sportivi au cont).

## Baseline FRQKD 2025 (de pastrat identic)

- Decont `e71edebc-1ee1-4b96-b469-4adbb220b67e`: an_fiscal 2025, tip FRQKD, suma_totala 2720, nr_participanti 17, status_plata Platit, metoda_plata Cash, confirmata_federatie true.
- 17 legaturi decont_sportivi (an 2025); 17 vize 2025 cu plata_id; 17 facturi `plati` tip FRQKD, status Achitat, suma totala 2720 (170 x 17).

## Date FRAM existente (descoperire neprevazuta in plan)

37 facturi `plati` tip='FRAM', descriere 'FRAM Anul 2026', create 2026-01-20 ("Generat automat"), C.S. Phi Hau, an NULL, fara viza asociata:
- 3 x 0 lei Achitat (cu tranzactii), 17 x 200 lei Achitat (cu tranzactii), 17 x 200 lei Neachitat. Tip FRAM, nu 'Taxa Anuala'.
→ Backfill obligatoriu (vize tip FRAM an 2026) ca sa nu fie facturate a doua oara si sa apara in situatie.

## Verdict

| ID | Verdict | Nota |
|----|---------|------|
| V1 | GO | `taxa_anuala_config_an_fiscal_key` (constrangere + index) |
| V2 | GO | `uq_viza_sportiv_an` exista; 0 duplicate |
| V3 | GO | `decont_sportivi_sportiv_an_key`, `deconturi_federatie_club_an_fiscal_key` |
| V4 | GO | nicio alta functie nu foloseste ON CONFLICT pe aceste tabele |
| V5 | GO | 0 deconturi 'In asteptare' (singurul decont e Platit) — DELETE-ul din plan sterge 0 randuri |
| V6 | GO | filtru: `tip='FRAM' AND descriere='FRAM Anul 2026' AND status <> 'Anulat'`, an=2026, un rand per sportiv (preferinta Achitat) |
| V7 | GO | notificari: title/body/sent_by NOT NULL; tip='mesaj'; destinatar sportivi.user_id, fallback familii.reprezentant_id -> sportivi.user_id |
| V8 | GO | 0 plata_id orfane |
| V9 | GO | tip_activitate doar 'FRQKD' (1 rand) |
| V10 | GO | postgres bypassrls = true |
| V11 | GO | 'Taxa FRAM' exista in tipuri_plati; plati.tip fara FK |
| V12 | GO | plati.observatii nullable |
