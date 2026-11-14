---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 04
subsystem: database
tags: [supabase, security-definer, competitii, categorii, live-test, rls]
requires: [41-01, 41-02]
provides:
  - "public.categorii_aplica_operatie APLICATA LIVE pe phi-hau-db (14.11.2026)"
  - "tests/categorii_admin_faza41.ts: baterie live 15 verificari + reziduuri, exit 1 la FAIL, exit 2 la precondiții nesigure"
affects: [41-05, 41-06, 41-07]
tech-stack:
  added: []
  patterns: ["test live pe competitii efemere ZZ_TEST_FAZA41_ cu sportivi cu viza FRQKD (triggerul taxei anuale = no-op)", "cleanup in afara try, reziduuri raportate"]
key-files:
  created:
    - tests/categorii_admin_faza41.ts
  modified:
    - supabase/migrations/20261114a_categorii_aplica_operatie.sql
key-decisions:
  - "Task 1 (checkpoint:decision) = APLICA, ales explicit de utilizator prin AskUserQuestion pe 2026-11-14 ('Verificari catalog, apoi aplica')"
  - "Header migrare: APLICATA LIVE 14.11.2026; blocul NEVERIFICAT inlocuit cu VERIFICAT live (8 verificari catalog)"
requirements-completed: [D-01, D-03, D-04, D-07, D-08, D-09, D-12]
duration: ~30min
completed: 2026-11-14
---

# Phase 41 Plan 04: Aplicare live + baterie RPC categorii_aplica_operatie Summary

RPC `categorii_aplica_operatie` este live pe phi-hau-db si dovedit pe date efemere: 15/15 verificari + reziduuri PASS, zero reziduuri, zero efecte de taxa anuala; ratchet-ul ACL are 2 FAIL pre-existente, fara legatura cu aceasta functie.

## Task 1 - Decizia
Utilizatorul a ales **aplica** pe 2026-11-14 (AskUserQuestion, varianta "Verificari catalog, apoi aplica"). Migrarea a fost aplicata de orchestrator prin Supabase MCP inainte de acest executor; nu s-a re-aplicat.

## Task 2 - Verificari catalog + pg_proc/ACL (live, 14.11.2026)
- postgres `rolbypassrls = true` (definerul poate scrie prin FORCE RLS).
- competitii / categorii_competitie / inscrieri_competitie / echipe_competitie / plati: RLS + FORCE.
- UNIQUE(categorie_id, sportiv_id) si UNIQUE(competitie_id, sportiv_id, categorie_id) pe inscrieri; niciuna pe echipe.
- Triggere: audit_* (audit_trigger_fn, SECURITY DEFINER), trg_extern_protejeaza_campuri (no-op fara este_doar_extern), trg_inscrieri_sportiv_in_club (doar UPDATE OF sportiv_id), trg_taxa_anuala_inscrieri_competitie (doar AFTER INSERT, apeleaza activeaza_taxa_anuala), trg_echipe_denumire_implicita (BEFORE INSERT).
- is_super_admin() citeste header-ul active-role-context-id; event trigger-ele nu sunt relevante.
- pg_proc: prosecdef = true, argumente corecte; grants = postgres / authenticated / service_role (anon fara EXECUTE).
- Header migrare actualizat la "APLICATA LIVE 14.11.2026 (41-04, dupa OK explicit)."; fisierul e urmarit in git (`git ls-files` il listeaza; era deja urmarit din 41-01, `git add -f` aplicat). Commit `5d878e60`.

## Task 3 - Baterie live `tests/categorii_admin_faza41.ts` (commit `ef95a006`)
Rezultat: **16/16 PASS** (15 verificari + reziduuri).

| # | Verificare | Rezultat |
|---|-----------|----------|
| 1 | ADMIN_CLUB refuzat (42501), c1 neschimbata | PASS |
| 2 | anon refuzat (42501), nimic schimbat | PASS |
| 3 | anulare cu p_asteptat=99 refuzata ("redeschide"), c1 activa | PASS |
| 4 | anulare reusita: c1 anulata, randurile raman pe c1, taxe_anulate 1, taxe_achitate_anulate 1, taxa_achitata ramasa true | PASS |
| 5 | mutare refuzata: tinta echipa / alta competitie / categorie anulata; nimic mutat | PASS |
| 6 | mutare c1->c2 reusita (inscrieri_mutate=1) | PASS |
| 7 | fuziune cu mutari incomplete refuzata ("redeschide"), nicio categorie creata | PASS |
| 8 | fuziune cu sportiv dublat refuzata (mesaj dublura), nicio categorie creata | PASS |
| 9 | fuziune [c2,c3] reusita: este_fuzionata, categorii_fuzionate_din = {c2,c3}, numar_categorie = max+1 (6), surse 'fuzionata', randuri mutate, retrasul ramas pe c2 | PASS |
| 10 | impartire cS in 2 categorii: cS 'impartita', categorii_fuzionate_din = cele 2 id-uri, randuri mutate dupa mapare | PASS |
| 11 | mutarea randului retras refuzata, ramane pe c2 | PASS |
| 12 | operatii pe competitie finalizata refuzate ("finalizata") | PASS |
| 13 | super admin insereaza clona + modifica camp direct; ADMIN_CLUB nu poate modifica (0 randuri) | PASS |
| 14 | SELECT_INSCRIERI_COMPETITIE / SELECT_ECHIPE_COMPETITIE fara eroare pentru super admin si admin club; super admin vede randuri | PASS |
| 15 | plati noi = 0, vize noi = 0 pentru cei 5 sportivi | PASS |
| - | reziduuri: competitii ZZ_TEST_FAZA41_ = 0, categorii test = 0 | PASS |

Reziduuri: competitii test = 0; utilizatori auth zztest_faza41_ = 0 (verificat separat dupa rulare); **audit_log: 30 randuri create** (nu au DELETE, raman, informativ).

Nota: mesajul de eroare al RPC la dublura contine numele sportivului; testul nu il mai tipareste (GDPR). Aceasta modificare de output s-a facut dupa singura rulare completa si nu a fost re-rulata (nu schimba nicio verificare).

## ACL ratchet `tests/acl_definer_faza37.ts`: 28/30 PASS, 2 FAIL pre-existente (NU din aceasta functie)
- FAIL `authenticated: nicio functie SECURITY DEFINER noua expusa (noi=trg_echipe_denumire_implicita())`: functie trigger din migrarea 20261110b (Faza 39/40), expusa lui authenticated si absenta din allowlist. Nu apartine 41-01/41-04.
- FAIL `self-check sensibilitate: mutatia e detectata (tinta=acces_extern_competitie(uuid,uuid))`: verificare interna a ratchet-ului, aparent consecinta aceleiasi stari (allowlist/snapshot).
- `categorii_aplica_operatie(...)` NU apare in lista de functii noi: intrarea de allowlist din 41-01 e corecta si semnatura live se potriveste.
- Decizie necesara de la utilizator/orchestrator: fie REVOKE EXECUTE de la authenticated pe `trg_echipe_denumire_implicita()` (functie trigger, nu trebuie apelabila), fie intrare in allowlist dupa triaj. Nu am modificat nimic (out of scope).

## Deviations from Plan
- Task 1 a fost rezolvat de orchestrator inainte de acest executor; migrarea a fost aplicata de el prin Supabase MCP (nu de mine). Nu s-a gasit niciun bug RPC; nu a fost nevoie de patch live.
- Fisierul migrarii era deja urmarit din 41-01 (nu s-a pierdut nimic prin gitignore).

## Known Stubs
None.

## Threat Flags
None. T-41-16 mitigat (checks 1-2, anon fara EXECUTE), T-41-17 mitigat (check 15 + reziduuri 0), T-41-20 acceptat (30 randuri audit_log).

## Self-Check: PASSED
- 5d878e60, ef95a006 exista; `tests/categorii_admin_faza41.ts` si migrarea exista si sunt urmarite.
