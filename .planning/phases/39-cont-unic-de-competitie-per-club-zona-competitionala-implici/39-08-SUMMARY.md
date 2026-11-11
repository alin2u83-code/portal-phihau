---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 08
subsystem: database
tags: [supabase, audit, rls, plpgsql, competitii]
requires:
  - phase: 39-01
    provides: cont_club_curent(), conturi_competitie_club
provides:
  - sesiuni_actor_competitie + RPC deschide_sesiune_actor / sesiune_actor_curenta / inchide_sesiune_actor / instructori_club_cont
  - audit_trigger_fn extins (actor din sesiune, rand_id tolerant, diff pe date minori)
  - 7 triggere audit pe tabelele wizardului, jurnal vizibil pe roluri
affects: [39-11, 39-12, 39-13, 39-16]
key-files:
  created:
    - supabase/migrations/20261111d_autor_modificari.sql
  modified:
    - .planning/phases/39-cont-unic-de-competitie-per-club-zona-competitionala-implici/39-AUDIT-LIVE.md
    - tests/acl_definer_faza37.allowlist.json
key-decisions:
  - "Expirare sesiune actor = 4 ore de inactivitate; activitatea glisanta se reimprospateaza din trigger cel mult o data pe minut"
  - "audit_inscrieri_competitie exista deja live -> nu se recreeaza (7 triggere noi, nu 8)"
  - "Actorul se citeste doar din sesiune pe auth.uid(), niciodata din NEW/OLD"
requirements-completed: [D-06, D-07, D-19, D-20]
completed: 2026-11-11
---

# Faza 39 Plan 08: Autorul modificarilor (DB) Summary

**Migrarea 20261111d (NEAPLICATA): sesiune de actor pe server, audit_trigger_fn tolerant cu actor din sesiune, 7 triggere pe tabelele wizardului si jurnal pe roluri.**

## Ce s-a livrat
- `supabase/migrations/20261111d_autor_modificari.sql`: tabela `sesiuni_actor_competitie` (user_id PK = un dispozitiv per cont), 4 coloane noi in `audit_log` + index, RPC-urile actor, `audit_trigger_fn()` rescrisa, triggerele `audit_echipe_competitie`, `audit_echipa_sportivi`, `audit_solicitari_echipe_incomplete`, `audit_cereri_coechipier`, `audit_istoric_grade`, `audit_competitie_sportiv_arme`, `audit_sportiv_arme`, politicile `urm_cont_club_vede_staff`, `audit_log_select_jurnal_club`, `ext_r_audit_log_sel/ins/upd/del` (inlocuiesc `ext_r_deny_all`), REVOKE/GRANT, rollback.
- `tests/acl_definer_faza37.allowlist.json`: +3 functii definer (`deschide_sesiune_actor`, `inchide_sesiune_actor`, `sesiune_actor_curenta`).
- `39-AUDIT-LIVE.md`: sectiunea Etapa 2.

Commit: `989bb6f`.

## Deviations from Plan

### 1. [Limitare mediu] Task 1 (audit LIVE) doar partial
- **Cauza:** subagentul nu are MCP Supabase; catalogul (`pg_proc`, `pg_policies`, `pg_trigger`) nu e accesibil prin PostgREST.
- **Ce s-a facut:** coloane + chei primare pentru tabelele D-20 din OpenAPI-ul PostgREST (live, fara date). Punctele (1), (3), (4), (6), (7) sunt marcate NERULAT, cu interogarile gata de rulat in 39-11.
- **Consecinta:** `audit_trigger_fn` e scrisa din fisierul `sql/migrations/audit_triggers_sensibile.sql`, nu din textul live. Migrarea are in antet o PRECONDITIE: compara cu `pg_get_functiondef` live inainte de aplicare. Rollback-ul contine textul din fisier.
- **Concluzia despre insert-ul extern in audit_log** nu e demonstrata live; rationament in AUDIT-LIVE (owner postgres BYPASSRLS, deja auditat `inscrieri_competitie`) + test obligatoriu in 39-11.

### 2. [Plan] inscrieri_competitie fara trigger nou
Auditul etapei 1 (punct 9) arata `audit_inscrieri_competitie` deja live; planul il cerea doar daca lipsea.

### 3. [Rule 2] Hardening mic in audit_trigger_fn
Sesiunea e citita intr-un bloc `EXCEPTION WHEN OTHERS` (nu pica scrierea din cauza auditului de actor, T-39-42); `ultima_activitate` se actualizeaza cel mult o data pe minut (fara rescriere per rand auditat). Semantica de expirare de 4 ore ramane glisanta, cu granularitate de 1 minut.

## Verificari
- Verificat (static): toate grep-urile de acceptanta: 29 (>=8), 0 cast `(NEW.id)::uuid`, 2x `interval '4 hours'`, 7 triggere, 0 `FORCE ROW LEVEL` in cod, 0 citiri de actor din NEW/OLD; allowlist JSON valid, 3 semnaturi noi.
- NEVERIFICAT: SQL-ul nu a fost rulat nici macar pe o instanta locala (sintaxa/semantica plpgsql de validat la aplicare in 39-11); niciun test live; nimic aplicat live.

## Known Stubs
Niciunul.

## Riscuri de urmarit (39-11)
- Compara textul live al `audit_trigger_fn` inainte de aplicare (vezi PRECONDITIE).
- `istoric_grade.observatii` (text liber) ramane in randul auditat la INSERT/DELETE; diferenta-doar se aplica numai la UPDATE.
- Triggerul pe `istoric_grade` va genera randuri de audit la importuri/examene masive (volum); de urmarit.
- Test live obligatoriu: insert extern pe `echipe_competitie` -> rand in audit_log cu `actor_nume`; contul de club nu citeste audit_log; instructorul vede doar randurile proprii; `acl_definer_faza37`.

## Self-Check: PASSED
- Fisiere gasite: migrarea, allowlist, 39-AUDIT-LIVE.md. Commit `989bb6f` existent.
