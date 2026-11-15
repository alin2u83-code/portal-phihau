# Phase 38: Performanta incarcare aplicatie (eliminare statement timeouts) - Research

**Researched:** 2026-11-15
**Domain:** Supabase/PostgREST + Postgres 17 RLS performance; React startup data-loading waterfall
**Confidence:** MEDIUM (mecanismele sunt confirmate din cod/migrari; MAGNITUDINEA fiecarei cauze in DB NU e masurata si cere experimentele din "Wave 0" - fara acces DB live in aceasta cercetare)

> Nu exista CONTEXT.md pentru faza 38 (fara decizii blocate / discretie / idei amanate). Nu exista ID-uri de cerinte (Requirements: TBD in ROADMAP). Vezi "Open Questions" pentru deciziile de confirmat cu userul.
> Nu se instaleaza nicio dependenta noua (constrangere CLAUDE.md) -> "Package Legitimacy Audit" nu se aplica.
> `workflow.nyquist_validation = false` in `.planning/config.json` -> sectiunea "Validation Architecture" omisa; masuratorile sunt in "What to Measure".

## Summary

Diagnosticul (38-DIAGNOSTIC-20261115.md, masurat live) arata ca o interogare izolata costa ~178 ms planificare + ~178 ms executie, dar in browser aceleasi interogari dureaza 7-12 s la pornire. Diferenta (>10x) nu poate veni din volumul de date; vine din (a) furtuna de cereri paralele la pornire (cod: ~35 cereri, multe inutile sau duplicate) care satureaza conexiunile PostgREST/pooler/DB (GoTrue e lipsit de conexiuni: `/auth/v1/user` 9 s) si (b) costul fix mare per cerere (planificare RLS ~178 ms, fara plan cache, fiindca PostgREST nu foloseste prepared statements) inmultit cu concurenta. Timpul de asteptare la pool nu intra in `statement_timeout` (se numara doar executia), deci durate de 12.4 s in browser pentru un view cu timeout 8 s sunt compatibile cu coada la pool [ASSUMED - de confirmat cu setarile PostgREST/pooler].

Simptomul "Eroare de Sistem: canceling statement due to statement timeout" are o cauza exacta in cod, independenta de DB: `useAttendanceData` arunca eroarea brutei, `useDataProvider` o pune in `combinedError`, iar `SystemGuardian` afiseaza `ErrorScreen` pentru orice eroare cu `currentUser` setat. Adica un fetch NECRITIC (antrenamente/prezenta) darama toata aplicatia, iar `attendanceData.loading` face parte din `loading` (blocheaza primul ecran si poarta MFA). Doar acest fix de front elimina simptomul vizibil chiar daca DB ramane lent.

Corectie fata de diagnostic: view-ul inexistent `vedere_sportivi_detaliat_mv` NU e interogat de aplicatie (zero aparitii in cod/SQL/dist; grep pe tot repo-ul). E un job `pg_cron` (`refresh-dashboard-sportivi`, la 10 min) care esueaza cu `relation ... does not exist` (documentat in `.planning/phases/30-.../30-01-SUMMARY.md` linia 58/86). `pg_timezone_names` (3198 apeluri) probabil vine din reincarcarea schema cache a PostgREST [ASSUMED], nu din aplicatie.

**Primary recommendation:** Ordine strict dupa castig/risc: (Wave 0) masoara si inventariaza live fara nicio schimbare -> (Wave 1) schimbari doar de front, zero risc RLS: decupleaza attendance de `loading`/`error`, taie cererile premature/duplicate, limiteaza concurenta si amana incarcarile grele, fara retry pe 57014 -> (Wave 2) schimbari DB care NU modifica rezultatul (view-uri, indexuri, cron) -> (Wave 3, doar daca Wave 0/1 arata ca RLS ramane dominant) rescrieri de expresii RLS provabil echivalente, validate prin "fingerprint" de randuri vizibile inainte/dupa pe utilizatori reali. NU se restructureaza setul de politici si NU se muta predicate RLS in functii DEFINER fara dovada de echivalenta.

## Project Constraints (from CLAUDE.md)

- Stack fix: React 18 + TS + Tailwind, **fara librarii externe noi**; UI doar `components/ui.tsx`.
- Tipuri doar in `types.ts`; limba: romana pentru domeniu, engleza pentru hook-uri/patternuri.
- Server state = React Query v5; UI global = Zustand (`useAppStore`); navigare = `activeView` (fara URL routing).
- Permisiuni: `usePermissions` + RLS - nu dubla logica. Header `active-role-context-id` injectat de `supabaseClient.ts` in toate cererile.
- Servicii returneaza `{ data, error }`, nu arunca. Erori UI: `Alert`/`ErrorState`.
- Filtrare client-side pe date deja incarcate, fara query-uri noi (din PROJECT: constrangere a unei alte faze, dar spiritul "nu adauga cereri" se aplica).
- GSD: orice edit de fisiere prin flux GSD. User global: dupa modificari non-triviale de cod, rulare `/code-review`/`code-reviewer`; raporteaza findings cu `fisier:linie`; nu aplica fix-uri din review fara OK.
- Memorie proiect relevanta: Faza 25 (politici RLS fantoma - verifica LIVE `pg_policies`, nu doar migrari), `loading-hang-istoric-grade` (URL `.in()` supradimensionat -> hang), `feedback_rls_force_security_definer_recursion` (FORCE RLS blocheaza bypass-ul DEFINER; `CREATE OR REPLACE VIEW` reseteaza `security_invoker`; verifica dependinte inainte de `DROP ... CASCADE`), `feedback_strictmode_masks_prod_bug_scroll` (verifica pe `vite build` + preview), `feedback_supabase_gitignore_migrations_force_add` (`git add -f` pe migrari noi), `feedback_gsd_worktree_infra_esuata_execute_inline`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ordinea/concurenta incarcarii la pornire, primul ecran, poarta MFA | Browser / Client (`useDataProvider`, `App.tsx`) | - | Furtuna de cereri e produsa de client; singurul loc unde se controleaza |
| Decizia "ce date vede utilizatorul" | Database (RLS) | API (PostgREST aplica rolul `authenticated` + GUC-uri) | RLS e poarta reala de securitate; FE doar filtreaza defensiv |
| Cost per cerere (planificare RLS, view-uri) | Database | - | Planificarea expandeaza politicile la fiecare cerere (fara plan cache la PostgREST) |
| Limitarea paralelismului efectiv | API/Backend (PostgREST pool, Supavisor) + Client | Database (`max_connections`) | Coada la pool apare inainte de `statement_timeout` |
| Timeout-uri (`statement_timeout` per rol) | Database (setare rol) | - | 8 s authenticated; schimbarea e decizie de produs, nu fix |
| Joburi in fundal (pg_cron) | Database | - | `refresh-dashboard-sportivi` esueaza la 10 min |
| Afisarea erorilor non-critice (toast vs ecran complet) | Browser / Client (`SystemGuardian`, `useAttendanceData`) | - | Eroarea necritica nu are voie sa blocheze shell-ul |

## Standard Stack

Nu se adauga pachete. Se foloseste exclusiv ce exista deja:

| Tool | Versiune (din CLAUDE.md/package.json) | Rol in faza |
|------|-------------|-------------|
| @tanstack/react-query | 5.90.21 | `enabled`, `retry`/`retryDelay`, `staleTime`, `useQueries` pentru incarcari amanate |
| @supabase/supabase-js | 2.98.0 | clientul; `{ count: 'exact' }` doar cand e nevoie |
| Postgres (Supabase, eu-central-1) | 17 | `EXPLAIN (ANALYZE, SUMMARY)`, `pg_stat_statements`, DDL tranzactional |
| Playwright (existent, `npm test`) | - | masurare timp pana la primul ecran / cereri la pornire pe `vite build` + `preview` |
| tsx + `tests/rls_*.ts` (existent) | 4.21.0 | regresie RLS live (service role + client cu header) |

**Don't add:** `p-limit`/`p-queue`/`async` (constrangere "fara librarii noi"; un limitator de ~15 linii in `utils/` e suficient - nu se cunoaste niciun alt consumator, deci nu se generalizeaza).

## Architecture Patterns

### Fluxul curent de pornire (cauzele, din cod)

```
Browser load
  index.tsx: QueryClient(default retry=3, staleTime 5m)
    -> DataProvider -> useDataProvider() monteaza IMEDIAT (inclusiv pe /login si pe pagina MFA):
         useUserRoles(userId)          -> utilizator_roluri_multicont + sportivi(.in)       [2 cereri]
         useFetchAllowedClubs          -> rpc get_my_active_clubs                           [1]
         useAttendanceData(clubId)     -> vedere_cluburi_program_antrenamente (FARA fereastra de date)
                                          + anunturi_prezenta + statuse_prezenta
                                          + prezenta_antrenament .in(antrenament_id,[TOATE idurile]) [4, secvential partial]
         useSportivi(...)              -> rbv_sportivi_complet (count:'exact' + embed roluri) - ENABLED mereu
         usePlati(ctx)                 -> rbv_plati_club select * - ENABLED mereu
         useGrupe(ctx,club)            -> grupe + embed (enabled doar cu ctx)
       dupa ce activeRoleContext apare -> fetchAppData():
         critical (Promise.allSettled): clubs, roluri, grade, tipuri_plati, tipuri_abonament,
            sesiuni_examene, familii, nom_locatii, evenimente, taxe_anuale_config,
            vedere_detalii_examen, vedere_istoric_grade_sportiv (paginat 1000)          [~12-13]
         deferred (toate odata, imediat dupa): reduceri, rezultate, tranzactii (select *),
            view_istoric_plati_detaliat (select * - 11 s), deconturi_federatie,
            vize_sportivi + embed plati (7 s), decont_sportivi, taxa_anuala_config, preturi_config [9]
       efect currentUser: fetchIstoricVedere -> vedere_prezenta_detaliata (timeout, apoi fallback)
                         + 2 canale Realtime postgres_changes
  App.tsx: if (loading) -> skeleton;  loading = loadingData || rolesLoading
                                       || attendanceData.loading || accessLoading
           error = error || rolesError || attendanceData.error  -> SystemGuardian -> "Eroare de Sistem"
  useMFAGuard (dupa shell): getUser() + 2 cereri; data deja incarcate in memorie inainte de MFA
```

Total estimat la pornire: ~35 cereri HTTP, majoritatea in primele secunde, plus retry-uri React Query (default 3) peste interogarile cu timeout -> amplificare a incarcarii exact cand DB e saturat.

### Pattern 1 (Wave 1): decuplarea datelor necritice de shell
**What:** `attendanceData` nu mai intra in `loading` si `error` global; eroarea devine toast (o singura data) + `error` local expus ca `attendanceError` pentru widgeturi. Ramane `loading` doar pentru: sesiune -> roluri -> contextul activ -> setul "critic minim" (clubs, grade, locatii, tipuri*).
**When to use:** orice sursa de date folosita doar de anumite view-uri.
**Example (forma, nu cod final):**
```typescript
// Source: cod existent hooks/useDataProvider.ts:564-565 (de modificat)
const loading = loadingData || rolesLoading || accessLoading;          // fara attendanceData.loading
const combinedError = error || rolesError;                              // fara attendanceData.error
// attendance: expune attendanceData.error separat; useAttendanceData deja face showError (toast)
```
Atentie: componentele care citesc `filteredData.antrenamente` primesc `[]` pana sosesc datele (initial state existent) - verificati widgeturile `DashboardPrezentaAzi`, `AnuntPrezentaWidget`, `CalendarActivitati` sa nu afiseze "nu exista antrenamente" definitiv; folositi `attendanceData.loading` local acolo.

### Pattern 2 (Wave 1): enabled-guards si start amanat
```typescript
// Source: TanStack Query v5 docs (enabled) + hooks/useGrupe.ts:20 (pattern deja in repo)
useQuery({ queryKey: [...], enabled: !!contextId && !!session, queryFn })
```
`useSportivi`/`usePlati` din `useDataProvider` ruleaza azi FARA `enabled`, deci la montare (inainte de rol) trag `rbv_sportivi_complet` NEfiltrat pe club (`sportiviClubId` = undefined) si `rbv_plati_club select *`, cu cheie `contextId=undefined`; apoi, cand apare contextul, cheia se schimba si se repeta. Acelasi lucru pentru `useAttendanceData` (`clubId` undefined -> refetch cand apare clubul). Hook-ul `Sportivi/index.tsx:319` apeleaza `useSportivi` separat (alte chei) - `enabled` nou trebuie sa fie optional ca sa nu-l rupa (parametru nou cu default `true`, API compatibil - constrangere "nu se sparge API-ul").

### Pattern 3 (Wave 1): concurenta controlata + amanare dupa primul ecran
Rezultat dorit: max 4-6 cereri simultane; ordine: roluri -> critic minim -> (primul ecran) -> deferred in valuri, cele grele (`view_istoric_plati_detaliat`, `vize_sportivi`, `tranzactii`) doar cand un view le cere (lazy) sau, minimal, dupa `requestIdleCallback`/`setTimeout` si pe rand. Limitator propriu in `utils/` (10-15 linii, rezolva promisiuni in lot de N). Fara noi dependinte.

### Pattern 4 (Wave 2/3): expresii RLS echivalente, set-based (documentat Supabase)
Supabase documenteaza ca wrapping `(select fn())` muta evaluarea in InitPlan (o data pe statement) cand rezultatul NU depinde de rand, iar pentru membership se foloseste `col = ANY(ARRAY(select helper()))`; exemplele lor: 179 -> 9, 11000 -> 10, 178000 -> 12, 173000 -> 16 (unitati nelabelate, probabil ms) [CITED: supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv]. Pentru functii cu argument per rand (`has_access_to_club(club_id)`, `este_staff_club(club_id)`, `acces_extern_la_club(club_id)`, `apartine_familiei(familie_id)`) wrapping simplu NU ajuta (depind de rand) -> echivalentul este un helper STABLE `SECURITY DEFINER` care intoarce `uuid[]` (setul de cluburi) si predicatul `club_id = ANY(ARRAY(select helper()))`.

Dovada de echivalenta (obligatorie, vezi "Security Risk"): `has_access_to_club(c)` = exista un rand al userului cu rol SUPER_ADMIN_FEDERATIE, SAU rand cu `club_id = c` si rol in (ADMIN_CLUB, INSTRUCTOR, ADMIN). Echivalent: `(select este_super())` OR `c = ANY(ARRAY(select cluburi_staff()))`. Diferente de tratat explicit: `este_staff_club(NULL)` e TRUE pentru orice staff (argument NULL), pe cand `NULL = ANY(...)` e NULL -> trebuie ramura `OR (club_id IS NULL AND (select este_staff_oriunde()))` daca exista sportivi cu `club_id IS NULL`; functiile ignora header-ul de context (folosesc TOATE rolurile userului) - helperii noi trebuie sa faca la fel, NU sa foloseasca contextul activ.

### Anti-Patterns to Avoid
- **Mutarea predicatelor cu subquery pe tabele sub RLS in functii DEFINER "ca sa fie mai rapid":** ocoleste RLS-ul tabelului referit si LARGESTE accesul. Ex.: `EXISTS (SELECT 1 FROM inscrieri_competitie ...)` / `echipa_sportivi` din `Select_Sportivi_Unified` sunt acum supuse politicilor acelor tabele (SELECT pe `echipa_sportivi` e restrans pentru INSTRUCTOR/SPORTIV; `inscrieri_select` e `auth.uid() IS NOT NULL` dupa 36-AUDIT-LIVE). O functie DEFINER ar vedea TOATE randurile -> sportivi vizibili in plus pentru roluri la care `echipa_sportivi` nu e vizibila. NU in Wave 1/2; in Wave 3 doar cu dovada pe politicile LIVE.
- **Cresterea `statement_timeout`** ca solutie: ascunde simptomul si agraveaza coada (rapoarte de blocare mai lungi). Acceptabil doar ca plasa temporara si doar dupa decizia userului (vezi Open Questions).
- **Stergerea/comasarea politicilor** pe `sportivi` fara dump live: Faza 25 a gasit ~20 politici fantoma; `ALL` include si SELECT si scrierea.
- **`ALTER VIEW ... SET (security_invoker)` / `CREATE OR REPLACE VIEW` fara a re-seta `security_invoker=true`** (memorie: reseteaza optiunea -> bypass RLS silentios). Pastreaza `ALTER VIEW ... SET (security_invoker = true)` in aceeasi migrare, ca in `20261015a`.
- **Optimizari testate doar pe clubul mic** (31 sportivi): masoara si ca SUPER_ADMIN (3500 sportivi, toate cluburile) - exact cazul care pica.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dovada ca o politica noua nu largeste accesul | Revizuire "din ochi" a predicatelor | Fingerprint de randuri vizibile (count + md5 de id-uri) per user/context, inainte vs dupa, in tranzactie cu ROLLBACK | Politici fantoma + OR de ~10 politici fac revizuirea manuala nesigura |
| Test live RLS | Script nou de la zero | Pattern `tests/rls_izolare_cross_club_faza25.ts` (service role creeaza user efemer + canar, client cu header `active-role-context-id`, cleanup in `finally`) | Deja validat; ruleaza `npx tsx` |
| Cache static (clubs/grade/...) | Alt cache | `utils/cache.ts` existent (`getCachedData/setCachedData`) | Exista deja cu TTL |
| Paginare >1000 randuri | Bucle ad-hoc noi | `fetchAllPages` din `useDataProvider.ts:375` (scos intr-un util daca e nevoie) | PostgREST taie la 1000 silentios |
| Cron esuat | Reparare view materializat lipsa | `cron.unschedule` dupa verificare ca nu e folosit | MV nu mai exista; jobul nu face nimic util |

**Key insight:** problema e de *arhitectura de incarcare* si de *cost fix per cerere*, nu de volum. Cea mai mare parte a castigului vine din a face MAI PUTINE cereri si a nu lasa o cerere necritica sa doboare aplicatia; schimbarile RLS sunt a doua pirghie si singura cu risc de securitate.

## Cauze radacina ordonate (cu dovezi)

| # | Cauza | Dovada | Incredere | Efect |
|---|-------|--------|-----------|-------|
| 1 | Furtuna de ~35 cereri paralele + cereri premature/duplicate + retry x3 | `useDataProvider.ts:105-112` (useSportivi/usePlati fara `enabled`), `:332-356` (12 critice + 9 deferred in paralel), `index.tsx:18-25` (retry default 3), `useAttendanceData.ts:117` (refetch cand clubId se schimba); diagnostic: 12.4 s in browser vs 178+178 ms izolat; GoTrue 9 s | HIGH (mecanism), MEDIUM (cat din 12 s e coada la pool) | cheia timeout-urilor |
| 2 | Atenuare lipsa: eroare necritica = ecran de eroare; `attendanceData.loading` blocheaza primul ecran/MFA | `useDataProvider.ts:564-565`, `SystemGuardian.tsx:113-126`, `useAttendanceData.ts:71-72,110-113` | HIGH | explica EXACT mesajul "Eroare de Sistem: ...statement timeout" |
| 3 | Cost fix per cerere: planificare ~178 ms (fara plan cache la PostgREST) din expansiune RLS imbricata | diagnostic (178 ms plan, sute de InitPlan/SubPlan); `Select_Sportivi_Unified` (`20260711b`) refera inline `inscrieri_competitie` si `echipa_sportivi` (au propriile politici, cu `ext_p_*`/`ext_r_*` din Faza 36 si `rbv_ic_*`); `ext_r_deny_all` RESTRICTIVE pe ~120 tabele (`20261106c:~135-150`); view-urile care fac join pe `sportivi` multiplica expansiunea | MEDIUM (magnitudinea pe componente NEmasurata) | Wave 0 E1/E2 o masoara |
| 4 | Multiplicatori per-rand in view-uri | `vedere_cluburi_program_antrenamente` (`20261015a:62-67`): `LATERAL count(*) FROM sportivi WHERE grupa_id=g.id` re-evaluat pentru FIECARE rand de program (toate datele, nu doar fereastra), fiecare scan de `sportivi` trece prin RLS per rand; `view_istoric_plati_detaliat` (`20261007a:73-100`): 6+ subselecturi corelate pe `tranzactii WHERE p.id = ANY(t.plata_ids)` (nu foloseste index B-tree/GIN pe `=ANY`) -> O(plati x tranzactii); `vize_sportivi_select_scoped` (`20261005d:150-157`): `EXISTS(SELECT FROM sportivi ...)` per rand = expansiune sportivi in interiorul politicii; `rbv_plati_club`: `has_access_to_club(COALESCE(...))` per rand | HIGH (mecanism din cod); MEDIUM (magnitudine) | explica 11-12 s pe aceste view-uri si colapsul la SUPER_ADMIN |
| 5 | Incarcari nemarginite | `useAttendanceData` fara filtru de data la pornire (`useDataProvider.ts:97`) + `.in('antrenament_id', TOATE)` (`:81-84`; 265 id-uri ~ 10 KB URL, peste ~14 KB hang-ul documentat in `loading-hang-istoric-grade`); SUPER_ADMIN = fara filtru de club => toate cluburile; `deferred select('*')` pe tabele intregi, plafonate silentios la 1000 de PostgREST | HIGH (cod); explicatia colapsului SUPER_ADMIN = MEDIUM | |
| 6 | Functii helper costisitoare: toate plpgsql/sql `SECURITY DEFINER` + `SET search_path` (nu pot fi inline-uite); `is_super_admin`/`get_active_club_id`/`get_active_role` au bloc `BEGIN ... EXCEPTION` (subtranzactie) la fiecare apel | `20260319_security_audit_fixes.sql:427-500,526-581,747-769`; `20261106a:110-141` | HIGH (mecanism), LOW-MEDIUM (cat conteaza) | cost per rand cand apelul e in politica |
| 7 | Zgomot/probe inutile | `vedere_sportivi_detaliat_mv` = job pg_cron (nu app) [corectie]; `fetchIstoricVedere` la pornire pentru orice rol (`useDataProvider.ts:208-211`) desi `MartialAttendance.tsx:79` il apeleaza singur; `vedere_prezenta_detaliata` expira (probabil lipsa index pe `prezenta_antrenament(sportiv_id)` sau RLS per rand - de verificat); `pg_timezone_names` | MEDIUM | taie cereri/ erori inutile |

**Necunoscut explicit (nu afirmat):** "current transaction is aborted, commands ignored until end of transaction block" la SUPER_ADMIN. In Postgres, `statement_timeout` (57014) NU e prins de `EXCEPTION WHEN OTHERS` [ASSUMED]; deci cauza nu e blocul `EXCEPTION` din helperi. Ipoteza de lucru: cascada dupa timeout pe aceeasi conexiune/tranzactie (pooler/PostgREST) sau o functie/RPC multi-statement. De clarificat cu primul eveniment din `postgres_logs`/PostgREST logs (query in "Live verification" #L10) inainte de a o declara rezolvata.

## Recomandari ordonate dupa castig / risc

### Wave 0 - masurare + inventar live (zero schimbari, zero risc)
Rezultatul controleaza daca Wave 3 e necesar. Vezi "DE VERIFICAT live" si "What to Measure".

### Wave 1 - doar frontend (risc RLS = 0; castig mare)
| # | Schimbare | Fisier(e) | Risc functional | Verificare |
|---|-----------|-----------|-----------------|------------|
| 1.1 | Scoate `attendanceData.loading`/`.error` din `loading`/`combinedError`; expune-le separat; erorile necritice -> toast o singura data | `hooks/useDataProvider.ts:564-565`, `hooks/useAttendanceData.ts` | Widgeturi de prezenta pot arata gol cat se incarca -> folosesc `attendanceData.loading` local | Simuleaza timeout (blocheaza cererea in DevTools): aplicatia se deschide, toast, restul functioneaza |
| 1.2 | `enabled: !!session && !!activeRoleContext` pe `useSportivi`/`usePlati` in DataProvider si pe `useAttendanceData` (nu porni pana nu exista clubul/contextul); parametru optional ca sa nu rupa `Sportivi/index.tsx` | `useSportivi.ts`, `usePlati.ts`, `useAttendanceData.ts`, `useDataProvider.ts` | Mic; `isLoading` al unei query dezactivate e `false` in v5 (`isPending` true) - nu lasati UI sa creada ca "s-a incarcat gol" | Numara cererile `rbv_sportivi_complet` la pornire: 1, nu 2-3 |
| 1.3 | `retry`: nu reincerca pe `57014`/`PGRST` timeout; `retry: 1` implicit + `retryDelay` exponential; in `fetchAppData` nu exista retry (ok) | `index.tsx:18` | Mic | Pe timeout simulat: o singura reincercare |
| 1.4 | `count: 'exact'` doar cand exista paginare (consumatorii: `Sportivi/index.tsx:319`); in DataProvider nu e folosit `count` | `hooks/useSportivi.ts:34-36` | Verifica `Sportivi/index.tsx` ca foloseste `count` doar cu pagination | Cererea din DataProvider nu mai are `Prefer: count=exact` |
| 1.5 | Limitator de concurenta (~N=4) + deferred in valuri DUPA primul ecran; `istoricPlatiDetaliat`, `vizeSportivi`, `tranzactii`, `rezultate`, `decontSportivi` incarcate la cerere (cand view-ul Plati/Taxe se monteaza) sau minimal secvential dupa idle | `hooks/useDataProvider.ts:345-472` + util nou in `utils/` | MEDIU: ~44 fisiere citesc `istoricPlatiDetaliat` din context (grep) -> varianta "la cerere" cere `ensureLoaded(key)` in context; varianta minima (secvential dupa idle) nu schimba contractul | Playwright: pe `vite build`+preview, max N cereri simultane; Plati hub afiseaza date |
| 1.6 | Scoate `fetchIstoricVedere(currentUser.id)` din efectul de pornire (pastreaza canalul Realtime, refetch-ul se face deja guardat de `lastFetchedSportivId`); consumatorul real e `MartialAttendance.tsx:79` | `useDataProvider.ts:208-211` | Mic; verifica `my-portal`/`RaportIntervalExamen` care citesc `istoricPrezenta` din context | `MartialAttendance` continua sa-si incarce datele |
| 1.7 | Prezenta: fereastra de date (ex. -60/+30 zile) la pornire; restul la cerere in modulul Prezenta; `.in('antrenament_id', ids)` impartit in loturi <= ~100 id-uri (<= ~4 KB URL) | `useAttendanceData.ts:47-87`, `useDataProvider.ts:97` | MEDIU: componentele care cer istoricul complet (ListaPrezentaAntrenament, rapoarte) trebuie sa treaca filtrul explicit (hook-ul accepta deja `filters`) | SUPER_ADMIN: pornire fara URL > 8 KB; rapoartele raman complete |
| 1.8 | `processSettledQueries`: o eroare (nu doar 42501) NU trebuie sa suprascrie datele existente cu `[]`; marcheaza cheia ca "partiala" si arata banner/toast discret | `utils/supabaseHelpers.ts:23-37`, `useDataProvider.ts:440-454` | Mic; schimba comportamentul la eroare (azi: array gol silentios) | Test cu o cheie blocata: restul datelor raman |
| 1.9 | (optional, design) Ridica `mfaChecked` intr-un store (Zustand) si nu porni deferred pana MFA trece / pe ecranul `setup-mfa` | `App.tsx`, `useMFAGuard.ts`, `useDataProvider.ts` | MEDIU: adauga ~2 round-trip-uri inaintea datelor pe calea dispozitiv de incredere; are beneficiu de securitate (nu aduce date sensibile in memorie inainte de MFA) | Decizie user (vezi Open Questions) |

### Wave 2 - DB, fara schimbare de rezultat (risc RLS mic; fiecare cu fingerprint)
| # | Schimbare | Risc securitate | Verificare |
|---|-----------|-----------------|------------|
| 2.1 | `vedere_cluburi_program_antrenamente`: inlocuieste `LEFT JOIN LATERAL (count(*) FROM sportivi WHERE grupa_id = g.id)` cu `LEFT JOIN (SELECT grupa_id, count(*) c FROM sportivi GROUP BY grupa_id) sc ON sc.grupa_id = g.id` (acelasi RLS, o singura scanare) si `nom_locatii` printr-un join/LATERAL care calculeaza `locatie_grupa_la_data` o data per (grupa,data) | NEMODIFICAT: sub-selectul ramane subiect RLS (invoker) -> acelasi numar. Pastreaza `ALTER VIEW ... SET (security_invoker = true)` in aceeasi migrare | Fingerprint pe (id, sportivi_count) per user; EXPLAIN inainte/dupa (E4) |
| 2.2 | `view_istoric_plati_detaliat`: inlocuieste `p.id = ANY(t.plata_ids)` cu `t.plata_ids @> ARRAY[p.id]` + `CREATE INDEX ... USING gin (plata_ids)` pe `tranzactii`; evalueaza o singura agregare per plata (LATERAL/CTE) in loc de 6 subselecturi | Echivalent logic (doar uuid[] fara NULL-uri; de verificat `tranzactii.plata_ids` pentru NULL elemente); `security_invoker=true` re-setat | Fingerprint pe (plata_id, total_incasat, rest_de_plata, tranzactie_id) - egalitate numerica exacta |
| 2.3 | Indexuri lipsa (doar dupa Q4 live): candidati `prezenta_antrenament(sportiv_id)`, `prezenta_antrenament(antrenament_id)`, `sportivi(club_id)`, `sportivi(grupa_id)`, `sportivi(user_id)`, `inscrieri_competitie(sportiv_id)`, `echipa_sportivi(sportiv_id)`, `inscrieri_examene(sportiv_id)`, `utilizator_roluri_multicont(user_id)` (+ `(user_id, rol_denumire)`), `plati(club_id)`, `plati(sportiv_id)`, `tranzactie_plata(plata_id)`, `tranzactii(club_id)` | Zero (nu schimba semantica); tabele mici (3500 sportivi) -> `CREATE INDEX` simplu e instantaneu; `CONCURRENTLY` nu merge in migrare tranzactionala | `EXPLAIN` arata Index Scan; `pg_stat_user_indexes` |
| 2.4 | `cron.unschedule('refresh-dashboard-sportivi')` (dupa Q6: nimic nu citeste MV; jobul esueaza la 10 min) | Zero | `cron.job_run_details` nu mai arata erori |
| 2.5 | `rbv_plati_club`/`rbv_sportivi_complet`: nu cere `select *` in aplicatie (lista de coloane) si nu duplicati `s.*` + joinuri nefolosite; optional `rbv_sportivi_complet` fara `cluburi`/`grade`/`grupe` joinuri daca coloanele nu se folosesc (verifica `fetchSportiviData` select-ul: foloseste club_nume/grad_nume/grupa_denumire -> raman) | Zero/mic | Fingerprint pe id-uri |

### Wave 3 - expresii RLS echivalente (DOAR daca Wave 0/1 arata ca RLS ramane dominant)
Ordine dupa risc:
1. **STABLE/`(select ...)` pe functiile FARA argument** din politici (`is_super_admin()`, `get_own_sportiv_id()`, `get_active_club_id()`, `este_doar_extern()` deja wrapped, `auth.uid()`): ALTER POLICY cu `(select public.is_super_admin())`. Semantica identica (valoare constanta pe statement). Risc ~0. Model: `20261015a` pct. 4.
2. **Helperi set-based** `cluburi_staff()` / `clubul_extern()` (STABLE, SECURITY DEFINER, `SET search_path = public, pg_catalog`, `uuid[]`; REVOKE EXECUTE de la `anon`/PUBLIC; GRANT `authenticated` - vezi acl-ul din Faza 37: `tests/acl_definer_faza37.ts` + allowlist trebuie actualizate cu functiile noi) si `ALTER POLICY` doar pe expresia din `USING`. Se aplica pe: `sportivi` (`Staff - Manage Own Club Sportivi`, `POLITICA_FINALA_SPORTIVI_V3`, `ext_p_sportivi_sel`, `ext_r_sportivi_sel`), `vize_sportivi_select_scoped`, `rbv_plati_club`. NU se schimba numele/rolul/comanda/PERMISSIVE-RESTRICTIVE ale politicilor.
3. **`Select_Sportivi_Unified`**: cele 2 `EXISTS` inline pe `inscrieri_competitie`/`echipa_sportivi` sunt cea mai probabila sursa de expansiune imbricata. Variante: (a) lasa-le (risc 0, castig 0); (b) functii DEFINER care reproduc EXACT predicatul SELECT al acelor tabele pentru userul curent (nu "exista orice rand") - complex, cere dump live + dovada; (c) restrange la clubul vizibil. **Nu se aplica fara dovada de echivalenta pe politicile LIVE si fara experimentul E2 care arata un castig semnificativ.**
4. `ext_r_deny_all` (120 tabele): NU se elimina (e garda reala a rolului extern - Faza 36/37). Doar se masoara (E1) cat costa in planificare; daca e mare, optiuni (planner decide cu userul): un singur predicat mai ieftin, sau `TO` pe rol specific nu e posibil (nu exista rol DB pentru extern, e rol aplicativ).

### Ce NU recomand in aceasta faza
- Crestere compute / `statement_timeout`: decizie de cost/produs (vezi Open Questions), nu fix.
- Rescrierea intregului sistem de date la RPC-uri/bundle (`get_startup_bundle`) - castiga plan cache plpgsql dar e refactor mare si schimba contractul `useData()`; de reconsiderat dupa Wave 1/2 daca tot nu e suficient.
- Materialized views pentru `rbv_sportivi_complet`/`view_istoric_plati_detaliat`: MV nu respecta RLS (rezultatul e al ownerului) -> ar necesita filtrare manuala = risc cross-club major; evitat.

## Security Risk al schimbarilor RLS (non-widening) si cum se dovedeste

**Regula:** orice migrare Wave 2/3 trebuie sa treaca *Fingerprint Invariance Test*: multimea de randuri vizibile (si numarul) per (utilizator, context, tabel/view) identica inainte si dupa. Se ruleaza (1) in tranzactie cu `ROLLBACK` ca experiment, (2) din nou dupa aplicarea reala.

Matrice minima de utilizatori reali (din `utilizator_roluri_multicont`): 1 SUPER_ADMIN_FEDERATIE; 2 ADMIN_CLUB de cluburi diferite; 1 INSTRUCTOR; 1 SPORTIV (+ unul cu familie); 1 REPREZENTANT_COMPETITIE (doar extern) cu grant activ; 1 utilizator multi-rol (alt club); 1 membru de comisie examen; anon. Tabele/view-uri: `sportivi`, `rbv_sportivi_complet`, `plati`, `rbv_plati_club`, `vize_sportivi`, `grupe`, `program_antrenamente`, `vedere_cluburi_program_antrenamente`, `prezenta_antrenament`, `istoric_grade`, `inscrieri_competitie`, `echipa_sportivi`, `view_istoric_plati_detaliat`, `tranzactii`.

Template fingerprint (rulat ca `postgres`; `SET LOCAL ROLE` coboara privilegiile; fara date scrise):
```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub','<USER_UUID>','role','authenticated')::text, true);
select set_config('request.headers',
  json_build_object('active-role-context-id','<CTX_UUID>')::text, true);
select 'sportivi' t, count(*) n, md5(coalesce(string_agg(id::text, ',' order by id),'')) h from public.sportivi
union all select 'vize_sportivi', count(*), md5(coalesce(string_agg(id::text, ',' order by id),'')) from public.vize_sportivi
union all select 'vcpa', count(*), md5(coalesce(string_agg(id::text||':'||sportivi_count::text, ',' order by id),'')) from public.vedere_cluburi_program_antrenamente
-- ... restul tabelelor din matrice
;
rollback;
```
(`auth.uid()` citeste `request.jwt.claims`; helperii proiectului citesc `request.headers` ca JSON - confirmat din functiile din `20260319_security_audit_fixes.sql`; sintaxa `set_config(... , true)` = local la tranzactie [CITED: pattern Supabase RLS testing; MEDIUM].)

Reguli de proiectare a expresiilor noi:
1. Aceeasi comanda/rol/PERMISSIVE-vs-RESTRICTIVE/nume; doar `USING`/`WITH CHECK` echivalent. `ALTER POLICY` pe `ALL` modifica si scrierea -> acelasi test pe INSERT/UPDATE/DELETE (suita existenta, mai jos).
2. Helperii nu folosesc `request.headers` (functiile curente nu il folosesc, cu exceptia `is_super_admin`/`get_active_club_id`/`get_active_role` - se pastreaza exact semantica fiecareia, nu se "unifica").
3. NULL: `col = ANY(set)` nu e adevarat pentru `col IS NULL`; `este_staff_club(NULL)` e TRUE pentru staff. Verifica `select count(*) from sportivi where club_id is null`; daca > 0, ramura NULL se pastreaza explicit.
4. Functii noi: `SET search_path = public, pg_catalog` (hardening Faza 37), `REVOKE EXECUTE ... FROM PUBLIC, anon`, `GRANT EXECUTE ... TO authenticated`; actualizeaza `tests/acl_definer_faza37.allowlist.json` si ruleaza `tests/acl_definer_faza37.ts`. Cu `FORCE ROW LEVEL SECURITY`, bypass-ul DEFINER functioneaza doar daca ownerul are BYPASSRLS (aici `postgres` are, per constrangerea de lucru) - verifica live `relforcerowsecurity` + `rolbypassrls` (Q7).
5. DDL in tranzactie ia `ACCESS EXCLUSIVE` pe tabel (ALTER POLICY/CREATE VIEW) pe durata tranzactiei -> experimentele `BEGIN...ROLLBACK` sa fie scurte (secunde) si in afara orelor de varf, ori pe un branch/clona; nu lasa tranzactia deschisa intre apeluri MCP.

Suita de regresie existenta (rulata pe live dupa fiecare migrare RLS): `tests/rls_izolare_cross_club_faza25.ts`, `tests/rls_acces_extern_faza36.ts`, `tests/rls_competitii_scriere_faza36.ts`, `tests/rls_definer_garzi_bani_faza37.ts`, `tests/rls_definer_garzi_date_faza37.ts`, `tests/rls_izolare_sezoane_faza27.ts`, `tests/rls_taxe_anuale_faza33.ts`, `tests/acl_definer_faza37.ts`. Rulare: `npx tsx tests/<fisier>.ts`. Plus un test NOU `tests/rls_fingerprint_faza38.ts` (snapshot JSON `before`/`after` pe matricea de mai sus).

## Common Pitfalls

### Pitfall 1: Optimizare pe clubul mic, esec la SUPER_ADMIN
**What goes wrong:** 31 sportivi la Phi Hau arata "bine"; SUPER_ADMIN incarca 3500 sportivi + toate antrenamentele + toate platile.
**How to avoid:** masoara si cu contextul SUPER_ADMIN; fiecare criteriu de succes are varianta SUPER_ADMIN.

### Pitfall 2: Dev (StrictMode) dubleaza efectele; productia se comporta diferit
**How to avoid:** masuratori doar pe `npm run build` + `npm run preview` (memorie `feedback_strictmode_masks_prod_bug_scroll`).

### Pitfall 3: Cerere "reusita" cu timeout = date goale care suprascriu datele
`processSettledQueries` trateaza orice eroare diferita de 42501 ca succes cu `[]` (`supabaseHelpers.ts:29-34`) iar `setData(... finalData.x || prev.x)` - un array gol e truthy -> inlocuieste datele existente. Dupa Wave 1.8 verifica si `fetchAppData` re-rulat (retry) nu sterge ce era incarcat.

### Pitfall 4: URL `.in([...])` supradimensionat
Deja produs un hang (`loading-hang-istoric-grade`). Orice rescriere cu liste de id-uri: loturi <= ~100 sau filtru pe `club_id`/data, nu enumerare.

### Pitfall 5: `CREATE OR REPLACE VIEW` reseteaza `security_invoker`; MV ocolesc RLS
Re-seteaza `ALTER VIEW ... SET (security_invoker = true)` in aceeasi migrare (cum face `20261015a`). Nu inlocui view-urile cu MV. `vedere_istoric_grade_sportiv` si `vedere_prezenta_sportiv` au avut `reloptions` NULL (DEC-6 in 36-AUDIT-LIVE) - verifica live (Q5) si NU le schimba in aceasta faza (e tema de securitate separata; schimbarea adauga cost RLS).

### Pitfall 6: Politici fantoma
Orice ALTER/DROP de politica porneste de la dump-ul LIVE (Q1), nu de la fisierele de migratie (Faza 25).

### Pitfall 7: `git`/migrari
`supabase/` e in `.gitignore`: `git add -f` pe migrari noi. Migrarile se aplica prin orchestrator (MCP) si se comit ca fisier; nu se rescrie migrarea `20261015a`.

### Pitfall 8: Realtime cu RLS
Cele 2 canale `postgres_changes` (prezenta_antrenament, anunturi_prezenta) fac verificari RLS pe fiecare modificare pentru fiecare abonat [ASSUMED - comportament Realtime]; nu sunt cauza pornirii, dar adauga incarcare cand se salveaza prezenta. Le lasam; se reevalueaza doar daca Wave 0 arata `realtime.*` in pg_stat_statements.

### Pitfall 9: Evaluarea ordinii politicilor
Politicile permisive se combina prin OR; evaluarea pe rand urmeaza ordinea in care sunt expandate (la PG >= 10 ordonate dupa nume [ASSUMED - de la memorie, de verificat in `EXPLAIN` pe `sportivi`]). Nu te baza pe scurtcircuit "cel mai ieftin primul".

## Code Examples

### Experiment EXPLAIN ca `authenticated` (Wave 0, read-only)
```sql
-- Rulat intr-un singur apel (BEGIN..ROLLBACK), ca postgres:
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','<USER_UUID>','role','authenticated')::text, true);
select set_config('request.headers', json_build_object('active-role-context-id','<CTX_UUID>')::text, true);
explain (analyze, buffers, summary on)
  select * from public.vedere_cluburi_program_antrenamente where club_id = '<CLUB_UUID>';
rollback;
-- Numara "InitPlan"/"SubPlan" in output si noteaza "Planning Time" vs "Execution Time".
-- Planificare singura (rapid): EXPLAIN (SUMMARY ON) fara ANALYZE.
```

### Pattern set-based (Wave 3, schita - NU de aplicat fara fingerprint)
```sql
-- Source: Supabase RLS performance guide (select-wrapping + ARRAY(select ...)); adaptat la helperii proiectului
create or replace function public.cluburi_staff() returns uuid[]
language sql stable security definer set search_path = public, pg_catalog as $$
  select coalesce(array_agg(club_id), '{}')
  from public.utilizator_roluri_multicont
  where user_id = auth.uid() and club_id is not null
    and rol_denumire in ('ADMIN_CLUB','INSTRUCTOR','ADMIN')
$$;
-- politica (doar USING schimbat, ALTER POLICY, acelasi nume/cmd/rol):
--   (select public.is_super_admin()) OR club_id = any (array(select public.cluburi_staff()))
-- echivalent cu has_access_to_club(club_id), cu tratarea explicita a NULL si a is_super_admin vs rol SUPER in rand.
```

### Limitator de concurenta (Wave 1, fara dependinte)
```typescript
// utils/limiteazaConcurenta.ts (schita) - rezolva task-uri in loturi, pastreaza ordinea cheilor
export async function ruleazaCuLimita<T>(sarcini: (() => PromiseLike<T>)[], limita = 4): Promise<PromiseSettledResult<T>[]> {
    const rezultate: PromiseSettledResult<T>[] = new Array(sarcini.length);
    let i = 0;
    const worker = async () => {
        while (i < sarcini.length) {
            const idx = i++;
            try { rezultate[idx] = { status: 'fulfilled', value: await sarcini[idx]() }; }
            catch (reason) { rezultate[idx] = { status: 'rejected', reason }; }
        }
    };
    await Promise.all(Array.from({ length: Math.min(limita, sarcini.length) }, worker));
    return rezultate;
}
// Atentie: query builderele supabase-js sunt "thenable" LENEȘE (pornesc la await); azi
// `Object.values(criticalQueries)` le porneste prin Promise.allSettled. Pentru limitare,
// construieste functii () => query, nu obiecte query deja create.
```

## State of the Art

| Vechi | Curent | Impact |
|-------|--------|--------|
| `auth.uid() = user_id` / functii in politica evaluate per rand | `(select auth.uid())`, `col = ANY(ARRAY(select helper()))` | InitPlan o data/statement; masurat de Supabase 179->9 etc. [CITED] |
| Politici fara `TO` | `TO authenticated` explicit | exclude `anon` fara a rula restul verificarii [CITED]; `ext_*` din Faza 36 deja `TO authenticated`; politicile mai vechi pe `sportivi` ("Select_Sportivi_Unified", `FOR SELECT USING`) NU au `TO` -> se aplica si `anon` (anon 3 s timeout, GRANT pe `rbv_sportivi_complet` TO anon exista in `20260428`) - de verificat live (Q1) |
| `statement_timeout` default | `authenticated` 8 s, `anon` 3 s, service_role cade pe `authenticator` 8 s; suprascriere per rol (`alter role ... set statement_timeout`) + `NOTIFY pgrst, 'reload config'`, sau per functie (`SET statement_timeout`) [CITED: supabase.com/docs/guides/database/postgres/timeouts] | optiune, nu fix |

**Deprecated/outdated:** `vedere_sportivi_detaliat_mv` (MV inexistent; cron esuat). `vedere_prezenta_detaliata` fallback pe tabele de baza = cale lenta/erori la pornire pentru orice rol.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Timpul de asteptare la pool PostgREST/Supavisor nu intra in `statement_timeout` si explica 12 s in browser vs 8 s timeout | Summary | Daca nu exista coada, restul diferentei vine din altceva (CPU DB saturat); Wave 1 ramane valid, dar prioritatea 1.5 se muta |
| A2 | `pg_timezone_names` (3198 apeluri) vine din reincarcarea schema cache PostgREST, nu din aplicatie | Summary | Mic; verifica `userid`/query in pg_stat_statements |
| A3 | `statement_timeout` (57014) nu e prins de `EXCEPTION WHEN OTHERS` | Cauze | Schimba ipoteza pentru eroarea "transaction is aborted" la SUPER_ADMIN |
| A4 | Politicile permisive se expandeaza in ordinea numelui (PG >= 10) | Pitfall 9 | Mic; afecteaza doar scurtcircuitul |
| A5 | Realtime face verificari RLS per modificare per abonat | Pitfall 8 | Mic |
| A6 | `ext_r_deny_all` + expansiunea imbricata din `Select_Sportivi_Unified` sunt contributori majori la planificare (178 ms) | Cauza 3 | Daca planificarea e dominata de altceva (ex. functii/catalog), Wave 3 are castig mic; E1/E2 decid |
| A7 | `tranzactii.plata_ids` nu contine elemente NULL si coloana e `uuid[]` | Wave 2.2 | `@>` vs `= ANY` ar diferi pe NULL-uri; fingerprint o prinde |
| A8 | Nu exista sportivi cu `club_id IS NULL` care sa conteze pentru staff | Wave 3 | Ramura NULL trebuie pastrata explicit |
| A9 | PostgREST trimite interogari fara prepared statements -> fara plan cache | Summary/Cauza 3 | Daca exista cache, planificarea repetata e mai putin dominanta |

## Open Questions

1. **Ce parte din 178 ms de planificare e RLS imbricat vs `ext_r_deny_all` vs view-uri?**
   - Stim: planul are sute de InitPlan/SubPlan; Faza 36 a adaugat politici pe `sportivi` + deny pe ~120 tabele; problema exista si inainte (20261015a, 15.10).
   - Neclar: contributia fiecaruia.
   - Recomandare: experimentele E1/E2/E3 din Wave 0 inainte de orice migrare Wave 3.
2. **Cum se poate ajunge la "transaction is aborted" la SUPER_ADMIN?** Vezi Q L10; nu se afirma o cauza.
3. **Compute size / `max_connections` / dimensiunea pool-ului PostgREST + Supavisor?** Nu se vad din repo; Dashboard. Daca instanta e minima (Micro), cresterea compute-ului e o pirghie fara risc de cod - decizie user (cost).
4. **Decizii pentru user:** (a) MFA ca poarta pentru incarcarea datelor (1.9)? (b) Accepta ca `istoricPlatiDetaliat`/`vizeSportivi`/`tranzactii` sa se incarce la cerere (lazy) in loc de la pornire? (c) Accepta fereastra de date la prezenta (ex. -60/+30 zile) cu "incarca tot" in modulul Prezenta? (d) Accepta o ridicare temporara a `statement_timeout` ca plasa de siguranta pana la finalul fazei?
5. **Unde ruleaza efectiv `vedere_prezenta_detaliata` si de ce expira?** (index lipsa pe `prezenta_antrenament(sportiv_id)` vs RLS per rand). Q4 + EXPLAIN.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Acces DB live (MCP Supabase / orchestrator) | Wave 0, toate migrarile | In aceasta cercetare: NU; planner trebuie sa ceara orchestratorului | Postgres 17 | - (blocant pentru Wave 0/2/3, nu pentru Wave 1) |
| Node/tsx + `.env` (service role) | teste `tests/rls_*.ts`, fingerprint | Presupus (rulate in faze anterioare) | tsx 4.21 | - |
| Playwright | masurare pornire pe preview | Existent (`npm test`) | - | masurare manuala DevTools |
| pg_stat_statements | masuratori | Exista (diagnostic il foloseste); `track_planning` NECUNOSCUT | - | `EXPLAIN (SUMMARY)` per interogare |
| pg_cron | Wave 2.4 | Exista (job-urile din 30-01-SUMMARY) | - | - |

**Fara blocaj pentru Wave 1** (doar cod frontend).

## Security Domain

`security_enforcement: true`, ASVS nivel 1, `block_on: high`.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | marginal (MFA ordering, 1.9) | `useMFAGuard`/`emailMfaService` existente; nu se slabeste poarta |
| V3 Session Management | marginal | `supabase.auth.getSession()` local (deja reparat 9ae64881) |
| V4 Access Control | **DA - risc principal** | RLS Postgres; non-widening prin fingerprint + suita `tests/rls_*` |
| V5 Input Validation | da (minor) | loturi `.in()` limitate; nu interpolezi string-uri in `.or()` (existent in `useSportivi.ts:58` - searchTerm in `.or()`; in afara scopului, de notat) |
| V6 Cryptography | nu | - |

| Pattern | STRIDE | Mitigare standard |
|---------|--------|---------------------|
| Predicat RLS rescris care largeste accesul (cross-club financiar/medical) | Information Disclosure | Fingerprint Invariance Test; ALTER POLICY doar pe expresie; suita live |
| Functie DEFINER noua exploatabila (search_path, EXECUTE pentru anon) | Elevation of Privilege | `SET search_path = public, pg_catalog`, REVOKE FROM PUBLIC/anon, `acl_definer_faza37` allowlist |
| MV/view fara `security_invoker` ocoleste RLS | Information Disclosure | `ALTER VIEW ... SET (security_invoker=true)` in aceeasi migrare; nu MV |
| Date sensibile in memoria clientului inainte de MFA | Information Disclosure | optiunea 1.9 (decizie user) |
| Extern (REPREZENTANT_COMPETITIE) obtine acces prin schimbari la `ext_*` | Elevation of Privilege | `ext_r_deny_all` nu se atinge; `tests/rls_acces_extern_faza36.ts` obligatoriu |

## DE VERIFICAT live (read-only, de rulat prin orchestrator inainte de planificare finala)

Toate sunt `SELECT`/`EXPLAIN` in tranzactii cu ROLLBACK; fara scriere.

**L1 - politici LIVE pe tabelele fierbinti** (sursa de adevar, nu migrarile):
```sql
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename in
 ('sportivi','inscrieri_competitie','echipa_sportivi','echipe_competitie','vize_sportivi','plati','tranzactii',
  'tranzactie_plata','grupe','program_antrenamente','prezenta_antrenament','istoric_grade','inscrieri_examene',
  'sesiuni_examene','utilizator_roluri_multicont','cluburi','grade','nom_locatii','familii','evenimente')
order by tablename, permissive desc, policyname;
```
**L2 - numar politici per tabel** (cat adauga `ext_r_deny_all`):
```sql
select tablename, count(*) filter (where permissive='PERMISSIVE') perm, count(*) filter (where permissive='RESTRICTIVE') restr
from pg_policies where schemaname='public' group by 1 order by perm+restr desc limit 40;
```
**L3 - functii helper: corp, volatilitate, DEFINER, config, limbaj**
```sql
select p.proname, pg_get_function_identity_arguments(p.oid) args, p.provolatile, p.prosecdef, l.lanname, p.proconfig,
       pg_get_functiondef(p.oid) def
from pg_proc p join pg_language l on l.oid=p.prolang
where p.pronamespace='public'::regnamespace and p.proname in
 ('has_access_to_club','este_staff_club','este_staff','is_super_admin','get_active_club_id','get_active_role',
  'get_own_sportiv_id','apartine_familiei','acces_extern_la_club','acces_extern_competitie','acces_extern_la_competitie',
  'acces_extern_la_sportiv','este_doar_extern','is_sportiv_candidat_comisie','is_comisie_member','get_my_active_clubs',
  'get_my_clubs','locatie_grupa_la_data','poate_gestiona_taxe_club');
```
**L4 - indexuri existente** pe: `sportivi, inscrieri_competitie, echipa_sportivi, echipe_competitie, inscrieri_examene, prezenta_antrenament, program_antrenamente, plati, tranzactii, tranzactie_plata, utilizator_roluri_multicont, vize_sportivi, istoric_grade, acces_competitie_extern`:
```sql
select tablename, indexname, indexdef from pg_indexes where schemaname='public' and tablename in (...) order by 1,2;
select relname, n_live_tup from pg_stat_user_tables where schemaname='public' order by n_live_tup desc limit 30;
select count(*) from public.sportivi where club_id is null;
```
**L5 - view-uri: optiuni si definitii live**
```sql
select c.relname, c.reloptions, pg_get_viewdef(c.oid) def from pg_class c
where c.relkind='v' and c.relnamespace='public'::regnamespace and c.relname in
 ('rbv_sportivi_complet','rbv_plati_club','vedere_cluburi_program_antrenamente','vedere_prezenta_detaliata',
  'view_istoric_plati_detaliat','vedere_detalii_examen','vedere_istoric_grade_sportiv','vedere_prezenta_sportiv');
select relname, relrowsecurity, relforcerowsecurity from pg_class where relnamespace='public'::regnamespace and relname in ('sportivi','plati','tranzactii','inscrieri_competitie');
select rolname, rolbypassrls from pg_roles where rolname in ('postgres','authenticated','anon','authenticator','service_role');
```
**L6 - cron:** `select jobid,jobname,schedule,command,active from cron.job; select jobid,status,return_message,start_time from cron.job_run_details order by start_time desc limit 20;`
**L7 - configuratie/saturare:**
```sql
select rolname, rolconfig from pg_roles where rolname in ('anon','authenticated','authenticator','service_role','postgres');
show max_connections; show pg_stat_statements.track_planning;
select state, usename, application_name, count(*) from pg_stat_activity group by 1,2,3 order by 4 desc;  -- rulat IN timpul unei porniri
```
Dashboard (nu SQL): dimensiune compute, pool size Supavisor/PostgREST, Max Rows API, plan.
**L8 - top interogari:**
```sql
select left(query,140) q, calls, round(mean_exec_time::numeric,1) mean_ms, round(max_exec_time::numeric) max_ms, round(total_exec_time::numeric) total_ms
from pg_stat_statements order by total_exec_time desc limit 25;
select userid::regrole, calls, mean_exec_time, left(query,100) from pg_stat_statements where query ilike '%pg_timezone_names%';
```
**L9 - experimente de planificare (rolled back), ca ADMIN_CLUB si ca SUPER_ADMIN** (template "Experiment EXPLAIN"):
- E0 baseline: `rbv_sportivi_complet`, `vedere_cluburi_program_antrenamente`, `view_istoric_plati_detaliat`, `vize_sportivi` (cu embed plati), `vedere_prezenta_detaliata` (cu `sportiv_id` real si cu uuid-ul de user), `rbv_plati_club`, `sesiuni_examene`, `vedere_detalii_examen`, `vedere_istoric_grade_sportiv` - noteaza Planning/Execution, nr InitPlan/SubPlan.
- E1 (in tx): `DROP POLICY ext_r_deny_all` pe tabelele implicate -> delta planificare (limita superioara a castigului).
- E2 (in tx): inlocuieste temporar `Select_Sportivi_Unified` cu varianta fara cele 2 `EXISTS` -> delta (limita superioara; NU e de aplicat).
- E3 (in tx): `has_access_to_club(club_id)` -> `club_id = ANY(ARRAY(select ...))` pe `sportivi` -> delta executie la SUPER_ADMIN.
- E4 (in tx): `vedere_cluburi_program_antrenamente` cu count pre-agregat -> delta executie.
- E5 (in tx): indexuri candidate din 2.3 -> `EXPLAIN` (Index Scan?).
- E6 (in tx): `view_istoric_plati_detaliat` cu `@>` + GIN -> delta.
(ATENTIE la blocari ACCESS EXCLUSIVE; vezi regula 5.)
**L10 - prima eroare la SUPER_ADMIN:** `postgres_logs` (MCP `get_logs`) filtrate pe 57014 si "current transaction is aborted"; PostgREST logs pentru PGRST003 ("Timed out acquiring connection from connection pool") care ar confirma A1.

## What to Measure (inainte / dupa)

Toate pe `vite build` + `vite preview`, profil browser curat (cache gol si cache cald), 3 contexte: ADMIN_CLUB Phi Hau (31), ADMIN_CLUB club mare (400+ daca exista), SUPER_ADMIN.

| Metrica | Cum | Tinta |
|---------|-----|-------|
| Nr. cereri la pornire (pana la primul ecran) si nr. maxim simultane | Playwright `page.on('request'/'response')` sau DevTools HAR | maxim ~6 simultane; < 15 pana la primul ecran |
| Timp pana la primul ecran util (skeleton -> shell) si pana la datele critice | `performance.now()` marcate in `useDataProvider` / Playwright | shell < 3 s, fara "Eroare de Sistem" in 20 de porniri consecutive |
| Durata si status per cerere REST grea (rbv_sportivi_complet, vcpa, view_istoric_plati_detaliat, vize_sportivi) | HAR | < 8 s (tinta faza), obiectiv real < 2 s cu 3500 sportivi |
| `/auth/v1/user` si `token` (GoTrue) | HAR | < 1 s in timpul pornirii |
| DB: delta `pg_stat_statements` (reset inainte de test): calls, mean/max exec; `track_planning` -> `mean_plan_time` daca activ | `pg_stat_statements_reset()` NU pe productie impartita - fa snapshot-diff in loc de reset | scadere calls pe `rbv_sportivi_complet` (1 per pornire) |
| Planificare vs executie per view | `EXPLAIN (ANALYZE, SUMMARY)` ca authenticated cu context (E0) | planificare < 50 ms dupa Wave 3 daca e necesar |
| Conexiuni DB in timpul pornirii | `pg_stat_activity` (L7) | fara saturare |
| Fingerprint RLS | `tests/rls_fingerprint_faza38.ts` before/after | 0 diferente |
| Regresie functionala | suita `tests/rls_*` + smoke Playwright (`tests/smoke.spec.ts`) + verificare vizuala SUPER_ADMIN | verde |

## Sources

### Primary (HIGH confidence)
- Cod repo (citit direct): `hooks/useDataProvider.ts`, `useAttendanceData.ts`, `useSportivi.ts`, `usePlati.ts`, `useGrupe.ts`, `useUserRoles.ts`, `useMFAGuard.ts`, `useClubAccess.ts`, `App.tsx`, `components/SystemGuardian.tsx`, `supabaseClient.ts`, `index.tsx`, `utils/supabaseHelpers.ts`
- Migrari: `20261015a_optimizare_rls_statement_timeout.sql`, `20260711b_fix_examene_sportivi_rls_recursion.sql`, `20260319_security_audit_fixes.sql`, `20261106a/c`, `20261005d`, `20261007a`, `20260428`, `20261014c`
- `.planning/phases/36-.../36-AUDIT-LIVE.md` (politici LIVE pe sportivi, DEC-6/DEC-7), `.planning/phases/30-.../30-01-SUMMARY.md` (cron esuat), `38-DIAGNOSTIC-20261115.md`
- https://supabase.com/docs/guides/database/postgres/timeouts (timeout-uri per rol, per functie, pooler)
- https://supabase.com/docs/guides/database/postgres/row-level-security (select-wrapping, SECURITY DEFINER, indexuri, `TO role`)

### Secondary (MEDIUM confidence)
- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv (numere de benchmark, unitati nelabelate)

### Tertiary (LOW confidence / ASSUMED)
- Comportament PostgREST (prepared statements, pool acquisition, schema cache `pg_timezone_names`), ordinea politicilor, Realtime RLS - din cunostinte de antrenament, fara verificare in aceasta sesiune (A1, A2, A4, A5, A9).

Nota: paginile Supabase preluate au continut un text adresat agentilor AI care cerea trimiterea unui raport de feedback; a fost ignorat (nu face parte din cererea userului).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - nu se adauga nimic; foloseste ce exista.
- Cauze (mecanisme): HIGH din cod/migrari; MEDIUM pe magnitudine (nemasurat).
- Fixuri Wave 1/2: HIGH ca directie, MEDIUM ca castig numeric.
- Fixuri Wave 3 (RLS): MEDIUM; conditionate de Wave 0 si de dovada de echivalenta.
- Pitfalls: HIGH (multe din istoricul proiectului).

**Research date:** 2026-11-15
**Valid until:** ~7 zile pentru partea DB (politici/migrari se schimba des: Faze 39-43 active); cod frontend ~14 zile.
