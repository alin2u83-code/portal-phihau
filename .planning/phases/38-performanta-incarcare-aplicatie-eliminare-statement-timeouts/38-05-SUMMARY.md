---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 05
subsystem: frontend-loading
tags: [lazy-loading, view-map, app-router, d-01]

requires: [38-04]
provides:
  - utils/dateLaCerere.ts -> TOATE_CHEILE_LA_CERERE, cheiPentruView(view, rol)
  - AppRouter cere seturile grele ale view-ului activ
affects: [38-06, 38-07]

key-files:
  created: [utils/dateLaCerere.ts, utils/dateLaCerere.test.ts]
  modified: [components/AppRouter.tsx]

key-decisions:
  - "Toate aliasurile hub-ului Plati & Facturi cer acelasi set (un singur PlatiHub, tab-ul vine din viewParams); set = 9 chei financiare/taxe din plan + inscrieriExamene (PlatiScadente o citeste din filteredData)"
  - "sportivi cere si reduceri (FacturaDetaliu, deschis din coloana de restante, cauta numele reducerii)"
  - "istoric-plati (personal) are set trasat mic (plati, istoricPlatiDetaliat), nu setul complet din plan: FacturiPersonale are 3 fisiere si nu importa nimic financiar"
  - "dashboard/my-portal: rol staff (SUPER_ADMIN_FEDERATIE, ADMIN, ADMIN_CLUB, INSTRUCTOR) = AdminMasterMap; SPORTIV = SportivDashboard; rol null/necunoscut = reuniunea celor doua"
  - "Ecrane largi lasate pe plasa de siguranta (toate cheile), documentate mai jos"

requirements-completed: [D-01]
completed: 2026-11-16
---

# Phase 38 Plan 05: Harta view -> seturi la cerere Summary

**AppRouter apeleaza o singura data `useDateLaCerere(cheiPentruView(activeView, activeRole))` inainte de return-urile timpurii; harta e trasata din codul real (55 de intrari explicite, dashboard/my-portal incluse), iar orice view nemapat primeste toate cele 12 chei grele, niciodata `antrenamenteIstoricComplet`.**

## Task Commits

1. Task 1 (harta + teste) - `ba51b201` (utils/dateLaCerere.ts, utils/dateLaCerere.test.ts)
2. Task 2 (wiring AppRouter) - `f08f6733` (components/AppRouter.tsx)

## Metoda de trasare

Script de unica folosinta (in afara repo-ului): pornind de la componenta randata de fiecare `case`, urmareste importurile locale (inclusiv `import()` lazy) si marcheaza fisierele care contin cuvantul oricarei chei grele (supraestimare intentionata). Nu intra in DataContext / useDataProvider / useFilteredData / LazyComponents (altfel tot arborele ar parea "citit"). Fiecare lovitura a fost apoi verificata manual: citire reala din `useData()`/`filteredData`/props de la AppRouter, versus nume de tabel Supabase (`.from('plati')`), variabila locala sau text. Cele mai multe "lovituri" din `Prezenta/*`, `Grupe/*`, `FederationDashboard`, `AdminDashboard`, `FamilieWidget`, `DeleteAuditModal`, `RaportCompletSportiv` sunt nume de tabel din interogari proprii. Cheile ce AppRouter paseaza ca props din `useData()` (ex. `fisa-competitie` -> `participari={inscrieriExamene}`) au fost numarate si ele.

## Tabel de trasare (view -> chei -> fisiere care le citesc)

| View | Chei | Fisiere care le citesc |
|------|------|------------------------|
| setup-mfa | (nimic) | SetupMFAPage nu citeste seturi |
| dashboard / my-portal, rol staff | plati, inscrieriExamene, deconturiFederatie | AppRouter -> AdminMasterMap (props) + DeRezolvatCard(plati); QuickAccess/NewsfeedWidget nu citesc seturi |
| dashboard / my-portal, SPORTIV | plati, istoricGrade, inscrieriExamene, rezultate | SportivDashboard/index (props participari=inscrieriExamene, istoricGrade, plati), SportivPassport, VizaMedicalaCard, EvenimenteWidget (filteredData.rezultate + inscrieriExamene), useAttendanceStats(istoricGrade) |
| dashboard / my-portal, rol null/altul | reuniunea celor doua (5 chei) | AppRouter alege intre cele doua dashboard-uri dupa `hasAdminAccess && activeRole !== 'SPORTIV'` |
| federation-dashboard, admin-dashboard | (nimic) | FederationDashboard/AdminDashboard/FederationDashboardMobile: doar interogari proprii (`supabase.from('plati')` count) |
| sportivi | plati, tranzactii, istoricPlatiDetaliat, reduceri | Sportivi/index (plati, tranzactii din useData; filteredData.istoricPlatiDetaliat), useFamilyManager(plati, tranzactii), RestanteSportiv, FacturaDetaliu (filteredData.plati/tranzactii, reduceri) |
| grupe | (nimic) | Grupe/index, 36 fisiere, 0 citiri reale |
| prezenta, prezenta-instructor | (nimic) | Prezenta/index (38 fisiere) si InstructorPrezentaPage (16): 0 citiri reale |
| program-antrenamente, activitati, raport-prezenta, raport-lunar-prezenta | (nimic) | 0 citiri reale; istoricul complet de prezenta il cer ei insisi (38-06) |
| istoric-prezenta | (nimic) | MartialAttendance + TabelPrezentaVedere: "rezultate" e text |
| raport-interval-examen | istoricGrade | RaportIntervalExamen (filteredData.istoricGrade:169) |
| calendar | rezultate, preturiConfig | CalendarView (filteredData.rezultate:154, preturiConfig:147); `setPlati`/`setRezultate` sunt doar append, nu citire |
| competitii | vizeSportivi | Competitii/index (useData().vizeSportivi:81, pasat la AdminPanel/InscrieriView/InscriereModal/InscriereClubWizard); arborele are 72 fisiere, nicio alta cheie. useVizeFramClub are interogare proprie |
| fisa-competitie | inscrieriExamene | AppRouter paseaza `participari={inscrieriExamene}`; FisaCompetitie le citeste |
| istoric-plati | plati, istoricPlatiDetaliat | AppRouter (filteredData.plati, istoricPlatiDetaliat) -> FacturiPersonale/IstoricPlati (3 fisiere, utils/facturiSportiv) |
| audit-grade | istoricGrade | Grade/AuditGrade + utils/auditGrade |
| rapoarte | (nimic) | ReportsDashboard: doar butoane de navigare |
| legitimatii, jurnal-audit, conturi-cluburi, cereri-inscriere, protectia-datelor, cereri-gdpr, structura-federatie, template-probe, activitati-nationale, inlantuiri-admin, user-management, cluburi, anunturi-federatie, setari-club, grade, notificari, sezoane, account-settings | (nimic) | trasate, 0 citiri reale |
| plati-hub, plati-scadente, gestiune-facturi, facturi-fara-prezenta, jurnal-incasari, raport-financiar, financial-dashboard, tipuri-abonament, configurare-preturi, reduceri, taxe-anuale, nomenclatoare, deconturi-federatie, perioade-vacanta, produse, vanzari-produse | plati, tranzactii, istoricPlatiDetaliat, reduceri, preturiConfig, vizeSportivi, decontSportivi, deconturiFederatie, taxaAnualaFederatieConfig, inscrieriExamene | PlatiHub + TabFacturi (plati, tranzactii, reduceri, preturiConfig), TabRapoarte/RaportFinanciar/RevenueBarChart/PaymentTypePieChart (istoricPlatiDetaliat), GestiuneFacturi, JurnalIncasari, TabDeconturiEchipamente (decontSportivi, deconturiFederatie), TaxeAnuale + TaxeAnualeTabs/* + FederationInvoices (vizeSportivi, decontSportivi, taxaAnualaFederatieConfig), PlatiScadente (inscrieriExamene) |

## Lasate pe plasa de siguranta (toate cele 12 chei)

Arbori prea largi sau cu props cu multe chei, nu s-a incercat micsorarea: `profil-sportiv` (UserProfile: plati, tranzactii, istoricPlatiDetaliat, reduceri, istoricGrade, inscrieriExamene, taxe), `examene` si `rapoarte-examen` (GestiuneExamene/* si RapoarteExamen), `data-maintenance` (BackupManager), `fisa-digitala` (props plati+inscrieri), `familii` (useFamilyManager), `stagii` (StagiiCompetitii), `admin-sms`, `admin-console` (RLSTester), `import-sportivi`, `istoric-activitate`, `deduplicare-sportivi`, `button-catalog`, plus orice view fara intrare in `HARTA`. Cost: aceste ecrane incarca tot la deschidere (la fel ca vechiul startup, dar prin coada limitata si dupa primul ecran).

## Verificare

- `npx tsx utils/dateLaCerere.test.ts`: 17 PASS, "Toate testele au trecut" (include o verificare pe fiecare intrare explicita / grup, fallback, setup-mfa, hub complet, dashboard pe roluri, absenta lui `antrenamenteIstoricComplet`, copiere defensiva a rezultatului).
- `npx tsx utils/incarcareDate.test.ts`, `utils/supabaseHelpers.test.ts`: trec.
- `npx tsc --noEmit -p .`: 0 erori. `npm run build`: reusit.
- grep: `useDateLaCerere(cheiPentruView(activeView` exact o data in AppRouter, inainte de `OnboardingCompletare currentUser`.
- NU verificat: orice rulare in browser (ca fiecare ecran din tabel chiar afiseaza datele dupa incarcarea la cerere, ca nu clipeste "nicio inregistrare" cat chei sunt in zbor: ecranele nu folosesc inca `seIncarca`, vezi mai jos; rolurile SPORTIV/INSTRUCTOR/federatie). Harta e derivata static, nu masurata pe cereri reale (38-07). Fara review separat de cod (nu aveam agent disponibil); recomandat inainte de push.

## Atentie pentru urmatoarele planuri

- Nicio componenta nu foloseste inca `seIncarca` din `useDateLaCerere` (AppRouter ignora valoarea returnata): pana sosesc cheile, ecranele randeaza liste goale (ex. "Nicio factura", coloana de restante goala, card "De rezolvat" fara plati) si apoi se completeaza. Daca asta se vede ca flash enervant, urmatorul pas e un indicator de incarcare per ecran cu `seIncarca`; neinclus aici (plan: doar harta + o apelare in AppRouter).
- Cand un ecran nou incepe sa citeasca o cheie grea, trebuie adaugata in `HARTA` (altfel, daca view-ul e deja mapat cu un set mai mic, ramane gol). View-urile nemapate sunt acoperite automat.
- 38-06 modifica deja Prezenta/Grupe/Activitati si cere `antrenamenteIstoricComplet` din componente; harta nu il contine, deci nu apare dublu.

## Deviations from Plan

- **istoric-plati**: plan-ul il pune in grupul "toate cheile financiare si de taxe"; trasarea arata ca ecranul personal citeste doar plati + istoricPlatiDetaliat si nu importa nimic financiar, deci am pus setul trasat (mai mic). Singurul caz in care o intrare e mai mica decat lista din plan; justificat de planul insusi ("derive the keys by the trace procedure, do not guess").
- **Intrari explicite suplimentare** (peste minimul din plan): 18 ecrane administrative fara seturi grele, `rapoarte`, `audit-grade`; `sportivi` + reduceri; hub + inscrieriExamene.
- Rule 2 aplicat: `cheiPentruView` returneaza mereu copii (un apelant nu poate muta `TOATE_CHEILE_LA_CERERE`).

## Known Stubs

Niciunul.

## Threat Flags

Niciunul. T-38-16 mitigat prin harta trasata + teste per intrare + fallback; T-38-17 acceptat (ecranele largi incarca tot, prin coada limitata).

## Self-Check: PASSED

Fisiere create/modificate prezente (`utils/dateLaCerere.ts`, `utils/dateLaCerere.test.ts`, `components/AppRouter.tsx`), commit-urile ba51b201 si f08f6733 exista. STATE.md/ROADMAP.md neatinse (le actualizeaza orchestratorul).
