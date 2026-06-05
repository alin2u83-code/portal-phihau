# Phase 4: Stagii Completare - Research

**Researched:** 2026-06-05
**Domain:** Modul Stagii (StagiiCompetitii.tsx) — creare stagiu, înscriere sportiv, taxare, raport participanți
**Confidence:** HIGH — cod sursă citit direct, schema DB din migrații SQL

---

## Summary

Modulul Stagii este implementat parțial în `StagiiCompetitii.tsx`. Există deja: formular creare stagiu cu switch Federatie/Club, înscrierea sportivilor cu generare plată, listare participanți. Lipsesc: prețuri per categorie de participant (STG-05), tab participanți cu status plată (STG-04), și — cel mai critic — `preturiConfig` nu este niciodată fetchat din DB în `useDataProvider.ts`, ceea ce face ca taxa globală (fallback STG-02) să fie mereu `undefined`.

Faza 4 necesită: (1) o migrație SQL pentru prețuri per categorie pe eveniment (nu pe tip stagiu global), (2) logică de calcul taxa în funcție de vârsta sportivului la data stagiului, (3) un tab Participanți cu tabel complet + export CSV, și (4) fix pentru fetch `preturiConfig`.

**Recomandare primară:** Adaugă coloane `pret_copii`, `pret_grade`, `pret_centuri` direct pe tabela `evenimente` (nu pe `tipuri_stagii`), pentru că prețurile diferă per eveniment concret, nu per tip. Implementează logica de categorizare în `handleAddParticipant` din `EvenimentDetail`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Creare stagiu (club/federatie) | Frontend (StagiiCompetitii.tsx) | DB (evenimente) | Formular React cu insert în `evenimente` |
| Categorisire participant (vârstă) | Frontend (EvenimentDetail) | — | Calcul JS pe `data_nasterii` sportiv |
| Calcul taxă per categorie | Frontend (handleAddParticipant) | DB (evenimente.pret_*) | Prețurile vin din eveniment, logica în JS |
| Generare plată la înscriere | Frontend (EvenimentDetail) | DB (plati) | Insert direct în `plati` cu supabase |
| Vizibilitate stagiu club vs federatie | DB (RLS + club_id) | Frontend (filteredData) | Filtru withClub în useDataProvider |
| Tab participanți cu status plată | Frontend (EvenimentDetail) | DB (rezultate + plati join) | Secțiune nouă în componentă existentă |
| Export CSV participanți | Frontend (EvenimentDetail) | — | Pattern Blob/URL.createObjectURL existent în cod |

---

## Standard Stack

### Existent — nu se adaugă nimic nou

| Librărie/Pattern | Scop | Observație |
|-----------------|------|------------|
| `supabase` (client existent) | SELECT/INSERT pe `evenimente`, `rezultate`, `plati`, `tipuri_stagii` | Injectat ca header `active-role-context-id` |
| `useData()` / DataContext | Acces la `filteredData.rezultate`, `filteredData.plati`, `preturiConfig` | Singleton în componentă |
| `getPretValabil()` din `utils/pricing.ts` | Fallback taxa globală din `preturiConfig` | Există, funcționează deja |
| `components/ui.tsx` | Button, Card, Input, Select, Modal, Switch | Design system intern |
| `PapaParse` (deja instalat) | Export CSV participanți | `Papa.unparse()` — utilizat în FederationSportiviReport |
| `useError()` / `showError`, `showSuccess` | Feedback utilizator | Pattern standard în toată aplicația |

**Instalare necesară:** Niciuna. Nu se adaugă librării externe.

---

## Package Legitimacy Audit

> Nu se instalează pachete noi în această fază. Secțiunea nu se aplică.

---

## Architecture Patterns

### System Architecture Diagram

```
User (ADMIN_CLUB / INSTRUCTOR)
        |
        v
StagiiCompetitiiManagement (lista stagii)
        |
        v --- click pe stagiu
        v
EvenimentDetail (participanți + înscriere)
        |
        +--- [TAB NOU STG-04] ParticipantiTab
        |       | filtrare rezultate pe eveniment_id
        |       | join cu plati pe sportiv_id + tip='Taxa Stagiu' + descriere
        |       | afișare: sportiv | data_inscriere | taxa | status
        |       | buton Export CSV --> Blob download
        |
        +--- [FORM EXISTENT, EXTINS STG-02/STG-05] InscriereForm
                | caută sportiv
                | calculeaza_categorie(sportiv.data_nasterii, eveniment.data)
                |   -> 'copii' | 'grade' | 'centuri_negre'
                | taxa = eveniment.pret_[categorie] ?? tipStagiuPret ?? fallback_global
                | INSERT rezultate
                | INSERT plati (tip='Taxa Stagiu', club_id=sportiv.club_id)
```

### Recommended Project Structure

Nu se adaugă fișiere noi. Toate modificările sunt în fișierele existente:

```
components/Competitii/
├── StagiiCompetitii.tsx    # principala modificare (EvenimentDetail + EvenimentForm)
├── StagiiManagement.tsx    # nemodificat (wrapper)
├── TipuriStagiiAdmin.tsx   # nemodificat
sql/migrations/
├── add_pret_per_categorie_stagiu.sql  # MIGRATIE NOUA (STG-05)
hooks/
├── useDataProvider.ts      # FIX: adaugă fetch pentru preturiConfig (STG-02 fallback)
types.ts                    # extindere interfata Eveniment cu pret_copii/pret_grade/pret_centuri
```

### Pattern 1: Calcul categorie participant după vârstă

**Ce face:** Determină categoria de preț a unui sportiv la data stagiului.
**Când se folosește:** La înscrierea unui sportiv în `handleAddParticipant`.

```typescript
// Implementare în EvenimentDetail — inline, fără funcție separată
const calculeazaCategorieStagiu = (
  dataNasterii: string,
  dataStagiu: string
): 'copii' | 'grade' | 'centuri_negre' => {
  const nastere = new Date(dataNasterii);
  const stagiu = new Date(dataStagiu);
  const varsta = stagiu.getFullYear() - nastere.getFullYear()
    - (stagiu < new Date(nastere.getFullYear() + (stagiu.getFullYear() - nastere.getFullYear()), nastere.getMonth(), nastere.getDate()) ? 1 : 0);
  if (varsta >= 7 && varsta <= 12) return 'copii';
  if (varsta >= 13 && varsta < 18) return 'grade'; // + grad centura neagra = centuri_negre
  return 'centuri_negre'; // >= 18 sau centura neagra
};
```

**Observație:** Definițiile exacte Copii/Grade/Centuri Negre sunt din context (STG-05): Copii 7-12 ani / Grade min 13 ani / Centuri Negre. Logica de centuri negre vs grade la aceeasi varsta necesita verificarea `grad_actual_id` sportivului.

### Pattern 2: Export CSV participanți (pattern existent)

```typescript
// Copiat din components/Competitii/index.tsx linia 593
const exportParticipantiCSV = (participanti: ParticipantRow[]) => {
  const linii = ['Sportiv,Data Inscriere,Taxa (lei),Status Plata'];
  participanti.forEach(p => {
    linii.push([
      `"${p.numeSportiv}"`,
      `"${p.dataInscriere}"`,
      String(p.taxa),
      `"${p.statusPlata}"`,
    ].join(','));
  });
  const blob = new Blob([linii.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `participanti_stagiu.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Anti-Patterns de evitat

- **Nu crea un hook nou** pentru fetch date stagiu — useData() are tot ce e necesar, nu se adaugă query-uri separate.
- **Nu modifica `tipuri_stagii`** pentru prețuri per categorie — prețurile diferă per eveniment concret, nu per tip. Coloana `pret` din `tipuri_stagii` rămâne ca fallback intermediar (dacă evenimentul nu are pret propriu).
- **Nu strica `EvenimentForm`** — switch-ul Federație/Club funcționează corect, se adaugă doar câmpuri pentru prețuri.
- **Nu face JOIN complex în frontend** pentru tab participanți — filtrează `filteredData.plati` după `sportiv_id` din rezultate + `tip === 'Taxa Stagiu'`.

---

## Don't Hand-Roll

| Problemă | Nu construi | Folosește | De ce |
|----------|-------------|-----------|-------|
| Export CSV | Parser manual | Pattern Blob din `components/Competitii/index.tsx:593` | Deja testat, funcționează |
| Calcul vârstă | Librărie dedicată | Aritmetică Date JS simplă (la fel ca `calculeazaVarstaLaData` din `utils/eligibilitateCompetitie.ts`) | Nu merită dependință externă pentru o formulă |
| Fetch date participanți | Query separat | `filteredData.rezultate.filter(r => r.eveniment_id === ...)` + join cu `filteredData.plati` | Date deja în cache, nu re-fetch |
| Generare plată | Logică custom | INSERT direct + `setPlati` (pattern existent în `handleAddParticipant`) | Pattern stabilit în codebase |

---

## Starea actuală a modulului Stagii

### Ce există și funcționează

| Feature | Fișier | Status |
|---------|--------|--------|
| Listare stagii (filtrare tip=Stagiu) | StagiiCompetitii.tsx:393 | Funcțional |
| Creare stagiu cu denumire/date/locatie/tip_stagiu | StagiiCompetitii.tsx:EvenimentForm | Funcțional |
| Switch Federatie/Club (pentru SUPER_ADMIN) | StagiiCompetitii.tsx:74-79 | Funcțional — `club_id=null` pentru federație, `club_id=currentUser.club_id` pentru club |
| Listare participanți înscriși (nume + grad + rezultat) | StagiiCompetitii.tsx:279 | Funcțional dar minimal |
| Înscrierea unui sportiv | StagiiCompetitii.tsx:221-251 | Funcțional dar cu buguri grave (taxa mereu undefined) |
| Generare plată la înscriere | StagiiCompetitii.tsx:239-244 | Funcțional structural, dar taxa = 0 (bugul preturiConfig) |
| Ștergere participant | StagiiCompetitii.tsx:253-263 | Funcțional |
| Secțiune CVD arme (stagii naționale) | StagiiCompetitii.tsx:312-368 | Funcțional |
| Editare/Ștergere stagiu | StagiiCompetitii.tsx:396-425 | Funcțional |
| Admin tipuri stagii | TipuriStagiiAdmin.tsx | Funcțional (via TipuriNomenclatorAdmin) |

### Ce lipsește / este stricat

| Gap | Cerință | Severitate |
|-----|---------|------------|
| `preturiConfig` mereu `[]` în useDataProvider | STG-02 (fallback taxa globală) | CRITIC — taxa la înscriere este mereu 0 |
| Taxa per categorie participant (Copii/Grade/CN) | STG-05 | Major — prețuri diferite nu există |
| Prețuri per eveniment lipsesc din schema DB | STG-05 | Major — necesită migrație SQL |
| Tab participanți cu data_inscriere + taxă + status plată | STG-04 | Major — tabelul actual nu arată plata |
| Export CSV participanți | STG-04 | Minor — funcționality lipsă |
| Stagiu de club (ADMIN_CLUB): switch NU este vizibil | STG-01 | Minor — logica e corectă, dar switch-ul e ascuns pentru non-federation |

---

## Schema DB actuală vs necesară

### Tabela `evenimente` — stare actuală

```sql
-- Câmpuri relevante existente (din types.ts + migrații)
id                UUID PK
denumire          TEXT
data              DATE
data_sfarsit      DATE
locatie           TEXT
organizator       TEXT
tip               TEXT ('Stagiu' | 'Competitie')
club_id           UUID NULL  -- NULL = federație, NOT NULL = club specific
tip_eveniment     TEXT ('CLUB' | 'FEDERATIE')
vizibilitate_globala BOOLEAN
tip_stagiu        TEXT DEFAULT 'general'  -- FK spre tipuri_stagii.cod (text, nu UUID)
probe_disponibile TEXT[]
```

### Tabela `tipuri_stagii` — stare actuală

```sql
id       UUID PK
cod      TEXT UNIQUE  -- 'qkd', 'cvd', 'tam_the', 'general'
denumire TEXT
activ    BOOLEAN
ordine   INT
pret     NUMERIC(10,2) NULL  -- adăugat în add_pret_tipuri_stagii.sql, NULL = fallback global
```

### Tabela `rezultate` — stare actuală

```sql
id          UUID PK
sportiv_id  UUID
eveniment_id UUID
rezultat    TEXT
probe       TEXT
-- LIPSESC: data_inscriere (created_at nu e expus în tipul Rezultat)
```

### Tabela `plati` — stare actuală

```sql
id          UUID PK
sportiv_id  UUID NULL
familie_id  UUID NULL
club_id     UUID NULL
suma        NUMERIC
data        DATE
status      TEXT ('Achitat' | 'Neachitat' | 'Achitat Parțial')
descriere   TEXT
tip         TEXT  -- 'Taxa Stagiu' pentru stagii
observatii  TEXT
sesiune_id  UUID NULL  -- FK examene, nu stagii
luna        INT NULL
an          INT NULL
-- LIPSESTE: eveniment_id (FK spre evenimente) — legatura se face prin descriere text
```

### Migrații SQL necesare pentru faza 4

**Migrație 1: Prețuri per categorie pe eveniment (STG-05)**

```sql
-- sql/migrations/add_pret_per_categorie_stagiu.sql
-- Adaugă coloane pret_copii, pret_grade, pret_centuri pe tabela evenimente
-- Toate nullable: NULL = folosește tipuri_stagii.pret sau preturiConfig global

ALTER TABLE public.evenimente
  ADD COLUMN IF NOT EXISTS pret_copii      NUMERIC(10,2),  -- 7-12 ani
  ADD COLUMN IF NOT EXISTS pret_grade      NUMERIC(10,2),  -- min 13 ani (grade colorate)
  ADD COLUMN IF NOT EXISTS pret_centuri    NUMERIC(10,2);  -- centuri negre (dan+)
```

**Migrație 2 (opțional, STG-04): FK plati -> evenimente**

```sql
-- Permite join direct pentru tab participanți
-- RISC: poate eșua dacă plăți istorice nu au eveniment_id
-- ALTERNATIVĂ SIGURA: filtrare prin descriere text (tip='Taxa Stagiu' + sportiv_id)
ALTER TABLE public.plati
  ADD COLUMN IF NOT EXISTS eveniment_id UUID REFERENCES public.evenimente(id) ON DELETE SET NULL;

-- Populare retroactivă: NU se face automat (descriere e text free-form)
-- Plățile noi vor include eveniment_id
```

**Notă:** Migrația 2 este riscantă pentru date existente. Alternativa: filtrare prin `tip='Taxa Stagiu'` + `sportiv_id` + `data` aproximativă (deja funcționează în PlatiScadente).

**Migrație 3: `created_at` expus în tipul `Rezultat` (STG-04 — data înscrierii)**

```sql
-- Fără migrație SQL — se adaugă `created_at` la SELECT query:
-- supabase.from('rezultate').select('*, created_at')
-- + se adaugă created_at?: string în interfața Rezultat din types.ts
```

---

## Buguri critice identificate

### Bug 1: `preturiConfig` mereu array vid (CRITIC pentru STG-02)

**Cauza:** În `hooks/useDataProvider.ts`, câmpul `preturiConfig: PretConfig[]` este declarat în `AppData` și inițializat ca `[]`. Nu există niciun query în `criticalQueries` sau `deferredQueries` care să îl populeze din DB.

**Efectul în cod:** `StagiiCompetitii.tsx:229` — `getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data)` returnează mereu `undefined`. Plata este generată doar dacă `taxaConfig` există, deci nicio plată nu e generată niciodată.

**Fix necesar:** Adaugă în `fetchAppData()` → `deferredQueries`:
```typescript
preturiConfig: cleanedSupabase.from('preturi_config').select('*'),
// SAU dacă tabela DB se numește altfel (din DataMaintenancePage.tsx):
preturiConfig: cleanedSupabase.from('preturi_config').select('*'),
```

**ATENȚIE:** Tabela DB se numește `preturi_config` (din `DataMaintenancePage.tsx:11`), nu `preturiConfig`. Verifică în Supabase că tabela există.

### Bug 2: Plata generată la înscriere stagiu nu are `eveniment_id` (pentru STG-04)

**Cauza:** Plata creată în `handleAddParticipant` nu include FK spre eveniment.

**Efectul:** Tab participanți poate lega plata la eveniment doar prin filtrare `sportiv_id + tip='Taxa Stagiu' + data` (aproximativ). Dacă sportivul e înscris la mai multe stagii în aceeași perioadă, asocierea e ambiguă.

**Fix:** După migrația `add_pret_per_categorie_stagiu.sql`, adaugă `eveniment_id: eveniment.id` la obiectul `newPlata`.

### Bug 3: Switch "Eveniment de Federație" vizibil doar pentru `isFederationAdmin || isSuperAdmin`

**Linia:** `StagiiCompetitii.tsx:110` — `{(permissions.isFederationAdmin || permissions.isSuperAdmin) && (...)}`

**STG-01 cere:** Adminul de club poate crea stagii de club (fără switch). Aceasta funcționează deja dacă switch-ul lipskeste — `club_id = currentUser.club_id` este setul implicit. Deci STG-01 este **deja implementat** pentru ADMIN_CLUB, switch-ul e vizibil doar pentru federație. Nu e bug, e by design.

---

## Common Pitfalls

### Pitfall 1: Calcul vârstă incorect la granița de an

**Ce merge prost:** `new Date().getFullYear() - new Date(dataNasterii).getFullYear()` dă vârsta greșită dacă ziua de naștere n-a trecut încă în anul curent.
**De ce:** JavaScript Date nu face automat ajustarea lunii/zilei.
**Cum se evită:** Folosește `calculeazaVarstaLaData` din `utils/eligibilitateCompetitie.ts` — aceasta funcție există deja și face calculul corect.

### Pitfall 2: Join plăți-participanți fals pozitiv

**Ce merge prost:** Dacă filtrezi `plati` după `sportiv_id + tip='Taxa Stagiu'` fără `eveniment_id`, un sportiv înscris la 2 stagii în același an va arăta statusul plății unui stagiu la celălalt.
**Cum se evită:** Include `eveniment_id` în INSERT plată (după migrație) și filtrează pe `eveniment_id` în tab participanți.

### Pitfall 3: RLS blochează INSERT plată pentru INSTRUCTOR

**Ce merge prost:** `plati_insert` policy permite doar `SUPER_ADMIN_FEDERATIE`, `ADMIN`, `ADMIN_CLUB`. Un INSTRUCTOR nu poate genera plăți.
**De ce:** Din `fix_rls_all_tables.sql:185`.
**Cum se evită:** `StagiiManagement` trebuie să permită înscrierea doar pentru `isAdminClub` sau mai sus. Adaugă guards în UI sau verifică că instructorii nu au acces la acest modul.

### Pitfall 4: `setRezultate` / `setPlati` updateaza state global, nu refetch

**Ce merge prost:** Dacă faci `setRezultate(prev => [...prev, data])`, state-ul local se actualizează dar next render recalculează `participantiIds` corect. Dacă folosești valori stale din closure, pot apărea duplicări vizuale.
**Cum se evită:** Pattern existent este corect — spread-ul în `setRezultate(prev => [...prev, data])` e corect. Nu schimba în refetch complet.

### Pitfall 5: Tabelul `preturi_config` vs `grade_preturi_config`

**Ce merge prost:** În `DataMaintenancePage.tsx` apar ambele tabele: `preturi_config` și `grade_preturi_config`. Tabela `preturi_config` conține configurările de tip `PretConfig` (Taxa Stagiu, Taxa Competitie etc.), iar `grade_preturi_config` conține prețuri per grad pentru examene.
**Cum se evită:** Fetchul în `useDataProvider` trebuie să citească din `preturi_config`, nu `grade_preturi_config`.

---

## Code Examples

### Exemplu: logica prețuri per categorie (STG-02 + STG-05)

```typescript
// În handleAddParticipant din EvenimentDetail, după ce ai sportivul:
const calculeazaCategorie = (dataNasterii: string, dataStagiu: string) => {
  // Refoloseste calculeazaVarstaLaData din utils/eligibilitateCompetitie.ts
  const varsta = calculeazaVarstaLaData(dataNasterii, dataStagiu);
  // [ASSUMED] Limitele de vârstă din cerința STG-05
  if (varsta >= 7 && varsta <= 12) return 'copii';
  return 'grade'; // >= 13, centuri negre se detecta prin grad
};

// Logica de selectie taxa cu 3 fallback-uri:
const getTaxa = (
  eveniment: Eveniment,
  categorie: 'copii' | 'grade' | 'centuri',
  tipStagii: TipStagiuOpt[],
  preturiConfig: PretConfig[]
): number | null => {
  // Nivel 1: preț specific pe eveniment
  if (categorie === 'copii' && eveniment.pret_copii != null) return eveniment.pret_copii;
  if (categorie === 'grade' && eveniment.pret_grade != null) return eveniment.pret_grade;
  if (categorie === 'centuri' && eveniment.pret_centuri != null) return eveniment.pret_centuri;
  
  // Nivel 2: prețul tip stagiu (tipuri_stagii.pret)
  // [ASSUMED] tipuriStagii e fetchat la mount in EvenimentForm dar nu e disponibil in EvenimentDetail
  // Necesita fie prop drilling, fie query local
  
  // Nivel 3: taxa globala din preturiConfig
  const global = getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data);
  return global?.suma ?? null;
};
```

### Exemplu: filtrare plată per participant în tab (STG-04)

```typescript
// In EvenimentDetail, derivat din filteredData (fara query nou):
const platiParticipanti = useMemo(() => {
  const map = new Map<string, Plata>();
  filteredData.plati
    .filter(p => p.tip === 'Taxa Stagiu' && p.eveniment_id === eveniment.id)
    .forEach(p => {
      if (p.sportiv_id) map.set(p.sportiv_id, p);
    });
  return map;
}, [filteredData.plati, eveniment.id]);
// Fallback dacă eveniment_id nu există pe plăți vechi:
// .filter(p => p.tip === 'Taxa Stagiu' && p.data === eveniment.data && rezultate.some(r => r.sportiv_id === p.sportiv_id))
```

---

## State of the Art

| Abordare Veche | Abordare Curentă | Observație |
|---------------|-----------------|------------|
| Preț global fix pentru toate stagiile | Preț per tip stagiu (tipuri_stagii.pret) — adăugat în jun 2026 | Acum se extinde cu preț per categorie pe eveniment |
| Participanți fără status plată | Tab cu status plată (STG-04) | De implementat în faza 4 |
| Stagii doar de federație | Stagii de club + federație (STG-01) | Logic implementat, switch condiționat |

---

## Assumptions Log

| # | Claim | Secțiune | Risc dacă greșit |
|---|-------|----------|-----------------|
| A1 | Tabela DB se numește `preturi_config` (din DataMaintenancePage.tsx) | Buguri critice / STG-02 | Dacă tabela nu există sau are alt nume, fix-ul din useDataProvider va eșua — verifică în Supabase Dashboard |
| A2 | Limitele de vârstă pentru categorii: Copii 7-12, Grade 13+, Centuri Negre = grad centura neagra | STG-05 | Dacă limitele diferă, calculul taxei va fi incorect — confirma cu utilizatorul |
| A3 | Centura neagra se detectă prin `grad_actual_id` din nomenclatorul de grade | STG-05 | Necesită cunoașterea gradelor "centura neagra" — poate fi mai simplu să tratezi centuri_negre ca grade >= 18 ani |
| A4 | `plati` nu are câmpul `eveniment_id` în schema curentă | Schema DB | Dacă există deja, sari Migrația 2 |

---

## Open Questions (RESOLVED)

1. **Centuri Negre = vârstă sau grad specific?**
   - **REZOLVAT (2026-06-05):** Centuri Negre = grad efectiv Dan 1+, confirmat de utilizator.
   - Implementare: detectare prin `sportiv.grad_actual_id` + lookup în nomenclator grade după denumire/cod care conține 'Dan'. Nu se folosește pragul de vârstă.

2. **`preturi_config` există în Supabase?**
   - **REZOLVAT (2026-06-05):** Confirmată prin SQL: `SELECT EXISTS(...) = true`. Tabela există în producție.
   - Fix-ul din `useDataProvider.ts` este sigur de aplicat.

3. **Migrația `eveniment_id` pe `plati` — aplicată retrospectiv?**
   - **REZOLVAT (2026-06-05):** Coloana se adaugă ca nullable, fără populare retroactivă. Plăți existente rămân cu NULL. Plăți noi (după faza 4) vor include `eveniment_id`. Tab participanți 04-03 are fallback pentru plăți vechi.

---

## Environment Availability

> Faza este cod/config only pentru frontend + migrații SQL aplicate manual în Supabase. Nu există dependințe externe CLI.

| Dependință | Necesar pentru | Disponibil | Fallback |
|-----------|---------------|------------|----------|
| Supabase Dashboard | Aplicare migrații SQL | Confirmat (proiect activ) | — |
| PapaParse | Export CSV | Instalat (package.json) | Blob manual fara PapaParse |
| `calculeazaVarstaLaData` din utils | Calcul vârstă STG-05 | Există în `utils/eligibilitateCompetitie.ts` | Implementare inline simplă |

---

## Project Constraints (from CLAUDE.md)

- **Tech Stack:** React 18 + TypeScript + Tailwind — fără librării externe noi
- **UI:** `components/ui.tsx` design system intern — nu Shadcn/MUI
- **DB:** Migrații SQL în `sql/migrations/` — aplicate manual în Supabase
- **Compatibilitate:** Nu se sparge API-ul existent (GrupaCard, OrarEditorModal, AdaugaSportiviModal)
- **Stagii:** `StagiiCompetitii.tsx` rămâne baza — completăm, nu rescriem
- **Limbă:** română pentru domeniu (variabile UI, mesaje), engleză pentru patternuri tehnice
- **Tipuri:** toate în `types.ts` la rădăcină — nu se creează fișiere separate de tipuri
- **Navigare:** SPA fără URL routing — `activeView` string în NavigationContext
- **Permisiuni:** `usePermissions(activeRoleContext)` + RLS Supabase — nu duplica logica

---

## Security Domain

> `security_enforcement: true` în config.json

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Nu direct | Supabase Auth — deja în loc |
| V3 Session Management | Nu direct | Supabase JWT — deja în loc |
| V4 Access Control | DA | RLS `evenimente_write` + `plati_insert` + permissions.isAdminClub checks în UI |
| V5 Input Validation | DA | Validare `suma > 0` înainte de INSERT plată; `sportivId` obligatoriu |
| V6 Cryptography | Nu | Nu e cazul pentru această fază |

### Known Threat Patterns

| Pattern | STRIDE | Mitigare standard |
|---------|--------|-----------------|
| ADMIN_CLUB creează stagiu cu `club_id` altui club | Tampering | RLS `evenimente_write` + `withClub` helper în fetchAppData |
| INSTRUCTOR generează plăți (RLS blochează) | Elevation of Privilege | `plati_insert` permite doar ADMIN_CLUB+ — verificat în UI cu `permissions.isAdminClub` |
| Export CSV cu date din alte cluburi | Information Disclosure | `filteredData` filtrează deja pe club activ; exportul ia din filteredData |

---

## Sources

### Primary (HIGH confidence)

- `components/Competitii/StagiiCompetitii.tsx` — codul complet citit, fluxul înscrierii documentat
- `hooks/useDataProvider.ts` — confirmat că `preturiConfig` nu e fetchat
- `sql/migrations/add_tipuri_stagii.sql` — schema tipuri_stagii
- `sql/migrations/add_pret_tipuri_stagii.sql` — coloana pret adăugată recent
- `sql/migrations/fix_rls_all_tables.sql` — politici RLS verificate
- `types.ts` — interfețele Eveniment, Rezultat, Plata, TipStagiu, Permissions

### Secondary (MEDIUM confidence)

- `components/DataMaintenancePage.tsx:11` — enumerare tabele DB, confirma existenta `preturi_config`
- `components/Competitii/index.tsx:593` — pattern export CSV copiat

### Tertiary (LOW confidence)

- A1, A2, A3, A4 din Assumptions Log — necesita confirmare în Supabase Dashboard

---

## Metadata

**Confidence breakdown:**
- Stare actuala cod: HIGH — citit direct din sursă
- Schema DB: HIGH — din migrații SQL
- Fix preturiConfig: MEDIUM — tabela DB confirmată din DataMaintenancePage dar nu verificată live
- Logica categorii vârstă STG-05: ASSUMED — limitele 7-12/13+/CN din cerința STG-05

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stack stabil, fără dependințe externe)
