# Breadcrumb Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken back button (always goes to Dashboard) with a working breadcrumb bar that shows the real navigation history and lets users jump to any prior step.

**Architecture:** `NavigationContext` already maintains a `history: HistoryEntry[]` stack — we just need to expose it + add `jumpToHistory(index)`. `Header.tsx` reads the full stack and renders `← | Sportivi › Profil Sportiv › Plăți` where every crumb is clickable. Sidebar clicks still call `navigateRoot()` which clears history, so breadcrumb resets naturally.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, internal `components/ui.tsx` design system, `contexts/NavigationContext.tsx`

---

## File Map

| File | Change |
|------|--------|
| `contexts/NavigationContext.tsx` | Add `history`, `jumpToHistory` to context type + implementation |
| `components/Header.tsx` | Replace back-btn+title with breadcrumb component; use `goBack()` not `onBack` prop |

No new files. No changes to `types.ts`, `AppLayout.tsx`, `Sidebar.tsx`, or any other file.

---

### Task 1: Expose `history` and `jumpToHistory` from NavigationContext

**Files:**
- Modify: `contexts/NavigationContext.tsx`

- [ ] **Step 1: Add `history` and `jumpToHistory` to the context interface**

In `contexts/NavigationContext.tsx`, update `NavigationContextType`:

```typescript
interface NavigationContextType {
    activeView: View;
    setActiveView: (view: View) => void;
    viewParams: any;
    setViewParams: (params: any) => void;
    navigateTo: (view: View, params?: any) => void;
    /** Navigare din sidebar/meniu principal — golește history */
    navigateRoot: (view: View) => void;
    /** Mergi înapoi la ecranul anterior */
    goBack: () => void;
    canGoBack: boolean;
    previousView: View | null;
    /** Stack complet de navigare (fără intrarea curentă) */
    history: HistoryEntry[];
    /** Sare la o intrare specifică din history și curăță intrările de deasupra */
    jumpToHistory: (index: number) => void;
}
```

- [ ] **Step 2: Implement `jumpToHistory` inside the provider**

After the existing `goBack` callback, add:

```typescript
const jumpToHistory = useCallback((index: number) => {
    if (index < 0 || index >= history.length) return;
    const entry = history[index];
    setHistory(prev => prev.slice(0, index));
    setStoredView(entry.view);
    setViewParams(entry.params);
}, [history, setStoredView]);
```

- [ ] **Step 3: Expose `history` and `jumpToHistory` in the context value**

Update the `NavigationContext.Provider` value prop:

```typescript
<NavigationContext.Provider value={{
    activeView, setActiveView, viewParams, setViewParams,
    navigateTo, navigateRoot, goBack, canGoBack, previousView,
    history, jumpToHistory,
}}>
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```powershell
npx tsc --noEmit 2>&1 | Select-String "NavigationContext|Header"
```

Expected: no errors related to these files.

- [ ] **Step 5: Commit**

```bash
git add contexts/NavigationContext.tsx
git commit -m "feat(nav): expose history array and jumpToHistory in NavigationContext"
```

---

### Task 2: Replace Header back-button with breadcrumb

**Files:**
- Modify: `components/Header.tsx`

The breadcrumb rules:
- **Root view** (`dashboard`, `my-portal`, `federation-dashboard`, `admin-dashboard`): no `←`, no breadcrumb, just title + "Online" badge
- **1 level deep, no history** (e.g. navigated via sidebar → `navigateRoot`): no `←`, no crumbs, just title
- **Has history (`canGoBack`)**: show `←` button + `Crumb1 › Crumb2 › CurrentPage`
- **Truncation**: if `history.length > 2`, show `history[0] › … › history[last] › current` (ellipsis in the middle)
- `←` calls `goBack()` from context (not `onBack` prop)
- Each history crumb calls `jumpToHistory(i)`
- Crumbs with no title in `VIEW_TITLES` are skipped (filtered out)

- [ ] **Step 1: Update imports and destructuring**

Replace the existing `useNavigation` destructure:

```typescript
const { activeView, setActiveView, canGoBack, previousView, history, goBack, jumpToHistory } = useNavigation();
```

Remove `previousView` usage (no longer needed — we use the full `history` array).

- [ ] **Step 2: Build the breadcrumb items array**

Add this derived data block inside the component (after the `useNavigation` line):

```typescript
const isRootView = ROOT_VIEWS.includes(activeView);
const pageTitle = VIEW_TITLES[activeView] || activeView;

// Build displayable crumbs from history (filter entries with no known title)
const namedHistory = history
    .map((entry, idx) => ({ title: VIEW_TITLES[entry.view], idx }))
    .filter(e => !!e.title) as { title: string; idx: number }[];

// Truncate: show first + ellipsis + last when more than 2 named history entries
let visibleCrumbs: ({ title: string; idx: number } | { title: '…'; idx: -1 })[];
if (namedHistory.length <= 2) {
    visibleCrumbs = namedHistory;
} else {
    visibleCrumbs = [
        namedHistory[0],
        { title: '…', idx: -1 },
        namedHistory[namedHistory.length - 1],
    ];
}
```

- [ ] **Step 3: Replace the left-side header JSX**

Replace the existing `header-left` div content (from the hamburger button down to the closing `</div>` of the page title block) with:

```tsx
{/* Left: Hamburger (mobile) + Back Button + Breadcrumb */}
<div className="flex items-center gap-2 flex-shrink-0 min-w-0">
    {onOpenMobileSidebar && (
        <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            onClick={onOpenMobileSidebar}
            aria-label="Deschide meniu"
        >
            <Bars3Icon className="w-5 h-5" />
        </button>
    )}

    {canGoBack && (
        <Button
            onClick={goBack}
            variant="secondary"
            size="sm"
            className="!px-2.5 !py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm flex items-center shrink-0"
            title="Înapoi"
        >
            <ArrowLeftIcon className="w-4 h-4" />
        </Button>
    )}

    {/* Breadcrumb */}
    <nav className="flex items-center gap-1 min-w-0" aria-label="Navigare">
        {canGoBack && visibleCrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
                {crumb.idx >= 0 ? (
                    <button
                        onClick={() => jumpToHistory(crumb.idx)}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-1 py-0.5 rounded hover:bg-slate-800 whitespace-nowrap shrink-0"
                        title={`Înapoi la ${crumb.title}`}
                    >
                        {crumb.title}
                    </button>
                ) : (
                    <span className="text-xs text-slate-600 shrink-0">…</span>
                )}
                <span className="text-slate-600 text-xs shrink-0">›</span>
            </React.Fragment>
        ))}

        <h1 className="font-bold text-white tracking-tight text-sm md:text-base truncate">
            {pageTitle}
        </h1>

        {isRootView && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 ml-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
            </span>
        )}
    </nav>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```powershell
npx tsc --noEmit 2>&1 | Select-String "Header"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx
git commit -m "feat(nav): replace back button with full breadcrumb using NavigationContext history"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start dev server**

```powershell
npm run dev
```

- [ ] **Step 2: Test scenario — root view**

Navigate to Dashboard. Verify: no `←` button, no breadcrumb crumbs, "Online" badge visible.

- [ ] **Step 3: Test scenario — sidebar click**

Click "Sportivi" in sidebar. Verify: no `←` (navigateRoot cleared history), title = "Sportivi".

- [ ] **Step 4: Test scenario — drill down**

From Sportivi, click a sportiv to open profile. Verify: `←` appears, breadcrumb shows `Sportivi › Profil Sportiv`. Click `←` → goes back to Sportivi list, not Dashboard.

- [ ] **Step 5: Test scenario — 3 levels**

Sportivi → Profil Sportiv → navigate to a 3rd level if available. Verify breadcrumb shows correct path. Click a crumb in the middle → jumps to that view, clears history above it.

- [ ] **Step 6: Test scenario — role switcher**

Switch role from UserMenu. Verify breadcrumb doesn't break (navigateRoot is called on role switch per existing App.tsx logic — confirm history clears).

- [ ] **Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix(nav): breadcrumb edge cases from manual testing"
```
