---
phase: 33
plan: 10
status: complete
executed: 2026-10-05
requirements: [TA-04, TA-06, TA-07, TA-08, TA-12, TA-16]
key-files:
  created:
    - tests/rls_taxe_anuale_faza33.ts
    - tests/flux_taxe_anuale_faza33.ts
commits:
  - 3899d50 test(33-10): test live izolare cross-club si refuzuri RPC
  - 5fdd8f2 test(33-10): test live flux complet de bani
---

# 33-10 — Teste live PostgREST: izolare cross-club + flux complet de bani

Doua scripturi rulate cu `npx tsx` pe API-ul live (client anon autentificat cu user efemer + header `active-role-context-id`, exact calea browserului). Ambele au iesit cu **exit 0**: 42/42 si 30/30 verificari PASS, zero urme canar, zero defecte DB/RPC.

Date canar: prefix `ZZ_TEST_FAZA33_`, perioada 2099 (+ perioadele curente 2026 doar pentru F1), cont efemer sters prin `auth.admin`. Cheile nu apar in output. Decontul real FRQKD 2025 al C.S. Phi Hau a fost doar citit (neschimbat: 2720 / 17 / Platit / Cash / confirmat / 17 legaturi). Numaratorile inainte = dupa in ambele rulari: plati FRQKD+FRAM 54, vize 54, deconturi 1, decont_sportivi 17, taxa_anuala_config 1.

## F1 — tabela sursa si actorul inserarii

- Tabela sursa folosita: **`stagii_cvd_participare`** (coloane obligatorii: `sportiv_id`, `data`, `arma`; celelalte au default).
- Insertul a mers **ca ADMIN_CLUB prin PostgREST** (nu a fost nevoie de fallback service role). Trigger-ul `trg_taxa_anuala_stagii_cvd` a activat taxele: viza FRQKD sezon 2026 facturata (Neachitat, 170, descriere `FRQKD Sezonul 2026-2027`), viza FRAM 2026 **in asteptare** (pretul FRAM 2026 nu e inca setat in `taxa_anuala_config`; singurul rand live = FRQKD 2026 = 170).
- Observatie (in afara scopului, neasertata): politica live de INSERT pe `stagii_cvd_participare` verifica doar rolul (ADMIN_CLUB/federatie) fara a scopa clubul sportivului, deci un ADMIN_CLUB poate insera acolo pentru sportivi din alt club (declansand taxa pentru acel sportiv). Merita un todo ulterior de RLS (similar cu riscul rezidual din Faza 25).

## Test 1 — `tests/rls_taxe_anuale_faza33.ts` (42 PASS, 0 FAIL)

Context: ADMIN_CLUB@CLUB_A (Kim Long Dao), INSTRUCTOR@CLUB_A, fara header; canar in CLUB_B (sportiv + viza + factura + decont 2099 + decont_sportivi).

| # | Verificare | Rezultat |
|---|-----------|----------|
| 1 | vize_sportivi: 0 randuri CLUB_B; viza canar B invizibila; nicio viza B in lista; viza proprie vizibila | PASS (x4) |
| 2 | deconturi_federatie: 0 randuri CLUB_B; decontul canar 2099 si decontul real FRQKD 2025 invizibile | PASS (x2) |
| 3 | decont_sportivi: 0 randuri pentru decontul canar si pentru cel real 2025 | PASS (x2) |
| 4 | INSERT direct deconturi_federatie / vize_sportivi / decont_sportivi -> 42501 | PASS (x3) |
| 5 | UPDATE vize_sportivi scutit=true (proprie + CLUB_B) -> 0 randuri, scutit ramas false | PASS (x2) |
| 6 | UPDATE deconturi_federatie (CLUB_B) -> 0 randuri, suma neschimbata | PASS |
| 7 | taxa_anuala_config: INSERT -> 42501; UPDATE -> 0 randuri, pret 170 neschimbat; DELETE -> 0 randuri | PASS (x3) |
| 8 | genereaza_taxe_anuale(CLUB_B) / seteaza_scutire_taxa(sportiv B) / inregistreaza_plata_federatie(CLUB_B) -> 42501; viza B ramasa nescutita | PASS (x4) |
| 9 | inregistreaza_plata_federatie(CLUB_A, [sportiv B]) -> P0001; mesajul nu contine prefixul/numele canar; niciun decont creat | PASS (x3) |
| 10 | activeaza_taxa_anuala / activeaza_taxa_sportiv / factureaza_viza_taxa / proceseaza_taxe_in_asteptare prin /rpc -> 42501; nicio viza creata | PASS (x5) |
| 11 | raport_taxe_anuale_cluburi(FRQKD,2099) ca ADMIN_CLUB@A: exact 1 rand, club_id=CLUB_A (nr_sportivi 1, facturati 1) | PASS (x2) |
| 12 | INSTRUCTOR@A: genereaza / plata / scutire -> 42501; raport -> 0 randuri | PASS (x4) |
| 13 | Fara header: genereaza -> 42501; raport -> 0 randuri; anon neautentificat refuzat | PASS (x3) |
| 14 | Nicio viza canar scutita de apelurile refuzate | PASS |
| 15 | Numaratori inainte=dupa; baseline FRQKD 2025 neschimbat; cleanup complet | PASS (x3) |

## Test 2 — `tests/flux_taxe_anuale_faza33.ts` (30 PASS, 0 FAIL)

Context: ADMIN_CLUB@CLUB_A efemer, S1..S4 canar 'Activ', pret FRQKD 2099 = 170 (service role), fara pret FRAM 2099.

| Pas | Verificare | Rezultat |
|-----|-----------|----------|
| F1 | inscriere (stagii_cvd_participare) -> viza FRQKD 2026 facturata 170 Neachitat; viza FRAM 2026 in asteptare | PASS (x4) |
| F2 | genereaza FRQKD 2099 [S1..S4] -> facturat 4; reapel -> exista 4; 4 facturi Neachitat 170, descriere corecta | PASS (x3) |
| F3 | genereaza FRAM 2099 [S1,S2] -> in_asteptare 2; dupa pret FRAM 2099 = 100 -> 2 facturi Neachitat 100 (trigger de procesare) | PASS (x5) |
| F4 | scutire S3 cu motiv -> stare scutit, factura Anulat, viza scutita cu motiv + scutit_de | PASS (x2) |
| F5 | S1 Achitat (service role); plata federatie [S1,S2] -> decont Platit, confirmata, 340, 2 participanti, Transfer Bancar; 2 decont_sportivi x 170 cu plata_id | PASS (x3) |
| F6 | [S2] virat -> P0001; [S3] scutit -> P0001; [S4] -> a doua plata 170 reuseste; fara urme din refuzuri (2 deconturi, 3 decont_sportivi) | PASS (x4) |
| F7 | S2: decont_sportivi + factura Neachitat, vizibil si prin clientul ADMIN_CLUB (conditia BannerViratNeachitat) | PASS (x2) |
| F8 | raport FRQKD 2099 CLUB_A: nr_sportivi 4, nr_scutiti 1, nr_facturati 3, suma_facturata 510, suma_achitata_club 170, suma_restanta_club 340, nr_virati 3, suma_virata 510, suma_de_virat 0 | PASS (x4) |
| — | Numaratori inainte=dupa, baseline 2025 neschimbat, zero viza/factura pe sportivii canar | PASS (x3) |

## Deviations from Plan

- Rule 3 (neglijabil): `record()` din testul RLS nu arunca la primul esec (colecteaza toate rezultatele, exit 1 la orice FAIL); testul de flux se opreste la primul esec (pasii depind unul de altul). Cleanup ruleaza in `finally` in ambele cazuri.
- Adaugat (peste plan): DELETE pe `taxa_anuala_config`, INSERT direct in `vize_sportivi`/`decont_sportivi`, `seteaza_scutire_taxa`/`inregistreaza_plata_federatie` ca INSTRUCTOR, anon neautentificat, verificarea ca apelurile refuzate nu lasa urme, numaratori inainte/dupa si baseline FRQKD 2025.
- Pregatirea canar in testul RLS apeleaza `activeaza_taxa_sportiv` cu service role (functia ramane apelabila de service_role, refuzata pentru authenticated).

## Known Stubs

Niciunul.

## Threat Flags

Niciun suprafata noua. Mitigari T-33-47..50 verificate: prefix canar + 2099 + cleanup in `finally` cu verificare zero urme (T-33-47), user efemer sters si verificat (T-33-48), fara chei in output (T-33-49), decontul 2025 doar citit si neschimbat (T-33-50).

## Self-Check: PASSED

- tests/rls_taxe_anuale_faza33.ts, tests/flux_taxe_anuale_faza33.ts exista; commit-uri 3899d50 si 5fdd8f2 exista.
