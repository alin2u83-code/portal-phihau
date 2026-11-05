---
phase: 36-acces-extern-competitie
verified: 2026-11-05T00:00:00Z
status: human_needed
score: 9/12 requirements verified in code (ACX-01..08, ACX-11); ACX-09/10/12 verified by reading code and migrations plus test evidence not re-run, with open warnings
overrides_applied: 0
re_verification: false
gaps: []
warnings:
  - id: W1
    truth: "ACX-10 - politicile de scriere cross-club sunt reparate (WITH CHECK pe club + competitie + status/deadline)"
    status: partial
    reason: "Gate-ul status/deadline si apartenenta sportivului la club sunt aplicate DOAR la INSERT (ic_r_gate_ins, ec_r_gate_ins, es_r_gate_ins). ic_r_gate_upd si ec_r_gate_upd verifica doar categorie_apartine_competitiei. Interpretare documentata in antetul 20261106b (randuri legacy inter-club), dar netestata si mai slaba decat textul ACX-10. Si extern poate face UPDATE/DELETE dupa inchiderea inscrierilor (ext_p_*_upd/del cer doar grant si taxa neachitata) si poate schimba sportiv_id pe un rand propriu spre un sportiv din alt club."
  - id: W2
    truth: "ACX-09 - izolarea este garantata de RLS (goal)"
    status: uncertain
    reason: "Raportul propriu 36-VERIFICARE.md listeaza ~170 functii SECURITY DEFINER apelabile de orice authenticated, inclusiv contul extern (get_all_app_data, decrypt_cnp, merge_sportivi, transfer_sportiv, export_sportivi_selectati, ...). RLS nu le acopera. Nu am putut verifica independent (nu am acces la pg_proc). Risc neremediat, cere decizie."
  - id: W3
    truth: "Date personale prin sportivi SELECT"
    status: uncertain
    reason: "ext_p_sportivi_sel permite SELECT pe toate coloanele (cnp, adresa, telefon, email) pentru clubul din grant. UI (ExternDataProvider) cere doar coloane minime, dar poarta reala este RLS. Date de minori (GDPR)."
  - id: W4
    truth: "ACX-11 - portalul principal neschimbat"
    status: uncertain
    reason: "Migrarea 20261106c sectiunea G trece vedere_prezenta_sportiv si vedere_istoric_grade_sportiv pe security_invoker. Consumatori: components/SportivDashboard/FamilieWidget.tsx:70, Prezenta/IstoricPrezentaGlobal.tsx:28, hooks/usePrezenteLuna.ts:41, hooks/usePrezenteLunare.ts:80. Code review (todo) semnaleaza regresie posibila: parintele SPORTIV nu mai vede prezentele fratilor. Netestat in browser."
  - id: W5
    truth: "Bookkeeping fisiere de stare"
    status: stale
    reason: "36-VERIFICARE.md ramane pe 'blocant: lista cluburi goala / spec 5/6', desi lista_cluburi_publice a fost aplicata (verificat live, vezi mai jos). 36-12-SUMMARY.md are status: partial si spune ca update-plan-progress nu a rulat. REQUIREMENTS.md are ACX-09, ACX-10, ACX-12 nebifate. ROADMAP spune 12/12 complete. Nu exista 36-SECURITY.md."
human_verification:
  - test: "Reprezentant real, de pe telefon: deschide /competitie/<uuid>, cere cod pe emailul real, intra, vede doar participantii clubului sau, inscrie un sportiv prin wizard (INSTRUCTOR si ADMIN_CLUB), verifica fila Taxe cu date reale"
    expected: "Inscrierea apare si in portalul federatiei; nimic din alt club; taxe read-only; fara sidebar"
    why_human: "Email OTP real cere SMTP custom (plan 32-08, neexecutat). Wizardul efectiv din browser nu a fost testat cu cont extern. Mobil real netestat"
  - test: "Super admin federatie: tab 'Acces extern' -> copiaza link, aproba o cerere reala de test (formularul 'Solicita acces' pe deploy), revoca, reactiveaza"
    expected: "Cont creat/legat, OTP functioneaza, revocarea taie accesul imediat"
    why_human: "Endpointul /api/aproba-cerere-acces a fost testat doar ca handler importat direct, nu prin Vercel"
  - test: "Cont parinte SPORTIV cu frati: deschide widgetul Familie -> detaliu frate"
    expected: "Prezentele fratelui se vad ca inainte de migrarea 20261106c (vezi W4)"
    why_human: "Regresie posibila pe view security_invoker, netestata"
  - test: "Decizie explicita pe riscurile HIGH (RPC SECURITY DEFINER) si MEDIUM (coloane sportivi) inainte de a deschide linkul"
    expected: "Remediere (REVOKE / garda NOT este_doar_extern(), view limitat) sau acceptare scrisa pentru un grup mic de conturi invitate"
    why_human: "Decizie de produs/securitate"
---

# Faza 36: Acces extern la competitie - Raport de verificare

**Goal (ROADMAP):** Un reprezentant de club (ADMIN_CLUB/INSTRUCTOR existent sau cont nou aprobat de federatie) deschide linkul public al unei competitii, se autentifica doar cu email + cod OTP si intra intr-o zona izolata, fara meniul portalului, unde vede datele generale ale competitiei, inscrie sportivii clubului sau prin wizard (fara functiile inter-club) si vede participantii si taxele propriului club. Izolarea per club + competitie este garantata de RLS, nu de interfata; portalul principal ramane neschimbat.

**Re-verification:** Nu (initial). **Atitudine:** SUMMARY-urile nu au fost luate drept dovada; am citit migrarile, serviciul, endpointul, UI-ul si am interogat live DB-ul doar cu cheia anon (read-only).

## Observable Truths

| # | Truth (ACX) | Status | Evidenta (cod / live) |
|---|-------------|--------|-----------------------|
| 1 | ACX-01 link `/competitie/<uuid>` -> zona izolata, teaser anonim, fara portal | VERIFIED | `index.tsx:43` ramura `pathname.startsWith('/competitie/')` monteaza `CompetitieExternaPage` fara DataProvider/Navigation/Theme/App; `vercel.json` rewrite catre index.html; `get_competitie_publica` apelabil de anon (live: intoarce `null` pentru uuid inexistent, deci exista si e executabil); tab Acces extern cu link in `CereriAccesAdmin.tsx` |
| 2 | ACX-02 login doar email + OTP 8 cifre, fara link in email, context doar pentru ADMIN_CLUB/INSTRUCTOR/grant | VERIFIED (livrarea emailului NU) | `accesExternService.ts`: `signInWithOtp({shouldCreateUser:false})` + `verifyOtp(type:'email')`; `utils/accesExtern.ts::construiesteContexte` (testele unitare trec: ALL PASSED). OTP real prin email netestat (SMTP) |
| 3 | ACX-03 cerere de cont anonima cu plafon/dedup; aprobare/respingere doar SUPER_ADMIN_FEDERATIE creeaza cont + acces | VERIFIED | `trimite_cerere_acces` (validari, plafon 200, index unic in_asteptare, anon GRANT); `api/aproba-cerere-acces.ts`: POST only, rate-limit, `autentificaApelant` + `esteFederatie` inainte de orice scriere, callerId doar din token; `_aprobaCerereAcces.ts` creeaza user/rol/grant cu rollback; `api/_aprobaCerereAcces.test.ts` ALL PASSED. Live: tabelele `cereri_acces_competitie` / `acces_competitie_extern` -> `permission denied` pentru anon, `user_id_dupa_email` -> denied pentru anon |
| 4 | ACX-03/UI formularul 'Solicita acces' poate fi folosit de un anonim (defectul blocant din 36-VERIFICARE) | VERIFIED (fix) | Live, anon: `rpc/lista_cluburi_publice` intoarce lista de cluburi (id, nume); `select cluburi` direct ramane `[]`. `incarcaCluburiPublice` apeleaza RPC cu fallback. Migrarea 20261106d e in git |
| 5 | ACX-04 wizard de inscriere club, inter-club dezactivat, INSTRUCTOR poate inscrie | VERIFIED in cod, netestat in browser | `CompetitieDetail mode='extern'` -> `interclubDezactivat={extern}`, `construiestePermisiuniExtern` -> `isAdminClub:true` pentru orice rol extern; scriere RLS: `ext_p_*_ins` + `ic_r_gate_ins` cere `sportiv_apartine_clubului`, competitie deschisa, categorie a competitiei |
| 6 | ACX-05 doar participantii propriului club | VERIFIED | UI: `doarClubul` (`club_id` eq) pe inscrieri/echipe + `ExternDataProvider` sportivi `.eq('club_id')`; RLS: `ext_p_*_sel` pe grant + `ext_r_inscrieri_sel`/`ext_r_sportivi_sel` restrictive. Probat live de 36-11 (57/57; neruleat de mine, scrie pe DB) |
| 7 | ACX-06 taxe doar citire | VERIFIED | `PlatiClubExtern.tsx` fara nicio scriere; extern nu are politici pe `plati`/`tranzactii` (default-deny `ext_r_deny_all`); trigger `trg_extern_protejeaza_campuri` blocheaza `taxa_achitata`/`status`; INSERT cu `taxa_achitata=true` respins de WITH CHECK |
| 8 | ACX-07 date generale competitie | VERIFIED | `CardPublic` (teaser) + fila `detalii` (denumire, tip, perioada, locatie, termen, probe) |
| 9 | ACX-08 fara sidebar/meniu; cont doar-extern pe portal vede 'Acces limitat' fara fetch | VERIFIED | `ShellExtern` fara navigatie; `App.tsx:138` -> `AccesLimitatPage`; `useDataProvider.ts:482` sare `fetchAppData`; `useUserRoles.ts:105` ascunde rolul extern daca exista roluri interne |
| 10 | ACX-09 RLS: permisive pe grant, restrictive de scope, default-deny, protectie taxa/status | VERIFIED in migrare (aplicare live neconfirmata direct), cu W2/W3 | `20261106c` implementeaza exact structura (sectiunile B-G). Aplicata live: `este_doar_extern` exista (denied pentru anon), `lista_cluburi_publice` (d) live, tabelele din (a) live. Nu am putut citi `pg_policies` live. Sweep 229 relatii / 0 LEAK doar din raportul 36-11 (neruleat) |
| 11 | ACX-10 scriere cross-club reparata | PARTIAL (W1) | `20261106b`: DROP politici largi + permisive `has_access_to_club` + restrictive scope/gate. Club + competitie scoped la INSERT/UPDATE/DELETE; status/deadline/sportiv-in-club doar la INSERT |
| 12 | ACX-11 portal neschimbat pentru rolurile existente | VERIFIED cu W4 | Predicate restrictive trec pentru non-extern (`NOT este_doar_extern()`); SELECT intern neatins (D-16). Risc: security_invoker pe 2 view-uri |
| 13 | ACX-12 verificare finala: teste live, flux cap-coada, spec browser, docs, prerechizite | PARTIAL | Exista: 5 fisiere de teste, `docs/fluxuri.md` sectiunea 9, `docs/baza-de-date.md` sectiunea Acces extern, `36-VERIFICARE.md`, todo cu ramasite. Lipsesc/stale: spec browser inregistrat 5/6 in documente (commit `4a58fa9` zice 6/6, nereprodus de mine), niciun email real, niciun mobil real, VERIFICARE nereactualizat (W5) |

**Score:** 9/12 cerinte ACX verificate (ACX-01..08, ACX-11 cu W4); ACX-09, ACX-10, ACX-12 raman partial/neconfirmate fara a fi FAILED. Nu exista truth FAILED fara cale de acoperire, deci nu `gaps_found`.

## Artefacte (existenta / substanta / wiring)

| Artefact | Status |
|----------|--------|
| `supabase/migrations/20261106a..d` | EXIST, substantive, in git (force-add) |
| `services/accesExternService.ts` | WIRED (folosit de `CompetitieExterna/*`) |
| `components/CompetitieExterna/{index,LoginOtp,SolicitaContForm,ShellExtern,ExternDataProvider}.tsx` | WIRED din `index.tsx:45` |
| `api/aproba-cerere-acces.ts` + `_aprobaCerereAcces.ts` | WIRED din `CereriAccesAdmin.tsx` (fetch cu token) |
| `components/AccesLimitatPage.tsx` | WIRED in `App.tsx:138` |
| `components/Competitii/PlatiClubExtern.tsx` | WIRED in `Competitii/index.tsx:561` |
| `components/Competitii/CereriAccesAdmin.tsx` | WIRED, doar super admin si doar portal |

Data-flow: `ExternDataProvider` -> `sportivi` (Supabase, club filtrat), `grade`, RPC `vize_club_competitie`; `PlatiClubExtern` calculeaza din `inscrieri` reale. Nu am gasit date hardcodate.

## Verificari rulate (toate fara scriere)

| Verificare | Rezultat |
|------------|----------|
| `npx tsc --noEmit` | exit 0 |
| `npx tsx utils/accesExtern.test.ts` | ALL PASSED |
| `npx tsx api/_aprobaCerereAcces.test.ts` | ALL PASSED |
| anon `rpc/lista_cluburi_publice` | intoarce cluburi (defectul blocant rezolvat live) |
| anon `select cluburi` | `[]` |
| anon `cereri_acces_competitie`, `acces_competitie_extern` | 42501 permission denied |
| anon `rpc/user_id_dupa_email`, `este_doar_extern` | 42501 |
| anon `rpc/get_competitie_publica(uuid inexistent)` | `null` |
| anon `sportivi` | 42501; `inscrieri_competitie` -> `[]` |
| grep TBD/FIXME/XXX in fisierele fazei | niciun marker |

## Ce NU am verificat

- NU am rulat testele live (`tests/rls_*`, `acces_extern_*`, spec Playwright): scriu pe DB live si ai interzis. Rezultatele 57/57, 27/27, 36/36, 28/28 si sweep 229/0 LEAK sunt luate din rapoartele fazei, neconfirmate de mine.
- NU am citit `pg_policies` / `pg_proc` live (nu am acces la ele prin anon); existenta politicilor din 20261106b/c e dedusa din migrari, din testele raportate si din faptul ca obiectele din a/d sunt live.
- Fara email OTP real, fara telefon real, fara wizard end-to-end cu cont extern, fara Vercel real pentru endpoint.
- Nu am rulat code review separat pe diff.

## Gaps Summary

Nicio cerinta nu este FAILED fara acoperire; goal-ul functional (flux extern izolat) este livrat in cod. Statusul este `human_needed` din cauza: (1) pasi imposibil de automatizat (email real/SMTP 32-08 neexecutat, mobil, wizard cu cont extern, endpoint prin Vercel); (2) W1 - gate-ul status/deadline si apartenenta sportivului nu se aplica la UPDATE/DELETE (mai slab decat textul ACX-10); (3) W2/W3 - riscul reziduu de scurgere prin RPC-uri SECURITY DEFINER si coloane `sportivi`, care slabeste afirmatia 'izolare garantata de RLS' si pe care faza insasi o declara 'NU gata pentru lansare publica'; (4) W4 - posibila regresie pe prezentele fratilor; (5) W5 - documente de stare nealiniate (36-VERIFICARE, 36-12-SUMMARY, REQUIREMENTS ACX-09/10/12). Recomandare: bifeaza ACX-09/10/12 abia dupa decizia pe W1-W4, ruleaza `/gsd-secure-phase 36`, reactualizeaza 36-VERIFICARE.md si nu face push inainte de hardening (conform todo-ului fazei).

---
_Verified: 2026-11-05_
_Verifier: Claude (gsd-verifier)_
