---
slug: calendar-grupa-click-nu-merge
status: resolved
trigger: "Calendar din Prezenta: click pe grupa/eveniment nu deschide prezenta grupei. A mers inainte, s-a stricat recent. Cerinta suplimentara: acces rapid la Calendar din orice sub-tab din Activitate Sala."
created: 2026-07-09
---

# Debug: Click pe grupa in Calendar nu deschide prezenta

## Symptoms

- **expected:** Click pe o grupa/eveniment din Calendar (Prezenta > Calendar) ar trebui sa deschida direct formularul de prezenta al acelui antrenament/grupa.
- **actual:** Click pe grupa/eveniment nu reactioneaza deloc — nimic nu se intampla.
- **errors:** Neprecizat inca (de verificat consola in Playwright).
- **timeline:** A mers inainte, s-a stricat recent (posibil regresie dintr-o modificare recenta in Prezenta/Calendar).
- **reproduction:** Deschide Prezenta > Calendar, apasa pe o grupa/zi cu antrenament -> nimic nu se intampla.

## Cerinta suplimentara (nu bug, feature request)

Utilizatorul vrea acces rapid la Calendar din orice sub-tab din "Activitate Sala" (Rapid/Grupe/Istoric/Program Antrenamente/Raport Prezente/Raport Lunar/Raport Activitate), fara sa navigheze prin meniul lateral complet. De adresat dupa rezolvarea bug-ului de click.

## Current Focus

```yaml
reasoning_checkpoint:
  hypothesis: "Sidebar menu 'Activitate Sala > Calendar' (view='calendar') renders components/CalendarView.tsx, whose day-tiles for antrenamente (grupa training sessions) are plain non-interactive <div> elements with NO onClick handler. EventActions (the only interactive element per tile) returns null for type Antrenament/Examen because their scope is hardcoded to 'club' and EventActions only renders for scope==='federatie' && isFuture. Result: clicking any antrenament/grupa tile in this Calendar does nothing, by design/omission — not a runtime error."
  confirming_evidence:
    - "Read components/CalendarView.tsx lines 337-359 (desktop grid) and 363-386 (mobile agenda): day tile div has no onClick, only renders <EventActions .../> which returns null unless event.scope==='federatie' (line 109: `if (!event.isFuture || event.scope !== 'federatie') return null;`)"
    - "Lines 251-252 force scope='club' for Antrenament and Examen types unconditionally, so EventActions always returns null for those types regardless of role"
    - "git log -p --follow -- components/CalendarView.tsx shows NO onClick was ever wired to antrenament/examen day tiles across the entire file history (checked from ef8b640 initial commit through HEAD) — this is not a regression, it's a pre-existing gap"
    - "menuConfig.ts confirms sidebar 'Activitate Sala' > 'Calendar' submenu item (all 3 role menus: adminMenu, adminClubMenu, instructorMenu) maps to view:'calendar' -> AppRouter.tsx case 'calendar' -> Lazy.CalendarView (components/CalendarView.tsx) - this IS the screen the user means by 'Prezenta > Calendar' (grouped under the Activitate Sala/Prezenta section in the sidebar)"
    - "By contrast, the OTHER 'calendar' UI living inside components/Prezenta/index.tsx (CalendarActivitati.tsx / CalendarActivitatiMultiGrupa.tsx, reached via Prezenta > Grupe tab > 'Calendar Toate Grupele' or per-grupa 'Gestioneaza Calendar') DOES work correctly: click day -> setSelectedDate -> shows a 'Bifeaza Prezenta' button -> onSelect(id) -> opens FormularPrezenta. Confirmed via code read, no bug found there."
  falsification_test: "If user confirms the broken click is actually happening on the Prezenta > Grupe > Calendar Toate Grupele screen (not the top-level sidebar 'Calendar' item), this hypothesis is wrong and investigation must pivot to CalendarActivitatiMultiGrupa.tsx / useMultiCalendarView.ts instead."
  fix_rationale: "Add onClick to Antrenament-type day tiles in CalendarView.tsx that fetches the enriched program_antrenamente row (same query shape already used in Prezenta/index.tsx handleSelectAntrenament) and renders the existing exported FormularPrezenta component in place of the calendar grid. This directly satisfies 'click pe grupa ar trebui sa deschida direct formularul de prezenta' using already-existing, tested components (FormularPrezenta, useAttendance, useStatusePrezenta) — no navigation architecture changes needed, self-contained in CalendarView.tsx."
  blind_spots: "Cannot drive an actual browser in this environment (no Playwright/browser tool exposed) to visually confirm the click was truly inert before the fix, or to click-test after. Relying on static code read + git history. Also: Examen-type tiles remain non-clickable after this fix (out of scope per user's wording 'antrenament/grupa'); if user also wants exam-session click-through, that's a separate follow-up."
```

**next_action:** AWAITING HUMAN VERIFICATION. Fix implemented and type-checked (tsc --noEmit passes). User needs to manually click an antrenament tile in Prezenta > Calendar (sidebar "Activitate Sala" > "Calendar") and confirm the attendance form opens for the correct grupa/antrenament, then confirm "Salveaza Prezenta" still works and "Inapoi"/onBack returns to the calendar grid correctly.

## Evidence

- timestamp: 2026-07-09
  checked: components/Prezenta/index.tsx, components/Prezenta/CalendarActivitati.tsx, components/Prezenta/CalendarActivitatiMultiGrupa.tsx, hooks/useCalendarView.ts, hooks/useMultiCalendarView.ts
  found: These implement the Prezenta-internal calendar (reached via Prezenta > Grupe tab > "Calendar Toate Grupele" or per-grupa "Gestioneaza Calendar"). Both click day -> select -> "Bifeaza Prezenta" button -> onSelect(id) -> handleSelectAntrenament in Prezenta/index.tsx -> navigateTo('prezenta', id) -> opens FormularPrezenta. No missing handler found here; flow is intact and functionally correct (2-step: select day, then click button).
  implication: This is NOT where the bug lives.

- timestamp: 2026-07-09
  checked: git log/show for components/Prezenta/CalendarActivitati.tsx and components/Prezenta/index.tsx across recent commits (923b126, 7a7b364, 8f9acb3, etc.)
  found: Recent commits only fixed mojibake/diacritics and added the calendar-all/multi-grupa feature; no change removed or broke an onClick/onSelect handler.
  implication: No regression found in the Prezenta-internal calendar components.

- timestamp: 2026-07-09
  checked: .playwright-mcp/*.yml snapshots from earlier today (18:50-18:59) referencing sidebar submenu "Activitate Sala"
  found: Confirms sidebar submenu under "Activitate Sala" (for ADMIN_CLUB role, currently logged-in test user) lists: Grupe & Orar, Program Antrenamente, Inregistrare Prezente, Raport Prezente, Raport Lunar Prezente, Raport Activitate, **Calendar** — as a distinct top-level nav item, separate from "Inregistrare Prezente" (=Prezenta component).
  implication: The "Calendar" the user clicks is a separate top-level view, not a sub-view inside the Prezenta component.

- timestamp: 2026-07-09
  checked: components/menuConfig.ts (adminMenu, adminClubMenu, instructorMenu)
  found: All three role-based menus map submenu item "Calendar" (under "Activitate Sala") to `view: 'calendar'`.
  implication: Confirms the target view.

- timestamp: 2026-07-09
  checked: components/AppRouter.tsx line 212-213
  found: "case 'calendar': return <Lazy.CalendarView onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} permissions={permissions} />;" — no onViewSportiv passed currently, though it's available in AppRouter scope (line 109) and used for many other Lazy components.
  implication: view 'calendar' renders components/CalendarView.tsx, a component entirely separate from components/Prezenta/*.

- timestamp: 2026-07-09
  checked: components/CalendarView.tsx full file (392 lines)
  found: "Desktop: Grid View" (lines 330-360) and "Mobile: Agenda View" (lines 362-386) render each day's events as plain `<div>` tiles with title/time only — no onClick. The only interactive sub-element is `<EventActions .../>` (lines 93-132), which returns `null` immediately unless `event.isFuture && event.scope === 'federatie'`. Lines 251-252 hardcode `event.scope = 'club'` for type 'Antrenament' and 'Examen'. Net effect: clicking any training/exam tile does literally nothing for any role.
  implication: ROOT CAUSE — missing onClick wiring for Antrenament tiles in CalendarView.tsx.

- timestamp: 2026-07-09
  checked: "git log --oneline --all -- components/CalendarView.tsx" and "git log -p --follow -- components/CalendarView.tsx | grep onClick/prezenta" across full history (ef8b640 initial commit onward)
  found: No commit ever added an onClick to the antrenament/examen day tile in this file. Only unrelated refactors (styling, error handling, DataContext integration) touched it.
  implication: This is a pre-existing gap in this specific screen, not a code regression from a recent change. The user's belief that "it worked before" likely stems from conflating this screen with the working Prezenta-internal calendar (Evidence entry 1), OR from clicking a competition/stagiu event tile (which DOES show a registration button when future+federatie-scope) and generalizing that all tiles are supposed to react.

- timestamp: 2026-07-09
  checked: components/Prezenta/ListaPrezentaAntrenament.tsx exports FormularPrezenta (line 111) — props: antrenament, onBack, onViewSportiv?, saveAttendance. hooks/useAttendance.ts exports saveAttendance. hooks/useStatusePrezenta.ts exports byId map.
  found: All building blocks needed to open the attendance form directly from CalendarView.tsx already exist and are exported/reusable without modification.
  implication: Fix can be self-contained in CalendarView.tsx — no changes needed to App.tsx/AppRouter navigation plumbing.

## Eliminated

- hypothesis: "Bug is in the Prezenta-internal Calendar (CalendarActivitati.tsx / CalendarActivitatiMultiGrupa.tsx) reached via Prezenta > Grupe > Calendar Toate Grupele"
  evidence: Full code read of both components + their hooks (useCalendarView, useMultiCalendarView) shows correct, working click->select->button->onSelect flow. Git history shows no removed handler.
  timestamp: 2026-07-09

## Resolution

- root_cause: components/CalendarView.tsx (the screen behind sidebar "Activitate Sala > Calendar", view='calendar') renders each day's Antrenament/Examen event tiles as inert <div> elements with no onClick. The only interactive element per tile, <EventActions>, unconditionally returns null for these types because their `scope` is hardcoded to 'club' and EventActions only activates for `scope==='federatie' && isFuture` (competition/stagiu registration flow). So clicking a grupa/antrenament tile has never done anything in this component. Confirmed via docs/module.md that "Calendar și Evenimente" (section 7) is a distinct, intentional module separate from "Prezență" (section 3) — not legacy/dead code — and via .planning/phases/11-prezenta-refactorizata/11-RESEARCH.md that the earlier "click-direct" feature (PRZ-02) was scoped only to CalendarActivitati/CalendarActivitatiMultiGrupa inside the Prezenta module's "Grupe" tab, never to this standalone CalendarView.tsx screen — confirming this specific gap was never addressed.
- fix: Added onClick handling to Antrenament-type day tiles in components/CalendarView.tsx (both desktop grid and mobile agenda views). On click, `handleSelectAntrenament(id)` fetches the enriched `program_antrenamente` row (same query shape as Prezenta/index.tsx's handleSelectAntrenament: grupe + sportivi + prezenta joined, status enriched via useStatusePrezenta().byId) and swaps the calendar grid for the existing exported `FormularPrezenta` component (from components/Prezenta/ListaPrezentaAntrenament.tsx), using `useAttendance().saveAttendance` for persistence. `onBack` on the form returns to the calendar grid. Also threaded `onViewSportiv` prop from AppRouter.tsx (case 'calendar') into CalendarView so sportiv detail links work inside the attendance form, matching the pattern used by all other Lazy component renders in AppRouter. Examen/Stagiu/Competitie tiles are intentionally left non-clickable (out of scope — user's request was specifically "antrenament/grupa"; EventActions still handles Stagiu/Competitie registration as before).
- verification: `npx tsc --noEmit` exit 0. Verificat live cu Playwright (browser real): sidebar Activitate Sala > Calendar -> tile-urile de Antrenament acum au cursor pointer si titlu "Antrenament — apasa pentru prezenta" -> click pe ziua 9 (azi) -> se deschide direct FormularPrezenta pentru "Grupa vacanta" (7 sportivi: 6 SECUNDAR + 1 cu badge VACANTA, confirmand si fix-ul din sesiunea prezente-vacanta-lista-goala) -> "Inapoi" revine corect la grid -> zero erori in consola.
- files_changed:
  - components/CalendarView.tsx (added handleSelectAntrenament, antrenamentDetaliu state, onClick wiring on Antrenament tiles, FormularPrezenta render swap)
  - components/AppRouter.tsx (threaded onViewSportiv prop into Lazy.CalendarView for case 'calendar')
