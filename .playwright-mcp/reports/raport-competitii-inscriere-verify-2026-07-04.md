# Raport Test Playwright — Verificare Fix Înscriere Club (debug competitii-inscriere-20260605) — 2026-07-04

**Scop:** verificarea manuală a fix-urilor din sesiunea de debug `competitii-inscriere-20260605` (bug-uri introduse de refactoring commit 46b7bee — carduri probe non-individuale blocate pe "Nu participăm").

**Mediu:** dev server Vite `localhost:5173`, cont ADMIN_CLUB (C.S. Phi Hau), competiție "Cupa" (CN Tehnica, înscrieri deschise, 136 categorii).

**Notă scope:** competiția disponibilă nu are probă giao_dau (e CN Tehnica). Fluxul echipe/perechi a fost testat pe proba **Sincron (perechi)** — același cod path (Pas3Echipe / InscriereClubCards) vizat de fix.

## Rezumat

| Pas verificare | Rezultat |
|---|---|
| 1. Competiție cu probe perechi → Înscriere club | ✅ |
| 2. Hub: toate cardurile deschizibile ("Configurează →"), nu "Nu participăm" | ✅ |
| 3. Card echipe → formează echipă → salvează → hub arată progres | ✅ |
| 4. Probă individuală → Pas1 selectare → Pas2 quyen → status card corect | ✅ |
| Erori consolă JS | ✅ 0 erori, 0 warnings |
| Curățare date de test | ✅ complet |

## Detalii pași

### Pas 2 — Hub carduri (screenshot `verify-comp-01-hub-cards.png`)
- Thao Quyen Individual — "0/0 completate · Configurează →" ✅
- Sincron (perechi) — "0/12 completate · 12 categorii · Configurează →" ✅
- Song Luyen (perechi) — "0/23 completate · 23 categorii (1 excluse auto) · Configurează →" ✅
- Niciun card blocat pe "Nu participăm" — **bug-ul original NU se mai reproduce**.

### Pas 3 — Formare echipă Sincron (screenshot `verify-comp-02-hub-sincron-1of12.png`)
- Card Sincron se deschide → vedere "Echipe — configurare" cu 12 categorii, filtre Toate/Completate/Incomplete.
- Categoria "11-12 ani / Mixt / Sincron / CV - CV 4 Cap Alb" (12 eligibili) → modal formare echipă.
- Validare compoziție funcționează: "Titulari (3/3) · 2M / 1F ✓" (minim 1M+1F).
- Warning viza FRAM afișat corect (informativ).
- "Confirmă Înscrierea" → categoria arată "3/3 titulari ✓" + buton "Modifică"; header "1/12 categorii configurate".
- Revenire în hub: card Sincron arată **"1/12 completate"** ✅ (nu "exclus").
- Contorul global "Înscrieri" a crescut la (1) ✅.

### Pas 4 — Probă individuală (screenshot `verify-comp-03-hub-final-statuses.png`)
- Card Thao Quyen Individual → Pas1: tabel 53 sportivi, coloane sortabile, filtre avansate, "Continua" disabled fără selecție ✅.
- Selectat 1 sportiv → Pas2: tabel quyen cu opțiuni Q1/Q2/Q3, validare "1 sportiv fără Q1 — nu poți continua", buton disabled ✅.
- Ales Q1 "Bo Linh Mot" → "1/1 complet", buton activ ✅.
- Revenire hub: card "Completat · 1 categorie · Modifică →" ✅.

## Avertismente

### [WARNING] Status card stale în hub după retragere echipă
- **Element**: hub Înscriere club, card Sincron
- **Comportament**: după "Nu participăm la această categorie" (retrage echipa) + "← Participăm" (reset) în vederea echipe, la revenirea în hub cardul arăta încă "1/12 completate". După butonul Refresh al competiției, valoarea s-a corectat la "0/12".
- **Impact**: minor, doar afișare — datele din DB corecte. Direcția salvare→hub (fluxul principal reparat) funcționează corect; doar retragerea nu declanșează re-fetch `echipeFormate`.
- **Reproductibil**: DA
- **Recomandare**: invalidare/re-fetch `echipeFormate` și la retragerea echipei, nu doar la salvare.

## Date de test create și șterse
- Echipă Sincron "11-12 ani / Mixt / CV - CV 4 Cap Alb" (LEOHCHI RAZVAN, POPA ANDREI, ANDRICIUC SONIA) — **ștearsă** prin "Nu participăm" + reset "← Participăm". Confirmat după Refresh: Înscrieri (0), Sincron 0/12.
- Selecție individuală ALBU THEODOR + Q1 Bo Linh Mot — draft nefinalizat (nu s-a apăsat "Finalizează parțial"), dispărut după Refresh: Thao Quyen 0/0. Nimic persistat.

## Acțiuni testate cu succes
- ✅ Deschidere toate cele 3 carduri probe din hub
- ✅ Modal formare echipă: selecție membri, validare M/F, confirmare
- ✅ Buton "Modifică" echipă (modal "Clubul tău are deja o echipă înscrisă")
- ✅ Retragere echipă + revenire la participare
- ✅ Pas1 individual: tabel, selecție, validare buton Continua
- ✅ Pas2 individual: selecție Q1, validare completitudine
- ✅ Refresh competiție — sincronizare corectă cu DB

## Verificare Responsive
Netestată în această sesiune — test țintit pe verificarea fix-ului de debug, nu sweep complet al paginii.

## Concluzie
**Fix-ul din sesiunea de debug competitii-inscriere-20260605 este CONFIRMAT funcțional.** Toate cele 4 criterii de verificare umană trec. Un singur detaliu minor găsit (status stale la retragere echipă) — nu ține de bug-ul original.
