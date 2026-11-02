---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 04
subsystem: ui
tags: [hub-tabs, navigation, layout, bottom-nav, tokens, tailwind]
requires: [34-02]
provides:
  - "components/layout/HubTabs.tsx: HubTabs generic + SportiviTabs, ExameneTabs, CompetitiiTabs, FisaTabs + constantele *_HUB"
  - "ActivitateSalaTabs restilizat, tab Generator Program, export ACTIVITATE_SALA_GRUPURI"
  - "AppLayout pregatit pentru bottom nav (pb-24 sub lg, footer lg:flex)"
affects: [34-13]
tech-stack:
  added: []
  patterns:
    - "Un singur HubTabs configurat prin HubDef; wrappers de o linie"
    - "Vizibilitate tab-uri doar din isAtLeastInstructor/isAtLeastClubAdmin (poarta reala: renderProtected + RLS)"
key-files:
  created:
    - components/layout/HubTabs.tsx
  modified:
    - components/ActivitateSalaTabs.tsx
    - components/AppLayout.tsx
    - components/AppRouter.tsx
key-decisions:
  - "Wrappers imbricati in AppRouter in jurul switch-ului, cu un obiect hubProps; niciun case/guard atins"
  - "Footer Realizat cu AI pe tokeni, doar lg+; Sidebar nu mai primeste onOpenThemeEditor (Header il pastreaza)"
metrics:
  tasks: 2
  files: 4
  completed: 2026-11-03
---

# Phase 34 Plan 04: Hub tabs + layout pentru bottom nav Summary

Sportivi, Examene, Competitii si Fisa mea au strip de tab-uri (un `HubTabs` generic), Antrenamente are strip restilizat plus tabul "Generator Program" (view `activitati`), iar AppLayout rezerva loc pentru bottom nav.

## Commits
- 362e946: feat(34-04) HubTabs generic + wrappers, ActivitateSalaTabs restilizat cu Generator Program
- 202d2d1: feat(34-04) AppLayout pentru bottom nav + wrappers HubTabs in AppRouter

## Ce s-a facut
- `HubTabs`: returneaza doar children daca hub-ul nu e activ pentru rol, view-ul nu apartine hub-ului sau raman sub 2 tab-uri vizibile. Strip 44px, `border-[var(--t-border)]`, activ 14/600 + underline `--t-primary`, `aria-current="page"`, scroll orizontal fara bara. Click = `replaceView` (fara intrare in history).
- Hub-uri: Sportivi (7 tab-uri, clubAdmin+), Examene (3, clubAdmin+), Competitii (4; Template Probe doar clubAdmin+; instructor+), Fisa mea (2, toti).
- `ActivitateSalaTabs`: rand 1 cu stilul comun, rand 2 chip-uri `rounded-lg` neutre, `aria-label` "Antrenamente", tab "Generator Program" dupa Calendar.
- `AppLayout`: `pb-24` sub lg, footer `hidden lg:flex` fara blur pe tokeni, `motion-reduce:animate-none`, fara `onOpenThemeEditor` pe Sidebar (ThemeEditor + stare + Header neschimbate).
- `AppRouter`: diff = +4 linii (import, `hubProps`, deschidere/inchidere wrappers).

## Deviations from Plan
None - plan executat conform. Verificarea `git diff --numstat` a fost omisa la cererea orchestratorului (se rupe dupa commit).

## Verificare
- `npx tsc --noEmit`: 0 erori (intreg proiectul).
- grep clase interzise pe HubTabs.tsx si ActivitateSalaTabs.tsx: 0 potriviri.
- `export const SportiviTabs` = 1; `hidden lg:flex` = 1 si `pb-24` prezent in AppLayout; `SportiviTabs` prezent in AppRouter.
- `npm run build`: OK.
- NU verificat: browser (strip-uri per rol, 1280x800 si 390x844, teme, ScrollRestorer dupa click pe tab, footer ascuns sub 1024px, ultimul element nu e acoperit de bottom nav). Ramane pentru poarta vizuala 34-13.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
