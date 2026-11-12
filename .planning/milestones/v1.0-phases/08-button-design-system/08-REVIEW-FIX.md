---
phase: 08-button-design-system
fixed_at: 2026-06-09T19:30:00Z
review_path: .planning/phases/08-button-design-system/08-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-06-09T19:30:00Z
**Source review:** .planning/phases/08-button-design-system/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 Critical, 5 Warning — Info findings excluded per fix_scope)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Card crashes when className is undefined

**Files modified:** `components/ui.tsx`
**Commit:** 86ec2a4
**Applied fix:** Changed `${className}` to `${className ?? ''}` in Card's className template literal to prevent the literal string "undefined" from being emitted as a CSS class token when className prop is omitted.

---

### CR-02: ConfirmButton timer fires setState on unmounted component

**Files modified:** `components/ui.tsx`
**Commit:** e492221
**Applied fix:** Updated `startConfirming` to clear any existing timer before setting a new one (`if (timerRef.current) clearTimeout(timerRef.current)`), and nulled `timerRef.current` inside the timeout callback after it fires. This prevents double-fire on rapid double-click and avoids setState on unmounted components.

---

### CR-03: useId() called conditionally inside Modal — violates Rules of Hooks

**Files modified:** `components/ui.tsx`
**Commit:** 37f13db
**Applied fix:** Moved `const titleId = React.useId()` above the `if (!isOpen) return null` early return, placing it unconditionally at the top of the component body as required by React Rules of Hooks.

---

### WR-01: Button hover state not reset when disabled/isLoading toggled

**Files modified:** `components/ui.tsx`
**Commit:** d8e52b0
**Applied fix:** Added `useEffect(() => { if (disabled || isLoading) setIsHovered(false); }, [disabled, isLoading])` after the `isHovered` state declaration so the hover style is cleared whenever the button transitions into disabled or loading state while the pointer is inside.

---

### WR-02: Button spreads props with `as any` on label branch

**Files modified:** `components/ui.tsx`
**Commit:** 50060fb
**Applied fix:** Removed the `as any` cast from `{...(props as any)}` on the label branch, replacing it with the plain `{...props}` spread. All Button-specific props (`variant`, `size`, `isLoading`, `pill`, `ghost`, `outline`, `leftIcon`, `rightIcon`) are already destructured and excluded from `...props`, so the spread is safe. TypeScript strict mode is disabled in this project (per CLAUDE.md), so the spread onto a `<label>` element does not produce a build error.

---

### WR-03: Input className concatenation passes undefined when props.className is absent

**Files modified:** `components/ui.tsx`
**Commit:** 7a9f61d
**Applied fix:** Changed `${props.className}` to `${props.className ?? ''}` in the Input forwardRef component's className template literal.

---

### WR-04: Select has the same undefined className injection

**Files modified:** `components/ui.tsx`
**Commit:** 7a9f61d
**Applied fix:** Changed `${props.className}` to `${props.className ?? ''}` in the Select forwardRef component's className template literal. (Committed in the same atomic commit as WR-03 since it is the identical pattern.)

---

### WR-05: NavMenu button-catalog uses ShieldCheckIcon same as Admin Dashboard

**Files modified:** `components/NavMenu.tsx`
**Commit:** aaa4dbe
**Applied fix:** Added `PaletteIcon` to the icons import in NavMenu.tsx and replaced `ShieldCheckIcon` with `PaletteIcon` for the Button Catalog nav item. `PaletteIcon` is already exported from `components/icons.tsx` (mapped to Lucide's `Palette` icon), making Button Catalog visually distinct from Admin Dashboard in collapsed sidebar mode.

---

_Fixed: 2026-06-09T19:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
