# Raport Investigație Playwright — Import Sportivi Excel — 2026-06-24

## Fișier testat
`PHI HAU - TABEL SPORTIVI ANTRENORI INSTRUCTORI ARBITRI VIZE 2024(2).xlsx`

## Rezumat
| Categorie | Detalii |
|-----------|---------|
| Flux wizard | ✅ 4 pași funcționali (Încărcare → Configurare → Revizuire → Raport) |
| Detecție fișier | ✅ Sheet SPORTIVI detectat, header la rândul 7 |
| Sportivi în fișier | 1 rând real (+ 1 exemplu ignorat corect) |
| Import reușit | ❌ 0 sportivi — 1 EROARE |
| Erori JS consolă | ✅ 0 erori |

---

## BUG CRITIC — Data nașterii cu an 2 cifre

### Simptom
Revizuire Import afișează:
```
EROARE: 1
Se va importa: 0 sportivi
CRĂCANĂ ERIKA IONELA | 2/10/16 | Data nașterii invalida: 2/10/16
```

### Cauza rădăcină
**`index.tsx` liniile 105 și 144:**
```ts
const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: false });
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
```

- `cellDates: false` → XLSX nu convertește la JS Date
- `raw: false` → XLSX formatează valoarea folosind formatul celulei Excel
- Celula Excel are data stocată ca serial `42410` (= 2016-02-10) cu format `M/D/YY`
- Rezultat: `"2/10/16"` (an 2 cifre)

**`importSportiviService.ts` linia 58:**
```ts
const m = rawDate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
```
Regex cere **exact 4 cifre** la an → `"16"` nu se potrivește → eroare.

### Fix recomandat
**Opțiunea 1** (mai sigură) — `cellDates: true` în XLSX.read:
```ts
const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: true });
```
Apoi în maparea coloanelor, convertește Date → ISO string:
```ts
if (value instanceof Date) {
  value = value.toISOString().split('T')[0]; // "2016-02-10"
}
```

**Opțiunea 2** — Extinde regex în serviciu să accepte și 2 cifre:
```ts
const m = rawDate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
const year = m[3].length === 2 ? '20' + m[3] : m[3];
```

---

## Structura fișierului FRAM (informație utilă)

| Sheet | Rânduri date |
|-------|-------------|
| SPORTIVI | 1 rând real (+ 1 exemplu) |
| ANTRENORI | 8 rânduri |
| INSTRUCTORI | 4 rânduri |
| ARBITRI | 4 rânduri |

**Header real** nu e pe rândul 1 — e pe **rândul 8 (index 7)**. Rândurile 1-7 sunt metadata (denumire club, președinte, instrucțiuni). Codul detectează corect header-ul căutând "NUME SPORTIV".

### Coloane IGNORATE de sistem (din fișierul FRAM)
Acestea apar în secțiunea "IGNORATE — SISTEMUL NU LE RECUNOAȘTE" la pasul Configurare:
- `CATEGORIE SPORTIV seniori, tineret, juniori, cadeți, copii`
- `JUDEȚUL`
- `JUDEȚ UNDE ESTE ÎNREGISTRAT CLUBUL`
- `DENUMIRE CLUB`
- `DEPARTAMENT`
- `MAESTRU EMERIT AL SPORTULUI /MAESTRU AL SPORTULUI DA/NU`

Acestea sunt coloane specifice FRAM (federație) fără echivalent în DB-ul portalului. Comportament corect — ignorarea e intenționată.

---

## Flux complet — pași verificați

| Pas | Status | Note |
|-----|--------|------|
| 1. Navigare Import Sportivi | ✅ | Sidebar → Gestiune Membri → Import Sportivi |
| 2. Upload fișier Excel | ✅ | File chooser funcționează, afișează "Fișier selectat: test-import.xlsx (18 KB)" |
| 3. Pas 1 → Pas 2 (Analizează Fișier) | ✅ | Trece la Configurare |
| 4. Configurare — opțiuni | ✅ | "Adaugă sportivi noi" bifat, coloane mapate corect |
| 5. Analizează → (Pas 2 → Pas 3) | ✅ | Trece la Revizuire |
| 6. Revizuire — afișare rezultate | ✅ | Afișează tabel cu erori |
| 7. Import final | ❌ | 0 sportivi de importat din cauza erorii de dată |

---

## Acțiuni de test create
Nicio înregistrare creată în DB (import eșuat cu 0 sportivi).

## Recomandări prioritare

1. **[P1 - BUG]** Fix parsare dată Excel serial → `cellDates: true` în `index.tsx:105` și `index.tsx:144`
2. **[P2 - INFO]** Fișierul FRAM are doar 1 sportiv real — celelalte persoane sunt pe sheet-uri separate (ANTRENORI, INSTRUCTORI, ARBITRI). Dacă se dorește import din toate sheet-urile, e nevoie de feature separat.
3. **[P3 - NICE]** Adăugare suport coloane federație: `CATEGORIE SPORTIV` → mapare la categorie vârstă, `JUDEȚ` → mapare la câmp din profil
