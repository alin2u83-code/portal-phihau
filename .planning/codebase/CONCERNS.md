# CONCERNS.md — portal-phihau Technical Concerns
*Generated: 2026-06-05*

## 1. Security

### Critical
- **32 SELECT policies use `USING (true)`** — all club-level filtering delegated to JS layer; RLS is not a hard row-level security gate for most tables
- **3 debug routes without role guards** in AppRouter: `backdoor-check`, `backdoor-test`, `debug-page` — accessible in production to any authenticated user
- **`el.innerHTML` injection** in `components/Plati/FacturaChitantaModal.tsx:74` — no sanitization, XSS risk if any user-controlled data flows through

### Moderate
- xlsx 0.18.5 (SheetJS community edition) is unmaintained and accepts user file uploads — known CVEs in old versions

## 2. Performance

### Critical
- **`components/Competitii/index.tsx` is 3,965 lines** — single god component handling 8+ features, 30+ useState, 20+ useEffect
- **Zero `React.memo` usage** across 90+ component files — no memoization anywhere

### High
- **`hooks/useDataProvider.ts` bulk-fetches 20+ tables with no pagination/LIMIT** — plati, tranzactii, vizualizarePlati, sportivi all loaded in full
- `useSportivi` and `usePlati` have no `staleTime` — refetch on every focus

### Moderate
- `varsteCompetitie` useMemo in InscriereClubWizard/index.tsx iterates all categories from 0–80 producing large number arrays

## 3. Data Integrity

### Known Bugs
- **`PlatiScadente.tsx:171,198` — explicit `Bug 4 TODO`** — invoices never apply discount policies from `politici_reducere` table
- Competitii mutations bypass React Query (direct supabase calls + local `fetchData()`) — React Query cache never invalidated after competition mutations

### Risks
- **Dual cache system** (localStorage cache.ts + React Query) with documented fragile ordering at `GrupaDetailView.tsx:64`
- **118 `as any` casts** disabling TypeScript type checks on Supabase join results
- Wizard state (9 useState in InscriereClubWizard/index.tsx orchestrator) has no central store — stale closure risk when Pas4Sumar reads state

## 4. Architecture Debt

- **`types.ts` is 723 lines** single-file — convention already broken by `InscriereClubWizard/types.ts`
- **AppRouter is 58-case switch** — two-file registration burden per new view (AppRouter.tsx + Sidebar.tsx)
- Competitii/index.tsx is a god component — needs splitting into CompetitieList, CompetitieDetail, InscrieriTab, etc.
- `myClubId = currentUser?.club_id` pattern in Competitii/index.tsx — if admin has no sportiv profile, club_id is undefined → empty sportivi list

## 5. Missing / Incomplete Features

- **`program_competitie` table** exists in DB but no UI (Phase 3 not started per roadmap)
- **SMS providers** Twilio and Vonage referenced in config but NOT implemented (only AndroidGateway + SMSLink are wired)
- Web Push notifications (Supabase Edge Function exists) — no frontend UI to manage subscriptions

## 6. Mobile / Responsive Gaps

Components with `hidden md:block` on core content and no mobile alternative:
- `PlatiScadente.tsx` — aging/debt table hidden on mobile
- `RaportFinanciar.tsx` — charts and tables
- `Familii.tsx` — family management table
- `AgingReport` — entirely desktop-only

## 7. Code Quality

- 118 `as any` casts across codebase
- No linting (eslint not configured), no formatting (prettier not configured)
- No test files — zero test coverage
- Several `console.warn` / `console.log` left in production code (useDataProvider fallback warnings)
