# Quick Task 260709-m7m: Fix 3 bug-uri modul Examene - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Task Boundary

Trei bug-uri in modulul Examene (GestiuneExamene), toate reparate intr-un singur quick task:

1. Diacritice afisate incorect in tabelul de scriere/introducere rezultate examen — verificat via Playwright.
2. Sportiv nou adaugat in DB nu apare in lista pentru sesiune de examen.
3. Grad curent sportiv setat gresit dupa ultimul examen introdus in sistem, in loc de cel mai recent examen PROMOVAT.

</domain>

<decisions>
## Implementation Decisions

### Scope
- Un singur quick task, toate 3 bug-uri impreuna (bug-uri conexe in acelasi modul).

### Diacritice
- Problema e DOAR la afisare (UI rendering) in tabel — datele din DB sunt corecte (nu mojibake).
- NU necesita migrare de date, doar fix de randare (font/encoding/CSS in componenta tabel).
- Verifica fix-ul cu Playwright pe tabelul de scriere/introducere rezultate.

### Sportiv nou nu apare in lista examen
- Lipseste in TOATE cazurile: adaugare individuala, adaugare multipla, si import bulk.
- Cauza probabil comuna (query/filtru la nivel de fetch sportivi eligibili pentru sesiune examen), nu specifica unui singur flux de adaugare.

### Regula grad curent
- Grad curent = gradul cel mai mare din examenele PROMOVATE, ordonate dupa DATA examenului (nu dupa ordinea de introducere/insertie in sistem).
- Bug curent: se seteaza dupa ULTIMUL examen introdus (insertion order), ignorand daca un examen anterior cronologic dar introdus ulterior a promovat un grad mai mare.

### Claude's Discretion
- Cauza tehnica exacta a fiecarui bug (investigare in cod).
- Daca fix-ul necesita modificare query Supabase, trigger SQL, sau logica frontend.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Verificare finala cu Playwright pe partea de scris in tabele (dupa fix diacritice).

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>
