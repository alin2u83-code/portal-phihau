# Phase 18: Fix suprascriere silentioasa grad in istoric_grade - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Elimina dual-write-ul contradictoriu pe `sportivi.grad_actual_id`: azi coexista 4 trigger-uri DB redundante/contradictorii pe `istoric_grade` + 5 locuri in frontend care scriu direct pe `sportivi.grad_actual_id` (ocolind data reala a examenului). Faza unifica sursa de adevar: `grad_actual_id` devine strict derivat din `istoric_grade`, printr-un singur trigger canonic, cu regula "cel mai mare grad obtinut vreodata" (monoton). Frontend-ul nu mai scrie niciodata direct pe `grad_actual_id` — doar insereaza in `istoric_grade` cu data reala a evenimentului (examen/inregistrare/corectie manuala).

</domain>

<decisions>
## Implementation Decisions

### Regula de calcul grad_actual_id
- **D-01:** `grad_actual_id` = gradul cu cel mai mare `ordine` din tot `istoric_grade` al sportivului (MAX ordine, NU cel mai recent cronologic). Un sportiv nu "retrogradeaza" automat niciodata prin inserare de randuri cu data mai veche.
- **D-02:** Retrogradarea legitima (corectie eroare) se face prin DELETE pe randul gresit din `istoric_grade`, nu prin insert cu grad mai mic. Trigger-ul de recalcul trebuie sa ruleze si pe DELETE (recalculeaza MAX din ce a ramas).

### Sursa unica de adevar (elimina dual-write)
- **D-03:** Elimina COMPLET update-urile directe pe `sportivi.grad_actual_id` din frontend. Locuri identificate care trebuie schimbate sa insereze doar in `istoric_grade` (cu data reala a evenimentului, nu `CURRENT_DATE`):
  - `components/GestiuneExamene/ManagementInscrieri.tsx` — liniile ~1154, ~1236, ~1323 (3 update-uri directe)
  - `hooks/useExamManager.ts` — linia ~169
  - `components/GestiuneExamene/RapoarteExamen.tsx` — linia ~269
  - `components/GestiuneExamene/ImportExamenModal.tsx` — linia ~609 (verifica daca e acelasi pattern)
- **D-04:** Dupa fix, `grad_actual_id` e strict derivat — niciun `.update({grad_actual_id: ...})` direct pe tabelul `sportivi` nu mai trebuie sa existe in codebase (cu exceptia trigger-ului DB insusi si a inserarii initiale la creare sportiv nou, care ramane insert normal cu grad Debutant).

### Consolidare trigger-e DB (gasite live pe proiectul Supabase `wuhidifzsutwgdfkwhmd`)
- **D-05:** Cele 3 trigger-uri redundante pe `istoric_grade` care fac "latest by data_obtinere" trebuie **consolidate intr-unul singur** cu regula MAX(ordine) din D-01:
  - `trg_after_history_change` → `fn_sync_sportiv_grad_from_history`
  - `trg_sync_grad_actual_from_istoric` → `sync_grad_actual_from_istoric_grade`
  - `trg_sync_grade_on_history_change` → `fn_refresh_sportiv_grade`
- **D-06:** `trg_sync_grad_actual_manual` (`sync_grad_actual_on_manual_grade`) — deja foloseste logica de "doar daca ordine mai mare", cea mai apropiata de regula noua D-01. Poate fi baza noului trigger canonic unic, dar trebuie extins sa gestioneze si DELETE (recalcul MAX dupa stergere) si sa nu mai depinda de ordinea alfabetica de executie fata de celelalte 3 (care se sterg).
- **D-07:** `tr_sync_grad_history` pe tabelul `sportivi` (AFTER UPDATE, `fn_sync_grad_to_history`) insereaza in `istoric_grade` cu `data_obtinere = CURRENT_DATE` cand `grad_actual_id` se schimba direct — **aceasta e sursa bug-ului de suprascriere silentioasa cu data gresita**. Dupa D-03/D-04 (frontend nu mai scrie direct grad_actual_id), acest trigger devine dead code — planul trebuie sa decida explicit: DROP TRIGGER sau pastrat ca fallback de siguranta (safety net) daca totusi cineva scrie direct. Recomandare implicita: DROP, dat fiind ca D-04 il face redundant si e chiar cauza bug-ului.
- **D-08:** `trigger_ajusteaza_debutant_la_import` (`ajusteaza_debutant_la_import_examen`) — ramane neschimbat, nu e parte din bug, doar backfill istoric la import examen cu data anterioara inscrierii.
- **D-09:** Constraint `istoric_grade_sportiv_grad_unique` (folosit de `ON CONFLICT`) — pastreaza-l; regula de business existenta e ca un sportiv nu poate avea 2 randuri de istoric pentru acelasi grad. Verifica daca noua logica de insert (fara upsert conditionat pe superioritate in frontend) respecta in continuare acest constraint, sau daca planul trebuie sa gestioneze conflictul explicit (ON CONFLICT DO NOTHING / DO UPDATE data).

### Backfill date corupte in istoric_grade (audit, nu fix automat)
- **D-10:** Faza include un query de audit (RAPORT, nu UPDATE) care identifica randurile suspecte din `istoric_grade`: `observatii = 'Schimbare automată grad (Update Profil)'` SAU `observatii` similar generat de vechiul trigger `tr_sync_grad_history`, unde `data_obtinere` probabil nu reflecta data reala a examenului. Output: lista sportiv + grad + data suspecta, pentru decizie manuala ulterioara a utilizatorului — planul NU trebuie sa corecteze automat aceste randuri.

### Claude's Discretion
- Denumirea exacta a noului trigger/functie canonica (poate refolosi `sync_grad_actual_on_manual_grade` extinsa, sau functie noua) — decizie tehnica de research/plan.
- Daca `metoda_selectie_grad` (coloana folosita de `sync_grad_actual_from_istoric_grade` pentru a marca 'automat'/'manual') se pastreaza in noul trigger unic — verifica daca e folosita in UI inainte de a o elimina.
- Ordinea exacta de migrare (DROP trigger-e vechi inainte/dupa CREATE trigger nou) — atentie sa nu existe fereastra fara niciun trigger activ.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Memorie proiect (audit original)
- `C:\Users\lungu\.claude\projects\C--Users-lungu-portal-phihau\memory\project_audit_complet_20260706.md` — auditul complet 2026-07-06 care a identificat acest bug si a creat Phase 18 in roadmap

### Cod frontend afectat (dual-write, de eliminat)
- `services/sportivService.ts` — pattern CORECT de referinta (insert/upsert direct in `istoric_grade`, liniile 17-25 si 117-126) — model pentru cum trebuie sa arate toate celelalte locuri dupa fix
- `components/GestiuneExamene/ManagementInscrieri.tsx` — 3 update-uri directe pe `grad_actual_id` (liniile ~1148-1158, ~1230-1240, ~1317-1327) de eliminat/rescris
- `hooks/useExamManager.ts` — update direct linia ~158-191, are deja comentariu inline despre bug-ul cunoscut ("grad_actual_id necondiționat — vezi bug-ul din secțiunea de sincronizare")
- `components/GestiuneExamene/RapoarteExamen.tsx` — update direct linia ~261-283, are deja comentariu inline ("Aceasta este pasul care lipsea și cauza bug-ul: sportivi.grad_actual_id")
- `components/GestiuneExamene/ImportExamenModal.tsx` — linia 609, verifica daca acelasi pattern

**Nota:** codul frontend are DEJA comentarii care documenteaza constientizarea partiala a bug-ului (vezi useExamManager.ts si RapoarteExamen.tsx) — semn ca a fost patch-uit ad-hoc de mai multe ori fara fix la sursa.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/sportivService.ts` (liniile 17-25, insert initial) — pattern de INSERT in `istoric_grade` cu `observatii: 'Înregistrare inițială'`, poate fi replicat pentru celelalte locuri

### Established Patterns
- Guard-ul "actualizeaza doar daca noul grad e superior celui curent" e duplicat manual in 5 locuri in frontend (comparand `ordine` local) — dupa fix, aceasta logica se muta O SINGURA DATA in trigger-ul DB canonic (D-01/D-06), frontend-ul doar insereaza fara sa mai verifice superioritatea

### Integration Points
- Toate cele 4 trigger-uri + `tr_sync_grad_history` traiesc live pe Supabase (proiect `wuhidifzsutwgdfkwhmd`), NU doar in fisiere de migratie — orice modificare trebuie aplicata live prin Supabase MCP `apply_migration`, la fel ca in fazele anterioare (vezi `feedback_audit_rls_verifica_live_nu_doar_migratii` din memorie: verifica intotdeauna pg_policies/pg_trigger live, nu doar migratiile comise)

</code_context>

<specifics>
## Specific Ideas

Definitiile complete ale celor 5 functii trigger gasite live (pentru referinta research/plan, nu trebuie re-interogate):

```sql
-- trg_after_history_change → fn_sync_sportiv_grad_from_history (latest by data_obtinere)
-- trg_sync_grad_actual_from_istoric → sync_grad_actual_from_istoric_grade (latest by data_obtinere, seteaza si metoda_selectie_grad)
-- trg_sync_grad_actual_manual → sync_grad_actual_on_manual_grade (DOAR daca ordine nou > ordine curent — cea mai apropiata de regula noua D-01)
-- trg_sync_grade_on_history_change → fn_refresh_sportiv_grade (latest by data_obtinere, AFTER, return NULL)
-- tr_sync_grad_history (pe sportivi, AFTER UPDATE) → fn_sync_grad_to_history (INSERT istoric_grade cu CURRENT_DATE cand grad_actual_id se schimba direct — SURSA BUG-ULUI)
```

Research-ul trebuie sa re-verifice live inainte de a scrie migratia finala (semnaturi pot fi usor diferite la momentul executiei).

</specifics>

<deferred>
## Deferred Ideas

None — discutia a ramas in scope-ul fazei.

</deferred>

---

*Phase: 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse*
*Context gathered: 2026-09-06*
