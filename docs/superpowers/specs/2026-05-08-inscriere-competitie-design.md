# Design: Wizard Înscriere Competiție QKD

**Data:** 2026-05-08  
**Status:** Prototip v6 validat, urmează implementare  
**Fișier prototip:** `public/prototype-inscriere.html`  
**Fișier de implementat:** `components/Competitii/InscriereClubWizard.tsx`

---

## 1. Obiectiv

Redesign complet al wizard-ului de înscriere sportivi la competiții QKD. Scopul: reducerea numărului de pași, eliminarea confuziei, validare gen pentru echipe mixte, suport 2 înlănțuiri pentru grade superioare.

---

## 2. Structura wizard — 4 pași

### Pas 1 — Selectare sportivi
- Afișează **doar sportivii eligibili** (cel puțin o categorie individuală corespunzătoare)
- Filtrare: text (căutare nume), gen (Toți / ♂ / ♀)
- Checkbox "Selectează toți vizibili"
- Fiecare card sportiv afișează:
  - Nume, vârstă, grad, grupă
  - Categoria auto-asignată (ex. `→ TQ Masc 18-39 · 3-4 CAP`)
  - Badge `2 înlănțuiri` dacă categoria are `douaQuyenuri: true`
- **Acord parental: eliminat complet** din UI

### Pas 2 — Selecție înlănțuiri Thao Quyen Individual
- Tabel cu coloane (nu dropdown):
  - `Sportiv | Categorie auto | Grad | Opțiunea 1 | Opțiunea 2 | [Opțiunea 3] | [Opțiunea 4]`
  - Numărul de coloane = max opțiuni din gradele prezente
  - Click pe celulă = selectat (radio-style per rând)
  - Rând verde = înlănțuire selectată; rând roșu = lipsă
- Filtrare grad: chips clicabile + buton "↓ Prima opțiune Q1 pentru toți vizibili"
- **Categorii cu 2 înlănțuiri** (`douaQuyenuri: true`):
  - Sportivul are 2 rânduri grupate vizual: **Q1** (verde) + **Q2** (galben)
  - Opțiunile permise = `DREPTURI[gradOrd]`
  - Q2: opțiunea deja aleasă la Q1 este dezactivată (nu același quyen de 2x)
  - Q2 afișează "Selectează Q1 mai întâi" până Q1 e ales
  - Fiecare sportiv alege **individual** Q1 și Q2 (nu per categorie)

### Pas 3 — Formare echipe
- Tab-uri pe categorii de echipe; indicator stare per tab: ✓ verde / ✗ roșu / gol
- Bloc erori navigabil sus: listă probleme + buton "→ mergi acolo" per problemă
- Layout 2 coloane: **Pool eligibili** | **Componență + program**

#### Pool eligibili
- Filtrat automat pe gen categorie (M → băieți, F → fete, X → toți)
- Butoane `+ T` (titular) și `+ R` (rezervă, dacă categoria permite)
- **Gender locking pentru Mixt:**
  - Logică: `canAddToTitulari(cat, athGen)`:
    - `remaining = titMax - titulari.length`
    - dacă `athGen === 'M'`: `neededF = max(0, 1 - nF)` → blocăm dacă `remaining - 1 < neededF`
    - dacă `athGen === 'F'`: `neededM = max(0, 1 - nM)` → blocăm dacă `remaining - 1 < neededM`
  - Când blocat: buton `+ T` dezactivat cu `title` explicativ + badge `🔒 Trebuie fată mai întâi`
  - Banner galben deasupra pool-ului când un gen e blocat

#### Componență echipă
- Dropzone titulari (verde când completă)
- Dropzone rezerve (dacă `rezMax > 0`)
- Mesaj validare color-coded (✓ verde / ✗ roșu)

#### Program Song Luyen / Sincron (în panel echipă)
- **Apare doar după ce titularii sunt complet**
- Calculat pe baza gradului minim al titularilor
- Song Luyen: program din `SL_PROG[gradMin]`
- Sincron: program din `DREPTURI[gradMin]`
- Radio-style, un singur program pe echipă

### Pas 4 — Sumar final
- Secțiune individuali: grupat pe categorii, afișează Q1 (și Q2 dacă 2Q)
- Secțiune echipe: titulari + rezerve + program ales
- Totaluri: nr. participanți individuali + nr. echipe
- Buton "✓ Salvează înscrierea"

---

## 3. Reguli categorii echipe

### Tipuri
| Tip | Titulari | Rezerve | Obs |
|-----|----------|---------|-----|
| Song Luyen | exact 2 | 0 | — |
| Sincron | exact 3 | 0 | — |
| Giao Dau | exact 2 | 0–2 | din config categorie |

### Gen
| Valoare gen | Pool pool | Validare |
|-------------|-----------|----------|
| `M` | Doar băieți | — |
| `F` | Doar fete | — |
| `X` (Mixt) | Toți | min 1F + min 1M obligatoriu |

### Mixt validation messages
- `"Mixt: lipsește cel puțin o fată (0F + 2M)"`
- `"Mixt: lipsește cel puțin un băiat (2F + 0M)"`

---

## 4. Date de referință

### Grade (gradOrd)
| gradOrd | Denumire |
|---------|----------|
| 1 | 1 CAP |
| 2 | 2 CAP |
| 3 | 3 CAP |
| 4 | 4 CAP |
| 5 | C.N. (Centura Neagra) |
| 6 | CN Dang 1 (placeholder) |
| 7 | CN Dang 2 (placeholder) |
| 8 | CN Dang 3 (placeholder) |

### Grupe de vârstă categorii individuale
- Juniori: 14–17 ani
- Seniori: 18–39 ani
- Masters: 40–54 ani
- Veterani: 55+ ani

### Drepturi per grad (înlănțuiri permise)
```
1 CAP:    Ngan Quyen 1, Ngan Quyen 2
2 CAP:    Ngan Quyen 2, Ngan Quyen 3
3 CAP:    Ngan Quyen 3, Ngan Quyen 4
4 CAP:    Ngan Quyen 4, Huyen Quyen 1
C.N.:     Huyen Quyen 1, Huyen Quyen 2, Long Ho Quyen
CN Dang1: Huyen Quyen 1, Huyen Quyen 2, Long Ho Quyen, Loi Tran Quyen
CN Dang2: Huyen Quyen 2, Long Ho Quyen, Loi Tran Quyen, Kim Lan Quyen
CN Dang3: Long Ho Quyen, Loi Tran Quyen, Kim Lan Quyen
```

### Program Song Luyen (după grad minim echipă)
```
gradMin 1: Song Doi Mot
gradMin 2: Dang Mon Song Luyen
gradMin 3-4: QK 1 contra QK 3
gradMin 5+: QK 2 contra QK 4
```

### Program Sincron
= DREPTURI[gradMin] (aceleași înlănțuiri ca drepturi per grad minim)

---

## 5. Câmpul `douaQuyenuri` pe categorii individuale

- Setat de admin/org la configurarea competiției (nu automat)
- `true` → sportivul alege **Q1 + Q2** separate, din aceeași listă de drepturi
- Q1 ≠ Q2 (același quyen de 2x interzis)
- Fiecare sportiv alege individual (nu toată categoria face același pair)
- În prototip: categoriile CN Dang au `douaQuyenuri: true` ca exemplu

---

## 6. Ce se elimină față de implementarea actuală

- `acord_parental` — eliminat complet din UI și logică
- Pasul 2 vechi (confirmare categorii) — înlocuit cu selecție înlănțuiri
- Dropdown-uri pentru quyen — înlocuite cu coloane clicabile
- Selecție program SL/Sincron în pas separat — mutat în panelul echipei

---

## 7. Implementare în aplicație — fișiere de modificat

### `components/Competitii/InscriereClubWizard.tsx`
- Pas 1: filtrare eligibili, eliminare acord_parental
- Pas 2: redesign tabel cu coloane per opțiune + logică 2Q
- Pas 3: gender locking Mixt, program în panel echipă
- Pas 4: sumar cu Q1/Q2 unde aplicabil

### `types.ts`
- Adăugare `douaQuyenuri?: boolean` pe `CategorieCompetitie`
- Modificare câmp quyen în `InscriereCompetitie`: `{ q1: string; q2?: string }`

### DB (Supabase)
- Coloana `doua_quyenuri boolean default false` pe `categorii_competitie`
- Coloana `quyen_2 text` pe `inscrieri_competitie` (nullable)

---

## 8. Stare prototip

| Versiune | Ce s-a adăugat |
|----------|----------------|
| v1-v2 | Structura inițială (probleme cu date lipsă) |
| v3 | Rescris fără CDN extern, date hardcodate vizibile |
| v4 | Selecție quyen coloane (nu dropdown), echipe Mixt |
| v5 | Filtre grad, bulk-select, program SL/Sincron în panel, erori navigabile |
| v6 | Gender locking Mixt, 4 grupe vârstă, grade CN+, 2Q (Q1+Q2) |

**Prototip curent:** v6 — `public/prototype-inscriere.html`
