---
phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie
plan: 01
subsystem: database
tags: [postgres, supabase, rls, migrations, plati, federatie]

requires: []
provides:
  - "deconturi_federatie extinsa cu club_id/an_fiscal/tip_activitate/nr_participanti/status_plata/metoda_plata/data_generare + UNIQUE(club_id, an_fiscal)"
  - "decont_sportivi UNIQUE(sportiv_id, an) nou"
  - "vize_sportivi UNIQUE(sportiv_id, an) deja exista (uq_viza_sportiv_an) — reutilizata, nu recreata"
  - "public.taxa_anuala_config nou: an_fiscal/suma, RLS scriere doar SUPER_ADMIN_FEDERATIE, seed (2026, 170)"
  - "backfill live: 37 facturi FRQKD 2025-2026 -> 1 decont club + 37 vize an=2025 + 37 decont_sportivi"
affects: [29-02, 29-03, 29-04]

tech-stack:
  added: []
  patterns:
    - "ALTER aditiv + bloc DO condiționat de pg_constraint pentru constrângeri idempotente"
    - "SET NOT NULL condiționat de count(*)=0 pe tabela țintă, verificat înainte prin audit live"

key-files:
  created:
    - .planning/phases/29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie/29-SCHEMA-AUDIT.md
    - sql/migrations/taxa_anuala_federatie_schema_260912.sql
    - sql/migrations/taxa_anuala_federatie_backfill_260912.sql
  modified: []

key-decisions:
  - "B1 (index unic plati(sportiv_id,an)) e OK, nu blocant: indexul existent plati_taxa_anuala_unique e partial, scoped strict pe tip='Taxa Anuala' — nu intra in coliziune cu insert-urile tip='FRQKD' din 29-02"
  - "B2 BLOCANT confirmat: FORCE ROW LEVEL SECURITY=true pe plati/deconturi_federatie/decont_sportivi/vize_sportivi — planul 29-02 (funcția SECURITY DEFINER activeaza_taxa_anuala) trebuie să trateze explicit acest gap, nu poate presupune bypass RLS implicit al proprietarului"
  - "B3: valoarea reală acceptată de CHECK pe vize_sportivi.status_viza e 'Activ' (nu 'Activa' din spec) — folosită în backfill"
  - "vize_sportivi avea deja UNIQUE(sportiv_id, an) sub numele uq_viza_sportiv_an — nu s-a creat un al doilea index, doar decont_sportivi a primit unul nou"
  - "taxa_anuala_config (nou) nu se confundă cu taxe_anuale_config (tabelă veche, altă formă, 2 rânduri) — nume diferit, fără migrare/consolidare în scope-ul acestei faze"

patterns-established:
  - "Migrațiile financiare pe DB live se scriu 100% pe baza unui audit read-only rulat imediat înainte, nu pe presupuneri din fișierele de migrație din repo (care pot fi neaplicate sau desincronizate)"

requirements-completed: [TAF-01, TAF-02, TAF-03]

duration: ~35min
completed: 2026-09-12
---

# Phase 29 Plan 01: Schema + backfill taxa anuală federație FRQKD

**Schema `deconturi_federatie` reparată live (club_id/an_fiscal + unicitate), `taxa_anuala_config` creată cu RLS, și cele 37 facturi FRQKD 2025-2026 migrate idempotent în noul model.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3
- **Files modified:** 3 (1 audit doc + 2 migrații SQL)

## Accomplishments
- Audit read-only complet al schemei live (10 interogări) cu verdict pe 6 blocaje posibile — un singur blocaj real găsit (FORCE RLS), documentat pentru planul 29-02
- Migrație schema aplicată live: `deconturi_federatie` de la 6 la 13 coloane, `UNIQUE(club_id, an_fiscal)` funcțional, `taxa_anuala_config` nouă cu RLS strict (SELECT deschis, INSERT/UPDATE doar SUPER_ADMIN_FEDERATIE, fără DELETE)
- Backfill live confirmat idempotent prin re-rulare: 37 facturi istorice -> exact 1 decont club + 37 vize + 37 legături decont_sportivi, zero rânduri noi la a doua rulare

## Task Commits

1. **Task 1: Audit schema live** - `8ddce71` (docs)
2. **Task 2: Migrație schema deconturi_federatie + taxa_anuala_config** - `c69b226` (feat)
3. **Task 3: Backfill 37 facturi FRQKD 2025-2026** - `13e69d7` (feat)

## Files Created/Modified
- `.planning/phases/29-.../29-SCHEMA-AUDIT.md` - rezultate brute 10 interogări + verdict B1-B6
- `sql/migrations/taxa_anuala_federatie_schema_260912.sql` - ALTER aditiv + constrângeri + tabelă nouă, aplicată live
- `sql/migrations/taxa_anuala_federatie_backfill_260912.sql` - 3 INSERT cu ON CONFLICT, aplicată live

## Decisions Made
Vezi `key-decisions` din frontmatter — cele mai importante: B2 (FORCE RLS) e un blocaj real transferat explicit către planul 29-02, iar `vize_sportivi` nu a primit un index duplicat pentru că unul echivalent exista deja.

## Deviations from Plan

Niciuna semnificativă — `data_generare` a fost adăugată exact cum planul o cerea (marcată explicit ca descoperire de planificare, nu decizie D-NN), fără scope creep suplimentar.

## Issues Encountered

`sql/` este în `.gitignore`, dar migrațiile recente (`mfa_email_verificari_260907.sql` etc.) sunt deja urmărite în git prin `git add -f`, deci am urmat aceeași convenție pentru cele 2 fișiere noi.

## User Setup Required

None - nicio configurare externă necesară.

## Next Phase Readiness

29-02 (funcția `activeaza_taxa_anuala` + triggere) poate porni: indecșii unici pe care se bazează `ON CONFLICT` există și sunt verificați. Atenție obligatorie la B2 (FORCE RLS) înainte de a scrie funcția SECURITY DEFINER — fără o soluție explicită, INSERT-urile din trigger vor eșua silențios sau vor arunca "permission denied".

---
*Phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie*
*Completed: 2026-09-12*
