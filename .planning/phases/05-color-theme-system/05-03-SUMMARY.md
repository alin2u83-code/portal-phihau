---
phase: 05-color-theme-system
plan: "03"
subsystem: color-theme-system
tags: [theme, ui, modal, sidebar, provider]
dependency_graph:
  requires:
    - 05-01  # lib/themes.ts, ThemeConfig, CSS vars
    - 05-02  # ThemeContext, Button migration
  provides:
    - ThemeEditor modal component
    - ThemeProvider in provider stack
    - Sidebar palette button
    - AppLayout state wiring
  affects:
    - components/ThemeEditor.tsx
    - index.tsx
    - components/Sidebar.tsx
    - components/AppLayout.tsx
tech_stack:
  added: []
  patterns:
    - Modal from ui.tsx with 3-tab structure
    - useTheme() hook for all theme read/write operations
    - usePermissions() for role-gated "Aplica la tot clubul" button
key_files:
  created:
    - components/ThemeEditor.tsx
  modified:
    - index.tsx
    - components/Sidebar.tsx
    - components/AppLayout.tsx
decisions:
  - ThemeProvider inserted between NavigationProvider and BrowserRouter in index.tsx (DataProvider is already ancestor)
  - ThemeEditor does not query DB directly — only calls saveTheme() from ThemeContext
  - buildCustomThemeConfig derives full ThemeConfig from 4 user-editable fields, filling gaps from DEFAULT_THEME
  - Palette button in Sidebar footer adapts to expanded/collapsed state (icon+text vs icon-only)
metrics:
  duration: "~25 minutes"
  completed: "2026-06-06"
  tasks_completed: 2
  files_created: 1
  files_modified: 3
---

# Phase 05 Plan 03: ThemeEditor + Wiring Summary

**One-liner:** ThemeEditor modal with 3 tabs (predefined swatches, custom color pickers, saved placeholder) wired to Sidebar palette button via AppLayout state.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | ThemeEditor.tsx + ThemeProvider in index.tsx | 65015b2 | components/ThemeEditor.tsx (new), index.tsx |
| 2 | Sidebar footer palette button + AppLayout wiring | 673eb3a | components/Sidebar.tsx, components/AppLayout.tsx |

## What Was Built

### components/ThemeEditor.tsx (new)
- Modal with 3 tabs: "Teme Predefinite", "Personalizat", "Temele Mele"
- Tab 1: 2x4 swatch grid over 8 predefined themes; click applies preview instantly via `setTheme()`
- Tab 2: 4 color pickers (primary, bg, surface, border) + name input; live preview on every change
- Tab 3: Placeholder "Temele salvate vor aparea aici" (Sprint 2 scope)
- Live preview section shows Button primary + Button secondary following CSS vars
- "Aplica doar mie" button calls `saveTheme(theme, 'user')` for all tabs
- "Aplica la tot clubul" button visible only when `permissions.isAdminClub || permissions.isFederationAdmin`; calls `saveTheme(theme, 'club')`
- No direct Supabase queries — all operations go through `useTheme()` from ThemeContext

### index.tsx (modified)
- Added `import { ThemeProvider } from './contexts/ThemeContext'`
- ThemeProvider inserted inside NavigationProvider, wrapping BrowserRouter+App
- Provider order: ErrorProvider > QueryClientProvider > DataProvider > NavigationProvider > ThemeProvider > BrowserRouter > App

### components/Sidebar.tsx (modified)
- Added `PaletteIcon` to icon imports
- Added `onOpenThemeEditor: () => void` prop to `SidebarProps` interface
- Palette button in footer, above separator line — adapts: collapsed (icon centered) / expanded (icon + "Tema" text)

### components/AppLayout.tsx (modified)
- Added `import { ThemeEditor } from './ThemeEditor'`
- Added `isThemeEditorOpen` state alongside `isMobileSidebarOpen`
- Passes `onOpenThemeEditor={() => setIsThemeEditorOpen(true)}` to Sidebar
- Renders `<ThemeEditor isOpen={isThemeEditorOpen} onClose={...} />` before AIAssistantWidget

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- **Tab "Temele Mele"**: Placeholder only — `components/ThemeEditor.tsx` line ~295: shows static text "Temele salvate vor aparea aici." Marked intentional per plan; Sprint 2 will add saved theme list with delete functionality.

## Threat Flags

No new security-relevant surface introduced beyond what the threat model covers. "Aplica la tot clubul" button correctly gated by `permissions.isAdminClub || permissions.isFederationAdmin` (T-05-08 mitigated).

## Self-Check: PASSED

- components/ThemeEditor.tsx: FOUND
- index.tsx contains ThemeProvider: FOUND (import + usage)
- components/Sidebar.tsx contains PaletteIcon: FOUND (import + usage)
- components/AppLayout.tsx contains isThemeEditorOpen: FOUND (useState + prop + render)
- Commits 65015b2 and 673eb3a: FOUND in git log
- TypeScript: 0 errors
