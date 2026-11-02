---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 03
subsystem: ui
tags: [header, usermenu, notifications, theme, tokens, tailwind]
requires: [34-01, 34-02]
provides:
  - "Header plat pe tokeni --t-header-*, fara umbra/blur/pastila Online"
  - "UserMenu cu Setări Cont, Protecția datelor (toate rolurile), Istoric Activitate (hasAdminAccess)"
  - "TraseuMobil, NotificationBell, ThemeDropdown pe tokeni, tinte tactile 44px mobil / 36px desktop"
affects: [34-04]
key-files:
  modified:
    - components/Header.tsx
    - components/UserMenu.tsx
    - components/TraseuMobil.tsx
    - components/NotificationBell.tsx
    - components/ThemeDropdown.tsx
key-decisions:
  - "Istoric Activitate in UserMenu conditionat de permissions.hasAdminAccess (echivalent isAtLeastInstructor din AppRouter); poarta reala ramane renderProtected + RLS"
  - "Eticheta dashboard in VIEW_TITLES = 'Acasă'; adaugat 'anunturi-federatie'"
metrics:
  tasks: 2
  files: 5
  completed: 2026-11-03
---

# Phase 34 Plan 03: Header + UserMenu + elemente header pe tokeni Summary

Header, UserMenu, NotificationBell, ThemeDropdown si TraseuMobil folosesc doar tokeni `--t-*`, fara umbre mari, blur, ping/pulse sau culori hardcodate; intrarile scoase din sidebar (Protecția datelor, Istoric Activitate) sunt acum in UserMenu.

## Commits
- c44ff54: feat(34-03) Header plat pe tokeni + UserMenu
- 20946ca: feat(34-03) TraseuMobil, NotificationBell, ThemeDropdown

## Ce s-a facut
- `Header`: fara `boxShadow`/`backdrop-blur`/pastila "Online" (si `isRootView`), h1 `text-base font-semibold`, hamburger si Reîncarcă `h-11 w-11` (`lg:h-9 lg:w-9`), buton Înapoi `Button secondary ghost` cu `min-h-11 lg:min-h-9`, breadcrumb pe tokeni, separatorul vertical eliminat. `ROOT_VIEWS`/`VIEW_TITLES` raman exportate.
- `UserMenu`: avatar tint pe `--t-primary`, nume + rol pe doua randuri, `aria-haspopup`/`aria-expanded`, inchidere pe Escape, panou `--t-surface`/`--t-border`/`shadow-lg`, rol activ `bg-[var(--t-surface-2)]` + `aria-current`, iteme `min-h-11 lg:min-h-9`; "Dashboard Admin" -> "Acasă"; Deconectare in `--t-status-danger`.
- `NotificationBell`: buton 44/36, icon `w-5 h-5`, badge pastila `min-w-4 h-4` fara `animate-ping`, "9+" peste 9, panou pe tokeni.
- `ThemeDropdown`: declansator `min-h-11 lg:min-h-9`, panou `shadow-lg`, border/culori pe tokeni (inclusiv tema activa `border-[var(--t-primary)]`, in loc de sky).
- `TraseuMobil`: fundal/border pe `--t-header-*`, chip-uri `rounded-lg` neutre, fara blur/indigo.

View-urile din UserMenu: `account-settings`, `protectia-datelor`, `istoric-activitate`, `admin-console`, `my-portal`, `dashboard` (toate verificate in `types.ts` View; `protectia-datelor`/`istoric-activitate` au case in AppRouter).

## Deviations from Plan
- [Minor] In ThemeDropdown am inlocuit si `border-sky-400 ring-sky-400/40` / `hover:border-slate-600` (tema activa in grila) cu tokeni, pentru ca planul cerea eliminarea culorilor hardcodate din fisier. Eticheta `text-[8px]` -> `text-xs`.
- [Minor] `Button` din ui.tsx adauga `shadow-sm` pe secondary; suprascris cu `!shadow-none` pe butonul Înapoi.
- Stilul `style={{...}}` pe iconite (ChevronDownIcon, ShieldCheckIcon etc.) functioneaza: iconitele sunt lucide si accepta `style`; tsc 0 erori.

## Verificare
- `npx tsc --noEmit`: 0 erori.
- grep clase interzise pe Header/UserMenu (plan task 1) si pe TraseuMobil/NotificationBell/ThemeDropdown (task 2): 0 potriviri.
- `export const ROOT_VIEWS` x1 in Header; `protectia-datelor` si `istoric-activitate` prezente in UserMenu.
- `npm run build`: OK.
- NU verificat: browser (preview 1280x800 / 390x844, teme Lavender Light / QwanKiDo Blue), dimensiunile reale ale tintelor tactile, contrast pe teme luminoase, comportament Escape in UserMenu. Ramane pentru poarta vizuala (34-13). `AppLayout` neschimbat (props neschimbate). Review separat (code-review) nerulat.

## Known Stubs
None.

## Threat Flags
None. T-34-03-01 mitigat: Istoric Activitate afisat doar cu `permissions?.hasAdminAccess`.

## Self-Check: PASSED
