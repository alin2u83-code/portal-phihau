---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
verified: 2026-11-16T15:30:00Z
status: gaps_found
score: 6/10 must-haves verified
overrides_applied: 0
gaps:
  - truth: "D-02: datele de pornire se incarca abia dupa MFA; ecranul MFA nu concureaza cu cereri de date si nu produce 25P02/57014 la login proaspat"
    status: failed
    reason: "Poarta exista in cod pentru DataProvider (useDataProvider.ts:153-154), dar observatia live (38-07-MASURATORI.md, Remasurare) arata 16 tabele de date cerute pe ecranul MFA + 25P02 + 57014. Dialogul 'Eroare incarcare date' exista in cod DOAR in useAttendanceData.ts:131 (instanta din provider e singura montata pe ecranul MFA), deci fetch-ul de prezenta a rulat cu skipFetch=false => poarta a fost deschisa la un moment dat. Mecanism in cod care explica asta: poarta se deschide o data si nu se mai inchide; o re-verificare ulterioara care esueaza (eroare DB) trimite utilizatorul pe setup-mfa fara a inchide poarta."
    artifacts:
      - path: "hooks/useMFAGuard.ts"
        issue: "linia 47-55: orice `false` din esteMfaEmailValid/esteDispozitivDeIncredere => navigateTo('setup-mfa'), fara a distinge 'invalid' de 'verificare esuata'; nu exista setMfaContextId(null); efectul ruleaza la fiecare schimbare de activeRoleContext/activeView, fara anulare de rezultat vechi"
      - path: "services/emailMfaService.ts"
        issue: "linia 40: `if (error || !data) return false` — o eroare (57014/25P02 provocata chiar de furtuna de cereri) devine 'MFA invalid'"
      - path: "src/store/useAppStore.ts"
        issue: "linia 17: mfaContextId nu e resetat niciodata (singurul apel setMfaContextId e treceMfa(), useMFAGuard.ts:28-31)"
      - path: "contexts/NotificationContext.tsx"
        issue: "liniile 27-82: fetch `notificari` + canal realtime pornesc la montarea NotificationProvider, in afara portii MFA (apare in lista observata pre-MFA)"
    missing:
      - "Reproducere cronologica pe login proaspat (performance.getEntriesByType('resource') cu startTime vs momentul randarii SetupMFAPage) ca sa se confirme/infirme ipoteza de mai sus"
      - "Distinctie intre 'MFA invalid' si 'verificare esuata' in useMFAGuard (la eroare: nu navigheaza pe setup-mfa pe baza unui fals negativ; sau reset mfaContextId cand se navigheaza pe setup-mfa)"
      - "Poarta MFA si pe NotificationProvider (notificari + realtime) sau decizie explicita ca e acceptat"
  - truth: "D-03: istoricul complet de prezenta e cerut de TOATE ecranele care il citesc (fereastra azi-90..azi+30 nu falsifica rapoarte/statistici)"
    status: partial
    reason: "Doar 6 ecrane apeleaza useDateLaCerere(['antrenamenteIstoricComplet']) (38-06). Profilul sportivului (view 'profil-sportiv') citeste filteredData.antrenamente (components/UserProfile.tsx:71) si il da la AttendanceStats (grafic 'ultimele 6 luni', totaluri) si TrainingHistory/SportivFeedbackReport, fara a cere istoricul complet. Cu fereastra de 90 de zile, graficul pe 6 luni (AttendanceStats.tsx:35-58) si totalurile apar trunchiate, fara avertisment."
    artifacts:
      - path: "components/UserProfile.tsx"
        issue: "linia 71 + 838 + 922: foloseste antrenamente din fereastra, nu apeleaza useDateLaCerere(['antrenamenteIstoricComplet'])"
      - path: "components/UserProfile/AttendanceStats.tsx"
        issue: "liniile 35-58: luni -5..0, dar datele sunt doar azi-90..azi"
    missing:
      - "useDateLaCerere(['antrenamenteIstoricComplet']) in UserProfile (sau fereastra specifica pe sportiv_id) + indicator de incarcare; verificat si SportivDashboard/useAttendanceStats"
deferred: []
human_verification:
  - test: "3c: login proaspat (profil Chrome curat, dispozitiv necunoscut) ca ADMIN_CLUB si SUPER_ADMIN; cronometrat submit -> ecran MFA"
    expected: "Ecran MFA < 2 s, zero cereri de date (sportivi/grupe/prezenta/sesiuni_examene/...) inainte de introducerea codului, zero 25P02/57014 in postgres_logs in fereastra"
    why_human: "Necesita cod MFA primit pe email (38-07 3c); starea tab-ului de test e contaminata de tab-ul utilizatorului"
  - test: "3d: Network > Block request URL pe vedere_cluburi_program_antrenamente, reload dupa MFA"
    expected: "Shell-ul se deschide, o singura notificare 'date-partiale', sportivi/grupe functioneaza, fara Eroare de Sistem"
    why_human: "Fara DevTools request blocking in Chrome MCP (38-07); decizie utilizator 16.11.2026"
  - test: "Remasurare SUPER_ADMIN (>=10 reload-uri) dupa remedierea D-02"
    expected: "0 cereri >= 8 s (azi 1/10: sesiuni_examene 9444 ms); 0 x 57014 pe DB"
    why_human: "Cerere singulara nereprodusa; cauza (coada pe max_connections=60 / latenta) nedovedita"
  - test: "Profil sportiv (ADMIN_CLUB) -> tab Profil: grafic prezenta 6 luni si totaluri, comparat cu Raport lunar de prezenta"
    expected: "Valorile coincid (dupa remediere); azi sunt limitate la ultimele 90 de zile"
    why_human: "Verificare vizuala pe date reale"
  - test: "Test pe telefon (mobil netestat in 38-07) si roluri INSTRUCTOR/SPORTIV pe load la cerere"
    expected: "Fara liste goale permanente; flash 'nicio inregistrare' acceptabil doar cat cheile sunt in zbor"
    why_human: "38-04/05/06 SUMMARY: nimic rulat in browser pentru INSTRUCTOR/SPORTIV/federatie; ecranele nu folosesc seIncarca (AppRouter ignora valoarea)"
---

# Faza 38: Performanta incarcare — Raport de verificare

**Goal (ROADMAP.md:570):** Login si pornire fara "Eroare de Sistem" (statement timeout 8 s), inclusiv SUPER_ADMIN_FEDERATIE, cu 3500 sportivi; pagina MFA apare imediat. Se repara cauza (furtuna de cereri, date necritice care doboara aplicatia, view-uri cu multiplicatori), fara ridicarea statement_timeout. RLS se rescrie doar daca masuratorile o cer.
**Verificat:** 2026-11-16 | **Status:** gaps_found | **Re-verificare:** nu (initiala)
**Metoda:** cod citit direct (nu SUMMARY); rulat `npx tsx utils/{incarcareDate,supabaseHelpers,dateLaCerere}.test.ts` (toate "Toate testele au trecut") si `npx tsc --noEmit -p .` (0 erori). NU am putut rula browserul si nici interoga DB-ul live; cifrele live vin din 38-07-MASURATORI.md / 38-09-SUMMARY.md si sunt marcate ca atare.

## Truths

| # | Truth | Status | Dovada |
|---|-------|--------|--------|
| 1 | 0 "Eroare de Sistem" la 10 reload-uri SUPER_ADMIN si ADMIN_CLUB Phi Hau | VERIFIED (masurat, preluat din 38-07) | 38-07-MASURATORI.md:29-31; cauza eliminata in cod: `loading = loadingData \|\| rolesLoading \|\| accessLoading`, `combinedError = error \|\| rolesError` fara attendance (hooks/useDataProvider.ts:631-632); prezenta in `attendanceLoading/attendanceError` separate (:638-639) |
| 2 | D-01 incarcare la cerere: seturile grele nu pornesc la start; se cer cand se deschide ecranul, o singura data | VERIFIED | Set de pornire = 10 tabele mici, `ruleazaCuLimita(..., LIMITA_PORNIRE)` (useDataProvider.ts:396-420); grele doar in `construiesteCereriLaCerere` + coada seriala `proceseazaCereri` (:469-503); AppRouter apeleaza `useDateLaCerere(cheiPentruView(...))` o data (components/AppRouter.tsx:142); harta cu fallback "toate cheile" pentru view nemapat (utils/dateLaCerere.ts:50-58, test 17 PASS); `usePlati` pornit doar la `platiCerute` (useDataProvider.ts:179); masurat: dashboard 0/0/0 heavy, plati-hub 1/1/1, redeschidere 0 (38-07:34). Spot-check: Grupe/Prezenta marcate FARA_DATE nu citesc chei grele (grep: doar false positive `rezultateCautare`) |
| 3 | D-02 gate MFA: zero cereri de date inainte de MFA; ecranul MFA apare imediat, fara 25P02/57014 | **FAILED (BLOCKER)** | Cod: `poatePorniDate = activeRoleContext && mfaContextId === activeRoleContext.id && rol != REPREZENTANT` (useDataProvider.ts:153-154) gateaza useAttendanceData (:160-165), useSportivi (:173-178), usePlati (:179), useGrupe (:180), fetchAppData (:548), realtime (:301), la-cerere (:473). Insa: (a) live 38-07 Remasurare: 16 tabele pe ecranul MFA + 3x57014 + 26x25P02; (b) dialogul "Eroare incarcare date" vine doar din useAttendanceData.ts:131 => fetch cu skipFetch=false => poarta deschisa; (c) mecanism: useMFAGuard.ts:47-55 trimite pe setup-mfa la orice `false`, iar esteMfaEmailValid intoarce false si la eroare DB (emailMfaService.ts:40); mfaContextId nu se mai reseteaza (useAppStore.ts:17; singurul apel e :28-31) => poarta ramane deschisa dupa un fals negativ; (d) NotificationProvider (contexts/NotificationContext.tsx:27-82) cere `notificari` + realtime fara poarta. Ipoteza (c) e coerenta cu observatiile dar NEDOVEDITA (vezi gap) |
| 4 | D-03 fereastra implicita azi-90..azi+30 la pornire; `.in(ids)` pe bucati | VERIFIED (mecanism) | `fereastraPrezenta` (utils/incarcareDate.ts:~45, 24 teste PASS); aplicata implicit, scoasa doar la `prezentaCompleta` (useDataProvider.ts:164); `imparteInBucati(...,100)` + `ruleazaCuLimita(...,3)` + `incarcaToatePaginile` (useAttendanceData.ts:~88-103); masurat: pornire gte+lte 181 car., raport-prezenta 3 bucati 4100/4100/2735 car., 0 >=8 s (38-07:35). Vezi truth 5 pentru acoperirea ecranelor |
| 5 | D-03 acoperire: ecranele care citesc istoricul de prezenta il cer explicit | **PARTIAL (WARNING)** | 6 ecrane cer `antrenamenteIstoricComplet` (Activitati.tsx:34, CalendarView.tsx:149, ProgramAntrenamenteManagement.tsx:21, RaportIntervalExamen.tsx:163, RaportLunarPrezenta.tsx:94, RaportPrezenta.tsx:42). `profil-sportiv` nu: UserProfile.tsx:71 -> AttendanceStats (grafic 6 luni, :35-58) si TrainingHistory pe date de 90 zile, silentios trunchiate |
| 6 | Furtuna de cereri limitata; fara retry pe 57014; processSettledQueries nu mai suprascrie cu `[]` | VERIFIED | `retry: trebuieReincercat` (index.tsx:24), `esteTimeoutStatement` 57014/PGRST003 (utils/incarcareDate.ts:~32-42); `Promise.allSettled`/`fetchAllPages` scoase din provider (grep 0); `useDataProvider()` instantiat doar in DataContext (grep 0 in components/hooks); cheie esuata lipseste din merge (`\|\| prev.x`, useDataProvider.ts:446-458); teste unitare PASS. Varf real la pornire poate depasi 4 (hook-uri React Query nelimitate), maxSimultan 11-16 masurat (38-07:21) |
| 7 | D-04: fara ridicare statement_timeout / ALTER ROLE; RLS neatinsa fara dovada | VERIFIED (cod) / live preluat | `git diff 2be3f633..HEAD` pe cod+migrari: singurele `statement_timeout` sunt comentarii (20261116d:17) si `SET LOCAL ... 25s` din tests/amprenta_rls_faza38.sql (doar masurare, rollback garantat). O singura migrare: cron.unschedule (supabase/migrations/20261116d_faza38_cron_unschedule.sql:21-27, idempotenta, rollback documentat). rolconfig/politici/indexuri identice live = 38-09-SUMMARY (nereverificat de mine; fara acces Supabase) |
| 8 | Wave 3 RLS (38-10/38-11) | VERIFIED (conditionat, decizie) | 38-10 no-go (utilizator), nicio migrare 20261117a (ls supabase/migrations: doar 20261116d); 38-11 sarit. Justificat: planning izolat <=128 ms, E3 nemasurat; Wave 3 e conditionata in ROADMAP:573. Nu e un gap |
| 9 | 0 cereri >= 8 s la SUPER_ADMIN | UNCERTAIN (WARNING) | 1/10 reload: sesiuni_examene 9444 ms (38-07:30); 0 x 57014 pe DB in 24h dupa incident (38-07:38 — dar vezi corectia de la 11:50 UTC in Remasurare); cauza nedovedita |
| 10 | Timeout simulat: shell se deschide, 1 notificare, sportivi/grupe merg | UNCERTAIN -> human_needed | Cod: cheie esuata => `avertizeazaDatePartiale` (useDataProvider.ts:444, :501), `setError` nu se mai apeleaza pentru prezenta; neverificat in browser (38-07 3d, de facut de utilizator) |

**Scor:** 6/10 VERIFIED (1, 2, 4, 6, 7, 8); 1 FAILED (3), 1 PARTIAL (5), 2 UNCERTAIN (9, 10).

## Artefacte (nivel 1-3)

| Artefact | Stare | Detalii |
|----------|-------|---------|
| utils/incarcareDate.ts (+test) | VERIFIED | importat de useDataProvider, useAttendanceData, index.tsx; 24 PASS |
| utils/dateLaCerere.ts (+test) | VERIFIED | importat de AppRouter; 17 PASS |
| hooks/useDateLaCerere.ts | VERIFIED | consumat de AppRouter + 6 ecrane |
| hooks/useMFAGuard.ts + useAppStore.mfaContextId | WIRED dar DEFECT | vezi truth 3 |
| hooks/useDataProvider.ts | VERIFIED (D-01/D-03/loading) | 677 linii; o singura instanta |
| supabase/migrations/20261116d_faza38_cron_unschedule.sql | VERIFIED | aplicata live (38-09, nereverificat de mine) |
| tests/amprenta_rls_faza38.sql | EXISTA, NERULAT | nefolosit (nicio politica modificata) |
| 38-07-SUMMARY.md | LIPSESTE | exista doar 38-07-MASURATORI.md (status PARTIAL); planul 38-07 nu e inchis formal |

## Anti-pattern / debt markers

grep TBD/FIXME/XXX in fisierele atinse de faza: niciun marker nou gasit in fisierele de cod citite (nu am rulat scanare exhaustiva pe toate cele 27 de fisiere). Observatii: `AppRouter` ignora `seIncarca` (38-05-SUMMARY) -> liste goale temporare pe ecranele cu chei la cerere.

## Cerinte

D-01 SATISFIED; D-02 NOT SATISFIED (truth 3); D-03 PARTIAL (truth 5); D-04 SATISFIED. ROADMAP.md:576-587 inca arata toate planurile `[ ]` (de actualizat de orchestrator; nu am modificat).

## Gaps Summary

1. **D-02 (BLOCKER).** Codul gateaza corect cererile din DataProvider, dar (a) poarta nu se inchide niciodata odata deschisa, (b) un fals negativ al verificarii MFA (eroare DB tratata ca "invalid") duce utilizatorul pe ecranul MFA cu poarta deschisa si furtuna in zbor, (c) NotificationProvider e in afara portii. Dovada indirecta puternica: dialogul 25P02 exista in cod doar in useAttendanceData. Cauza exacta a observatiei live NU e dovedita (tab-ul utilizatorului era posibil activ in aceeasi fereastra, 38-07:52): de reprodus cronologic inainte de a plati fix-ul. Fix-uri mici propuse (nu aplicate): la eroare in verificare nu se navigheaza pe setup-mfa (sau se reseteaza mfaContextId la navigare pe setup-mfa); NotificationProvider gatat pe aceeasi poarta.
2. **D-03 acoperire (WARNING).** Profilul sportivului arata statistici de prezenta pe 90 de zile ca si cum ar fi complete.
3. **Nemasurat / in asteptare utilizator:** 3c, 3d, remasurare SUPER_ADMIN, mobil, INSTRUCTOR/SPORTIV.

Nu am verificat: rularea in browser, starea live a DB (rolconfig, cron, politici), `npm run build`, scanare exhaustiva de debt markers.

_Verifier: Claude (gsd-verifier)_
