---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 07
subsystem: payments
tags: [typescript, react, supabase, financial-ui, rls]

# Dependency graph
requires:
  - phase: 31-02
    provides: "Pattern payload whitelist D-07 (fix handleSavePlataEdit)"
  - phase: 31-03
    provides: "Modal FacturaDetaliu (plataId, onClose) — logica pura utils/facturaDetaliu.ts"
provides:
  - "Buton 'Detalii' in tab-ul Istoric Financiar (profil sportiv) — punct de intrare INSTRUCTOR catre FacturaDetaliu (D-09)"
  - "Raport verificare live D-09/actiune rapida — marcat NEVERIFICAT, interogari gata de rulare pentru 31-09"
affects: [31-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop optional onDeschideDetalii pe un tab de profil existent — al doilea punct de montare pentru un modal partajat (dupa hub, in 31-04), fara duplicare de logica"

key-files:
  created: []
  modified:
    - components/UserProfile/FinanciarTab.tsx
    - components/UserProfile.tsx

key-decisions:
  - "ClipboardListIcon era deja importat in UserProfile.tsx (folosit in alta parte) — nu a fost nevoie sa se adauge un import nou acolo, doar in FinanciarTab.tsx"
  - "Task 2 marcat NEVERIFICAT: sesiunea de executie nu are acces la Supabase MCP execute_sql — cele 4 interogari SELECT sunt listate mai jos, gata de rulare manuala/de catre 31-09"

patterns-established: []

requirements-completed: [D-08, D-09]

# Metrics
duration: ~20min
completed: 2026-09-26
---

# Phase 31 Plan 07: Punct de intrare INSTRUCTOR in detaliul facturii (D-09) Summary

**Buton "Detalii" adaugat in Istoric Financiar (profil sportiv) + montarea `FacturaDetaliu` in `UserProfile.tsx`, dand INSTRUCTOR-ului acces la ecranul de detaliu factura si actiunea rapida fara a-i deschide listele distructive din hub; verificarea live a premiselor RLS/trigger ramane NEVERIFICATA (fara acces Supabase MCP in aceasta sesiune).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 (Task 2 finalizat ca NEVERIFICAT, conform ramurii explicite din plan)
- **Files modified:** 2

## Accomplishments

- `FinanciarTab.tsx`: prop nou `onDeschideDetalii?: (plataId: string) => void`, destructurat in semnatura, folosit pe un buton "Detalii" adaugat ca **prim** element in bara "Acțiuni" a fiecarei facturi (randat doar cand prop-ul e furnizat — zero schimbare de comportament pentru consumatorii care nu-l folosesc inca).
- `UserProfile.tsx`: import `FacturaDetaliu`, stare noua `plataDetaliuId`, prop `onDeschideDetalii={setPlataDetaliuId}` transmis catre `<FinanciarTab />`, componenta `<FacturaDetaliu plataId={plataDetaliuId} onClose={...} />` montata imediat dupa `<PlataEditModal />`.
- `npm run lint` (tsc --noEmit) — cod 0.
- Toate gardele grep din `<acceptance_criteria>` verificate explicit (vezi mai jos).
- Task 2: cele 4 interogari SELECT read-only cerute de plan sunt documentate mai jos, gata de rulare manuala/de catre planul de verificare umana 31-09 — niciun DDL/DML rulat, niciun fisier nou sub `supabase/migrations/`.

## Task Commits

1. **Task 1: Buton "Detalii" in Istoric Financiar + montarea FacturaDetaliu in profilul sportivului** - `65d213c` (feat)
2. **Task 2: Verificare live READ-ONLY a premiselor D-09 si a actiunii rapide** - fara commit de cod (doar acest SUMMARY.md, documentat mai jos)

## Files Created/Modified

- `components/UserProfile/FinanciarTab.tsx` - prop `onDeschideDetalii` + buton "Detalii" (ClipboardListIcon) inaintea butonului "Editează"
- `components/UserProfile.tsx` - import `FacturaDetaliu`, stare `plataDetaliuId`, prop transmis catre `FinanciarTab`, montarea modalului

## Verificari acceptance (Task 1)

```
onDeschideDetalii count in FinanciarTab.tsx: 4   (interfata, comentariu, destructurare, buton)
<FacturaDetaliu mount count in UserProfile.tsx: 1
onDeschideDetalii={setPlataDetaliuId} count: 1
onDeschideDetalii?: (plataId: string) => void count: 1
onNavigate('plati-scadente') count: 1   (link vechi neatins)
descriere: editedPlata.descriere count: 1   (reparatia 31-02 intacta)
npm run lint: cod 0
```

## Decisions Made

- ClipboardListIcon era deja importat in `UserProfile.tsx` (folosit deja de componenta parinte in alta parte a fisierului) — a fost nevoie sa se adauge import nou doar in `FinanciarTab.tsx`.
- Butonul "Detalii" e primul din bara de actiuni (inaintea "Editează"), consecvent cu instructiunea explicita a planului si cu pattern-ul deja stabilit in 31-04 (TabFacturi).

## Verificare live D-09 / actiune rapida

**Status: NEVERIFICAT — sesiunea de executie nu are acces la Supabase MCP (`execute_sql`).**

Nicio interogare nu a fost rulata pe DB-ul live (proiect `wuhidifzsutwgdfkwhmd`). Conform regulii explicite din plan pentru cazul MCP indisponibil, cele 4 interogari sunt listate mai jos, gata de rulare manuala, si itemul e marcat pentru verificarea umana de final de faza (31-09).

### Interogari de rulat (doar SELECT)

1. Politici RLS pe tabelele financiare implicate:
```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('plati', 'tranzactii', 'tranzactie_plata')
ORDER BY tablename, cmd, policyname;
```

2. Definitiile live ale functiilor de recalculare/procesare:
```sql
SELECT proname, prosecdef, pg_get_functiondef(oid)
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('recalculare_stare_plata', 'on_tranzactie_change', 'proceseaza_plata_factura');
```

3. Trigger-ele active pe cele 3 tabele:
```sql
SELECT tgname, tgrelid::regclass AS tabela, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid IN ('public.tranzactii'::regclass, 'public.tranzactie_plata'::regclass, 'public.plati'::regclass);
```

4. Definitia view-ului consumat de FacturaDetaliu (istoricul de tranzactii, sursa "ambele"):
```sql
SELECT pg_get_viewdef('public.view_plata_sportiv'::regclass, true);
```

### Raspunsuri (a)-(e): NEVERIFICAT pe DB live — context static disponibil in repo

- **(a) Poate INSTRUCTOR face UPDATE pe `plati` din clubul sau?** NEVERIFICAT live. Context: `15-01-SUMMARY.md` documenteaza ca politica `club_member_access` a fost recreata cu predicat per-club pe 8 tabele financiare (`obligatii_plata`, `incasari_efective`, `alocari_plati`, `aplicare_reduceri`, `detalii_decont`, `tranzactie_plata`, `sesiune_activitate`, `staging_inscrieri`) — **`plati` NU e in aceasta lista**, deci politicile efective de pe `plati` nu au fost confirmate de acel audit si necesita interogarea (1) live. Lectia din memoria proiectului (`feedback_audit_rls_verifica_live_nu_doar_migratii.md`) se aplica direct aici: politici pot exista pe DB fara sa fie comise niciodata in `sql/` sau `supabase/migrations/`.
- **(b) `recalculare_stare_plata` aduna alocarile din `tranzactie_plata` sau doar `tranzactii.plata_ids`?** Fisierul din repo `sql/refactor/REFACTOR_FINANCIAL.sql:22-25` arata explicit ca functia calculeaza `v_total_incasat` **doar din `tranzactii.plata_ids`** (`SUM(suma) FROM tranzactii WHERE p_plata_id = ANY(plata_ids)`), fara nicio referinta la `tranzactie_plata`. Aceasta e **versiunea din repo**, nu neaparat versiunea live (interogarea (2) e necesara pentru confirmare). Daca versiunea live coincide cu repo-ul: o factura platita partial printr-o incasare normalizata multipla (`proceseaza_incasare_normalizata`, care scrie DOAR in `tranzactie_plata`, vezi `supabase/migrations/20260309_create_rpc_proceseaza_incasare.sql:26-33`, fara sa atinga `tranzactii.plata_ids`) ar fi invizibila pentru `recalculare_stare_plata` — consistent cu avertismentul deja implementat explicit in `FacturaDetaliu.tsx` (comparatia statusului real dupa refetch, `handleAchitareRapida`).
- **(c) Exista trigger pe `tranzactie_plata` care recalculeaza starea facturii?** Fisierul `REFACTOR_FINANCIAL.sql` defineste trigger-ul `tranzactie_change_trigger` **doar pe `public.tranzactii`** (linia 71-74), nu pe `tranzactie_plata`. Niciun fisier din `sql/` sau `supabase/migrations/` grepat in aceasta sesiune nu defineste un trigger echivalent pe `tranzactie_plata`. NEVERIFICAT live (interogarea (3) confirma/infirma), dar in lipsa unei migratii vizibile in repo care sa-l adauge, riscul semnalat la (b) ramane plauzibil.
- **(d) `view_plata_sportiv` leaga tranzactiile prin `plata_ids`, prin `tranzactie_plata`, sau prin ambele?** View-ul nu are o definitie SQL urmarita in repo (nicio migratie gasita prin `grep -r view_plata_sportiv` in afara de referinte de cod TS/planuri) — a fost probabil creat direct pe DB live, acelasi pattern documentat ca risc in `project_faza25_rls_grupe_prezenta_abonamente.md` si `feedback_audit_rls_verifica_live_nu_doar_migratii.md`. NEVERIFICAT, necesita interogarea (4) live. `utils/facturaDetaliu.ts` (`construiesteIstoricTranzactii`, per 31-03-SUMMARY) presupune ca sursa poate fi "ambele" si dedupliza explicit pe `tranzactieId` — deci codul client e deja defensiv indiferent de raspunsul la (d).
- **(e) `proceseaza_plata_factura` e SECURITY DEFINER fara verificare de rol?** CONFIRMAT static din `sql/refactor/REFACTOR_FINANCIAL.sql:76-87`: functia are `SECURITY DEFINER`, `SET search_path = public`, si corpul functiei (liniile 89-122) nu contine nicio verificare `auth.uid()` / rol / `has_access_to_club` inainte de `INSERT INTO public.tranzactii`. Aceasta confirma static riscul acceptat T-31-03-04 din 31-03-SUMMARY.md ("RPC-ul insera in tranzactii ocolind RLS indiferent de cine il apeleaza"). NEVERIFICAT doar in sensul ca nu s-a confirmat ca *aceasta e versiunea live* (posibil sa fi fost inlocuita) — recomandat sa fie inclusa explicit in verificarea 31-09.

### BLOCKER PENTRU UTILIZATOR

Nu se aplica in acest moment — raspunsul la (a) nu e confirmat nici DA nici NU (NEVERIFICAT), deci nu se declanseaza blocul obligatoriu pentru "(a) = NU". Totusi, avand in vedere ca `plati` nu apare in lista de tabele reparate in Faza 15, exista un risc real ca INSTRUCTOR sa nu poata efectiv face UPDATE pe `plati` (RLS ar refuza silentios, iar UI-ul din `FacturaDetaliu.tsx` trateaza deja explicit `data === null` ca refuz de permisiune — comportament sigur, dar experienta ar fi "butonul exista, actiunea esueaza cu mesaj"). **Recomandare pentru 31-09:** ruleaza interogarea (1) de mai sus ca prim pas, inainte de verificarea vizuala in browser cu un cont INSTRUCTOR real.

## Deviations from Plan

None - plan executat conform planului. Task 2 a urmat explicit ramura "MCP Supabase NU e disponibil" prevazuta in `<action>`.

## Issues Encountered

Niciunul specific implementarii. Task 2 a fost limitat la analiza statica a fisierelor din repo (`sql/refactor/REFACTOR_FINANCIAL.sql`, migratia `20260309_create_rpc_proceseaza_incasare.sql`, `15-01-SUMMARY.md`) ca substitut partial pentru verificarea live ceruta — util pentru context, dar explicit NU un substitut pentru interogarile live cerute de plan (fisierele din repo pot diverge de la DB live, lectie deja documentata in memoria proiectului).

## User Setup Required

None - no external service configuration required. Interogarile SQL listate mai sus necesita acces Supabase MCP sau SQL Editor, dar sunt read-only si pot fi rulate de orice sesiune/utilizator cu acces la proiectul `wuhidifzsutwgdfkwhmd`.

## Known Stubs

Niciunul. Butonul "Detalii" e complet functional — deschide acelasi modal `FacturaDetaliu` deja verificat in 31-03/31-04, fara stare mock.

## Threat Flags

Nicio suprafata noua fata de `<threat_model>`-ul planului (T-31-07-01..03, T-31-07-SC). Gating-ul UI ramane in `FacturaDetaliu.tsx` (neschimbat in acest plan); poarta reala de securitate ramane RLS pe `plati`, a carei confirmare live e amanata la 31-09 conform sectiunii de mai sus.

## Next Phase Readiness

- D-09 e livrat functional din perspectiva UI: INSTRUCTOR are acum un buton "Detalii" vizibil in profilul oricarui sportiv → tab Istoric Financiar.
- Blocker cunoscut pentru 31-09: verificarea live a punctelor (a)-(e) ramane de facut cu acces real la Supabase MCP sau SQL Editor, inainte de verificarea vizuala finala cu un cont INSTRUCTOR real. Interogarile sunt gata de copiat-lipit.
- Niciun blocker pentru planurile de cod urmatoare (31-08 etc.) — acest plan nu a atins routing-ul `AppRouter.tsx` si nici alias-urile de view.

## Self-Check: PASSED

- FOUND: components/UserProfile/FinanciarTab.tsx (modificat)
- FOUND: components/UserProfile.tsx (modificat)
- FOUND: commit 65d213c (Task 1)
- FOUND: .planning/phases/31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa/31-07-SUMMARY.md

---
*Phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa*
*Completed: 2026-09-26*
