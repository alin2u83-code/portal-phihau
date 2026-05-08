# Plan implementare: Wizard Înscriere Competiție v2

**Data:** 2026-05-08  
**Design spec:** `docs/superpowers/specs/2026-05-08-inscriere-competitie-design.md`  
**Prototip:** `public/prototype-inscriere.html` (v6)  
**Target:** `components/Competitii/InscriereClubWizard.tsx`

---

## Strategie

Înlocuire completă a wizard-ului existent. Codul vechi este sursa de cod pentru componente/logici reutilizabile enumerate mai jos. Implementarea se face **pas cu pas în ordinea fazelor**, fiecare faza compilând și funcționând independent.

---

## Ce se REUTILIZEAZĂ din wizard-ul actual

| Componentă / funcție | Fișier | Ce face |
|----------------------|--------|---------|
| `StepIndicator` / `WizardProgress` | wizard actual | Stepper vizual desktop+mobil — se păstrează neschimbat |
| `calculeazaEligibilitateGenerala()` | wizard actual | Calculează eligibilitate + avertismente (viză FRAM, date incomplete) |
| `BadgeEligibilitateGenerala` | wizard actual | Badge colorat eligibil/atenționare/neeligibil |
| `CardSportiv` | wizard actual | Card sportiv pentru mobil |
| `RandTabelSportiv` | wizard actual | Rând tabel sportiv pentru desktop |
| `buildDejaInscrisiSet()` | wizard actual | Set de sportivi deja înscriși activ la competiție |
| `areVizaFRAM()` | wizard actual | Verificare viză FRAM per an |
| `verificaEligibilitate()` | `utils/eligibilitateCompetitie.ts` | Eligibilitate per categorie (vârstă + grad + gen) |
| `calculeazaVarstaLaData()` | `utils/eligibilitateCompetitie.ts` | Calculare vârstă la data competiției |
| `exportFisaParticipare`, `exportBorderoClub` | `utils/exportPDFCompetitie.ts` | Export PDF — neschimbate |
| Filtru Pas1: gen, grade, vârstă, search, select-all | wizard actual | Bloc filtru avansat complet — se păstrează |
| Fetch `drepturi_grad_competitie` | wizard actual (linia ~1540) | Query Supabase pentru înlănțuiri permise per grad — se păstrează logica |

---

## Ce se ELIMINĂ complet

| Element | Unde | Motiv |
|---------|------|-------|
| `acord_parental` | UI + DB | Eliminat la cererea utilizatorului |
| Pas2 actual (confirmare categorii manuale) | wizard | Înlocuit cu selecție quyen prin coloane |
| Dropdown `quyen_ales` | wizard Pas2 | Înlocuit cu tabel coloane clicabile |
| Selecție program SL/Sincron în pas separat | — | Mutat în panelul echipei Pas3 |

---

## Faza 1 — Migrare DB (Supabase)

**Fișier SQL:** `sql/migrations/2026-05-08-inscriere-v2.sql`

### F1.1 — Adaugă `doua_quyenuri` pe `categorii_competitie`
```sql
ALTER TABLE categorii_competitie
  ADD COLUMN IF NOT EXISTS doua_quyenuri BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN categorii_competitie.doua_quyenuri IS
  'True = sportivii din această categorie trebuie să execute 2 înlănțuiri diferite (Q1 + Q2). Setat de admin/org la configurare competiție.';
```

### F1.2 — Adaugă `quyen_ales_2` pe `inscrieri_competitie`
```sql
ALTER TABLE inscrieri_competitie
  ADD COLUMN IF NOT EXISTS quyen_ales TEXT;  -- dacă nu există deja

ALTER TABLE inscrieri_competitie
  ADD COLUMN IF NOT EXISTS quyen_ales_2 TEXT;  -- Q2 pentru categorii doua_quyenuri

COMMENT ON COLUMN inscrieri_competitie.quyen_ales_2 IS
  'A doua înlănțuire aleasă (diferită de quyen_ales). Nullable pentru categorii cu 1 singur quyen.';
```

### F1.3 — Elimină `acord_parental` din `inscrieri_competitie`
```sql
-- Backup date existente înainte de drop (opțional, rulat manual)
-- SELECT * FROM inscrieri_competitie WHERE acord_parental = true INTO ...;

ALTER TABLE inscrieri_competitie
  DROP COLUMN IF EXISTS acord_parental;
```

> **Atenție:** F1.3 este ireversibil. Rulat după confirmarea că datele istorice nu mai sunt necesare.

---

## Faza 2 — Tipuri TypeScript (`types.ts`)

### F2.1 — `CategorieCompetitie`
Adaugă după `ordine_afisare`:
```typescript
doua_quyenuri: boolean;  // categorii care necesită Q1 + Q2 diferite
```

### F2.2 — `InscriereCompetitie`
Adaugă câmpuri noi + elimină referința `acord_parental` (dacă există):
```typescript
quyen_ales: string | null;    // înlănțuire 1 (sau singura)
quyen_ales_2: string | null;  // înlănțuire 2 (doar pentru doua_quyenuri)
// acord_parental: ELIMINAT
```

---

## Faza 3 — Pas 1: Selectare sportivi (refactorizare)

**Modificări față de implementarea actuală:**

### Ce se PĂSTREAZĂ
- Tot blocul de filtre avansate (gen, grade multi-select, vârstă, search, select-all)
- `calculeazaEligibilitateGenerala()` cu viză FRAM + date incomplete
- `CardSportiv` + `RandTabelSportiv`
- `buildDejaInscrisiSet` (afișare "Deja inscris")

### Ce se SCHIMBĂ
1. **Afișare categorie auto-asignată** pe fiecare card/rând:
   - Apel `verificaEligibilitate()` per sportiv × categorii → prima categorie compatibilă
   - Text verde mic sub nume: `→ TQ Masc 18-39 · 3-4 CAP`
   - Badge `2Q` dacă categoria are `doua_quyenuri: true`

2. **Afișare doar eligibili**: sportivii cu status `neeligibil` dispar din listă (nu mai sunt dezactivați vizual, sunt ascunși complet). Sportivii cu `atentionare` rămân vizibili + selectabili cu badge.

3. **Eliminare acord_parental**: nicio referință UI, nicio checkbox.

### State nou adăugat
```typescript
// Map: sportivId → CategorieCompetitie (auto-asignată)
const [autoCategorie, setAutoCategorie] = useState<Map<string, CategorieCompetitie>>(new Map());
```
Calculat la mount/update sportivi selectați, transmis la Pas2.

---

## Faza 4 — Pas 2: Selecție înlănțuiri (redesign complet)

Componenta `Pas2SelectieQuyen` — înlocuire totală a `Pas2CategoriiPerSportiv`.

### 4.1 — Date necesare
- `dreptUri: Map<number, string[]>` — fetch din `drepturi_grad_competitie` (deja există în wizard, reutilizăm query-ul)
- `autoCategorie: Map<string, CategorieCompetitie>` — primit de la Pas1
- `sportiviSelectati: Sportiv[]` — din Pas1

### 4.2 — State
```typescript
// Quyen ales per sportiv: {q1, q2}
const [quyenAles, setQuyenAles] = useState<Map<string, { q1: string; q2: string }>>(new Map());
const [gradFilter, setGradFilter] = useState<number | null>(null);
```

### 4.3 — Layout tabel

**Header dinamic:**
```
Sportiv | Categorie auto | Grad | Opțiunea 1 | Opțiunea 2 | [Opțiunea 3] | [Opțiunea 4]
```
- Număr coloane = max opțiuni din gradele sportivilor vizibili (min 2)
- Coloanele sunt `<th>` sticky (overflow scroll orizontal pe mobil)

**Rând sportiv simplu (1 quyen):**
- Celule clickabile per opțiune, radio-style per rând
- Verde = selectat, roșu = neselectat

**Rând sportiv dublu (doua_quyenuri):**
- Rând 1: label `Q1` (verde) + opțiuni inline clicabile
- Rând 2: label `Q2` (galben) + aceleași opțiuni, dar opțiunea = Q1 este dezactivată
- Q2 afișează "Selectează Q1 mai întâi" dacă Q1 lipsă
- `rowSpan={2}` pe coloanele Sportiv, Categorie, Grad

### 4.4 — Filtre + bulk-select
- Chips filtrare grad: afișate dinamic din gradele sportivilor activi
- Buton "↓ Prima opțiune Q1 pentru toți vizibili" → setează Q1=opts[0] pentru toți sportivii vizibili
- Counter: `X/Y sportivi cu înlănțuire completă`

### 4.5 — Validare
- Avertisment dacă orice sportiv are Q1 lipsă
- Avertisment dacă orice sportiv cu `doua_quyenuri` are Q2 lipsă
- Pasul 3 accesibil indiferent (nu blocat hard — avertismente informative)

---

## Faza 5 — Pas 3: Formare echipe (redesign)

Componenta `Pas3FormareEchipe` — redesign față de implementarea actuală.

### 5.1 — Categorii afișate
Doar categorii cu `tip_participare IN ('pereche', 'echipa')`:
- Song Luyen: `sportivi_per_echipa_min = sportivi_per_echipa_max = 2`, `rezerve_max = 0`
- Sincron: `sportivi_per_echipa_min = sportivi_per_echipa_max = 3`, `rezerve_max = 0`
- Giao Dau: `sportivi_per_echipa_min = sportivi_per_echipa_max = 2`, `rezerve_max` din config

### 5.2 — Tab-uri categorii
- Un tab per categorie echipă
- Indicator stare: `✓` verde (completă + validă), `✗` roșu (probleme), gol (neînceput)
- Tab roșu = are erori

### 5.3 — Bloc erori navigabil
Sus, afișat dacă există echipe incomplete sau fără program:
```
⚠ 2 probleme de rezolvat:
  Song Luyen Mixt 18-39 — Lipsesc 1 titular  [→ mergi acolo]
  Sincron Masc 18-39 — Program neselecționat  [→ mergi acolo]
```
Click pe "mergi acolo" → `setActiveTab(catId)` + scroll la panel.

### 5.4 — Panel echipă (layout 2 coloane)

**Coloana stânga — Pool eligibili:**
- Sportivi: `selIds ∩ isEligTeam(sportiv, categorie)`
- Filtrare gen automată: `gen='Masculin'` → pool doar băieți, `gen='Feminin'` → fete, `gen='Mixt'` → toți
- Butoane `+ T` (titular) și `+ R` (rezervă dacă `rezerve_max > 0`)

**Gender locking pentru Mixt:**
```typescript
function canAddToTitulari(cat: CategorieCompetitie, athGen: string, titulari: string[]): boolean {
  if (cat.gen !== 'Mixt') return true;
  const nF = titulari.filter(id => getAth(id).gen === 'Feminin').length;
  const nM = titulari.filter(id => getAth(id).gen === 'Masculin').length;
  const remaining = cat.sportivi_per_echipa_max - titulari.length;
  if (remaining <= 0) return false;
  if (athGen === 'Masculin') return (remaining - 1) >= Math.max(0, 1 - nF);
  return (remaining - 1) >= Math.max(0, 1 - nM);
}
```
- Buton `+ T` `disabled` când `canAddToTitulari` returnează false
- Badge `🔒 Trebuie fată/băiat mai întâi` lângă nume sportiv blocat
- Banner galben deasupra pool-ului când un gen e blocat

**Coloana dreapta — Componență + program:**
- Dropzone titulari (border verde când complet)
- Dropzone rezerve (border neutru, opțional)
- Mesaj validare: ✓ sau mesaj specific de eroare
- **Program SL/Sincron** — apare **după** ce echipa e completă:
  - Song Luyen: opțiuni din `SL_PROG[gradMin]`
  - Sincron: opțiuni din `DREPTURI[gradMin]`
  - Radio-style, o selecție per echipă

### 5.5 — State echipe
```typescript
type TeamBuild = { titulari: string[]; rezerve: string[]; program: string };
const [teamBuilds, setTeamBuilds] = useState<Map<string, TeamBuild>>(new Map());
```

---

## Faza 6 — Pas 4: Sumar + Salvare

### 6.1 — Sumar individual
Grupat pe categorii auto-asignate:
```
TQ Masc 18-39 · CN Dang  [2Q]  (2 sportivi)
  Dan Constantin    Q1: Huyen Quyen 1 · Q2: Long Ho Quyen
  Ion Marinescu     Q1: Huyen Quyen 2 · Q2: Loi Tran Quyen  ⚠ Q2 lipsă
```

### 6.2 — Sumar echipe
```
♂ Song Luyen Masc 18-39  ✓
  Titulari: Mihai, Cristian
  Program: QK 1 contra QK 3

⚥ Sincron Mixt 18-39  ✗
  Titulari: Radu, Ana, Maria
  Program: ⚠ neselecționat
```

### 6.3 — Salvare în DB
Funcție `handleSave()`:

**Individual:**
```typescript
for (const [sportivId, catId] of autoCategorie) {
  const pick = quyenAles.get(sportivId);
  await supabase.from('inscrieri_competitie').insert({
    competitie_id: competitie.id,
    categorie_id: catId,
    club_id: clubId,
    sportiv_id: sportivId,
    status: 'inscris',
    quyen_ales: pick?.q1 ?? null,
    quyen_ales_2: pick?.q2 ?? null,
    // acord_parental: ELIMINAT
  });
}
```

**Echipe:**
```typescript
for (const [catId, build] of teamBuilds) {
  if (!build.titulari.length) continue;
  const { data: echipa } = await supabase.from('echipe_competitie').insert({
    competitie_id, categorie_id: catId, club_id, status: 'inscrisa',
    quyen_ales: build.program ?? null,
  }).select().single();
  
  for (const [i, sportivId] of build.titulari.entries()) {
    await supabase.from('echipa_sportivi').insert({
      echipa_id: echipa.id, sportiv_id: sportivId, rol: 'titular', pozitie: i + 1,
    });
  }
  for (const sportivId of build.rezerve) {
    await supabase.from('echipa_sportivi').insert({
      echipa_id: echipa.id, sportiv_id: sportivId, rol: 'rezerva',
    });
  }
}
```

---

## Ordine de execuție

```
F1 (DB)  →  F2 (Types)  →  F3 (Pas1)  →  F4 (Pas2)  →  F5 (Pas3)  →  F6 (Pas4+Save)
```

Fiecare faza se testează local înainte de a continua.

---

## Checklist implementare

- [ ] F1.1 — SQL: `doua_quyenuri` pe `categorii_competitie`
- [ ] F1.2 — SQL: `quyen_ales_2` pe `inscrieri_competitie`
- [ ] F1.3 — SQL: drop `acord_parental` din `inscrieri_competitie`
- [ ] F2.1 — `types.ts`: `CategorieCompetitie.doua_quyenuri`
- [ ] F2.2 — `types.ts`: `InscriereCompetitie.quyen_ales` + `quyen_ales_2`
- [ ] F3 — Pas1 refactorizat: categorie auto pe card, ascunde neeligibili, elimină acord_parental
- [ ] F4 — Pas2 redesign: tabel coloane, filtre grad, bulk-select, 2Q (Q1+Q2)
- [ ] F5 — Pas3 redesign: gender locking, program în panel, erori navigabile
- [ ] F6 — Pas4 + Save: sumar Q1/Q2, insert fără acord_parental
- [ ] Test end-to-end: selecție → quyen → echipă Mixt → save → verif DB

---

## Note implementare

- **`drepturi_grad_competitie`**: query existent în wizard (~linia 1540) reutilizat → map `gradOrdine → string[]`
- **Responsivitate**: Pas2 tabel → overflow-x scroll pe mobil cu header sticky. Pas3 grid2 → stacked pe mobil (`grid-cols-1 md:grid-cols-2`)
- **Mixt 'Mixt'**: în DB `gen = 'Mixt'`, în pool filtrare = toți, în validare = min 1F + 1M
- **`gradMin` echipă**: `Math.min(...titulari.map(id => getGrad(id).ordine))` → determină opțiunile program SL/Sincron
