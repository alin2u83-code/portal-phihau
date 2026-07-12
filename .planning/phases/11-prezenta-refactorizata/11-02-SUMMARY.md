---
plan: 11-02
status: complete
commit: 7a7b364
date: 2026-06-19
---

# Summary: Plan 11-02 — Calendar-all + Grupe Simultane

## Ce s-a făcut

**Task 1 — FormularPrezentaMultiGrupa** (`ListaPrezentaAntrenament.tsx`):
- Export nou `FormularPrezentaMultiGrupa` — preia array de antrenamente simultane
- Deduplicare sportivi din toate grupele; fiecare apare o singură dată în UI
- Badge per sportiv: PRINCIPALĂ (indigo) sau SECUNDARĂ (purple) per grupă
- Decizie PRZ-03 LOCKED: salvare prezență DOAR în antrenamentul grupei principale (sportiv.grupa_id === ant.grupe.id); fallback determinist la primul antrenament dacă nicio grupă principală nu e în set
- Salvare secvențială `for...of await` — evită race condition / eroare 23505

**Task 2 — Navigare index.tsx**:
- View type extins: `'calendar-all'` și `'prezenta-multi'`
- Import `CalendarActivitatiMultiGrupa` și `FormularPrezentaMultiGrupa`
- State `antrenamenteMulti` pentru grupe simultane
- Handler `handleSelectMultipleAntrenamente`: ids.length===1 → single flow; altfel fetch cu `grupa_id` în select sportivi → setAntrenamenteMulti → navighează la 'prezenta-multi'
- 3 shortcut-uri noi în tab Grupe: Calendar Toate Grupele, Generator Program, Raport Interval Examen
- `case 'calendar-all'`: randează CalendarActivitatiMultiGrupa cu onSelectMultiple
- `case 'prezenta-multi'`: randează FormularPrezentaMultiGrupa

## Criterii acoperite

- PRZ-02: click pe zi în calendar-all → direct la form prezență (fără Orar→Calendar)
- PRZ-03: grupe simultane afișate împreună, salvate o singură dată per grupă principală
- PRZ-04: Generator accesibil direct din tab Grupe

## Zero erori TS
