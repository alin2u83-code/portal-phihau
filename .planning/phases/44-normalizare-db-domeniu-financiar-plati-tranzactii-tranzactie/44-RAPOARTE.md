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

## R0b. Test sintetic migrarea B v2 (18.11.2026, rollback forțat, baza reală)
Rulat după review: B rescrisă într-un singur bloc `DO` (fără begin/commit), schema `backup_faza44` creată dacă lipsește, alocare doar pe facturi existente, cu plafon (fără „ultimul primește restul”), rest nealocat logat în `backup_faza44.faza44_b_nealocat`.
Cazuri (rânduri sintetice, anulate prin rollback):
| caz | așteptat | observat |
|---|---|---|
| T1: [P1(100), orfan, P2(50)], suma 120 | P1 100, P2 20, nealocat 0 | P1 100, P2 20, nealocat null (0) |
| T2: [P3(30), orfan], suma 100 | P3 30 (ultimul existent, plafonat), nealocat 70 | P3 30, nealocat 70 |
| T3: [orfan], suma 40 | 0 inserări, nealocat 0 | 0, 0 |
| T4: [P4(200, deja alocat 150)], suma 100 | P4 50 (plafon), nealocat 50 | P4 50, nealocat 50; total alocat pe P4 = 200 (nedepășit) |
Trigger `tranzactie_plata_change_trigger` după bloc: tgenabled 'O'. Log: 4 rânduri inserate. După rollback: plati 978, tranzactii 400, tranzactie_plata 412, 0 rânduri test, 0 tabele log, trigger 'O'.
Netestat: a doua rulare consecutivă (idempotență) — logica e filtrul `not exists tranzactie_plata`; rularea efectivă dublă nu a fost exersată.

## R1. Plăți fără club după migrarea A (decizie D-03)
18.11.2026, read-only. **0 rânduri** cu `club_id IS NULL` (erau 96; backfill A: 90 din sportivi + 6 din familii, user 17.11). Nu e nimic de decis la D-03; trigger-ul completează clubul la insert-uri noi. Rămâne de rezolvat în 44-09 doar dacă `NOT NULL` se pune: cazul "fără sportiv/familie/club" reușește încă cu NULL (testat în 44-05).

## R2. suma_ramasa per club și grup
Convenție: suma = total, suma_ramasa = rest. Așteptat: Achitat -> 0, Anulat -> 0, altfel max(suma - alocări, 0). Cluburi marcate după lista candidat din 44-VERIFICARE (neconfirmată de user). Doar id-uri/sume.

| club (prefix id) | tip | grup | facturi | suma facturi | diferență abs. | exemple (prefix id) |
|---|---|---|---|---|---|---|
| 83e7f771 | CANDIDAT_REAL | G1 | 69 | 7390 | - | 9eddc7aa, 174bbf34, a46e7d23, cf938015, 33670cdb |
| cbb0b228 | CANDIDAT_REAL | G1 | 7 | 1250 | - | 785be34f, bd28a48c, 3a58466f, c7db2305, 6aa3dfc7 |
| cbb0b228 | CANDIDAT_REAL | G4 | 5 | 1320 | 1320 | 26e66a3f, e0a18b55, 31bb0d6f, 9a14ae19, 16e1d4c9 |
| 99aaa7ed | de confirmat/TEST | G1 | 1 | 220 | - | ddda681d |

Totaluri: **G1 77 facturi / 8860 RON** (76 pe sportiv = 8640, 1 pe familie = 220; 69 entități distincte); **G2 0; G3 0; G4 5** (Anulat cu suma_ramasa nenulă, 1320 RON, toate Phi Hau). Cluburile TEST nu au alte grupe.
- Efect vizibil în UI: G2 = 0 deci nimic vizibil din suma_ramasa; G1 nu schimbă ce văd userii (statusul Achitat e autoritar în `restDePlata`) dar ar schimba soldul la `backfill_istoric`; G4 invizibil în UI (Anulat -> 0).
- Efect `backfill_istoric` pe sold: crește cu exact suma facturilor G1 pe entitate (8860 RON total, 69 entități; clubul 83e7f771: 7390, cbb0b228: 1250, 99aaa7ed: 220).
- Bani nealocați (avans) existenți: cbb0b228 3 tranzacții / 670 RON; 83e7f771 3 tranzacții / 510 RON. Pot acoperi doar parțial G1 (8860).
- G2 primit alocări în migrarea B: 0 (B nu a inserat nimic).
- **Față de audit (96 desincronizate, 93 Achitat fără alocare):** G2=G3=0 acum, G1=77. NU am verificat de ce diferă: G1 de aici cere suma > 0.01 (exclude facturile cu sumă 0), iar G2 exclude rândurile Achitat și compară cu restul așteptat; nu am reprodus definiția exactă din audit și nu am investigat dacă migrările 20261023a/b au reconciliat între timp. Dacă vrei, o aliniez înainte de decizie.

## R3. Tipuri de plată
`plati.tip`: Abonament 527, Taxa Examen 206, FRQKD 201, FRAM 37, Taxa Stagiu 7. `tipuri_plati`: Abonament, Taxa Examen, Taxa Stagiu, Taxa Competitie, Echipament, Taxa FRQKD, Taxa FRAM.
Mapare propusă tip -> tipuri_plati: Abonament -> Abonament; Taxa Examen -> Taxa Examen; Taxa Stagiu -> Taxa Stagiu; FRQKD -> Taxa FRQKD; FRAM -> Taxa FRAM (5/5 au corespondent, 978 rânduri); Taxa Competitie și Echipament nu au rânduri în plati.
Coloane moarte: `tip_plata` constantă 'Abonament' pe toate 978 rândurile; `tip_plata_id` și `tip_abonament_id` 0 rânduri nenule.
Opțiuni: **Y** = `plati.tip` rămâne singura coloană de tip; drop `tip_plata`, `tip_abonament_id`, `tip_plata_id` în 44-10 (fără schimbări UI, fără redundanță nouă). **X** = populez `tip_plata_id` din mapare, `tip` copie tranzitorie sincronizată prin trigger (excepție 3NF scrisă) până la refactorul UI. Recomandare: **Y** acum, X într-o fază viitoare cu refactorul UI.

## R4. Sold (frontend) versus rest (DB)
Script `tests/sold_vs_rest_faza44.ts` (read-only), pe toate cluburile; datoria implicită de sold = max(-sold, 0) vs suma suma_ramasa a facturilor neanulate ale entității.
- 83e7f771 (CANDIDAT_REAL): 128 entități, 58 diferă (G1 57, avans 1, alte 0).
- cbb0b228 (CANDIDAT_REAL): 105 entități, 10 diferă (G1 5, avans 0, **alte 5, neexplicate**).
- Toate cluburile TEST: 0 diferențe.
Concluzie, **propunere SC-03, neconfirmată de utilizator**: ambele numere rămân; `soldService` = sold net per entitate inclusiv avansuri, `suma_ramasa` = rest per factură; frontendul nu recalculează restul per factură (`restDePlata` citește cache-ul). Diferențele observate sunt explicate de facturile G1 (Achitat fără încasare, numărate ca datorie de sold) și de avans (1 entitate); cele 5 "alte" de la cbb0b228 nu sunt investigate (posibil legate de cele 5 facturi G4 Anulat sau de familii) și rămân neexplicate.

## R5. luna/an față de dată (informativ, audit #7)
1 factură cu luna/anul diferite de data; 4 facturi de tip Abonament fără luna/an. Nicio acțiune propusă în această fază.

### R4b. Cele 5 entități neexplicate de la cbb0b228 (investigat 18.11.2026, read-only)
Toate 5 (3 sportivi, 2 familii) au facturi **Achitat a căror sumă ≠ suma alocărilor** (grup nou, "G5", nedefinit în plan): facturi cu suma 0 dar alocări 100/200/220 (6 rânduri la 4 entități), o factură 330 cu doar 250 alocat, trei facturi la o familie (0->300, 300->330, 330->300). Nicio nepotrivire de atribuire tranzacție/factură (entitate diferită) și o singură alocare pe factură Anulat (100 RON). Diferența de sold vs suma_ramasa = Σsuma(Achitat) − încasat, deci apare exact când o factură Achitat are suma modificată după plată (reduceri, scutiri, convenția 20261023). Ids și sume exacte pe cerere. Nu se modifică nimic; G5 nu are acțiune în planul curent.
