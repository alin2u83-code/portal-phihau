---
plan: 16-01
phase: 16
status: complete
date: 2026-07-06
---

# 16-01: Fix ultimele RLS USING(true) — SUMMARY

## Ce s-a facut

Executat direct de orchestrator (nu subagent — gsd-executor nu are acces MCP Supabase in
acest mediu, confirmat deja in Phase 15).

### Rescope dupa inspectie live (Task 1)

Planul original presupunea 3 fix-uri (users, knowledge_base, fisa_inscriere) bazat pe un
grep partial. Inspectia live (`pg_policies` + `pg_class.relrowsecurity`) a aratat ca:

- **`knowledge_base` era DEJA sigur** — politicile INSERT/UPDATE/DELETE au `roles: {service_role}`,
  NU `{authenticated}`. Userii obisnuiti (SPORTIV/ADMIN_CLUB/INSTRUCTOR, care folosesc JWT cu rol
  `authenticated`) NU pot scrie deloc — RLS blocheaza implicit lipsa unei politici pt rolul lor.
  SEC-04 a fost **anulat** — nicio schimbare necesara aici.
- **`fisa_inscriere`**: 0 (zero) randuri live in tabela. Zero risc curent de expunere, dar fix-ul
  ramane necesar preventiv (tabela s-ar putea popula oricand cu date GDPR medicale). Nu exista
  constrangere FK formala pe `practicant_id` (verificat: zero FK constraints pe tabela), dar
  numele coloanei + convenția domeniului (sportiv = "practicant") confirma legatura cu `sportivi.id`.

### Fix-uri aplicate (Task 2, BLOCKING)

Migratie `supabase/migrations/20260706_fix_rls_using_true_users_kb_fisa.sql` (local, netracked —
`supabase/` gitignored) aplicata live pe `wuhidifzsutwgdfkwhmd` via MCP `apply_migration`:

1. **`public.users`** — `authenticated_read` (SELECT) recreata: `id = auth.uid() OR is_super_admin()`
   (era `USING(true)`). `own_row_update` neatinsa.
2. **`public.fisa_inscriere`** — functie noua `public.fisa_practicant_club_id(uuid)` SECURITY DEFINER,
   search_path fixat. Politica `Club_Admin_Examen_Access` recreata: pastreaza verificarea de rol
   ADMIN_CLUB originala + adauga `fisa_practicant_club_id(practicant_id) = get_active_club_id()`.
   `Bypass_Super_Admin` neatinsa.

### Verificare (Task 3, checkpoint)

Confirmat direct in `pg_policies` dupa aplicare: predicatele corecte pe ambele tabele,
`own_row_update`/`Bypass_Super_Admin` intacte. Test cross-club pe date reale nu a fost posibil
pt `fisa_inscriere` (tabela goala) — corectitudinea structurala a predicatului a fost validata
prin verificarea numelor de coloane (`sportivi.id`, `sportivi.club_id` confirmate live).
Confirmat de user.

## Artefacte produse

- `supabase/migrations/20260706_fix_rls_using_true_users_kb_fisa.sql` (local, netracked)
- Functie noua: `public.fisa_practicant_club_id(uuid)`
- Politici recreate: `users.authenticated_read`, `fisa_inscriere.Club_Admin_Examen_Access`

## Neatins (out of scope, confirmat)

- 8 tabele deja restrictionate la super_admin only (rezultate, note_examene, membru_comisie,
  istoric_transferuri, detaliu_co_vo_dao, sportivi_program_personalizat, facturi_federale,
  participare_stagiu) — posibila supra-restrictionare functionala, candidat follow-up separat.
- `knowledge_base` — confirmat deja sigur, nicio modificare.
