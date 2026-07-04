# Raport Test Playwright — Prezență / Orar / Program — 2026-06-19

**Secțiuni testate:** Grupe & Orar, Program Antrenamente, Înregistrare Prezențe (Rapid/Grupe/Istoric), Raport Prezențe, Raport Lunar Prezențe
**Rol testat:** ADMIN_CLUB — C.S. Phi Hau
**Focus:** Tabletă și mobil (toate viewporturi standard)

---

## Rezumat

| Categorie | Total | ✅ OK | ❌ Erori | ⚠️ Warning |
|-----------|-------|-------|---------|-----------|
| Pagini testate | 5 | 5 | 0 | 0 |
| Tab-uri testate | 3 (Prezență) | 3 | 0 | 0 |
| Filtre testate | 4 | 4 | 0 | 0 |
| Viewporturi responsive | 4 per pagină | — | 3 | 4 |
| Erori consolă | 56 total | — | 1 tip (duplicate key) | — |

---

## Erori găsite

### [CRITICAL] Duplicate React key în IstoricPrezentaGlobal

- **Fișier:** `components/Prezenta/IstoricPrezentaGlobal.tsx:26`
- **Componentă:** `ResponsiveTable` → `tbody`
- **Eroare:** `Warning: Encountered two children with the same key 'f8bcc7b4-da5d-4622-ae06-7079a6f543ea'`
- **Volum:** 40+ erori la prima încărcare, cresc la resize (56 total în sesiune)
- **Trigger:** click tab "Istoric" din Înregistrare Prezențe
- **Impact:** React poate duplica sau omite rânduri din tabel — comportament impredictibil pentru utilizator
- **Cauză probabilă:** cheia folosită pentru rânduri e ID-ul antrenamentului (acelaşi antrenament apare pentru N sportivi → N rânduri cu același key)
- **Reproducibil:** DA, la orice accesare a tab-ului Istoric

### [CRITICAL] Butonul "+ Adaugă Grupă" dispare la 768px (tabletă portrait)

- **Fișier:** `components/Grupe/index.tsx` sau header-ul paginii
- **Viewport:** 768×1024 (tabletă portrait)
- **Cauză:** Sidebar rămâne expanded (~250px) la 768px → conținutul zonei header drept e complet tăiat
- **Impact:** Admin nu poate adăuga grupă nouă de pe tabletă în portrait
- **Reproducibil:** DA

---

## Avertismente

### [WARNING] Butonul AI flotant acoperă conținut pe mobil (< 400px)

Afectează TOATE paginile testate. Butonul `Asistent AI` (poziție fixed bottom-right) suprapune conținut util:
- **Program Antrenamente** (390px): acoperă data "18.06.202..." din primul card vizibil
- **Prezență Istoric** (390px): acoperă badge "PREZENT" din cardul 3
- **Raport Prezențe** (390px): acoperă badge "0%" din primul card
- **Raport Lunar Prezențe** (390px): acoperă cardul AGRIGOROAE LAVINIA IOANA
- **Grupe & Orar** (390px): acoperă zona butoane (Detalii/Gestionează) din cardul Retrasi
- **Fix sugerat:** `margin-bottom` sau `padding-bottom` pe container la `< sm:`, sau repoziționare AI button mai sus când există bottom content

### [WARNING] Sidebar nu colapsează la 768px (tabletă portrait)

- Sidebar rămâne expanded la lățime 768px, consumă ~250px din cei 768px disponibili
- Conținut disponibil rămâne ~518px → tabele, filtre, butoane se strâng sau dispar
- **Pagini afectate:** toate
- **Efecte secundare:** coloana "Status" dispare din tabelul Istoric; coloana "Perioadă examen" dispare din Raport Lunar; butonul "Adaugă Grupă" dispare din Grupe
- **Breakpoint necesar:** sidebar să colapseze la `< 1024px` sau măcar la `< 768px`

### [WARNING] Encoding bug în Raport Lunar Prezențe

- **Text afișat:** `după 18.12.2025 â€" până la 10.06.2026`
- **Text corect:** `după 18.12.2025 — până la 10.06.2026`
- **Cauză:** em-dash (`—`) stocat/interpretat greșit (UTF-8 citit ca Latin-1)
- **Fișier:** `components/Prezenta/RaportLunarPrezenta.tsx` (zona perioadă examen)
- **Afectat la toate viewporturile**, inclusiv desktop

### [WARNING] Luni grafic trunchiate pe mobil mic (375-390px)

- **Pagina:** Raport Prezențe
- **Viewport:** 390×844
- **Problemă:** Luna "Ian" dispare din axa X a graficului Recharts (prea puțin spațiu)
- **Impact:** minor, graficul rămâne funcțional

---

## Verificare Responsive — Program Antrenamente

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Tabletă landscape | 1024×768 | ✅ | ⚠️ | ✅ | Titlu line-break, text orar wrap |
| Tabletă portrait | 768×1024 | ✅ | ⚠️ | ⚠️ | Sidebar expanded, conținut strâmt |
| Mobil mare | 390×844 | ✅ | ✅ | ✅ | AI button acoperă data în card |
| Mobil mic | 375×667 | ✅ | ✅ | ✅ | AI button acoperă data în card |

## Verificare Responsive — Înregistrare Prezențe (Istoric)

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Tabletă portrait | 768×1024 | ⚠️ | ⚠️ | ✅ | Coloana Status dispare, sidebar expanded |
| Mobil mare | 390×844 | ✅ | ✅ | ✅ | AI button acoperă badge "PREZENT" |

## Verificare Responsive — Raport Prezențe

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Tabletă portrait | 768×1024 | ✅ | ✅ | ✅ | Filtre colapsate OK |
| Mobil mare | 390×844 | ⚠️ | ✅ | ✅ | Ian lipsă din grafic, AI button acoperă badge |

## Verificare Responsive — Raport Lunar Prezențe

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Tabletă portrait | 768×1024 | ⚠️ | ⚠️ | ✅ | Coloana "Perioadă examen" dispare, % trunchiat |
| Mobil mare | 390×844 | ✅ | ✅ | ✅ | AI button acoperă card, encoding bug vizibil trunchiat |

## Verificare Responsive — Grupe & Orar

| Viewport | Rezoluție | Date vizibile | Layout OK | Butoane accesibile | Probleme |
|----------|-----------|--------------|-----------|-------------------|---------|
| Tabletă portrait | 768×1024 | ✅ | ✅ | ❌ | "+ Adaugă Grupă" DISPARE |
| Mobil mare | 390×844 | ✅ | ✅ | ✅ | AI button acoperă butoane card Retrasi |

---

## Ce funcționează corect

- ✅ Login și navigare sidebar pe desktop
- ✅ Tab Rapid Prezență (mesaj "Niciun antrenament" azi)
- ✅ Tab Grupe din Prezență — carduri grupe cu butoane vizibile
- ✅ Filtru după zi în Program Antrenamente
- ✅ Filtru combinat zi + grupă în Program Antrenamente
- ✅ Grafic Prezențe Lunare pe Grupe — se renderizează corect
- ✅ Export CSV buton vizibil (Raport Lunar)
- ✅ Filtre Raport colapsate în buton pe tabletă/mobil
- ✅ Sidebar colapsează la hamburger pe mobil (< 768px) — toate paginile
- ✅ Layout card/rând pe mobil (1 coloană) — toate paginile
- ✅ Tab-urile Prezență (Rapid/Grupe/Istoric) vizibile pe mobil ca iconițe
- ✅ Zero erori JS critice (crash/fetch failed)

---

## Priorități fix

| # | Bug | Severitate | Fișier |
|---|-----|-----------|--------|
| 1 | Duplicate React key în tabelul Istoric | CRITICAL | `IstoricPrezentaGlobal.tsx` — cheia trebuie compusă din `id_prezenta` (nu doar id antrenament) |
| 2 | "+ Adaugă Grupă" dispare la 768px | CRITICAL | `Grupe/index.tsx` header — buton mutat sub titlu sau sidebar să colapseze |
| 3 | Sidebar nu colapsează la 768px | HIGH | `AppLayout.tsx` / `Sidebar.tsx` — breakpoint colaps la `< 1024px` |
| 4 | AI button flotant acoperă conținut pe mobil | MEDIUM | `AIAssistant` sau layout — `padding-bottom` pe `<main>` la `sm:` |
| 5 | Encoding em-dash Raport Lunar | LOW | `RaportLunarPrezenta.tsx` — înlocuiește `—` cu `—` sau caracter direct |

---

## Date de test create și șterse

Nicio înregistrare creată în acest test (test read-only + filtre).
