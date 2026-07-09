---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: completed
stopped_at: Phase 17 context gathered
last_updated: "2026-07-08T14:03:35.124Z"
last_activity: 2026-07-06 -- Phase 16 marked complete
progress:
  total_phases: 16
  completed_phases: 6
  total_plans: 21
  completed_plans: 20
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-16)

**Core value:** Fiecare admin de club poate vedea dintr-un singur loc situația financiară (cine datorează ce și de când) și situația gradelor (cine e eligibil pentru examen, cât de bine promovează), cu export pentru contabilitate și raportare federație.
**Current focus:** Phase 16 — elimina-politici-rls-using-true-ramase-rezultate-facturi-fed

## Current Position

Phase: 16 — COMPLETE
Plan: 1 of 1
Status: Phase 16 complete
Last activity: 2026-07-09 - Completed quick task 260709-eiw: Restyle Import Sportivi si ecran principal Sesiuni Examen la paleta AdminMasterMap

```
Progress: [████████░░] 83% (5/6 phases)
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

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260609-vvj | Butoane ghost/transparente - adauga border si culoare pentru vizibilitate | 2026-06-09 | 86f64bb | [260609-vvj-butoane-ghost-transparente-adauga-border](./quick/260609-vvj-butoane-ghost-transparente-adauga-border/) |
| 260610-ka8 | export Excel fise examen (notare + validare) | 2026-06-10 | 380b989 | [260610-ka8-export-excel-fise-examen-notare-validare](./quick/260610-ka8-export-excel-fise-examen-notare-validare/) |
| 260615-financiar | Filtre perioade + editare sume în modulul Financiar | 2026-06-15 | - | [260615-financiar-filtre-perioade-editare-sume](./quick/260615-financiar-filtre-perioade-editare-sume/) |
| 260626-buf | Sistem perioade vacanță antrenamente — CRUD + selecție sportivi participanți | 2026-06-26 | 3c548b1 | Needs Review | [260626-buf-task-3-perioade-vacanta-antrenamente](./quick/260626-buf-task-3-perioade-vacanta-antrenamente/) |
| 260704-nbx | Fix status stale hub Înscriere club după retragere echipă — re-fetch echipeFormate | 2026-07-04 | a700a79 | Verified | [260704-nbx-fix-status-stale-hub-inscriere-club-dupa](./quick/260704-nbx-fix-status-stale-hub-inscriere-club-dupa/) |
| 260704-x9p | Sistem istoric activitate SUPER_ADMIN_FEDERATIE — audit_log extins, triggere CRUD, logare login/logout/rol, pagina Jurnal Audit | 2026-07-05 | 6a6abe8 | Verified | [260704-x9p-sistem-istoric-activitate-super-admin-fe](./quick/260704-x9p-sistem-istoric-activitate-super-admin-fe/) |
| 260705-1js | Consolidare endpoint-uri Vercel API 14->9 — fix deploy blocat de limita Hobby (12 functii) | 2026-07-05 | bcfd0a4 | Verified | [260705-1js-consolideaza-endpoint-uri-vercel-api-sub](./quick/260705-1js-consolideaza-endpoint-uri-vercel-api-sub/) |
| 260705-irg | Fix RLS cross-club leak (is_super_admin/este_staff_club/has_access_to_club + Select_Sportivi_Unified ignorau contextul activ) + afiseaza club per sportiv in Deduplicare pentru super admin | 2026-07-05 | d9e0ec8 | Verified | [260705-irg-fix-rls-context-aware-role-check-si-afis](./quick/260705-irg-fix-rls-context-aware-role-check-si-afis/) |
| 260705-pgg | Refactor Deduplicare Sportivi: include inactivi in detectie, merge_sportivi sterge duplicatul (delete efectiv, FK dinamic), guard acces club — migratie SQL scrisa, NEaplicata live | 2026-07-05 | 70db87e | Needs SQL apply | [260705-pgg-refactor-deduplicare-sportivi-include-in](./quick/260705-pgg-refactor-deduplicare-sportivi-include-in/) |
| 260708-h7k | Fix istoric grade Bindac (limita 1000 randuri PostgREST + club_id gresit in view) + grad implicit sportiv nou (trigger conditie moarta) + retroactiv 5 sportivi + unifica matching grad import CSV cu engine comun | 2026-07-08 | 94a4c7a | Verified | [260708-h7k-fix-istoric-grade-bindac-grad-implicit-unifica](./quick/260708-h7k-fix-istoric-grade-bindac-grad-implicit-unifica/) |
| 260709-eiw | Restyle Import Sportivi + ecran principal Sesiuni Examen la paleta/stil carduri din AdminMasterMap (slate-800/60 + amber-400) | 2026-07-09 | 80bb077 | Verified | [260709-eiw-restyle-import-sportivi-si-modulul-exame](./quick/260709-eiw-restyle-import-sportivi-si-modulul-exame/) |

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

Sursa: audit complet 2026-07-06 (vezi memory project_audit_complet_20260706.md). Ordine executie: 15→16→17 (securitate, urgent) apoi 18→19→20 (integritate date) apoi 21 (race conditions) apoi 22→23→24 (arhitectura, fara urgenta).

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

Last session: 2026-07-08T14:03:35.107Z
Stopped at: Phase 17 context gathered
Resume file: .planning/phases/17-verifica-aplicare-live-migratie-deduplicare-sportivi-si-deci/17-CONTEXT.md
