# Color Theme System — Design Spec
**Data:** 2026-06-05  
**Status:** Aprobat  
**Scope:** Sprint 1 (ThemeContext + Button + ThemeEditor) + Sprint 2 (ui.tsx complet)

---

## Problema

Butoanele și componentele din portal folosesc clase Tailwind hardcodate (`bg-indigo-600`, `bg-slate-800`). Nu există sistem de teme — culoarea nu poate fi schimbată fără rebuild. Cluburile nu pot personaliza aspectul portalului.

---

## Obiectiv

Sistem de teme cu model de culori inspirat din Office (palette bazată pe variabile semantice), cu:
- 8 teme predefinite ca punct de start
- Editor custom pentru modificare și salvare teme noi
- Tema clubului ca default; user poate suprascrie individual
- Persistență în Supabase (cross-device)

---

## Modelul de culori — 12 variabile CSS

Prefixul `--t-` (theme) coexistă cu variabilele existente `--bg-main`, `--brand-primary` etc. fără conflict.

| Variabilă | Rol | Valoare default |
|-----------|-----|-----------------|
| `--t-bg` | Fundal pagină | `#020617` |
| `--t-surface` | Carduri, panouri | `#0f172a` |
| `--t-surface-2` | Hover, rânduri tabel | `#1e293b` |
| `--t-border` | Linii separator | `#1e293b` |
| `--t-text` | Text primar | `#f8fafc` |
| `--t-text-muted` | Text secundar, etichete | `#94a3b8` |
| `--t-primary` | Butoane, active states | `#3b82f6` |
| `--t-primary-hover` | Hover pe primary | `#2563eb` |
| `--t-primary-fg` | Text pe buton primary | `#ffffff` |
| `--t-secondary` | Butoane ghost/outline | `#1e293b` |
| `--t-secondary-hover` | Hover pe secondary | `#334155` |
| `--t-secondary-fg` | Text pe secondary | `#e2e8f0` |

**Nu urmează tema:** culorile de status (`danger`, `success`, `warning`, `info`) — rămân Tailwind hardcodat cu semnificație semantică fixă.

---

## Teme predefinite (8)

```typescript
// lib/themes.ts
export const PREDEFINED_THEMES: ThemeConfig[] = [
  { name: 'QwanKiDo Blue', primary: '#3b82f6', primaryHover: '#2563eb', bg: '#020617', surface: '#0f172a', surface2: '#1e293b', border: '#1e293b', text: '#f8fafc', textMuted: '#94a3b8', primaryFg: '#ffffff', secondary: '#1e293b', secondaryHover: '#334155', secondaryFg: '#e2e8f0' },
  { name: 'Midnight Navy',  primary: '#1d4ed8', primaryHover: '#1e40af', bg: '#020617', surface: '#0c1526', ... },
  { name: 'Forest',         primary: '#16a34a', primaryHover: '#15803d', bg: '#021208', surface: '#052e16', ... },
  { name: 'Crimson',        primary: '#dc2626', primaryHover: '#b91c1c', bg: '#0f0505', surface: '#1c0a0a', ... },
  { name: 'Violet',         primary: '#7c3aed', primaryHover: '#6d28d9', bg: '#0a0514', surface: '#13082b', ... },
  { name: 'Amber',          primary: '#d97706', primaryHover: '#b45309', bg: '#0c0a02', surface: '#1c1a05', ... },
  { name: 'Ocean',          primary: '#0891b2', primaryHover: '#0e7490', bg: '#020c0f', surface: '#0c1e24', ... },
  { name: 'Graphite',       primary: '#525252', primaryHover: '#404040', bg: '#030303', surface: '#111111', ... },
]
```

---

## Arhitectura

### ThemeContext (`contexts/ThemeContext.tsx`)

```typescript
interface ThemeConfig {
  name: string
  bg: string; surface: string; surface2: string; border: string
  text: string; textMuted: string
  primary: string; primaryHover: string; primaryFg: string
  secondary: string; secondaryHover: string; secondaryFg: string
}

interface ThemeContextValue {
  currentTheme: ThemeConfig
  setTheme: (theme: ThemeConfig) => void
  saveTheme: (theme: ThemeConfig, scope: 'user' | 'club') => Promise<void>
  predefinedThemes: ThemeConfig[]
}
```

**La mount:**
1. Fetch `cluburi.tema_config` pentru clubul activ (din `activeRoleContext`)
2. Fetch `utilizatori.tema_config` pentru user curent
3. Merge: user override > club default > app default
4. Aplică pe `document.documentElement` via `style.setProperty`

**Aplicare CSS vars:**
```typescript
function applyTheme(theme: ThemeConfig) {
  const el = document.documentElement
  el.style.setProperty('--t-bg', theme.bg)
  el.style.setProperty('--t-surface', theme.surface)
  // ... restul
}
```

### Rezoluția priorității temei

```
Supabase: cluburi.tema_config
    ↓
Supabase: utilizatori.tema_config (user override)
    ↓
ThemeContext: merge + applyTheme()
    ↓
DOM: :root CSS vars
    ↓
Componente: style prop cu var(--t-primary) etc.
```

---

## Migrarea Button (Sprint 1)

Înlocuiește `variantClasses` cu `variantStyles` (inline `style` prop) pentru `primary` și `secondary`. `danger/success/info/warning` rămân Tailwind.

```typescript
// ÎNAINTE
const variantClasses = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white ...",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white ...",
}

// DUPĂ
const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--t-primary)',
    color: 'var(--t-primary-fg)',
  },
  secondary: {
    backgroundColor: 'var(--t-secondary)',
    color: 'var(--t-secondary-fg)',
  },
}
// Hover via CSS în index.css:
// .btn-primary:hover { filter: brightness(0.9); }
// sau păstrăm onMouseEnter/onMouseLeave în componentă
```

Clasa Tailwind `hover:` nu funcționează cu valori inline — hover se rezolvă prin `useState(isHovered)` în Button, care aplică `--t-primary-hover` / `--t-secondary-hover` când `isHovered === true`.

---

## ThemeEditor (`components/ThemeEditor.tsx`)

Modal accesat din:
- Sidebar footer (icon paletă)  
- Settings page (dacă există)

**3 tab-uri:**
1. **Teme predefinite** — grid 4×2 cu swatches colorate, click → preview instant
2. **Personalizat** — 4 color pickers pentru primary, bg, surface, border + input nume + buton Salvează
3. **Temele mele** — lista temelor salvate de user/club, cu delete

**Butoane acțiune:**
- „Aplică doar mie" → `saveTheme(theme, 'user')`
- „Aplică la tot clubul" → `saveTheme(theme, 'club')` (vizibil doar ADMIN_CLUB+)

---

## Schema Supabase

```sql
-- Migration: sql/add_tema_config.sql
ALTER TABLE cluburi ADD COLUMN tema_config jsonb DEFAULT NULL;
ALTER TABLE utilizatori ADD COLUMN tema_config jsonb DEFAULT NULL;

-- RLS: user citește tema clubului său (deja acoperit de RLS existent pe cluburi)
-- ADMIN_CLUB poate actualiza cluburi.tema_config pentru clubul său
-- Orice user poate actualiza propria linie din utilizatori
```

**Format JSON stocat:**
```json
{
  "name": "Forest",
  "primary": "#16a34a",
  "primaryHover": "#15803d",
  "primaryFg": "#ffffff",
  "bg": "#021208",
  "surface": "#052e16",
  "surface2": "#0a4023",
  "border": "#14532d",
  "text": "#f8fafc",
  "textMuted": "#86efac",
  "secondary": "#052e16",
  "secondaryHover": "#0a4023",
  "secondaryFg": "#dcfce7"
}
```

---

## Fișiere afectate — Sprint 1

| Fișier | Tip | Descriere |
|--------|-----|-----------|
| `contexts/ThemeContext.tsx` | NOU | Provider, useTheme hook, CSS var injection |
| `components/ThemeEditor.tsx` | NOU | Modal teme predefinite + editor + save |
| `lib/themes.ts` | NOU | 8 teme predefinite ca constante TypeScript |
| `sql/add_tema_config.sql` | NOU | Migration + RLS |
| `index.css` | MODIFICAT | Adaugă 12 `--t-*` vars default în `:root` |
| `components/ui.tsx` | MODIFICAT | Button primary+secondary → style prop |
| `index.tsx` (sau `App.tsx`) | MODIFICAT | Adaugă `<ThemeProvider>` în stack |
| `components/Sidebar.tsx` | MODIFICAT | Buton acces ThemeEditor în footer |

---

## Sprint 2 (planificat ulterior)

Migrare restul `ui.tsx` la CSS vars:
- `Card` → `--t-surface`, `--t-border`
- `Modal` → `--t-surface`, `--t-bg`
- `Badge` → `--t-primary` pentru variant activ
- `Input` → `--t-surface-2`, `--t-border`
- `Table` rows → `--t-surface-2` hover

Acoperire: 60% (sprint 1) → 85% (sprint 2).

---

## Constrângeri

- Nu se importă librării externe noi — doar CSS native + React
- Hover pe button: `useState(isHovered)` + `--t-primary-hover` — nu Tailwind hover cu inline style
- Variabilele `--bg-main`, `--brand-primary` existente nu se șterg — migrare incrementală
- RLS existent pe `cluburi` trebuie extins pentru write pe `tema_config` de ADMIN_CLUB
