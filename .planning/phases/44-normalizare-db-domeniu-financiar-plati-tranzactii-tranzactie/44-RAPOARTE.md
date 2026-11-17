# Faza 44 — RAPOARTE

## R0. Clasificare tranzactii: plata_ids vs tranzactie_plata

Data: 18.11.2026, read-only (SELECT + dry-run cu rollback). Toată baza (400 tranzacții). "Club real" = cele 2 clubluri candidate din 44-VERIFICARE (C.S. Phi Hau, Kim Long Dao Falticeni); restul (inclusiv cluburi încă neconfirmate de user în 44-07) = "alt club".

| clasă | semnificație | total | club real (2 candidate) | alt club |
|---|---|---|---|---|
| C0 | array gol, fără tranzactie_plata | 0 | 0 | 0 |
| C1 | array nevid, 0 rânduri tranzactie_plata | 5 | 5 | 0 |
| C2 | array gol, tranzactie_plata există (array învechit, tranzactie_plata câștigă) | 110 | 110 | 0 |
| C3 | ambele nevide, același set de facturi | 283 | 282 | 1 |
| C4 | ambele nevide, seturi diferite (ambiguu, fără acțiune automată) | 2 | 2 | 0 |

Verificare: 5 + 110 + 283 + 2 = 400. Cele 117 "array ≠ join" din audit = 5 (C1) + 110 (C2) + 2 (C4).

Flaguri: M (alocat < suma, rest nealocat) = 1 (id mai jos, e și C4). O (supra-alocat) = 0.

### C1 — toate cele 5 sunt ORFANE (C1o)
Toate 5 au `plata_ids` cu un singur id care NU mai există în `plati` (factura ștearsă). Migrarea B nu are ce aloca (regula din 20261014a sare peste facturi lipsă). Banii rămân în `tranzactii.suma`.

| tranzactie id | suma | club |
|---|---|---|
| 420166b9-24c7-475a-834f-2d941b932a2d | 190 | cbb0b228… (Phi Hau) |
| 9ccb3080-9209-49ca-ad1f-b0a1d4cfa368 | 220 | cbb0b228… (Phi Hau) |
| 9fd3a546-8b24-40ed-8837-de0bd90627a4 | 170 | 83e7f771… (Falticeni) |
| 26aae7dd-aefc-4622-83d0-12aeb5a7d764 | 170 | 83e7f771… (Falticeni) |
| 2f96e9ec-ce91-408d-a8c8-a4d923ed6c70 | 170 | 83e7f771… (Falticeni) |

Total orfane: 920 RON. Întrebare pentru user (nu blochează): sunt încasări reale pentru facturi șterse (ex. șterse la curățarea Falticeni din 9.09.2026)? Lăsate neatinse.

### C4 — ambigue (fără acțiune)
| tranzactie id | suma | sum_tp | n_arr | n_tp | facturi din array (status:suma) | club |
|---|---|---|---|---|---|---|
| c9b844e4-42f1-4b03-8074-9976b03f7ad6 | 200 | 200 | 2 | 1 | Achitat:0, Achitat:0 | cbb0b228… |
| 303a725e-f4eb-4aa9-ab0d-2ba4f335afcd | 360 | 100 | 2 | 1 | Achitat:0, Achitat:100 | cbb0b228… |

Observație: în ambele cazuri `tranzactie_plata` are 1 rând, array-ul are 2 facturi, iar una din ele are suma 0. A doua (303a725e) are 260 RON nealocați (flag M).

### Ce va face migrarea B (20261118b)
- Alocări inserate: **0** rânduri, **0 RON** (dry-run pe baza reală, rollback forțat). Facturi Anulat primitoare: 0; facturi ne-Achitat primitoare: 0.
- Pe datele de azi migrarea B este un no-op idempotent. Rămâne în plan doar ca plasă de siguranță dacă apar C1 reale noi până la aplicare.
- Efectul asupra planurilor 44-06/08: condiția „C1_dupa=0” se citește ca „C1 efectiv=0” (C1 cu cel puțin o factură existentă). Orfanele (C1o) nu blochează. Ajustat în 44-03 și 44-05.

### Observații suplimentare
- `tranzactii.suma_totala/suma_incasata`: 0 rânduri nenule (44-VERIFICARE).
- Tabelul R0 NU conține nume sau descrieri.
