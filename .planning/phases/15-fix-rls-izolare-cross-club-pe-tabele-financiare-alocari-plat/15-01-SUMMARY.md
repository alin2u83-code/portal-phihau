---
plan: 15-01
phase: 15
status: complete
date: 2026-07-06
---

# 15-01: Fix RLS izolare cross-club pe tabele financiare — SUMMARY

## Ce s-a facut

Politica RLS `club_member_access` pe 8 tabele financiare folosea predicatul slab
`is_super_admin() OR get_active_club_id() IS NOT NULL` (verifica doar "userul are un
club activ?", nu "randul apartine clubului activ?"). Orice ADMIN_CLUB/INSTRUCTOR putea
vedea/scrie date financiare ale altor cluburi.

Executia a fost preluata direct de orchestrator (nu de subagent-ul gsd-executor) din
2 motive de infrastructura, nu de continut:
1. Worktree isolation a esuat de 2 ori la rand cu bugul acelasi (worktree creat dintr-o
   baza veche, lipsea commit-ul cu planul) — mecanism harness, nu problema git.
2. Subagent-ul gsd-executor nu are acces la tool-urile MCP Supabase in acest mediu
   (doar orchestratorul principal le are, via ToolSearch).

### Inspectie schema live (Task 1)

Verificat direct in Supabase (`information_schema`, FK-uri, date reale) inainte de a
scrie migratia:
- `obligatii_plata`, `incasari_efective`, `plati`, `tranzactii`, `familii` au coloana
  `club_id` directa, dar NU completata pe toate randurile (ex. `obligatii_plata`:
  136/159 NULL).
- Pt randurile cu `club_id` NULL, clubul e recuperabil prin `sportiv_id`/`familie_id`/
  `platitor_id` -> `sportivi.club_id`/`familii.club_id` (verificat: 131/136 + 55/60 +
  5/5 recuperabile asa; restul raman orfane, vizibile doar super_admin - fail-closed).
- `sesiune_activitate` si `staging_inscrieri` NU au NICIO cale spre `club_id` in
  schema live (verificat FK + date reale). Risc rezidual documentat: restrictionate
  la `is_super_admin()` only.

### Migratie scrisa si aplicata (Task 2, BLOCKING)

Fisier local (neurmarit in git — `supabase/` e in `.gitignore`, sursa de adevar e
DB live): `supabase/migrations/20260706_fix_rls_izolare_cross_club_financiar.sql`

Aplicata pe Supabase live (project `wuhidifzsutwgdfkwhmd`) via MCP `apply_migration`,
migration name `fix_rls_izolare_cross_club_financiar`. Adauga 3 functii helper
(`obligatie_club_id`, `incasare_club_id`, `plata_club_id`, SECURITY DEFINER,
search_path fixat) si recreaza politica `club_member_access` cu predicat per-club
real pe toate 8 tabele.

### Verificare (Task 3, checkpoint human-verify)

1. **SQL**: `pg_policies` confirma predicatul slab a disparut de peste tot pe toate
   8 tabele. Query cross-check: 159 `obligatii_plata` partitionate corect pe 3 cluburi
   reale (C.S. Phi Hau 157, Club Bogdan 1, Thoi Son Brasov 1) — zero amestec.
2. **UI live** (Playwright, cont test ADMIN_CLUB context C.S. Phi Hau): Facturi &
   Plăți si Jurnal Încasări incarca normal, zero erori consola, zero regresie —
   userul vede doar datele proprii clubului, zero nume/date din alte cluburi.
3. Confirmat de user dupa revizuire.

## Artefacte produse

- `supabase/migrations/20260706_fix_rls_izolare_cross_club_financiar.sql` (local, netracked)
- Functii noi in DB: `public.obligatie_club_id(uuid)`, `public.incasare_club_id(uuid)`, `public.plata_club_id(uuid)`
- Politica `club_member_access` recreata pe: `obligatii_plata`, `incasari_efective`, `alocari_plati`, `aplicare_reduceri`, `detalii_decont`, `tranzactie_plata`, `sesiune_activitate`, `staging_inscrieri`

## Risc rezidual (out of scope pt aceasta faza)

- `sesiune_activitate` si `staging_inscrieri` nu au club_id real in schema — restrictionate la super_admin. Daca se doreste acces ADMIN_CLUB pe aceste tabele, necesita adaugare coloana club_id + backfill (fisier separat, nu security fix).
- ~10 randuri orfane per tabel (fara club_id, fara sportiv/familie link) raman vizibile doar super_admin — posibil date corupte de investigat separat.
