# CONVENTIONS.md — Portal PhiHau

**Mapped:** 2026-06-04 | **Focus:** quality/conventions

---

## Language

- **Domain** (DB, UI, variables, comments): română
- **Technical** (hooks, patterns, types, services): engleză

## TypeScript

- Strict mode: **disabled** — permite tipuri flexibile
- Toate tipurile centralizate în `types.ts` (rădăcina proiectului)
- Fișier unic de referință — nu se creează fișiere de tipuri separate
- Import tipuri: `import type { X } from '../types'`

## Naming

| Construct | Convention | Exemplu |
|---|---|---|
| Componente React | PascalCase | `SportivCard.tsx` |
| Hooks | camelCase cu prefix `use` | `usePermissions`, `useAuth` |
| Servicii | camelCase cu sufix `Service` | `sportiviService` |
| Fișiere servicii | camelCase | `sportiviService.ts` |
| Variabile/funcții | camelCase | `activeRoleContext` |
| Constante | SCREAMING_SNAKE sau camelCase | depinde de context |
| Tabele DB | snake_case | `sportivi`, `orar_saptamanal` |

## Component Structure

```tsx
// 1. Imports
// 2. Types/interfaces locale (dacă nu sunt în types.ts)
// 3. Componenta principală
// 4. Sub-componente (în același fișier dacă mici)
```

Componente mari se împart în foldere: `Sportivi/`, `SportivDashboard/`, `Competitii/`

## State Management

| Tip | Tool |
|---|---|
| Server state | React Query v5 (`useQuery`, `useMutation`) |
| UI state global | Zustand (`useAppStore`) |
| Navigation | `NavigationContext` — `activeView` string, SPA fără URL routing |
| Date globale | `DataContext` |
| Erori globale | `ErrorProvider` |
| Auth | `useAuth` hook |

## Permissions Pattern

```tsx
const { canEdit, canView } = usePermissions(activeRoleContext);
// Nu duplica logica — usePermissions e sursa unică
```

## Supabase Client

`supabaseClient.ts` injectează `active-role-context-id` header în toate requesturile. Nu importa supabase direct în componente — folosește serviciile.

## Error Handling

- `ErrorBoundary` la nivel de pagină
- `ErrorProvider` + context pentru erori aplicație
- Servicii returnează `{ data, error }` — nu throw
- Erori UI: componenta `ui.tsx` → `Alert`, `ErrorState`

## UI / Styling

- Design system intern: `components/ui.tsx` — **nu** Shadcn, **nu** MUI
- Tailwind CSS — clase utilitare direct în JSX
- Responsive: breakpoints Tailwind (`sm:`, `md:`, `lg:`)
- Niciun fișier CSS separat — tot în Tailwind

## Lazy Loading

```tsx
// LazyComponents.tsx — barrel file pentru toate componentele lazy
const Sportivi = React.lazy(() => import('./Sportivi/Sportivi'));
```

## No Linting / Formatting Tools

Formatare manuală. Nu există ESLint/Prettier configurate.
