---
quick_id: 260925-rls
description: Fix RLS cross-club leak pe orar_saptamanal (politica fantoma "Acces Club Orar")
date: 2026-09-25
---

# Plan: Fix RLS orar cross-club

## Context

Raportat de user: "program de antrenamente este vizualizat de toata lumea de la toate cluburile, aplica filtre pe cluburi". Triaj (`portal-debug` skill) a clarificat: e regresie de securitate (leak cross-club), nu feature de extindere vizibilitate.

## Investigatie

Agent `grupe-orar` a confirmat cauza: frontend (`hooks/useGrupe.ts`, `components/Grupe/index.tsx`) filtreaza deja corect dupa `club_id`/`visibleClubIds`. Cauza reala e la nivel RLS pe DB live (Supabase, proiect `wuhidifzsutwgdfkwhmd`): tabelul `orar_saptamanal` avea 3 politici RLS, dintre care una — `"Acces Club Orar"` — era o politica fantoma (aplicata direct pe DB, fara migrare in `supabase/migrations/`) care verifica doar `club_id IN (SELECT club_id FROM utilizator_roluri_multicont WHERE user_id = auth.uid())`, ignorand complet `active-role-context-id` si rolul activ selectat. Un user cu roluri la mai multe cluburi vedea orarul tuturor acelor cluburi, indiferent de contextul activ.

Politicile ramase (`Bypass_Super_Admin`, `Staff_Manage_Orar`) acopereau deja corect toate cazurile legitime (SUPER_ADMIN vede tot, ADMIN_CLUB/INSTRUCTOR doar clubul din contextul activ, via `este_staff_club`).

## Task 1: DROP politica fantoma

- **Actiune:** `DROP POLICY "Acces Club Orar" ON public.orar_saptamanal;` — aplicat direct pe DB live via Supabase MCP (`apply_migration`, migrare `drop_ghost_policy_acces_club_orar`), nu exista fisier de cod de modificat.
- **Verify:** `get_advisors(security)` dupa drop — niciun flag nou pe `orar_saptamanal`.
- **Done:** Politica stearsa, ramase `Bypass_Super_Admin` + `Staff_Manage_Orar`.

## Task 2: Verificare live (Playwright)

- Test manual prin `playwright-portal-test`: context ADMIN_CLUB (C.S. Phi Hau) vede doar propria grupa/orar; context Super Admin Federatie vede toate cluburile. Zero erori consola.
- Raport: `.playwright-mcp/reports/raport-orar-rls-fix-2026-09-24.md`

## Must-haves

- [x] Politica fantoma stearsa de pe `orar_saptamanal`
- [x] SUPER_ADMIN_FEDERATIE pastreaza vizibilitate completa
- [x] ADMIN_CLUB/INSTRUCTOR vad doar clubul din contextul activ
- [x] Verificare vizuala confirmata (raport playwright)

## Note

Task fara fisiere de cod modificate — fix exclusiv la nivel DB (RLS policy). Nu se aplica code review pe fisiere sursa (nimic de diff'uit in `components/` sau `hooks/`).
