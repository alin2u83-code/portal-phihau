---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: executing
stopped_at: Completed 26-01-PLAN.md
last_updated: "2026-08-30T22:49:21.215Z"
last_activity: 2026-08-30 -- Phase 26 execution started
progress:
  total_phases: 18
  completed_phases: 7
  total_plans: 30
  completed_plans: 25
  percent: 39
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-16)

**Core value:** Fiecare admin de club poate vedea dintr-un singur loc situația financiară (cine datorează ce și de când) și situația gradelor (cine e eligibil pentru examen, cât de bine promovează), cu export pentru contabilitate și raportare federație.
**Current focus:** Phase 26 — wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a

## Current Position

Phase: 26 (wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-08-30 -- Phase 26 execution started

```
Progress: [█████████░] 86% (6/7 phases)
```

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 25 P01 | 70min | 3 tasks | 3 files |
| Phase 25 P02 | 7min | 3 tasks | 4 files |
| Phase 25 P04 | ~150min | 3 tasks | 4 files |
| Phase 26 P01 | 15min | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Zero migrații DB în v1.1 — tabele existente (plati, examene, rezultate_examene, grade, sportivi, rbv_sportivi_complet) au toate datele necesare
- Rapoarte în componente separate (nu inline în module existente) — complexitate justifică componente dedicate
- Recharts (v2.15.4) pentru grafice — deja instalat
- jsPDF + jspdf-autotable pentru PDF export — deja instalat
- PapaParse pentru CSV export — deja instalat
- Filtrare client-side pe date deja cached în React Query — fără query-uri noi Supabase
- guard comandă duplicată: gasesteSauCreeazaComandaActiva() — refolosire comandă activă, nu creare a doua per tip+club
- scădere stoc NUMAI per_sportiv la predare — per_club gestionat separat prin IntrareMarfaModal (13-03)
- sportivi.nume + prenume în locul nome_complet — coloana nome_complet nu există în DB (fix 13-03)
- FederatieComandaView condiționat pe isFederationAdmin (nu pe rol string direct) — consistent cu RLS is_super_admin()
- confirmaReceptieClub operează pe comenzi_produse_cluburi.id — fiecare club confirmă recepția proprie independent
- [Phase ?]: Migratie SQL deduplicare (find_similar_sportivi + merge_sportivi: include inactivi, delete efectiv, guard acces club) scrisa dar NEaplicata live - user trebuie sa o aplice manual
- [260708-h7k]: unificare matching sportivi (Jaccard ImportExamenModal vs Levenshtein engine comun) amanata deliberat — risc financiar/identitate, necesita test regresie pe CSV istorice reale inainte de swap (relevant pt Phase 24)
- [Phase ?]: 260717-f99: creare/skip abonament vacanta per participant + revert automat la incheiere perioada; coloane noi participare_vacanta (SQL scrisa, NEaplicata live)
- [Phase ?]: Faza 25: evenimente NU foloseste get_my_club_ids() (deja migrata 2026-03-10), migratia originala pentru grupe/evenimente s-a redus doar la grupe
- [Phase ?]: Faza 25: gap real de tampering gasit pe rbv_plati_insert/update/delete (WRITE fara scoping de club) - reparat in migratia scrisa in 25-01
- [Phase ?]: Faza 25: risc rezidual loggat NEATINS - posibile politici RLS duplicate pe prezenta_antrenament (rbv_prezenta_* vs politici vechi 20260305), necesita audit separat
- [Phase ?]: [Phase 25-02]: EmptyState (componenta noua in ui.tsx) inlocuieste fallback-urile text italic din Grupe/Prezenta-GrupeList/TipuriAbonament — buton actiune randat doar cand actionLabel+onAction sunt ambele definite
- [Phase 25-04]: get_my_club_ids() si get_my_clubs() sunt deprecate de facto — zero call-site-uri ramase in pg_policies dupa migratia 20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente_v2 (ultimul, "Staff - Full Access Grupe", inlocuit in Sectiunea 4); functiile raman definite in DB fara DROP FUNCTION (in afara scope-ului unei migratii de politici)
- [Phase 25-04]: semantica tipuri_abonament.club_id IS NULL = fail-closed by default (D-02) — 0 din 5 randuri reale au club_id NULL azi; nu s-a inventat o ramura "nomenclator federal partajat" pentru date care nu exista; daca apare vreodata un rand orfan, va fi vizibil doar prin is_super_admin()
- [Phase 25-04]: bug conex descoperit si fixat de orchestrator in timpul rularii testului automat 25-04 (in afara scope-ului planului) — trigger tr_automatizeaza_roluri pe utilizator_roluri_multicont NU avea SECURITY DEFINER (spre deosebire de celelalte trigger-uri de pe acelasi tabel), functia face JOIN pe auth.users si rula cu privilegiile apelantului -> "permission denied for table users" la orice INSERT in utilizator_roluri_multicont; fix aplicat live (CREATE OR REPLACE FUNCTION cu SECURITY DEFINER adaugat); acelasi cod path e folosit de services/authService.ts la inregistrare reala sportivi — risc real pentru inregistrarea self-service, prins inainte de sezonul nou
- [Phase 26]: [26-01] api/creare-cont.ts securizat: Authorization Bearer + auth.getUser + ROLE_WEIGHTS anti-escaladare + scoping club, oglindit intre client (hooks/useRoleAssignment.ts) si server — endpoint-ul rula anterior neautentificat cu SUPABASE_SERVICE_ROLE_KEY, orice client anonim putea emite cont SUPER_ADMIN_FEDERATIE
- [Phase 26]: [26-01] utils/parola.ts genereazaParolaTemporara() foloseste crypto.getRandomValues + rejection sampling + Fisher-Yates, zero Math.random, ~97 biti entropie la 16 caractere — D-05 cere parola temporara generata automat, imposibil de ghicit din date publice admin - pattern anterior era ${nume}.1234!

### Pending Todos

- [2026-07-11-investigheaza-hang-loading-fetchallpages-istoric-grade.md](todos/pending/2026-07-11-investigheaza-hang-loading-fetchallpages-istoric-grade.md) — hang loading app, query fetchAllPages vedere_istoric_grade_sportiv pending indefinit prin PostgREST (rapid direct pe DB)
- [2026-08-28-audit-politici-rls-fantoma-pe-tabele-in-afara-fazei-25.md](todos/pending/2026-08-28-audit-politici-rls-fantoma-pe-tabele-in-afara-fazei-25.md) — politici RLS fantoma (aplicate direct pe DB, niciodata comise) gasite si pe tranzactii/grade/istoric_grade/eveniment/reduceri/cluburi, in afara scope-ului Fazei 25 — audit + fix urmator

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260609-vvj | Butoane ghost/transparente - adauga border si culoare pentru vizibilitate | 2026-06-09 | 86f64bb | [260609-vvj-butoane-ghost-transparente-adauga-border](./quick/260609-vvj-butoane-ghost-transparente-adauga-border/) |
| 260610-ka8 | export Excel fise examen (notare + validare) | 2026-06-10 | 380b989 | [260610-ka8-export-excel-fise-examen-notare-validare](./quick/260610-ka8-export-excel-fise-examen-notare-validare/) |
| 260615-financiar | Filtre perioade + editare sume în modulul Financiar | 2026-06-15 | - | [260615-financiar-filtre-perioade-editare-sume](./quick/260615-financiar-filtre-perioade-editare-sume/) |
| 260626-buf | Sistem perioade vacanță antrenamente — CRUD + selecție sportivi participanți | 2026-06-26 | 3c548b1 | Needs Review | [260626-buf-task-3-perioade-vacanta-antrenamente](./quick/260626-buf-task-3-perioade-vacanta-antrenamente/) |
| 260704-nbx | Fix status stale hub Înscriere club după retragere echipă — re-fetch echipeFormate | 2026-07-04 | a700a79 | Verified | [260704-nbx-fix-status-stale-hub-inscriere-club-dupa](./quick/260704-nbx-fix-status-stale-hub-inscriere-club-dupa/) |
| 260704-x9p | Sistem istoric activitate SUPER_ADMIN_FEDERATIE — audit_log extins, triggere CRUD, logare login/logout/rol, pagina Jurnal Audit | 2026-07-05 | 6a6abe8 | Verified | [260704-x9p-sistem-istoric-activitate-super-admin-fe](./quick/260704-x9p-sistem-istoric-activitate-super-admin-fe/) |
| 260829-erg | Anulare/ștergere factură Abonament pt sportivi fără prezență în lună — status 'Anulat' + raport nou + 3 suprafețe UI | 2026-08-29 | (vezi commituri Task 2-6 în SUMMARY) | Needs Review (checkpoint uman Task 7 pending) | [260829-erg-anulare-stergere-factura-abonament-pt-sp](./quick/260829-erg-anulare-stergere-factura-abonament-pt-sp/) |
| 260705-1js | Consolidare endpoint-uri Vercel API 14->9 — fix deploy blocat de limita Hobby (12 functii) | 2026-07-05 | bcfd0a4 | Verified | [260705-1js-consolideaza-endpoint-uri-vercel-api-sub](./quick/260705-1js-consolideaza-endpoint-uri-vercel-api-sub/) |
| 260705-irg | Fix RLS cross-club leak (is_super_admin/este_staff_club/has_access_to_club + Select_Sportivi_Unified ignorau contextul activ) + afiseaza club per sportiv in Deduplicare pentru super admin | 2026-07-05 | d9e0ec8 | Verified | [260705-irg-fix-rls-context-aware-role-check-si-afis](./quick/260705-irg-fix-rls-context-aware-role-check-si-afis/) |
| 260705-pgg | Refactor Deduplicare Sportivi: include inactivi in detectie, merge_sportivi sterge duplicatul (delete efectiv, FK dinamic), guard acces club — migratie SQL scrisa, NEaplicata live | 2026-07-05 | 70db87e | Needs SQL apply | [260705-pgg-refactor-deduplicare-sportivi-include-in](./quick/260705-pgg-refactor-deduplicare-sportivi-include-in/) |
| 260708-h7k | Fix istoric grade Bindac (limita 1000 randuri PostgREST + club_id gresit in view) + grad implicit sportiv nou (trigger conditie moarta) + retroactiv 5 sportivi + unifica matching grad import CSV cu engine comun | 2026-07-08 | 94a4c7a | Verified | [260708-h7k-fix-istoric-grade-bindac-grad-implicit-unifica](./quick/260708-h7k-fix-istoric-grade-bindac-grad-implicit-unifica/) |
| 260709-eiw | Restyle Import Sportivi + ecran principal Sesiuni Examen la paleta/stil carduri din AdminMasterMap (slate-800/60 + amber-400) | 2026-07-09 | 80bb077 | Verified | [260709-eiw-restyle-import-sportivi-si-modulul-exame](./quick/260709-eiw-restyle-import-sportivi-si-modulul-exame/) |
| 260709-m7m | Fix 3 bug-uri modul Examene: diacritice mojibake in ManagementInscrieri, sportiv nou cu club_id NULL din import (invizibil in lista sesiune), grad_actual_id suprascris gresit in state local finalizeExamen | 2026-07-09 | 7e44c54 | Verified (self-check) | [260709-m7m-fix-3-bug-uri-modul-examene-1-diacritice](./quick/260709-m7m-fix-3-bug-uri-modul-examene-1-diacritice/) |
| 260709-fth | Gestiune Sesiuni Examen: scoping strict club activ (non-federatie) + dropdown ani derivat dinamic din sesiuni reale | 2026-07-09 | b73fba2 | [260709-fth-gestiune-sesiuni-examen-filtrare-club-si](./quick/260709-fth-gestiune-sesiuni-examen-filtrare-club-si/) |
| 260709-kr1 | SearchableSelect (scriere+listă) pentru filtre Lună/An Gestiune Sesiuni Examen + ClubSelect + Sportivi (Grupă/Grad) + Prezență + Plăți + Competiții (Probă/Grad min-max) | 2026-07-09 | 12c3a11 | [260709-kr1-searchableselect-pentru-filtre-luna-an-g](./quick/260709-kr1-searchableselect-pentru-filtre-luna-an-g/) |
| 260710-07l | Jurnal Audit: coloană nume utilizator (nu UUID) + filtru SearchableSelect pe nume + tab Sesiuni/Trafic derivat din LOGIN/LOGOUT existent (durată sesiune, "în curs" pt sesiuni neînchise) | 2026-07-09 | 50e8a57 | Verified (human checkpoint) | [260710-07l-audit-log-afiseaza-nume-utilizator-nu-uu](./quick/260710-07l-audit-log-afiseaza-nume-utilizator-nu-uu/) |
| 260717-f99 | Creare în masă abonament pentru participanții unei perioade de vacanță + revert automat la încheiere perioadă — migrație SQL scrisă (NEaplicată live) | 2026-07-17 | 61bd09d | Needs SQL apply | [260717-f99-adauga-logica-creare-abonament-pentru-sp](./quick/260717-f99-adauga-logica-creare-abonament-pentru-sp/) |

### Roadmap Evolution

- Phase 15 added: Fix RLS izolare cross-club pe tabele financiare (alocari_plati, tranzactie_plata, incasari_efective, obligatii_plata, aplicare_reduceri, detalii_decont, sesiune_activitate, staging_inscrieri)
- Phase 16 added: Elimina politici RLS USING(true) ramase (rezultate, facturi_federale, note_examene, etc) si restrictioneaza public.users
- Phase 17 added: Verifica aplicare live migratie deduplicare sportivi si decide MFA obligatoriu vs opțional
- Phase 18 added: Fix suprascriere silentioasa grad in istoric_grade (sportivService) si unifica sursa de adevar grad_actual_id
- Phase 19 added: Elimina ignoreDuplicates silentios pe upsert istoric_grade (8 locuri) si adauga rollback plati/tranzactii in GestiuneFacturi
- Phase 20 added: Fix club_id lipsa in useAttendance si aliniaza retragere individuala competitie cu retragere echipa
- Phase 21 added: Fix race conditions (Pas4Sumar competitii, login dublu-click, bucla schimbare parola, refetch PlatiScadente)
- Phase 22 added: Decizie React Query vs useDataProvider si unifica calcul sold financiar intr-un hook canonic
- Phase 23 added: Sparge ManagementInscrieri.tsx (1694L) in module separate pe responsabilitate
- Phase 24 added: Unifica cele 3 fisiere import Excel examene si migreaza type=date la DateInputDMY
- Phase 25 added: Audit izolare cross-club Prezenta, Grupe si Abonamente (RLS, hardcodari, empty states club nou) — sezon nou, alte cluburi vor folosi sistemul
- Phase 26 added: Wizard onboarding club nou ghidat de SUPER_ADMIN (club + prim admin + rol intr-un singur flux) — depinde de Phase 25

Sursa: audit complet 2026-07-06 (vezi memory project_audit_complet_20260706.md). Ordine executie: 15→16→17 (securitate, urgent) apoi 18→19→20 (integritate date) apoi 21 (race conditions) apoi 22→23→24 (arhitectura, fara urgenta).

**PRIORITATE URGENTA (cerinta 2026-08-28, sezon nou in cateva saptamani):** Phase 25 si 26 trebuie executate INAINTEA fazelor 18-24 (backlog arhitectural fara deadline). Ordine recomandata reala: 15→16→17 (deja complete/in curs) → **25→26** → 18→19→20→21→22→23→24.

### Blockers/Concerns

at roadmap creation. De verificat înainte de Phase 9:

- `rbv_sportivi_complet` view — confirmă că include `grad_curent_id` și `data_grad_curent` (sau echivalent) pentru calculul eligibilitate next grad
- `grade` tabel — verifică dacă are coloana `timp_minim_luni` sau echivalent pentru condiția de eligibilitate GRD-03
- Aplica manual migratia sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql in Supabase (SQL Editor / apply_migration) - contine DELETE ireversibil in merge_sportivi()

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | WhatsApp la anulare antrenament | Deferred | 2026-06-04 |
| v2 | Calendar săptămânal (week view) | Deferred | 2026-06-04 |
| v2 | Stagii cu probe CVD extins | Deferred | 2026-06-04 |
| v2 | Dashboard federație cu agregate multi-club (SUPER_ADMIN) | Deferred | 2026-06-16 |
| v2 | Raport prezență antrenamente per club/grupă | Deferred | 2026-06-16 |
| v2 | Notificări WhatsApp/email din interfața de raport | Deferred | 2026-06-16 |
| v3 | Predicții AI: sportivi cu risc abandon, recomandare sesiune examen | Deferred | 2026-06-16 |

## Session Continuity

Last session: 2026-08-30T22:49:21.186Z
Stopped at: Completed 26-01-PLAN.md
Resume file: None
