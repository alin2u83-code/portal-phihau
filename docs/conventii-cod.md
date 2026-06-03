# Convenții de Cod

## Limbă

- **Română** pentru: denumiri DB (coloane, tabele), variabile de domeniu, mesaje UI, comentarii
- **Engleză** pentru: nume hooks (`usePermissions`), tipuri generice, patternuri tehnice
- Fișierele se numesc în engleză sau română hibrid (`PlatiScadente.tsx`, `usePermissions.ts`)

## TypeScript

- Toate tipurile domeniului în `types.ts` la rădăcina proiectului — fișier unic de referință
- Tipuri organizate pe domenii cu comentarii separator `// --- Domain: X ---`
- `View` = string union din toate view-urile posibile (definit în `types.ts`)
- `FilteredData` = structura datelor globale din DataContext

## Componente React

- Componente funcționale cu hooks
- Fiecare modul major are folder propriu: `Competitii/`, `Grupe/`, `SportivDashboard/`
- `ui.tsx` = design system intern — **folosit întotdeauna** pentru elemente comune (Button, Modal, Card, Badge)
- Nu se importă biblioteci UI externe (nu Shadcn, nu MUI) — totul în `ui.tsx`

## Stilizare

- **Tailwind CSS exclusiv** — fără CSS modules, fără styled-components
- `tailwind-merge` pentru clase condiționale: `cn(...)` din `clsx`
- Breakpoints responsive: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Componente mobile-first — tabele cu `min-w-[480px]` wrapped în `overflow-x-auto`
- Touch targets: minim `min-h-[44px]` pe butoane interactive

## State management

- **React Query** pentru date de server (fetch, cache, invalidate)
- **Zustand** (`useAppStore`) pentru state UI global (sidebar expanded etc.)
- **useState** local pentru state componentă
- **DataContext** pentru date globale frecvent accesate — nu re-fetch per componentă

## Supabase / DB

- Clientul Supabase folosit direct în hooks și services — nu există layer intermediar REST
- RLS aplică securitatea — nu verifica permisiuni în cod dacă RLS le acoperă
- Migrații în `sql/migrations/` cu prefix dată: `2026-05-XX-descriere.sql`
- Politici RLS în `sql/rls/`

## Convenții naming

| Tip | Convenție | Exemplu |
|-----|-----------|---------|
| Componente | PascalCase | `SportivFormModal.tsx` |
| Hooks | camelCase cu `use` prefix | `usePermissions.ts` |
| Services | camelCase | `ragService.ts` |
| Tipuri TS | PascalCase | `InscriereExamen` |
| Coloane DB | snake_case română | `data_nasterii`, `grad_actual_id` |
| Tabele DB | snake_case plural | `sesiuni_examene`, `inscrieri_examene` |
| Views DB | snake_case | `vedere_prezenta_sportiv` |

## Gestionare erori

- `react-hot-toast` pentru notificări utilizator (success/error)
- `ErrorBoundary.tsx` la nivel aplicație
- `ErrorProvider.tsx` pentru erori globale cu context
- `SystemGuardian.tsx` — wrapper root care prinde stări critice de loading/error

## Lazy loading

`LazyComponents.tsx` — componentele mari sunt importate lazy cu `React.lazy()` pentru bundle splitting.
