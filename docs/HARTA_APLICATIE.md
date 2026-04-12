# Harta Aplicației — Portal Phi Hau (QwanKiDo)

> Document master de viziune și planificare. Actualizat: Aprilie 2026.
> Starea curentă: aplicație cu date reale, în testare. Fără urgențe în următoarele 6 luni.

---

## 1. Ce este aplicația

Un portal de management pentru **Federația QwanKiDo** și cluburile afiliate. Gestionează întregul ciclu de viață al unui practicant: înregistrare → antrenamente → examene de grad → competiții → plăți → comunicare.

**Scară țintă:** 35 cluburi, 100+ sportivi per club (3.500+ sportivi total).
**Stare actuală:** 7 cluburi, date reale introduse, în testare.

---

## 2. Arhitectura rolurilor

### Roluri existente

| Rol | Domeniu | Poate șterge? | Vede financiar? | Vede toate cluburile? |
|-----|---------|--------------|----------------|----------------------|
| `SUPER_ADMIN_FEDERATIE` | Tot ce ține de federație | Da | Da (nivel federație) | Da |
| `ADMIN_CLUB` | Tot clubul: examene, prezență, abonamente, echipamente, stagii, competiții | Da (cu confirmare) | Da (nivel club) | Nu (doar clubul său) |
| `INSTRUCTOR` | Sportivi, prezență, examene, încasări | Nu (nevoie de supervisor) | Da (încasări) | Da (toate grupele din club) |

### Roluri noi de implementat

| Rol | Ce face | Ce NU face |
|-----|---------|-----------|
| `ASISTENT_PREZENTA` | Marchează prezența de azi, vede numele sportivilor | Nu vede istoric, nu vede financiar, nu modifică date |
| `PARINTE` | Vede datele copilului/copiilor, plătește abonament online, anunță absență, solicită modificări de date | Nu modifică direct (modificările sunt aprobate de admin club) |
| `ARBITRU` | Vede lista sportivilor + categorii la competiții, înregistrează prestații | Nu vede CNP, adresă sau date financiare |
| `SPORTIV` | Vede date personale, istoric grad, prezențe, plăți proprii, calendar federație | Existent, în funcțiune |

### Reguli per rol — detalii critice

**INSTRUCTOR:**
- Acces la toți sportivii din club (nu doar grupa proprie)
- Poate adăuga și edita sportivi; ștergerea necesită acord ADMIN_CLUB sau SUPER_ADMIN_FEDERATIE
- Poate înregistra încasări (abonamente), nu taxe federale

**PARINTE:**
- Un cont poate fi legat la mai mulți copii, inclusiv din cluburi diferite
- Accesul NU se revocă automat la majoratul copilului (rămâne vizibil oricând)
- Modificările de date personale solicitate de părinte → flux de aprobare admin club
- Poate plăti abonamentul online din contul propriu

**ASISTENT_PREZENTA:**
- Vede doar sesiunea curentă de prezență (nu istoric)
- Vede numele complet al sportivilor pentru a marca ușor prezența

**ARBITRU:**
- Este practicant cu grad (nu persoană separată)
- Vede la competiții: nume sportiv + categorie (fără CNP, adresă, date financiare)
- Viitor: rating arbitru pe baza prestației la teren; grade de arbitru distincte

---

## 3. Harta modulelor

### 3.1 Sportivi
**Stare actuală:** funcțional, cu probleme la import.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| CRUD sportivi | ✅ funcțional | — |
| Import CSV/Excel (diacritice, fără dubluri) | ⚠️ probleme | P1 |
| Grupe primare + grupe secundare | ✅ implementat Apr 2026 | — |
| Arhivare sportiv (nu ștergere) | ⚠️ parțial | P1 |
| Transfer sportiv între cluburi (grade merg cu el) | ❌ lipsă | P3 |
| Cont de părinte legat la sportiv | ❌ lipsă | P2 |
| Cerere echipament din profilul sportivului | ❌ lipsă | P4 |
| CNP cu acces restricționat (mascat, vizibil doar parinte + admin) | ❌ lipsă | P2 |
| Foto sportiv minor — vizibil doar staff | ⚠️ de verificat | P2 |

### 3.2 Grade
**Stare actuală:** nomenclator QwanKiDo existent, grad unic per sportiv.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Nomenclator grade QwanKiDo | ✅ existent | — |
| Perioadă minimă între grade (din nomenclator) | ⚠️ de verificat implementare | P1 |
| Vârstă minimă per grad (din nomenclator) | ⚠️ de verificat implementare | P1 |
| Grade arme (sistem paralel independent) | ❌ lipsă | P2 |
| Grade instructor/antrenor | ❌ lipsă | P3 |
| Grade arbitru + rating prestație | ❌ lipsă | P4 |
| Sportiv poate avea grad QwanKiDo + grad arme + grad instructor simultan | ❌ lipsă | P2 |

### 3.3 Examene
**Stare actuală:** sesiuni de examen funcționale, bug dubluri rezolvat Apr 2026.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Sesiuni de examen local (club) | ✅ funcțional | — |
| Sesiuni de examen federație | ⚠️ parțial | P2 |
| Blocare înscriere dacă grad deja obținut | ✅ fix Apr 2026 | — |
| Validare viză medicală la înscriere | ❌ lipsă | P1 |
| Condiție nr. minim antrenamente (opțional, per instructor) | ❌ lipsă | P2 |
| Condiție perioadă minimă între grade | ❌ lipsă | P1 |
| Import rapid sportivi în sesiune de examen | ⚠️ probleme | P1 |
| Taxa examen — flux club → federație | ⚠️ parțial | P2 |
| Sportiv pică → reinscris la sesiunea viitoare | ✅ posibil | — |

### 3.4 Prezență
**Stare actuală:** funcțional, rapoarte complete.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Marcare prezență per antrenament | ✅ funcțional | — |
| Sportivi secundari în prezență | ✅ implementat Apr 2026 | — |
| Raport lunar + analiză prezențe (cu secundari) | ✅ fix Apr 2026 | — |
| Anunț anticipat prezență/absență de sportiv | ✅ funcțional | — |
| Anunț absență copil de către părinte | ❌ lipsă (rol parinte) | P2 |
| Rol asistent prezență | ❌ lipsă | P2 |
| QR code la prezență | ❌ lipsă | P5 |

### 3.5 Competiții
**Stare actuală:** tipuri de competiție implementate, înscrieri manuale.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Tipuri: tehnică (individual) / luptă (echipe) / luptă regizată (2/3 pers.) | ✅ parțial | — |
| Categorii: vârstă + grad + gen (fără greutate) | ⚠️ parțial | P1 |
| Înscriere automată pe categorii | ❌ lipsă | P2 |
| Validare la înscriere: viză medicală + legitimație plătită + vârstă min. 7 ani | ❌ lipsă | P1 |
| Rol arbitru — vizualizare competiție | ❌ lipsă | P3 |
| Clasament final (introducere manuală) | ❌ lipsă | P3 |
| Statistici competiție / stagiu | ❌ lipsă | P4 |
| Competiție gestionată complet în aplicație (timp real) | ❌ lipsă | P5 |

### 3.6 Stagii
**Stare actuală:** modul există, parțial implementat.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Stagii organizate de federație | ⚠️ parțial | P2 |
| Prezență marcată la stagiu | ⚠️ parțial | P2 |
| Sportivul anunță participarea per grad susținut | ❌ lipsă | P2 |
| Taxă fixă per categorie (independent de prezență) | ⚠️ parțial | P2 |
| Statistici stagiu | ❌ lipsă | P4 |

### 3.7 Plăți și finanțe
**Stare actuală:** plăți manuale, facturi emise de club.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Înregistrare manuală plăți (abonamente) | ✅ funcțional | — |
| Abonament lunar | ✅ funcțional | — |
| Abonament trimestrial / anual | ❌ lipsă | P3 |
| Abonament familie (reducere, politica clubului) | ❌ lipsă | P2 |
| Alertă legitimație expirată (sportiv + instructor) | ❌ lipsă | P1 |
| Legitimație calendaristică (Ian-Dec) | ⚠️ parțial | P1 |
| Legitimație an școlar (Sept-Iun) | ❌ lipsă | P1 |
| Flux club → federație (sume nominale per sportiv per activitate) | ❌ lipsă | P2 |
| Facturi federație → club (vizibil în aplicație) | ❌ lipsă | P2 |
| Centralizare cereri echipamente per club | ❌ lipsă | P4 |
| Plată online Netopia | ❌ lipsă | P4 |

### 3.8 Calendar și comunicare
**Stare actuală:** calendar intern funcțional, fără comunicare automată.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Calendar intern (utilizatori autentificați) | ✅ funcțional | — |
| Evenimente federație vizibile tuturor practicanților | ⚠️ parțial | P2 |
| Email automat (alertă viză expirată, legitimație) | ❌ lipsă | P2 |
| Email bulk (per club / grupă / grad) | ❌ lipsă | P3 |
| Notificări in-app | ⚠️ parțial | P2 |
| Calendar public (fără cont) | ❌ — nu se dorește | — |

### 3.9 Înregistrare online
**Stare actuală:** neimplementată, sportivii se adaugă manual.

| Funcționalitate | Stare | Prioritate |
|----------------|-------|-----------|
| Formular public de înscriere în club | ❌ lipsă | P3 |
| Workflow: cerere → admin club vizualizează → aprobă → creează cont | ❌ lipsă | P3 |
| Notificare admin la cerere nouă | ❌ lipsă | P3 |

---

## 4. Restricții de business — reguli critice

### Grade
- Gradele se iau **în ordine strictă** — nu se poate sări un grad
- **Excepție:** dacă sportivul are o anumită vârstă, poate susține un grad superior (definit în nomenclator)
- Perioadă minimă între grade: **definită în nomenclator**, nu hardcodata
- Grad arme și grad QwanKiDo sunt **sisteme paralele independente**
- Un sportiv poate deține simultan: grad QwanKiDo + grad arme + grad arbitru + grad instructor

### Examene
- **Viză medicală valabilă** — obligatorie; dacă expirată → blocare + alertă vizuală
- **Perioadă minimă de la ultimul grad** — verificată din nomenclator
- **Nr. minim antrenamente** — opțional, configurat per instructor/admin
- Sportiv care pică → poate susține la **sesiunea viitoare**, nu imediat
- Taxa de examen: **clubul colectează și virează la federație**

### Competiții
- **Viță medicală valabilă** — obligatorie la înscriere
- **Legitimație anuală achitată** — obligatorie la înscriere
- **Vârstă minimă:** 7 ani (variabil per tip competiție, definit în competiție)
- Categorii: **vârstă + grad + gen** (fără greutate)
- Tipuri: Tehnică (individual) / Luptă (echipe) / Luptă regizată (perechi 2 sau sincron 3)

### Plăți și legitimații
- **Legitimație calendaristică** (Ian-Dec) și **an școlar** (Sept-Iun) — ambele pot coexista
- Legitimație expirată → **alertă** la sportiv și instructor (nu blocare hard, dar vizibil în aplicație)
- Taxe federale: **fixe**, colectate de club, virate când e necesar (înainte de activități naționale)
- Factura emisă **de club** (spre sportiv); federația emite factură **spre club**

### Date și arhivare
- Sportivii retrași → **arhivați**, nu șterși (istoricul de prezențe, examene, grade se păstrează)
- Cluburile ieșite din federație → **arhivate**
- **Transfer sportiv:** gradele merg cu sportivul; prezențele și plățile rămân la fostul club; fostul club nu mai vede sportivul
- **Ștergere sportiv:** necesită acord ADMIN_CLUB sau SUPER_ADMIN_FEDERATIE

### GDPR și date sensibile
- **CNP:** stocat criptat, vizibil doar PARINTE (al copilului) și ADMIN_CLUB — mascat în UI, acces explicit la cerere
- **Fotografie minor:** vizibilă doar staff (INSTRUCTOR, ADMIN_CLUB, SUPER_ADMIN_FEDERATIE)
- **Date medicale:** stocată doar data expirării vizei medicale
- **Arbitrul** vede la competiții: DOAR nume + categorie (fără CNP, adresă, financiar)

---

## 5. Planul de implementare — Faze prioritizate

### FAZA 1 — Stabilizare critică *(P1 — de făcut primii)*

Acestea sunt fie bug-uri, fie blocante care afectează datele reale deja introduse.

| Task | Modul | Agent |
|------|-------|-------|
| Import sportivi fără dubluri + diacritice corecte | Sportivi | `sportivi-management` |
| Validare viță medicală la înscriere examen | Examene | `examene` |
| Validare perioadă minimă între grade la înscriere examen | Examene | `examene` |
| Alertă legitimație expirată (sportiv + instructor) | Plăți | `plati-facturi` |
| Cele 2 tipuri de legitimație (calendaristică + an școlar) | Plăți | `plati-facturi` |
| Verificare că nomenclator grade are câmpurile: perioadă minimă + vârstă minimă | Grade | `examene` |
| Validare la înscriere competiție: viță + legitimație + vârstă | Competiții | `competitii` |
| Categorii competiție: vârstă + grad + gen (fără greutate) | Competiții | `competitii` |

---

### FAZA 2 — Roluri noi + completare module core *(P2)*

| Task | Modul | Agent |
|------|-------|-------|
| Rol `ASISTENT_PREZENTA` — DB + RLS + UI | Auth + Prezență | `autentificare` + `rls-securitate` |
| Rol `PARINTE` — DB + RLS + legătură copii + UI | Auth + Sportivi | `autentificare` + `sportivi-management` |
| Anunț absență copil de către părinte | Prezență | `prezenta` |
| Modificare date sportiv de către părinte → flux aprobare admin | Sportivi | `sportivi-management` |
| Grade arme — sistem paralel (tabel + nomenclator + UI) | Grade | `examene` |
| Sportiv cu grad multiplu simultan (QwanKiDo + arme) | Grade | `examene` |
| Sesiuni examen federație (distinct de examen local) | Examene | `examene` |
| Flux club → federație: sume nominale per sportiv | Plăți | `plati-facturi` |
| Facturi federație → club (vizibil în aplicație) | Plăți | `plati-facturi` |
| Abonament familie (reducere, politica clubului) | Plăți | `plati-facturi` |
| Stagii: anunț participare per grad + taxă per categorie | Stagii | `competitii` |
| Email automat (alertă viță, legitimație, restanțe) | Comunicare | nou modul |
| Notificări in-app complete | Comunicare | nou modul |
| CNP mascat — acces explicit (parinte + admin) | Sportivi + GDPR | `rls-securitate` |

---

### FAZA 3 — Funcționalități avansate *(P3)*

| Task | Modul | Agent |
|------|-------|-------|
| Rol `ARBITRU` — DB + RLS + vizualizare competiție | Auth + Competiții | `competitii` + `rls-securitate` |
| Clasament final competiție (introducere manuală) | Competiții | `competitii` |
| Transfer sportiv între cluburi (cu grade, fără plăți/prezențe) | Sportivi | `sportivi-management` |
| Înregistrare online — formular + workflow aprobare | Înregistrare | nou modul |
| Email bulk (per club / grupă / grad) | Comunicare | nou modul |
| Grade instructor/antrenor | Grade | `examene` |
| Abonament trimestrial/anual | Plăți | `plati-facturi` |
| Import rapid sportivi în sesiunea de examen | Examene | `examene` |

---

### FAZA 4 — Extinderi și optimizări *(P4)*

| Task | Modul | Agent |
|------|-------|-------|
| Plată online Netopia | Plăți | `plati-facturi` |
| Centralizare cereri echipamente per club | Echipamente | nou modul |
| Statistici competiție și stagii | Rapoarte | `competitii` |
| Grade arbitru + sistem rating prestație | Grade + Competiții | `competitii` |
| Parinte poate plăti online abonamentul | Plăți + Parinte | `plati-facturi` |

---

### FAZA 5 — Viitor îndepărtat *(P5)*

| Task | Modul | Note |
|------|-------|------|
| Competiție gestionată complet în aplicație (timp real, rezultate) | Competiții | Arhitectură complexă, depinde de Faza 3 |
| QR code la prezență | Prezență | Simplu de implementat, nu e prioritar |
| Clasament anual cu puncte acumulate | Rapoarte | Depinde de clasament per competiție |
| Rating arbitri vizibil public | Arbitri | Depinde de Faza 4 |

---

## 6. Decizii deschise — de clarificat

Acestea sunt aspecte menționate dar fără un răspuns final. De decis înainte de implementarea modulului respectiv.

| Decizie | Context | Modul afectat |
|---------|---------|--------------|
| An școlar: Sept-Iun sau Oct-Sep? | Legitimație tip "an școlar" | Plăți |
| Nr. minim antrenamente per examen: cine îl setează și cum? | Instructor sau admin per sesiune de examen | Examene |
| La transfer sportiv: prezențele rămân la fostul club sau se transferă? | S-a decis că grade merg, plățile rămân — prezențele? | Sportivi |
| Competiție pe aplicație: introduce arbitrul rezultatele sau instructorul? | Rol arbitru în Faza 3 | Competiții |
| Echipamente: lista de produse disponibile e gestionată de federație sau fiecare club? | Modul echipamente Faza 4 | Echipamente |
| Parinte: vede prezența copilului sau doar o poate anunța? | Rol parinte Faza 2 | Prezență |

---

## 7. Arhitectura DB — tabele noi necesare

Față de schema actuală, vor fi necesare:

| Tabel | Faza | Descriere |
|-------|------|-----------|
| `grade_arme` | F2 | Nomenclator grade arme (sistem paralel) |
| `sportiv_grade_arme` | F2 | Gradele în arme ale unui sportiv |
| `sportiv_grade_instructor` | F3 | Grade instructor/antrenor |
| `grade_arbitru` | F4 | Nomenclator grade arbitru |
| `sportiv_rating_arbitru` | F4 | Rating prestație arbitru per competiție |
| `tutori` | F2 | Părinți/tutori legați la sportivi |
| `tutore_sportiv` | F2 | Legătură M:N tutore ↔ sportiv |
| `cereri_echipamente` | F4 | Cereri sportiv → club |
| `cereri_inregistrare` | F3 | Formular de înscriere online |
| `legitimatii` | F1 | Evidența ambelor tipuri de legitimație per sportiv |
| `flux_federatie` | F2 | Sume nominale club → federație per activitate |
| `emailuri_trimise` | F2 | Log emailuri automate/bulk |

---

*Document generat pe baza sesiunii de discovery — Aprilie 2026. Se actualizează la fiecare decizie majoră de arhitectură.*
