# Quick Task 260709-fth: gestiune sesiuni examen filtrare club si ani istorici - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Task Boundary

Ecranul Gestiune Sesiuni Examen (`components/GestiuneExamene/index.tsx`) trebuie sa aiba filtrare strict pe club (userul non-federatie vede DOAR sesiunile clubului sau activ), iar filtrul de an trebuie sa fie derivat din anii reali cu sesiuni existente in `sesiuni_examene`, nu hardcodat (`currentYear-5..+2`).

</domain>

<decisions>
## Implementation Decisions

### Scoping club - comisie cross-club
- Ramane STRICT pe clubul activ al userului (`activeRoleContext.club_id` / pattern `withClub` din `useDataProvider.ts`).
- Sesiunile unde userul e comisar la alt club (permise de RLS `sesiuni_examene_select`) NU se afiseaza aici — out of scope pentru acest task, nu se atinge policy RLS.

### Filtru club pentru SUPER_ADMIN_FEDERATIE
- Ramane optional, fara valoare implicita — fed admin vede toate cluburile by default, poate filtra pe un club anume din `ClubSelect` existent (`components/GestiuneExamene/index.tsx` liniile ~394-401). Nu se schimba comportamentul actual pentru acest rol.

### Filtru club pentru ADMIN_CLUB / INSTRUCTOR (non-fed)
- Dropdown-ul de club RAMANE ASCUNS pentru aceste roluri (au un singur club oricum, fara valoare adaugata sa fie afisat).
- Fix-ul real e la nivel de query/filtrare date (vezi mai jos), nu la UI.

### Filtru ani istorici
- Dropdown-ul `ANI` (azi hardcodat `currentYear-5` .. `currentYear+2`, liniile ~63-64) devine dinamic: ani distincti extrasi din sesiunile existente (`sesiuni_examene`, campul de data sesiune) UNION cu anul curent (mereu inclus chiar daca fara sesiuni inca).
- Sortare descrescatoare (cel mai recent an primul).

### Claude's Discretion
- Implementare tehnica exacta (memo vs util function) pentru derivarea anilor din date — la latitudinea implementarii, cat timp respecta regula de mai sus.
- Ce camp de data se foloseste pentru derivarea anului (data_examen / data_start / similar) — verifica schema reala `sesiuni_examene`.

</decisions>

<specifics>
## Specific Ideas

Root cause identificat prin explorare cod (nu prin discutie explicita, dar confirmat de decizii):
- `components/GestiuneExamene/index.tsx` liniile 146-170 (`filteredSesiuni` memo): aplica `clubFilter` DOAR daca e setat explicit (truthy check linia 158-160) — nu exista un default care sa restrictioneze automat la clubul userului curent. Comentariul din cod (liniile 161-164) presupune ca RLS "deja limiteaza", dar RLS (`sesiuni_examene_select`, migratia `20260709_examene_multiclub_comisie.sql` liniile 76-100) NU filtreaza pe club pentru ADMIN_CLUB/INSTRUCTOR (grant intentionat pt comisii cross-club) — scoping-ul real vine din query-ul server-side `withClub` in `hooks/useDataProvider.ts` (liniile 312-320, 336).
- Trebuie verificat/asigurat ca filtrarea client-side din `index.tsx` nu contrazice sau nu lasa o portita (ex. daca cineva seteaza clubFilter manual la alt club, sau daca in viitor RLS se schimba) — cel putin sa fie consistenta cu principiul "strict club propriu" pentru non-fed.
- Anul: `ANI = Array.from({length:8}, (_,i)=>currentYear-5+i)` (liniile 63-64) de inlocuit cu derivare din date reale.

</specifics>

<canonical_refs>
## Canonical References

- `hooks/useDataProvider.ts` (pattern `withClub`, liniile 312-320, 336) — sursa de adevar pt scoping club server-side.
- `hooks/usePermissions.ts` (liniile 43-47) — pattern `visibleClubIds: 'all' | string[]`.
- `supabase/migrations/20260709_examene_multiclub_comisie.sql` (liniile 76-100) — policy RLS `sesiuni_examene_select`, motiv pt care nu se poate presupune scoping automat din RLS.

</canonical_refs>
