# Phase 18: Fix suprascriere silențioasă grad în istoric_grade - Research

**Researched:** 2026-09-06
**Domain:** Postgres triggers (Supabase), React/TypeScript frontend write patterns
**Confidence:** MEDIUM (frontend analysis HIGH; DB trigger bodies MEDIUM — see critical gap below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Regula de calcul grad_actual_id**
- **D-01:** `grad_actual_id` = gradul cu cel mai mare `ordine` din tot `istoric_grade` al sportivului (MAX ordine, NU cel mai recent cronologic). Un sportiv nu "retrogradează" automat niciodată prin inserare de rânduri cu dată mai veche.
- **D-02:** Retrogradarea legitimă (corecție eroare) se face prin DELETE pe rândul greșit din `istoric_grade`, nu prin insert cu grad mai mic. Trigger-ul de recalcul trebuie să ruleze și pe DELETE (recalculează MAX din ce a rămas).

**Sursa unică de adevăr (elimină dual-write)**
- **D-03:** Elimină COMPLET update-urile directe pe `sportivi.grad_actual_id` din frontend. Locuri identificate care trebuie schimbate să insereze doar în `istoric_grade` (cu data reală a evenimentului, nu `CURRENT_DATE`):
  - `components/GestiuneExamene/ManagementInscrieri.tsx` — liniile ~1154, ~1236, ~1323 (3 update-uri directe)
  - `hooks/useExamManager.ts` — linia ~169
  - `components/GestiuneExamene/RapoarteExamen.tsx` — linia ~269
  - `components/GestiuneExamene/ImportExamenModal.tsx` — linia ~609 (verifică dacă e același pattern)
- **D-04:** După fix, `grad_actual_id` e strict derivat — niciun `.update({grad_actual_id: ...})` direct pe tabelul `sportivi` nu mai trebuie să existe în codebase (cu excepția trigger-ului DB însuși și a inserării inițiale la creare sportiv nou, care rămâne insert normal cu grad Debutant).

**Consolidare trigger-e DB (găsite live pe proiectul Supabase `wuhidifzsutwgdfkwhmd`)**
- **D-05:** Cele 3 trigger-uri redundante pe `istoric_grade` care fac "latest by data_obtinere" trebuie **consolidate într-unul singur** cu regula MAX(ordine) din D-01:
  - `trg_after_history_change` → `fn_sync_sportiv_grad_from_history`
  - `trg_sync_grad_actual_from_istoric` → `sync_grad_actual_from_istoric_grade`
  - `trg_sync_grade_on_history_change` → `fn_refresh_sportiv_grade`
- **D-06:** `trg_sync_grad_actual_manual` (`sync_grad_actual_on_manual_grade`) — deja folosește logica de "doar dacă ordine mai mare", cea mai apropiată de regula nouă D-01. Poate fi baza noului trigger canonic unic, dar trebuie extins să gestioneze și DELETE (recalcul MAX după ștergere) și să nu mai depindă de ordinea alfabetică de execuție față de celelalte 3 (care se șterg).
- **D-07:** `tr_sync_grad_history` pe tabelul `sportivi` (AFTER UPDATE, `fn_sync_grad_to_history`) inserează în `istoric_grade` cu `data_obtinere = CURRENT_DATE` când `grad_actual_id` se schimbă direct — **aceasta e sursa bug-ului de suprascriere silențioasă cu data greșită**. După D-03/D-04 (frontend nu mai scrie direct grad_actual_id), acest trigger devine dead code — planul trebuie să decidă explicit: DROP TRIGGER sau păstrat ca fallback de siguranță. Recomandare implicită: DROP.
- **D-08:** `trigger_ajusteaza_debutant_la_import` (`ajusteaza_debutant_la_import_examen`) — rămâne neschimbat, nu e parte din bug.
- **D-09:** Constraint `istoric_grade_sportiv_grad_unique` (folosit de `ON CONFLICT`) — păstrează-l; verifică dacă noua logică de insert (fără upsert condiționat pe superioritate în frontend) respectă în continuare acest constraint.

**Backfill date corupte în istoric_grade (audit, nu fix automat)**
- **D-10:** Query de audit (RAPORT, nu UPDATE) care identifică rândurile suspecte din `istoric_grade`: `observatii = 'Schimbare automată grad (Update Profil)'` SAU similar generat de vechiul trigger `tr_sync_grad_history`. Output: listă sportiv + grad + dată suspectă, pentru decizie manuală ulterioară a utilizatorului — planul NU trebuie să corecteze automat aceste rânduri.

### Claude's Discretion
- Denumirea exactă a noului trigger/funcție canonică (poate refolosi `sync_grad_actual_on_manual_grade` extinsă, sau funcție nouă).
- Dacă `metoda_selectie_grad` se păstrează în noul trigger unic — **VERIFICAT ÎN ACEASTĂ CERCETARE: DA, este folosit în UI** (vezi secțiunea Common Pitfalls #3 mai jos) — trebuie păstrat.
- Ordinea exactă de migrare (DROP trigger-e vechi înainte/după CREATE trigger nou) — atenție să nu existe fereastră fără niciun trigger activ.

### Deferred Ideas (OUT OF SCOPE)
None — discuția a rămas în scope-ul fazei.
</user_constraints>

## Summary

Bug-ul are un mecanism precis, confirmat prin citirea directă a codului la toate cele 5 call site-uri: fiecare dintre ele face corect (1) un `insert`/`upsert` în `istoric_grade` cu **data reală a evenimentului** (`sesiune.data`, `dataExamen`, etc.), urmat de (2) un `.update({ grad_actual_id: ... })` direct pe `sportivi`, condiționat local pe `ordine nouă > ordine curentă`. Update-ul direct de la pasul (2) declanșează `tr_sync_grad_history` (AFTER UPDATE pe `sportivi`), care reinserează în `istoric_grade` cu `data_obtinere = CURRENT_DATE` — foarte probabil printr-un `ON CONFLICT (sportiv_id, grad_id) DO UPDATE`, care suprascrie silențios data corectă scrisă la pasul (1) cu data curentă a rulării. Asta explică exact titlul fazei: "suprascriere silențioasă" — nu e o eroare vizibilă, codul din pasul (1) reușește, dar trigger-ul din pasul (2) o stinge imediat după.

Eliminarea update-urilor directe (D-03/D-04) e sigură din perspectiva datelor: toate cele 5 locuri au deja disponibilă data reală a evenimentului la momentul inserării în `istoric_grade`, deci simpla eliminare a pasului (2) nu pierde nicio informație — doar oprește trigger-ul defect să se mai declanșeze. Rămâne responsabilitatea trigger-ului canonic unic (D-01/D-06, pe `istoric_grade`) să deriveze `grad_actual_id` din MAX(ordine).

`metoda_selectie_grad` este citit explicit în `components/UserProfile.tsx` (linia 357, 363) pentru a reflecta local rezultatul unei actualizări de grad — deci **trebuie păstrat și populat de noul trigger canonic**, nu poate fi eliminat fără a rupe acest ecran.

**Critical gap:** această sesiune de cercetare NU a avut acces la tool-urile MCP Supabase (`execute_sql`, `list_tables`, `get_advisors`) — funcțiile disponibile în acest mediu nu au inclus niciun `mcp__supabase__*`. Definițiile complete ale celor 5 funcții trigger citate în CONTEXT.md (capturate live într-o sesiune anterioară cu acces MCP, în timpul `/gsd-discuss-phase`) **nu au putut fi re-verificate live în această cercetare**. Nu există nicio copie a acestor trigger-e în `sql/migrations/` sau altundeva în git — confirmă pattern-ul documentat în memoria proiectului (`feedback_audit_rls_verifica_live_nu_doar_migratii`): triggerele astea trăiesc DOAR pe DB, niciodată comise. Planul trebuie să trateze corpul exact al fiecărei funcții (mai ales `ON CONFLICT` clause din `fn_sync_grad_to_history`) ca **needing live re-verification printr-un agent/sesiune cu acces MCP Supabase înainte de a scrie migrația finală** (vezi Open Questions #1).

**Primary recommendation:** Șterge cele 4 trigger-e redundante (`trg_after_history_change`, `trg_sync_grad_actual_from_istoric`, `trg_sync_grade_on_history_change`, și `tr_sync_grad_history` de pe `sportivi`), extinde `sync_grad_actual_on_manual_grade` într-o singură funcție canonică `AFTER INSERT OR UPDATE OR DELETE ON istoric_grade FOR EACH ROW` care calculează `MAX(ordine)` din tot istoricul rămas al sportivului și scrie atât `grad_actual_id` cât și `metoda_selectie_grad`, apoi elimină cele 5 update-uri directe din frontend păstrând insert-urile/upsert-urile existente în `istoric_grade` neschimbate (ele deja au data corectă).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Determinare grad curent sportiv (`grad_actual_id`) | Database (trigger canonic) | — | Single source of truth trebuie impus la nivel DB, nu în 5 locuri de frontend duplicate — orice client (web, import CSV, RPC viitor) beneficiază automat de regula corectă |
| Scriere eveniment grad (examen/import/corecție) | Frontend (INSERT în `istoric_grade`) | — | Frontend cunoaște data reală a evenimentului; nu trebuie să cunoască sau să reimplementeze regula de "cine câștigă" |
| Audit date istorice corupte | Database (query SELECT, rulat manual/ad-hoc) | — | Raport, nu automatizare — decizia de corecție rămâne umană (D-10) |
| Populare `metoda_selectie_grad` pentru UI | Database (trigger canonic) | Frontend (doar citește) | UI (`UserProfile.tsx`) doar citește valoarea după update — sursa trebuie să rămână DB pentru consistență cu `grad_actual_id` |

## Standard Stack

Nu se introduc librării noi. Faza e strict SQL (funcții/trigger-e Postgres pe Supabase) + modificări TypeScript în servicii/componente existente. Nu aplică secțiunea "Package Legitimacy Audit" — zero pachete externe noi.

### Installation
Nu aplică — nicio dependență nouă.

## Architecture Patterns

### System Architecture Diagram (flux actual — BUGGY)

```
[Frontend: ManagementInscrieri / useExamManager / RapoarteExamen / ImportExamenModal]
        │
        ├─(1)─► INSERT/UPSERT istoric_grade { sportiv_id, grad_id, data_obtinere: DATA REALĂ examen }
        │              │
        │              ▼
        │        [trg_after_history_change / trg_sync_grad_actual_from_istoric /
        │         trg_sync_grade_on_history_change] ── scriu grad_actual_id (latest-by-date, redundant x3)
        │
        └─(2)─► UPDATE sportivi SET grad_actual_id = X   (doar dacă ordine nou > curent — guard LOCAL, duplicat în 5 locuri)
                       │
                       ▼
                 [tr_sync_grad_history AFTER UPDATE pe sportivi]
                       │
                       ▼
                 INSERT/UPSERT istoric_grade { data_obtinere: CURRENT_DATE }
                       │
                       ▼
                 ⚠ SUPRASCRIE SILENȚIOS rândul corect din pasul (1) cu data curentă
```

### System Architecture Diagram (flux propus — FIX)

```
[Frontend: 5 call site-uri]
        │
        └─► INSERT/UPSERT istoric_grade { sportiv_id, grad_id, data_obtinere: DATA REALĂ }
                   │  (fără niciun update direct pe sportivi.grad_actual_id)
                   ▼
        [TRIGGER CANONIC UNIC — AFTER INSERT OR UPDATE OR DELETE ON istoric_grade]
                   │
                   ▼
        SELECT MAX(grade.ordine) FROM istoric_grade JOIN grade
        WHERE sportiv_id = NEW.sportiv_id (sau OLD.sportiv_id pe DELETE)
                   │
                   ▼
        UPDATE sportivi SET grad_actual_id = <grad cu MAX ordine>,
                             metoda_selectie_grad = 'automat'
        WHERE id = sportiv_id
```

### Recommended Migration Structure

```sql
-- Migrare unică, aplicată live prin Supabase MCP apply_migration.
-- Ordine: CREATE noul trigger ÎNTÂI (pe funcția existentă redenumită/extinsă),
-- apoi DROP-ează cele 4 vechi, ca să nu existe fereastră fără niciun trigger activ.

BEGIN;

-- 1. Extinde funcția candidat (sync_grad_actual_on_manual_grade) într-o funcție canonică
--    care gestionează INSERT, UPDATE ȘI DELETE, calculând MAX(ordine).
CREATE OR REPLACE FUNCTION public.sync_grad_actual_canonical()
RETURNS TRIGGER AS $$
DECLARE
  v_sportiv_id uuid;
  v_max_grad_id uuid;
BEGIN
  v_sportiv_id := COALESCE(NEW.sportiv_id, OLD.sportiv_id);

  SELECT ig.grad_id INTO v_max_grad_id
  FROM public.istoric_grade ig
  JOIN public.grade g ON g.id = ig.grad_id
  WHERE ig.sportiv_id = v_sportiv_id
  ORDER BY g.ordine DESC
  LIMIT 1;

  UPDATE public.sportivi
  SET grad_actual_id = v_max_grad_id,
      metoda_selectie_grad = 'automat'
  WHERE id = v_sportiv_id
    AND grad_actual_id IS DISTINCT FROM v_max_grad_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Creează noul trigger unic (INSERT/UPDATE/DELETE) ÎNAINTE de a șterge cele vechi.
DROP TRIGGER IF EXISTS trg_sync_grad_actual_canonical ON public.istoric_grade;
CREATE TRIGGER trg_sync_grad_actual_canonical
AFTER INSERT OR UPDATE OR DELETE ON public.istoric_grade
FOR EACH ROW EXECUTE FUNCTION public.sync_grad_actual_canonical();

-- 3. Șterge cele 3 trigger-e redundante pe istoric_grade (D-05).
DROP TRIGGER IF EXISTS trg_after_history_change ON public.istoric_grade;
DROP TRIGGER IF EXISTS trg_sync_grad_actual_from_istoric ON public.istoric_grade;
DROP TRIGGER IF EXISTS trg_sync_grade_on_history_change ON public.istoric_grade;
DROP TRIGGER IF EXISTS trg_sync_grad_actual_manual ON public.istoric_grade;

-- 4. Șterge trigger-ul sursă a bug-ului, de pe sportivi (D-07 — recomandare implicită: DROP).
DROP TRIGGER IF EXISTS tr_sync_grad_history ON public.sportivi;

-- NOTĂ: funcțiile vechi (fn_sync_sportiv_grad_from_history, sync_grad_actual_from_istoric_grade,
-- fn_refresh_sportiv_grade, fn_sync_grad_to_history) pot rămâne definite fără DROP FUNCTION
-- (fără trigger care le apeleze devin dead code inert) — consistent cu pattern-ul din Faza 25-04
-- (get_my_club_ids/get_my_clubs lăsate definite după eliminarea ultimului call-site).

COMMIT;
```

**IMPORTANT — needs live re-verification înainte de a rula:** numele exacte ale trigger-elor (nu doar ale funcțiilor) de mai sus sunt reconstituite din CONTEXT.md, care documentează funcțiile dar nu întotdeauna numele exact al triggerului asociat fiecărei funcții 1:1. Rulează `SELECT tgname, tgrelid::regclass, tgfoid::regproc FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.istoric_grade'::regclass, 'public.sportivi'::regclass);` live înainte de a scrie DROP TRIGGER final, ca să confirmi numele exacte trigger→funcție (pot diferi ușor fața de ce e mai sus).

### Pattern: Frontend call site DUPĂ fix (exemplu — ManagementInscrieri.tsx `handleResultChange`)

```typescript
// ÎNAINTE (bug): insert istoric_grade CORECT + update direct grad_actual_id (declanșează bug-ul)
if (newResult === 'Admis') {
    const newGradId = inscriere.grad_sustinut_id;
    allPromises.push(
        supabase.from('istoric_grade').upsert(
            { sportiv_id: inscriere.sportiv_id, grad_id: newGradId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id, club_id: sesiune.club_id },
            { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true }
        )
    );
    const newGrade = grade.find(g => g.id === newGradId);
    const currentGrade = grade.find(g => g.id === inscriere.grad_actual_id);
    if ((newGrade?.ordine ?? 0) > (currentGrade?.ordine ?? -1)) {
        allPromises.push(
            supabase.from('sportivi').update({ grad_actual_id: newGradId }).eq('id', inscriere.sportiv_id) // ← ELIMINĂ
        );
    }
    sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: newGradId });
}

// DUPĂ (fix): doar insert în istoric_grade; trigger-ul DB canonic derivă grad_actual_id.
// NOTĂ D-09: ignoreDuplicates: true trebuie reevaluat — vezi Common Pitfalls #2.
if (newResult === 'Admis') {
    const newGradId = inscriere.grad_sustinut_id;
    allPromises.push(
        supabase.from('istoric_grade').upsert(
            { sportiv_id: inscriere.sportiv_id, grad_id: newGradId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id, club_id: sesiune.club_id },
            { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true }
        )
    );
    // grad_actual_id nu se mai scrie aici — trigger-ul canonic pe istoric_grade îl derivă.
    // Local state (optimist) rămâne necesar pentru UX imediat, dar SE VA reconcilia
    // la următorul fetch din vedere_cluburi_sportivi / re-fetch (trigger-ul a scris corect în DB).
    sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: newGradId });
}
```

### Anti-Patterns to Avoid
- **Guard de "superioritate" duplicat în frontend:** cele 5 locuri reimplementează manual `if (newOrdine > currentOrdine)` — după fix, această logică există o SINGURĂ dată, în trigger. Nu recrea acest guard în frontend "ca să fii sigur" — devine sursă de discrepanțe UI-vs-DB dacă logica diverge vreodată.
- **Optimistic local state fără reconciliere:** frontend-ul va continua să seteze local `grad_actual_id` optimist (pentru UX). Păstrează acest comportament (nu îl elimina), dar nu te baza pe el ca sursă de adevăr — orice loc care citește `grad_actual_id` din DB (rapoarte, alt tab, refresh) trebuie să vadă valoarea calculată de trigger, nu valoarea optimistă locală neconfirmată.
- **DROP TRIGGER înainte de CREATE noul trigger:** creează o fereastră în care niciun mecanism nu sincronizează `grad_actual_id` — orice INSERT în `istoric_grade` în acea fereastră lasă `sportivi.grad_actual_id` stale. Ordinea din migrarea de mai sus (CREATE nou → DROP vechi) evită asta.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calcul "cel mai mare grad obținut" per sportiv | Recalcul manual în fiecare loc de frontend care scrie istoric | Un singur trigger DB `AFTER INSERT OR UPDATE OR DELETE` | Postgres garantează atomicitate cu tranzacția care a scris rândul; frontend-ul nu poate garanta asta (race condition între 2 tab-uri/useri concurenți) |
| Migrare SQL prin fișier + `supabase db push` | Scriere fișier de migrare local și rulare CLI | `mcp__supabase__apply_migration` (pattern stabilit în acest proiect — vezi Faza 25/27) | Nu există Supabase CLI/psql disponibil în acest mediu (verificat: `command -v supabase`, `command -v psql` — ambele absente); toate migrațiile anterioare din acest proiect au fost aplicate live prin MCP, nu prin fișiere locale |

**Key insight:** Regula de business "cel mai mare grad obținut vreodată" trebuie să trăiască într-un singur loc care rulează în aceeași tranzacție cu scrierea — orice altă abordare (recalcul din frontend, cron job, RPC separat apelat manual) introduce fereastră de inconsistență.

## Common Pitfalls

### Pitfall 1: Suprascriere silențioasă via `ON CONFLICT DO UPDATE` (bug-ul original, mecanism confirmat)
**What goes wrong:** Frontend inserează corect `istoric_grade` cu data reală, apoi face `UPDATE sportivi SET grad_actual_id`. Acest UPDATE declanșează `tr_sync_grad_history`, care reinserează în `istoric_grade` pentru aceeași pereche `(sportiv_id, grad_id)` cu `data_obtinere = CURRENT_DATE`. Dacă acel INSERT folosește `ON CONFLICT (sportiv_id, grad_id) DO UPDATE SET data_obtinere = EXCLUDED.data_obtinere`, rândul corect de mai devreme e suprascris silențios, fără nicio eroare vizibilă.
**Why it happens:** Dual-write — 2 căi separate (frontend direct + trigger derivat) scriu în aceeași pereche cheie, iar ultima câștigă necondiționat pe dată.
**How to avoid:** După fix (D-03/D-04), frontend nu mai declanșează niciodată `tr_sync_grad_history` (trigger-ul e DROP-uit oricum, D-07). Rămâne o singură cale de scriere pe `istoric_grade` (frontend, cu date reale) și o singură cale derivată (trigger canonic, doar citește din `istoric_grade` → scrie pe `sportivi`).
**Warning signs:** Rânduri `istoric_grade` cu `observatii = 'Schimbare automată grad (Update Profil)'` și `data_obtinere` = dată recentă/azi, nepotrivite cu data reală a sesiunii de examen asociate (vezi query de audit D-10 mai jos).

### Pitfall 2: Constraint `istoric_grade_sportiv_grad_unique` + eliminarea guard-ului de superioritate din frontend (D-09)
**What goes wrong:** Toate cele 5 locuri folosesc azi `upsert(..., { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true })` SAU insert simplu condiționat pe "nu există deja" (`ManagementInscrieri.tsx` linia 881 pattern, `useExamManager.ts`/`RapoarteExamen.tsx` fac `SELECT ... maybeSingle()` înainte de INSERT). `ignoreDuplicates: true` înseamnă că la un retake/re-examinare pe același grad (rar, dar posibil — ex. corecție examen picat re-luat), al doilea insert e ignorat silențios, deci data nu se actualizează niciodată dacă rândul pentru acel `(sportiv_id, grad_id)` există deja cu o dată mai veche/incorectă.
**Why it happens:** Constraint-ul unique presupune un singur rând de istoric per grad per sportiv — corect pentru cazul normal, dar ambiguu pentru corecții/retake pe același grad.
**How to avoid:** Planul trebuie să decidă explicit, per call site, dacă păstrează `ignoreDuplicates: true` (comportament actual, sigur dar poate ascunde o corecție de dată legitimă) sau trece la `DO UPDATE SET data_obtinere = EXCLUDED.data_obtinere` (permite actualizarea datei, dar risc: dacă cineva re-inserează din greșeală cu o dată greșită, suprascrie una corectă — problemă similară cu bug-ul original, doar mutată). **Recomandare:** păstrează `ignoreDuplicates: true` pentru consistență cu comportamentul actual (fix-ul de fază nu trebuie să introducă un comportament nou de "ultima dată câștigă" — exact ce se elimină); tratează retake-urile legitime ca fiind acoperite de fluxul D-02 (DELETE manual + re-insert).
**Warning signs:** Rezultat "Admis" marcat de 2 ori pentru același grad la date diferite — al doilea insert nu face nimic vizibil, dar nu aruncă nici eroare (comportament silențios, similar cu bug-ul original — atenție să nu introduci un pitfall nou de aceeași natură).

### Pitfall 3: `metoda_selectie_grad` — eliminare din trigger fără verificare de uz în UI
**What goes wrong:** Dacă noul trigger canonic (bazat pe `sync_grad_actual_on_manual_grade`, care s-ar putea să NU scrie `metoda_selectie_grad` azi — doar `sync_grad_actual_from_istoric_grade` o face, per CONTEXT.md) nu populează coloana, `UserProfile.tsx` (liniile 357/363, `.select('grad_actual_id, metoda_selectie_grad')`) va afișa/folosi o valoare stale sau `NULL`.
**Why it happens:** Consolidarea a 4 funcții într-una singură poate omite accidental o coloană pe care doar UNA dintre cele 4 o scria.
**How to avoid:** **CONFIRMAT în această cercetare (grep, nu doar CONTEXT.md):** `metoda_selectie_grad` este citit activ în `components/UserProfile.tsx`. Trigger-ul canonic din exemplul SQL de mai sus include explicit `metoda_selectie_grad = 'automat'` — planul trebuie să păstreze această linie.
**Warning signs:** Ecranul de profil sportiv (`UserProfile.tsx`) arată "manual"/valoare veche pentru `metoda_selectie_grad` după ce gradul a fost schimbat prin flux de examen (care ar trebui să fie "automat").

### Pitfall 4: Fereastră fără trigger activ în timpul migrării
**What goes wrong:** Dacă migrarea face `DROP TRIGGER` pe cele 4 vechi înainte de a crea trigger-ul nou, orice INSERT/UPDATE/DELETE pe `istoric_grade` în acel interval nu actualizează `sportivi.grad_actual_id` deloc.
**Why it happens:** Ordine naivă de migrare (DROP tot, apoi CREATE).
**How to avoid:** Urmează ordinea din exemplul SQL: CREATE noul trigger ÎNTÂI, DROP-uri vechi DUPĂ, totul într-un singur `BEGIN...COMMIT` (atomicitate DDL Postgres — dacă `apply_migration` rulează totul ca o singură tranzacție, riscul e minim oricum, dar ordinea explicită documentează intenția).
**Warning signs:** N/A dacă migrarea rulează atomic; risc doar dacă `apply_migration` nu wrapping într-o singură tranzacție (verifică comportamentul tool-ului MCP înainte de a presupune atomicitate).

## Code Examples

Vezi secțiunea "Architecture Patterns" de mai sus pentru migrarea SQL completă și exemplul de refactor frontend (ambele scrise cu context real din codul citit, nu generice).

### Query de audit (D-10) — identifică rânduri istoric_grade suspecte

```sql
-- Rulează manual (SELECT only, fără UPDATE) — output pentru decizie umană.
SELECT
    ig.id AS istoric_id,
    s.nume, s.prenume, s.id AS sportiv_id,
    g.nume AS grad_nume, g.ordine,
    ig.data_obtinere,
    ig.observatii,
    ig.sesiune_examen_id,
    se.data AS data_sesiune_examen  -- dacă sesiune_examen_id e NULL, comparația nu se poate face
FROM public.istoric_grade ig
JOIN public.sportivi s ON s.id = ig.sportiv_id
JOIN public.grade g ON g.id = ig.grad_id
LEFT JOIN public.sesiuni_examen se ON se.id = ig.sesiune_examen_id
WHERE
    ig.observatii ILIKE '%Schimbare automată grad%'
    OR ig.observatii ILIKE '%Update Profil%'
    OR (
        ig.sesiune_examen_id IS NOT NULL
        AND se.data IS NOT NULL
        AND ig.data_obtinere <> se.data  -- data_obtinere diferă de data reală a sesiunii asociate
    )
ORDER BY ig.data_obtinere DESC;
```

**Notă:** numele exact al tabelului de sesiuni examen (`sesiuni_examen` presupus din context — verifică live, poate fi `sesiuni_examene` sau altă denumire) și existența coloanei `se.data` trebuie confirmate live înainte de a rula acest query — nu a fost posibil de verificat în această sesiune de cercetare (fără acces MCP).

## State of the Art

Nu aplică direct (nu e o schimbare de librărie/framework) — dar tiparul arhitectural relevant e "single writer, single source of truth via DB trigger" în locul "multiple frontend call sites reimplementând aceeași regulă de business". Acest tipar a mai fost aplicat cu succes în acest proiect: Faza 25-04 a consolidat/eliminat funcții RLS duplicate (`get_my_club_ids`/`get_my_clubs` → helpere context-aware unice) folosind exact același pattern (funcțiile vechi lăsate definite fără DROP, doar trigger-ele/politicile de apel eliminate).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Corpurile exacte ale celor 5 funcții trigger (nume, logică SQL completă, prezența `ON CONFLICT DO UPDATE` în `fn_sync_grad_to_history`) sunt cele documentate în 18-CONTEXT.md, capturate live într-o sesiune anterioară cu acces MCP | Architecture Patterns, Common Pitfalls #1 | Dacă definițiile au drift-uit (alt nume trigger, altă logică de conflict), migrarea SQL propusă poate eșua la DROP TRIGGER (nume greșit) sau poate rata mecanismul exact al bug-ului |
| A2 | Numele tabelului de sesiuni examen e `sesiuni_examen` (folosit în query-ul de audit D-10) | Code Examples | Query-ul de audit eșuează dacă numele real e diferit — planul trebuie să verifice live `list_tables` înainte de a finaliza query-ul |
| A3 | `fn_sync_grad_to_history` folosește `ON CONFLICT ... DO UPDATE SET data_obtinere = CURRENT_DATE` (nu un simplu INSERT care ar arunca eroare de constraint) | Pitfall 1 | Dacă e un INSERT simplu fără ON CONFLICT, mecanismul exact al bug-ului e diferit (ar arunca eroare de unique constraint în loc să suprascrie silențios) — deși simptomul raportat ("suprascriere silențioasă") sugerează puternic ON CONFLICT DO UPDATE, nu a fost confirmat direct în codul sursă al funcției în această sesiune |
| A4 | `apply_migration` (Supabase MCP) rulează conținutul într-o singură tranzacție atomică | Pitfall 4 | Dacă nu e atomic, ordinea CREATE-înainte-de-DROP din migrare devine critică (nu doar stilistică) |

**Dacă acest tabel pare gol la altă rulare:** nu e cazul aici — 4 assumpții cu risc real, toate derivate din imposibilitatea de a rula live queries în această sesiune de cercetare.

## Open Questions

1. **Corpurile SQL exacte ale celor 5 funcții trigger nu au putut fi re-verificate live în această sesiune.**
   - What we know: CONTEXT.md documentează numele funcțiilor/trigger-elor și logica lor pe scurt (latest-by-date x3, ordine-mai-mare x1, plus trigger-ul de pe `sportivi` care inserează cu `CURRENT_DATE`), capturate live într-o sesiune anterioară (`/gsd-discuss-phase`) cu acces la Supabase MCP.
   - What's unclear: Corpul SQL complet, litera-cu-literă, al fiecărei funcții — inclusiv dacă `fn_sync_grad_to_history` chiar folosește `ON CONFLICT DO UPDATE` (vs INSERT simplu) și dacă vreuna dintre cele 3 funcții "latest by date" mai are efecte secundare nemenționate (ex. scrie și altă coloană, sau are condiții WHERE suplimentare).
   - Recommendation: **Planul (sau sesiunea de execuție) trebuie să ruleze live, ÎNAINTE de a scrie migrarea finală:**
     ```sql
     SELECT p.proname, pg_get_functiondef(p.oid)
     FROM pg_proc p
     WHERE p.proname IN (
       'fn_sync_sportiv_grad_from_history', 'sync_grad_actual_from_istoric_grade',
       'sync_grad_actual_on_manual_grade', 'fn_refresh_sportiv_grade',
       'fn_sync_grad_to_history', 'ajusteaza_debutant_la_import_examen'
     );
     SELECT tgname, tgrelid::regclass, tgfoid::regproc, tgtype
     FROM pg_trigger WHERE NOT tgisinternal
     AND tgrelid IN ('public.istoric_grade'::regclass, 'public.sportivi'::regclass);
     ```
     Acest research agent **nu a avut tool-uri MCP Supabase disponibile** în acest mediu de execuție (funcțiile disponibile listate au fost doar Read/Write/Edit/Bash/Grep/Glob/WebSearch/WebFetch — niciun `mcp__supabase__*`). Conform notei din STATE.md/memoria proiectului, subagenții dispatch-uiți (research/executor) tind să nu aibă acces MCP în acest mediu Windows — sesiunea principală/orchestrator (`/gsd-execute-phase` rulat inline, fără subagent worktree, per `feedback_gsd_worktree_infra_esuata_execute_inline`) TREBUIE să facă această verificare înainte de a rula `apply_migration`.
   - **Acesta este blocajul #1 pentru plan — planul trebuie să includă un task explicit de "re-verificare live a corpurilor SQL" ca prim pas, executat de orchestrator/sesiune cu MCP, înainte de task-ul de scriere/aplicare a migrării finale.**

2. **`ignoreDuplicates: true` vs `DO UPDATE` pe upsert-urile din cele 5 call site-uri (D-09).**
   - What we know: Toate cele 5 locuri folosesc azi fie `ignoreDuplicates: true`, fie un `SELECT` de verificare prealabilă + `INSERT` simplu condiționat.
   - What's unclear: Dacă păstrarea comportamentului actual (ignoră duplicate) e suficientă pentru toate scenariile de retake, sau dacă hardening-ul din D-02 (DELETE explicit pentru retrogradare/corecție) acoperă complet cazurile care ar necesita un `DO UPDATE`.
   - Recommendation: Păstrează comportamentul actual per call site (nu introduce o schimbare de semantică neexplicit cerută de user) — documentat ca decizie implicită în Pitfall 2, planul poate re-confirma cu user dacă apare ambiguitate la implementare.

3. **Numele exact al tabelului `sesiuni_examen` folosit în query-ul de audit D-10.**
   - What we know: Frontend-ul citește `sesiune.data` dintr-un obiect `sesiune`/`props.sesiune` — provine dintr-un fetch anterior, tabelul sursă exact nu a fost confirmat prin grep în acest research (nu era necesar pentru fix-ul de cod, dar e necesar pentru query-ul de audit SQL).
   - What's unclear: Numele exact al tabelului (`sesiuni_examen`, `sesiuni_examene`, sau altul).
   - Recommendation: Rulează `list_tables` live sau grep pe `.from('sesiuni` în codebase înainte de a finaliza query-ul de audit din plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP tools (`execute_sql`, `apply_migration`, `list_tables`, `get_advisors`) | Verificare live trigger-e + aplicare migrare | ✗ (în acest research agent) | — | Sesiune principală/orchestrator cu acces MCP trebuie să ruleze verificarea live și `apply_migration` — vezi Open Questions #1 |
| Supabase CLI (`supabase`) | Alternativă la MCP pentru migrare | ✗ (verificat: `command -v supabase` gol) | — | Niciuna necesară — proiectul folosește exclusiv pattern-ul MCP `apply_migration`, nu CLI local |
| `psql` | Alternativă directă la DB | ✗ (verificat: `command -v psql` gol) | — | Niciuna — folosește MCP |

**Missing dependencies with no fallback:**
- Acces MCP Supabase în sesiunea de research curentă — nu blochează planificarea (planul poate fi scris pe baza CONTEXT.md + acest research), dar **blochează execuția** până când un agent/sesiune cu MCP rulează verificarea live din Open Questions #1.

**Missing dependencies with fallback:**
- Supabase CLI / psql — fallback e deja pattern-ul stabilit MCP `apply_migration`, folosit cu succes în Fazele 15/16/25/27/28 anterioare.

## Security Domain

> `security_enforcement` nu e menționat explicit ca `false` în `.planning/config.json` (nu a fost citit direct în această cercetare — presupus enabled per default din instrucțiuni). Totuși, faza NU introduce noi suprafețe de input utilizator, autentificare, sau acces — e o consolidare de trigger-e DB interne + eliminare de dual-write pe un câmp deja RLS-protejat existent. Secțiune redusă corespunzător.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Nu | Nicio schimbare de autentificare |
| V3 Session Management | Nu | N/A |
| V4 Access Control | Parțial | Trigger-ul canonic rulează `SECURITY DEFINER` (pattern existent, vezi și fix-ul `tr_automatizeaza_roluri` din Faza 25-04) — trebuie să opereze cu privilegii ridicate pentru a scrie pe `sportivi` indiferent de RLS-ul apelantului, la fel ca funcțiile pe care le înlocuiește |
| V5 Input Validation | Nu direct | Datele vin din `istoric_grade`, deja validate la insert de constraint-uri existente (FK-uri, unique) |
| V6 Cryptography | Nu | N/A |

### Known Threat Patterns for acest stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Trigger fără `SECURITY DEFINER` care face JOIN pe tabel restricționat RLS, eșuând silent/cu eroare pentru unii apelanți | Denial of Service (parțial) | Confirmă explicit `SECURITY DEFINER SET search_path = public` pe noua funcție canonică — exact bug-ul găsit și fixat în Faza 25-04 pe `tr_automatizeaza_roluri` (trigger fără SECURITY DEFINER → "permission denied for table users") |
| Migrare DDL parțial aplicată (DROP reușește, CREATE eșuează sau invers) lăsând schema într-o stare inconsistentă | Tampering (integritate date) | Rulează migrarea într-un singur `apply_migration` (tranzacție), verifică live imediat după cu query-urile din Open Questions #1 |

## Sources

### Primary (HIGH confidence — cod citit direct în acest repo)
- `services/sportivService.ts` (liniile 1-137) — pattern de referință corect pentru insert/upsert istoric_grade
- `components/GestiuneExamene/ManagementInscrieri.tsx` (liniile 1100-1340) — cele 3 call site-uri D-03, citite integral cu context
- `hooks/useExamManager.ts` (liniile 120-210) — call site D-03, citit integral cu context, conține deja comentariu inline despre bug
- `components/GestiuneExamene/RapoarteExamen.tsx` (liniile 220-300) — call site D-03, citit integral cu context, conține deja comentariu inline despre bug
- `components/GestiuneExamene/ImportExamenModal.tsx` (liniile 520-630) — call site D-03, confirmat: același pattern (insert istoric_grade cu dată reală + update direct condiționat)
- `components/UserProfile.tsx` (liniile 357, 363) — confirmă utilizarea `metoda_selectie_grad` în UI (grep direct)
- `types.ts` (liniile 95, 288, 329-340) — definiții `IstoricGrade`, `metoda_selectie_grad`, `grad_actual_id`
- Grep exhaustiv pe `grad_actual_id\s*:` în tot codebase-ul (53 fișiere cu referințe, subset de write-sites identificat și confirmat = exact cele 5 din CONTEXT.md, zero surprize)

### Secondary (MEDIUM confidence)
- `.planning/phases/18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse/18-CONTEXT.md` — definițiile trigger-elor DB, capturate live într-o sesiune anterioară cu acces MCP Supabase (autoritate mai mare decât training data, dar nu re-verificate în ACEASTĂ sesiune)
- `.planning/phases/18-.../18-DISCUSSION-LOG.md` — confirmă opțiunile alternative discutate, nicio informație nouă față de CONTEXT.md
- Memoria proiectului `feedback_gsd_worktree_infra_esuata_execute_inline.md` — confirmă pattern-ul "sesiune principală inline are MCP, subagenți dispatch-uiți pot să nu aibă"

### Tertiary (LOW confidence — needs validation)
- Numele exact `sesiuni_examen` pentru query-ul de audit D-10 (A2) — nu confirmat, doar inferat din nume de variabile frontend (`sesiune`, `sesiuni`)
- Prezumția `ON CONFLICT DO UPDATE` în `fn_sync_grad_to_history` (A3) — inferat din simptomul "suprascriere silențioasă" descris în titlul fazei, nu confirmat direct din corpul SQL

## Metadata

**Confidence breakdown:**
- Frontend call sites (D-03) și pattern de fix: HIGH — cod citit direct, integral, cu context complet la toate cele 5 locuri
- Trigger-e DB / migrare SQL propusă: MEDIUM — bazat pe CONTEXT.md (capturat live anterior) dar NU re-verificat live în această sesiune (fără acces MCP Supabase)
- `metoda_selectie_grad`: HIGH — confirmat prin grep direct că e folosit în UI
- Query audit D-10: LOW-MEDIUM — logica e corectă dar numele exact de tabel/coloane nu confirmate live

**Research date:** 2026-09-06
**Valid until:** Recomandat re-verificare live imediat înainte de scrierea migrării finale (nu 30 de zile standard) — schema DB e "live-only" (fără git), risc de drift necunoscut între această cercetare și momentul execuției
