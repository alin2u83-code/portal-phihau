---
created: 2026-08-28T22:57:15.613Z
title: Audit politici RLS fantoma pe tabele in afara Fazei 25
area: database
files:
  - .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-AUDIT-CORECTAT.md
  - .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-VERIFICARE.md
---

## Problem

Faza 25 (audit + fix izolare cross-club pe Grupe/Prezenta/Abonamente) a descoperit ca DB-ul live (proiect Supabase `wuhidifzsutwgdfkwhmd`) are/avea ~20 politici RLS "fantoma" pe cel putin 9 tabele — aplicate direct pe DB (probabil din Supabase Studio SQL Editor), niciodata comise ca fisier de migratie in acest repo, coexistand PERMISIV (OR, semantica standard Postgres RLS) cu politicile documentate/corecte. Cea mai grava gaura gasita: politica `"Power roles can manage training sessions"` pe `program_antrenamente`, bazata pe `has_power_role()` FARA nicio verificare de `club_id` — orice ADMIN_CLUB/INSTRUCTOR cu rol primar putea scrie in orice club, nu doar al lui.

Faza 25 a reparat doar cele 9 tabele din scope-ul ei (grupe, orar_exceptii, program_antrenamente, tipuri_abonament, evenimente, perioade_vacanta, participare_vacanta, sesiune_activitate, plati). O interogare live suplimentara (dupa aplicarea fix-ului Fazei 25) a confirmat ACELASI tipar de politici fantoma nedocumentate exista in continuare, neatins, pe cel putin aceste tabele:

- `tranzactii` — politici `"Power roles can manage transactions"` (has_power_role, fara club scoping — potential aceeasi gaura CRITICA ca la program_antrenamente) si `"Filtru_Club_Universal"` (get_my_clubs(), non-context-aware)
- `grade` — `"Staff_Full_Access"` (este_staff_autorizat(), fara scoping pe randul tinta)
- `istoric_grade` — `"Staff_Full_Access"` (idem)
- `eveniment` — `"Staff_Full_Access"` (idem; NOTA: tabela `eveniment` e diferita de `evenimente`, care a fost deja reparata in Faza 25)
- `reduceri` — `"Staff_Full_Access"` (idem)
- `cluburi` — `"Staff_Full_Access"` (idem)

Interogarea folosita pentru descoperire (rulata pe schema `public` intreaga, nu doar cele 9 tabele din Faza 25):

```sql
SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND (
  qual ILIKE '%get_my_club%' OR qual ILIKE '%has_power_role%' OR qual ILIKE '%este_staff_autorizat%'
  OR with_check ILIKE '%get_my_club%' OR with_check ILIKE '%has_power_role%' OR with_check ILIKE '%este_staff_autorizat%'
);
```

Aceasta lista NU e exhaustiva — a fost gasita cautand doar dupa functiile/politicile deja identificate in Faza 25 (`get_my_clubs`, `has_power_role`, `este_staff_autorizat`, `UNIFIED_CLUB_ACCESS`). Alte tabele pot avea alte variante ale aceluiasi tipar de bug (politici scrise direct in SQL Editor, non-context-aware sau fara scoping de club) sub alte nume/functii inca neidentificate.

Related: [[project_audit_complet_20260706]] (audit anterior care semnala deja RLS spartă cross-club pe zona financiara, rezolvat partial in Faze 15/16), aceasta e continuarea aceluiasi tipar sistemic descoperit acum si in modulele Grupe/Prezenta/Abonamente/Program.

## Solution

Repeta metodologia din Faza 25 (vezi `25-AUDIT-CORECTAT.md` pentru sablonul exact de investigatie si `25-01-PLAN.md`/`25-04-PLAN.md` pentru structura de plan):

1. Interogare live `pg_policies` pe TOATA schema `public` (nu doar tabelele enumerate mai sus — grep exhaustiv pentru orice politica ce nu apare in niciun fisier din `supabase/migrations/` sau `sql/migrations/`).
2. Pentru fiecare politica gasita nedocumentata: verifica daca lipseste scoping de club (`has_access_to_club`/`este_staff_club`), daca foloseste `has_power_role()` (fara club) sau `este_staff_autorizat()`/`get_active_role_context()` fara verificare de rol (risc invers: SPORTIV cu context activ poate scrie).
3. Prioritate: `tranzactii` (potential aceeasi gaura CRITICA ca `program_antrenamente` — verifica `has_power_role()` acolo primul).
4. Scrie migratie corectata per tabela, narrowing-only, fail-closed, doar helperele centrale (`is_super_admin()`, `has_access_to_club(uuid)`, `este_staff_club(uuid)`, `get_own_sportiv_id()`), pastrand orice cale SPORTIV reala existenta.
5. Aplica live + verifica cu test automat (poate reutiliza structura din `tests/rls_izolare_cross_club_faza25.ts`) + verificare UI.

TBD: numar exact de faza / daca se face ca faza noua dedicata sau se ataseaza la o faza existenta de securitate.
