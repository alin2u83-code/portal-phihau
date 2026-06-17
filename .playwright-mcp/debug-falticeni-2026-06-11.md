# Debug Import XLS — Fișiere Fălticeni
**Data:** 2026-06-11
**Fișiere testate:** 5 XLS (17.01.2024, 15.01.2025, 11.06.2025, grade-albastre-11.06.2025, 14.01.2026)

---

## Structura fișierelor Fălticeni

Toate 5 au format **identic** — multi-sheet:
| Sheet | Conținut | Relevant? |
|-------|----------|-----------|
| `Inscrieri` | Lista sportivi înscriși (Nr, Nume, CNP, Grad) | NU — nu are rezultate |
| `St National` | Stagiu național | NU |
| `St.CoVoDao` | Stagiu CoVoDao | NU |
| `T Ex locale` | **Tabelul examenelor locale** — date reale | **DA** |
| `Fisa instructorului` | Fișa clubului | NU |

### Sheet `T Ex locale` — structura:
- **row 5**: `["","","BEFU CODRUT","","Data:","","17.01.2024",...]` → Data la col 6
- **row 6**: `["","Comisia de examinare:","MAXIM MARIUS","","Localitatea:","","FALTICENI",...]` → Localitate la col 6
- **row 7-8**: comisie (col 2)
- **row 9**: HEADER: `Nr | NUME/PRENUME | Gradul sustinut | Admis Respins | Contributia | | Obs.`
- **row 10+**: date: `[nr, "GRIGORAS ROBERT ALEXANDRU", "1 CAP R", "admis", 60, ...]`

### Sheet `Inscrieri` — structura:
- **row 7**: HEADER: `Nr | NUME/PRENUME | Cod Numeric Personal | Grad | Observatii`
- **row 8+**: date: `[nr, "ANICULAIESEI SEBASTIAN", "", "", ...]` — fără grad, fără rezultat

---

## Bug detectat

### Cauza: `detectFormat` greșit

```typescript
// services/importExcelExamenService.ts:473-478
function detectFormat(wb: XLSX.WorkBook): FormatExcel {
    const sheetNames = wb.SheetNames;
    if (sheetNames.length === 1) return 'ex_local';  // Fălticeni are 6-7 sheets
    return 'examen_grad';                              // ← DETECTAT GREȘIT
}
```

### Efecte în UI (Playwright debug):
- Format afișat: **"Examen Grad"** (greșit)
- Data/Localitate/Club: **"—"** (nimic extras)
- **0 găsiți exact, 7 nesiguri, 60 inexistenți**
- Buton "Continuă" dezactivat

### Ce parsează `parseExamenGrad` din fișierele Fălticeni:
1. **Sheet `Inscrieri`** (header la row 7 cu "Nr"+"Grad"):
   - Col 1 = Nume complet (ex: "ANICULAIESEI SEBASTIAN") → citit ca `numeFamily`
   - Col 2 = CNP (gol) → citit ca `numeGiven`
   - Grad = din sheet name "Inscrieri" → `matchGrad("Inscrieri")` = null
   - **~51 sportivi parsați incorect**

2. **Sheet `T Ex locale`** (header la row 9 cu "Nr"+"Gradul"):
   - Col 1 = Nume complet → citit ca `numeFamily`
   - Col 2 = Gradul ("1 CAP R") → citit ca `numeGiven` **GREȘIT**
   - Grad = din col gradIdx (Gradul sustinut) — poate funcționa parțial
   - **~67 sportivi parsați parțial incorect**

3. Total: **~118 rânduri** în loc de **~67** din `T Ex locale`

---

## Ce trebuie modificat

### Fișier: `services/importExcelExamenService.ts`

#### 1. `detectFormat` — adaugă detecție format Fălticeni
```typescript
function detectFormat(wb: XLSX.WorkBook): FormatExcel {
    const sheetNames = wb.SheetNames;
    if (sheetNames.length === 1) return 'ex_local';
    // Fălticeni / Federație Local: multi-sheet cu 'T Ex locale'
    if (sheetNames.includes('T Ex locale')) return 'ex_local';
    return 'examen_grad';
}
```

#### 2. `parseExLocal` — adaugă suport pentru multi-sheet cu 'T Ex locale'
```typescript
function parseExLocal(wb, sportivi, grade): RezultatParsare {
    // ÎNAINTE: const ws = wb.Sheets[wb.SheetNames[0]];
    // DUPĂ:
    const sheetName = wb.SheetNames.includes('T Ex locale')
        ? 'T Ex locale'
        : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    // ... restul funcției rămâne identic
}
```

#### 3. Date format DD.MM.YYYY → YYYY-MM-DD
Fălticeni stochează data ca string "17.01.2024" (nu serial Excel).
`String(rawDate).slice(0, 10)` → `"17.01.2024"` (string, format greșit pentru DB).

```typescript
// Adaugă helper:
function parseDateDMY(raw: string): string {
    const m = raw.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return raw.slice(0, 10); // fallback ISO
}

// Folosit în loc de String(rawDate).slice(0, 10):
metadata.data = typeof rawDate === 'number' && rawDate > 30000
    ? excelDateToString(rawDate)
    : parseDateDMY(String(rawDate));
```

#### 4. Metadata: localitate la col 6, nu col 1 (Fălticeni)
`parseExLocal` caută "Localitatea:" și ia `row[c+1]` sau `row[c+2]`.
În Fălticeni: "Localitatea:" e la col 4, localitate la col 6 = `row[c+2]`. **Deja funcționează** (c+2 = col 6). ✓

### Fișier: `components/GestiuneExamene/ImportExcelExamen.tsx`

#### 5. Mojibake în titlu modal și buton
- Titlu: `"Import XLS â€" Sesiune Examen"` → `"Import XLS — Sesiune Examen"`
- Buton: `"â† Înapoi"` → `"← Înapoi"`
- Descriere format: adaugă "sau Tabel Fed. Local (multiple sheet-uri cu T Ex locale)"

---

## Prioritate implementare

| # | Modificare | Impact | Risc |
|---|-----------|--------|------|
| 1 | `detectFormat` + `parseExLocal` sheet selector | **CRITIC** — fără asta import nu funcționează | Mic — 2 linii |
| 2 | `parseDateDMY` helper | Mediu — data sesiunii greșită | Mic — 5 linii |
| 3 | Mojibake modal titlu+buton | Cosmetic | Mic |

---

## Fișiere Fălticeni testate
| Fișier | Sportivi în T Ex locale | Obs |
|--------|------------------------|-----|
| falticeni-17.01.2024.xls | ~67 | grad "1 CAP R" etc |
| falticeni-15.01.2025.xls | ~68 | structură identică |
| falticeni-11.06.2025.xls | ~60 | structură identică |
| falticeni-grade-albastre-11.06.2025.xls | ~60 | "GRADE ALBASTRE" în titlu |
| falticeni-14.01.2026.xls | ~70 | "FĂLTICENI" cu diacritice în row 4 |

Toate 5 au **aceeași structură** → fix unic funcționează pentru toate.
