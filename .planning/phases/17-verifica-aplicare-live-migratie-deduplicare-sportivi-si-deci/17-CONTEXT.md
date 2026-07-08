# Phase 17: Verifica migratie dedup live + decizie MFA - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Doua livrabile independente, ambele din audit-ul 2026-07-06 (val 1 - Securitate):

1. **Verificare migratie deduplicare sportivi** - confirma daca `fix_deduplicare_include_inactivi_merge_delete.sql` a fost aplicata pe DB live (comentariul din fisier zicea explicit "NU a fost aplicata live", dar codul UI a fost deja actualizat presupunand ca da).
2. **Decizie + implementare MFA obligatoriu** pentru roluri cu acces la date sensibile (financiar, medical).

</domain>

<decisions>
## Implementare Decisions

### Migratie deduplicare — VERIFICAT DEJA (in aceasta sesiune, direct pe DB live `wuhidifzsutwgdfkwhmd`)
- Rulat `pg_get_functiondef` pe `merge_sportivi()` si `find_similar_sportivi()` direct pe Supabase live.
- **Confirmat: migratia ESTE aplicata live.**
  - `merge_sportivi()` face `DELETE FROM public.sportivi WHERE id = p_secundar_id` dupa mutarea tranzactionala a FK-urilor (descoperite dinamic din `information_schema`, nu lista hardcodata) + guard `has_access_to_club()`.
  - `find_similar_sportivi()` NU mai exclude `status='Inactiv'`, exclude doar tombstone-uri (`propunere_modificare->>'merge_in' IS NOT NULL`), scope explicit pe club (`is_super_admin() OR club_id = context activ`).
- **Nu mai e nevoie sa se ruleze migratia** — doar sa se documenteze verificarea si sa se corecteze comentariul stale din `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql` care zice "NU a fost aplicata live" (dezinformare pentru viitor).
- Planul trebuie sa includa un task de verificare live reproductibil (aceleasi query-uri `pg_get_functiondef`) ca parte din acceptance criteria, nu doar sa preia afirmatia asta ca atare.

### MFA — obligatoriu pentru roluri admin
- **Cine e obligat:** `SUPER_ADMIN_FEDERATIE` + `ADMIN_CLUB`. `INSTRUCTOR` si `SPORTIV` raman cu MFA opțional (voluntar, cum e acum via view `setup-mfa`).
- **Enforcement:** blocare imediata — daca un user cu rol obligatoriu da login fara MFA configurat, e redirectionat fortat la `setup-mfa` si NU poate accesa restul aplicatiei pana nu configureaza. Fara perioada de gratie, fara banner de amanare.
- **Ce nu se schimba:** `INSTRUCTOR`/`SPORTIV` — comportament identic cu azi (MFA disponibil, nu fortat).
- **Sursa actuala de dezactivat:** `hooks/useMFAGuard.ts` — intoarce hardcodat `{ mfaChecked: true }` cu comentariu "redirect fortat eliminat". Planul trebuie sa reactiveze logica reala de verificare (probabil exista deja logica anterioara comentata/eliminata — verifica git history / `docs/superpowers/specs/2026-06-06-db-security-design.md` pentru implementarea originala inainte de dezactivare) si sa o restranga la cele 2 roluri, nu la toti userii.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Migratie deduplicare
- `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql` — migratia in cauza; comentariul de sus e STALE (zice neaplicata) si trebuie corectat dupa verificare
- `sql/fixes/fix_find_similar_sportivi_exclude_inactivi.sql`, `sql/fixes/fix_merge_sportivi_cod_sportiv.sql` — versiunile anterioare, pentru context istoric
- `sql/fixes/fix_rls_context_aware_role_helpers.sql` — defineste `has_access_to_club()` folosit ca guard

### MFA
- `hooks/useMFAGuard.ts` — hook-ul dezactivat, punctul central de reactivat
- `App.tsx`, `components/AppRouter.tsx` — folosesc `useMFAGuard`/`mfaChecked`
- `docs/superpowers/specs/2026-06-06-db-security-design.md` — design-ul original MFA (inainte de dezactivare); util pentru a intelege ce logica exista deja
- `.planning/quick/20260606-db-security-hardening/PLAN.md` — planul quick-task care a introdus MFA prima data
- `docs/roluri-permisiuni.md` — definitii roluri (SUPER_ADMIN_FEDERATIE, ADMIN_CLUB, INSTRUCTOR, SPORTIV) — relevant pentru scoping enforcement corect

### Audit sursa
- Memory `project_audit_complet_20260706` (sesiune anterioara) — itemul original din auditul de securitate care a generat aceasta faza

</canonical_refs>

<specifics>
## Specific Ideas

- Query de verificare folosit (poate fi reprodus in plan ca acceptance criteria):
  ```sql
  select pg_get_functiondef(oid) from pg_proc where proname='merge_sportivi';
  select pg_get_functiondef(oid) from pg_proc where proname='find_similar_sportivi';
  ```
  Verifica prezenta `DELETE FROM public.sportivi` in `merge_sportivi` si absenta filtrului `status <> 'Inactiv'` in `find_similar_sportivi`.
- MFA: cand `useMFAGuard` reactiveaza, trebuie sa verifice rolul activ din `activeRoleContext` (nu doar userul global) — un user cu rol SPORTIV la un club si ADMIN_CLUB la altul trebuie fortat doar cand contextul activ e ADMIN_CLUB/SUPER_ADMIN.

</specifics>

<deferred>
## Deferred Ideas

- MFA obligatoriu pentru toti userii (inclusiv sportivi) — respins pentru acum, friction prea mare la 3500+ sportivi; poate revenit in discutie daca adoptia MFA creste organic.
- Perioada de gratie / banner de avertizare — respins, enforcement e blocare imediata.
- Feature flag / "buton de panica" pentru dezactivare rapida enforcement MFA — respins explicit. Daca apare o problema in productie (ex. admin blocat afara), se repara prin cod + deploy nou, nu prin comutator runtime. Planul NU trebuie sa includa niciun mecanism de tip config toggle pentru enforcement MFA.

</deferred>

---

*Phase: 17-verifica-aplicare-live-migratie-deduplicare-sportivi-si-deci*
*Context gathered: 2026-07-08*
