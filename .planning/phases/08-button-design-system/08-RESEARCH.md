# Phase 8: Button Design System - Research

**Researched:** 2026-06-09
**Domain:** React component extension — design system, TypeScript props, inline confirmation pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Backward compatible extension — API existent neschimbat, zero breaking changes
- Variante noi: `ghost`, `outline`, `pill` (boolean prop)
- Dimensiuni noi: `xs` (px-3 py-1 text-xs) și `lg` (px-8 py-4 text-lg), păstrează `sm` și `md`
- Props icoane: `leftIcon?: ReactNode` și `rightIcon?: ReactNode`, gap-2 față de text
- ConfirmButton: inline confirm pattern, auto-reset 3s, defaultVariant=danger
- ButtonCatalog: `activeView='button-catalog'`, vizibil DOAR SUPER_ADMIN_FEDERATIE
- CSS vars `--t-primary`, `--t-secondary`, `--t-status-*` rămân sursa de adevăr pentru culori

### Claude's Discretion
- Organizarea internă a codului în ui.tsx (funcții helper, ordinea declarațiilor)
- Culoarea exactă de border pentru ghost variants (derivă din CSS vars existente)
- Poziționarea link-ului catalog în Sidebar (footer sau secțiune separată)
- Iconița pentru link-ul catalog din Sidebar

### Deferred Ideas (OUT OF SCOPE)
- Migrarea explicită a tuturor butoanelor existente la variantele noi
- Animații de tranziție complexe (motion/framer)
- Buton split (dropdown + acțiune principală)
- Storybook sau documentare HTML separată
</user_constraints>

---

## Summary

Phase 8 extends the existing `Button` component in `components/ui.tsx` with three new visual variants (ghost, outline, pill), icon slots (leftIcon/rightIcon), two extra sizes (xs/lg), and a new `ConfirmButton` component. A visual catalog page (`ButtonCatalog`) is added as a protected view for SUPER_ADMIN_FEDERATIE only.

The codebase uses `Button` in ~450+ call sites with a stable API: `variant`, `size` (currently sm/md only), `isLoading`, `disabled`, `className`, `as` (label), `htmlFor`, and all native button HTML attributes. The paramount constraint is zero breaking changes — every existing call site must render identically.

The CSS theme system (Phase 5) is complete and live. All `--t-*` CSS variables are set by `applyTheme()` in `lib/themes.ts` and injected as inline styles on the Button via `onMouseEnter/Leave` + `useState(isHovered)`. The new ghost/outline variants must follow the same inline-style pattern (not Tailwind classes) for theme-following behavior.

**Primary recommendation:** Extend `ButtonProps` additively, keep the existing `isHovered` + inline style pattern for the new variants, implement ConfirmButton as a separate exported component wrapping Button, and wire the catalog via the existing `NavMenu` isFederationAdmin pattern.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Button variant rendering | Frontend (ui.tsx) | — | Pure presentational component, no data layer |
| ConfirmButton state machine | Frontend (ui.tsx) | — | Local state only — idle/confirming, timeout |
| ButtonCatalog page | Frontend (components/) | — | Static demo page, no data fetching |
| View routing (button-catalog) | Frontend (AppRouter.tsx) | — | AppRouter switch dispatches views |
| Sidebar catalog link | Frontend (NavMenu.tsx) | — | isFederationAdmin gate already in NavMenu |
| View type extension | types.ts | — | Single source of truth for View union |

---

## Standard Stack

This phase installs **zero new packages**. All implementation uses the existing stack.

| Library | Current Version | Role in This Phase |
|---------|----------------|-------------------|
| React 18.3.1 | existing | useState, useRef, useEffect for ConfirmButton timer |
| TypeScript 5.5.3 | existing | Additive type extension of ButtonProps |
| Tailwind CSS 3.4.6 | existing | Structural classes (rounded-full for pill, gap-2 for icons) |
| Lucide-react 0.400.0 | existing | Icon for ButtonCatalog sidebar link |

**No new packages required.** `[VERIFIED: codebase grep]`

### Package Legitimacy Audit

No external packages are introduced in this phase. Section not applicable.

---

## Existing Button API — What Must NOT Break

**Verified by grep across all ~450 Button usages in `components/**/*.tsx`:**

### Critical existing props (must remain 100% identical)

| Prop | Type | Usage Count | Notes |
|------|------|-------------|-------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'info' \| 'warning'` | 449 usages | Default = `'primary'`. ALL six must stay. |
| `size` | `'sm' \| 'md'` | ~30 with explicit `size=`, rest use default `md` | Default = `'md'`. `sm` and `md` values must be preserved. |
| `isLoading` | `boolean` | ~60 usages | Shows spinner + "Procesare..." text, disables button |
| `disabled` | `boolean` | ~30 usages | Passed via spread `...props`, native button attribute |
| `className` | `string` | ~80 usages | Appended to base classes — MANY use `!p-1.5`, `!p-2`, `w-full`, custom padding overrides |
| `as` | `'label'` | 2 usages (BackupManager, DataMaintenancePage) | Renders `<label>` instead of `<button>` for file inputs |
| `htmlFor` | `string` | 2 usages (paired with `as="label"`) | Passed to `<label>` |
| `onClick` | native | everywhere | Via `...props` spread — must not be intercepted for normal Button |
| `type` | `'submit' \| 'button'` | ~30 usages | Via `...props` spread |

### Top 10 usage patterns that must not break

```tsx
// Pattern 1: Plain secondary with back navigation
<Button onClick={onBack} variant="secondary">Înapoi la Meniu</Button>

// Pattern 2: Success submit with loading
<Button type="submit" variant="success" isLoading={loading}>Salvează</Button>

// Pattern 3: Small secondary icon-only (custom padding via className)
<Button size="sm" variant="secondary" className="!p-1.5" onClick={...}><EditIcon/></Button>

// Pattern 4: Size sm with explicit height (must not change sm dimensions)
<Button variant="secondary" size="sm" onClick={...} className="!p-1.5 h-auto">
  <ChevronLeftIcon className="w-5 h-5"/>
</Button>

// Pattern 5: Full-width with isLoading
<Button variant="info" className="w-full" onClick={...} isLoading={loading[...]}>
  Export
</Button>

// Pattern 6: as="label" for file input
<Button as="label" htmlFor="restore-file-input" variant="danger" className="w-full cursor-pointer" isLoading={...}>
  Restaurare
</Button>

// Pattern 7: Dynamic variant (conditional primary/secondary)
<Button variant={activeTab === 'FEDERATIE' ? 'primary' : 'secondary'} onClick={...}>Calendar</Button>

// Pattern 8: Danger with disabled
<Button variant="primary" onClick={handleSave} isLoading={loading} disabled={selectedIds.size === 0}>
  Înscrie
</Button>

// Pattern 9: Size md explicit (default anyway, but explicit in ClubSettings)
<Button onClick={handleSave} variant="success" size="md" isLoading={loading}>Salvează</Button>

// Pattern 10: Warning and info variants (less common)
<Button variant="warning" size="sm" ...>...</Button>
```

**CRITICAL GOTCHA — `className` with `!` important overrides:**
Many sites use `className="!p-1.5"`, `className="!p-2"`, etc. to override the padding set by `sizeClasses`. The current code computes: `` `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} touch-manipulation` ``. If `sizeClasses` or `baseClasses` order changes, `!` overrides could stop working. **Order of class concatenation must remain identical.** `[VERIFIED: codebase grep + ui.tsx read]`

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction
      │
      ▼
Button (ui.tsx)  ←── extends ButtonProps (additive only)
  │  └─ variant: existing 6 + ghost/outline logic
  │  └─ size: xs | sm | md | lg (sm/md behavior preserved)
  │  └─ pill: boolean → rounded-full override
  │  └─ leftIcon/rightIcon: ReactNode → wraps children in flex row
  │  └─ isHovered state → inline style → CSS vars → theme colors
  │
ConfirmButton (ui.tsx)
  │  └─ wraps Button internally
  │  └─ state: 'idle' | 'confirming'
  │  └─ timeout: useRef<ReturnType<typeof setTimeout>>
  │  └─ onConfirm: () => void  (new required prop)
  │
ButtonCatalog (components/ButtonCatalog.tsx)  [new file]
  │  └─ static demo page
  │  └─ no data fetching, no context dependencies
  │
AppRouter.tsx
  │  └─ case 'button-catalog': renderProtected(<ButtonCatalog/>, isFederationAdmin)
  │
types.ts
  │  └─ View union += 'button-catalog'
  │
NavMenu.tsx
  │  └─ existing isFederationAdmin block → add NavItem for 'button-catalog'
```

### Recommended Project Structure

```
components/
├── ui.tsx                    # MODIFIED: Button extended + ConfirmButton added
├── ButtonCatalog.tsx         # NEW: visual catalog page
├── LazyComponents.tsx        # MODIFIED: add ButtonCatalog lazy export
├── AppRouter.tsx             # MODIFIED: add case 'button-catalog'
├── NavMenu.tsx               # MODIFIED: add catalog NavItem for isFederationAdmin
types.ts                      # MODIFIED: add 'button-catalog' to View union
```

### Pattern 1: Additive ButtonProps Extension

**What:** Add new optional props to the existing interface — never remove or change existing ones.

**When to use:** Always for backward-compatible extensions.

```tsx
// Source: [ASSUMED — standard TypeScript pattern, verified matches codebase convention]
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // EXISTING — DO NOT CHANGE:
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
  size?: 'sm' | 'md';           // will become 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean;
  // NEW — additive only:
  pill?: boolean;
  ghost?: boolean;
  outline?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

**CRITICAL:** The `size` type changes from `'sm' | 'md'` to `'xs' | 'sm' | 'md' | 'lg'`. This is backward compatible because all existing `size="sm"` and `size="md"` values remain valid. TypeScript will accept existing call sites without change.

### Pattern 2: Ghost/Outline Variant via Inline Styles (Theme-Following)

**What:** Ghost and outline variants use inline styles referencing CSS vars, consistent with how primary/secondary already work. Tailwind-only approach would NOT follow theme changes at runtime.

**Why inline styles (not Tailwind):** The existing primary and secondary variants use `style={variantStyles[variant]}` with `var(--t-primary)` etc. Tailwind classes like `border-[var(--t-primary)]` do work in Tailwind v3 with CSS vars, but the codebase has already established the `onMouseEnter/Leave + useState(isHovered) + inline style` pattern. Consistency requires following this pattern.

**Ghost primary** (transparent bg, colored text and border):
```tsx
// Source: [ASSUMED — derived from existing variantStyles pattern in ui.tsx]
ghost_primary: {
  backgroundColor: 'transparent',
  color: 'var(--t-primary)',
  border: `1px solid var(--t-primary)`,
  // On hover: subtle bg tint
},
ghost_primary_hover: {
  backgroundColor: 'color-mix(in srgb, var(--t-primary) 10%, transparent)',
  color: 'var(--t-primary)',
  border: `1px solid var(--t-primary)`,
},
```

**Ghost secondary** (matches CONTEXT.md spec):
```tsx
// Source: [ASSUMED — derived from CONTEXT.md decisions]
ghost_secondary: {
  backgroundColor: 'transparent',
  color: 'var(--t-secondary-fg)',
  border: `1px solid var(--t-border)`,
},
ghost_secondary_hover: {
  backgroundColor: 'var(--t-surface-2)',
  color: 'var(--t-secondary-fg)',
  border: `1px solid var(--t-border)`,
},
```

**Ghost danger/success/info/warning** (use `--t-status-*` vars):
```tsx
// Source: [ASSUMED — derived from existing danger variantStyles in ui.tsx]
ghost_danger: {
  backgroundColor: 'transparent',
  color: 'var(--t-status-danger)',
  border: `1px solid var(--t-status-danger)`,
},
ghost_danger_hover: {
  backgroundColor: 'color-mix(in srgb, var(--t-status-danger) 10%, transparent)',
  color: 'var(--t-status-danger)',
  border: `1px solid var(--t-status-danger)`,
},
```

**Outline variant** — same as ghost but border is `2px` for visual distinction.

**Implementation approach** — the `variantStyles` lookup key becomes composite:
```tsx
// Source: [ASSUMED — engineering approach derived from codebase pattern]
const styleKey = `${ghost ? 'ghost_' : outline ? 'outline_' : ''}${variant}${isHovered ? '_hover' : ''}`;
const computedStyle = variantStyles[styleKey] ?? variantStyles[variant] ?? {};
```

This keeps the lookup table pattern intact and doesn't change the rendering path for existing variants.

### Pattern 3: Pill Boolean Prop

**What:** `pill` boolean adds `rounded-full` instead of the base `rounded-xl`.

**Implementation:**
```tsx
// Source: [ASSUMED — standard Tailwind pattern]
// In baseClasses, replace static 'rounded-xl' with conditional:
const roundedClass = pill ? 'rounded-full' : 'rounded-xl';
const baseClasses = `inline-flex items-center justify-center ${roundedClass} font-medium ...`;
```

**GOTCHA:** The current `baseClasses` string is built as a constant. Extracting `roundedClass` requires converting it to a dynamic expression. The string must remain constructable — no template literal nesting that breaks TypeScript.

### Pattern 4: Icon Props Rendering

**What:** `leftIcon` and `rightIcon` are `ReactNode` — rendered inside the flex container with `gap-2`.

```tsx
// Source: [ASSUMED — standard React pattern]
const content = isLoading ? (
  <span className="flex items-center gap-2">
    <svg className="animate-spin ...">...</svg>
    Procesare...
  </span>
) : (leftIcon || rightIcon) ? (
  <span className="flex items-center gap-2">
    {leftIcon}
    {children}
    {rightIcon}
  </span>
) : children;
```

**GOTCHA:** When icons are used without text (`children` is empty), the gap-2 still applies. This is intentional for icon-only buttons and matches usage pattern 3 in the codebase (small buttons with icon-only content already use `className="!p-1.5"`).

### Pattern 5: ConfirmButton State Machine

**States:** `idle` → (click) → `confirming` → (confirm click) → call `onConfirm()` → `idle`
**Reset paths:** `confirming` → (cancel click) → `idle` | `confirming` → (3s timeout) → `idle`

```tsx
// Source: [ASSUMED — standard React pattern using useRef for cleanup]
export interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  onConfirm: () => void;
  confirmText?: string;       // default: "Ești sigur?"
  confirmLabel?: string;      // default: "Da"
  cancelLabel?: string;       // default: "Nu"
}

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  onConfirm,
  confirmText = 'Ești sigur?',
  confirmLabel = 'Da',
  cancelLabel = 'Nu',
  children,
  variant = 'danger',
  ...buttonProps
}) => {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConfirming = () => {
    setConfirming(true);
    timerRef.current = setTimeout(() => setConfirming(false), 3000);
  };

  const handleConfirm = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    onConfirm();
  };

  const handleCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
  };

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-sm text-slate-300">{confirmText}</span>
        <Button size="sm" variant={variant} onClick={handleConfirm}>{confirmLabel}</Button>
        <Button size="sm" variant="secondary" onClick={handleCancel}>{cancelLabel}</Button>
      </span>
    );
  }

  return (
    <Button variant={variant} onClick={startConfirming} {...buttonProps}>
      {children}
    </Button>
  );
};
```

**Why `useRef` for timeout (not `useState`):** The timer ID doesn't drive rendering — it's infrastructure for cleanup. Storing it in a ref avoids unnecessary re-renders and the ref is always current in the timeout callback. `[ASSUMED — standard React pattern]`

**Keyboard accessibility:** When `confirming=true`, the "Da"/"Nu" buttons are focusable HTML buttons and receive keyboard events natively. Escape key support would require a `keydown` event listener — this is out of scope per CONTEXT.md (no complex effects).

**GOTCHA — ConfirmButton does NOT use `Omit<ButtonProps, 'onClick'>` if `as='label'` is also passed.** The `as` prop handling is only on the underlying Button. ConfirmButton should not support `as="label"` (no semantic use case for a confirm label). Strip `as` from the spread.

### Pattern 6: Adding a New View (AppRouter + types.ts + NavMenu)

**Verified pattern from codebase:**

**Step 1 — types.ts:** Add `'button-catalog'` to the View union (single line change):
```tsx
// Current last value: '... | 'setup-mfa';
// Change to:
export type View = ... | 'setup-mfa' | 'button-catalog';
```

**Step 2 — AppRouter.tsx:** Add a `case` in the switch statement (the ButtonCatalog does NOT need data from AppRouter, so minimal props):
```tsx
// Source: [VERIFIED: AppRouter.tsx codebase read]
// Place before the 'default' case:
case 'button-catalog':
  return renderProtected(<Lazy.ButtonCatalog />, isFederationAdmin);
```

Note: `Lazy.ButtonCatalog` needs to be added to `LazyComponents.tsx`.

**Step 3 — LazyComponents.tsx:** Add lazy export:
```tsx
// Source: [VERIFIED: LazyComponents.tsx codebase read — pattern matches all other entries]
export const ButtonCatalog = lazy(() =>
  import('./ButtonCatalog').then(m => ({ default: m.ButtonCatalog }))
);
```

**Step 4 — NavMenu.tsx:** Add to the existing `isFederationAdmin` block:
```tsx
// Source: [VERIFIED: NavMenu.tsx line 192-202]
{permissions?.isFederationAdmin && (
  <>
    <NavItem
      item={{ label: 'Admin Dashboard', view: 'admin-dashboard', icon: ShieldCheckIcon }}
      ...
    />
    <NavItem
      item={{ label: 'Button Catalog', view: 'button-catalog', icon: SwatchIcon }}
      ...  
    />
  </>
)}
```
The icon `SwatchIcon` (or `PaletteIcon` which already exists in `./icons`) should be used. `PaletteIcon` is already imported in `Sidebar.tsx` — verify it's available in `NavMenu.tsx`'s icon set or choose an existing icon.

**IMPORTANT:** `menuConfig.ts` does NOT need to change. The `adminMenu` array does not include this item — the catalog link is added directly in `NavMenu.tsx`'s hardcoded `isFederationAdmin` block, exactly as `admin-dashboard` is handled. This keeps the catalog out of the regular menu for ALL admin roles and restricts it purely to isFederationAdmin.

### Anti-Patterns to Avoid

- **Changing `variantClasses` keys:** The `variantClasses` object maps `variant` names to Tailwind focus-ring classes. Adding `ghost` and `outline` as keys here would require changing variant type, breaking existing logic. Instead, compute ghost/outline styles in a separate lookup using the composite key approach.
- **Using Tailwind color classes for new variants:** `text-[var(--t-primary)]` in JSX className works in Tailwind v3 but creates two sources of truth. The existing inline style pattern is the correct approach.
- **Modifying `sizeClasses` object keys for existing sizes:** The keys `sm` and `md` must remain. Adding `xs` and `lg` is additive.
- **Defaulting `size` to undefined instead of `'md'`:** The default `size = 'md'` in the destructuring must remain — many call sites omit `size`.
- **ConfirmButton using `window.confirm()`:** This is a modal dialog, not inline. The decision is inline (no modal).
- **Adding 'button-catalog' to menuConfig.ts adminMenu:** This would make it visible to ADMIN_CLUB role via the admin menu. The view must be wired ONLY through the NavMenu isFederationAdmin block.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS var hover colors | Custom CSS class + :hover | `onMouseEnter/Leave + useState(isHovered) + inline style` | This is what the existing Button already does — consistency |
| Confirm timeout cleanup | Complex effect with multiple deps | `useRef` for timer ID + `useEffect` return cleanup | Avoids stale closure in setTimeout callback |
| Theme-aware border | Hardcoded hex color | `var(--t-border)` CSS variable | Theme changes apply without re-render |
| Icon alignment | manual margin classes | `gap-2` in flex container | Already the pattern used in the loading spinner span |

---

## Common Pitfalls

### Pitfall 1: className Concatenation Order
**What goes wrong:** Changing the order of `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}` causes `className="!p-1.5"` important overrides to fail because Tailwind specificity depends on the order in the generated CSS, not in the JSX string.

**Why it happens:** ~80 Button usages pass `className` with Tailwind `!important` overrides like `!p-1.5`, `!p-2`, `h-8 w-8`, `w-full`. These work because `className` comes last. If moved earlier, the sizeClass padding wins.

**How to avoid:** Keep `${className}` as the LAST item in the concatenated string. The new `roundedClass` should be embedded inside `baseClasses` string, not added separately after `className`.

**Warning signs:** Buttons appearing with wrong padding/size in the existing UI after changes.

### Pitfall 2: `size` TypeScript Narrowing
**What goes wrong:** Changing `size?: 'sm' | 'md'` to `size?: 'xs' | 'sm' | 'md' | 'lg'` requires updating the `sizeClasses` object to include all 4 keys. If `sizeClasses` is typed as `Record<'sm' | 'md', string>`, TypeScript will error on `sizeClasses[size]` after the type expansion.

**Why it happens:** TypeScript strict indexing — if `size` can now be `'xs'`, but `sizeClasses` only has `'sm'` and `'md'`, the lookup is unsafe.

**How to avoid:** Update `sizeClasses` type annotation to `Record<'xs' | 'sm' | 'md' | 'lg', string>` and add both new entries simultaneously.

**Warning signs:** TypeScript compiler error `Element implicitly has an 'any' type` on `sizeClasses[size]`.

### Pitfall 3: isHovered State Across Variant Changes
**What goes wrong:** The existing Button has `const [isHovered, setIsHovered] = useState(false)`. If `ghost` or `outline` need different hover computations, the single boolean `isHovered` is sufficient — but the style lookup must be done consistently.

**Why it happens:** Ghost/outline styles at hover need BOTH the `variant` AND the `isHovered` flag. The composite key approach (`ghost_primary_hover`) handles this correctly. A mistake would be computing ghost hover color based on `isHovered` alone without considering `variant`.

**How to avoid:** Build the full style lookup table at the top of the component. Map all combinations: 6 variants × (normal/hover) × (solid/ghost/outline) = 36 entries. Use `undefined` fallback for unused combos.

### Pitfall 4: ConfirmButton Timer Leak on Unmount
**What goes wrong:** If the component unmounts while in `confirming` state (e.g., the view changes), the `setTimeout` callback fires and calls `setConfirming(false)` on an unmounted component, generating a React warning.

**Why it happens:** `setTimeout` callbacks execute even after component unmount.

**How to avoid:** The `useEffect` cleanup (`return () => clearTimeout(timerRef.current)`) handles this. Must be included in the implementation.

**Warning signs:** React console warning "Can't perform a React state update on an unmounted component."

### Pitfall 5: ButtonCatalog Not Lazy-Loaded Causes Bundle Bloat
**What goes wrong:** Importing `ButtonCatalog` directly into AppRouter (not via LazyComponents) adds it to the main bundle, increasing initial load time for all users even though only SUPER_ADMIN sees this view.

**Why it happens:** Every other page view follows the LazyComponents pattern for code splitting.

**How to avoid:** Follow the existing pattern — add to `LazyComponents.tsx` and reference via `Lazy.ButtonCatalog` in AppRouter.

### Pitfall 6: NavMenu icon import missing
**What goes wrong:** Adding a new `NavItem` for the catalog link in `NavMenu.tsx` requires an icon that is imported at the top of that file. The current imports are: `ShieldCheckIcon, ChevronDownIcon`. If `PaletteIcon` or a new icon is needed, it must be added to the import.

**Why it happens:** `NavMenu.tsx` only imports two icons. `Sidebar.tsx` imports `PaletteIcon` but this is a different file.

**How to avoid:** Use `ShieldCheckIcon` (already imported in NavMenu.tsx) for the catalog link, or add the desired icon to NavMenu.tsx's import from `./icons`.

---

## Code Examples

### Extended ButtonProps TypeScript Interface

```tsx
// Backward-compatible extension
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // EXISTING (unchanged):
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';   // expanded union, default stays 'md'
  isLoading?: boolean;
  // NEW:
  pill?: boolean;
  ghost?: boolean;
  outline?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

### Extended sizeClasses

```tsx
const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'px-3 py-1 text-xs',
  sm: 'px-4 py-2 text-sm',     // unchanged
  md: 'px-6 py-3 text-base',   // unchanged
  lg: 'px-8 py-4 text-lg',
};
```

### Pill prop in baseClasses

```tsx
const roundedClass = pill ? 'rounded-full' : 'rounded-xl';
const baseClasses = `inline-flex items-center justify-center ${roundedClass} font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap`;
```

### Ghost/Outline style lookup (composite key)

```tsx
// Source: [ASSUMED — derived from existing variantStyles pattern]
type StyleKey = string; // e.g. 'primary', 'ghost_primary', 'ghost_primary_hover', etc.

const buildVariantStyles = (isHovered: boolean, ghost?: boolean, outline?: boolean): Record<string, React.CSSProperties> => {
  // Existing solid variants:
  const primary: React.CSSProperties = {
    backgroundColor: isHovered ? 'var(--t-primary-hover)' : 'var(--t-primary)',
    color: 'var(--t-primary-fg)',
  };
  // ... (other existing solid variants unchanged)

  // New ghost variants:
  const ghost_primary: React.CSSProperties = {
    backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-primary) 10%, transparent)' : 'transparent',
    color: 'var(--t-primary)',
    border: '1px solid var(--t-primary)',
  };
  // etc.
  return { primary, secondary, danger, success, info, warning, ghost_primary, /* ... */ };
};
```

### Final className assembly (order preserved)

```tsx
// THE ORDER OF THIS CONCATENATION MUST NOT CHANGE
// className must remain last so !important overrides work
const stylePrefix = ghost ? 'ghost_' : outline ? 'outline_' : '';
const activeStyle = allStyles[`${stylePrefix}${variant}`] ?? allStyles[variant];

const finalClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ''} touch-manipulation`;
```

### AppRouter case addition

```tsx
// Source: [VERIFIED: AppRouter.tsx — pattern from all other isFederationAdmin views]
case 'button-catalog':
  return renderProtected(<Lazy.ButtonCatalog />, isFederationAdmin);
```

### NavMenu isFederationAdmin block extension

```tsx
// Source: [VERIFIED: NavMenu.tsx lines 192-202]
{permissions?.isFederationAdmin && (
  <>
    <NavItem
        item={{ label: 'Admin Dashboard', view: 'admin-dashboard', icon: ShieldCheckIcon }}
        isExpanded={isExpanded}
        isActive={'admin-dashboard' === activeView}
        onNavigate={onNavigate}
        activeView={activeView}
        openSubmenu={openSubmenu}
        setOpenSubmenu={setOpenSubmenu}
    />
    <NavItem
        item={{ label: 'Button Catalog', view: 'button-catalog', icon: ShieldCheckIcon }}
        isExpanded={isExpanded}
        isActive={'button-catalog' === activeView}
        onNavigate={onNavigate}
        activeView={activeView}
        openSubmenu={openSubmenu}
        setOpenSubmenu={setOpenSubmenu}
    />
  </>
)}
```

---

## Wiring Checklist (all 4 files that change for the view routing)

| File | Change | Breaks Anything? |
|------|--------|-----------------|
| `types.ts` | Add `'button-catalog'` to View union | No — additive |
| `components/LazyComponents.tsx` | Add `ButtonCatalog` lazy export | No — additive |
| `components/AppRouter.tsx` | Add `case 'button-catalog'` before `default` | No — additive |
| `components/NavMenu.tsx` | Add NavItem inside existing isFederationAdmin block | No — guarded by permissions check |
| `components/ui.tsx` | Extend Button + add ConfirmButton | No — additive props only |
| `components/ButtonCatalog.tsx` | New file | No |

---

## CSS Variables Available for Ghost/Outline Variants

**Verified from `lib/themes.ts` `applyTheme()` and `index.css`:** `[VERIFIED: codebase read]`

| CSS Variable | Default Value | Used For |
|-------------|--------------|---------|
| `--t-primary` | #3b82f6 | Primary button bg, ghost_primary text/border |
| `--t-primary-hover` | #2563eb | Primary hover bg |
| `--t-primary-fg` | #ffffff | Primary text |
| `--t-secondary` | #1e293b | Secondary button bg |
| `--t-secondary-hover` | #334155 | Secondary hover bg |
| `--t-secondary-fg` | #e2e8f0 | Secondary text |
| `--t-border` | #1e293b | Ghost secondary border |
| `--t-surface-2` | #1e293b | Ghost secondary hover bg |
| `--t-status-danger` | #dc2626 | Danger bg, ghost_danger text/border |
| `--t-status-success` | #16a34a | Success bg, ghost_success text/border |
| `--t-status-warning` | #d97706 | Warning bg, ghost_warning text/border |
| `--t-status-info` | #0891b2 | Info bg, ghost_info text/border |

**All 12 are set by `applyTheme()` — they update when theme changes, so inline styles using them update live.** `[VERIFIED: lib/themes.ts read]`

---

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. Formal test section skipped per config.

### Verification Strategy (without automated tests)

Since `nyquist_validation: false`, the quality gate is TypeScript compilation + visual regression check:

**1. TypeScript compilation (`npm run lint` = `tsc --noEmit`):**
- Must pass with zero errors after all changes
- The `lint` script in `package.json` is `tsc --noEmit` `[VERIFIED: package.json grep]`
- Run: `npm run lint`

**2. Zero-regression visual check for existing Button:**
- Load any view that uses Button (e.g., Sportivi page)
- All buttons with no new props must look identical to pre-change
- Icon buttons with `className="!p-1.5"` must still be small squares

**3. New variant visual check in ButtonCatalog:**
- Navigate to ButtonCatalog as SUPER_ADMIN_FEDERATIE
- Grid shows all variants × sizes × states

**4. ConfirmButton behavioral check:**
- Click → see "Ești sigur? Da Nu"
- Click Da → onConfirm fires, returns to idle
- Click Nu → returns to idle
- Wait 3s without clicking → returns to idle

**5. Playwright smoke test (existing, not broken):**
- `npm test` runs `playwright test` (login page tests only)
- Must still pass after changes — Button is used in the login form indirectly

---

## Environment Availability

This phase is purely code changes within the existing codebase. No external services, CLIs, or databases are required beyond what already runs for development.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Node.js + npm | Build/dev | Assumed present | Project is running in dev |
| TypeScript compiler | Type checking | Assumed present | `npm run lint` = `tsc --noEmit` |
| Vite dev server | Visual verification | Assumed present | Standard dev workflow |

**Missing dependencies with no fallback:** None.

---

## Security Domain

> `security_enforcement: true` in config.json. ASVS Level 1.

| ASVS Category | Applies | Assessment |
|---------------|---------|------------|
| V2 Authentication | No | No auth changes |
| V3 Session Management | No | No session changes |
| V4 Access Control | **Yes** | ButtonCatalog protected by `isFederationAdmin` gate via `renderProtected()` — same pattern as all other protected views |
| V5 Input Validation | No | No user input |
| V6 Cryptography | No | No crypto |

### Threat Assessment

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Direct URL navigation to 'button-catalog' | Elevation of Privilege | No URL routing in SPA — `activeView` is in-memory state, not addressable from URL |
| Non-admin accessing catalog via state manipulation | Elevation of Privilege | `renderProtected(<Lazy.ButtonCatalog />, isFederationAdmin)` — returns `<AccessDenied>` if `isFederationAdmin` is false |

**Risk level: LOW.** The catalog is a read-only demo page with no data mutations. Even if a non-admin somehow set `activeView='button-catalog'`, `renderProtected` would block rendering. The SPA architecture provides natural protection since there is no URL to exploit.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ghost/outline variants should use inline styles (not Tailwind classes) for theme-following | Ghost/Outline Pattern | Low — Tailwind CSS vars also work, just different implementation |
| A2 | Composite key `ghost_primary`, `outline_danger` etc. for style lookup | Ghost/Outline Pattern | Low — could also use nested objects or if/else |
| A3 | `PaletteIcon` may not be imported in NavMenu.tsx (only in Sidebar.tsx) | NavMenu Pattern | Low — use ShieldCheckIcon which is already imported |
| A4 | ConfirmButton renders two separate Button components in confirming state (not a single morphing button) | ConfirmButton Pattern | Low — visual result is same, just different DOM structure |
| A5 | `color-mix(in srgb, ...)` is available in the browser targets | Ghost hover bg | Medium — color-mix is CSS Level 5, supported in Chrome 111+, Firefox 113+, Safari 16.2+. Existing Button already uses it for danger hover. If browser target is older, use rgba fallback |

---

## Open Questions

1. **`color-mix` browser support**
   - What we know: `color-mix(in srgb, ...)` is used in the EXISTING Button for danger/success/info/warning hover states, so it's already committed to as supported.
   - What's unclear: No explicit browser target list in project config.
   - Recommendation: Since existing code already uses `color-mix`, the same function is safe for ghost hover backgrounds.

2. **Icon for ButtonCatalog in Sidebar**
   - What we know: Claude's Discretion area per CONTEXT.md. `ShieldCheckIcon` is already imported in NavMenu.tsx.
   - What's unclear: Whether the planner wants a distinct icon (like a swatches/palette) or is happy reusing ShieldCheckIcon.
   - Recommendation: Use `ShieldCheckIcon` for simplicity — no new icon import needed in NavMenu.tsx.

3. **ButtonCatalog positioning in Sidebar**
   - What we know: Claude's Discretion. Could be in the footer area (like ThemeEditor button) or as a NavItem in the isFederationAdmin block.
   - Recommendation: Use the NavItem pattern in the isFederationAdmin block — it's the standard navigation affordance and gives the catalog its own active state highlighting.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded hex colors in Button | CSS vars (`--t-primary` etc.) | Phase 5 (completed 2026-06-06) | Colors now follow theme at runtime |
| `size?: 'sm' \| 'md'` | Will become `'xs' \| 'sm' \| 'md' \| 'lg'` | Phase 8 | Additive — existing values remain |

**Current status of Button:** Supports 6 variants, 2 sizes, isLoading, disabled, as="label". No icon props, no ghost/outline, no pill. This is the baseline to extend.

---

## Sources

### Primary (HIGH confidence — codebase verified)
- `components/ui.tsx` lines 1-107 — Button component complete implementation, confirmed inline style pattern and isHovered state
- `lib/themes.ts` — `applyTheme()` function, all 12 `--t-*` CSS variables verified
- `index.css` — `--t-*` default values verified
- `components/NavMenu.tsx` lines 192-202 — `isFederationAdmin` NavItem pattern verified
- `components/AppRouter.tsx` — switch/case view routing pattern verified, `renderProtected` pattern verified
- `components/LazyComponents.tsx` — lazy export pattern verified
- `components/menuConfig.ts` — confirmed catalog must NOT go here (adminMenu covers all admin roles)
- `types.ts` line 517 — View union verified, confirmed `'button-catalog'` not present
- `package.json` — `"lint": "tsc --noEmit"` verified
- `.planning/config.json` — `nyquist_validation: false` confirmed

### Secondary (MEDIUM confidence)
- Grep across `components/**/*.tsx` — 449 Button usages counted, all `className="!p-*"` pattern identified
- `color-mix` usage already present in existing Button danger/success/info/warning hover styles — confirms browser support is already committed

### Tertiary (LOW confidence)
- Ghost/outline inline style approach — derived from existing codebase pattern, not from external documentation

---

## Metadata

**Confidence breakdown:**
- Existing Button API audit: HIGH — verified by reading ui.tsx and grepping ~450 usages
- AppRouter/NavMenu wiring patterns: HIGH — verified by reading source files
- CSS vars completeness: HIGH — verified from lib/themes.ts applyTheme()
- Ghost/outline inline style approach: MEDIUM — logically derived from existing pattern, not from official docs
- ConfirmButton state machine: MEDIUM — standard React pattern, derived from requirements

**Research date:** 2026-06-09
**Valid until:** Stable (pure codebase knowledge — no external dependencies to go stale)
