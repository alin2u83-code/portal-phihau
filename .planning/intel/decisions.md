# Intel: Decisions

Generated: 2026-06-09
Mode: merge (additive — no new locked decisions from this ingest batch)

---

## Notes on this ingest batch

The single ingested document (`docs/adservio-ui-research.md`, type: DOC) contains no
architectural decisions, ADRs, or locked choices. It is pure reference/research material.

No decision entries are added from this batch.

---

## Existing locked decisions (from .planning/PROJECT.md — Key Decisions block)

The following decisions are recorded here for traceability. They were not ingested from an
ADR file — they are captured from the active PROJECT.md context as pending decisions.

source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md

### DEC-hook-useCompetitieFilters
Status: Pending (not locked)
Decision: Extract filter logic into a standalone `hooks/useCompetitieFilters.ts` hook
Scope: Filtrare Unificata — state management
Rationale: Logic is reusable across multiple tabs without prop-drilling

### DEC-component-CompetitieFilterBar
Status: Pending (not locked)
Decision: Create a single shared `CompetitieFilterBar` component — UI identical across all tabs
Scope: Filtrare Unificata — UI layer
Rationale: Modify from one place, consistent appearance everywhere

### DEC-client-side-filtering
Status: Pending (not locked)
Decision: All filtering is client-side on already-loaded data — no new Supabase queries
Scope: Filtrare Unificata — performance
Rationale: Category/registration data already in memory; extra query overhead unjustified

### DEC-template-refactor-not-duplicate
Status: Pending (not locked)
Decision: Tab Template refactored to use shared `CompetitieFilterBar`, not duplicated
Scope: Filtrare Unificata — code quality
Rationale: Eliminates existing code duplication in the filter implementation
