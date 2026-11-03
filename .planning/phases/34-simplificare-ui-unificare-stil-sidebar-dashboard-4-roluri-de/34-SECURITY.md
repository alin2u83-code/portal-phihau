---
phase: 34
slug: simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
status: verified
threats_open: 0
asvs_level: 1
created: 2026-11-03
---

# Phase 34 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 34 is UI-only (menuConfig, sidebar, header/user menu, hub tabs, dashboards, plati-hub tabs, token restyle).
> Audit range: baseline `ab2984d` (last commit before phase 34 work) .. `HEAD` `2f14fe1`.
> Register source: `<threat_model>` block of each of the 15 PLAN.md files (register authored at plan time).
> Rows: 51 (39 unique IDs; `T-34-SC` is the same row repeated in plans 01-13). Mitigate: 25 · Accept: 26 · Transfer: 0.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Menu/hub visibility -> AppRouter guards | `menuConfig` `requires`, `HubTabs` `minRole`, `PlatiHub` tab filtering only HIDE entries; the real gate is `renderProtected(...)` in `components/AppRouter.tsx` plus Supabase RLS | view name (string), role booleans from `usePermissions` |
| localStorage -> app state | `qkd_nav_recent_<userId>` (Recente), `phi-hau-active-view` can be tampered by the user | view-name strings, rendered as escaped JSX text, navigated through AppRouter |
| NavigationContext `viewParams` -> PlatiHub | `viewParams.tab` / `viewParams.sectiune` are caller-controlled | tab/sectiune strings, validated by `esteTabHub` / `esteSectiuneHub` |
| Browser -> Supabase (new count query) | `AdminMasterMap` counts `cereri_inregistrare` for federation only | row count (head request, no row data) |
| Test runner -> real test account | `tests/ui_faza34_shell.spec.ts` logs into the portal with a real account | `TEST_EMAIL` / `TEST_PASSWORD` from env, screenshots |
| npm supply chain | No dependency added by phase 34 | n/a |

---

## Threat Register

Status: closed = mitigation found in code (or accepted risk re-verified and logged). Evidence is `file:line` at `HEAD`.

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|-----------------------|--------|
| T-34-01-01 | Tampering | StatCard/Card consumers (ui.tsx) | mitigate | Props API unchanged: `git diff ab2984d HEAD -- components/ui.tsx` shows only a default removal in StatCard destructuring (`accentColor = 'amber'` -> `accentColor`), `StatCardProps` untouched. `npx tsc --noEmit` = 0 `error TS` (baseline `34-TSC-BASELINE.txt` is empty = 0). | closed |
| T-34-01-02 | Elevation of Privilege | n/a | accept | AR-34-01. ui.tsx diff contains no `permission`/`isAdmin`/`renderProtected` tokens. | closed |
| T-34-02-01 | Elevation of Privilege | menuConfig `requires` / NavMenu | mitigate | `requires` is a UI-only hint: `components/menuConfig.ts:24-25`; filter `components/NavMenu.tsx:52` (`!s.requires \|\| permissions?.[s.requires]`, fails closed when `permissions` undefined). No route removed: `tests/ui_faza34_menu_parity.ts` Test 4/4b = OK for 62 legacy views present in `AppRouter.tsx`. All guards still in place (`AppRouter.tsx:148-150`, `:203`, `:216-218`, `:244`, `:303`, `:341`). | closed |
| T-34-02-02 | Information Disclosure | Admin Dashboard / Button Catalog / Jurnal Audit in menu | mitigate | `menuConfig.ts:65` Admin Dashboard `requires: 'isFederationAdmin'`; `menuConfig.ts:66` Button Catalog `requires: 'isSuperAdmin'` (tighter than baseline, where both were under `isFederationAdmin`, `NavMenu.tsx` baseline :197-211). Jurnal Audit stays in adminMenu (`menuConfig.ts:64`) and router guard `AppRouter.tsx:203` `permissions.isSuperAdmin`. Router guards `admin-dashboard` `AppRouter.tsx:217-218` `isFederationAdmin`, `button-catalog` `AppRouter.tsx:340-341` `isFederationAdmin` (unchanged vs baseline). | closed |
| T-34-02-03 | Tampering | localStorage `qkd_nav_recent_<userId>` | accept | AR-02. Re-verified: `QuickAccess.tsx:27` renders `{labelMap[view] \|\| view}` as JSX text (no `dangerouslySetInnerHTML`/`innerHTML` in any phase 34 file); click -> `onNavigate(view)` -> AppRouter switch with `renderProtected`; hook guards non-array (`useQuickAccess.ts` `Array.isArray(prev)`). | closed |
| T-34-02-04 | Denial of Service | Sidebar/BottomNav layout | mitigate | `AppLayout.tsx:84` `pb-24` below lg; `BottomNav.tsx:66` `lg:hidden fixed bottom-0`; footer `hidden lg:flex` (`AppLayout.tsx:114`). `tests/ui_faza34_shell.spec.ts:77-82` asserts 4 buttons >= 44px, footer hidden, no horizontal scroll at 390x844. UAT 34 tests 6 and 8 pass (human, 2026-11-03). | closed |
| T-34-03-01 | Information Disclosure | "Istoric Activitate" in UserMenu | mitigate | `components/UserMenu.tsx:143-144` rendered only under `permissions?.hasAdminAccess`; `hasAdminAccess = isFederationAdmin \|\| isAdminClub \|\| isInstructor` (`hooks/usePermissions.ts:38`) is the same set as `isAtLeastInstructor`, router guard `AppRouter.tsx:200-201`. | closed |
| T-34-03-02 | Elevation of Privilege | "Protectia datelor" for all roles | accept | AR-03. `AppRouter.tsx:208-210` has no `renderProtected` by design (D-15); lines untouched by phase 34 diff; `UserMenu.tsx:142` unconditional. | closed |
| T-34-04-01 | Elevation of Privilege | HubTabs tab visibility | mitigate | `HubTabs.tsx:78-88` filters only with the two booleans `isAtLeastInstructor` / `isAtLeastClubAdmin`, computed in `AppRouter.tsx:152-154` (same expressions as the guards). Template Probe `minRole: 'clubAdmin'` (`HubTabs.tsx:55`) matches router guard `AppRouter.tsx:248` (isFederationAdmin \|\| isSuperAdmin \|\| isAdminClub == `isAtLeastClubAdmin`). Every `minRole: 'clubAdmin'` tab (sportivi hub) maps to a router guard of `isAtLeastClubAdmin` (`:197,:199,:205,:207,:212`) or looser. Forced navigation still hits `renderProtected`. | closed |
| T-34-04-02 | Denial of Service | Layout bottom nav | mitigate | Same evidence as T-34-02-04 (`AppLayout.tsx:84`, spec asserts, UAT). | closed |
| T-34-05-01 | Information Disclosure | Count `cereri_inregistrare` for federation | mitigate | `components/AdminMasterMap.tsx:72-79`: `if (!permissions.isFederationAdmin) return;` then `.select('id', { count: 'exact', head: true }).eq('status','in_asteptare')`, `.then(({count,error}) => setCereriNoi(error ? 0 : (count ?? 0)))`. Only data-access addition in the whole phase diff (grep of `supabase\|.from(\|await\|.rpc(\|.insert\|.update\|.delete\|.upsert` over +/- lines = this one query). RLS on the table is external (see Not Verified). | closed |
| T-34-05-02 | Elevation of Privilege | Quick actions / Recente buttons | mitigate | `AdminMasterMap.tsx:24-39` action list per role; every target is guarded in AppRouter for that role (`cluburi`/`deconturi-federatie`/`federation-dashboard` federation only; `prezenta`, `plati-hub` (canManageFinances), `sportivi` for club admin; `prezenta-instructor` (`AppRouter.tsx:263`, `isInstructor`), `grupe` for instructor). Click only calls `onNavigate`; no new permission logic. | closed |
| T-34-05-03 | Tampering | localStorage Recente | accept | AR-04. Same reasoning and evidence as T-34-02-03. | closed |
| T-34-06-01 | Elevation of Privilege | AdminDashboard | mitigate | `components/AdminDashboard.tsx:20-22` effect `if (!permissions.isFederationAdmin) onNavigate('dashboard')` (deps `:48`), render guard `:58`; router guard `AppRouter.tsx:217-218`. Phase diff on AdminDashboard has no changed line with `isFederationAdmin`/`usePermissions`/`useEffect`/`supabase`. | closed |
| T-34-06-02 | Information Disclosure | Removed navigation accordions | accept | AR-05. AdminDashboard/Federation panels diff: only buttons/markup removed; no `supabase`/`.from(`/`useQuery`/`fetch` added. | closed |
| T-34-07-01 | Elevation of Privilege | Own-profile-only blocks | mitigate | `components/SportivDashboard/index.tsx:59` (from `useDashboardPermissions`, file untouched), `:143` effect guard, `:290`, `:491` TrainingActionCard block, `:526` "Vezi detalii plati", `:546` "Istoric prezente", `:558` passed to FamilieWidget. Removed hero CTA block (baseline :584) re-appears guarded at `:526`/`:546`. | closed |
| T-34-07-02 | Information Disclosure | Notificari Push relocated to Setari Cont | accept | AR-06. `AccountSettings.tsx` renders `<NotificationPermissionWidget />` (unchanged component, not in diffstat) on the current user's own page only. | closed |
| T-34-07-03 | Repudiation | handleStatusChange (anunt prezenta) | mitigate | Body of `handleStatusChange` (`SportivDashboard/index.tsx:171-`) is byte-identical to baseline (`diff` of the two function bodies = identical). `TrainingActionCard.tsx:24-34` `handleClick` and `disabled={loading \|\| !currentUser?.id}` (`:52`) unchanged; only `variant`/classes changed. | closed |
| T-34-08-01 | Tampering | FamilieWidget mutations | mitigate | `git diff ab2984d HEAD -- components/SportivDashboard/FamilieWidget.tsx` (-U0) has no line matching `supabase\|await\|.from(\|.rpc(\|async\|handle\|set[A-Z]\|useEffect\|useQuery\|useMutation`. | closed |
| T-34-09-01 | Tampering | Sportivi bulk actions | mitigate | `components/Sportivi/index.tsx:914-920`: `handleBulkStatusUpdate('Activ'\|'Inactiv')` and `setShowMutaGrupaModal(true)` handlers retained; only variants changed. Inactiv now additionally wrapped in `openConfirm(...)` (commit d3a527c, protective; `ConfirmModal` wired at `:1293-1300`). Diff of Sportivi files has no `supabase`/`await`/`.from(` change. | closed |
| T-34-09-02 | Elevation of Privilege | `permissions.hasAdminAccess` buttons | mitigate | `Sportivi/index.tsx:858` `{permissions.hasAdminAccess && (` (baseline :861, still the single occurrence, same condition); `SportiviTable`/`SportiviMobileList`/`SportiviFilter` diffs contain no permission/handler changes. Router guard `AppRouter.tsx:230` `isAtLeastInstructor`. | closed |
| T-34-10-01 | Tampering | PlatiScadente (sold/incasari) | mitigate | `git diff ab2984d HEAD -- components/Plati/PlatiScadente.tsx` (-U0): all changed lines are className/variant/markup; no sold computation, `supabase`, `await`, `set*(` change. `permissions.isAdminClub &&` guard on "Genereaza Abonamente" preserved. `PlatiHub.tsx` diff keeps `schimbaPozitie`/`handleIncaseazaMultiple`/`handleJurnalBack` logic. | closed |
| T-34-10-02 | Elevation of Privilege | canManageFinances guard | accept | AR-07. `AppRouter.tsx:286-303` `renderProtected(platiHubElement, canManageFinances)` intact; `canManageFinances = isFederationAdmin \|\| isAdminClub` (`usePermissions.ts:39`). | closed |
| T-34-11-01 | Tampering | AND filter logic | mitigate | `CompetitieFilterBar.tsx` diff: `toggleGen`, `setFiltre({probaId\|varstaMin\|varstaMax\|gradMin\|gradMax})`, `resetFiltre` bindings re-appear unchanged (only moved/re-indented); no hook/util file in `components/Competitii/` other than `index.tsx` and `CompetitieFilterBar.tsx` changed. | closed |
| T-34-11-02 | Elevation of Privilege | "Adauga Competitie" (`isAdmin`) | mitigate | `components/Competitii/index.tsx:664` `const isAdmin = permissions.isSuperAdmin \|\| permissions.isFederationAdmin`; `:747-749` `{isAdmin && (<Button ...> Adauga Competitie`; line was `{isAdmin && (` at baseline :744, unchanged. | closed |
| T-34-12-01 | Tampering | Prezenta / sesiuni examen | mitigate | Diff of `Grupe/index.tsx`, `GestiuneExamene/index.tsx`, `Prezenta/index.tsx`, `InstructorPrezentaPage.tsx`: no changed line with `supabase`/`await`/`.rpc`/`.from(`/`useQuery`/`useMutation`/handler logic; only Button `variant`/class/h1 changes. | closed |
| T-34-12-02 | Elevation of Privilege | `isReadOnly` in Examene | mitigate | `AppRouter.tsx:240-241` `isReadOnly={!permissions.canGradeStudents}` (untouched); `GestiuneExamene/index.tsx:247,269,441` `isReadOnly` checks (baseline :247,:270,:444, same conditions; file diff has no `isReadOnly` line). `AppRouter.tsx:263` instructor presence guard `permissions.isInstructor` untouched. | closed |
| T-34-13-01 | Information Disclosure | Test credentials / screenshots | mitigate | `tests/ui_faza34_shell.spec.ts:7-8` `process.env.TEST_EMAIL!` / `TEST_PASSWORD!`; `:28` skips when missing; grep for password/email/token literals in `tests/ui_faza34_*` finds only env reads and `.fill(TEST_PASSWORD)`. `.env`/`tests/.env` are gitignored (`.gitignore:11`), only `.env.example` tracked. `screens/` is untracked, never in git history (`git log --all -- screens` empty, no png in diff range). Screenshots show only the owner's own test account dashboard after login (password never on screen). | closed |
| T-34-13-02 | Tampering | Real club data | mitigate | `ui_faza34_shell.spec.ts:1-2` header "strict read-only"; actions are `goto`, login fill + "Intra in cont", role-context click, bottom-nav "Meniu" click; MFA never bypassed (`:46-50` `test.skip(mfa, 'MFA cerut: MFA nu se ocoleste')`). `ui_faza34_menu_parity.ts` only calls `readFileSync`/`readdirSync`. | closed |
| T-34-13-03 | Repudiation | Phase marked verified without a human | mitigate | `34-13-SUMMARY.md:25,101` "Status faza: asteapta verificare umana (nu marcata ca verificata)"; human UAT then recorded in `34-UAT.md` (status complete, 8 passed, user-reported gaps resolved and re-tested). | closed |
| T-34-14-01 | Elevation of Privilege | AppRouter: 4 views moved into plati-hub group | mitigate | `AppRouter.tsx:286-303` `case 'deconturi-federatie' / 'perioade-vacanta' / 'produse' / 'vanzari-produse'` share the group returning `renderProtected(platiHubElement, canManageFinances)`. Baseline guards for these 4 were `isAtLeastClubAdmin` (`ab2984d:AppRouter.tsx:308,330,353-354`); `canManageFinances = isFederationAdmin \|\| isAdminClub` (`usePermissions.ts:39`) == `isAtLeastClubAdmin` (`AppRouter.tsx:153`). INSTRUCTOR/SPORTIV still get `AccessDenied`. | closed |
| T-34-14-02 | Information Disclosure | Echipamente/Vanzari tabs visible to ADMIN_CLUB | accept | AR-08. Re-verified the stated reasoning: `PlatiHub.tsx:67` `poateVedeaEchipamente = permissions.isAdminClub`; tab strip filtered at `:154`; `rezolvaPozitieHub` falls back to `facturi/plati-scadente` when false (`platiHubConfig.ts:239-241`), covered by `platiHubConfig.test.ts` T22a-c (23 PASS, 0 FAIL when run). Data stays RLS-filtered per club; no new data path (`TabDeconturiEchipamente.tsx` passes the same props the router passed before). | closed |
| T-34-14-03 | Tampering | `viewParams.tab` / `sectiune` controllable | accept | AR-09. `platiHubConfig.ts:183-189` `esteTabHub` / `esteSectiuneHub` (`hasOwnProperty` on a closed map); `rezolvaPozitieHub` `:216-244` ignores unknown values (default `facturi/plati-scadente`) and re-applies `taxe-anuale` and echipamente gates after resolution; `PlatiHub.tsx:64-72`. Test T16 and T12 cover invalid input. | closed |
| T-34-14-SC | Tampering | npm/pip/cargo installs | accept | AR-10. `git diff ab2984d HEAD -- package.json package-lock.json` is empty; working tree clean for both; only non-relative imports added in phase code are `react`, `node:*`, `@playwright/test` (already a devDependency, `package.json:43`). | closed |
| T-34-15-01 | Elevation of Privilege | Stagii entry in instructor/admin/adminClub menus | accept | AR-11. Router guard `AppRouter.tsx:243-244` `isAdminClub \|\| isInstructor \|\| isFederationAdmin \|\| isSuperAdmin` untouched (no diff hunk); the entry is a link only (`menuConfig.ts:40,48,78,99`) shown to exactly the roles that could already see Stagii as a hub tab. | closed |
| T-34-15-02 | Denial of Service (hidden functionality) | Financiar submenu removal | mitigate | `npx tsx tests/ui_faza34_menu_parity.ts` run at audit: Tests 1, 2, 3b, 3, 4 (62 views), 4b all OK. Plati entry has no submenu and `ALIASES_PLATI` (`menuConfig.ts:33-37`) covers all 15 hub views including deconturi-federatie, perioade-vacanta, produse, vanzari-produse; Test 4b confirms the literals remain in `AppRouter.tsx`. | closed |
| T-34-15-03 | Information Disclosure | Card/label rename | accept | AR-12. `git show e75705b -- components/DeRezolvatCard.tsx`: 3 changed lines, all text/aria-label ("De rezolvat" -> "Necesita atentie"). | closed |
| T-34-15-SC | Tampering | npm/pip/cargo installs | accept | AR-13. Same evidence as T-34-14-SC. | closed |
| T-34-SC | Tampering | npm installs (plans 01-13, 13 rows) | accept | AR-10 evidence applies (single phase-wide fact: no dependency change across `ab2984d..HEAD`). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

Accepted at plan time by the phase 34 planner (register authored in each PLAN.md); the reasoning was re-verified against the code by the 2026-11-03 audit. No separate end-user sign-off artifact exists beyond the plans and the completed UAT.

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-34-01 | T-34-01-02 | Token/style work in ui.tsx touches no permission logic; RLS + `usePermissions` remain the gate. Verified: no permission tokens in ui.tsx diff. | phase 34 plan 01 (planner); re-verified by auditor | 2026-11-03 |
| AR-34-02 | T-34-02-03 | `qkd_nav_recent_<userId>` holds navigation labels only; rendered as escaped text; navigation passes through AppRouter guards. | phase 34 plan 02; re-verified | 2026-11-03 |
| AR-34-03 | T-34-03-02 | "Protectia datelor" intentionally reachable by all authenticated roles (D-15); route deliberately unguarded in AppRouter (`:208-210`, unchanged). | phase 34 plan 03; re-verified | 2026-11-03 |
| AR-34-04 | T-34-05-03 | Same as AR-34-02 for the Recente row; code does not execute content. | phase 34 plan 05; re-verified | 2026-11-03 |
| AR-34-05 | T-34-06-02 | Only navigation buttons removed from federation panels; no data newly exposed (no new queries). | phase 34 plan 06; re-verified | 2026-11-03 |
| AR-34-06 | T-34-07-02 | Push-notification widget moved unchanged into the current user's own account settings. | phase 34 plan 07; re-verified | 2026-11-03 |
| AR-34-07 | T-34-10-02 | plati-hub guard `canManageFinances` untouched. | phase 34 plan 10; re-verified | 2026-11-03 |
| AR-34-08 | T-34-14-02 | Hiding Echipamente/Vanzari from federation is menu parity (UX), not access control; data RLS-filtered per club; resolver falls back to default. | phase 34 plan 14; re-verified | 2026-11-03 |
| AR-34-09 | T-34-14-03 | `viewParams` tab/sectiune validated by `esteTabHub`/`esteSectiuneHub`; unknown values fall back to default. | phase 34 plan 14; re-verified | 2026-11-03 |
| AR-34-10 | T-34-SC, T-34-14-SC | No dependency added in phase 34 (package.json and package-lock.json unchanged across the range). | phase 34 plans 01-14; re-verified | 2026-11-03 |
| AR-34-11 | T-34-15-01 | Stagii menu entry is a link; `stagii` route guard unchanged; same roles already saw Stagii as a hub tab. | phase 34 plan 15; re-verified | 2026-11-03 |
| AR-34-12 | T-34-15-03 | Label-only rename of the attention card. | phase 34 plan 15; re-verified | 2026-11-03 |
| AR-34-13 | T-34-15-SC | No dependency added by plan 15. | phase 34 plan 15; re-verified | 2026-11-03 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

SUMMARY.md `## Threat Flags`: 34-02 .. 34-08 each state "None" (informational, all map to existing IDs: T-34-02-03, T-34-03-01, T-34-05-01, T-34-06-01, T-34-07-01). 34-01 and 34-09 .. 34-15 contain no Threat Flags section. No `unregistered_flag`.

Diff-level cross-check (not relying on the summaries): the only new attack surface in `ab2984d..HEAD` is (1) the `cereri_inregistrare` head count (T-34-05-01), (2) the `qkd_nav_recent_*` localStorage key (T-34-02-03/05-03), (3) the `BottomNav` component (navigation only, destinations all guarded; maps to T-34-02-01/05-02), (4) the 4 hub tabs and `viewParams` resolver (T-34-14-xx), (5) the two test files (T-34-13-xx). All registered.

## Observations (informational, not blockers)

1. Button Catalog: menu hides it for non-`isSuperAdmin` (`menuConfig.ts:66`), but the router guard is `isFederationAdmin` (`AppRouter.tsx:341`, which includes the non-super `ADMIN` role). Unchanged from baseline and consistent with T-34-02-01 (`requires` only hides); a non-super `ADMIN` could still reach it via a persisted `activeView`.
2. `.planning/phases/34-.../screens/` is untracked but not gitignored; a blanket `git add -A` would commit four screenshots (own test account only, no password). Consider ignoring the folder.
3. T-34-09-01 plan text said "no onClick change"; bulk Inactiv `onClick` now wraps the unchanged handler in `openConfirm` (code-review fix d3a527c). Safer than before, handler body unchanged.
4. Uncommitted working-tree edits exist in `components/ui.tsx` (Modal `headerActions`) and `components/GestiuneExamene/SesiuneForm.tsx` (default club for SUPER_ADMIN, club ordering). They are outside the phase 34 commits and were not audited here.
5. Functional note: SUPER_ADMIN_FEDERATIE no longer sees Echipamente/Vanzari in the Plati hub (parity with old adminMenu); a legacy `produse` link lands on Facturi for them. Covered by accepted T-34-14-02.

## Not Verified

- Live Supabase RLS policy on `cereri_inregistrare` (`supabase/` is gitignored; live `pg_policies` not queried). T-34-05-01's declared mitigation is client gating plus head-only count; the row count itself relies on RLS.
- Real-device mobile (iOS safe-area) behavior of BottomNav; UAT covered desktop and 390px emulation only.
- Browser rendering of FamilieWidget modals (stated untested in 34-08-SUMMARY).

## Verification Run (read-only, at audit time)

- `git diff --stat ab2984d HEAD -- package.json package-lock.json` -> empty.
- `npx tsc --noEmit` -> 0 `error TS`.
- `npx tsx tests/ui_faza34_menu_parity.ts` -> Tests 1, 2, 3b, 3, 4, 4b OK.
- `npx tsx components/Plati/hub/platiHubConfig.test.ts` -> 23 PASS, 0 FAIL.
- Targeted greps/diffs over `ab2984d..HEAD` for `supabase|await|.from(|.rpc(|.insert|.update|.delete|.upsert|useQuery|useMutation` (one hit: T-34-05-01), handler/guard lines per threat above.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-03 | 51 rows (39 unique IDs) | 51 | 0 | gsd-security-auditor (claude) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-03 (automated audit; accepted-risk entries were authored at plan time and have no separate human sign-off)
