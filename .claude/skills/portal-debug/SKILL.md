---
name: portal-debug
description: >
  Skill de intake/triage pentru portal-phihau. Colectează cerințele în seturi progresive de întrebări
  înainte de orice modificare de cod, prevenind regresii și features dispărute.
  FOLOSEȘTE OBLIGATORIU când utilizatorul spune: "repară", "fix", "nu merge", "dispare",
  "nu funcționează", "a dispărut", "nu se vede", "s-a stricat", "schimbă", "adaugă",
  "modifică", "vreau să", "cum fac", "problema la", "ajută-mă cu", "nu afișează",
  "eroare la", "bug în", sau orice altceva legat de modificarea, repararea sau
  extinderea funcționalităților din portal-phihau (portal QwanKiDo / PhiHau).
---

# Portal-PhiHau Intake & Triage

## Regulă de bază

**NU deschide niciun fișier și NU scrie niciun cod până SET 4 nu este confirmat.**

Dacă utilizatorul încearcă să sară peste întrebări cu "fă direct" — reamintește-i că o clarificare de 2 minute previne o oră de reparații ulterioare.

---

## SET 1 — Orientare generală

Pune **ambele** întrebări din SET 1 în același mesaj.

```
SET 1 — Orientare

1. Cu ce modul lucrăm?
   □ Sportivi (liste, profiluri, import CSV/Excel, familii)
   □ Examene (sesiuni, rezultate, grade, promovări)
   □ Plăți (portofel, facturi, restanțe, taxe anuale, jurnal)
   □ Competiții (inscrieri, probe, categorii, stagii)
   □ Grupe & Orar (grupe, program săptămânal, antrenamente)
   □ Prezență (înregistrare prezență, calendar, rapoarte lunare)
   □ Dashboard / Navigare / Layout general
   □ Autentificare / Roluri / Permisiuni
   □ Altul: _______________

2. Ce tip de task este?
   □ Bug — ceva nu funcționează cum ar trebui
   □ Regresie — funcționa înainte, acum a dispărut sau s-a stricat
   □ Feature nou — vreau să adaug o funcționalitate
   □ Modificare — vreau să schimb un comportament existent
   □ Aspect vizual / UI — arată greșit sau vreau alt design
```

---

## SET 2A — Bug sau Regresie

Folosit când tipul din SET 1 este **Bug** sau **Regresie**.

```
SET 2A — Detalii problemă

3. Descrie exact ce se întâmplă acum (comportament actual):
   _______________

4. Ce ar trebui să se întâmple în schimb (comportament așteptat):
   _______________

5. Există vreun mesaj de eroare?
   (consolă browser F12, toast roșu în aplicație, ecran alb, altceva)
   □ Da: _______________
   □ Nu văd niciun mesaj de eroare

6. A funcționat cândva?
   □ Da → când aproximativ a încetat să funcționeze? _______________
   □ Nu știu
   □ Nu, nu a funcționat niciodată

7. Ce s-a modificat în aplicație înainte să apară problema?
   (cod nou, alte bugfixuri, schimbări recente)
   □ Da: _______________
   □ Nu știu / nu am modificat nimic

8. Se întâmplă mereu sau doar în anumite condiții?
   □ Mereu, indiferent de utilizator sau date
   □ Doar cu anumite roluri: _______________
   □ Doar cu anumite cluburi sau date specifice: _______________
   □ Intermitent, uneori da uneori nu
```

---

## SET 2B — Feature nou sau Modificare

Folosit când tipul din SET 1 este **Feature nou** sau **Modificare**.

```
SET 2B — Detalii feature / modificare

3. Descrie în detaliu ce vrei să facă sau cum vrei să se comporte:
   _______________

4. Cine vede sau folosește această funcționalitate?
   □ SUPER_ADMIN_FEDERATIE
   □ ADMIN_CLUB
   □ INSTRUCTOR
   □ SPORTIV
   □ Mai multe roluri: _______________

5. Unde în UI trebuie să apară?
   (pagina exactă, buton / meniu / modal / tabel / card)
   _______________

6. Există ceva similar deja în aplicație pe care să ne bazăm?
   □ Da: _______________
   □ Nu
   □ Nu știu

7. Ce date trebuie să afișeze, să salveze sau să calculeze?
   _______________
```

---

## SET 2C — Aspect vizual / UI

Folosit când tipul din SET 1 este **Aspect vizual / UI**.

```
SET 2C — Detalii vizuale

3. Descrie ce arată greșit sau ce vrei să arate altfel:
   _______________

4. Pe ce dispozitiv apare problema sau vrei modificarea?
   □ Desktop
   □ Mobil
   □ Tabletă
   □ Toate

5. Există un screenshot sau poți descrie precis elementul afectat?
   (ex: "butonul albastru din dreapta sus din pagina Sportivi")
   _______________

6. Ce componentă sau pagină este afectată?
   _______________
```

---

## SET 3 — Scope Protection

**Mereu obligatoriu**, după orice SET 2. Pune toate întrebările din SET 3 în același mesaj.

```
SET 3 — Ce NU se atinge

9. Ce module sau funcționalități NU trebuie să se schimbe?
   (listează tot ce funcționează și trebuie să rămână intact)
   Exemple: "navigarea înapoi din wizard", "importul CSV", "calculul soldului"
   _______________

10. Există date sau utilizatori specifici pentru care totul trebuie să funcționeze?
    □ Da: _______________
    □ Nu, orice utilizator/date

11. Cât de liber ești cu fișierele de infrastructură?
    (types.ts, ui.tsx, DataContext, NavigationContext, useDataProvider, supabaseClient)
    □ Ferește-te de ele — modifică doar modulul cerut
    □ Poți atinge doar dacă e absolut necesar, cu confirmare prealabilă
    □ Poți modifica orice e nevoie
```

---

## SET 4 — Confirmare și Sumar

**Mereu ultimul.** Generează sumarul și cere confirmare explicită înainte de orice cod.

```
SET 4 — Sumar de înțelegere

Pe baza răspunsurilor tale, înțeleg că:

• Modulul afectat: [X]
• Tipul task: [Bug / Regresie / Feature / Modificare / UI]
• Problema / Cerința: [descriere concisă]
• Cauza probabilă: [dacă poate fi dedusă] / [necesită investigație]
• Voi modifica: [fișiere și componente specifice]
• NU voi atinge: [fișiere / module protejate]
• Criteriu de succes: [ce trebuie să funcționeze la final]

Confirmi că am înțeles corect, sau ai corecturi?
```

**Abia după "Da" sau confirmare explicită → deschid fișiere și scriu cod.**

---

## Reguli suplimentare

- Dacă răspunsul la o întrebare e neclar sau incomplet → repune acea întrebare specific, nu presupune
- Dacă problema pare să afecteze un fișier din zona de risc ridicat (useDataProvider, DataContext, NavigationContext, types.ts, ui.tsx) → anunță explicit înainte de a atinge
- La final, după implementare, verifică explicit criteriul de succes din SET 4
- Dacă apare ceva neașteptat în cod care ar extinde scope-ul → oprește și anunță utilizatorul înainte de a continua
