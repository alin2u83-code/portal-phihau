# Testing Patterns

**Analysis Date:** 2026-06-05

## Test Framework

**Runner:** None configured.

No test runner (Jest, Vitest, Playwright, Cypress) is present in `package.json` scripts or config files. No `jest.config.*`, `vitest.config.*`, or `cypress.config.*` exist.

**Test Files:** None found in the repository. The only `.test.` files are in `node_modules/react-easy-crop/helpers.test.d.ts` (type declaration from a dependency — not a project test).

**Run Commands:**
```bash
# No test commands available
# package.json scripts: dev, build, lint (tsc --noEmit), preview
```

## Test File Organization

No test files or `__tests__` directories exist in the project.

## What Is Tested

**Automated tests:** Nothing. Zero test coverage.

**Type checking:** `npm run lint` runs `tsc --noEmit` — this catches TypeScript type errors but is not a test suite.

## Current Testing Strategy

The project relies entirely on **manual testing**:
- Developer runs `npm run dev` and exercises features in the browser
- Role-based access tested by logging in with different accounts
- Data mutations verified visually in Supabase dashboard
- No regression safety net exists

## Risk Exposure

Because there are no automated tests, the following areas are entirely unprotected:

**High risk — business logic:**
- Permission calculations in `hooks/usePermissions.ts` — wrong role access is invisible until runtime
- Service functions in `services/sportivService.ts`, `services/sportivService.ts` — silent `{ success: false }` returns can go unnoticed
- Grade chain validation (DB SQL functions in `sql/`) — only tested via manual exam workflows
- Cache invalidation after mutations — stale data bugs are hard to reproduce

**High risk — financial:**
- Invoice generation and payment recording in `components/Plati/`
- Subscription type calculations in `components/Plati/TipuriAbonament.tsx`
- Annual fees aggregation in `components/Plati/TaxeAnuale.tsx`

**Medium risk — navigation/state:**
- Navigation history stack in `contexts/NavigationContext.tsx` (15-entry limit, back button behavior)
- DataContext filtering by `visibleClubIds` — a bug here leaks cross-club data

**Medium risk — integrations:**
- Supabase RLS header injection in `supabaseClient.ts` — if the header is missing, queries silently return empty data
- Import flows in `services/importSportiviService.ts` — CSV/Excel parsing edge cases

## Recommendations

If testing is introduced, prioritize in this order:

**1. Unit tests for pure logic (highest ROI):**
- `hooks/usePermissions.ts` — pure function, easy to test all role combinations
- `services/sportivService.ts` — mock Supabase client, test return shape
- `supabaseClient.ts` header injection — mock fetch, verify header presence
- Navigation history logic in `contexts/NavigationContext.tsx`

**2. Integration tests for critical flows:**
- Login → role selection → data visible per club (multi-role scenario)
- Adding a sportiv → cache invalidated → list updated
- Invoice creation → payment recorded → balance updated

**3. Recommended framework:**
- **Vitest** — zero-config with Vite, same module resolution, fast
- **@testing-library/react** — for component behavior tests
- Add to `package.json`: `"test": "vitest"`, `"test:ui": "vitest --ui"`

**4. Test file placement convention (proposed):**
- Co-located: `hooks/usePermissions.test.ts` next to `hooks/usePermissions.ts`
- Or separate: `tests/unit/`, `tests/integration/`

**5. Minimum viable test suite (proposed ~10 tests):**
- `usePermissions` with all 4 role types
- `supabaseClient` header injection
- `NavigationContext` push/pop/clear history
- `sportivService.adaugaSportiv` success + error paths
- `DataContext` club filtering (visibleClubIds)

---

*Testing analysis: 2026-06-05*
