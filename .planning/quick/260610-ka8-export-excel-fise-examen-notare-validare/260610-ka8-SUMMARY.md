---
quick_id: 260610-ka8
status: complete
date: 2026-06-10
commit: 380b989
---

# Summary: Export Excel Fișe Examen

## Done

- `services/exportExamenService.ts` — `generateNotare()` + `generateValidare()` using xlsx 0.18.5
- `components/GestiuneExamene/ExportExamenModal.tsx` — modal with ComisieEditor + 2 download buttons
- `DetaliiSesiune.tsx` — "Export Fișe" button added to header toolbar
- `ManagementInscrieri.tsx` — "Export Fișe" button added to Participanți Înscriși header

## Format details

**Notare (federation):**
- Sheet name: "Total"
- Rows 0-12: header (federation title, club, date, localitate, comisia 3 rows)
- Rows 14-15: split headers (Nr, NUME/PRENUME, Club, Grad sustinut, Tehnica/Doc/Song/Thao/Nota)
- Data rows: nr, sportiv_nume, sportiv_prenume, blank club, grad_sustinut, 5 empty note cols
- Sorted: grad ordine DESC, then alpha by name

**Validare (local):**
- Sheet name: "T Ex locale"  
- Rows 0-8: header (federation title, club, date, localitate, comisia)
- Row 9: headers (Nr, Nume/Prenume Sportiv, Gradul sustinut, Admis/Respins, Contributia, Obs)
- Data rows: nr, "Nume Prenume" combined, grad_sustinut, 3 empty cols
- Same sort order

## TypeScript
Only 2 pre-existing errors in `ui.tsx` (unrelated) — no new errors.
