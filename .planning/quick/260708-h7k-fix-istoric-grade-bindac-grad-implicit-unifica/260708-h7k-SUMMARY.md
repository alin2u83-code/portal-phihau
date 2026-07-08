---
status: complete
---

# Quick Task 260708-h7k: Fix istoric grade Bindac + grad implicit sportiv nou + unifica matching grad import — Summary

## What was built

### 1. Fix bug: istoric examinări/grade lipsă în profil sportiv (BINDAC ALEXANDRU DANUT)

**Simptom**: tab "Evoluție & Grade" arăta doar 5 din 9 rânduri reale din `istoric_grade` pentru sportiv, inclusiv gradul lui actual lipsă.

**Cauza root**: `hooks/useDataProvider.ts` interoga `vedere_istoric_grade_sportiv` complet nefiltrat pentru orice rol non-SPORTIV (spre deosebire de `inscrieriExamene`, care avea deja `.eq('club_id', clubId)`). Cerea tot tabelul `istoric_grade` din federație (2032 rânduri), lovind plafonul implicit PostgREST de 1000 rânduri/request — pierdere silențioasă, fără eroare vizibilă. Filtrul simplu de club nu era suficient (un singur club avea 1514 rânduri, tot peste plafon), și view-ul expunea `istoric_grade.club_id` brut, populat inconsistent (NULL pe rânduri vechi din migrări).

**Fix aplicat**:
- `hooks/useDataProvider.ts` — scoping pe `sportiv_id` (listă din clubul activ) + paginare reală cu `.range()` în buclă (`fetchAllPages`), evită trunchierea la 1000 rânduri atât pentru fetch club-scoped cât și federație.
- Migrare SQL (aplicată live pe Supabase, `wuhidifzsutwgdfkwhmd`) — view `vedere_istoric_grade_sportiv` recreat cu `COALESCE(s.club_id, hg.club_id) AS club_id`, derivat din `sportivi.club_id`, simetric cu `vedere_detalii_examen`.

**Verificare**: confirmat cu Playwright — toate cele 8 rânduri valide (grad_id populat) apar acum; al 9-lea rând are `grad_id = NULL` real în DB (dată incompletă istorică, corect exclus, nu bug).

### 2. Grad implicit la înregistrare sportiv nou (+ retroactiv)

**Cauza root**: exista deja un trigger `BEFORE INSERT` pe `sportivi` (`set_default_grade_for_new_sportiv`) menit să seteze automat primul grad, dar căuta `WHERE ordine = 0 OR nume ILIKE '%Centura Alba%'` — condiție moartă, pentru că gradul minim real are `ordine = 1` și se numește "Debutant". Trigger-ul rula pe fiecare insert dar nu găsea niciodată rând, lăsând `grad_actual_id` NULL silențios.

**Fix aplicat**:
- Migrare SQL (aplicată live) — funcția trigger rescrisă: `SELECT id FROM grade ORDER BY ordine ASC LIMIT 1` în loc de condiția moartă. Acoperă automat toate căile de creare sportiv (formular manual, import CSV/Excel, înregistrare online) fără modificare de cod în fiecare punct.
- `services/importSportiviService.ts` — aceeași eroare exista și în JS (`findGradeId` cu `g.ordine === 0`); înlocuită cu selecție dinamică a gradului cu ordine minimă din array-ul `grade` primit ca parametru.
- **Retroactiv** (aplicat live, cu confirmare user înainte): 5 sportivi fără grad identificați (COSTEA Ștefan Andrei, HOGAȘ Ilinca Oteea, HOGAȘ Raul Ștefan, MOROȘANU Iasmina — Kim Long Dao Fălticeni; CHIRILEASA Stefan — C.S. Phi Hau) → `grad_actual_id` setat la Debutant. Verificat `istoric_grade` populat automat prin trigger existent `tr_sync_grad_history` pentru toți 5. Confirmare finală: 0 sportivi fără grad rămași.

### 3. Unificare parțială import bulk examen (grad matching)

**Context**: 3 componente de import găsite în `components/GestiuneExamene/`: `ImportExcelExamen.tsx` (XLS rezultate în sesiune existentă, folosea deja engine-ul comun), `ImportSportiviExamen.tsx` (scop diferit — nu duplică), `ImportExamenModal.tsx` (CSV, creare sesiuni noi, 3 formate own/grila/federatie — logică proprie complet separată, motiv pentru care commit-ul 4ce82c5 a trebuit să aplice fix-ul de import separat și acolo).

**Ce s-a unificat**: `findGradeOrdine` din `ImportExamenModal.tsx` acum delegă la `matchGrad` din `services/importExcelExamenService.ts` în loc de propria logică fuzzy fără aliasuri de grad. Verificat cu Playwright: CSV cu "1 cr" rezolvat corect la "1 Câp Roșu (6)".

**Ce NU s-a unificat (decizie explicită)**: matching-ul de sportivi (`stringSimilarity` Jaccard din modal vs. `matchSportiv` Levenshtein din engine-ul comun) — algoritmi și praguri fundamental diferite calibrate pe fluxuri live; înlocuire "oarbă" ar risca schimbări silențioase la auto-potrivire/conflict/sportiv-nou pe date financiare/identitate sportiv. Recomandare: sesiune separată dedicată cu test de regresie pe CSV-uri istorice reale înainte de swap.

## Files modified

- `hooks/useDataProvider.ts`
- `services/importSportiviService.ts`
- `components/GestiuneExamene/ImportExamenModal.tsx`
- Migrări Supabase (proiect `wuhidifzsutwgdfkwhmd`, nu în git — `sql/` gitignored per convenție repo):
  - `fix_set_default_grade_use_min_ordine`
  - `fix_vedere_istoric_grade_sportiv_club_id`

## Verification

- `tsc --noEmit` — trece fără erori.
- Playwright: profil Bindac (istoric complet), import CSV grad matching ("1 cr" → "1 Câp Roșu").
- SQL: query `count(*) FILTER (WHERE grad_actual_id IS NULL)` → 0 după retroactiv.

## Deferred / notable decisions

- Unificarea completă a matching-ului de sportivi (Jaccard vs Levenshtein) în `ImportExamenModal.tsx` amânată deliberat — risc financiar/identitate, necesită test de regresie dedicat pe date istorice reale. Vezi Phase 24 din ROADMAP.md pentru continuare.

## Known Stubs

None.

## Threat Flags

None nou introduse — fix-urile reduc suprafața de bug (pierdere silențioasă date), nu adaugă risc.

## Self-Check

- `hooks/useDataProvider.ts` — FOUND (modificat, commit `94a4c7a`)
- `services/importSportiviService.ts` — FOUND (modificat, commit `94a4c7a`)
- `components/GestiuneExamene/ImportExamenModal.tsx` — FOUND (modificat, commit `94a4c7a`)
- Migrări Supabase — aplicate live, verificate prin query count

## Self-Check: PASSED
