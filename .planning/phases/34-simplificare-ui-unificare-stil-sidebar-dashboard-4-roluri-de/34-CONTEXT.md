# Phase 34 — Context (decizii user, 2026-11-02)

Sursă: sesiune AskUserQuestion (3 runde). Toate sunt LOCKED, nu se re-întreabă.

## Decizii
- **Unificare**: același stil vizual între sidebar și dashboard (aceiași tokeni de temă, rotunjiri, umbre, tipografie, spațiere).
- **Simplificare**: mai puține intrări meniu; mai puțin zgomot vizual (culori/borduri/badge-uri/umbre); dashboard mai scurt; navigare mai clară (etichete, iconuri, ierarhie).
- **Roluri**: SUPER_ADMIN_FEDERATIE, ADMIN_CLUB, INSTRUCTOR, SPORTIV (toate 4).
- **Teme**: se păstrează cele 20 teme + tokenii (contentBg/tableBorder/inputBg/inputFocusRing/footerBg etc.). Sidebar și dashboard doar consumă aceiași tokeni.
- **Scope**: shell (Sidebar, header, AppLayout, dashboard-uri pe rol) + pagini principale: Sportivi, Plăți/plati-hub, Competiții, Grupe, Prezență, Examene.
- **Meniu**: agentul propune gruparea redusă (inventar pe rol), userul aprobă înainte de cod.
- **Preview**: mockup HTML static (artifact) cu sidebar+dashboard înainte/după → aprobare user → abia apoi implementare.
- **Platformă**: desktop + mobil (hamburger sidebar, bottom nav).
- **Stil**: minimalist, aerisit — fundal curat, carduri plate cu border subțire, un singur accent din temă, mult spațiu.
- **Pain points**: prea multe intrări meniu; dashboard și sidebar par două aplicații; prea multe culori/carduri, fără ierarhie.

## Aprobări meniu (2026-11-02, după UI-SPEC verificat)
- Structura de meniu din 34-UI-SPEC.md secțiunea "Meniu" — APROBATĂ (7 intrări admin/instructor, 4 sportiv; hub-uri Sportivi/Examene/Competiții/Antrenamente/Fișa mea; Setări Cont, Protecția datelor, Istoric Activitate în UserMenu; nicio rută ștearsă).
- Dashboard: rând "Recente" (max 4 chip-uri) în locul Preferate/Cele mai folosite.
- Import Sportivi, Deduplicare, Cereri GDPR = tab-uri în hub-ul Sportivi.
- Admin Dashboard + Button Catalog → Administrare > Sistem; Button Catalog doar isSuperAdmin.
- Mockup HTML APROBAT de user (2026-11-02): https://claude.ai/artifact/JsWwrxzN6nKtoUkR5d6Dx7 (sursă locală efemeră; spec-ul rămâne 34-UI-SPEC.md). Poarta mockup trecută, urmează plan + cod.

## Constrângeri proiect
- `components/ui.tsx` design system intern; fără Shadcn/MUI; fără librării noi.
- Tailwind only, fără CSS separat. Nu se sparge API-ul existent al componentelor.
- Navigare SPA prin `activeView` (NavigationContext), fără URL routing. Permisiuni prin `usePermissions` — nu duplica logica.
- Valuri propuse: 1) tokeni/shell, 2) dashboard-uri, 3) pagini principale.

## Fișiere de pornire
`components/Sidebar.tsx`, `components/AppLayout.tsx`, `components/AppRouter.tsx`, `components/ui.tsx`, `AdminDashboard`, `SportivDashboard/`, sistemul de teme (ThemeEditor).
