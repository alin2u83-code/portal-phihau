---
status: resolved
trigger: "Hang loading fetchAllPages istoric grade - query vedere_istoric_grade_sportiv ramane PENDING indefinit prin PostgREST desi rapid (4.7ms) direct pe DB."
created: 2026-07-12
updated: 2026-07-12
---

## Symptoms

- **Expected behavior**: App incarca normal, `useDataProvider.loading` devine `false` dupa fetch initial de date (sportivi, grupe, istoric grade etc).
- **Actual behavior**: App ramane blocata infinit pe `MartialArtsSkeleton` (loading screen din `App.tsx`). `loadingData` ramane `true` la nesfarsit.
- **Error messages**: Niciuna vizibila in consola/UI. Request-ul `vedere_istoric_grade_sportiv?...&offset=0&limit=1000` ramane PENDING in Network fara raspuns si fara eroare (timeout tacut).
- **Timeline**: Descoperit 2026-07-11 in timp ce se verifica alt fix (RLS examene). Nu a fost cauzat de acel fix, doar expus/observat atunci. Necunoscut de cand exista exact.
- **Reproduction**: Incarcare initiala a aplicatiei (login / refresh) cand `activeRoleContext` devine disponibil si porneste `fetchAllPages` pentru istoric grade per club.

## Prior Investigation (din memorie, sesiune anterioara)

- Cauza localizata la `fetchAllPages` in `hooks/useDataProvider.ts:373-384`, folosit ~linia 405 pentru paginarea `vedere_istoric_grade_sportiv` per club.
- Acelasi query rulat direct pe DB (EXPLAIN ANALYZE) dureaza 4.7ms — deci NU e query lent la nivel Postgres.
- Hang-ul pare a fi intre PostgREST/Supavisor pooler si browser — posibil epuizare conexiuni pooler.
- Similar cu problema deja documentata in `hooks/useAttendanceData.ts` (comentariu "FIX TIMEOUT") pentru alt query din acelasi modul — posibil pattern comun.
- Ipoteza neinvestigata: `fetchAllPages` ruleaza in paralel cu prea multe alte query-uri simultan la incarcarea initiala (~15 criticalQueries + attendanceData + roles fetch), posibil epuizand connection limit (browser sau Supavisor pooler).
- Status precedent: NEINVESTIGAT mai departe, user a oprit aici ultima data.

## Current Focus

reasoning_checkpoint:
  hypothesis: "Query-ul `vedere_istoric_grade_sportiv` din `fetchAllPages` (hooks/useDataProvider.ts:404-406) foloseste `.in('sportiv_id', idsInClub)` cu TOATE id-urile sportivilor clubului inline in URL. Pentru cluburi mari (C.S. Phi Hau = 477 sportivi), URL-ul rezultat are ~17.8KB, ceea ce depaseste limita de dimensiune a request-ului acceptata de infrastructura Supabase (Kong/PostgREST/proxy), cauzand fie eroare rapida (Node/undici: TypeError fetch failed / HeadersOverflowError), fie hang tacut in browser (conexiune deschisa, niciun raspuns, niciun timeout - exact simptomul raportat)."
  confirming_evidence:
    - "Reprodus direct: query cu .in() + 477 id-uri sportiv -> 'TypeError: fetch failed / UND_ERR_HEADERS_OVERFLOW' dupa ~8s (Node/undici; in browser echivalentul e hang tacut fara eroare vizibila)."
    - "Test binary-search pe numar de id-uri in .in(): n=350 (~13KB URL) OK in 148ms; n=400 (~14.8KB URL) ESUEAZA in ~8s; prag intre 350-400 id-uri / ~13-15KB URL."
    - "Query echivalent DOAR cu .eq('club_id', CLUB_ID) (fara .in(sportiv_id)) returneaza acelasi total de 1668 randuri, toate cu club_id corect si sportiv_id apartinand clubului -> .in(sportiv_id) e complet REDUNDANT dupa fix-ul anterior 260708-h7k (view-ul deriva deja club_id din sportivi.club_id via COALESCE)."
    - "Fetch paginat complet folosind DOAR .eq('club_id', CLUB_ID) (fara .in): 1668 randuri in 833ms total, 0 nepotriviri de date."
  falsification_test: "Daca query-ul cu .eq('club_id') ONLY ar fi returnat mai putine randuri decat varianta cu .in(sportiv_id) (pierdere de date), sau daca query-ul cu .in() de 477 id-uri ar fi reusit rapid, ipoteza ar fi fost infirmata. Ambele teste au confirmat ipoteza."
  fix_rationale: "Eliminarea clauzei redundante .in('sportiv_id', idsInClub) elimina radacina problemei (URL supradimensionat), nu doar simptomul. Se elimina si query-ul secvential prealabil pentru clubSportivIds (linia 399-402), care nu mai e necesar. .eq('club_id', clubId) singur e suficient si corect, dupa cum demonstreaza fix-ul 260708-h7k care garanteaza club_id corect in view."
  blind_spots: "Nu am testat exact acelasi query prin browser real (doar Node/service-role + fetch direct) - dar mecanismul (URL supradimensionat -> esec la nivel de proxy/gateway) e independent de client. Nu am verificat daca alte cluburi mai mici decat pragul (~350 sportivi) ar fi afectate in viitor pe masura ce cresc - fix-ul rezolva insa problema structural, nu doar pentru clubul curent afectat."

- hypothesis: CONFIRMAT - vezi reasoning_checkpoint de mai sus.
- test: Comparatie query .in(sportiv_id, [477 ids])+eq(club_id) vs .eq(club_id) singur, cu masurare URL length si timp raspuns, folosind service-role key direct pe REST API Supabase.
- expecting: Daca ipoteza e corecta, query-ul cu .in() de multe id-uri esueaza/hang, iar cel doar cu .eq(club_id) reuseste rapid cu acelasi rezultat.
- next_action: "REZOLVAT - confirmat uman via Playwright live: fresh full-page reload ca ADMIN_CLUB pe C.S. Phi Hau, app incarcata normal in ~22s, fara hang. Sesiune arhivata."

## Evidence

- timestamp: 2026-07-12T00:00:00Z
  checked: "hooks/useDataProvider.ts liniile 386-410 (constructia query-ului istoricGrade)"
  found: "Pentru clubId definit, codul ruleaza mai intai un query separat pentru toate id-urile sportivilor clubului (linia 399-402), apoi construieste fetchAllPages cu `.in('sportiv_id', idsInClub).eq('club_id', clubId)` (linia 405). Comentariul de la linia 396-398 mentioneaza ca .eq(club_id) al view-ului e acum derivat corect din sportivi.club_id (fix 260708-h7k), ceea ce face .in(sportiv_id) redundant."
  implication: "Punct de plecare pentru investigare directa a query-ului cu numar mare de id-uri."

- timestamp: 2026-07-12T00:05:00Z
  checked: "Numar sportivi per club (service role, bypass RLS) — cautare club cu multe randuri istoric_grade"
  found: "C.S. Phi Hau: 477 sportivi activi/inactivi, 1668 randuri istoric_grade. Kim Long Dao Falticeni: 421 randuri."
  implication: "C.S. Phi Hau e clubul cel mai probabil sa declanseze bug-ul (cel mai mare numar de sportivi -> cel mai lung URL .in())."

- timestamp: 2026-07-12T00:10:00Z
  checked: "Rulare directa fetchAllPages echivalent (service role) cu .in('sportiv_id', [477 ids]).eq('club_id', CLUB_ID).range(0,999)"
  found: "Request esueaza dupa 8141ms cu 'TypeError: fetch failed'. Testat cu fetch nativ (nu supabase-js): eroare exacta 'HeadersOverflowError / UND_ERR_HEADERS_OVERFLOW' din undici la parsarea raspunsului — URL generat are 17812 caractere (17648 doar parametrul .in())."
  implication: "URL-ul supradimensionat cauzeaza esec de protocol HTTP la nivelul infrastructurii (proxy/gateway Supabase), NU o problema de performanta Postgres (coerent cu EXPLAIN ANALYZE 4.7ms raportat anterior)."

- timestamp: 2026-07-12T00:15:00Z
  checked: "Binary-search pe numarul de id-uri incluse in .in('sportiv_id', ...) pentru acelasi club, masurand lungime URL si rezultat"
  found: "n=100 (~3.7KB) OK 160ms; n=200 (~7.4KB) OK 139ms; n=300 (~11.1KB) OK 138ms; n=350 (~12.9KB) OK 148ms; n=400 (~14.8KB) EROARE 8049ms; n=450 (~16.6KB) EROARE 7973ms; n=477 (~17.6KB) EROARE 8746ms."
  implication: "Prag clar intre 350-400 id-uri (~13-15KB lungime URL) unde request-ul incepe sa esueze/hang. Explica de ce bug-ul nu a fost observat mai devreme — a aparut abia cand clubul C.S. Phi Hau a crescut peste acest prag de sportivi."

- timestamp: 2026-07-12T00:20:00Z
  checked: "Comparatie corectitudine date: query .eq('club_id', CLUB_ID) SINGUR (fara .in(sportiv_id)) vs count total asteptat"
  found: "Count cu .eq(club_id) singur: 1668 (identic cu count-ul via .in(sportiv_id) complet, verificat anterior la pasul de identificare club). Fetch paginat complet cu .eq(club_id) singur: 1668 randuri in 833ms, 0 randuri cu club_id gresit, 0 randuri cu sportiv_id care nu apartine clubului curent."
  implication: "Clauza .in('sportiv_id', idsInClub) e complet redundanta - .eq('club_id', clubId) singur returneaza exact acelasi set de date, corect si rapid. Eliminarea ei rezolva bug-ul fara pierdere de date si simplifica codul (elimina si query-ul prealabil pentru clubSportivIds)."

## Eliminated

- hypothesis: "Prea multe query-uri Supabase concurente epuizeaza connection pool (Supavisor)"
  evidence: "Testul direct a izolat exact UN singur query (.in cu 477 id-uri) rulat SINGUR (fara alte query-uri concurente) si a reprodus esecul in mod constant si repetabil doar pe baza lungimii URL-ului, independent de nivelul de concurenta. Cauza e dimensiunea request-ului, nu numarul de conexiuni simultane."
  timestamp: 2026-07-12T00:20:00Z

## Resolution

- root_cause: "In `hooks/useDataProvider.ts`, query-ul paginat pentru `istoricGrade` per club foloseste `.in('sportiv_id', idsInClub)` cu id-urile TUTUROR sportivilor clubului inline in URL (in plus fata de `.eq('club_id', clubId)`). Pentru cluburi cu multi sportivi (C.S. Phi Hau: 477), URL-ul generat depaseste ~14-15KB, peste limita acceptata de infrastructura Supabase (proxy/gateway), cauzand request-ul sa esueze sau sa ramana blocat fara raspuns (hang tacut in browser). Clauza `.in(sportiv_id)` era necesara istoric cand view-ul `vedere_istoric_grade_sportiv` putea avea `club_id` NULL, dar a devenit redundanta dupa fix-ul 260708-h7k care garanteaza `club_id` derivat corect (COALESCE) din `sportivi.club_id`."
  fix: "Eliminat query-ul prealabil pentru `clubSportivIds` si clauza `.in('sportiv_id', idsInClub)` din constructia `fetchAllPages` pentru istoricGrade. Se foloseste acum doar `.eq('club_id', clubId)` + paginare `.range()`, identic ca pattern cu `inscrieriExamene`."
  verification: "Verificat direct (service-role, bypass RLS): query simplificat returneaza exact acelasi total de randuri (1668) ca varianta veche, fara pierdere de date, in 833ms total (2 pagini) vs esec/hang cu varianta veche. CONFIRMAT UMAN 2026-07-12 via Playwright live end-to-end: fresh full-page reload ca ADMIN_CLUB pe clubul C.S. Phi Hau -> app incarcata normal in ~22s, fara hang pe MartialArtsSkeleton. Network tab confirma toate request-urile vedere_istoric_grade_sportiv (offset=0 si offset=1000, paginate) cu status 200 OK si URL scurt (doar club_id=eq.<uuid>, fara parametru .in(sportiv_id)). Zero erori in consola."
  files_changed:
    - hooks/useDataProvider.ts
