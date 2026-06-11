# Raport Test Import Examene — 2026-06-11

## Scop
Testare Playwright a fluxului de import examene din portal PhiHau.
Fișiere sursă: `D:\Qwan Ki Do\examene total\` (44 fișiere .xls + 2 CSV).

---

## Arhitectura Import (2 fluxuri distincte)

### Flux 1: Import Bulk Examen (pagina principală Gestiune Sesiuni Examen)
- **Componentă**: `components/GestiuneExamene/ImportExamenModal.tsx`
- **Acceptă**: `.csv` (Format Propriu / Format Grilă / Format Federație)
- **Creează**: sesiune nouă + locație + înscrieri + actualizare grad
- **Duplicate**: detectează prin `sportiv_id + sesiune_id` — face UPDATE dacă există
- **Match sportivi**: similarity Jaccard pe nume+prenume (prag 0.7 fuzzy, 1.0 exact)

### Flux 2: Import XLS (din interiorul unei sesiuni)
- **Componentă**: `components/GestiuneExamene/ImportExcelExamen.tsx`
- **Acceptă**: `.xls` / `.xlsx`
- **Serviciu parsare**: `services/importExcelExamenService.ts`
- **Formate detectate automat**:
  - 1 sheet → `ex_local` (Phi Hau - Ex. Local - YYYY.MM.DD.xls)
  - N sheet-uri → `examen_grad` (examen de grad YYYY.MM.DD.xls)
- **Match grad**: 7 pași (ordine exact → normalizat → alias explicit → alias auto → prefix+număr → prefix+inițială → fuzzy Levenshtein)
- **Match sportiv**: Levenshtein normalizat, prag exact ≥0.95, fuzzy 0.7–0.95, nou <0.7
- **Duplicate**: upsert pe `sportiv_id + sesiune_id`

---

## Test 1: Import Bulk cu CSV „_import.csv"

### Fișier testat
`Phi Hau - Ex. Local - 2023.12.19_import.csv` (1.4 KB, 31 rânduri)

### Rezultat inițial — EȘEC
```
31 erori: "Rând incomplet. Toate coloanele sunt obligatorii."
```
**Cauza**: Coloana `Data_Examen` goală în toate rândurile CSV.

### Conținut CSV original (exemplu)
```csv
Nume,Prenume,CNP,Grad_Nou_Ordine,Rezultat,Contributie,Data_Examen,Sesiune_Denumire,Localitate
BEREZENCO,CEZAR ANTONIO,,10,Admis,60,,Iarna,IASI
MOLDOVANU,IOANA REBECA,,10,Admis,60,,Iarna,IASI
```

### Fix aplicat
Înlocuit `,,Iarna,` cu `,2023-12-19,Iarna,` în toate rândurile.
```powershell
$content = Get-Content "..._import.csv" -Encoding UTF8
$fixed = $content | ForEach-Object {
    if ($_ -match '^Nume,') { $_ }
    else { $_ -replace ',,Iarna,', ',2023-12-19,Iarna,' }
}
```

### Rezultat după fix — SUCCES ✅
- **31/31 găsiți exact** (similarity = 1.0 pe nume)
- **0 conflicte**, 0 sportivi noi
- **Sesiune nouă creată**: Iași - C.S. Phi Hau - 19.12.2023, status Programat
- **31 ADMIȘI**, 0 în așteptare, 0 respinși
- Modal s-a închis automat (onImportComplete + onClose)

---

## Bug #1 — Data_Examen goală în fișierele _import.csv

**Severitate**: BLOCKER pentru import bulk cu format propriu  
**Unde**: Fișierele `*_import.csv` din `D:\Qwan Ki Do\examene total\`  
**Cauza probabil**: Script de conversie extern generează CSV fără Data_Examen  
**Manifestare**: 31 erori "Rând incomplet" la procesare, buton Import dezactivat

### Soluții posibile
1. **Fix la export** (recomandat): dacă aplicația generează `_import.csv`, să includă data sesiunii
2. **Fix la import** (fallback): dacă `Data_Examen` goală + format propriu → afișează câmp override dată (ca la Format Grilă/Federație)

**Fișier afectat**: `components/GestiuneExamene/ImportExamenModal.tsx` linia 366:
```typescript
if (!row.Nume || !row.Prenume || !row.Grad_Nou_Ordine || !row.Sesiune_Denumire || !row.Data_Examen || !row.Localitate) {
    return { ...baseRow, status: 'error', message: 'Rând incomplet. Toate coloanele sunt obligatorii.', ... };
}
```

---

## Observații suplimentare

### Sincronizare (28)
Pe sesiunea nou creată (19.12.2023) apare buton "Sincronizare (28)" — 28 sportivi cu grad neactualizat în profilul lor față de ce s-a importat. De investigat dacă e normal sau bug.

### Sesiunea Iarna 2023-12-19 vs sesiunea existentă
Sesiunea 19.12.2023 era nouă (nu exista în DB). Dacă s-ar fi importat a doua oară același CSV:
- Sesiunea NU s-ar recrea (verificare `localSesiuni.find(s => s.data === ... && s.nume === ...)`)
- Înscrierile ar face UPDATE (nu INSERT duplicat) prin verificarea `inscrieriSet`

### Flux Import XLS (neefectuat complet în această sesiune)
Flux 2 (Import XLS din sesiune) nu a fost testat cu `.xls` real.  
Fișier pregătit: `.playwright-mcp/test-examen-grad-2017.xls` (copie din `examen de grad 2017.01.21 (Phi Hau).xls`)  
De testat: duplicat sportiv, grad nerecunoscut, format multi-sheet.

---

## Fișiere de test copiate în .playwright-mcp/
| Fișier | Sursă | Scop |
|--------|-------|------|
| `test-import-2023.csv` | `Phi Hau - Ex. Local - 2023.12.19_import.csv` | original cu Data_Examen goală |
| `test-import-2023-fixed.csv` | idem + fix dată | import bulk reușit |
| `test-examen-grad-2017.xls` | `examen de grad 2017.01.21 (Phi Hau).xls` | test flux Import XLS |

---

## Status final sesiune de test

| Test | Status | Note |
|------|--------|------|
| Import Bulk — creare sesiune nouă | ✅ PASS | sesiune Iași 19.12.2023 creată |
| Import Bulk — import 31 sportivi | ✅ PASS | toți găsiți exact |
| Import Bulk — CSV cu dată goală | ❌ BUG | Data_Examen obligatorie, fișier invalid |
| Import XLS — format ex_local | ⏳ NEPTESTAT | de continuat |
| Import XLS — format examen_grad | ⏳ NETESTAT | de continuat |
| Duplicate sportiv la re-import | ⏳ NETESTAT | de continuat |
| Grad nerecunoscut | ⏳ NETESTAT | de continuat |

---

## TODO sesiune viitoare
1. Fix bug Data_Examen: permite override dată la Format Propriu
2. Test Import XLS cu `test-examen-grad-2017.xls`
3. Test re-import același CSV (verificare duplicate sesiune + înscrieri)
4. Investigat "Sincronizare (28)" pe sesiunea 19.12.2023
5. Simplificat ghidul de import din modal (cerință utilizator)
