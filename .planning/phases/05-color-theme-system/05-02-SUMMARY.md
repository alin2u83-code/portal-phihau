---
phase: 05-color-theme-system
plan: "02"
subsystem: theme-system
tags: [typescript, css-variables, themes, react-context, button-migration]
dependency_graph:
  requires:
    - 05-01 (ThemeConfig interface, lib/themes.ts, --t-* CSS vars)
  provides:
    - ThemeProvider context (contexts/ThemeContext.tsx)
    - useTheme hook (contexts/ThemeContext.tsx)
    - Button using CSS vars for primary/secondary variants
  affects:
    - types.ts (Club interface: tema_config added)
    - hooks/useDataProvider.ts (clubs SELECT includes tema_config)
    - components/ui.tsx (Button primary/secondary migrated)
tech_stack:
  added: []
  patterns:
    - ThemeContext pattern: club theme from useData() + user theme from users table fetch
    - CSS var hover pattern: useState(isHovered) + style prop with var(--t-*) toggling
    - useRef clubThemeRef: avoids dependency loop between effect 1 and effect 2
key_files:
  created:
    - contexts/ThemeContext.tsx
  modified:
    - types.ts (Club.tema_config field added)
    - hooks/useDataProvider.ts (tema_config in clubs SELECT)
    - components/ui.tsx (Button primary/secondary CSS var migration)
decisions:
  - Use users table (not utilizatori) — actual DB schema has users table per prompt guidance
  - useRef for clubThemeRef to avoid dependency loop: effect 1 sets ref, effect 2 reads ref without dep
  - isHovered inside Button function (not module level) — per-instance state
  - variantClasses for primary/secondary retains only focus-ring and shadow (no bg/text)
  - variantStyles for primary/secondary uses Partial<Record<string, CSSProperties>> — safe for non-primary variants
metrics:
  duration: "~25 minutes"
  completed: "2026-06-06"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 05 Plan 02: ThemeContext Provider + Button Migration Summary

**One-liner:** ThemeContext React provider fetching user/club themes from Supabase with priority cascade, plus Button component migrated from hardcoded Tailwind bg classes to CSS variables var(--t-primary)/var(--t-secondary).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ThemeContext + tema_config in clubs SELECT | c652c1c | contexts/ThemeContext.tsx, types.ts, hooks/useDataProvider.ts |
| 2 | Button migration primary/secondary to CSS vars | 897d6eb | components/ui.tsx |

## What Was Built

### Task 1: contexts/ThemeContext.tsx

Created ThemeContext with ThemeProvider and useTheme hook:

**Priority cascade (Effect 1 + Effect 2):**
1. Effect 1 fires on `activeRoleContext?.club_id` or `clubs` change
   - Finds active club from `useData().clubs`
   - Reads `activeClub?.tema_config as ThemeConfig | null`
   - Stores in `clubThemeRef` (useRef to avoid dependency loop)
   - Applies club theme immediately as temporary state
2. Effect 2 fires on `currentUser?.id` change
   - Fetches `users.tema_config` from Supabase (`supabase.from('users').select('tema_config').eq('id', currentUser.id).single()`)
   - Priority: user tema_config > clubThemeRef.current > DEFAULT_THEME
   - Applies resolved theme and updates React state

**Context value:**
- `currentTheme: ThemeConfig` — currently active theme
- `setTheme(theme)` — preview live (no DB write)
- `saveTheme(theme, 'user' | 'club')` — persists to users or cluburi table
- `predefinedThemes: ThemeConfig[]` — all 8 PREDEFINED_THEMES from lib/themes.ts

**Supporting changes:**
- `Club` interface in `types.ts`: added `tema_config?: ThemeConfig | null`
- `useDataProvider.ts`: clubs SELECT now includes `tema_config` field

### Task 2: Button Migration (components/ui.tsx)

Migrated Button `primary` and `secondary` variants from hardcoded Tailwind bg classes to CSS variables:

**Before:**
```
primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md active:scale-95"
secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 shadow-sm active:scale-95"
```

**After variantClasses:**
```
primary: "focus:ring-blue-500 shadow-md active:scale-95"
secondary: "focus:ring-slate-500 shadow-sm active:scale-95"
```

**New variantStyles (inline style prop):**
```tsx
primary: { backgroundColor: isHovered ? 'var(--t-primary-hover)' : 'var(--t-primary)', color: 'var(--t-primary-fg)' }
secondary: { backgroundColor: isHovered ? 'var(--t-secondary-hover)' : 'var(--t-secondary)', color: 'var(--t-secondary-fg)' }
```

**Hover state:** `const [isHovered, setIsHovered] = useState(false)` inside Button function. Both `as=label` and `button` branches have `style={variantStyles[variant]}` and `onMouseEnter`/`onMouseLeave` handlers.

`danger`, `success`, `info`, `warning` variants unchanged — still use Tailwind bg classes.

## Deviations from Plan

### [Automatic Schema Deviation] utilizatori → users table

**Found during:** Task 1 implementation

**Issue:** Plan references `supabase.from('utilizatori')` but the prompt explicitly states the actual DB table is `users` with column `id` (= auth.uid()).

**Fix:** All Supabase queries in ThemeContext use `supabase.from('users')` and `.eq('id', currentUser.id)`. saveTheme('user') also uses `.from('users')`.

**Impact:** None — this is the correct table. The plan's reference was incorrect documentation.

### [Rule 2 - Missing field] Club.tema_config not in types.ts

**Found during:** Task 1 — ThemeContext uses `activeClub?.tema_config as ThemeConfig`

**Issue:** The `Club` interface only had `theme_config` (legacy Record<string,string>). `tema_config?: ThemeConfig | null` was missing, causing TypeScript to reject the access.

**Fix:** Added `tema_config?: ThemeConfig | null` to the `Club` interface in `types.ts`. TypeScript interface ordering is fine (Club at line 51, ThemeConfig at line 727 — TS scans full file).

**Commit:** c652c1c

## Known Stubs

None. ThemeContext applies DEFAULT_THEME on mount (via `useState(DEFAULT_THEME)`). If the DB columns `tema_config` have not been populated (migration from Plan 01 not yet applied), the context gracefully falls back to DEFAULT_THEME.

## Threat Surface Scan

ThemeContext introduces two Supabase mutation paths:
- `supabase.from('users').update({ tema_config })` — protected by RLS policy `utilizatori_tema_config_self_update` (created in Plan 01 SQL migration)
- `supabase.from('cluburi').update({ tema_config })` — protected by RLS policy `cluburi_tema_config_admin_update` (created in Plan 01 SQL migration)

These are within the threat model (T-05-04, T-05-05) from Plan 01. No new unmodeled surface.

## Self-Check: PASSED

- `contexts/ThemeContext.tsx`: EXISTS, exports ThemeProvider + useTheme
- `useTheme()` returns `{ currentTheme, setTheme, saveTheme, predefinedThemes }` — verified in source
- `predefinedThemes.length === 8` — PREDEFINED_THEMES from lib/themes.ts has 8 entries (verified in Plan 01)
- `Club.tema_config`: ADDED to types.ts — verified via grep
- `hooks/useDataProvider.ts`: SELECT clubs includes `tema_config` — verified via grep (1 match)
- `components/ui.tsx`: `bg-indigo-600` NOT in variantClasses (0 matches in variantClasses block)
- `components/ui.tsx`: `t-primary` count = 2 (var(--t-primary) + var(--t-primary-hover))
- `isHovered`: declared inside Button function, used in both label and button branches
- `tsc --noEmit`: PASSED (no errors after both tasks)
- Commits: c652c1c + 897d6eb both in git log
