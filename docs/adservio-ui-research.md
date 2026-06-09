# Adservio UI Research — Note & Absențe

Capturat: 2026-06-09 | Tool: Playwright v3  
Fișiere brute: `scripts/adservio-output/` (`.png` + `.html` + `.json`)

---

## 1. Stack tehnic Adservio

- **Framework UI**: React cu **Chakra UI** (toate componentele au prefix `chakra-`)
- **Tabel**: `chakra-table` + `chakra-table__container`
- **Modal**: `chakra-modal__content` / `chakra-modal__overlay` / `chakra-modal__body`
- **Formulare**: `chakra-input`, `chakra-checkbox`, `chakra-switch`, `chakra-textarea`
- **Catalog elev vechi**: jQuery UI Dialog (`ui-dialog`) — pagini legacy nemodernizate
- **Navigație**: butoane `chakra-button css-womzi7` fără `<a>` — SPA pur

---

## 2. Structura navigație profesor

URL bază: `https://www.adservio.ro/ro/`

| Item meniu | URL |
|-----------|-----|
| Panou principal | `/ro/dashboard` |
| Calendar | `/ro/calendar` |
| Mesaje | `/ro/messages` |
| Fișiere | `/ro/files` |
| Istoric | `/ro/history` |
| Grupuri | `/ro/groups` |
| Bibliotecă | `/ro/library` |
| **Catalog materie** | `/ro/classes/subject/{cmcID}` |
| **Catalog elev** | `/ro/teacher/student/class_book/{classID}/{studentID}` |
| Management clasă | `/ro/classes/management/{classID}/students` |
| Teme | `/ro/homework/list?cmcID={id}&page=1&sanID={id}` |
| Scutiri | `/ro/classes/{classID}/exemptions/subject/{subjectID}` |

---

## 3. Pagina catalog materie (profesor) — `/ro/classes/subject/{id}`

**Fișier capturat**: `p02-dashboard.*`, `p03-introducere-note.*`

### Tabel principal
```
# | Elev | Note | Absențe | Activitate | Medie | [Acțiuni]
```
- 31 elevi per clasă
- Clasa CSS tabel: `chakra-table css-y9jytv`
- Coloana Note afișează: `10 13 X | 10 28 XI | 10 21 V` (valoare + data + tip)
- Coloana Medie: `Anuală: 10`
- Coloana Acțiuni: buton dropdown per elev

### Sub-tab-uri în pagina materie
- **Note** — formular inline în tabel
- **Absențe** — formular inline în tabel  
- **Statistici** → `/ro/classes/management/{id}/statistics`
- **Teme** → `/ro/homework/list`
- **Scutiri** → `/ro/classes/{id}/exemptions/subject/{id}`
- **Diplome elevi** → `/ro/main-documents/student-diplomas/class/{id}`

---

## 4. Formular introducere note (profesor)

**Fișier capturat**: `p02-dashboard-structure.json` (modal deschis)  
**Tip**: Modal Chakra UI cu titlu `"Notează clasa — VI A • Educaţie fizică"`

### Câmpuri modal notare clasă
| Input | Name | Tip | Detalii |
|-------|------|-----|---------|
| Data notei | `notaData` | date picker | placeholder "Selectează..." |
| Valoare notă globală | `notaValoareForm` | number | aplicat tuturor bifați |
| Tip evaluare | — | tab/button | **Oral / Test / Proiect** |
| Nota per elev | `grades.student_{ID}` | number | câte un input per elev |
| Checkbox elev | — | checkbox | bifezi elevii care primesc nota |

### Pattern UX notare
1. Selectezi **data**
2. Selectezi **tipul** (Oral / Test / Proiect)
3. Introduci **nota globală** SAU note individuale per elev
4. Bifezi elevii care primesc nota
5. Buton **Aplică**

---

## 5. Formular introducere absențe (profesor)

**Fișier capturat**: `p03-introducere-note-structure.json` (form absențe inline)  
**Tip**: Form inline în pagina catalogului (nu modal), activat printr-un tab/buton

### Câmpuri form absențe
| Input | Name | Tip | Detalii |
|-------|------|-----|---------|
| Data absenței | `absData` | date picker | placeholder "Selectează..." |
| Selectează toți | `selectAll` | checkbox | bifează/debifează toți elevii |
| Absent elev N | — | checkbox | câte un checkbox per elev |
| Observații | `absObs` | textarea | placeholder "Scrie aici..." |
| Motivată | `absExcused` | switch (toggle) | `chakra-switch__input` |

**Modal absențe** (alternativ): titlu `"Absent clasă — VI A • Educaţie fizică"`  
Conține același pattern: dată + selectAll + checkbox per elev + obs + motivat

---

## 6. Catalog per elev (profesor) — `/ro/teacher/student/class_book/{classID}/{studentID}`

**Fișier capturat**: `p06-form-adauga-absenta.*`

### View-uri disponibile
- **BLOC** (default) — `/class_book/{classID}/{studentID}` — tabel per materie
- **LINIAR** — `/class_book/{classID}/{studentID}/1` — format liniar

### Structura view BLOC
**25 tabele** — câte unul per materie + sumar:

```
[Materie] — header tabel
Rând 1: Absențe | [coloane semestru I/II]
Rând 2-5: Note (cu dată și tip)
Rând 6: Medie semestrială
```

**Tabel sumar** la final:
```
Total absențe:
  - Absențe nemotivate: 13
  - Absențe motivate: X

Medie:
  - Anuală: 7.53
```

### Filtre disponibile (form `main-filters`)
| Select | Name | Conținut |
|--------|------|----------|
| An școlar | `ascID` | `2025/2026`, `2026/2027`, ... |
| Clasă | `clID` | `0 A`, `I A`, `II B`, ... |
| Elev | `elevID` | lista elevilor clasei |

### Clase CSS catalog legacy (jQuery UI)
```
catalog_absent, catalog_nota, catalog_medie_anuala
catalog_rand_0..4, catalog_elev, catalog_teza
catalog_testare_speciala, ctlg_elev_cifre, ctlg_elev_colMedie
add-absence-grade-btn (btn orange)
```

### Buton acțiuni per materie
```html
<button class="btn orange add-absence-grade-btn">+</button>
```

---

## 7. Report card profesor — `/ro/report-card?ascID=&clID=&sanID=`

**Fișier capturat**: `p07-catalog-elev.*`

### Tabel
```
Materie | Calificative | Activitate | Medie generala | Prob. Ascultare
```
- 9 materii listate
- URL params: `ascID` (an școlar) + `clID` (clasă) + `sanID` (școală)

---

## 8. View elev/parinte — `/ro/report-card/attendance`

**Fișier capturat**: `e01-dashboard.*`

### Constatare importantă
**View elev = view parinte** — URL identic, date identice, UI identic.  
Diferența: help link → `/ro/elev-parinte/` vs `/ro/profesor/`

### Navigație elev/parinte (diferă față de profesor)
| Item | URL |
|------|-----|
| Panou principal | `/ro/dashboard` |
| Portofoliu | `/ro/portfolio` |
| Calendar | `/ro/calendar` |
| Mesaje | `/ro/messages` |
| Fișiere | `/ro/files` |
| Grupuri | `/ro/groups` |
| **Note** | `/ro/report-card?ascID=&clID=&sanID=` |
| **Absențe** | `/ro/report-card/attendance?ascID=&clID=&sanID=` |
| Scutiri | `/ro/report-card/exemptions` |

### Tabel absențe elev
```
Materie | Absențe
```
- 10 materii
- Read-only — fără acțiuni

### Tabel scutiri elev (`/ro/report-card/exemptions`)
```
[checkbox] | Tip | Dată început | Dată sfârșit | Zile lucrătoare | Zile weekend | Abs. motivate | Adăugat
```

---

## 9. Patterns UX cheie observate

### Pattern 1 — Notare simultană pe clasă
Un singur modal cu **data + tip + valoare globală + checkbox per elev**.  
Profesorul poate nota toți elevii cu același calificativ dintr-o acțiune.

### Pattern 2 — Absențe cu selectAll
Form inline cu **dată + selectAll + checkbox per elev + motivat (toggle)**.  
`selectAll` bifează/debifează toți elevii instant.

### Pattern 3 — Catalog dual-view
Același catalog per elev în două formate: **BLOC** (materie-card) și **LINIAR** (tabel unic).  
Toggle în header pagina, URL param `/1` activează LINIAR.

### Pattern 4 — Filtre cascadă
`ascID` → `clID` → `elevID` — select-uri dependente, ultimul activ restul disabled.

### Pattern 5 — Elev = Parinte (aceeași pagină)
Nu există pagini separate. Rolul determină ce acțiuni sunt vizibile, nu ce date sunt afișate.

---

## 10. Relevanță pentru portal-phihau

| Feature Adservio | Echivalent portal-phihau | Status | Notă |
|-----------------|--------------------------|--------|------|
| Catalog materie cu tabel `# \| Elev \| Note \| Absențe \| Medie` | Prezență.tsx + GestiuneExamene | Parțial | Lipsesc Note în tabelul de prezență |
| Modal notare clasă cu checkbox per elev | GestiuneExamene — înregistrare note | Parțial | Nu există notare simultană |
| Form absențe cu selectAll + toggle motivat | Prezenta/index.tsx | Existent | Verificat |
| Catalog per elev BLOC (tabel per materie) | Profil sportiv → Examene tab | Nu există | De creat |
| Catalog per elev LINIAR | — | Nu există | De creat |
| View elev = view parinte (same URL) | SportivDashboard | Existent | Rol determină acțiuni |
| Filtre cascadă an/clasă/elev | useSortConfig + filtre existente | Parțial | Lipsește cascada |
| Report card rezumat `Materie \| Calificative \| Medie` | — | Nu există | Potențial pentru dashboard sportiv |
| Scutiri per elev | — | Nu există | Echivalent: motivare absențe |

---

## 11. Screenshots disponibile

| Fișier | Conținut |
|--------|----------|
| `p02-dashboard.png` | Catalog materie — tabel elevi cu note+absențe+medie |
| `p03-introducere-note.png` | Același catalog cu form absențe activ |
| `p04-form-adauga-nota.png` | Tab statistici rapide per elev |
| `p05-introducere-absente.png` | Pagina Istoric (navigat greșit) |
| `p06-form-adauga-absenta.png` | Catalog per elev BLOC — 25 tabele materii |
| `p07-catalog-elev.png` | Report card cu Materie+Calificative+Medie |
| `e01-dashboard.png` | View elev/parinte — absențe per materie |
