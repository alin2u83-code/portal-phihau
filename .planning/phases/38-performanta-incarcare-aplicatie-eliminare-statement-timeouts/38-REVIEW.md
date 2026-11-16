---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
reviewed: 2026-11-16T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - hooks/useMFAGuard.ts
  - hooks/useDataProvider.ts
  - hooks/useDateLaCerere.ts
  - hooks/useAttendanceData.ts
  - hooks/useSportivi.ts
  - hooks/usePlati.ts
  - hooks/useClubAccess.ts
  - src/store/useAppStore.ts
  - utils/incarcareDate.ts
  - utils/dateLaCerere.ts
  - utils/supabaseHelpers.ts
  - components/AppRouter.tsx
  - components/Activitati.tsx
  - components/Grupe/ProgramAntrenamenteManagement.tsx
  - components/Prezenta/RaportPrezenta.tsx
  - components/Prezenta/RaportLunarPrezenta.tsx
  - components/Prezenta/RaportIntervalExamen.tsx
  - components/SportivDashboard/index.tsx
  - index.tsx
  - supabase/migrations/20261116d (cron.unschedule, doar citita)
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Faza 38: Code Review Report

**Reviewed:** 2026-11-16
**Depth:** standard (+ trasare cross-fisier pe gate MFA / incarcare la cerere)
**Status:** issues_found

## Summary

Contractele pure (`incarcareDate.ts`, `dateLaCerere.ts`, `supabaseHelpers.ts`) sunt corecte si testele lor trec (rulate: `npx tsx utils/incarcareDate.test.ts`, `dateLaCerere.test.ts`, `supabaseHelpers.test.ts`, toate verzi). Problemele sunt in lipiciul dintre ele: poarta MFA pentru date (D-02) nu e o poarta, ci un comutator care se deschide o data si nu se mai inchide; `currentUser` setat devreme deschide alte cai de date pre-MFA; fereastra de prezenta (D-03) are o cursa care poate lasa ecranele de raport blocate si ecranele de profil afiseaza statistici trunchiate in tacere.

### Cauza datelor pe ecranul MFA (intrebarea ta)

Nu pot reproduce live; ce urmeaza e din citirea codului. Nota: commit-urile 38-04 sunt locale (`main` ahead 67 fata de `origin/main`; `git branch -r --contains 822719d1` e gol), deci masuratoarea 38-07 a rulat pe dev local sau pe un build local; verifica ca nu era un build vechi, dar nu conta pe asta.

Setul de cereri observat (cluburi, grade, tipuri_plati, ..., sportivi, rbv_sportivi_complet, grupe, vedere_cluburi_program_antrenamente, prezenta_antrenament, anunturi_prezenta) este exact `fetchAppData` + `useSportivi` + `useGrupe` + `useAttendanceData`, toate conditionate de `poatePorniDate` (`hooks/useDataProvider.ts:154`). Deci `mfaContextId === activeRoleContext.id` era adevarat in timp ce ecranul MFA era afisat. Singurul loc care il seteaza e `treceMfa()` din `useMFAGuard`, iar acolo sunt trei cai de a-l seta fara MFA reala + niciuna de a-l retrage (CR-01). In plus, `notificari` pleaca pre-MFA din alt motiv (CR-02). `25P02`/`57014` sunt consecinta, nu cauza: cererea de MFA insasi (`mfa_email_verificari`) concureaza cu furtuna de date si, daca primeste eroare, `esteMfaEmailValid` intoarce `false` (`services/emailMfaService.ts:41`) = "trimite la MFA", ceea ce poate produce exact combinatia "ecran MFA + date deschise" cand o alta rulare a guard-ului a trecut (vezi CR-01 p.3).

## Critical Issues

### CR-01: Poarta MFA pentru date e monotona si fara anulare; trei cai o deschid fara MFA validata

**File:** `hooks/useMFAGuard.ts:20-24, 28-31, 40-56` ; `src/store/useAppStore.ts:15-17` ; `hooks/useDataProvider.ts:153-154`
**Issue:**
1. `setMfaContextId` doar seteaza, niciodata nu reseteaza (nu exista `setMfaContextId(null)` nicaieri; verificat cu grep). Ramura `!valid` (linia 49-52) face `navigateTo('setup-mfa')` dar nu retrage `mfaContextId`. Orice rulare a efectului care a trecut o data deschide datele pentru tot restul paginii, chiar daca alta rulare decide ca MFA e necesara.
2. Efectul (`[activeRoleContext, activeView]`) nu are cleanup/anulare. `activeRoleContext` isi schimba identitatea la fiecare `refreshRoles` (SIGNED_IN, `initializeAndFetchData`), iar `activeView` se schimba la `navigateTo`, deci pe un login proaspat ruleaza 2-3 verificari concurente. Daca una primeste raspuns "valid" (ex. fereastra de 12h `mfa_email_verificari` e per user, nu per dispozitiv, si poate veni din alt tab/dispozitiv) iar alta primeste eroare (=> `false` => redirect), rezultatul e ecran MFA + date deschise, permanent. Asta se potriveste cu "ecran MFA + 40 cereri de date + 25P02".
3. Fail-open pe `getSession` (linia 41-46): `treceMfa()` seteaza acum si `mfaContextId`, adica DEschide cererile de date (sportivi, financiar, medical) pentru un rol privilegiat fara nicio verificare MFA. Inainte de Faza 38 fail-open ducea doar la randarea shell-ului; D-02 spune "zero cereri de date pre-MFA", iar aici o eroare de lock auth (documentata chiar in `SetupMFAPage.tsx`: lock furat/AbortError sub incarcare) o incalca.
4. Ramura `activeView === 'setup-mfa'` (linia 20-24) seteaza `setMfaChecked(true)` permanent (state-ul nu se mai reseteaza) fara nicio verificare. Cu `phi-hau-active-view = setup-mfa` ramas in localStorage (NavigationContext il persista), dupa reload `blockedByMfa` (App.tsx:135) e fals pentru ORICE view ulterior: Sidebar-ul e vizibil pe ecranul MFA, iar un click pe "Sportivi"/"Grupe" monteaza ecrane ale caror hook-uri proprii NU sunt conditionate de poarta: `components/Sportivi/index.tsx:319-327` (`useSportivi(..., activeRoleContext?.id, ...)`), `components/Grupe/index.tsx:46` (`useGrupe(activeRoleContext?.id, ...)`), `DashboardPrezentaAzi.tsx:12` (`useAttendanceData(..., false, ...)`), `GrupaDetailView.tsx:758`. Cererile pleaca inainte ca guard-ul sa apuce sa redirectioneze inapoi.
5. Lantul `esteMfaEmailValid(...).then(...)` nu are `.catch` (linia 47-56): o exceptie (ex. RPC `verifica_dispozitiv_incredere` care arunca) lasa `mfaChecked=false` si fara redirect => schelet infinit (`blockedByMfa`) + rejectie nehandlata.

**Fix:**
```ts
// useMFAGuard: anulare + revocare + fail-closed pentru date
useEffect(() => {
  if (!activeRoleContext) return;
  let anulat = false;
  const treceMfa = () => { if (anulat) return; setMfaChecked(true); setMfaContextId(activeRoleContext.id); };
  const cereMfa = () => { if (anulat) return; setMfaContextId(null); setMfaChecked(false); navigateTo('setup-mfa'); };
  if (activeView === 'setup-mfa') { setMfaContextId(null); setMfaChecked(true); return; } // pagina MFA se randeaza, datele raman blocate
  ...
  supabase.auth.getSession().then(async ({ data, error }) => {
    const userId = data?.session?.user?.id;
    if (error || !userId) { /* UI poate ramane deschis, datele NU: nu apela setMfaContextId */ if (!anulat) setMfaChecked(true); return; }
    const valid = (await esteMfaEmailValid(userId)) || (await esteDispozitivDeIncredere(userId));
    valid ? treceMfa() : cereMfa();
  }).catch(() => cereMfa());
  return () => { anulat = true; };
}, [activeRoleContext, activeView]);
```
Plus: componentele care isi cheama singure `useSportivi`/`useGrupe`/`useAttendanceData` ar trebui sa citeasca `mfaContextId` din store (sau sa foloseasca `poatePorniDate` expus de `useData()`), nu `activeRoleContext?.id`. Adauga un log temporar in `treceMfa` ca sa confirmi care din cele 3 cai a deschis poarta in sesiunea care a picat.

### CR-02: `currentUser` setat inainte de MFA porneste cereri de date personale + realtime pe ecranul MFA

**File:** `hooks/useDataProvider.ts:276-297` ; `contexts/NotificationContext.tsx:28-43` ; `App.tsx` (NotificationProvider inainte de gate)
**Issue:** 38-04 a mutat `setCurrentUser(...)` dintr-un efect care rula dupa incarcarea datelor intr-un efect care depinde doar de `activeRoleContext`/`userRoles` (rulaza imediat). `NotificationProvider currentUser={currentUser}` e montat in `App.tsx` deasupra `blockedByMfa`, deci imediat ce `currentUser` exista pleaca `select * from notificari ...` si se deschide canalul realtime `user-notifications-*` pe ecranul MFA (`notificari` apare in lista masurata). Notificarile contin date personale/financiare (restante, examene). Nu trece prin `poatePorniDate`. Orice alt consumator care porneste pe `currentUser` (nu pe `loading`) are aceeasi problema.
**Fix:** conditioneaza `NotificationProvider` (sau efectul `fetchNotifications`/subscribe) pe `useAppStore(s => s.mfaContextId) === activeRoleContext?.id`, de ex. pasand `currentUser={poatePorniDate ? currentUser : null}` din `App.tsx`; `fetchNotifications` iese deja pe `!currentUser?.user_id`.

### CR-03: Cursa in `useAttendanceData` — raspunsul ferestrei (azi-90..+30) poate suprascrie istoricul complet si lasa `seIncarca` blocat

**File:** `hooks/useAttendanceData.ts:36-135` (in special 118-119, 135) ; `hooks/useDataProvider.ts:164, 536`
**Issue:** `fetchAttendanceData` nu are anulare/numar de generatie. La pornire pleaca cererea cu fereastra; cand un ecran cere `antrenamenteIstoricComplet`, `prezentaCompleta` devine true, `filters` devine `undefined` si se lanseaza o a doua cerere. Daca cea cu fereastra (lansata prima, sub incarcare, cu `getSession` + 3 query-uri + chunk-uri) termina DUPA cea completa, `setAntrenamente(allTrainings)` pune la loc setul trunchiat si `setFiltreIncarcate(JSON.stringify(window))` face `prezentaCompletaIncarcata` (`useDataProvider.ts:536`, compara cu `'null'`) fals pentru totdeauna. Consecinte: `Activitati.tsx` (butoane Previzualizeaza/Confirma/Salveaza dezactivate permanent, `seIncarca` adevarat), `ProgramAntrenamenteManagement` (spinner infinit), rapoartele de prezenta care se bazeaza pe istoric complet arata date trunchiate sau "se incarca" fara iesire. Deschiderea unui raport la cateva secunde dupa login (exact scenariul cu server incarcat) reproduce. Verificarea de conflicte din `Activitati` ar putea, in varianta in care se deblocheaza, sa genereze antrenamente duplicate pe un set trunchiat.
**Fix:** `const generatie = useRef(0)`; la inceputul `fetchAttendanceData` `const eu = ++generatie.current;` si inainte de fiecare `setX` final `if (eu !== generatie.current) return;` (inclusiv in `finally` pentru `setLoading`). 

## Warnings

### WR-01: Statisticile de prezenta din profilul sportivului sunt acum trunchiate la 120 de zile fara nicio indicatie

**File:** `components/UserProfile.tsx:71, 259-276` ; `components/UserProfile/AttendanceStats.tsx:11-74` ; `components/UserProfile/TrainingHistory.tsx` ; `utils/dateLaCerere.ts:99`
**Issue:** `profil-sportiv` nu e in `HARTA`, deci primeste TOATE cheile mai putin `antrenamenteIstoricComplet` ("nu e niciodata aici", comentariul din linia 4). Dar `UserProfile` citeste `filteredData.antrenamente` si il paseaza `AttendanceStats` (total sesiuni, prezente, procent, grafic pe 6 luni) si `TrainingHistory` (lista). Cu fereastra D-03, "Total sesiuni / Procent prezenta" si istoricul antrenamentelor reprezinta doar azi-90..azi, iar graficul pe 6 luni arata 0% pentru lunile 4-6. E o schimbare silentioasa a unei cifre afisate (date reale, admin/instructor o citesc ca prezenta pe tot parcursul). Testul `dateLaCerere.test.ts` nu prinde asta fiindca confirma harta, nu consumatorii de antrenamente.
**Fix:** `useDateLaCerere(['antrenamenteIstoricComplet'])` in `UserProfile.tsx` (cu `seIncarca` -> skeleton in `AttendanceStats`/`TrainingHistory`), sau treci stats-urile pe `fetchIstoricVedere(sportiv.id)` (deja per sportiv). Re-trasaza TOTI consumatorii lui `filteredData.antrenamente`/`allTrainings` (verificat grep: UserProfile, SportivDashboard, AnuntPrezentaWidget, AntrenamentForm, DashboardPrezentaAzi, ListaPrezentaAntrenament; doar primul e afectat de fereastra).

### WR-02: Ecrane financiare/examene arata zero/"nicio inregistrare" cat timp seturile la cerere nu au sosit

**File:** `hooks/useDateLaCerere.ts:12-15` ; `components/AppRouter.tsx:142` ; consumatori (`PlatiScadente.tsx:89-96`, `FacturaDetaliu.tsx:46,76`, `AdminMasterMap`, `Sportivi/index.tsx`)
**Issue:** `AppRouter` apeleaza `useDateLaCerere(...)` dar ignora `seIncarca`; din toate ecranele doar 6 folosesc valoarea. Restul citesc `filteredData.plati`/`tranzactii`/`reduceri`/`istoricGrade`... care raman `[]` pana sosesc datele: coloana de restante din Sportivi, hub-ul Plati, dashboard-urile arata 0 RON / liste goale, fara indicator. Cat timp e goala, o actiune (incasare, factura automata la inscriere, verificare duplicat) se face pe date inexistente. Nu am trasat fiecare verificare de duplicat (netestat), dar riscul de factura/incasare dubla pe `plati` gol e real.
**Fix:** blocheaza (skeleton) randarea ecranului in `AppRouter` cat `seIncarca` e adevarat pentru view-ul curent (ai deja `cheiIncarcate`), sau macar dezactiveaza actiunile; la esec pastreaza un buton "Reincearca" (vezi WR-03).

### WR-03: Cheie esuata nu se reia pe acelasi ecran si `seIncarca` ramane adevarat

**File:** `hooks/useDataProvider.ts:488-501` ; `hooks/useDateLaCerere.ts:12-15`
**Issue:** la eroare cheia e scoasa din `cheiCerute` (retry "la urmatoarea vizita"), dar efectul din `useDateLaCerere` depinde doar de sirul cheilor, deci pe acelasi ecran nu se mai reia nimic; `cheiIncarcate` nu contine cheia, deci ecranele cu `seIncarca` raman in loading permanent, iar toast-ul spune "Redeschide pagina". La `plati` (react-query) esecul lasa `platiData === undefined` la fel. Pentru `istoricGrade`, `incarcaToatePaginile` intoarce date partiale + eroare: partialul e aruncat (cheia nu intra in `data`), deci nici macar pagina 1 nu se pastreaza (comportament ales, dar contrazice comentariul "datele anterioare raman" cand nu exista anterioare).
**Fix:** expune `reincearca(chei)` in context (sterge din `cheiCerute`, apeleaza `proceseazaCereri`) si leaga-l de butonul din toast; marcheaza starea "esuat" separat de "se incarca".

### WR-04: `mfaChecked` nu se reseteaza niciodata si `useMFAGuard` e permisiv la schimbare de context

**File:** `hooks/useMFAGuard.ts:15, 20-24`
**Issue:** dupa ce `mfaChecked` devine true (inclusiv prin ramura `setup-mfa`), ramane true pentru orice context/rol ulterior in aceeasi incarcare; la schimbare de rol in aceeasi pagina (azi `switchRole` face reload, deci latent) shell-ul s-ar randa inaintea verificarii. Date raman protejate de `mfaContextId`, dar randarea de continut protejat (D-02 17-CONTEXT) nu mai e.
**Fix:** `setMfaChecked(false)` la inceputul efectului cand `activeRoleContext.id` difera de cel verificat.

### WR-05: `processSettledQueries` — `!resultValue` clasificat ca RLS

**File:** `utils/supabaseHelpers.ts:25-29`
**Issue:** o valoare `undefined` (promisiune fulfilled fara raspuns) e tratata ca eroare RLS si produce `data[key] = []`, exact comportamentul pe care 38-02 voia sa-l elimine (golire de date incarcate). `fetchAppData` aplica apoi `finalData.locatii || prev.locatii` etc.: `[]` e truthy si suprascrie.
**Fix:** `!resultValue` -> `erori.push(key)` (nu RLS, nu `[]`).

## Info

### IN-01: `useAttendanceData` fara fereastra ramane in componente (`ListaPrezentaAntrenament.tsx:765`)
Fiecare deschidere a listei de prezenta pe o grupa descarca tot istoricul clubului (+ `anunturi_prezenta` complet la fiecare instanta, `useAttendanceData.ts:66`). In afara scopului v1 ca performanta, dar reintroduce parte din furtuna de cereri pe care faza o combate; D-03 e aplicat doar instantei din provider.

### IN-02: Cheia veche `cache_allowed_clubs` ramane in localStorage
`hooks/useClubAccess.ts:20`: cheia per-user e corecta, dar intrarea veche cu lista altui utilizator nu e stearsa (`clearCache('cache_allowed_clubs')` o data la pornire).

## Ce am verificat

- Citit integral: `useMFAGuard`, `useDataProvider`, `useDateLaCerere`, `useAttendanceData`, `useAppStore`, `incarcareDate.ts`, `dateLaCerere.ts`, diff `supabaseHelpers`, `useSportivi`, `usePlati`, `useClubAccess`, `index.tsx` (retry), `useGrupe`, `useUserRoles`, `NavigationContext`, `useLocalStorage`, `NotificationContext`, `emailMfaService` (MFA), `SetupMFAPage`, `App.tsx` (gate), `useRoleManager`/`handleLogout` (reload => store resetat la logout si schimbare rol).
- Trasat: cine seteaza/consuma `mfaContextId`; toti apelantii `useSportivi/useGrupe/usePlati/useAttendanceData`; consumatorii `filteredData.antrenamente`; unde se foloseste `seIncarca`.
- Rulat: cele 3 teste unitare (`incarcareDate`, `dateLaCerere`, `supabaseHelpers`) — verzi.
- Migrarea `20261116d`: doar `cron.unschedule` idempotent, protejat cu `IF EXISTS`; OK. Nu am verificat ca fisierul e adaugat in git cu `git add -f` (supabase/ e in .gitignore) si nici starea live a jobului.
- Corect dupa analiza: limitatorul `ruleazaCuLimita`, `incarcaToatePaginile` (oprire pe pagina incompleta), `trebuieReincercat` (v5, index de la 0), `imparteInBucati`, coada seriala `proceseazaCereri` (chei in zbor nu se dubleaza), cheia stabila `cheie` in `useDateLaCerere` (join), cheia per-utilizator pentru cluburi permise.

## Ce NU am verificat

- Nimic rulat in browser/Playwright; nu am reprodus ecranul MFA, 25P02 sau 57014. Cauza din CR-01/CR-02 e din cod, nu confirmata dinamic (nu stiu care din cele 3 cai a deschis poarta in sesiunea masurata).
- Nu am trasat fiecare ecran din `HARTA` contra a ceea ce citeste efectiv din `filteredData` (am verificat prezenta/profil/dashboard/hub plati prin esantion; `sportivi`, `competitii`, `calendar` doar prin harta + 38-05-SUMMARY).
- Nu am verificat RLS/`tests/amprenta_rls_faza38.sql` (in afara perimetrului front-end).
- Nu am rulat `tsc --noEmit`.

---

_Reviewed: 2026-11-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
