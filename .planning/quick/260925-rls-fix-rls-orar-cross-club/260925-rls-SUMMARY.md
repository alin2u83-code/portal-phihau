---
quick_id: 260925-rls
status: complete
date: 2026-09-25
---

# Summary: Fix RLS orar cross-club

## Ce s-a facut

1. **Investigatie** (agent `grupe-orar`): frontend Grupe/Orar filtreaza deja corect pe club; cauza reala era RLS pe DB live — politica fantoma `"Acces Club Orar"` pe `public.orar_saptamanal`, aplicata direct pe Supabase fara migrare in cod, care ignora `active-role-context-id` si dadea acces la orice club unde userul avea vreun rand in `utilizator_roluri_multicont`.
2. **Fix**: `DROP POLICY "Acces Club Orar" ON public.orar_saptamanal;` aplicat live pe proiectul Supabase `wuhidifzsutwgdfkwhmd` (migrare `drop_ghost_policy_acces_club_orar`). Au ramas politicile corecte `Bypass_Super_Admin` (SUPER_ADMIN vede tot) si `Staff_Manage_Orar` (`este_staff_club`, scopat pe rol activ + club).
3. **Verificare live** cu skill `playwright-portal-test`:
   - Context ADMIN_CLUB (C.S. Phi Hau): Program Antrenamente si Grupe & Orar arata doar grupa proprie ("Grupa copii"), 0 date cross-club, 0 erori consola.
   - Context Super Admin Federatie: Grupe & Orar arata toate grupele din toate cluburile (comportament corect, neschimbat).
   - Raport complet: `.playwright-mcp/reports/raport-orar-rls-fix-2026-09-24.md`

## Fisiere modificate

Niciunul in cod — fix exclusiv DB (RLS policy). Artefacte create:
- `.planning/quick/260925-rls-fix-rls-orar-cross-club/260925-rls-PLAN.md`
- `.planning/quick/260925-rls-fix-rls-orar-cross-club/260925-rls-SUMMARY.md`
- `.playwright-mcp/reports/raport-orar-rls-fix-2026-09-24.md`

## Limitari

Nu a fost disponibil un cont de test ADMIN_CLUB/INSTRUCTOR cu roluri la 2+ cluburi simultan pentru testul direct "comuta context intre 2 cluburi ADMIN_CLUB". Comparatia s-a facut intre ADMIN_CLUB (scope restrans) si Super Admin Federatie (scope total), ceea ce verifica exact granita pe care politica fantoma o incalca.

## Status

Verificat vizual, zero erori consola. Complete.
