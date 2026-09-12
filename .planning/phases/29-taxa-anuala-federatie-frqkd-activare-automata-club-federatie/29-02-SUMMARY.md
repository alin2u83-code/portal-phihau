---
phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie
plan: 02
subsystem: database
tags: [postgres, plpgsql, trigger, security-definer, rls, plati]

requires:
  - phase: 29-01
    provides: "taxa_anuala_config, indecsi unici pe (club_id,an_fiscal)/(sportiv_id,an), 29-SCHEMA-AUDIT.md cu verdictele B1-B6"
provides:
  - "public.an_fiscal_federatie(date) — granita fixa 1 septembrie"
  - "public.activeaza_taxa_anuala(uuid) SECURITY DEFINER — activare idempotenta taxa FRQKD"
  - "public.trg_activeaza_taxa_anuala() + 4 triggere AFTER INSERT (examene/stagii_cvd/stagii/competitie)"
  - "sql/migrations/test_taxa_anuala_federatie_260912.sql — suita T1-T4 rulabila oricand, tranzactionala"
affects: [29-03, 29-04]

tech-stack:
  added: []
  patterns:
    - "Trigger generic parametrizat prin TG_ARGV[0] + to_jsonb(NEW)->>col, in loc de 4 functii trigger aproape identice"
    - "Gate de idempotenta prin INSERT ... ON CONFLICT DO NOTHING RETURNING id INTO v_id; IF v_id IS NULL THEN RETURN; END IF;"
    - "Get-or-create + increment pe UPDATE (nu recalculare prin agregare) pentru siguranta la concurenta"
    - "Test SQL tranzactional cu SAVEPOINT + ROLLBACK TO pentru scenariul de esec, urmat de ROLLBACK final — zero urme in productie"

key-files:
  created:
    - sql/migrations/taxa_anuala_federatie_trigger_260912.sql
    - sql/migrations/test_taxa_anuala_federatie_260912.sql
  modified: []

key-decisions:
  - "B2 (FORCE RLS pe plati/deconturi_federatie/decont_sportivi/vize_sportivi) rezolvat FARA politici RLS noi: verificat live ca rolul postgres (proprietarul functiei SECURITY DEFINER) are rolbypassrls=true, care are prioritate asupra FORCE ROW LEVEL SECURITY. Nu s-a folosit NO FORCE ROW LEVEL SECURITY — izolarea cross-club din Faza 25 ramane intacta."
  - "status_viza folosit in functie: 'Activ' (valoarea reala din CHECK live, verdict B3 din 29-01), nu 'Activa' din spec"
  - "gen in categorii_competitie de test: 'Masculin' (CHECK real ANY('Feminin','Masculin','Mixt')) — descoperit prin eroare la prima rulare a testului, corectat inainte de commit"

patterns-established:
  - "Orice test SQL pe date financiare de productie se scrie BEGIN...ROLLBACK cu SAVEPOINT explicit pentru scenariile de esec, niciodata COMMIT"

requirements-completed: [TAF-04, TAF-05]

duration: ~25min
completed: 2026-09-12
---

# Phase 29 Plan 02: Activare automata taxa anuala FRQKD

**Functie SECURITY DEFINER + 4 triggere AFTER INSERT transforma automat prima participare a unui sportiv intr-un sezon in factura FRQKD + decont club, validat de o suita de test tranzactionala cu 4 scenarii.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- `an_fiscal_federatie(date)` + `activeaza_taxa_anuala(uuid)` SECURITY DEFINER aplicate live, cu blocajul B2 (FORCE RLS) investigat si rezolvat corect (bypassrls pe rolul proprietar, nu politici noi)
- 4 triggere AFTER INSERT instalate pe `inscrieri_examene`, `stagii_cvd_participare`, `participare_stagiu` (coloana corecta `practicant_id`), `inscrieri_competitie`, toate prin acelasi trigger generic parametrizat
- Suita de test T1-T4 rulata live intr-o tranzactie cu ROLLBACK: idempotenta, agregare per club, separare intre cluburi si esec controlat pe lipsa pret — toate au trecut, zero efect asupra datelor reale (37 facturi FRQKD neschimbate, zero cluburi de test reziduale)

## Task Commits

1. **Task 1: Functie + trigger generic + 4 triggere** - `c5c7f16` (feat)
2. **Task 2: Suita de test T1-T4** - `59930ca` (test)

## Files Created/Modified
- `sql/migrations/taxa_anuala_federatie_trigger_260912.sql` - functiile si triggerele, aplicata live
- `sql/migrations/test_taxa_anuala_federatie_260912.sql` - script de test tranzactional (nu migratie)

## Decisions Made
Vezi `key-decisions`. Cea mai importanta: rezolvarea B2 prin verificare `rolbypassrls` in loc de a adauga politici RLS suplimentare pe cele 4 tabele — mai simplu si fara suprafata noua de atac.

## Deviations from Plan

### Auto-fixed Issues

**1. Valoare gresita pentru `categorii_competitie.gen` in scriptul de test**
- **Found during:** Task 2, prima rulare a suitei de test
- **Issue:** Scriptul folosea `'M'` pentru `gen`, dar CHECK-ul live accepta doar `'Feminin' / 'Masculin' / 'Mixt'` — eroare `23514 check constraint categorii_competitie_gen_check`
- **Fix:** Inlocuit cu `'Masculin'`
- **Files modified:** `sql/migrations/test_taxa_anuala_federatie_260912.sql`
- **Verificare:** Rerulare completa a suitei, toate T1-T4 au trecut
- **Committed in:** `59930ca` (fix inclus in fisierul final, prima rulare esuata nu a lasat urme — intreaga tranzactie a fost anulata automat de Postgres la eroare)

---
**Total deviations:** 1 auto-fixed (eroare de date de test, nu de logica functiei)
**Impact on plan:** Fara scope creep — corectie minora intr-un fisier de test.

## Issues Encountered
Niciuna in afara deviatiei de mai sus.

## User Setup Required

None - nicio configurare externa necesara.

## Next Phase Readiness

29-03 (tipuri TS + UI modal confirmare plata) poate porni: mecanismul de activare este complet functional si testat live. 29-04 (tab admin pret sezon) trebuie sa aminteasca utilizatorului ca lipsa pretului blocheaza TOATE inscrierile din sistem (T-29-11, risc acceptat explicit de utilizator) — merita un banner de avertizare preventiv cand sezonul urmator nu are inca un pret configurat.

---
*Phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie*
*Completed: 2026-09-12*
