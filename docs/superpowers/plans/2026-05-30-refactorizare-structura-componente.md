# Refactorizare Structură Componente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mută ~70 fișiere flat din `components/` în subfoldere tematice și adaugă path aliases pentru a elimina `../../` hell.

**Architecture:** Fiecare modul (Plati, GestiuneExamene, Prezenta etc.) devine un subfolder în `components/`. Orchestratoarele plate (GestiuneExamene.tsx, Prezenta.tsx, Grupe.tsx) se mută ca `index.tsx` în folderul lor — rezoluția Vite/TS rămâne identică, deci `LazyComponents.tsx` nu se schimbă pentru ele. Path aliases (`@components`, `@hooks`, `@contexts`) se adaugă în Vite + tsconfig.

**Tech Stack:** Vite (resolve.alias), TypeScript (paths), PowerShell move commands, `npm run lint` pentru verificare.

---

## Structura țintă

```
components/
├── AIAssistant/        ← existent
├── Competitii/         ← existent + adăugăm index.tsx + fișiere noi
├── GestiuneExamene/    ← existent + adăugăm index.tsx + ~13 fișiere
├── Grade/              ← NOU — 8 fișiere
├── GhidUtilizator/     ← existent, neatins
├── Grupe/              ← existent + adăugăm index.tsx + 2 fișiere
├── Plati/              ← NOU — 17 fișiere
├── Prezenta/           ← existent + adăugăm index.tsx + 10 fișiere
├── SMS/                ← existent, neatins
├── SportivDashboard/   ← existent + adăugăm index.tsx
├── Sportivi/           ← existent + ~11 fișiere noi
├── Tutorial/           ← existent, neatins
├── UserProfile/        ← existent, neatins
├── layout/             ← existent, neatins (gol)
├── routing/            ← existent, neatins (gol)
│
│   # Shared — rămân flat în components/:
├── ui.tsx
├── icons.tsx
├── AppRouter.tsx
├── AppLayout.tsx
├── LazyComponents.tsx
├── menuConfig.ts
├── Sidebar.tsx
├── Header.tsx
├── AdminHeader.tsx
├── ErrorBoundary.tsx
├── ErrorProvider.tsx
├── ErrorNotification.tsx
├── SystemGuardian.tsx
├── ClubGuard.tsx
├── ProtectedRoute.tsx
├── ProtectedGate.tsx
├── ResponsiveTable.tsx
├── Logo.tsx
├── MartialArtsSkeleton.tsx
├── MobileSkeletonLoader.tsx
├── AccessDenied.tsx
├── ConfirmDeleteModal.tsx
├── NavMenu.tsx
│   # Auth — rămân flat (importate direct în App.tsx / AppRouter.tsx):
├── LoginPage.tsx
├── ResetPasswordPage.tsx
├── MandatoryPasswordChange.tsx
├── RoleSelectionPage.tsx
├── InscrierePublicPage.tsx
│   # Miscellaneous rămân flat:
├── CalendarView.tsx
├── Activitati.tsx
├── ActivitatiNationale.tsx  (sau → Competitii/)
├── WelcomeHero.tsx
├── RoleSwitcher.tsx
├── IdentitySwitcher.tsx
└── ...
```

---

## Fișiere modificate

| Fișier | Tip modificare |
|--------|---------------|
| `vite.config.ts` | Adăugare `resolve.alias` |
| `tsconfig.json` | Adăugare `paths` noi |
| `components/LazyComponents.tsx` | Update ~15 import paths pentru fișierele mutate |
| `components/GestiuneExamene.tsx` → `GestiuneExamene/index.tsx` | Redenumire + fix imports interne |
| `components/Prezenta.tsx` → `Prezenta/index.tsx` | Redenumire + fix imports interne |
| `components/Grupe.tsx` → `Grupe/index.tsx` | Redenumire + fix imports interne |
| `components/SportivDashboard.tsx` → `SportivDashboard/index.tsx` | Redenumire + fix imports interne |
| `components/CompetitiiManagement.tsx` → `Competitii/index.tsx` | Redenumire + fix imports interne |
| 17 fișiere → `components/Plati/` | Move + fix imports |
| 13 fișiere → `components/GestiuneExamene/` | Move + fix imports |
| 10 fișiere → `components/Prezenta/` | Move + fix imports |
| 8 fișiere → `components/Grade/` | Move + fix imports |
| 11 fișiere → `components/Sportivi/` | Move + fix imports |
| 6 fișiere → `components/Competitii/` | Move + fix imports |
| `docs/arhitectura.md` | Update structura foldere |

---

## Task 1: Path Aliases — Vite + TypeScript

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Adaugă `path` import în vite.config.ts**

```typescript
// vite.config.ts — adaugă la începutul fișierului, după import-urile existente
import path from 'path';
```

- [ ] **Step 2: Adaugă `resolve.alias` în vite.config.ts**

Adaugă în obiectul returnat de `defineConfig`, după `plugins`:

```typescript
resolve: {
  alias: {
    '@components': path.resolve(__dirname, 'components'),
    '@hooks': path.resolve(__dirname, 'hooks'),
    '@contexts': path.resolve(__dirname, 'contexts'),
  },
},
```

Rezultatul final al return-ului din defineConfig arată așa:

```typescript
return {
  plugins: [
    react(),
    claudeProxyPlugin(env.CLAUDE_API_KEY || ''),
  ],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'components'),
      '@hooks': path.resolve(__dirname, 'hooks'),
      '@contexts': path.resolve(__dirname, 'contexts'),
    },
  },
  build: {
    rollupOptions: { ... } // neatins
  },
};
```

- [ ] **Step 3: Adaugă paths în tsconfig.json**

```json
"paths": {
  "@/*": ["./*"],
  "@components/*": ["./components/*"],
  "@hooks/*": ["./hooks/*"],
  "@contexts/*": ["./contexts/*"]
}
```

Și adaugă `contexts` și `hooks` în `include`:

```json
"include": ["src", "components", "utils", "hooks", "contexts", "types.ts", "supabaseClient.ts"]
```

- [ ] **Step 4: Verifică că build-ul funcționează**

```powershell
npm run lint
```

Expected: no errors (nu am mutat nimic, alias-urile nu afectează cod-ul existent).

- [ ] **Step 5: Commit**

```
git add vite.config.ts tsconfig.json
git commit -m "feat(structure): add @components @hooks @contexts path aliases"
```

---

## Task 2: Plati/ — Creare folder + migrare 17 fișiere

**Files:**
- Create: `components/Plati/` (director nou)
- Move: 17 fișiere (lista mai jos)
- Modify: `components/LazyComponents.tsx`

### Lista fișierelor mutate

```
PlatiScadente.tsx
JurnalIncasari.tsx
TaxeAnuale.tsx
ConfigurarePreturi.tsx
TipuriAbonament.tsx
Reduceri.tsx
FinancialDashboard.tsx
GestiuneFacturi.tsx
FacturiPersonale.tsx
Familii.tsx
FamilieDetail.tsx
FacturaChitantaModal.tsx
FamilyPaymentCard.tsx
PaymentTypePieChart.tsx
RevenueBarChart.tsx
AgingReport.tsx
RaportFinanciar.tsx
```

- [ ] **Step 1: Creează directorul și mută fișierele**

```powershell
New-Item -ItemType Directory -Force "components\Plati"

@(
  "PlatiScadente","JurnalIncasari","TaxeAnuale","ConfigurarePreturi",
  "TipuriAbonament","Reduceri","FinancialDashboard","GestiuneFacturi",
  "FacturiPersonale","Familii","FamilieDetail","FacturaChitantaModal",
  "FamilyPaymentCard","PaymentTypePieChart","RevenueBarChart",
  "AgingReport","RaportFinanciar"
) | ForEach-Object {
  Move-Item "components\$_.tsx" "components\Plati\$_.tsx"
}
```

- [ ] **Step 2: Fix imports în fișierele mutate**

Regula: înlocuiește import-urile din `components/` (shared) cu path-uri relative corecte.

**Pattern general** — în orice fișier din `components/Plati/`:

| Vechi | Nou |
|-------|-----|
| `from './ui'` | `from '../ui'` |
| `from './icons'` | `from '../icons'` |
| `from './ErrorProvider'` | `from '../ErrorProvider'` |
| `from './ConfirmDeleteModal'` | `from '../ConfirmDeleteModal'` |
| `from './ResponsiveTable'` | `from '../ResponsiveTable'` |
| `from './MartialArtsSkeleton'` | `from '../MartialArtsSkeleton'` |
| `from '../types'` | `from '../../types'` |
| `from '../hooks/X'` | `from '../../hooks/X'` |
| `from '../contexts/X'` | `from '../../contexts/X'` |

**Cazuri speciale** — imports cross-Plati (rămân relative în folder):

`RaportFinanciar.tsx` importă în interior: `RevenueBarChart`, `PaymentTypePieChart`, `AgingReport`, `FamilyPaymentCard`, `FacturaChitantaModal` — toate sunt acum în același folder Plati/, deci importurile `'./X'` RĂMÂN `'./X'` (nu se schimbă).

Fă replace-urile cu PowerShell (rulează din rădăcina proiectului):

```powershell
$files = Get-ChildItem "components\Plati" -Filter "*.tsx"
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $content = $content -replace "from '\./ui'", "from '../ui'"
  $content = $content -replace "from '\./icons'", "from '../icons'"
  $content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
  $content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
  $content = $content -replace "from '\./ResponsiveTable'", "from '../ResponsiveTable'"
  $content = $content -replace "from '\./MartialArtsSkeleton'", "from '../MartialArtsSkeleton'"
  $content = $content -replace "from '\./WelcomeHero'", "from '../WelcomeHero'"
  $content = $content -replace "from '\.\.\/types'", "from '../../types'"
  $content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
  $content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
  Set-Content $f.FullName $content -Encoding utf8
}
```

- [ ] **Step 3: Update LazyComponents.tsx**

Înlocuiește aceste linii în `components/LazyComponents.tsx`:

```typescript
// ÎNAINTE:
export const PlatiScadente = lazy(() => import('./PlatiScadente').then(m => ({ default: m.PlatiScadente })));
export const JurnalIncasari = lazy(() => import('./JurnalIncasari').then(m => ({ default: m.JurnalIncasari })));
export const TipuriAbonamentManagement = lazy(() => import('./TipuriAbonament').then(m => ({ default: m.TipuriAbonamentManagement })));
export const ConfigurarePreturi = lazy(() => import('./ConfigurarePreturi').then(m => ({ default: m.ConfigurarePreturi })));
export const RaportFinanciar = lazy(() => import('./RaportFinanciar').then(m => ({ default: m.RaportFinanciar })));
export const FamiliiManagement = lazy(() => import('./Familii').then(m => ({ default: m.FamiliiManagement })));
export const ReduceriManagement = lazy(() => import('./Reduceri').then(m => ({ default: m.ReduceriManagement })));
export const TaxeAnuale = lazy(() => import('./TaxeAnuale').then(m => ({ default: m.TaxeAnuale })));
export const FinancialDashboard = lazy(() => import('./FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
export const GestiuneFacturi = lazy(() => import('./GestiuneFacturi').then(m => ({ default: m.GestiuneFacturi })));
export const IstoricPlati = lazy(() => import('./FacturiPersonale').then(m => ({ default: m.IstoricPlati })));

// DUPĂ:
export const PlatiScadente = lazy(() => import('./Plati/PlatiScadente').then(m => ({ default: m.PlatiScadente })));
export const JurnalIncasari = lazy(() => import('./Plati/JurnalIncasari').then(m => ({ default: m.JurnalIncasari })));
export const TipuriAbonamentManagement = lazy(() => import('./Plati/TipuriAbonament').then(m => ({ default: m.TipuriAbonamentManagement })));
export const ConfigurarePreturi = lazy(() => import('./Plati/ConfigurarePreturi').then(m => ({ default: m.ConfigurarePreturi })));
export const RaportFinanciar = lazy(() => import('./Plati/RaportFinanciar').then(m => ({ default: m.RaportFinanciar })));
export const FamiliiManagement = lazy(() => import('./Plati/Familii').then(m => ({ default: m.FamiliiManagement })));
export const ReduceriManagement = lazy(() => import('./Plati/Reduceri').then(m => ({ default: m.ReduceriManagement })));
export const TaxeAnuale = lazy(() => import('./Plati/TaxeAnuale').then(m => ({ default: m.TaxeAnuale })));
export const FinancialDashboard = lazy(() => import('./Plati/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
export const GestiuneFacturi = lazy(() => import('./Plati/GestiuneFacturi').then(m => ({ default: m.GestiuneFacturi })));
export const IstoricPlati = lazy(() => import('./Plati/FacturiPersonale').then(m => ({ default: m.IstoricPlati })));
```

- [ ] **Step 4: Verifică lint**

```powershell
npm run lint
```

Expected: 0 erori. Dacă apar erori de import → urmează eroarea exact (fișier:linie) și repară.

- [ ] **Step 5: Commit**

```
git add components/Plati/ components/LazyComponents.tsx
git commit -m "refactor(structure): move financial components to components/Plati/"
```

---

## Task 3: GestiuneExamene orchestrator → index.tsx

**Files:**
- Move: `components/GestiuneExamene.tsx` → `components/GestiuneExamene/index.tsx`

LazyComponents importă `'./GestiuneExamene'` → după mutare rezolvă automat la `GestiuneExamene/index.tsx`. **LazyComponents.tsx nu se schimbă.**

- [ ] **Step 1: Mută și redenumește**

```powershell
Move-Item "components\GestiuneExamene.tsx" "components\GestiuneExamene\index.tsx"
```

- [ ] **Step 2: Fix imports interne**

`GestiuneExamene.tsx` importa subcomponentele din `'./GestiuneExamene/X'`. Acum că este `index.tsx` în acel folder, schimbă:

```typescript
// ÎNAINTE (în GestiuneExamene/index.tsx):
import { SesiuneForm } from './GestiuneExamene/SesiuneForm';
import { DetaliiSesiune } from './GestiuneExamene/DetaliiSesiune';

// DUPĂ:
import { SesiuneForm } from './SesiuneForm';
import { DetaliiSesiune } from './DetaliiSesiune';
```

Aplică și pattern-urile generale (shared deps → `../ui`, `../icons`, `../../types` etc.):

```powershell
$f = "components\GestiuneExamene\index.tsx"
$content = Get-Content $f -Raw
$content = $content -replace "from '\./GestiuneExamene\/", "from './"
$content = $content -replace "from '\./ui'", "from '../ui'"
$content = $content -replace "from '\./icons'", "from '../icons'"
$content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
$content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
$content = $content -replace "from '\./MartialArtsSkeleton'", "from '../MartialArtsSkeleton'"
$content = $content -replace "from '\./ManagementInscrieri'", "from './ManagementInscrieri'"
$content = $content -replace "from '\./ImportExamenModal'", "from './ImportExamenModal'"
$content = $content -replace "from '\./ImportTutorial'", "from './ImportTutorial'"
$content = $content -replace "from '\.\.\/types'", "from '../../types'"
$content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
$content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
Set-Content $f $content -Encoding utf8
```

- [ ] **Step 3: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 4: Commit**

```
git add components/GestiuneExamene/
git commit -m "refactor(structure): move GestiuneExamene.tsx to GestiuneExamene/index.tsx"
```

---

## Task 4: GestiuneExamene/ — adaugă subcomponentele plate

**Files:**
- Move: 13 fișiere în `components/GestiuneExamene/`
- Modify: `components/LazyComponents.tsx`

```
FinalizeExam.tsx
HartaExamene.tsx
IstoricExamene.tsx
IstoricExameneSportiv.tsx
RapoarteExamen.tsx
ImportExamenModal.tsx
ImportTutorial.tsx
ManagementInscrieri.tsx
ExamenRegistrationPreview.tsx
ModulDecizieExamen.tsx
ModulInscriereExamen.tsx
ValidareRezultate.tsx
PaginaFinalizare.tsx
```

- [ ] **Step 1: Mută fișierele**

```powershell
@(
  "FinalizeExam","HartaExamene","IstoricExamene","IstoricExameneSportiv",
  "RapoarteExamen","ImportExamenModal","ImportTutorial","ManagementInscrieri",
  "ExamenRegistrationPreview","ModulDecizieExamen","ModulInscriereExamen",
  "ValidareRezultate","PaginaFinalizare"
) | ForEach-Object {
  Move-Item "components\$_.tsx" "components\GestiuneExamene\$_.tsx"
}
```

- [ ] **Step 2: Fix imports în fișierele mutate**

```powershell
$files = Get-ChildItem "components\GestiuneExamene" -Filter "*.tsx" | Where-Object { $_.Name -ne "index.tsx" }
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $content = $content -replace "from '\./ui'", "from '../ui'"
  $content = $content -replace "from '\./icons'", "from '../icons'"
  $content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
  $content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
  $content = $content -replace "from '\./ResponsiveTable'", "from '../ResponsiveTable'"
  $content = $content -replace "from '\./MartialArtsSkeleton'", "from '../MartialArtsSkeleton'"
  $content = $content -replace "from '\.\.\/types'", "from '../../types'"
  $content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
  $content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
  Set-Content $f.FullName $content -Encoding utf8
}
```

- [ ] **Step 3: Update LazyComponents.tsx**

```typescript
// ÎNAINTE:
export const RapoarteExamen = lazy(() => import('./RapoarteExamen').then(m => ({ default: m.RapoarteExamen })));

// DUPĂ:
export const RapoarteExamen = lazy(() => import('./GestiuneExamene/RapoarteExamen').then(m => ({ default: m.RapoarteExamen })));
```

- [ ] **Step 4: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 5: Commit**

```
git add components/GestiuneExamene/ components/LazyComponents.tsx
git commit -m "refactor(structure): consolidate exam components in GestiuneExamene/"
```

---

## Task 5: Prezenta orchestrator → index.tsx + subcomponentele plate

**Files:**
- Move: `components/Prezenta.tsx` → `components/Prezenta/index.tsx`
- Move: 10 fișiere în `components/Prezenta/`
- Modify: `components/LazyComponents.tsx`

### Orchestrator

- [ ] **Step 1: Mută orchestratorul**

```powershell
Move-Item "components\Prezenta.tsx" "components\Prezenta\index.tsx"
```

- [ ] **Step 2: Fix imports interne în index.tsx**

`Prezenta.tsx` importa subcomponentele din `'./Prezenta/X'`. Schimbă la `'./X'`:

```powershell
$f = "components\Prezenta\index.tsx"
$content = Get-Content $f -Raw
$content = $content -replace "from '\./Prezenta\/", "from './"
$content = $content -replace "from '\./ui'", "from '../ui'"
$content = $content -replace "from '\./icons'", "from '../icons'"
$content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
$content = $content -replace "from '\.\.\/types'", "from '../../types'"
$content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
$content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
Set-Content $f $content -Encoding utf8
```

### Subcomponente plate

- [ ] **Step 3: Mută fișierele prezenta**

```powershell
@(
  "MartialAttendance","RaportPrezenta","RaportLunarPrezenta",
  "InstructorPrezentaPage","ListaPrezentaAntrenament","TabelPrezentaVedere",
  "AnuntPrezentaWidget","GeneralAttendanceWidget","IstoricPrezentaSportiv",
  "ArhivaPrezente"
) | ForEach-Object {
  Move-Item "components\$_.tsx" "components\Prezenta\$_.tsx"
}
```

- [ ] **Step 4: Fix imports în fișierele mutate**

```powershell
$files = Get-ChildItem "components\Prezenta" -Filter "*.tsx" | Where-Object { $_.Name -ne "index.tsx" }
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $content = $content -replace "from '\./ui'", "from '../ui'"
  $content = $content -replace "from '\./icons'", "from '../icons'"
  $content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
  $content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
  $content = $content -replace "from '\./ResponsiveTable'", "from '../ResponsiveTable'"
  $content = $content -replace "from '\./MartialArtsSkeleton'", "from '../MartialArtsSkeleton'"
  $content = $content -replace "from '\./ListaPrezentaAntrenament'", "from './ListaPrezentaAntrenament'"
  $content = $content -replace "from '\./Prezenta\/", "from './"
  $content = $content -replace "from '\.\.\/types'", "from '../../types'"
  $content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
  $content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
  Set-Content $f.FullName $content -Encoding utf8
}
```

- [ ] **Step 5: Update LazyComponents.tsx**

```typescript
// ÎNAINTE:
export const PrezentaManagement = lazy(() => import('./Prezenta').then(m => ({ default: m.Prezenta })));
export const MartialAttendance = lazy(() => import('./MartialAttendance').then(m => ({ default: m.MartialAttendance })));
export const RaportPrezenta = lazy(() => import('./RaportPrezenta').then(m => ({ default: m.RaportPrezenta })));
export const InstructorPrezentaPage = lazy(() => import('./InstructorPrezentaPage').then(m => ({ default: m.InstructorPrezentaPage })));
export const ArhivaPrezente = lazy(() => import('./ArhivaPrezente').then(m => ({ default: m.ArhivaPrezente })));
export const RaportLunarPrezenta = lazy(() => import('./RaportLunarPrezenta').then(m => ({ default: m.RaportLunarPrezenta })));
export const RaportActivitate = lazy(() => import('./RaportActivitate').then(m => ({ default: m.RaportActivitate })));

// DUPĂ:
export const PrezentaManagement = lazy(() => import('./Prezenta').then(m => ({ default: m.Prezenta })));  // auto-resolve la Prezenta/index.tsx
export const MartialAttendance = lazy(() => import('./Prezenta/MartialAttendance').then(m => ({ default: m.MartialAttendance })));
export const RaportPrezenta = lazy(() => import('./Prezenta/RaportPrezenta').then(m => ({ default: m.RaportPrezenta })));
export const InstructorPrezentaPage = lazy(() => import('./Prezenta/InstructorPrezentaPage').then(m => ({ default: m.InstructorPrezentaPage })));
export const ArhivaPrezente = lazy(() => import('./Prezenta/ArhivaPrezente').then(m => ({ default: m.ArhivaPrezente })));
export const RaportLunarPrezenta = lazy(() => import('./Prezenta/RaportLunarPrezenta').then(m => ({ default: m.RaportLunarPrezenta })));
```

Notă: `RaportActivitate.tsx` rămâne flat (nu e modul de prezență pur) — nu îl muta.

- [ ] **Step 6: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 7: Commit**

```
git add components/Prezenta/ components/LazyComponents.tsx
git commit -m "refactor(structure): consolidate attendance components in Prezenta/"
```

---

## Task 6: Grade/ — folder nou + 8 fișiere

**Files:**
- Create: `components/Grade/`
- Move: 8 fișiere
- Modify: `components/LazyComponents.tsx`

```
Grade.tsx
AddGradeModal.tsx
MatriceGradePanel.tsx
InlantuciriAdmin.tsx
InlantuireFormModal.tsx
InlantuireGradePanel.tsx
GestionareNomenclatoare.tsx
TipuriNomenclatorAdmin.tsx
```

- [ ] **Step 1: Creează directorul și mută**

```powershell
New-Item -ItemType Directory -Force "components\Grade"

@(
  "Grade","AddGradeModal","MatriceGradePanel","InlantuciriAdmin",
  "InlantuireFormModal","InlantuireGradePanel","GestionareNomenclatoare",
  "TipuriNomenclatorAdmin"
) | ForEach-Object {
  Move-Item "components\$_.tsx" "components\Grade\$_.tsx"
}
```

- [ ] **Step 2: Fix imports**

```powershell
$files = Get-ChildItem "components\Grade" -Filter "*.tsx"
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $content = $content -replace "from '\./ui'", "from '../ui'"
  $content = $content -replace "from '\./icons'", "from '../icons'"
  $content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
  $content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
  $content = $content -replace "from '\./ResponsiveTable'", "from '../ResponsiveTable'"
  $content = $content -replace "from '\.\.\/types'", "from '../../types'"
  $content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
  $content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
  Set-Content $f.FullName $content -Encoding utf8
}
```

- [ ] **Step 3: Update LazyComponents.tsx**

```typescript
// ÎNAINTE:
export const GradeManagement = lazy(() => import('./Grade').then(m => ({ default: m.GradeManagement })));
export const GestionareNomenclatoare = lazy(() => import('./GestionareNomenclatoare').then(m => ({ default: m.GestionareNomenclatoare })));
export const InlantuciriAdmin = lazy(() => import('./InlantuciriAdmin').then(m => ({ default: m.InlantuciriAdmin })));

// DUPĂ:
export const GradeManagement = lazy(() => import('./Grade/Grade').then(m => ({ default: m.GradeManagement })));
export const GestionareNomenclatoare = lazy(() => import('./Grade/GestionareNomenclatoare').then(m => ({ default: m.GestionareNomenclatoare })));
export const InlantuciriAdmin = lazy(() => import('./Grade/InlantuciriAdmin').then(m => ({ default: m.InlantuciriAdmin })));
```

- [ ] **Step 4: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 5: Commit**

```
git add components/Grade/ components/LazyComponents.tsx
git commit -m "refactor(structure): move grade/inlantuiri components to Grade/"
```

---

## Task 7: Grupe orchestrator + adăugare fișiere

**Files:**
- Move: `components/Grupe.tsx` → `components/Grupe/index.tsx`
- Move: `ProgramAntrenamenteManagement.tsx`, `GeneratorProgramMasiv.tsx` → `Grupe/`

- [ ] **Step 1: Mută orchestratorul**

```powershell
Move-Item "components\Grupe.tsx" "components\Grupe\index.tsx"
```

- [ ] **Step 2: Fix imports în Grupe/index.tsx**

```powershell
$f = "components\Grupe\index.tsx"
$content = Get-Content $f -Raw
$content = $content -replace "from '\./Grupe\/", "from './"
$content = $content -replace "from '\./ui'", "from '../ui'"
$content = $content -replace "from '\./icons'", "from '../icons'"
$content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
$content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
$content = $content -replace "from '\.\.\/types'", "from '../../types'"
$content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
$content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
Set-Content $f $content -Encoding utf8
```

- [ ] **Step 3: Mută și fix fișierele suplimentare**

```powershell
Move-Item "components\ProgramAntrenamenteManagement.tsx" "components\Grupe\ProgramAntrenamenteManagement.tsx"
Move-Item "components\GeneratorProgramMasiv.tsx" "components\Grupe\GeneratorProgramMasiv.tsx"
```

Aplică pattern-urile generale de fix imports (Step 2 din Task 2) pentru aceste 2 fișiere.

- [ ] **Step 4: Update LazyComponents.tsx**

```typescript
// ÎNAINTE:
export const GrupeManagement = lazy(() => import('./Grupe').then(m => ({ default: m.Grupe })));
export const ProgramAntrenamenteManagement = lazy(() => import('./ProgramAntrenamenteManagement').then(m => ({ default: m.ProgramAntrenamenteManagement })));

// DUPĂ:
export const GrupeManagement = lazy(() => import('./Grupe').then(m => ({ default: m.Grupe })));  // auto-resolve la Grupe/index.tsx — NESCHIMBAT
export const ProgramAntrenamenteManagement = lazy(() => import('./Grupe/ProgramAntrenamenteManagement').then(m => ({ default: m.ProgramAntrenamenteManagement })));
```

- [ ] **Step 5: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 6: Commit**

```
git add components/Grupe/ components/LazyComponents.tsx
git commit -m "refactor(structure): move Grupe.tsx to index + add group subcomponents"
```

---

## Task 8: Sportivi/ — adăugare fișiere plate

**Files:**
- Move: 11 fișiere în `components/Sportivi/`
- Modify: `components/LazyComponents.tsx`

```
FisaDigitalaSportiv.tsx
DeduplicareSportivi.tsx
ImportSportiviPage.tsx
CereriInscriere.tsx
SportivAvatarEditor.tsx
SportivPassport.tsx
SportivProgressChart.tsx
SportivFeedbackReport.tsx
SportivAccountSettingsModal.tsx
EditareContSportiv.tsx
AthleteQuickActions.tsx
```

- [ ] **Step 1: Mută fișierele**

```powershell
@(
  "FisaDigitalaSportiv","DeduplicareSportivi","ImportSportiviPage",
  "CereriInscriere","SportivAvatarEditor","SportivPassport",
  "SportivProgressChart","SportivFeedbackReport","SportivAccountSettingsModal",
  "EditareContSportiv","AthleteQuickActions"
) | ForEach-Object {
  Move-Item "components\$_.tsx" "components\Sportivi\$_.tsx"
}
```

- [ ] **Step 2: Fix imports**

```powershell
$files = Get-ChildItem "components\Sportivi" -Filter "*.tsx"
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $content = $content -replace "from '\./ui'", "from '../ui'"
  $content = $content -replace "from '\./icons'", "from '../icons'"
  $content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
  $content = $content -replace "from '\./ConfirmDeleteModal'", "from '../ConfirmDeleteModal'"
  $content = $content -replace "from '\./ResponsiveTable'", "from '../ResponsiveTable'"
  $content = $content -replace "from '\./BirthDateInput'", "from '../BirthDateInput'"
  $content = $content -replace "from '\.\.\/types'", "from '../../types'"
  $content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
  $content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
  Set-Content $f.FullName $content -Encoding utf8
}
```

- [ ] **Step 3: Update LazyComponents.tsx**

```typescript
// ÎNAINTE:
export const FisaDigitalaSportiv = lazy(() => import('./FisaDigitalaSportiv').then(m => ({ default: m.FisaDigitalaSportiv })));
export const ImportSportiviPage = lazy(() => import('./ImportSportiviPage').then(m => ({ default: m.ImportSportiviPage })));
export const DeduplicareSportivi = lazy(() => import('./DeduplicareSportivi').then(m => ({ default: m.DeduplicareSportivi })));
export const CereriInscriere = lazy(() => import('./CereriInscriere').then(m => ({ default: m.CereriInscriere })));

// DUPĂ:
export const FisaDigitalaSportiv = lazy(() => import('./Sportivi/FisaDigitalaSportiv').then(m => ({ default: m.FisaDigitalaSportiv })));
export const ImportSportiviPage = lazy(() => import('./Sportivi/ImportSportiviPage').then(m => ({ default: m.ImportSportiviPage })));
export const DeduplicareSportivi = lazy(() => import('./Sportivi/DeduplicareSportivi').then(m => ({ default: m.DeduplicareSportivi })));
export const CereriInscriere = lazy(() => import('./Sportivi/CereriInscriere').then(m => ({ default: m.CereriInscriere })));
```

- [ ] **Step 4: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 5: Commit**

```
git add components/Sportivi/ components/LazyComponents.tsx
git commit -m "refactor(structure): consolidate sportivi components in Sportivi/"
```

---

## Task 9: Competitii/ + SportivDashboard orchestrators

**Files:**
- Move: `CompetitiiManagement.tsx` → `Competitii/index.tsx`
- Move: `SportivDashboard.tsx` → `SportivDashboard/index.tsx`
- Move: `FisaCompetitie.tsx`, `StagiiManagement.tsx`, `StagiiCompetitii.tsx`, `TipuriCompetitieAdmin.tsx`, `TipuriStagiiAdmin.tsx` → `Competitii/`
- Modify: `components/LazyComponents.tsx`

- [ ] **Step 1: Mută orchestratoarele**

```powershell
Move-Item "components\CompetitiiManagement.tsx" "components\Competitii\index.tsx"
Move-Item "components\SportivDashboard.tsx" "components\SportivDashboard\index.tsx"
```

- [ ] **Step 2: Fix imports în Competitii/index.tsx**

Aplică pattern-ul general (./ui → ../ui, ../types → ../../types etc.). Verifică și că importurile spre `Competitii/` subfoldere sunt OK (dacă importa `'./Competitii/X'` → schimbă în `'./X'`).

- [ ] **Step 3: Fix imports în SportivDashboard/index.tsx**

```powershell
$f = "components\SportivDashboard\index.tsx"
$content = Get-Content $f -Raw
$content = $content -replace "from '\./SportivDashboard\/", "from './"
$content = $content -replace "from '\./ui'", "from '../ui'"
$content = $content -replace "from '\./icons'", "from '../icons'"
$content = $content -replace "from '\./ErrorProvider'", "from '../ErrorProvider'"
$content = $content -replace "from '\.\.\/types'", "from '../../types'"
$content = $content -replace "from '\.\.\/hooks\/", "from '../../hooks/"
$content = $content -replace "from '\.\.\/contexts\/", "from '../../contexts/"
Set-Content $f $content -Encoding utf8
```

- [ ] **Step 4: Mută fișierele Competitii suplimentare**

```powershell
@(
  "FisaCompetitie","StagiiManagement","StagiiCompetitii",
  "TipuriCompetitieAdmin","TipuriStagiiAdmin"
) | ForEach-Object {
  Move-Item "components\$_.tsx" "components\Competitii\$_.tsx"
}
```

Aplică fix imports pentru fiecare.

- [ ] **Step 5: Update LazyComponents.tsx**

```typescript
// ÎNAINTE:
export const CompetitiiManagement = lazy(() => import('./CompetitiiManagement').then(m => ({ default: m.CompetitiiManagement })));
export const SportivDashboard = lazy(() => import('./SportivDashboard').then(m => ({ default: m.SportivDashboard })));
export const FisaCompetitie = lazy(() => import('./FisaCompetitie').then(m => ({ default: m.FisaCompetitie })));
export const StagiiManagement = lazy(() => import('./StagiiManagement').then(m => ({ default: m.StagiiManagement })));

// DUPĂ (CompetitiiManagement și SportivDashboard auto-resolve la index.tsx):
export const CompetitiiManagement = lazy(() => import('./Competitii').then(m => ({ default: m.CompetitiiManagement })));
export const SportivDashboard = lazy(() => import('./SportivDashboard').then(m => ({ default: m.SportivDashboard })));  // NESCHIMBAT
export const FisaCompetitie = lazy(() => import('./Competitii/FisaCompetitie').then(m => ({ default: m.FisaCompetitie })));
export const StagiiManagement = lazy(() => import('./Competitii/StagiiManagement').then(m => ({ default: m.StagiiManagement })));
```

- [ ] **Step 6: Verifică lint**

```powershell
npm run lint
```

- [ ] **Step 7: Commit**

```
git add components/Competitii/ components/SportivDashboard/ components/LazyComponents.tsx
git commit -m "refactor(structure): consolidate competitii + sportiv dashboard components"
```

---

## Task 10: Verificare finală + Update documentație

- [ ] **Step 1: Lint complet final**

```powershell
npm run lint
```

Expected: 0 erori. Dacă sunt erori reziduale, urmărește fișier:linie și repară import-urile manual.

- [ ] **Step 2: Verifică că Vite pornește**

```powershell
npm run dev
```

Navighează în browser la `http://localhost:5173`. Verifică:
- Login funcționează
- Dashboard se încarcă
- Un modul financiar (PlatiScadente) se deschide
- Un modul examene se deschide
- Un modul prezență se deschide

- [ ] **Step 3: Update docs/arhitectura.md**

Înlocuiește secțiunea "Structura folderelor" din `docs/arhitectura.md` cu structura nouă reflectând subfolderele create.

- [ ] **Step 4: Commit final**

```
git add docs/arhitectura.md
git commit -m "docs: update architecture doc with new component folder structure"
```

---

## Note importante pentru execuție

1. **Regex PowerShell**: `-replace` folosește regex. Caracterele speciale (`'`, `/`, `.`) trebuie escape-uite. Dacă un replace nu funcționează, verifică că pattern-ul e corect pentru sintaxa PowerShell.

2. **Cross-imports neașteptate**: `npm run lint` va arăta exact ce import e broken. Urmărește eroarea, găsește fișierul, repară import-ul manual.

3. **Ordine de execuție**: Tasks sunt ordonate ca dependențe — nu sări pași. Task 1 (aliases) nu e blocker pentru Task 2+, dar e recomandat primul.

4. **Fișiere în subfolderele existente** (ex: `GestiuneExamene/ComisieEditor.tsx`) au deja `../types`, `../ui` — NU le modifica.
