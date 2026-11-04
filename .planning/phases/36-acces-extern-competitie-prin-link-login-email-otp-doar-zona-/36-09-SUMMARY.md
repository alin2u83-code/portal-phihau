---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 09
subsystem: ui
tags: [react, acces-extern, otp, competitii, isolated-app]
requires:
  - phase: 36-03
    provides: CompetitieDetail mode='extern' + externRol
  - phase: 36-05
    provides: LoginOtp, SolicitaContForm, accesExternService, DataContext exportat
provides:
  - "Ramura index.tsx pe pathname /competitie/ (fara DataProvider/NavigationProvider/ThemeProvider/BrowserRouter/App)"
  - "CompetitieExternaPage: masina de stari link invalid / login / solicita / cerere trimisa / fara acces / alege context / activ / eroare"
  - "ExternDataProvider (DataContext.Provider minimal) si ShellExtern (antet fara navigatie)"
affects: [36-11, 36-12]
key-files:
  created:
    - components/CompetitieExterna/ExternDataProvider.tsx
    - components/CompetitieExterna/ShellExtern.tsx
    - components/CompetitieExterna/index.tsx
  modified:
    - index.tsx
key-decisions:
  - "Cheia localStorage a contextului ramane cea a portalului (supabaseClient.ts o citeste fix; schimbarea ei iese din scope). seteazaContextActiv suprascrie contextul portalului pe acelasi browser; deconecteaza() o sterge. Efect acceptat (T-36-31)."
  - "Mesajul 'Link invalid' identic pentru id malformat, inexistent si draft (teaser null)."
  - "Un singur context eligibil => intrare directa; mai multe => contextul salvat in localStorage daca e eligibil, altfel ecran de alegere."
requirements-completed: [ACX-01, ACX-02, ACX-04, ACX-05, ACX-06, ACX-07, ACX-08]
completed: 2026-11-05
---

# Phase 36 Plan 09: Aplicatia izolata a zonei externe Summary

**Pe /competitie/<uuid> se monteaza o aplicatie separata (ErrorProvider + QueryClient + RefreshProvider + pagina externa) cu login email+OTP, alegere de context si CompetitieDetail in modul extern, peste un DataContext minimal.**

## Commits
- 1e232c2: ExternDataProvider + ShellExtern
- bfa5f39: CompetitieExternaPage
- 81a73aa: ramura de pathname in index.tsx

## Ce s-a facut
- `index.tsx`: `else if (pathname.startsWith('/competitie/'))` cu `React.lazy(() => import('./components/CompetitieExterna'))`; restul arborelui neschimbat.
- `ExternDataProvider`: sportivi din tabela `sportivi` (id, nume, prenume, status, club_id, grad_actual_id, data_nasterii, data_inscrierii, gen) filtrat pe club; `grade`; viza FRAM din RPC `vize_club_competitie` mapata la forma `VizaSportiv`; `currentUser` si `activeRoleContext` sintetice. Loading + eroare cu buton "Reincearca"; fara retry la 401/403.
- `ShellExtern`: antet (competitie, club + rol, email, Select context doar daca >1, Deconectare), fara sidebar/link.
- Pagina: tema implicita aplicata manual, teaser public inaintea login-ului, `seteazaContextActiv` inainte de citirea competitiei, sesiune existenta reia direct, `SIGNED_OUT` -> login, `Toaster` montat.

## Verificare
- `npx tsc --noEmit` curat; tsc pe `index.tsx` curat; `npm run build` OK.
- grep-urile din plan OK (0 `useNavigation`/`Sidebar`/`navigateTo`/`useData(` in zona externa; 1 `startsWith('/competitie/')`; 1 import lazy).
- NU testat in browser si nici contra DB live (login real, RPC vize, citiri RLS): se verifica in 36-11 / 36-12.

## Deviations from Plan
1. **[Verificare plan] grep `DataProvider\b`** din Task 2 se potriveste si cu `ExternDataProvider` (obligatoriu in pagina); verificat cu `\bDataProvider\b` in loc: 0 potriviri.
2. **`ErrorState`/`Alert`** mentionate in plan nu exista in `ui.tsx`; la eroare se foloseste `Card` + `Button` ("Reincearca").
3. **Import-uri statice in index.tsx**: `App`, `DataProvider` etc. raman importate static (plan: fara refactor). Modulele se evalueaza, dar nimic nu se randeaza si `fetchAppData` nu ruleaza pe calea externa. Nu s-a verificat in browser lipsa apelurilor de retea.
4. `ErrorBoundary.onNavigate` (cerut de componenta) primeste `window.location.reload()`; fallback-ul afiseaza si stack-ul (comportament existent al componentei).

## Known Stubs
None.

## Threat Flags
None noi. Atentie: `useTipuriCompetitie` citeste `tipuri_competitie` ca anon inainte de login; la refuz RLS cade pe etichetele hardcodate.

## Self-Check: PASSED
Fisierele create exista, commit-urile 1e232c2/bfa5f39/81a73aa prezente.
