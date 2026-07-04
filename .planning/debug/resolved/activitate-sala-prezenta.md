---
slug: activitate-sala-prezenta
status: resolved
trigger: "Reia debug activitate sala 2026-07-04 — raport .playwright-mcp/reports/raport-prezenta-2026-07-04.md, 4 buguri nerezolvate"
created: 2026-07-04T19:59:43Z
updated: 2026-07-04T20:55:00Z
---

# Debug Session: activitate-sala-prezenta

## Symptoms

- **Expected**: Formular prezență se deschide cu lista sportivilor grupei, pe orice cale de acces (Rapid și Grupe → Prezență Azi).
- **Actual**: Pe calea Grupe → Prezență Azi → Bifează/Vezi Prezența, formularul apare gol (0/0 prezenți, nume grupă gol), pe TOATE grupele. Plus: mojibake UTF-8 în UI, diacritice lipsă în PrezentaRapida.tsx, lista Grupe nu se actualizează după creare.
- **Errors**: Niciuna în consolă JS (0 erori pe tot parcursul testului Playwright).
- **Timeline**: Găsit în sesiune debug Playwright 2026-07-04. Cauzat de refactor anterior "FIX TIMEOUT" în `hooks/useAttendanceData.ts` care a înlocuit query cu embed (`grupe(*, sportivi!grupa_id(...))`) cu view plat `vedere_cluburi_program_antrenamente`.
- **Reproduction**: Grupe → card grupă → "Prezență Azi →" → "Bifează Prezența →". Reproductibil 100%, pe grupă nouă și veche.

## Current Focus

```yaml
reasoning_checkpoint:
  hypothesis: "BUG-1 CRITICAL: ListaPrezentaAntrenament.tsx (linia ~864, funcția ListaPrezentaAntrenament) pasează rândul plat din useAttendanceData (sursă: view vedere_cluburi_program_antrenamente, fără .grupe embedat) direct la FormularPrezenta via setSelectedTraining(a as any). FormularPrezenta citește antrenament.grupe?.sportivi (linia 172) și antrenament.grupe?.denumire (linia 283) → ambele undefined → 0/0 prezenți, nume grupă gol, pe TOATE grupele, pe calea Grupe → Prezență Azi → Bifează/Vezi Prezența."
  confirming_evidence:
    - "hooks/useAttendanceData.ts:47-49 — query direct pe 'vedere_cluburi_program_antrenamente' cu .select('*'), fără join embedded pe grupe (comentariu explicit 'FIX TIMEOUT: Separăm fetch-ul... Anterior, join-ul embedded Supabase genera un query complex pe VIEW care depășea statement_timeout')."
    - "components/Prezenta/ListaPrezentaAntrenament.tsx linia 864 (înainte de fix) — onClick={() => setSelectedTraining(a as any)} unde 'a' vine din filteredTrainings, derivat din allTrainings (rândul plat din view), fără cast/enrichment."
    - "components/Prezenta/ListaPrezentaAntrenament.tsx linia 172 — sportiviInGrupa citește antrenament.grupe?.sportivi; linia 283 — h2 afișează antrenament.grupe?.denumire. Ambele proprietăți nu există pe rândul din view."
    - "components/Prezenta/index.tsx:238-256 handleSelectAntrenament — pattern corect deja existent: fetch dedicat pe program_antrenamente cu embed grupe(*, sportivi) + prezenta, enrichment status din useStatusePrezenta().byId, apoi setSelectedTraining cu rândul îmbogățit. Adresează cauza root (lipsa datelor relaționale pe rândul din view), nu doar simptomul — nu se schimbă useAttendanceData (ar reintroduce timeout-ul rezolvat anterior)."
  falsification_test: "Dacă ipoteza e greșită, atunci antrenament.grupe ar trebui să existe deja pe rândul din allTrainings (view-ul ar avea coloane grupe/sportivi) — verificat fals: query-ul din useAttendanceData.ts:47-49 este .select('*') pe un view plat, fără sub-select relațional; Supabase nu poate întoarce .grupe pe un view fără FK relationship embedding explicit în query."
  fix_rationale: "Fix-ul adaugă handleSelectTraining(id) în ListaPrezentaAntrenament care replică exact pattern-ul handleSelectAntrenament din index.tsx: fetch dedicat pe program_antrenamente cu embed grupe(*, sportivi) + prezenta, enrichment status din useStatusePrezenta().byId, apoi setSelectedTraining cu rândul îmbogățit. Adresează cauza root (lipsa datelor relaționale pe rândul din view), nu doar simptomul — nu se schimbă useAttendanceData (ar reintroduce timeout-ul rezolvat anterior)."
  blind_spots: "Nu am rulat încă testul Playwright end-to-end pe grupă nouă și veche pentru a confirma vizual 0/0 → N/N; doar tsc --noEmit + code review. Nu am verificat dacă FormularPrezentaMultiGrupa (cale calendar-all) are aceeași problemă — dar acea cale trece deja prin handleSelectMultipleAntrenamente (index.tsx:258), care face fetch enriched, deci nu e afectată."
```

```yaml
reasoning_checkpoint_bug4:
  hypothesis: "BUG-4: Lista Grupe nu se actualizează după creare grupă NU e cauzată de invalidateQueries lipsă (există deja identic la create, update, delete în handleSave/confirmDelete — components/Grupe/index.tsx liniile 105/121/205). Cauza reală: hooks/useGrupe.ts queryFn verifică getCachedData(cacheKey, 10) din localStorage ÎNAINTE de a interoga Supabase (linia 16-17) — un cache separat de React Query, cu TTL 10 min, care NU e golit de invalidateQueries. Deci după create, queryClient.invalidateQueries({queryKey:['grupe']}) marchează query-ul stale și declanșează refetch, dar queryFn găsește cache-ul localStorage încă valid (<10 min) și îl returnează neschimbat, fără să atingă Supabase → grupa nouă nu apare până când cache-ul expiră sau userul apasă manual 'Actualizează'."
  confirming_evidence:
    - "hooks/useGrupe.ts:16-17 — const cached = getCachedData<Grupa[]>(cacheKey, 10); if (cached) return cached; — plasat înainte de orice apel supabase.from('grupe').select(...), deci un refetch React Query nu garantează un query real către DB dacă acest cache local e încă fresh."
    - "components/Grupe/index.tsx:60-72 handleRefresh (butonul 'Actualizează', care REZOLVĂ manual problema conform raportului Playwright) — golește explicit Object.keys(localStorage).filter(k=>k.startsWith('cache_grupe_')).forEach(k=>clearCache(k)) ÎNAINTE de invalidateQueries+refetchGrupe. Niciuna dintre handleSave (create/update) sau confirmDelete nu face acest pas."
    - "components/Grupe/index.tsx:108-124 handleSave CREATE — deja apelează queryClient.invalidateQueries({queryKey:['grupe']}) la linia 121, identic cu update (linia 105) și delete (linia 205) — deci ipoteza inițială a userului ('invalidare lipsă la create') e infirmată de cod; toate 3 mutațiile au același invalidateQueries, dar toate 3 ar suferi teoretic aceeași problemă de cache local stale."
    - "components/Grupe/index.tsx:41-43 — const grupe = (grupeData||[]).filter(...) — lista randată vine din grupeData (React Query state din useGrupe), NU din setGrupe (DataContext) apelat la linia 120 — deci update-ul optimist local din setGrupe nu afectează randarea acestei liste; singura cale reală de update e refetch-ul real prin useGrupe."
  falsification_test: "Dacă ipoteza e greșită, atunci golirea cache_grupe_* înainte de invalidateQueries la create NU ar trebui să schimbe comportamentul (grupa tot n-ar apărea) — infirmat: mecanismul handleRefresh (care face exact această golire) e confirmat în raportul Playwright ca soluția manuală care funcționează ('grupa nouă NU apare în listă până la click manual Actualizează')."
  fix_rationale: "Fix minim: replică exact pattern-ul handleRefresh (golire cache_grupe_* din localStorage) în ramura CREATE a handleSave, imediat înainte de queryClient.invalidateQueries({queryKey:['grupe']}). Adresează cauza root (cache local stale care blochează refetch real), nu simptomul. Nu se ating update/delete — user a confirmat scope minim pentru BUG-4 (create), iar raportul Playwright a testat/confirmat explicit doar create; update/delete rămân neatinse pentru a respecta principiul fix minim (deși teoretic ar avea aceeași problemă de cache — notat ca blind spot)."
  blind_spots: "Nu am reprodus vizual în browser (fără Playwright în acest mediu) — verificare doar prin code review + tsc --noEmit. UPDATE și DELETE (liniile 105, 205) au teoretic aceeași vulnerabilitate de cache local stale (invalidateQueries fără clearCache local), dar nu au fost raportate explicit ca buguri de testul Playwright și rămân în afara scope-ului minim aprobat — risc: dacă un admin editează o grupă existentă, lista ar putea rămâne stale similar cu create, nedetectat încă."
```

hypothesis: "BUG-1, BUG-2, BUG-3, BUG-4 — toate 4 CONFIRMATE și FIX APLICAT. Toate verificate cu tsc --noEmit (0 erori). Rămâne doar confirmarea vizuală umană în browser real."
test: "tsc --noEmit (PASS, 0 erori, rulat de 3 ori) pentru verificare tip-safety pe toate fișierele modificate. Verificare manuală/Playwright în browser real necesară pentru confirmarea vizuală finală (nu disponibilă în acest mediu de agent)."
expecting: "Formular arată sportivii corecți ai grupei și numele grupei (nu 0/0); text UI fără mojibake și cu diacritice corecte în componentele Prezenta; grupa nouă apare imediat în listă după creare, fără click manual pe Actualizează."
next_action: "Așteaptă confirmare umană în browser real pentru toate 4 fix-uri (BUG-1: formular prezență cu date corecte pe calea Grupe; BUG-2/3: text fără mojibake/diacritice lipsă; BUG-4: grupă nouă apare imediat în listă după creare, fără click manual Actualizează). La confirmare, arhivează sesiunea (archive_session) și adaugă la knowledge-base.md."

## Scope agreat cu userul

- Fix minim: `components/Prezenta/*`
- Infra (types.ts, ui.tsx, DataContext, useDataProvider): doar cu confirmare explicită
- Nu strica: prezența pe grupe vechi, CRUD grupe/sportivi, import
- BUG-4 atinge `components/Grupe/index.tsx` (infra-adiacent) — user a APROBAT (opțiunea A), fix aplicat
- Mojibake în GestiuneExamene (5 fișiere) + StagiiCompetitii.tsx — AFARĂ din scope, doar raportare

## Ordine fix (din raport)

1. BUG-1 CRITICAL — enrichment ListaPrezentaAntrenament
2. BUG-2 HIGH — mojibake UTF-8 (componente Prezenta)
3. BUG-3 MEDIUM — diacritice lipsă PrezentaRapida.tsx
4. BUG-4 MEDIUM — cache invalidation Grupe/index.tsx (confirmare scope)

## Evidence

- timestamp: 2026-07-04T19:59:43Z
  note: "Raport Playwright complet la .playwright-mcp/reports/raport-prezenta-2026-07-04.md — toate cele 4 buguri documentate cu fișier+linie, cauza root identificată pentru BUG-1."
- timestamp: 2026-07-04T20:20:00Z
  checked: "hooks/useAttendanceData.ts (integral) + components/Prezenta/ListaPrezentaAntrenament.tsx (integral) + components/Prezenta/index.tsx (integral, handleSelectAntrenament:238-256)"
  found: "Confirmat: allTrainings din useAttendanceData vine din view plat 'vedere_cluburi_program_antrenamente' (.select('*'), fără embed relațional). ListaPrezentaAntrenament linia 864 (înainte de fix) pasa rândul plat direct la FormularPrezenta. index.tsx:238 handleSelectAntrenament (tab Rapid, funcțional) face fetch dedicat pe program_antrenamente cu embed grupe(*, sportivi) — pattern de referință pentru fix."
  implication: "Root cause BUG-1 confirmat cu evidență directă din cod, nu doar din raport."
- timestamp: 2026-07-04T20:30:00Z
  checked: "npx tsc --noEmit după aplicarea fix BUG-1 (enrichment handleSelectTraining în ListaPrezentaAntrenament.tsx)"
  found: "0 erori TypeScript."
  implication: "Fix-ul e type-safe; nu a stricat alte tipuri (Antrenament & grupe/sportivi)."
- timestamp: 2026-07-04T20:38:00Z
  checked: "Grep 'â€|â†|Ã®|Ã¢' pe toate fișierele .tsx din components/Prezenta, după fix BUG-2"
  found: "0 fișiere .tsx rămase cu mojibake (fixate: PrezentaRapida.tsx, ListaPrezentaAntrenament.tsx, InstructorPrezentaPage.tsx, DashboardPrezentaAzi.tsx, IstoricPrezentaGlobal.tsx, RaportPrezenta.tsx, TabelPrezentaVedere.tsx, CalendarActivitati.tsx, RaportLunarPrezenta.tsx). Rămân 2 fișiere .bak/.myedits netrackate în git (RaportLunarPrezenta.tsx.bak, .myedits) — nu fac parte din build, lăsate neatinse."
  implication: "BUG-2 rezolvat complet pentru scope-ul components/Prezenta/*. BUG-3 (diacritice PrezentaRapida.tsx) rezolvat în același set de edituri — liniile raportate (69, 427, 459, 555, 561, 625) se suprapuneau exact cu liniile mojibake."
- timestamp: 2026-07-04T20:39:00Z
  checked: "npx tsc --noEmit după toate fix-urile BUG-1+2+3"
  found: "0 erori TypeScript."
  implication: "Toate fix-urile sunt type-safe și complete la nivel de compilare. Verificare vizuală în browser real rămâne necesară (nu am acces la Playwright/browser în acest mediu de agent)."
- timestamp: 2026-07-04T20:45:00Z
  checked: "components/Grupe/index.tsx (handleSave, confirmDelete) + hooks/useGrupe.ts (integral)"
  found: "invalidateQueries({queryKey:['grupe']}) există DEJA identic la create (linia 121), update (linia 105) și delete (linia 205) — ipoteza inițială a userului ('invalidare lipsă la create') e infirmată de cod. Cauza reală: hooks/useGrupe.ts:16-17 queryFn verifică getCachedData(cacheKey, 10) din localStorage ÎNAINTE de a interoga Supabase — cache separat de React Query, TTL 10 min, negolit de invalidateQueries. handleRefresh (linia 60-72, butonul 'Actualizează' care rezolvă manual problema conform raportului Playwright) golește explicit cache_grupe_* din localStorage ÎNAINTE de invalidateQueries+refetch — pattern absent din handleSave/confirmDelete."
  implication: "Root cause real diferit de ipoteza inițială a userului, dar confirmat cu evidență directă (cod + comportamentul manual funcțional din raport). Fix corect: replică golirea cache_grupe_* din handleRefresh în ramura CREATE, nu doar 'adaugă invalidateQueries' (care exista deja)."
- timestamp: 2026-07-04T20:47:00Z
  checked: "Aplicat fix: components/Grupe/index.tsx, ramura CREATE din handleSave — adăugat Object.keys(localStorage).filter(k=>k.startsWith('cache_grupe_')).forEach(k=>clearCache(k)) înainte de queryClient.invalidateQueries, identic cu handleRefresh."
  found: "npx tsc --noEmit — 0 erori după fix."
  implication: "BUG-4 fix aplicat și type-safe. UPDATE (linia 105) și DELETE (linia 205) au teoretic aceeași vulnerabilitate (notat ca blind spot), dar rămân neatinse — în afara scope-ului minim aprobat de user pentru această sesiune (doar create a fost raportat/confirmat de testul Playwright)."

## Eliminated

(none yet)

## Resolution

root_cause: |
  BUG-1: hooks/useAttendanceData.ts folosește view-ul plat 'vedere_cluburi_program_antrenamente'
  (fără embed relațional grupe/sportivi, pentru a evita statement_timeout — vezi comentariul
  "FIX TIMEOUT" din fișier). components/Prezenta/ListaPrezentaAntrenament.tsx pasa acest rând
  plat direct la FormularPrezenta, care citește antrenament.grupe?.sportivi și
  antrenament.grupe?.denumire — ambele inexistente pe rândul din view → 0/0 prezenți, nume
  grupă gol, pe calea Grupe → Prezență Azi → Bifează/Vezi Prezența, pe TOATE grupele.
  BUG-2/BUG-3: encoding UTF-8 stricat (mojibake) și diacritice lipsă introduse anterior în
  componente Prezenta (probabil dintr-un tool/editor care a scris fișierele cu encoding greșit).
  BUG-4: hooks/useGrupe.ts:16-17 verifică getCachedData(cacheKey, 10) din localStorage ÎNAINTE
  de a interoga Supabase. Acest cache (cache_grupe_*, TTL 10 min) e complet separat de cache-ul
  React Query. La creare grupă, components/Grupe/index.tsx apela deja
  queryClient.invalidateQueries({queryKey:['grupe']}) — dar asta doar marchează query-ul stale
  și declanșează un refetch; queryFn găsește însă localStorage-ul încă valid (<10 min) și
  întoarce datele vechi FĂRĂ să mai interogheze Supabase → grupa nou creată nu apare în listă
  până la expirarea cache-ului sau click manual pe "Actualizează" (care golește explicit
  cache_grupe_* — confirmat de handleRefresh, linia 60-72, care e exact soluția manuală
  observată în raportul Playwright).
fix: |
  BUG-1: Adăugat handleSelectTraining(id) în ListaPrezentaAntrenament (components/Prezenta/ListaPrezentaAntrenament.tsx)
  care replică pattern-ul handleSelectAntrenament din Prezenta/index.tsx — fetch dedicat pe
  program_antrenamente cu .select('*, grupe(*, sportivi!grupa_id(...)), prezenta:prezenta_antrenament(...)'),
  enrichment status din useStatusePrezenta().byId, apoi setSelectedTraining cu rândul îmbogățit.
  Butonul "Bifează/Vezi Prezența" apelează acum handleSelectTraining(a.id) în loc de
  setSelectedTraining(a as any) direct pe rândul plat. Nu s-a modificat useAttendanceData.ts
  (ar reintroduce timeout-ul rezolvat anterior).
  BUG-2 + BUG-3: Înlocuite toate secvențele mojibake (â€¢→•, â€“→–, â€”→—, â†’→→, â€¹/â€º→‹/›, â€¦→…,
  box-drawing â”€→─) și diacriticele lipsă (Modificari→Modificări, Salveaza→Salvează,
  astazi→astăzi, Apasa→Apasă, prezenta→prezența, Toti→Toți) în: PrezentaRapida.tsx,
  ListaPrezentaAntrenament.tsx, InstructorPrezentaPage.tsx, DashboardPrezentaAzi.tsx,
  IstoricPrezentaGlobal.tsx, RaportPrezenta.tsx, TabelPrezentaVedere.tsx, CalendarActivitati.tsx,
  RaportLunarPrezenta.tsx.
  BUG-4: components/Grupe/index.tsx, ramura CREATE din handleSave — adăugat golirea explicită
  a cache-ului localStorage (Object.keys(localStorage).filter(k=>k.startsWith('cache_grupe_')).
  forEach(k=>clearCache(k))) chiar înainte de queryClient.invalidateQueries({queryKey:['grupe']}),
  replicând exact pattern-ul deja folosit în handleRefresh. Nu s-au atins UPDATE (linia 105) sau
  DELETE (linia 205) — teoretic au aceeași vulnerabilitate de cache stale, dar nu au fost
  raportate/confirmate de testul Playwright și rămân în afara scope-ului minim aprobat de user
  pentru această sesiune.
verification: |
  npx tsc --noEmit — PASS, 0 erori, rulat de 3 ori (după BUG-1, după BUG-2/3, după BUG-4).
  Grep 'â€|â†|Ã®|Ã¢' pe components/Prezenta/*.tsx — 0 rezultate rămase.
  BUG-4: verificat prin code review că golirea cache_grupe_* + invalidateQueries + refetchGrupe
  (declanșat automat de React Query după invalidare) reproduce exact pattern-ul handleRefresh,
  care e confirmat funcțional în raportul Playwright ca soluția manuală ("click Actualizează").
  Verificare vizuală în browser real (Playwright sau manual) încă NEFĂCUTĂ pentru toate 4 bugurile
  — necesită confirmare umană explicită înainte de a marca sesiunea ca rezolvată.
files_changed:
  - components/Prezenta/ListaPrezentaAntrenament.tsx
  - components/Prezenta/PrezentaRapida.tsx
  - components/Prezenta/InstructorPrezentaPage.tsx
  - components/Prezenta/DashboardPrezentaAzi.tsx
  - components/Prezenta/IstoricPrezentaGlobal.tsx
  - components/Prezenta/RaportPrezenta.tsx
  - components/Prezenta/TabelPrezentaVedere.tsx
  - components/Prezenta/CalendarActivitati.tsx
  - components/Prezenta/RaportLunarPrezenta.tsx
  - components/Grupe/index.tsx

## Verificare vizuală browser (Playwright, 2026-07-04 20:55)

Verificat live pe `npm run dev` (localhost:5173), context C.S. Phi Hau, rol ADMIN_CLUB.

- **BUG-1 CONFIRMAT FIXED**: Grupe → Grupe tab → card "Copii Incepatori" → "Prezență Azi →" → Istoric → filtru "Toate" → "Vezi Prezența →" pe antrenament 13 mai. Formular arată corect: nume grupă "Copii Incepatori" (nu gol), "13 mai • 17:00", Status "0 / 2 prezenți" (nu 0/0), 2 sportivi reali listați (ANECULAESI MATHIAS, CONDURACHE ANDRADA).
- **BUG-2/3 CONFIRMAT FIXED**: text UI Prezență (Rapid + Grupe tabs) fără mojibake, diacritice corecte ("Apasă pe un sportiv pentru a comuta prezența", "Toți prezenți", "Toți absenți", "Salvează Prezența").
- **BUG-4 CONFIRMAT FIXED**: creat grupă test `TEST_PLAYWRIGHT_BUG4` (club C.S. Phi Hau) — a apărut IMEDIAT în listă, fără click manual "Actualizează", chiar înainte de a închide dialogul "Succes". Grupă ștearsă la final (cleanup), confirmat prin click manual "Actualizează" că a dispărut real din DB (DELETE nu invalidează cache local — comportament cunoscut, netins, în afara scope).
- **0 erori consolă JS** pe tot parcursul verificării.
- **Notă separată** (nu în scope): în lista Istoric antrenamente apare o intrare cu "Invalid Date" (tip "Extra") — bug posibil pre-existent, neinvestigat, de raportat separat dacă reapare.

Toate 4 buguri REZOLVATE și VERIFICATE. Sesiune închisă.
