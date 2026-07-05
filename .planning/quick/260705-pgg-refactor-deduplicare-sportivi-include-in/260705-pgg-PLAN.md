---
phase: quick-260705-pgg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql
  - components/Sportivi/DeduplicareSportivi/index.tsx
  - components/Sportivi/DeduplicareSportivi/ModalConfirmareFuzionare.tsx
autonomous: true
requirements: [DEDUP-INACTIVI, DEDUP-MERGE-DELETE, DEDUP-ACCES]
must_haves:
  truths:
    - "Lista de perechi posibil-duplicate include sportivi cu status Inactiv, nu doar Activ"
    - "La fuzionare, istoricul FK al duplicatului (plati, examene, prezenta, grade, etc.) se muta pe sportivul principal"
    - "Campurile goale de pe principal se completeaza din duplicat fara a suprascrie valori existente"
    - "Dupa fuzionare, randul duplicatului este STERS din tabela sportivi (nu doar marcat Inactiv)"
    - "ADMIN_CLUB poate fuziona doar sportivi din propriul club; SUPER_ADMIN_FEDERATIE poate fuziona cross-club"
    - "Perechile deja fuzionate (tombstone legacy cu merge_in) nu reapar in lista"
  artifacts:
    - path: "sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql"
      provides: "Redefinire find_similar_sportivi() (include inactivi + club scope) si merge_sportivi() (delete transactional + FK dinamic + guard acces)"
      contains: "CREATE OR REPLACE FUNCTION public.merge_sportivi"
    - path: "components/Sportivi/DeduplicareSportivi/index.tsx"
      provides: "Fallback local aliniat: sterge duplicatul, completeaza campuri; wording actualizat"
  key_links:
    - from: "components/Sportivi/DeduplicareSportivi/index.tsx"
      to: "merge_sportivi RPC"
      via: "supabase.rpc('merge_sportivi', {...})"
      pattern: "rpc\\('merge_sportivi'"
    - from: "merge_sportivi()"
      to: "has_access_to_club()"
      via: "guard de acces pe club_id primar + secundar"
      pattern: "has_access_to_club"
---

<objective>
Refactor modulul Deduplicare Sportivi pe trei axe confirmate cu utilizatorul:
1. Includerea sportivilor **inactivi** in detectia de duplicate (azi sunt excplicit exclusi in `find_similar_sportivi()`).
2. Fuzionarea muta istoricul FK pe principal, completeaza campurile lipsa fara suprascriere, si **sterge** duplicatul (azi il marcheaza doar `Inactiv`).
3. Controlul de acces pe rol (ADMIN_CLUB = doar clubul propriu, SUPER_ADMIN_FEDERATIE = cross-club) explicit in functiile SQL, reutilizand helper-ele context-aware existente.

Purpose: Curatarea reala a bazei de date duplicate — inclusiv conturile inactive care azi raman ascunse — cu integritate tranzactionala (mutare istoric + stergere intr-o singura tranzactie).
Output: O migratie SQL noua + ajustari minime de frontend (fallback local + wording). Fara modificari in `types.ts`, `components/ui.tsx`, `DataContext` sau `useDataProvider`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@components/Sportivi/DeduplicareSportivi/index.tsx
@components/Sportivi/DeduplicareSportivi/ModalConfirmareFuzionare.tsx
@sql/fixes/fix_find_similar_sportivi_exclude_inactivi.sql
@sql/fixes/fix_merge_sportivi_cod_sportiv.sql
@sql/migrations/fix_rls_context_aware_role_helpers.sql
@sql/migrations/fix_select_sportivi_unified_club_scope.sql

# Context cheie descoperit in planificare:
# - find_similar_sportivi() si merge_sportivi() sunt SECURITY DEFINER — RLS pe tabela
#   sportivi NU poate fi presupus ca filtreaza automat aceste functii. De aceea scoping-ul
#   de club trebuie facut EXPLICIT in interiorul functiilor, folosind helper-ele existente.
# - Helper-ele is_super_admin() si has_access_to_club(p_club_id) DEJA respecta
#   active-role-context-id header (vezi fix_rls_context_aware_role_helpers.sql). Se reutilizeaza
#   ca atare — NU se duplica logica in frontend.
# - Logica de completare campuri lipsa in merge_sportivi este DEJA completa (cnp, email,
#   telefon, adresa, data_nasterii, gen, inaltime, foto_url, grad_actual_id, locul_nasterii,
#   cetatenia, data_inscrierii cea mai veche). Se pastreaza — se schimba doar dezactivare -> stergere.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migratie SQL — include inactivi in detectie + fuzionare transactionala cu stergere si guard de acces</name>
  <files>sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql</files>
  <action>
Creeaza o migratie SQL noua care redefineste ambele functii RPC (`CREATE OR REPLACE`), pornind de la definitiile curente din `fix_find_similar_sportivi_exclude_inactivi.sql` si `fix_merge_sportivi_cod_sportiv.sql`. Pastreaza semnaturile, tipurile de retur, `LANGUAGE plpgsql`, `SECURITY DEFINER` si `SET search_path` existente (find: `'public', 'extensions'`; merge: `'public'`). La final adauga `GRANT EXECUTE ... TO authenticated` pentru ambele si un bloc de comentariu care documenteaza deciziile (per DEDUP-INACTIVI, DEDUP-MERGE-DELETE, DEDUP-ACCES) plus nota "APLICA LIVE in Supabase SQL Editor".

find_similar_sportivi() — schimbari in CTE-ul `sportivi_vizibili`:
- ELIMINA filtrul `WHERE s.status IS DISTINCT FROM 'Inactiv'` (per DEDUP-INACTIVI: inactivii trebuie sa apara ca potentiale duplicate).
- ADAUGA in schimb DOUA conditii noi in WHERE:
  (a) Exclude tombstone-urile de fuzionari anterioare (legacy): `(s.propunere_modificare ->> 'merge_in') IS NULL` — altfel perechile deja fuzionate inainte de aceasta migratie ar reaparea.
  (b) Scope explicit pe club (per DEDUP-ACCES), oglindind policy-ul Select_Sportivi_Unified: `( is_super_admin() OR s.club_id = ( SELECT urm.club_id FROM utilizator_roluri_multicont urm WHERE urm.user_id = auth.uid() AND urm.id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid ) )`. Motiv: functia e SECURITY DEFINER, deci nu ne putem baza pe RLS sa filtreze; ADMIN_CLUB trebuie sa vada duplicate doar din clubul lui, SUPER_ADMIN peste tot.
- Restul functiei (perechile, scorurile, motivele) ramane neschimbat.

merge_sportivi() — schimbari:
- Dupa `SELECT * INTO v_primar / v_secundar ... FOR UPDATE` si validarea NOT FOUND, ADAUGA un guard de acces (per DEDUP-ACCES): daca NU `(has_access_to_club(v_primar.club_id) AND has_access_to_club(v_secundar.club_id))` atunci `RAISE EXCEPTION 'Nu aveti permisiunea sa fuzionati acesti sportivi (club diferit de contextul activ).'`. Astfel ADMIN_CLUB poate fuziona doar in clubul propriu, iar SUPER_ADMIN_FEDERATIE cross-club (has_access_to_club returneaza true pentru super admin).
- Pastreaza NESCHIMBAT blocul de completare campuri lipsa pe primar (Pasul 1) — respecta deja "fara suprascriere".
- INLOCUIESTE bucla cu lista hardcodata de 12 tabele cu descoperire DINAMICA a tuturor FK-urilor catre public.sportivi(id) (per DEDUP-MERGE-DELETE, cerinta "orice inregistrare FK catre sportiv_id"): interogheaza catalogul de constrangeri (pg_constraint join pg_attribute / information_schema.key_column_usage + constraint_column_usage) pentru fiecare pereche (tabel, coloana) unde coloana e FK spre sportivi.id. Pentru fiecare, ruleaza `EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', tabel, coloana, coloana) USING p_primar_id, p_secundar_id;` cu acelasi handling: la `unique_violation` sterge randurile secundarului pe acel tabel (`DELETE ... WHERE %I = p_secundar_id`), la `OTHERS` inregistreaza eroarea in raport si continua. Exclude tabela `sportivi` din reassign daca ar aparea o auto-referinta care ar rescrie randul principal — reassign doar coloanele care refera id-ul (o auto-referinta pe sportivi se reasigneaza normal, dar nu atinge PK-ul).
- INLOCUIESTE Pasul 3 (UPDATE status='Inactiv' + propunere_modificare tombstone) cu STERGEREA efectiva: `DELETE FROM public.sportivi WHERE id = p_secundar_id;`. Toata operatiunea ramane intr-o singura tranzactie (functia) — daca a ramas vreun FK nereasignat, DELETE esueaza cu FK violation si intreaga tranzactie face rollback (fara pierdere de date). Actualizeaza raportul JSONB de retur: inlocuieste `'secundar_dezactivat', true` cu `'secundar_sters', true`.
- Pastreaza `EXCEPTION WHEN OTHERS THEN RAISE;` la final (rollback automat).

Nota importanta pentru implementator: functiile sunt SECURITY DEFINER, deci `auth.uid()` si `current_setting('request.headers')` reflecta tot utilizatorul apelant (nu owner-ul) — scoping-ul si guard-ul functioneaza corect pentru contextul activ.
  </action>
  <verify>
    <automated>MISSING — verificare manuala DB: aplica migratia in Supabase SQL Editor (sau via supabase MCP apply_migration pe proiectul activ), apoi ruleaza: (1) `SELECT count(*) FILTER (WHERE (sportiv_a_json->>'status')='Inactiv' OR (sportiv_b_json->>'status')='Inactiv') FROM find_similar_sportivi();` -> trebuie sa poata fi > 0 daca exista inactivi similari; (2) pe o pereche de test `SELECT merge_sportivi('<primar>','<secundar>');` apoi `SELECT count(*) FROM sportivi WHERE id='<secundar>';` -> 0 (randul sters); (3) confirma ca un rand FK (ex. plati) al secundarului are acum sportiv_id = primar.</automated>
  </verify>
  <done>find_similar_sportivi returneaza si sportivi inactivi (excluzand tombstone-urile merge_in), scopat pe clubul contextului activ; merge_sportivi verifica accesul pe club, reasigneaza dinamic toate FK-urile, completeaza campurile lipsa fara suprascriere si STERGE randul secundar; totul tranzactional.</done>
</task>

<task type="auto">
  <name>Task 2: Aliniere frontend — fallback local sterge duplicatul, wording "sters" in loc de "dezactivat"</name>
  <files>components/Sportivi/DeduplicareSportivi/index.tsx, components/Sportivi/DeduplicareSportivi/ModalConfirmareFuzionare.tsx</files>
  <action>
In `index.tsx`, functia `executaFuzionare`, ramura de fallback local (`else` cand `modRPC === false`):
- Dupa bucla de reassign `TABELE_REFERINTA`, ADAUGA `telefon` si `adresa` la obiectul `completari` (aliniat cu functia SQL): `if (!primar.telefon && secundar.telefon) completari.telefon = secundar.telefon;` si `if (!primar.adresa && secundar.adresa) completari.adresa = secundar.adresa;`. Nota: `SportivCard` din types.ts local NU are `adresa` — foloseste acces defensiv `(secundar as any).adresa` / `(primar as any).adresa` ca sa NU modifici `components/Sportivi/DeduplicareSportivi/types.ts` decat daca e strict necesar (daca preferi tipare curata, poti extinde interfata locala SportivCard cu `adresa?: string | null` — acesta e fisier local al modulului, permis de scope, NU types.ts radacina).
- INLOCUIESTE blocul final `await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', secundarId);` cu o stergere best-effort: incearca `const { error: delErr } = await supabase.from('sportivi').delete().eq('id', secundarId);` iar daca `delErr` exista (ex. FK ramas sau policy DELETE lipsa in mod degradat), fa fallback la `await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', secundarId);` pentru a nu bloca operatiunea in modul local. (Per DEDUP-MERGE-DELETE: calea RPC este primara si sterge garantat; fallback-ul local ramane robust.)
- Actualizeaza mesajul de succes: `showSuccess('Fuzionat cu succes', ...)` sa spuna ca duplicatul a fost eliminat/sters (nu "dezactivat"), ex. `Contul duplicat a fost eliminat. Profilul principal: ${numePrimar}.`

In `ModalConfirmareFuzionare.tsx`, actualizeaza wording-ul din caseta de avertizare "Actiune ireversibila": textul care spune ca "Contul ... se dezactivează" trebuie sa reflecte stergerea, ex. "Contul <secundar> se șterge definitiv." Pastreaza restul UI-ului si logica selectiilor camp-cu-camp neschimbate.

NU atinge: `types.ts` radacina, `components/ui.tsx`, `DataContext`, `useDataProvider`, `CardPereache.tsx`, `SportivInfoCard.tsx`, `utils.ts` (afisarea status Activ/Inactiv exista deja in SportivInfoCard.tsx, deci inactivii se vad automat odata ce apar in lista).
  </action>
  <verify>
    <automated>npm run lint</automated>
  </verify>
  <done>`tsc --noEmit` trece; fallback-ul local sterge duplicatul (cu fallback la Inactiv la eroare) si completeaza telefon+adresa; toasturile si textul modalului reflecta stergerea, nu dezactivarea.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client (browser) -> RPC SECURITY DEFINER | Utilizatorul apeleaza find_similar_sportivi / merge_sportivi; functiile ruleaza cu privilegii ridicate, deci controlul de acces trebuie facut in interiorul lor |
| ADMIN_CLUB context -> date alt club | Un admin de club nu trebuie sa vada sau sa fuzioneze sportivi din alte cluburi |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-pgg-01 | Information Disclosure | find_similar_sportivi() SECURITY DEFINER fara scope explicit | mitigate | Filtru explicit in CTE: is_super_admin() OR club_id = clubul contextului activ (active-role-context-id) |
| T-pgg-02 | Elevation of Privilege | merge_sportivi() SECURITY DEFINER — ADMIN_CLUB ar putea fuziona cross-club | mitigate | Guard `has_access_to_club(primar.club_id) AND has_access_to_club(secundar.club_id)` la intrarea in functie |
| T-pgg-03 | Tampering / Data loss | Stergere duplicat cu FK-uri nereasignate | accept (safe-by-rollback) | Reassign dinamic al TUTUROR FK spre sportivi.id inainte de DELETE; tranzactie unica — orice FK ramas face rollback total, fara pierdere de date |
</threat_model>

<verification>
- `find_similar_sportivi()` returneaza perechi ce includ sportivi Inactiv (cand exista similari), fara tombstone-urile merge_in, scopat pe club.
- `merge_sportivi()` respinge fuzionarea cross-club pentru un ADMIN_CLUB si o permite pentru SUPER_ADMIN_FEDERATIE.
- Dupa un merge reusit: randul secundar nu mai exista in `sportivi`; istoricul FK (plati/examene/prezenta/grade/etc.) apartine principalului; campurile goale ale principalului au fost completate din secundar fara a suprascrie valori existente.
- `npm run lint` (tsc --noEmit) trece dupa modificarile frontend.
</verification>

<success_criteria>
- Lista de duplicate afiseaza activi + inactivi (per DEDUP-INACTIVI).
- Fuzionarea muta corect istoricul, completeaza campurile lipsa fara suprascriere si sterge duplicatul intr-o tranzactie (per DEDUP-MERGE-DELETE).
- Accesul respecta rolul: ADMIN_CLUB doar propriul club, SUPER_ADMIN_FEDERATIE cross-club, reutilizand helper-ele RLS existente fara duplicare in frontend (per DEDUP-ACCES).
- Scope respectat: modificari doar in `components/Sportivi/DeduplicareSportivi/` + o migratie SQL noua. Fara atingerea `types.ts` radacina, `components/ui.tsx`, `DataContext`, `useDataProvider`.
</success_criteria>

<output>
Create `.planning/quick/260705-pgg-refactor-deduplicare-sportivi-include-in/260705-pgg-SUMMARY.md` when done.
Include in SUMMARY:
- Confirmarea ca migratia SQL a fost aplicata live (Supabase SQL Editor / MCP apply_migration) sau, daca nu, un TODO explicit pentru user.
- Orice decizie amanata (ex. daca extinderea interfetei locale SportivCard cu `adresa` a fost necesara).
</output>
