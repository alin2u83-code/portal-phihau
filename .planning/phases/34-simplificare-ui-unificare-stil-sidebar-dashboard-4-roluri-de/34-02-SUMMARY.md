---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 02
subsystem: ui
tags: [sidebar, navigation, menu, bottom-nav, tokens, tailwind]
requires: [34-01]
provides:
  - "Meniu 7/7/7/4 (federatie/club/instructor/sportiv) cu aliases pe hub-uri si requires pe submeniu"
  - "NavMenu, RoleSwitcher, Sidebar exclusiv pe tokeni --t-sidebar-* / --t-header-* / --t-border"
  - "components/layout/BottomNav.tsx (mobil, 3 sloturi per rol + Meniu)"
  - "useQuickAccess.recents (max 4, cheie qkd_nav_recent_<userId>)"
affects: [34-03, 34-04]
tech-stack:
  added: []
  patterns:
    - "Activ pe hub = item.view sau item.aliases include activeView"
    - "Vizibilitate UX prin SubMenuItem.requires (poarta reala: renderProtected + RLS)"
    - "Hover derivat prin color-mix pe --t-sidebar-text, fara culori hardcodate"
key-files:
  created:
    - components/layout/BottomNav.tsx
  modified:
    - components/menuConfig.ts
    - hooks/useQuickAccess.ts
    - components/NavMenu.tsx
    - components/RoleSwitcher.tsx
    - components/Sidebar.tsx
key-decisions:
  - "Itemii hub (Sportivi, Antrenamente, Examene, Competitii, Fisa mea) sunt intrari plate cu aliases, nu grupuri"
  - "Admin Dashboard / Button Catalog mutate in Administrare > Sistem (requires isFederationAdmin / isSuperAdmin)"
  - "Anunturi Federatie adaugat in Administrare > Federatie (altfel view inaccesibil dupa eliminarea acordeoanelor)"
metrics:
  tasks: 3
  files: 6
  completed: 2026-11-02
---

# Phase 34 Plan 02: Meniu 7/7/7/4 + sidebar pe tokeni + bottom nav Summary

Meniul are 7/7/7/4 intrari (federatie/club/instructor/sportiv) cu hub-uri prin `aliases`, iar Sidebar, NavMenu, RoleSwitcher si noul BottomNav folosesc doar tokeni `--t-*`, fara culori hardcodate, gradiente, umbre mari sau animatii de ping.

## Commits
- 5aefb9c: feat(34-02) menuConfig 7/7/7/4 + recents in useQuickAccess
- 507227b: feat(34-02) NavMenu + RoleSwitcher pe tokeni
- 4394134: feat(34-02) Sidebar pe tokeni + BottomNav mobil

## Ce s-a facut
- `menuConfig.ts`: rescris dupa propunerea aprobata; `MenuItem.aliases`, `SubMenuItem.requires`; liste de aliases comune (sportivi, examene, competitii, antrenamente, plati). "Vanzari" ramane `vanzari-produse` in Financiar (ADMIN_CLUB).
- `useQuickAccess`: `recents` aditiv; `favorites`/`topViews`/`toggleFavorite`/`trackView` neschimbate ca semnatura (consumatorii AdminMasterMap, QuickAccess compileaza).
- `NavMenu`: butoane cu `aria-current`, grup cu `aria-expanded`, un singur grup deschis, redeschis la schimbarea `activeView`, caption doar la grupuri cu >5 itemi vizibili, badge notificari fara animatie (pastila / punct 8px), mod colapsat doar iconite cu `title`, click pe grup extinde sidebar-ul (`onExpandSidebar`). Scroll nativ; butoanele-sageata cu gradient eliminate. `data-tutorial` pastrat (sidebar, nav-sportivi, nav-examene, nav-prezenta, nav-plati).
- `RoleSwitcher`: un singur rand, `roleLabel` ca text simplu, dropdown pe `--t-surface`/`--t-border`.
- `Sidebar`: blocuri separate prin `border` color-mix, logo fara subtitlu/punct online, rand utilizator cu avatar tint, logout cu `aria-label`, fara buton Tema, buton de restrangere `absolute -right-3 top-5` pe `aside` (continutul in div interior overflow-hidden), sertar mobil `shadow-lg` + backdrop `bg-black/50` fara blur, `trackView` doar pentru view-uri non-ROOT, monteaza `BottomNav`.
- `BottomNav`: `lg:hidden`, `h-16`, `pb-[env(safe-area-inset-bottom)]`, 3 sloturi per rol + "Meniu"; starea activa deriva din `menu` (item/aliases/submeniu), fara liste duplicate.

## Deviations from Plan

**1. [Rule 3 - Blocking] `components/layout` era un fisier gol tracked, nu director**
- **Found during:** Task 3 (scrierea `components/layout/BottomNav.tsx` a esuat cu ENOENT)
- **Issue:** `components/layout` exista in git ca fisier de 0 bytes (commit b4954f3), fara importuri. Planul presupunea un director gol.
- **Fix:** `git rm` pe fisier, creat directorul. Stergerea e inclusa in commit-ul 4394134 (nicio referinta in cod).
- **Impact:** planurile care creeaza `components/layout/HubTabs.tsx` nu mai intampina problema.

**2. [Minor] `ring-[color:var(--t-input-focus-ring)]` in loc de `ring-[var(...)]`**
- Hint explicit de tip ca Tailwind sa nu interpreteze valoarea ca latime. Build-ul genereaza `--tw-ring-color` corect pentru ambele forme (verificat in CSS-ul din dist).

## Verificare
- `npx tsc --noEmit`: 0 erori (baseline 0).
- Poarta `tsx -e` Task 1: `7 7 7 4`.
- grep clase interzise (amber/sky/slate/purple/indigo/emerald, white/N, gradient, from-, animate-ping/pulse, shadow-2xl, backdrop-blur, text-[10/11px], font-bold/black/medium, hover:scale, p/gap/py/px 0.5/1.5/2.5, left-[) pe NavMenu, RoleSwitcher, Sidebar, BottomNav: 0 potriviri.
- `npm run build`: OK.
- NU verificat: browser (preview 1280x800 si 390x844, teme Lavender Light / QwanKiDo Blue, fiecare rol), activarea hub-urilor in UI, colapsare 80px, deschiderea sertarului din "Meniu", contrast pe 20 teme. Ramane pentru poarta vizuala (34-13). `AppLayout` inca paseaza `onOpenThemeEditor` (optional, ignorat) si footer-ul/padding-ul pentru bottom nav sunt in 34-04.

## Known Stubs
None.

## Threat Flags
None (nicio suprafata noua; `requires` doar ascunde in UI, renderProtected/RLS neschimbate; localStorage `qkd_nav_recent_<userId>` accepted in T-34-02-03).

## Self-Check: PASSED
