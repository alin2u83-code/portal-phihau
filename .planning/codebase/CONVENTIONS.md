# Coding Conventions

**Analysis Date:** 2026-06-05

## Language Split

**Romanian** — domain layer: DB table names, UI labels, variable names for domain concepts, comments about business logic.
Examples: `sportivi`, `grupe`, `plati`, `activeRoleContext`, `vizibilitate`, `grad_actual_id`

**English** — technical layer: hooks, patterns, services, utility functions, React state names.
Examples: `usePermissions`, `useQuery`, `navigateTo`, `queryKey`, `staleTime`, `fetchError`

Mixed is common at the boundary — e.g. `useGrupe` (English prefix, Romanian concept).

## Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| React components | PascalCase | `SportivCard.tsx`, `GrupeManagement` |
| Hooks | camelCase with `use` prefix | `usePermissions`, `useGrupe`, `useNavigation` |
| Services (files) | camelCase with `Service` suffix | `sportivService.ts`, `ragService.ts` |
| Service functions | camelCase, domain-verb | `adaugaSportiv`, `actualizeazaSportiv` |
| DB tables | snake_case | `sportivi`, `orar_saptamanal`, `istoric_grade` |
| DB columns | snake_case | `grad_actual_id`, `club_id`, `data_obtinere` |
| Context files | PascalCase + `Context` suffix | `NavigationContext.tsx`, `DataContext.tsx` |
| Types | PascalCase | `Sportiv`, `Grupa`, `Permissions`, `View` |
| Constants | SCREAMING_SNAKE_CASE | `DEBUTANT_GRAD_ID`, `MAX_HISTORY` |
| Utility functions | camelCase | `getCachedData`, `setCachedData` |

## TypeScript

- **Strict mode: disabled** — `any` is used freely for `activeRoleContext`, `permissions`, `userRoles`
- **All types centralized** in `types.ts` at project root — single source of truth
- Import types with: `import type { X } from '../types'` or `import { X } from '../types'`
- Do NOT create separate type files; extend `types.ts`
- `View` type is a string union of all view names (SPA navigation keys)

## Component Structure

Components are organized as:
- Single file for simple components: `components/SportivCard.tsx`
- Subdirectory for complex modules: `components/Competitii/`, `components/Grupe/`, `components/Plati/`
- Entry point in subdirectory: `components/Grupe/index.tsx` or `components/Grupe/Grupe.tsx`
- Named exports preferred: `export const Grupe: React.FC = ...`

Typical component file order:
1. Imports (React, types, hooks, services, ui components)
2. Interface/type declarations (local, not in types.ts unless reused)
3. Component function with `React.FC` or `React.FC<Props>`
4. Hook calls at top
5. Handler functions
6. Return JSX using `components/ui.tsx` primitives

## Service Pattern

All service functions return `{ success, data?, error? }` — never throw to caller.

```typescript
// Correct pattern — sportivService.ts
export const adaugaSportiv = async (formData: Partial<Sportiv>): Promise<{ success: boolean; data?: Sportiv; error?: any }> => {
    try {
        const { data, error } = await supabase.from('sportivi').insert(...).select(...).single();
        if (error) throw error;
        return { success: true, data: data as Sportiv };
    } catch (error) {
        return { success: false, error };
    }
};
```

Services always import `supabase` from `../supabaseClient` — never create a new client.

## State Management

| Type | Tool | When to use |
|------|------|-------------|
| Server/DB data | React Query v5 (`useQuery`, `useMutation`) | Any data fetched from Supabase |
| Navigation | `NavigationContext` (`navigateTo`, `navigateRoot`, `goBack`) | All view changes |
| Global app data | `DataContext` (`useData()`) | Shared lists: sportivi, grupe, plati, etc. |
| Global UI state | Zustand `useAppStore` (`src/store/useAppStore.ts`) | Sidebar expanded, AI widget open, etc. |
| Auth/session | `useAuth()` hook | Current user, session, logout |
| Local component state | `useState` | Form inputs, modal open/close, temp values |

## Navigation Pattern

**Never use browser URL routing for views.** All navigation goes through `NavigationContext`.

```typescript
// Correct
const { navigateTo, navigateRoot, goBack } = useNavigation();
navigateTo('profil-sportiv', { sportiviId: id });  // push to history (drill-down)
navigateRoot('dashboard');                           // clear history (sidebar click)
goBack();                                            // pop history (back button)
```

- `navigateTo` — for drill-down (pushes to 15-entry history stack)
- `navigateRoot` — for sidebar menu clicks (resets history)
- `goBack` — for back button
- View names are `View` type strings from `types.ts` (e.g., `'sportivi'`, `'grupe'`, `'competitii'`)

## Lazy Loading

All major components are registered in `components/LazyComponents.tsx` via `React.lazy()`.

```typescript
// In LazyComponents.tsx
export const GrupeManagement = lazy(() => import('./Grupe').then(m => ({ default: m.Grupe })));

// In AppRouter.tsx — wrapped with Suspense
import * as Lazy from './LazyComponents';
<Suspense fallback={<MartialArtsSkeleton />}>
  <Lazy.GrupeManagement ... />
</Suspense>
```

New major views MUST be added to `components/LazyComponents.tsx` first, then referenced in `components/AppRouter.tsx`.

## UI / Styling

- **Only use `components/ui.tsx`** for UI primitives: `Button`, `Card`, `Modal`, `Input`, `Alert`, `Badge`, etc.
- No Shadcn, no MUI, no external component libraries
- Tailwind CSS classes directly in JSX — no separate CSS files
- Responsive breakpoints: `sm:`, `md:`, `lg:` Tailwind prefixes
- `clsx` and `tailwind-merge` for conditional class names

```typescript
// Correct
import { Button, Card, Modal, Input } from '../ui';
<Card className="p-4 bg-white">
  <Button variant="primary" onClick={...}>Salvează</Button>
</Card>
```

## Permissions Pattern

```typescript
// Always derive permissions from activeRoleContext
const permissions = usePermissions(activeRoleContext);

// Use permissions for UI visibility
if (!permissions.canManageFinances) return null;
if (permissions.isFederationAdmin) { /* show all clubs */ }

// For club-scoped data filtering
const clubId = permissions.isFederationAdmin ? undefined : activeRoleContext?.club_id;
```

Do not duplicate permission logic — `hooks/usePermissions.ts` is the single source.
RLS policies in Supabase enforce security; frontend permissions are UX only.

## Supabase Client

```typescript
// Always import from supabaseClient.ts
import { supabase } from '../supabaseClient';

// Never create a new client
// WRONG: const client = createClient(url, key);
```

The client at `supabaseClient.ts` automatically injects `active-role-context-id` header from localStorage into every request. This header is required for RLS policies to function correctly.

## React Query Patterns

```typescript
// Standard hook with contextId guard
return useQuery<Grupa[], Error>({
    queryKey: ['grupe', contextId, clubId],
    enabled: !!contextId,       // wait until role context is selected
    queryFn: async () => {
        const { data, error } = await supabase.from('grupe').select('...');
        if (error) throw error;
        return data as Grupa[];
    },
    staleTime: 10 * 60 * 1000,  // 10 minutes for stable data
});

// Invalidate cache after mutations
queryClient.invalidateQueries({ queryKey: ['grupe'] });
```

- Always set `enabled: !!contextId` to avoid premature queries before role is selected
- Use `staleTime: 0` for empty results to allow re-fetch on next render (see `hooks/useGrupe.ts`)
- Data flows: hook → `DataContext` → components — do not fetch in components directly

## Error Handling

```typescript
// Service layer: catch and return error object (never throw)
try {
    ...
    return { success: true, data };
} catch (error) {
    return { success: false, error };
}

// Component layer: display via ErrorProvider
const { showError } = useError();
const result = await adaugaSportiv(formData);
if (!result.success) {
    showError('Eroare adăugare sportiv', result.error?.message);
}

// React render crashes: ErrorBoundary at page level
// Location: components/ErrorBoundary.tsx
```

## Import Order (observed pattern)

1. React and React hooks
2. External libraries (`motion/react`, `date-fns`, `lucide-react`)
3. Types from `../types`
4. Internal contexts and hooks (`../contexts/...`, `../hooks/...`)
5. Services (`../services/...`)
6. UI components (`./ui`, sibling components)

## Comments

- Business logic comments in Romanian: `// Asigură-te că sportivul are un grad`
- Technical comments in English: `// Check localStorage cache first`
- No JSDoc required — project has no linting enforcement
- TODOs and FIXMEs are present in codebase (see CONCERNS.md)

---

*Convention analysis: 2026-06-05*
