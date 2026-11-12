# Phase 5: Color Theme System - Research

**Researched:** 2026-06-05
**Domain:** CSS Custom Properties + React Context + Supabase jsonb persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Modelul de culori:**
- 12 variabile CSS cu prefix `--t-`: bg, surface, surface-2, border, text, text-muted, primary, primary-hover, primary-fg, secondary, secondary-hover, secondary-fg
- Prefix `--t-` coexistă cu variabilele existente `--bg-main`, `--brand-primary` fără conflict
- Culorile de status (danger/success/warning/info) NU urmează tema — rămân Tailwind hardcodat

**ThemeContext:**
- Fișier nou: `contexts/ThemeContext.tsx`
- La mount: fetch `cluburi.tema_config` (club activ din activeRoleContext), fetch `utilizatori.tema_config` (user curent)
- Rezoluție prioritate: user override > club default > app default (QwanKiDo Blue)
- Aplică tema: `document.documentElement.style.setProperty('--t-*', value)`
- Exportă: `currentTheme`, `setTheme(theme)`, `saveTheme(theme, scope: 'user'|'club')`, `predefinedThemes`

**Teme predefinite:**
- Fișier nou: `lib/themes.ts`
- 8 teme: QwanKiDo Blue (default), Midnight Navy, Forest, Crimson, Violet, Amber, Ocean, Graphite

**Migrarea Button:**
- `primary` și `secondary` variant: înlocuiesc Tailwind bg classes cu `style` prop inline
- Hover: `useState(isHovered)` + aplică `var(--t-primary-hover)` / `var(--t-secondary-hover)`
- `danger/success/info/warning` rămân cu Tailwind hardcodat

**ThemeEditor:**
- Fișier nou: `components/ThemeEditor.tsx`
- Modal accesat din Sidebar footer (icon paletă)
- 3 tab-uri: (1) Teme predefinite — grid 4×2 swatches, (2) Personalizat — 4 color pickers + input nume + Save, (3) Temele mele — lista cu delete
- „Aplică doar mie" → `saveTheme(theme, 'user')` | „Aplică la tot clubul" → `saveTheme(theme, 'club')` (vizibil doar ADMIN_CLUB+)

**Supabase schema:**
- `ALTER TABLE cluburi ADD COLUMN tema_config jsonb DEFAULT NULL`
- `ALTER TABLE utilizatori ADD COLUMN tema_config jsonb DEFAULT NULL`
- Fișier nou: `sql/add_tema_config.sql`

**Integrare în app:**
- `index.tsx`: adaugă `<ThemeProvider>` în provider stack, după `DataProvider`
- `index.css`: adaugă cele 12 `--t-*` variabile ca valori default în `:root`
- `components/Sidebar.tsx`: buton/icon paletă în footer pentru deschidere ThemeEditor

### Claude's Discretion

- Ordinea exactă a provider-ilor în stack
- Implementarea color pickers (native `<input type="color">` e suficient — fără librărie)
- Animații tranziție la schimbarea temei (optional, nu blocking)
- Format exact al JSON pentru tema salvată (flat object vs nested)

### Deferred Ideas (OUT OF SCOPE)

- Sprint 2: migrare Card, Modal, Badge, Input, Table, Alert, Tabs din ui.tsx (acoperire 85%)
- Light mode support
- Import/export temă ca JSON
- Tema per-rol (SPORTIV vede altă temă decât ADMIN_CLUB)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-01 | `ThemeContext` injectează 12 variabile CSS `--t-*` în `:root` la mount — tema clubului activ din Supabase, cu override per user | Context pattern verificat în codebase: `contexts/NavigationContext.tsx` și `contexts/AIAssistantContext.tsx`. activeRoleContext expune `club_id`. Tabelul `cluburi` deja include `theme_config` jsonb și e fetched la startup. |
| THEME-02 | `Button` (primary + secondary) folosește `var(--t-primary)` / `var(--t-secondary)` via style prop — culoarea se schimbă vizibil la schimbarea temei | Button component verificat la liniile 12-64 din `components/ui.tsx`. Pattern `useState(isHovered)` e standard React. |
| THEME-03 | `ThemeEditor` modal cu 8 teme predefinite + tab editor custom + save cu scope `user\|club` — accesibil din Sidebar footer | `Modal` component există în `components/ui.tsx` (linia 131). Sidebar footer verificat — structura actuală nu are icon paletă, se adaugă în blocul `mt-auto`. `Palette` icon disponibil în lucide-react (confirmat). |
| THEME-04 | `cluburi.tema_config` și `utilizatori.tema_config` (jsonb) există în Supabase cu RLS corect | `cluburi.theme_config` deja există în DB și e fetched (`hooks/useDataProvider.ts:329`). ATENȚIE: coloana actuală se numește `theme_config` (engleză), nu `tema_config`. Tabelul `utilizatori` nu este direct queriat în codebase — se folosește `utilizator_roluri_multicont`. |
</phase_requirements>

---

## Summary

Portalul PhiHau are deja un sistem de teme parțial implementat dar neintegrat coerent: există `themes.ts` la rădăcină cu o funcție `applyTheme()`, `SystemGuardian.tsx` aplică tema la mount din `currentUser.cluburi.theme_config`, și tabelul `cluburi` are deja coloana `theme_config` (jsonb) fetchuită în DataProvider. Noul sistem THEME-* nu înlocuiește complet sistemul vechi — trebuie să coexiste cu el sau să-l supraviețuiască.

Arhitectura decidată (ThemeContext cu 12 variabile `--t-*`) este curată și fezabilă. Riscul principal nu este tehnic, ci de **coliziune cu codul existent**: SystemGuardian deja apelează `applyTheme()` cu variabile `--bg-*` / `--brand-*` care NU sunt `--t-*` — deci coexistă fără conflict. Totuși, ThemeContext trebuie să se execute **după** că `activeRoleContext` este disponibil (adică după DataProvider, nu înainte).

**Primary recommendation:** Injectează `<ThemeProvider>` în `index.tsx` DUPĂ `<DataProvider>`, nu în App.tsx (App.tsx are deja un provider stack complex). ThemeContext citește `activeRoleContext` din DataContext — deci DataProvider trebuie să fie ascendent.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSS variable injection | Browser / Client | — | `document.documentElement.style.setProperty` e operație DOM pură, nu SSR |
| Theme fetch (club) | Frontend (React Context) | Supabase DB | ThemeContext fetchuiește la mount; datele vin din Supabase |
| Theme fetch (user) | Frontend (React Context) | Supabase DB | Fetch separat pentru `utilizatori.tema_config` pe user_id |
| Theme persistence (save) | Supabase DB | Frontend mutation | `supabase.from('cluburi').update()` și `supabase.from('utilizatori').update()` |
| Hover state on Button | Browser / Client | — | `useState(isHovered)` + inline style în componentă |
| ThemeEditor modal | Browser / Client | — | Componentă React pură, fără routing |
| Permission check (save club) | Frontend (usePermissions) | Supabase RLS | `isAdminClub` pentru butonul "Aplică la tot clubul" |

---

## Critical Pre-Implementation Findings

### Finding 1: Coloana existentă se numește `theme_config`, nu `tema_config`

**VERIFIED** din codebase (`hooks/useDataProvider.ts:329`):
```typescript
clubs: cleanedSupabase.from('cluburi').select('id, nume, cif, oras, theme_config'),
```

Tabelul `cluburi` are deja coloana `theme_config` (jsonb). CONTEXT.md și design spec vorbesc de `tema_config` — aceasta este **o coloană nouă** cu prefix românesc, diferită de `theme_config`. Sau planul vrea să refolosească `theme_config`?

**Rezoluție recomandată (Claude's Discretion):** Refolosește coloana existentă `cluburi.theme_config` — adaugă câmpurile `--t-*` în același jsonb. Evitați duplicarea coloanelor. Planner-ul trebuie să clarifice explicit în PLAN-ul 1.

**Alternativă:** Dacă `tema_config` se dorește separată de `theme_config` (pentru că `theme_config` conține și `email_contact`, `telefon_contact`, `adresa_contact` conform `ClubSettings.tsx`), atunci migrația adaugă coloana nouă `tema_config` și nu atinge `theme_config`. Aceasta este abordarea mai curată.

### Finding 2: SystemGuardian deja aplică teme la mount

`components/SystemGuardian.tsx` (liniile 76-93) aplică tema din `currentUser.cluburi.theme_config` folosind `applyTheme()` din `themes.ts`. Funcția `applyTheme()` setează variabile `--bg-main`, `--bg-card`, `--accent` etc. — toate prefixate diferit față de `--t-*`.

**Concluzie:** Coexistă fără conflict. ThemeContext injectează `--t-*` fără să atingă `--bg-*`. SystemGuardian rămâne funcțional pentru variabilele sale. Nu necesită modificări la SystemGuardian în Sprint 1.

### Finding 3: Tabelul `utilizatori` nu este queriat direct în codebase

Tabelul `utilizator_roluri_multicont` este cel accesat, nu `utilizatori`. Pentru fetch/save `utilizatori.tema_config`, ThemeContext trebuie să facă:
- **Fetch:** `supabase.from('utilizatori').select('tema_config').eq('id', currentUser.id).single()`
- **Save:** `supabase.from('utilizatori').update({ tema_config: theme }).eq('id', currentUser.id)`

`currentUser.id` vine din DataContext (tipul `User` din `types.ts`).

### Finding 4: Club ID în ThemeContext

`activeRoleContext.club_id` — disponibil în DataContext. ThemeContext trebuie să apeleze `useData()` pentru a accesa `activeRoleContext`. Dar ThemeProvider este în `index.tsx` DUPĂ DataProvider — deci `useData()` funcționează în ThemeContext.

### Finding 5: `Palette` icon nu este exportat în `components/icons.tsx`

`icons.tsx` importă din lucide-react dar nu include `Palette`. Palette **există** în lucide-react (confirmat). Va trebui adăugat la `icons.tsx`.

---

## Standard Stack

### Core (fără pachete noi necesare)

| Componentă | Sursa | Scop |
|------------|-------|------|
| CSS Custom Properties (native) | Browser | Variabile `--t-*` pe `:root` |
| React.createContext + useContext | React 18 (deja instalat) | ThemeContext |
| `document.documentElement.style.setProperty` | Browser DOM API | Injectare CSS vars |
| `useState` (isHovered) | React 18 | Hover state pe Button |
| `<input type="color">` | HTML5 | Color picker în ThemeEditor |
| `supabase.from('...').update()` | @supabase/supabase-js 2.98.0 | Persistență |

**Nu se instalează pachete noi.** [VERIFIED: din CONTEXT.md — „Nu se importă librării externe noi"]

### Package Legitimacy Audit

**Nu se adaugă pachete externe în această fază.** Audit N/A.

---

## Architecture Patterns

### ThemeContext Pattern (urmărește NavigationContext)

Modelul exact de urmat este `contexts/NavigationContext.tsx` [VERIFIED: citit în această sesiune]:

```typescript
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useData } from './DataContext';
import { supabase } from '../supabaseClient';
import { PREDEFINED_THEMES, DEFAULT_THEME } from '../lib/themes';
import { ThemeConfig } from '../types';

interface ThemeContextValue {
  currentTheme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  saveTheme: (theme: ThemeConfig, scope: 'user' | 'club') => Promise<void>;
  predefinedThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { activeRoleContext, currentUser } = useData();
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  // ...fetch + applyTheme logic

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, saveTheme, predefinedThemes: PREDEFINED_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
```

### Provider Stack în `index.tsx` (ordinea contează)

Ordinea actuală [VERIFIED: citit `index.tsx`]:

```typescript
<ErrorProvider>
  <QueryClientProvider client={queryClient}>
    <DataProvider>          // ← furnizează activeRoleContext
      <NavigationProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </NavigationProvider>
    </DataProvider>
  </QueryClientProvider>
</ErrorProvider>
```

**Unde se inserează ThemeProvider:**

```typescript
<DataProvider>            // ← ThemeProvider trebuie să fie DESCENDENT al DataProvider
  <NavigationProvider>
    <ThemeProvider>       // ← DUPĂ NavigationProvider, ÎNAINTE de BrowserRouter
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </NavigationProvider>
</DataProvider>
```

**Motivare:** ThemeContext apelează `useData()` (DataContext), deci DataProvider trebuie să fie ascendent. NavigationProvider nu depinde de ThemeProvider.

**Alternativă validă (Claude's Discretion):** Dacă ThemeContext nu are nevoie de NavigationContext, poate fi și înainte de NavigationProvider — ambele variante sunt corecte.

### CSS Variable Injection (applyTheme)

```typescript
// lib/themes.ts
export function applyTheme(theme: ThemeConfig): void {
  const el = document.documentElement;
  el.style.setProperty('--t-bg', theme.bg);
  el.style.setProperty('--t-surface', theme.surface);
  el.style.setProperty('--t-surface-2', theme.surface2);
  el.style.setProperty('--t-border', theme.border);
  el.style.setProperty('--t-text', theme.text);
  el.style.setProperty('--t-text-muted', theme.textMuted);
  el.style.setProperty('--t-primary', theme.primary);
  el.style.setProperty('--t-primary-hover', theme.primaryHover);
  el.style.setProperty('--t-primary-fg', theme.primaryFg);
  el.style.setProperty('--t-secondary', theme.secondary);
  el.style.setProperty('--t-secondary-hover', theme.secondaryHover);
  el.style.setProperty('--t-secondary-fg', theme.secondaryFg);
}
```

### Button Migration Pattern

Starea **actuală** în `components/ui.tsx` (liniile 30-37) [VERIFIED: citit în această sesiune]:

```typescript
const variantClasses = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md active:scale-95",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 shadow-sm active:scale-95",
  danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-md active:scale-95",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md active:scale-95",
  info: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500 shadow-md active:scale-95",
  warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-md active:scale-95",
};
```

**Starea după migrare:**

```typescript
// Adaugă la imports: useState
// Adaugă în componentă, înainte de return:
const [isHovered, setIsHovered] = useState(false);

const variantClasses = {
  // danger/success/info/warning: NESCHIMBATE
  danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-md active:scale-95",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md active:scale-95",
  info: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500 shadow-md active:scale-95",
  warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-md active:scale-95",
  // primary/secondary: rămân cu classe pentru focus/shadow/active, BEZ bg/text
  primary: "focus:ring-blue-500 shadow-md active:scale-95",
  secondary: "focus:ring-slate-500 shadow-sm active:scale-95",
};

const variantStyles: Partial<Record<string, React.CSSProperties>> = {
  primary: {
    backgroundColor: isHovered ? 'var(--t-primary-hover)' : 'var(--t-primary)',
    color: 'var(--t-primary-fg)',
  },
  secondary: {
    backgroundColor: isHovered ? 'var(--t-secondary-hover)' : 'var(--t-secondary)',
    color: 'var(--t-secondary-fg)',
  },
};

// În return (button și label):
<button
  className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} touch-manipulation`}
  style={variantStyles[variant]}
  onMouseEnter={() => (variant === 'primary' || variant === 'secondary') && setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  disabled={disabled || isLoading}
  {...props}
>
```

**ATENȚIE:** `as === 'label'` branch (liniile 51-57) necesită același tratament — `style={variantStyles[variant]}` și handlers `onMouseEnter/Leave`.

### Sidebar Footer Addition

Starea actuală [VERIFIED: citit `components/Sidebar.tsx`, liniile 175-207]:

```tsx
{/* User profile + logout at bottom */}
<div className="relative mt-auto">
  <div className="h-px ...separator... mx-2 mb-2" />
  <div className={`mx-2 mb-2 p-2 rounded-xl ... flex items-center gap-2.5`}>
    <UserAvatar ... />
    {effectiveExpanded && (...user name + badge...)}
    {effectiveExpanded && (...logout button...)}
  </div>
  {!effectiveExpanded && (...logout button collapsed...)}
</div>
```

**Pattern de adăugare:** Inserează un buton paletă **deasupra** blocului de user profile (sau lângă logout în versiunea expanded). Locul logic este înainte de `<div className="h-px ...separator...">`.

```tsx
{/* ThemeEditor trigger */}
<div className="px-2 mb-1">
  <button
    onClick={() => setIsThemeEditorOpen(true)}
    title="Personalizează tema"
    className={`w-full flex items-center ${effectiveExpanded ? 'gap-2 px-3 py-2' : 'justify-center p-2.5'} rounded-xl text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all border border-slate-700/40`}
  >
    <PaletteIcon className="h-4 w-4 shrink-0" />
    {effectiveExpanded && <span className="text-xs font-medium">Temă</span>}
  </button>
</div>
```

`Sidebar` trebuie să primească un prop `onOpenThemeEditor` sau să gestioneze local starea `isThemeEditorOpen`.

### ThemeEditor Modal Structure

Modelul `Modal` din `components/ui.tsx` (liniile 131-151) [VERIFIED]:

```typescript
import { Modal } from './ui'; // max-w-lg sm:max-w-2xl, z-[9999]

// ThemeEditor.tsx
export const ThemeEditor: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom' | 'saved'>('predefined');
  const { currentTheme, setTheme, saveTheme, predefinedThemes } = useTheme();
  const { activeRoleContext } = useData();
  const permissions = usePermissions(activeRoleContext);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personalizare Temă">
      {/* Tab bar */}
      {/* Tab content */}
    </Modal>
  );
};
```

**Dimensiune modal:** `max-w-2xl` (default în Modal) e suficient pentru grid 4×2 de swatches.

### SQL Migration Pattern

Modelul din `sql/migrations/add_status_motiv_antrenamente.sql` (pattern idempotent):

```sql
-- sql/add_tema_config.sql

-- 1. Coloana nouă pe cluburi (tema_config — separată de theme_config existent)
ALTER TABLE cluburi
  ADD COLUMN IF NOT EXISTS tema_config jsonb DEFAULT NULL;

-- 2. Coloana nouă pe utilizatori
ALTER TABLE utilizatori
  ADD COLUMN IF NOT EXISTS tema_config jsonb DEFAULT NULL;

-- 3. RLS: orice user autentificat poate citi tema clubului său (deja acoperit de RLS existent pe cluburi)

-- 4. RLS: ADMIN_CLUB poate scrie tema_config pe clubul propriu
-- (verifică că politica existentă pe cluburi.UPDATE acoperă și coloana nouă, sau adaugă specific)

-- 5. RLS: orice user poate scrie propria linie din utilizatori
CREATE POLICY IF NOT EXISTS "utilizatori_tema_config_self_update"
  ON utilizatori
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**ATENȚIE:** Trebuie verificat dacă politica RLS de UPDATE pe `utilizatori` există deja și acoperă `tema_config`.

---

## Don't Hand-Roll

| Problemă | Nu construi | Folosește în schimb | De ce |
|----------|-------------|---------------------|-------|
| Color picker | Componentă custom picker | `<input type="color">` HTML5 | Browser nativ, accesibil, fără dependențe, suficient pentru 4 culori |
| Modal container | Modal custom | `Modal` din `components/ui.tsx` | Deja implementat cu portal, z-index corect, accesibilitate |
| Hover pe button cu CSS vars | CSS `::after`, filter, JS listeners complecși | `useState(isHovered)` + inline style | Cea mai simplă soluție; Tailwind `hover:` nu funcționează cu `style` prop |
| Context pattern | Pattern inventat | Urmează `NavigationContext.tsx` exact | Patterns deja stabilite în proiect |
| Icon paletă | SVG custom | `Palette` din lucide-react (deja instalat) | Adaugă doar o linie la `icons.tsx` |

---

## Common Pitfalls

### Pitfall 1: ThemeProvider plasat ÎNAINTE de DataProvider

**Ce se întâmplă:** `useData()` în ThemeContext aruncă `"useData must be used within DataProvider"`.
**Cauza:** ThemeContext apelează `useData()` pentru `activeRoleContext`. Dacă ThemeProvider e deasupra DataProvider în stivă, DataContext nu există.
**Prevenție:** ThemeProvider TREBUIE să fie descendent al DataProvider. Ordinea corectă: `DataProvider > NavigationProvider > ThemeProvider > BrowserRouter > App`.
**Semn de avertizare:** Eroare în consolă la mount, aplicația nu se încarcă.

### Pitfall 2: Hover state `useState(isHovered)` se adaugă la nivel de componentă, nu la nivel de hook

**Ce se întâmplă:** Dacă `isHovered` state e declarat în afara componentei Button (de ex. la nivel de modul), toate butoanele shared-uiesc același hover state.
**Cauza:** React state trebuie să fie per-instanță.
**Prevenție:** `const [isHovered, setIsHovered] = useState(false)` **în interiorul** funcției `Button`, nu în afara ei.

### Pitfall 3: Branch `as === 'label'` din Button omis la migrare

**Ce se întâmplă:** Butoanele cu `as='label'` (ex: upload foto) rămân cu `bg-indigo-600` hardcodat.
**Cauza:** Button are două branch-uri de render (liniile 51-57 și 59-63 din `ui.tsx`). Migrarea trebuie aplicată la ambele.
**Prevenție:** Aplică `style={variantStyles[variant]}` și `onMouseEnter/Leave` pe AMBELE branch-uri.
**Semn de avertizare:** Unele butoane se schimbă cu tema, altele nu.

### Pitfall 4: `cluburi.theme_config` vs `cluburi.tema_config` — confuzia de coloane

**Ce se întâmplă:** Codul ThemeContext încearcă să citească `tema_config` dar coloana nu există în SELECT din DataProvider, sau coloana din DB e alta.
**Cauza:** DataProvider selectează `theme_config` (engleză) din `cluburi`, nu `tema_config`. Dacă ThemeContext face un fetch separat pe `tema_config` dar coloana nu a fost creată în migrație, returnează null.
**Prevenție:** Fie ThemeContext face fetch separat explicit pentru `tema_config`, fie se refolosește datele din DataContext (`clubs` array din `useData()`).
**Recomandare:** ThemeContext citește din `useData().clubs` (deja cached) pentru tema clubului, evitând un al doilea query. Fetch separat doar pentru `utilizatori.tema_config`.

### Pitfall 5: applyTheme în ThemeContext și SystemGuardian se suprascriu

**Ce se întâmplă:** La load, SystemGuardian setează `--bg-main`, `--brand-primary` etc., apoi ThemeContext suprascrie `--t-*`. La switch de rol, SystemGuardian poate fi re-triggereat și suprascrie `--t-*`... dar nu suprascrie variabilele `--t-*` (le setează pe altele).
**Concluzie:** NU există conflict — prefixele sunt diferite. SystemGuardian setează `--bg-*`, ThemeContext setează `--t-*`.
**Prevenție:** Nu modificați SystemGuardian în Sprint 1.

### Pitfall 6: `useTheme()` apelat înainte ca ThemeProvider să existe în App.tsx

**Ce se întâmplă:** `App.tsx` sau componente din el încearcă `useTheme()` dar ThemeProvider e în `index.tsx` — funcționează corect DACĂ ThemeProvider este în `index.tsx` și wrappuiește `App`.
**Prevenție:** ThemeProvider în `index.tsx`, nu în `App.tsx`. Orice componentă descendentă din `<App>` poate apela `useTheme()`.

### Pitfall 7: RLS pe `utilizatori` tabel poate bloca UPDATE

**Ce se întâmplă:** `saveTheme(theme, 'user')` returnează eroare RLS la `supabase.from('utilizatori').update()`.
**Cauza:** Tabelul `utilizatori` are politici RLS restrictive. Politica de self-update poate lipsi sau poate filtra altfel.
**Prevenție:** Migrația SQL trebuie să includă/verifice politica `utilizatori_update_own`. Testați cu un user normal după migrație.

---

## Code Examples

### Fetch temă club din DataContext (fără query suplimentar)

```typescript
// În ThemeContext.tsx
const { activeRoleContext, clubs } = useData();

useEffect(() => {
  // Refolosim datele deja cached din DataProvider
  const activeClub = clubs.find(c => c.id === activeRoleContext?.club_id);
  const clubTheme = activeClub?.tema_config as ThemeConfig | null;
  // ... merge și apply
}, [activeRoleContext, clubs]);
```

### Fetch temă user (query separat necesar)

```typescript
// În ThemeContext.tsx
useEffect(() => {
  if (!currentUser?.id) return;

  supabase
    .from('utilizatori')
    .select('tema_config')
    .eq('id', currentUser.id)
    .single()
    .then(({ data, error }) => {
      if (!error && data?.tema_config) {
        const userTheme = data.tema_config as ThemeConfig;
        applyTheme(userTheme);
        setCurrentTheme(userTheme);
      } else if (clubThemeRef.current) {
        applyTheme(clubThemeRef.current);
        setCurrentTheme(clubThemeRef.current);
      } else {
        applyTheme(DEFAULT_THEME);
        setCurrentTheme(DEFAULT_THEME);
      }
    });
}, [currentUser?.id]);
```

### Save temă user/club

```typescript
const saveTheme = async (theme: ThemeConfig, scope: 'user' | 'club') => {
  if (scope === 'user' && currentUser?.id) {
    const { error } = await supabase
      .from('utilizatori')
      .update({ tema_config: theme })
      .eq('id', currentUser.id);
    if (error) throw error;
  } else if (scope === 'club' && activeRoleContext?.club_id) {
    const { error } = await supabase
      .from('cluburi')
      .update({ tema_config: theme })
      .eq('id', activeRoleContext.club_id);
    if (error) throw error;
  }
  applyTheme(theme);
  setCurrentTheme(theme);
};
```

### Adăugare PaletteIcon în `components/icons.tsx`

```typescript
// Adaugă la import:
import { ..., Palette } from 'lucide-react';

// Adaugă export:
export const PaletteIcon = Palette;
```

### Adăugare variabile `--t-*` în `index.css` (:root)

```css
/* Se adaugă după variabilele existente --bg-*, --text-*, --border-* */
:root {
  /* Variabilele existente rămân neschimbate */
  --bg-main: #020617;
  /* ... */

  /* Theme System — Sprint 1 (prefix --t-) */
  --t-bg: #020617;
  --t-surface: #0f172a;
  --t-surface-2: #1e293b;
  --t-border: #1e293b;
  --t-text: #f8fafc;
  --t-text-muted: #94a3b8;
  --t-primary: #3b82f6;
  --t-primary-hover: #2563eb;
  --t-primary-fg: #ffffff;
  --t-secondary: #1e293b;
  --t-secondary-hover: #334155;
  --t-secondary-fg: #e2e8f0;
}
```

---

## State of the Art

| Abordare Veche | Abordare Curentă | Când s-a schimbat | Impact |
|----------------|------------------|-------------------|--------|
| Tailwind hardcodat `bg-indigo-600` | CSS vars `var(--t-primary)` via style prop | Sprint 1 | Button se schimbă dinamic fără rebuild |
| SystemGuardian aplică teme `--bg-*` la mount | ThemeContext Context cu 12 `--t-*` vars | Sprint 1 | Teme controlabile de user/club fără reload |
| `themes.ts` (vechi) cu `--bg-main`, `--accent` | `lib/themes.ts` (nou) cu `ThemeConfig` 12 câmpuri | Sprint 1 | Sistem coerent, nu patchy |

**Deprecated/Outdated:**
- `themes.ts` (rădăcină): are un alt model de variabile (`--bg-main`, `--accent` etc.). Nu se șterge în Sprint 1, rămâne pentru SystemGuardian. Va fi eliminat/migrat în sprint ulterior.

---

## Assumptions Log

| # | Claim | Section | Risk dacă e greșit |
|---|-------|---------|-------------------|
| A1 | Tabelul `utilizatori` din Supabase are coloana `id` (nu `user_id`) ca PK și e diferit de `auth.users` | Fetch temă user | Query greșit, fetch returnează eroare RLS sau empty |
| A2 | Politica RLS de UPDATE pe `utilizatori` nu există sau permite self-update prin `auth.uid() = user_id` | SQL Migration | `saveTheme('user')` eșuează cu 403 |
| A3 | `clubs` array din DataContext include `tema_config` — momentan selectul e `theme_config` | Fetch temă club | ThemeContext nu găsește tema clubului în DataContext; necesită query separat sau modificare SELECT |

**Notă A3:** DataProvider selectează `theme_config` din cluburi, nu `tema_config`. Dacă adăugăm coloana `tema_config` nouă (separată de `theme_config`), ThemeContext NU poate folosi datele cache din DataContext — trebuie fie să modificăm SELECTul din DataProvider (adăugând `tema_config`), fie ThemeContext face propriul fetch. Recomandarea este să modificăm selectul din DataProvider.

---

## Open Questions

1. **`tema_config` nouă vs refolosire `theme_config` existentă?**
   - Ce știm: `cluburi.theme_config` există deja și conține `primary_color`, `secondary_color`, `email_contact` etc. (format vechi, nestructurat)
   - Ce nu e clar: designul vrea o coloană separată `tema_config` (cu tipul `ThemeConfig` structurat) sau se migrează `theme_config` la noul format?
   - Recomandare: Coloană separată `tema_config` — izolează noul sistem de câmpurile de contact din `theme_config`. DataProvider adaugă `tema_config` la SELECT.

2. **Cum se propagă tema când utilizatorul schimbă rolul (club-switch)?**
   - Ce știm: La role switch, `window.location.reload()` (`hooks/useAppLogic.ts:57`) — deci ThemeContext se remontează oricum.
   - Ce nu e clar: Este nevoie de un effect în ThemeContext care reacționează la schimbarea `activeRoleContext.club_id`?
   - Recomandare: Da — `useEffect` cu dependency pe `activeRoleContext?.club_id` re-fetchuiește tema clubului.

3. **Unde gestionează Sidebar starea `isThemeEditorOpen`?**
   - Ce știm: Sidebar este un component de presentare care primește props
   - Recomandare: Adaugă `onOpenThemeEditor` prop pe `SidebarProps` în `Sidebar.tsx`. Starea o ține `AppLayout.tsx` sau `App.tsx`.

---

## Environment Availability

Faza nu are dependențe externe noi. Toate dependențele sunt deja în proiect.

| Dependență | Necesară | Disponibilă | Versiune |
|------------|----------|-------------|---------|
| React 18 | ThemeContext | Da | 18.3.1 |
| @supabase/supabase-js | Fetch/Save temă | Da | 2.98.0 |
| lucide-react | Icon Palette | Da | 0.400.0 |
| Tailwind CSS | Clase pentru ThemeEditor | Da | 3.4.6 |
| `<input type="color">` | Color picker | Da | HTML5 nativ |

---

## Validation Architecture

> Faza nu modifică logică de business complexă — nu există framework de test automat în proiect (Playwright e pentru smoke tests, nu unit tests). Validarea este vizuală.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Cum testezi |
|--------|----------|-----------|-------------|
| THEME-01 | CSS vars `--t-primary` etc. există pe `:root` după mount | Visual / DevTools | Inspect element → Computed → verifică `--t-primary` |
| THEME-02 | Button primary/secondary se schimbă de culoare la schimbarea temei | Visual | Deschide ThemeEditor → selectează Forest → observă butoanele din modal și din pagină |
| THEME-03 | ThemeEditor deschide din Sidebar footer, tabs funcționează, save fără erori | Manual smoke | Login → Sidebar → iconiță paletă → navighează taburi → aplică temă |
| THEME-04 | `cluburi.tema_config` și `utilizatori.tema_config` există în DB | SQL check | `SELECT column_name FROM information_schema.columns WHERE table_name='cluburi' AND column_name='tema_config'` |

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V4 Access Control | Da | `saveTheme(theme, 'club')` vizibil doar ADMIN_CLUB+ via `permissions.isAdminClub` |
| V5 Input Validation | Parțial | Valorile color picker sunt hex strings generate de `<input type="color">` — format garantat de browser |
| V6 Cryptography | Nu | N/A |

**RLS Requirements:**
- `cluburi`: politica UPDATE existentă trebuie să permită ADMIN_CLUB să updateze `tema_config` pe clubul propriu. Verificați că RLS existent nu e `column-level` restrictat.
- `utilizatori`: necesită politică self-update (via `auth.uid() = user_id`).

---

## Sources

### Primary (HIGH confidence — citite direct în această sesiune)

- `components/ui.tsx` liniile 1-64 — Button component complet verificat
- `index.css` liniile 1-60 — CSS variables existente verificate
- `index.tsx` complet — provider stack verificat
- `App.tsx` complet — render logic și provider nesting verificat
- `contexts/NavigationContext.tsx` complet — pattern context de urmat
- `contexts/DataContext.tsx` complet — pattern DataProvider
- `components/Sidebar.tsx` complet — footer structure verificată
- `supabaseClient.ts` complet — cum se face fetch
- `hooks/useDataProvider.ts` liniile 60-350 — cum e fetched `cluburi.theme_config`
- `hooks/useUserRoles.ts` — structura `activeRoleContext`
- `components/SystemGuardian.tsx` liniile 1-100 — applyTheme existent verificat
- `components/ClubSettings.tsx` liniile 1-100 — cum e folosit `theme_config` existent
- `themes.ts` complet — sistemul de teme vechi (nu `--t-*`)
- `types.ts` liniile 1-80 — Club interface cu `theme_config`
- `.planning/phases/05-color-theme-system/05-CONTEXT.md` — decizii locked

### Secondary (MEDIUM confidence)

- `docs/superpowers/specs/2026-06-05-color-theme-system-design.md` — design spec complet cu exemple de cod

---

## Metadata

**Confidence breakdown:**
- Codebase existent (Button, provider stack, Sidebar, SystemGuardian): HIGH — citit direct
- CSS variable pattern (applyTheme via setProperty): HIGH — pattern simplu, existent în codebase
- Supabase fetch/update pattern: HIGH — pattern identic cu restul codebase-ului
- Coliziune cu SystemGuardian: HIGH — prefixuri diferite, confirmat prin citire
- RLS pentru `utilizatori.tema_config`: MEDIUM — tabelul nu e direct queriat în codebase actualmente; politicile existente nu au fost verificate

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (cod stabil, dependențe fixe)
