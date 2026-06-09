# Intel: Context

Generated: 2026-06-09
Mode: merge (additive — reference research appended)

---

## Topic: Adservio UI Research — Note si Absente

source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md
Captured: 2026-06-09 | Tool: Playwright v3
Raw artifacts: scripts/adservio-output/ (.png + .html + .json)

### What Adservio is

Adservio (https://www.adservio.ro) este o platforma romaneasca de management scolar.
Este relevent ca referinta de design pentru portal-phihau deoarece:
1. Ambele sunt platforme de management de organizatii (scoala vs club martial arts) cu utilizatori ierarhici (profesor/elev vs instructor/sportiv)
2. Ambele au module de prezenta, note/examene, rapoarte per individ
3. Adservio este produs matur — pattern-urile UX sunt validate pe utilizatori romani

### Stack tehnic Adservio (referinta, nu de adoptat)

- React cu Chakra UI — toate componentele prefixate `chakra-`
- Pagini legacy (catalog elev vechi): jQuery UI Dialog
- Navigatie SPA pura — butoane fara anchor tags, acelasi pattern ca portal-phihau

### Navigatie profesor (URL structure reference)

Adservio organizeaza navigatia profesor in:
- `/ro/classes/subject/{cmcID}` — catalog materie (echivalent: modulul Grupe/Examene)
- `/ro/teacher/student/class_book/{classID}/{studentID}` — catalog per elev (echivalent: Profil Sportiv → tab Examene)
- `/ro/report-card` — report card rezumat (echivalent: dashboard sportiv)
- `/ro/report-card/attendance` — absente per materie (echivalent: Prezenta/index.tsx)

### Pattern notare clasa (modal)

Profesorul noteaza toata clasa dintr-un singur modal:
- Selectie data + tip evaluare (Oral/Test/Proiect) + nota globala
- Checkbox per elev — bifezi doar elevii care primesc nota respectiva
- Buton Aplica → update batch

Relevanta portal-phihau: GestiuneExamene nu are notare simultana. Daca se adauga,
pattern-ul Adservio (modal cu checkbox per sportiv) este referinta UX validata.

### Pattern absente (form inline)

Form inline in pagina catalogului (nu modal):
- Data absenta + selectAll checkbox + checkbox per elev + obs textarea + toggle Motivata
- selectAll bifeaza/debifeaza toti instant
- Modal alternativ cu aceeasi structura disponibil

Relevanta portal-phihau: Prezenta/index.tsx are deja un pattern similar (verificat).
La orice redesign al modului Prezenta, acest pattern este referinta.

### Catalog per elev — dual view

Adservio ofera doua formate pentru catalog per elev:
- BLOC: 25 tabele separate, cate unul per materie (coloana Absente + randuri Note + Medie)
- LINIAR: un singur tabel consolidat, activat via URL param `/1`
Toggle in header pagina, fara reload.

Relevanta portal-phihau: Profil sportiv → tab Examene nu exista inca ca view dedicat.
Daca se creeaza, dual-view BLOC/LINIAR este o optiune UX validata.

### Filtre cascada an/clasa/elev

Form `main-filters` cu trei selecturi dependente:
- ascID (an scolar) → clID (clasa) → elevID (elev)
- Urmatorul select e disabled pana la selectia precedentei

Relevanta portal-phihau: Candidat pentru filtrare v2 (REQ-filtre-cascada-an-grupa-sportiv).
Pattern mai strict decat implementarea curenta (filtre independente).

### Tabel de relevanta directa (gap analysis)

| Feature Adservio | Echivalent portal-phihau | Status |
|-----------------|--------------------------|--------|
| Catalog materie # Elev Note Absente Medie | Prezenta.tsx + GestiuneExamene | Partial — lipsesc Note in tabelul prezenta |
| Modal notare clasa cu checkbox per elev | GestiuneExamene — inregistrare note | Partial — fara notare simultana |
| Form absente selectAll + toggle motivat | Prezenta/index.tsx | Existent — verificat |
| Catalog per elev BLOC | Profil sportiv → Examene tab | Nu exista — de creat |
| Catalog per elev LINIAR | — | Nu exista — de creat |
| View elev = view parinte | SportivDashboard | Existent — rol determina actiunile |
| Filtre cascada an/clasa/elev | useSortConfig + filtre existente | Partial — lipseste cascada stricta |
| Report card rezumat Materie Calificative Medie | — | Nu exista — potential dashboard sportiv |
| Scutiri per elev | — | Nu exista — echivalent: motivare absente |

### Screenshots disponibile (artifacts)

Fisier | Continut
p02-dashboard.png | Catalog materie — tabel elevi cu note+absente+medie
p03-introducere-note.png | Catalog cu form absente activ
p04-form-adauga-nota.png | Tab statistici rapide per elev
p05-introducere-absente.png | Pagina Istoric (navigat gresit)
p06-form-adauga-absenta.png | Catalog per elev BLOC — 25 tabele materii
p07-catalog-elev.png | Report card cu Materie+Calificative+Medie
e01-dashboard.png | View elev/parinte — absente per materie

Toate fisierele brute in: scripts/adservio-output/
