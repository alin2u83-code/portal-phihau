# Phase 25: Audit izolare cross-club Prezenta, Grupe si Abonamente - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Sezon nou — sistemul (Prezenta, Grupe, Abonamente/Plati recurente) urmeaza sa fie folosit de alte cluburi in afara clubului propriu. Faza 25 audita si REPARA izolarea cross-club pe aceste 3 module: RLS incomplet/lax, presupuneri hardcodate de single-club in cod, si comportament UI cand un club nou porneste fara date. Wizard-ul de onboarding club nou este Faza 26 (separata, depinde de aceasta).

</domain>

<decisions>
## Implementation Decisions

### Audit + fix, nu doar raport
- **D-01:** Faza produce audit SI fix aplicat live, in aceeasi faza — nu doar un document de gap-uri. Pattern identic cu Faza 15/16: inspecteaza schema live (information_schema, FK-uri, date reale) -> scrie migratie -> aplica pe Supabase live via MCP `apply_migration` -> verifica izolare cu query cross-club + UI live (Playwright, cont test alt club) -> checkpoint uman.
- **D-02:** Fail-closed pe randuri orfane (fara cale spre club_id): raman vizibile doar `is_super_admin()`, la fel ca precedentul din Faza 15. Nu se inventeaza club_id pt randuri ambigue.

### sesiune_activitate — rezolva riscul rezidual din Faza 15
- **D-03:** `sesiune_activitate` (folosita de modulul Prezenta) NU are club_id real in schema azi — ramasa restrictionata doar la super_admin dupa Faza 15. In Faza 25 se adauga coloana club_id reala + backfill (din FK-uri disponibile: sportiv/grupa/antrenament -> club_id), apoi RLS scoping normal per club. Motiv: fara asta, Prezenta e efectiv nefunctionala/invizibila pt ADMIN_CLUB/INSTRUCTOR la cluburi noi.
- **D-04:** Acelasi tratament (verifica daca are club_id real; daca nu, adauga+backfill) se aplica oricarei alte tabele descoperite in audit din domeniul Grupe/Prezenta/Abonamente fara cale de club_id (ex. eventual `staging_inscrieri` daca e relevant modulelor astea — de confirmat in audit, nu presupune).

### Empty state club nou
- **D-05:** Cand un club nou (0 date) deschide Grupe / Prezenta / Abonamente, fiecare ecran afiseaza mesaj explicativ ("Nicio grupa creata inca" / echivalent) + buton CTA direct spre actiunea de adaugare (Adauga Grupa / Adauga Tip Abonament / etc.) — nu tabel gol fara context, nu eroare.
- Aplica la toate ecranele principale ale celor 3 module cu liste (Grupe, Prezenta/rapoarte, TipuriAbonament) — implementarea exacta (ce componenta shared, daca exista deja un pattern EmptyState in ui.tsx) e decizie de research/planner.

### Claude's Discretion
- Lista exacta de tabele DB auditate per modul (Grupe: grupe, program_antrenamente, orar_saptamanal, perioade_vacanta; Prezenta: prezente, sesiune_activitate; Abonamente: tipuri_abonament, plati recurente) — researcher confirma pe schema live, nu presupune din memorie.
- Unde si cum sunt cautate "hardcodari" de single-club in cod (ex. club_id implicit, FEDERATIE_ID folosit gresit, lipsa `active-role-context-id` pe vreun query) — sarcina de audit tehnic, nu decizie de vizune.
- Design exact al componentei empty-state (daca se creeaza una noua reutilizabila sau se repeta inline) — decizie de planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pattern de audit+fix RLS (precedent direct)
- `.planning/phases/15-fix-rls-izolare-cross-club-pe-tabele-financiare-alocari-plat/15-01-SUMMARY.md` — pattern complet: inspectie schema live, migratie cu helper functions SECURITY DEFINER, aplicare live MCP, verificare cross-club + UI Playwright
- `.planning/phases/16-elimina-politici-rls-using-true-ramase-rezultate-facturi-fed/16-01-SUMMARY.md` — al doilea val de fix-uri RLS similare (users, knowledge_base, fisa_inscriere)
- `sql/migrations/fix_rls_context_aware_role_helpers.sql` — helper-e `has_access_to_club()`, `get_active_club_id()`, `is_super_admin()` deja existente, de refolosit
- `sql/rls/RLS_PLATI_TRANZACTII.sql` — politici RLS existente pe module financiare/plati, relevant pt Abonamente

### Context arhitectural
- `docs/baza-de-date.md` — schema completa tabele, pt identificarea coloanelor club_id existente/lipsa
- `docs/roluri-permisiuni.md` — definitii roluri si RLS, relevant pt scoping corect ADMIN_CLUB vs SUPER_ADMIN vs INSTRUCTOR
- `CLAUDE.md` §Anti-Pattern: Hardcoded Club IDs — anti-pattern-ul explicit de cautat in audit

### Memorie sesiuni anterioare
- Memory `project_audit_complet_20260706` — sursa fazelor 15-24, context istoric al problemelor RLS gasite

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/CluburiManagement.tsx` — CRUD club existent (nume/CIF/oras), infrastructura de baza multi-club deja functionala
- `components/ClubGuard.tsx` — guard existent de verificare context club, punct de referinta pt scoping corect
- `hooks/useDataProvider.ts` — sursa centrala de date filtrate per club (`visibleClubIds`)

### Established Patterns
- RLS: politica `club_member_access` cu helper functions SECURITY DEFINER per-tabel (`{tabel}_club_id(uuid)`) — pattern de urmat pt tabelele noi din Grupe/Prezenta/Abonamente
- Frontend defense-in-depth: filtrare dupa `visibleClubIds` in plus fata de RLS (nu doar RLS ca singura bariera)

### Integration Points
- `supabaseClient.ts` — injecteaza header `active-role-context-id`; orice query nou trebuie sa se bazeze pe el, nu pe club_id hardcodat in frontend

</code_context>

<specifics>
## Specific Ideas

Niciuna suplimentara fata de deciziile de mai sus — vezi `<decisions>`.

</specifics>

<deferred>
## Deferred Ideas

- Wizard onboarding club nou (creare club + prim admin + rol intr-un flux) — Faza 26, depinde de aceasta.
- Copiere template (tipuri abonament / grupe schelet) de la un club sursa la club nou — respins explicit pentru acest ciclu (user a ales "configurare de la zero" la new-milestone discussion); club nou porneste gol, empty-state-urile din D-05 acopera UX-ul.
- Signup public pt cluburi noi (fara interventie SUPER_ADMIN) — respins, ramane SUPER_ADMIN-only (decis la discutia de milestone).

</deferred>

---

*Phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha*
*Context gathered: 2026-08-28*
