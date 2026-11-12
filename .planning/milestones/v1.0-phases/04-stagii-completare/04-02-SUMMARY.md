---
phase: "04-stagii-completare"
plan: "02"
subsystem: "stagii/pret-calcul"
tags: [react, typescript, stagii, preturi, permisiuni, supabase]
dependency_graph:
  requires:
    - "04-01 — types.ts cu Eveniment.pret_copii|pret_grade|pret_centuri și Plata.eveniment_id"
  provides:
    - "hooks/useDataProvider.ts — preturiConfig fetchat din DB (fix STG-02)"
    - "components/Competitii/StagiiCompetitii.tsx — EvenimentForm câmpuri preț per categorie"
    - "components/Competitii/StagiiCompetitii.tsx — calculeazaCategorieStagiu + getTaxaStagiu"
    - "components/Competitii/StagiiCompetitii.tsx — handleAddParticipant cu eveniment_id + guard permisiuni"
  affects:
    - "PlatiScadente — plățile generate vor avea eveniment_id non-null (Plan 04-03 poate afișa linkul)"
tech_stack:
  added: []
  patterns:
    - "3-level fallback pentru prețuri: pret_copii/pret_grade/pret_centuri → preturiConfig global"
    - "calculeazaVarstaLaData din eligibilitateCompetitie reutilizat pentru categorie stagiu"
    - "usePermissions(activeRoleContext) invocat local în EvenimentDetail (nu prop-drilled)"
    - "useMemo pentru preview taxă calculată în timp real la selecție sportiv"
key_files:
  created: []
  modified:
    - "hooks/useDataProvider.ts"
    - "components/Competitii/StagiiCompetitii.tsx"
decisions:
  - "permissions calculat local în EvenimentDetail via usePermissions(activeRoleContext) — DataContext nu expune permissions"
  - "Grad.nume folosit pentru detectarea Dan (nu Grad.denumire care nu există în tip)"
  - "formState Omit extins cu 'pret_copii'|'pret_grade'|'pret_centuri' pentru a evita conflict tip string vs number|null"
  - "withClub aplicat pe preturi_config query — configurarea prețurilor e per-club"
metrics:
  duration: "18 minute"
  completed: "2026-06-05"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 2
---

# Phase 04 Plan 02: Fix preturiConfig + Prețuri Per Categorie Stagiu

**One-liner:** Fix fetch preturiConfig din DB + câmpuri preț diferențiat (copii/grade/centuri) în EvenimentForm + calcul automat categorie și taxă la înscriere cu INSERT plată incluzând eveniment_id.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix useDataProvider — fetch preturiConfig din DB | `3c23d26` | `hooks/useDataProvider.ts` |
| 2a | EvenimentForm — câmpuri preț per categorie | `8f154a6` | `components/Competitii/StagiiCompetitii.tsx` |
| 2b | EvenimentDetail — calcul categorie + taxă + guard permisiuni | `9d98460` | `components/Competitii/StagiiCompetitii.tsx` |

## What Was Built

### Task 1: Fix useDataProvider — preturiConfig

Adăugat `preturiConfig` în `deferredQueries` cu query `withClub(cleanedSupabase.from('preturi_config').select('*'))` și în `setData` callback:

```typescript
// deferredQueries (linia 351)
preturiConfig: withClub(cleanedSupabase.from('preturi_config').select('*')),

// setData callback
preturiConfig: deferredData.preturiConfig || prev.preturiConfig,
```

Bug critic STG-02 rezolvat: `AppData.preturiConfig` nu mai este array vid după mount.

### Task 2a: EvenimentForm — câmpuri preț per categorie

Modificări în `EvenimentForm`:

1. **formState extins** cu `pret_copii`, `pret_grade`, `pret_centuri` ca string (pentru `<input type="number">`)
2. **Grid 3 coloane** cu Input-uri vizibile condiționat pe `type === 'Stagiu'`
3. **handleSubmit** include prețurile ca `parseFloat()` sau null
4. **useEffect** populează câmpurile la editare eveniment existent

### Task 2b: EvenimentDetail — logică prețuri + permisiuni

**Funcții noi adăugate:**

```typescript
function calculeazaCategorieStagiu(dataNasterii, dataStagiu, gradActualId, grade):
  // vârsta 7-12 → 'copii'; grad conține 'dan' → 'centuri'; altfel → 'grade'

function getTaxaStagiu(eveniment, categorie, preturiConfig):
  // Nivel 1: eveniment.pret_copii/pret_grade/pret_centuri
  // Nivel 3: getPretValabil(preturiConfig, 'Taxa Stagiu', data)
  // Returnează null dacă niciun nivel
```

**handleAddParticipant actualizat:**
- Guard `if (!permissions.isAdminClub) return`
- Calcul categorie și sumă folosind funcțiile de mai sus
- `newPlata` include `eveniment_id: eveniment.id`
- Generează plată doar dacă `suma > 0`
- Resetează și `searchSportiv` după succes

**Preview taxă (useMemo):**
```
Taxa estimată: 150 lei (Categorie: Copii (7-12 ani))
```
Vizibil sub câmpul de căutare sportiv când sportivul e selectat, la stagii.

**Guard UI:** Formularul "Înscrie Participant" e condiționat pe `{permissions.isAdminClub && (...)}`.

## Verification Results

1. `grep -n "preturi_config" hooks/useDataProvider.ts` → match la linia 351 în deferredQueries
2. `grep -n "pret_copii|pret_grade|pret_centuri" StagiiCompetitii.tsx` → 10+ matches (formState, JSX, handleSubmit, populate la edit)
3. `grep -n "eveniment_id.*eveniment.id" StagiiCompetitii.tsx` → matches la liniile 290 și 308 (rezultat + plată)
4. `grep -n "calculeazaCategorieStagiu" StagiiCompetitii.tsx` → definiție la 138, apeluri la 281 și 341
5. `npx tsc --noEmit` → 0 erori

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grad.denumire → Grad.nume**
- **Found during:** Task 2b — TypeScript compilation
- **Issue:** Planul menționa `grad.denumire.includes('Dan')` dar interfața `Grad` are câmpul `nume`, nu `denumire`
- **Fix:** Înlocuit `grad.denumire` cu `grad.nume` în `calculeazaCategorieStagiu`
- **Files modified:** `components/Competitii/StagiiCompetitii.tsx`
- **Commit:** `9d98460`

**2. [Rule 1 - Bug] permissions nu este expus de useData()**
- **Found during:** Task 2b — TypeScript compilation
- **Issue:** Planul specifica `const { ..., permissions } = useData()` dar `useDataProvider` nu returnează `permissions` (e calculat intern)
- **Fix:** Importat `usePermissions` și calculat permisiunile local: `const permissions = usePermissions(activeRoleContext)`
- **Files modified:** `components/Competitii/StagiiCompetitii.tsx`
- **Commit:** `9d98460`

**3. [Rule 1 - Bug] formState tip conflict string vs number|null**
- **Found during:** Task 2a — TypeScript compilation
- **Issue:** `Omit<Eveniment, 'id' | 'probe_disponibile'> & { pret_copii: string }` genera tipul `never` pentru pret_copii deoarece Eveniment.pret_copii e `number | null`
- **Fix:** Omis și câmpurile preț din Eveniment în tipul formState: `Omit<Eveniment, 'id' | 'probe_disponibile' | 'pret_copii' | 'pret_grade' | 'pret_centuri'>`
- **Files modified:** `components/Competitii/StagiiCompetitii.tsx`
- **Commit:** `8f154a6`

## Known Stubs

Niciun stub prezent. Calculul prețului este complet funcțional cu 3 niveluri de fallback. eveniment_id este inclus în INSERT plată.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-04-04 mitigated | StagiiCompetitii.tsx | Câmpurile pret_copii/pret_grade/pret_centuri vizibile doar când `type === 'Stagiu'` — nu pot fi setate accidental pe competiții |

## Self-Check: PASSED

- [x] `hooks/useDataProvider.ts` modificat — `preturi_config` în deferredQueries
- [x] `components/Competitii/StagiiCompetitii.tsx` modificat — câmpuri preț + calcul categorie
- [x] `3c23d26` — commit Task 1 există în git log
- [x] `8f154a6` — commit Task 2a există în git log
- [x] `9d98460` — commit Task 2b există în git log
- [x] TypeScript compilation: 0 erori
- [x] `eveniment_id: eveniment.id` prezent în INSERT plată
- [x] Guard `permissions.isAdminClub` prezent pe formular și în handleAddParticipant
