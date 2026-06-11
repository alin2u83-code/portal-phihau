# Raport Test Playwright — Examene (Sesiuni + Rapoarte) — 2026-06-10

## Rezumat
| Categorie | Total | ✅ OK | ❌ Erori | ⚠️ Warning |
|-----------|-------|-------|---------|-----------|
| Butoane testate | 12 | 8 | 3 | 1 |
| Modals testate | 5 | 4 | 1 | 0 |
| Filtre/Căutare | 1 | 1 | 0 | 0 |
| Navigare | 2 | 2 | 0 | 0 |
| Export fișiere | 2 | 2 | 0 | 0 |
| Viewporturi responsive | 6 | 2 | 4 | 0 |

---

## Erori găsite

### [CRITICAL] Contoare statistici afișează 0/0/0 deși există 11 participanți
- **Element**: Cardurile "Admiși / În așteptare / Respinși" din secțiunea sesiune examen
- **Eroare**: Toate contoarele afișează 0 indiferent de starea participanților. 11 sportivi înscriși toți "În așteptare" → "0 ÎN AȘTEPTARE"
- **Reproductibil**: DA (confirmat în toate viewporturile)
- **Fișier suspect**: componenta de calcul statistici din GestiuneExamene/index.tsx

### [CRITICAL] Butonul "Editează" sesiune nu deschide niciun modal
- **Element**: Buton "Editează" din header-ul sesiunii de examen
- **Eroare**: Click fără efect vizibil, niciun modal/form, niciun error în consolă
- **Reproductibil**: DA (testat de 2 ori)
- **Notă**: Buton complet non-funcțional — editarea sesiunii (dată, comisie, etc.) e blocată

### [CRITICAL] Butoane header sesiune tăiate pe tabletă (768px și 1024px)
- **Element**: Rândul cu butoane: Import Sportivi, Import XLS, Export Fișe, Editează, Finalizează Examen
- **Eroare**: La 768px portrait și 1024px landscape, butoanele "Editează" și "Finalizează Examen" ies din viewport; sidebar expandat consumă prea mult spațiu
- **Reproductibil**: DA — confirmat la ambele lățimi
- **Impact**: Admin nu poate accesa acțiunile critice pe tabletă fără scroll orizontal neintuitiv

### [WARNING] Două dialoguri de eroare separate pentru o singură acțiune eșuată
- **Element**: Dialogul ErrorProvider la tentativa de inscriere BALMUS FILIP
- **Comportament**: Două dialoguri secvențiale ("Grad deja obținut" + "Deja înscriși") — utilizatorul dă OK de 2 ori
- **Recomandare**: Combinare erori în un singur dialog sau toast multi-linie

### [WARNING] "Rapoarte Examen" afișează string raw `rapoarte-examen` în header
- **Element**: Breadcrumb/heading din banner când se navighează la "Rapoarte Examen"
- **Eroare**: Titlul paginii arată `rapoarte-examen` (view ID neformatat) în loc de "Rapoarte Examene"
- **Reproductibil**: DA

### [WARNING] Modal "Adaugă Multipli" nu se închide cu tasta Escape
- **Element**: Dialog `aria-modal` Adaugă Participanți la Examen
- **Eroare**: Escape apăsat de 2 ori fără efect; doar butonul X îl închide
- **Reproductibil**: DA

### [INFO] Grad vizat auto-selectat incorect în "Adaugă Individual"
- **Element**: Dropdown "Grad Vizat" în modalul de înscriere individuală
- **Comportament**: BALMUS FILIP (grad actual: C.V. 1 Câp Alb) → auto-selecție "1 Câp Roșu" (greșit; corect ar fi C.V. 2 Câp Alb)
- **Notă**: Inscrierea a fost blocată server-side din alt motiv, deci nu a cauzat date greșite în DB

### [INFO] AI Assistant widget acoperă contorul "RESPINȘI" pe mobil
- **Element**: Butonul flotant "Asistent AI" (bottom-right) la 390px și 375px
- **Comportament**: Widget-ul floating se suprapune parțial peste cardul "RESPINȘI"
- **Reproductibil**: DA pe mobil

---

## Verificare Responsive

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Laptop mare | 1920×1080 | ✅ | ✅ | ✅ | - |
| Laptop standard | 1366×768 | ✅ | ✅ | ✅ | - |
| Tabletă landscape | 1024×768 | ✅ | ❌ | ❌ | Butoane "Editează"+"Finalizează" off-screen |
| Tabletă portrait | 768×1024 | ✅ | ❌ | ❌ | Aceleași butoane + coloana "Acțiuni" off-screen |
| Mobil mare | 390×844 | ✅ | ✅ | ✅ | AI widget acoperă RESPINȘI counter |
| Mobil mic | 375×667 | ✅ | ✅ | ✅ | AI widget acoperă text descriere |

---

## Acțiuni testate cu succes
- ✅ Navigare la Sesiuni Examene din sidebar
- ✅ Sesiunea "Iasi - 10.06.2026" se încarcă cu participanți
- ✅ Tabelul participanți cu 11 sportivi pe 2 pagini, paginare funcțională
- ✅ Modal "Adaugă Individual": căutare sportiv funcțională, validare disabled la start
- ✅ Inscrierea blocată corect când grad deja în istoric (server-side)
- ✅ Modal "Export Fișe": deschidere, membri comisie editabili
- ✅ "Descarcă Fișă Notare" → descarcă `Fisa_Notare__2026.06.10.xls` ✅
- ✅ "Descarcă Fișă Validare" → descarcă `Fisa_Validare__2026.06.10.xls` ✅
- ✅ Modal "Adaugă Multipli": deschidere, listă sportivi cu checkboxe + viza warning vizibil
- ✅ Click pe nume sportiv în tabel → navigare la profil sportiv
- ✅ Navigare înapoi la sesiune din profil sportiv
- ✅ Coloana "Acțiuni" per rând: buton "Modifică gradul vizat" deschide modal "Evaluare"
- ✅ Layout corect pe 1366px și 1920px

## Date de test create și șterse
- Nicio înregistrare creată în DB (inscrierea BALMUS FILIP blocată server-side)
- Nimic de șters

## Recomandări prioritizate
1. **P0 — Fix buton "Editează"**: Cel mai probabil handler onClick lipsă sau condiție de render falsă
2. **P0 — Fix contoare 0/0/0**: Bug de calcul/render statistici participanți — datele există, counters nu le citesc
3. **P1 — Responsive header buttons**: Wrap butoane în 2 rânduri sau collapse în dropdown pe <1280px
4. **P2 — Header titlu "rapoarte-examen"**: Adaugă mapping view→titlu formatat în AppLayout/header
5. **P2 — Escape pentru modal "Adaugă Multipli"**: Adaugă `onKeyDown Escape` handler
6. **P3 — Erori duble**: Agregă erorile din batch operations într-un singur dialog
7. **P3 — AI widget z-index/position mobil**: Mută widget sau ajustează poziție să nu acopere conținut
