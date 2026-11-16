# 38-07 MASURATORI — Faza 38 (16.11.2026)

Status: **PARTIAL** — 3c (MFA dispozitiv necunoscut) si 3d (simulare timeout) = DE FACUT DE UTILIZATOR (decizie 16.11.2026). Gates automate = PASS. Task 2 (browser, build+preview :4173): SUPER_ADMIN + ADMIN_CLUB Phi Hau masurate; restul asteapta repornirea preview-ului (OK utilizator). Fara emailuri/CNP/tokenuri in acest fisier (T-38-21).

## Gates automate (Task 1)
| Gate | Rezultat |
|---|---|
| `npx tsx utils/incarcareDate.test.ts` | PASS (exit 0) |
| `npx tsx utils/supabaseHelpers.test.ts` | PASS (exit 0) |
| `npx tsx utils/dateLaCerere.test.ts` | PASS (exit 0) |
| `npx tsc --noEmit -p .` | PASS — 0 erori (deci 0 in fisiere atinse de 38-02..38-06) |
| `npm run build` | PASS (16.6 s, 4476 module; rulat anterior) |
| `useDataProvider()` in components/hooks (in afara definitiei) | PASS — 0 aparitii |
| `Promise.allSettled` in hooks/useDataProvider.ts | PASS — 0 |
| loading/combinedError fara attendanceData | PASS — `loading = loadingData \|\| rolesLoading \|\| accessLoading`; `combinedError = error \|\| rolesError` (hooks/useDataProvider.ts:631-632) |
| "statement_timeout" in migrari 20261116* | PASS — singura aparitie e comentariu ("Nu atinge ... statement_timeout (D-04)") in 20261116d:17 |

## Browser "dupa" (Task 2) — criterii absolute, fara baseline (decizie 16.11.2026)
| Context | reload-uri | "Eroare de Sistem" | cereri >=8s | total cereri | maxSimultan | urlMax | heavy (istoric_plati/vize/tranzactii) |
|---|---|---|---|---|---|---|---|
| SUPER_ADMIN | 10 | 0 | **1** (sesiuni_examene 9444 ms, reload 10) | 34-40 | 14-16 | 4100 | 0/0/0 |
| ADMIN_CLUB Phi Hau | 10 | 0 | 0 | 23-37 | 11-16 | 3242 | 0/0/0 |

Cele mai lente ADMIN_CLUB: vedere_detalii_examene.

## Truths — pass/fail
| Truth | Verdict | Dovada |
|---|---|---|
| 0/10 "Eroare de Sistem" SUPER_ADMIN | PASS | 0/10 |
| 0 cereri >=8s SUPER_ADMIN | **FAIL (gap)** | 1 cerere sesiuni_examene 9444 ms la reload 10; singulara, nereprodusa in 9 reload-uri. De verificat 57014 pe DB in fereastra. |
| 0/10 + 0 cereri >=8s ADMIN_CLUB Phi Hau | PASS | |
| Endpointuri grele nu se cer la pornire | PASS (dashboard) | 0/0/0 |
| Fereastra D-03 la pornire (`vedere_cluburi_program_antrenamente` cu gte/lte, URL<8000) | **PARTIAL (cod OK, de confirmat in browser)** | Observat: URL 133 car. cu fereastra la unele porniri; la alte porniri fara filtru (URL 4100/2930, <8000). Cod: hooks/useDataProvider.ts:164 aplica fereastra implicit; o scoate doar cand `prezentaCompleta=true` (un ecran a cerut istoricul). Ipoteza: cererile fara filtru = reincarcare dupa vizitarea unui ecran de raport in aceeasi sesiune, nu pornire curata. De confirmat la remasurare (reload pe dashboard, sesiune noua). |
| plati-hub: heavy o singura data, fara repetare la redeschidere (D-01) | **PASS** | 16.11 ~12:00 UTC, ADMIN_CLUB Phi Hau. Dashboard: 0 din view_istoric_plati_detaliat/vize_sportivi/tranzactii. La deschidere plati-hub: 1/1/1 (10 cereri, urlMax 182, 0 >=8s). Inapoi + redeschidere: 0 cereri grele (doar mfa_email_verificari x2, program_antrenamente x1). |
| raport-prezenta: istoric complet in bucati, URL<8000 (D-03) | **PASS** | Rapoarte Prezente -> Analiza Prezente: vedere_cluburi_program_antrenamente fara filtru de data (141 car.) + 3 x prezenta_antrenament (4100/4100/2735 car., 470-635 ms), 0 >=8s. Pornirea initiala a avut gte+lte (181 car.). |
| MFA (D-02): dispozitiv necunoscut, timp submit->MFA <2s, zero cereri de date pre-MFA | **DE FACUT DE UTILIZATOR** | necesita cod MFA; profil Chrome curat. Indiciu: la login proaspat s-au vazut cereri de date pe ecranul MFA + 25P02 + 57014 (vezi sectiunea Remasurare). |
| Simulare timeout pe vedere_cluburi_program_antrenamente: shell se deschide, 1 notificare, sportivi/grupe merg | **DE FACUT DE UTILIZATOR** | Fara DevTools request blocking in Chrome MCP. Incercat patch fetch + "Reincarca datele": butonul nu a refacut cererea (0 blocate) => inconcludent. De facut de utilizator (Network > Block request URL, reload). |
| Numar 57014 `authenticated` pe DB in fereastra | **PASS** | Supabase logs, ultimele 24h (rulat 16.11.2026): 14 x 57014, toate in ora 15.11 20:00 UTC (incidentul L10, inainte de fix). 0 in 16.11, deci 0 in toata fereastra masuratorilor SUPER_ADMIN/ADMIN_CLUB. |

## Observatii in afara scopului
- Dashboard super admin arata "Sportivi total 1000" (DB: 1616) — probabil Max Rows PostgREST; nu e din Faza 38.

## Gaps deschise
1. sesiuni_examene 9444 ms (SUPER_ADMIN, 1/10). 0 x 57014 pe DB in fereastra => nu e timeout DB; probabil coada pe conexiuni (max_connections=60) / latenta client. Singulara.
2. ~~Fereastra prezenta inconsecventa~~ REZOLVAT: URL-urile 4100/2930 din masuratorile vechi erau bucatile `prezenta_antrenament`, nu `vedere_cluburi_program_antrenamente`. Pornirea are gte/lte (181 car.); fara filtru doar pe ecranul de raport, cum e proiectat.
3. Punctele NEMASURATE de mai sus.

## Remasurare 16.11.2026 ~11:50 UTC (tab nou Chrome MCP, aceeasi sesiune, alegere rol Admin Phi Hau)
- Sesiunea nu are dispozitiv de incredere in acest tab => ecranul `setup-mfa` (cod pe email) apare dupa alegerea rolului. 3a/3b/3d NEFACUTE: nu pot trece de MFA fara codul utilizatorului.
- Pe ecranul MFA a aparut dialogul "Eroare incarcare date: current transaction is aborted, commands ignored until end of transaction block" (25P02).
- Snippet pe ecranul MFA: 40 cereri supabase, 0 >=8s, urlMax 3242. **Cereri de date inainte de MFA** (D-02 pica): sportivi, rbv_sportivi_complet, grupe, cluburi, grade, tipuri_plati, tipuri_abonament, sesiuni_examene, familii, nom_locatii, evenimente, taxe_anuale_config, vedere_cluburi_program_antrenamente, prezenta_antrenament, anunturi_prezenta, notificari. Permise doar: roluri/context, cluburi permise, MFA, tema. Neclar daca au plecat inainte sau dupa randarea ecranului MFA (de stabilit cronologic).
- DB (postgres_logs, 16.11): 3 x 57014 la 11:49-11:50 UTC (+2 la 11:50:10/14) si 26 x 25P02 la 11:50. **Corectie la tabelul de mai sus**: "0 x 57014 in 16.11" era valabil la momentul interogarii anterioare (inainte de aceasta remasurare); acum **FAIL** pe login proaspat. Atentie: in aceeasi fereastra poate fi activ si tab-ul utilizatorului; atribuirea exacta nu e dovedita.
- Verdict D-02 (zero cereri de date pre-MFA + fara 25P02 pe login proaspat): **FAIL provizoriu**, de reproductibilizat.
