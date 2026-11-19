---
phase: 45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar
plan: 03
subsystem: competitii
tags: [rpc, security-definer, live-test, migration-applied]
requires: ["45-01 (migrarea 20261118i)", "45-02 (structuraInitiala)"]
provides:
  - "RPC competitie_cloneaza aplicata live si dovedita pe date efemere + o clona a competitiei reale"
  - "tests/competitie_cloneaza_faza45.ts: baterie live 16 verificari + reziduuri"
affects: [45-04]
key-files:
  created:
    - tests/competitie_cloneaza_faza45.ts
  modified:
    - supabase/migrations/20261118i_competitie_cloneaza.sql
key-decisions:
  - "Decizie user (AskUserQuestion, 19.11.2026): aplica live"
  - "Check 16 alege dintre cele 2 competitii omonime pe cea cu 84 de categorii (cea de referinta 72/2/9/12)"
requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-16]
completed: 2026-11-19
---

# Phase 45 Plan 03: Aplicare live si baterie de teste competitie_cloneaza Summary

Migrarea 20261118i (o singura functie SECURITY DEFINER) e live, iar bateria `tests/competitie_cloneaza_faza45.ts` trece 17/17 (16 verificari + reziduuri); ratchet-ul ACL pica 28/30 din cauza unei functii straine fazei (vezi Issues).

## Decizie (Task 1)

Utilizatorul a ales **aplica** pe 19.11.2026 (AskUserQuestion: "Da, aplica live").

## Aplicare live si verificari pg (Task 2, facute de orchestrator)

- Migrare aplicata prin Supabase MCP, commit 6ba1d68d (header "APLICATA LIVE 19.11.2026", fisier urmarit cu `git add -f`).
- Pre-apply: FORCE RLS pe cele 3 tabele (competitii, probe_competitie, categorii_competitie); `postgres` are bypassrls = true; singurele trigger-e: `trg_competitii_fram_imutabil`, `trg_competitii_updated_at` (competitii) si `audit_categorii_competitie`, `trg_categorie_blocheaza_stergere` (categorii); CHECK-urile tip / status / deadline cum se astepta; nicio constrangere UNIQUE.
- `pg_proc`: prosecdef = true, search_path = `pg_catalog, public`; EXECUTE anon = false, authenticated = true.

## Rezultate baterie live (Task 3)

Toate PASS (rulare finala, exit 0):

| # | Verificare | Rezultat |
|---|-----------|----------|
| 1 | structuraInitiala = {k1,k2,k3,k4,k5,k7}, 1 avertisment (k7), 1 anulata | PASS |
| 2 | ADMIN_CLUB refuzat 42501, nimic creat | PASS |
| 3 | anon refuzat (42501), nimic creat | PASS |
| 4 | clonare super admin: probe 3, categorii 6 | PASS |
| 5 | draft, club/legacy null, date, setari/taxe/FRAM ca sursa, observatii = nota | PASS |
| 6 | probe remapate (3, aceeasi semnatura, tip identic per categorie) | PASS |
| 7 | 6 categorii, numerotate 1..6, activa/nefuzionate, 0 inscrieri/echipe | PASS |
| 8 | categorie straina => 22023, nimic ramas (atomic) | PASS |
| 9 | nume duplicat (majuscule+spatii) => 23505 | PASS |
| 10 | deadline/sfarsit invalide => 22023 | PASS |
| 11 | tip stagiu => 22023 | PASS |
| 12 | p_probe=false cu categorii => 22023 | PASS |
| 13 | probe fara categorii: 3 / 0 | PASS |
| 14 | p_setari=false: locatie/organizator null, 80/120, config implicit, FRAM false | PASS |
| 15 | tip cvd incrucisat: 3 probe, 6 categorii | PASS |
| 16 | competitie reala (clona temporara) | PASS |

Date reale (check 16, sursa = competitia "Juniori 1, Seniori, Veterani" cu 84 categorii, status finalizata, id 3d2187dc): structuraInitiala = **72 incluse / 2 avertismente / 9 anulate / 12 excluse**, exact predictia din cercetare (deci fara drift). Distributie statusuri sursa: activa 66, fuzionata 2, activa+fuzionata 2, anulata 9, impartita 5. Clona a avut 72 categorii numerotate 1..72 (numar si ordine), 4 probe, toate activa; sursa neschimbata dupa apel; clona stearsa.

Reziduuri: competitii ZZ_TEST_FAZA45_ = 0, categorii = 0, utilizatori temporari stersi. audit_log: **196** randuri create in timpul rularii finale (nu se pot sterge; prima rulare, cu un FAIL de test, a mai lasat un numar similar).

## Deviatii

1. **[Rule 1 - bug de test] Check 14 a picat la prima rulare**: comparatia `config_taxe` prin JSON.stringify depindea de ordinea cheilor, iar jsonb o rearanjeaza. Functia era corecta (taxe 80/120, fram false). Comparatia e acum independenta de ordine (`canon`); rularea repetata: 17/17. Nicio modificare a functiei live.
2. **Check 16, doua competitii cu acelasi nume**: `ILIKE '%Juniori 1, Seniori, Veterani%'` gaseste 2 randuri (1551ef52, 74 categorii activa, inscrieri_deschise; 3d2187dc, 84 categorii, finalizata). Planul cerea "exact una"; testul alege deterministic cea cu 84 de categorii (referinta cercetarii), fiind singura care are 72/2/9/12. Daca nu exista exact una cu 84, verificarea pica cu detalii.

## Issues Encountered (ratchet ACL)

`npx tsx tests/acl_definer_faza37.ts` => **28/30, exit 1**. Nu din cauza fazei 45: `competitie_cloneaza` e deja in allowlist si nu e semnalata. Cele 2 FAIL:
- "nicio functie SECURITY DEFINER noua expusa (noi=get_my_grupa_id())" — functia vine din migrarea 20261117a (quick 261117-kiq, commit 8297e723), neinclusa in allowlist;
- self-check de sensibilitate (consecinta directa a aceluiasi extra).

Neatins (in afara scopului, decizie de triaj a userului). Detalii in `deferred-items.md`. Starea STATE/ROADMAP nu a fost actualizata de acest executor din cauza criteriului ACL neindeplinit.

## Self-Check: PASSED (cu exceptia ratchet-ului ACL, vezi Issues)

- tests/competitie_cloneaza_faza45.ts exista si e comis; bateria 17/17, exit 0.
- Reziduuri 0.
