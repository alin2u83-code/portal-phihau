---
phase: quick-260609-vvj
plan: "01"
subsystem: ui-components
tags: [button, visibility, css, ghost, secondary, border, tabs, competitii, sms]
dependency_graph:
  requires: []
  provides: [button-border-visibility, tab-border-visibility]
  affects: [components/ui.tsx, components/Competitii/index.tsx, components/SMS/SMSIncasari.tsx]
tech_stack:
  added: []
  patterns: [inline-style-css-properties, tailwind-border-on-inactive-tabs]
key_files:
  modified:
    - components/ui.tsx
    - components/Competitii/index.tsx
    - components/SMS/SMSIncasari.tsx
decisions:
  - "Border color upgraded from --t-border (#1e293b slate-800) to --t-text-muted (#94a3b8 slate-400) for secondary Button variants"
  - "Text-only tab buttons in Competitii and SMS gain bg-slate-800 + border in inactive state to signal clickability"
  - "Tab buttons with color accent (Template-uri=emerald, Cereri inter-club=indigo) use matching border color at 60% opacity"
metrics:
  duration: "~10min"
  completed: "2026-06-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Quick Fix 260609-vvj: Butoane Ghost Transparente - Adauga Border

Border vizibil pe toate elementele clickabile ghost/secondary/tab din aplicatie: Button component (#94a3b8 slate-400) si tab-uri text-only (bg-slate-800 + border-slate-600) din Competitii si SMS.

## What Was Built

### Change 1 — Button component (components/ui.tsx)

Three targeted CSS property changes in the `variantStyles` object:

1. **ghost_secondary** — `border` changed from `1px solid var(--t-border)` to `1px solid var(--t-text-muted)`
2. **outline_secondary** — `border` changed from `2px solid var(--t-border)` to `2px solid var(--t-text-muted)`
3. **secondary** (solid, non-ghost) — Added `border: '1px solid var(--t-text-muted)'` as visual signal

The problem: `--t-border` = `#1e293b` (slate-800, nearly black) was invisible against dark backgrounds (`#020617`, `#0f172a`). The fix: `--t-text-muted` = `#94a3b8` (slate-400) provides sufficient contrast without being visually aggressive.

No logic changed, no Tailwind classes added, no other variants touched.

### Change 2 — Competitii tab buttons (components/Competitii/index.tsx)

4 tab buttons in `CompetitieDetail` that used plain text styling with zero visual affordance now have visible borders in inactive state:

| Tab | Before | After (inactive) |
|-----|--------|-----------------|
| Raport | `text-slate-400 hover:text-white hover:bg-slate-700` | `bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700` |
| Financiar | `text-slate-400 hover:text-white hover:bg-slate-700` | `bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700` |
| Template-uri | `text-emerald-400 hover:text-white hover:bg-slate-700` | `bg-slate-800 border border-emerald-700/60 text-emerald-400 hover:text-white hover:bg-slate-700` |
| Cereri inter-club | `text-indigo-400 hover:text-white hover:bg-slate-700` | `bg-slate-800 border border-indigo-700/60 text-indigo-400 hover:text-white hover:bg-slate-700` |

Active state (bg-brand-primary / bg-emerald-700 / bg-indigo-700) unchanged.

### Change 3 — SMS filter tabs (components/SMS/SMSIncasari.tsx)

Filter tabs in `SMSIncasari` gained the same pattern:

- Before: `text-slate-400 hover:text-white hover:bg-slate-700/60`
- After: `bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/60`

Active state (bg-indigo-600 text-white shadow-sm) unchanged.

## Commits

| Hash | Message |
|------|---------|
| c20250a | fix(quick-260609-vvj-01): creste vizibilitatea border pe variantele secondary ghost/outline |
| 86f64bb | fix(quick-260609-vvj-02): adauga border vizibil tab-urilor text-only in Competitii si SMS |

## Deviations from Plan

### Auto-added scope (Rule 2 — Missing Critical Functionality)

**1. [Rule 2 - UX] Tab buttons in Competitii/index.tsx lacked visual affordance**
- **Found during:** Post-checkpoint review (human verification pass)
- **Issue:** 4 tab buttons (Raport, Financiar, Template-uri, Cereri inter-club) were plain text with no background or border — not recognizable as clickable elements, same root cause as the Button ghost issue
- **Fix:** Added `bg-slate-800 border border-slate-600/emerald-700/60/indigo-700/60` on inactive state
- **Files modified:** components/Competitii/index.tsx
- **Committed in:** 86f64bb

**2. [Rule 2 - UX] Filter tabs in SMSIncasari.tsx lacked visual affordance**
- **Found during:** Post-checkpoint review (human verification pass)
- **Issue:** Same pattern — text-only inactive tabs with zero border/background
- **Fix:** Added `bg-slate-800 border border-slate-600` on inactive state
- **Files modified:** components/SMS/SMSIncasari.tsx
- **Committed in:** 86f64bb

---

**Total deviations:** 2 auto-added (Rule 2 - UX affordance, same root cause)
**Impact on plan:** Necessary for complete fix of the reported issue. No scope creep — all changes are pure CSS, no logic altered.

## Verification

- Build: `npm run build` passed without errors (36.73s)
- Visual checkpoint (Task 2): APPROVED — all borders visible in browser, primary/danger buttons unchanged
- Tabs in Competitii: verified with visible slate/emerald/indigo borders on inactive state
- SMS filter tabs: verified with visible slate border on inactive state

## Self-Check: PASSED

- `components/ui.tsx` modified: confirmed (commit c20250a)
- `components/Competitii/index.tsx` modified: confirmed (commit 86f64bb)
- `components/SMS/SMSIncasari.tsx` modified: confirmed (commit 86f64bb)
- Commit c20250a exists: confirmed
- Commit 86f64bb exists: confirmed
- Build passed: confirmed
- Visual checkpoint: APPROVED
