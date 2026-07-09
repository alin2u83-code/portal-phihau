---
phase: quick-260709-fth
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/GestiuneExamene/index.tsx
autonomous: true
requirements: [QUICK-260709-fth]
must_haves:
  truths:
    - "Un user non-federatie (ADMIN_CLUB/INSTRUCTOR) vede in lista de sesiuni DOAR sesiunile clubului sau activ"
    - "Dropdown-ul de an contine doar anii care apar efectiv in datele sesiunilor, plus anul curent, sortat descrescator"
    - "SUPER_ADMIN_FEDERATIE isi pastreaza comportamentul actual (vede toate cluburile, poate filtra optional din ClubSelect)"
    - "Dropdown-ul de club ramane ascuns pentru rolurile non-federatie"
  artifacts:
    - path: "components/GestiuneExamene/index.tsx"
      provides: "Scoping strict pe club pentru non-fed + derivare dinamica ani din date"
      contains: "filteredSesiuni"
  key_links:
    - from: "filteredSesiuni memo"
      to: "currentUser.club_id"
      via: "filtru default pe club pentru non-fed"
      pattern: "currentUser\\.club_id"
    - from: "ANI (dinamic)"
      to: "sesiuni (filteredData.sesiuniExamene)"
      via: "derivare ani distincti din campul data"
      pattern: "sesiuni"
---

<objective>
Repara filtrarea din ecranul Gestiune Sesiuni Examen (`components/GestiuneExamene/index.tsx`):
1. Non-fed (ADMIN_CLUB/INSTRUCTOR) trebuie sa vada STRICT sesiunile clubului lor activ — nu se bazeaza pe RLS care intentionat nu filtreaza pe club (grant cross-club pt comisii).
2. Dropdown-ul de an (`ANI`, azi hardcodat `currentYear-5..+2`) devine dinamic: ani distincti din sesiunile existente UNION cu anul curent, sortat descrescator.

Purpose: Experienta corecta si consistenta — userii de club nu vad sesiuni straine, iar filtrul de an reflecta doar anii reali cu date.
Output: `components/GestiuneExamene/index.tsx` modificat, fara librarii noi.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/quick/260709-fth-gestiune-sesiuni-examen-filtrare-club-si/260709-fth-CONTEXT.md
@components/GestiuneExamene/index.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scoping strict pe club activ pentru rolurile non-federatie</name>
  <files>components/GestiuneExamene/index.tsx</files>
  <action>
In memo-ul `filteredSesiuni` (liniile ~146-170), dupa blocul existent de filtre si INAINTE de sortare, adauga o restrictie implicita pe club pentru rolurile non-federatie, per decizia CONTEXT D "Filtru club ADMIN_CLUB/INSTRUCTOR": daca `!isFederationAdmin`, filtreaza `filtered` la doar sesiunile unde `s.club_id === currentUser.club_id`. Pentru `isFederationAdmin`, pastreaza comportamentul actual (fara default, doar `clubFilter` optional cand e setat).
Inlocuieste comentariul existent (liniile ~161-164) care presupune ca "RLS deja limiteaza" cu un comentariu care explica scoping-ul explicit client-side pentru non-fed (RLS intentionat NU filtreaza pe club — grant cross-club pt comisii, vezi migratia 20260709_examene_multiclub_comisie.sql). NU se atinge policy RLS.
`isFederationAdmin` si `currentUser.club_id` sunt deja in array-ul de dependinte al memo-ului (linia ~170) — pastreaza-le. NU modifica ClubSelect din UI (ramane doar sub `isFederationAdmin`, liniile ~394-401).
  </action>
  <verify>
    <automated>npm run lint</automated>
  </verify>
  <done>Pentru non-fed, `filteredSesiuni` returneaza doar sesiuni cu `club_id === currentUser.club_id`; pentru fed admin comportamentul e neschimbat; tsc --noEmit trece fara erori noi.</done>
</task>

<task type="auto">
  <name>Task 2: Derivare dinamica a anilor din datele sesiunilor</name>
  <files>components/GestiuneExamene/index.tsx</files>
  <action>
Inlocuieste linia hardcodata `const ANI = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);` (linia ~64) cu un `useMemo` care deriva anii din datele reale, per decizia CONTEXT "Filtru ani istorici":
- Sursa: `sesiuni` (= `filteredData.sesiuniExamene`, deja scoped pe rol) — NU `filteredSesiuni`, ca sa nu dispara ani cand se aplica alte filtre si sa se evite dependinta circulara.
- Campul de data: `s.data || s.data_examen` (acelasi pattern folosit deja in `filteredSesiuni`, liniile 150-153; `data` e campul primar per `types.ts` SesiuneExamen liniile 248-261). Extrage anul din primele 4 caractere ale string-ului de data (sau `new Date(...).getFullYear()`), ignora valorile lipsa/invalide.
- Construieste un Set de ani distincti, adauga MEREU `currentYear` (chiar daca nu exista sesiuni inca), sorteaza DESCRESCATOR (cel mai recent primul).
- Dependinte memo: `[sesiuni, currentYear]`.
Cele doua dropdown-uri de an (liniile ~298 si ~333, `{ANI.map(an => ...)}`) raman neschimbate — consuma noul `ANI`. Nu introduce librarii noi.
  </action>
  <verify>
    <automated>npm run lint</automated>
  </verify>
  <done>`ANI` e derivat dinamic din `sesiuni`, contine anul curent garantat, sortat descrescator; ambele dropdown-uri de an il consuma; tsc --noEmit trece fara erori noi.</done>
</task>

</tasks>

<verification>
- `npm run lint` (tsc --noEmit) trece fara erori noi.
- Manual (non-fed): logat ca ADMIN_CLUB/INSTRUCTOR — lista arata doar sesiunile clubului propriu; dropdown-ul de club ramane ascuns.
- Manual (fed): logat ca SUPER_ADMIN_FEDERATIE — vede toate sesiunile, ClubSelect optional filtreaza corect.
- Manual (ani): dropdown-urile de an listeaza doar anii cu sesiuni + anul curent, sortat descrescator.
</verification>

<success_criteria>
- Non-fed vad strict sesiunile clubului activ (scoping client-side explicit, RLS neatins).
- Fed admin comportament neschimbat.
- Filtru an dinamic din date + anul curent, sortat descrescator.
- Fara librarii noi; modificari doar in `components/GestiuneExamene/index.tsx`.
</success_criteria>

<output>
Create `.planning/quick/260709-fth-gestiune-sesiuni-examen-filtrare-club-si/260709-fth-SUMMARY.md` when done
</output>
