# Phase 5: Color Theme System - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning
**Source:** Brainstorming + Design Spec (docs/superpowers/specs/2026-06-05-color-theme-system-design.md)

<domain>
## Phase Boundary

Sprint 1: ThemeContext + CSS vars + Button migration + ThemeEditor modal + Supabase persistence.
Sprint 2 (separate phase): migrare restul ui.tsx components (Card, Modal, Badge, Input, Table).

Aceasta este Sprint 1 — butoanele urmează tema, ThemeEditor funcționează, persistă în Supabase.

</domain>

<decisions>
## Implementation Decisions

### Modelul de culori
- 12 variabile CSS cu prefix `--t-` (theme): bg, surface, surface-2, border, text, text-muted, primary, primary-hover, primary-fg, secondary, secondary-hover, secondary-fg
- Prefix `--t-` coexistă cu variabilele existente `--bg-main`, `--brand-primary` fără conflict
- Culorile de status (danger/success/warning/info) NU urmează tema — rămân Tailwind hardcodat

### ThemeContext
- Fișier nou: `contexts/ThemeContext.tsx`
- La mount: fetch `cluburi.tema_config` (club activ din activeRoleContext), fetch `utilizatori.tema_config` (user curent)
- Rezoluție prioritate: user override > club default > app default (QwanKiDo Blue)
- Aplică tema: `document.documentElement.style.setProperty('--t-*', value)` pentru fiecare variabilă
- Exportă: `currentTheme`, `setTheme(theme)`, `saveTheme(theme, scope: 'user'|'club')`, `predefinedThemes`

### Teme predefinite
- Fișier nou: `lib/themes.ts`
- 8 teme: QwanKiDo Blue (default), Midnight Navy, Forest, Crimson, Violet, Amber, Ocean, Graphite
- Fiecare temă = obiect cu toate cele 12 culori

### Migrarea Button
- Fișier modificat: `components/ui.tsx`
- `primary` și `secondary` variant: înlocuiesc Tailwind bg classes cu `style` prop inline
  - `{ backgroundColor: 'var(--t-primary)', color: 'var(--t-primary-fg)' }`
  - `{ backgroundColor: 'var(--t-secondary)', color: 'var(--t-secondary-fg)' }`
- Hover: `useState(isHovered)` + aplică `var(--t-primary-hover)` / `var(--t-secondary-hover)` când `isHovered === true`
- `danger/success/info/warning` rămân cu Tailwind hardcodat (culori semantice fixe)

### ThemeEditor
- Fișier nou: `components/ThemeEditor.tsx`
- Modal accesat din Sidebar footer (icon paletă)
- 3 tab-uri: (1) Teme predefinite — grid 4×2 swatches, (2) Personalizat — 4 color pickers + input nume + Save, (3) Temele mele — lista cu delete
- Butoane acțiune: "Aplică doar mie" → `saveTheme(theme, 'user')` | "Aplică la tot clubul" → `saveTheme(theme, 'club')` (vizibil doar ADMIN_CLUB+)
- Preview live la hover/select pe teme

### Supabase schema
- `ALTER TABLE cluburi ADD COLUMN tema_config jsonb DEFAULT NULL`
- `ALTER TABLE utilizatori ADD COLUMN tema_config jsonb DEFAULT NULL`
- Fișier nou: `sql/add_tema_config.sql`
- RLS: ADMIN_CLUB poate scrie `cluburi.tema_config` pentru clubul propriu; orice user poate scrie `utilizatori.tema_config` (propria linie)

### Integrare în app
- `index.tsx` (sau `App.tsx`): adaugă `<ThemeProvider>` în provider stack, după `DataProvider`
- `index.css`: adaugă cele 12 `--t-*` variabile ca valori default în `:root` (QwanKiDo Blue)
- `components/Sidebar.tsx`: buton/icon paletă în footer pentru deschidere ThemeEditor

### Claude's Discretion
- Ordinea exactă a provider-ilor în stack
- Implementarea color pickers (native `<input type="color">` e suficient — fără librărie)
- Animații tranziție la schimbarea temei (optional, nu blocking)
- Format exact al JSON pentru tema salvată (flat object vs nested)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Spec
- `docs/superpowers/specs/2026-06-05-color-theme-system-design.md` — spec complet cu modelul de culori, arhitectura, migrare Button, schema Supabase

### Fișiere de modificat
- `components/ui.tsx` — design system intern; Button component la linia ~12-64
- `index.css` — CSS variables existente în `:root` (liniile 8-25); prefix `--bg-*` și `--brand-*`
- `App.tsx` — provider stack (ErrorProvider > QueryClient > DataProvider > NavigationProvider)
- `components/Sidebar.tsx` — footer area pentru buton ThemeEditor

### Tipuri și convenții
- `types.ts` — tipuri centralizate; adaugă `ThemeConfig` interface aici
- `CLAUDE.md` — convenții cod: română pentru domeniu, engleză pentru tehnic; `components/ui.tsx` = design system intern

</canonical_refs>

<specifics>
## Specific Ideas

- Butonul din Sidebar footer pentru ThemeEditor: icon `Palette` din lucide-react lângă alte iconuri de settings
- Preview în ThemeEditor: arată un buton primary + secondary + un badge activ cu culorile temei selectate
- `saveTheme(theme, 'club')` apelează `supabase.from('cluburi').update({ tema_config: theme }).eq('id', activeClubId)`
- `saveTheme(theme, 'user')` apelează `supabase.from('utilizatori').update({ tema_config: theme }).eq('id', userId)`

</specifics>

<deferred>
## Deferred Ideas

- Sprint 2: migrare Card, Modal, Badge, Input, Table, Alert, Tabs din ui.tsx (acoperire 85%)
- Light mode support (acum app e dark-only; `color-scheme: dark` în index.css)
- Import/export temă ca JSON
- Tema per-rol (SPORTIV vede altă temă decât ADMIN_CLUB)

</deferred>
