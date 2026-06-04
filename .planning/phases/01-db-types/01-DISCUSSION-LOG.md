# Phase 1: DB & Types - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 01-db-types
**Areas discussed:** Status antrenament

---

## Status antrenament

| Option | Description | Selected |
|--------|-------------|----------|
| planificat / anulat (MVP) | 2 valori — suficient pentru calendar Phase 3 | |
| planificat / anulat / efectuat | 3 valori — permite cuplare viitoare cu Prezența | ✓ |
| Păstrează ce există în DB | TEXT fără constraint, adaugă doar motiv_anulare | |

**User's choice:** planificat / anulat / efectuat
**Notes:** Ales pentru extensibilitate — dacă se cuplează cu modulul Prezență în viitor, statutul `efectuat` va fi necesar fără migrație suplimentară.

---

## Claude's Discretion

- `motiv_anulare TEXT` nullable (NULL = nespecificat) — standard SQL, nicio preferință exprimată
- `tipuri_stagii.pret NUMERIC(10,2)` nullable — fallback la taxa globală dacă NULL
- CHECK constraint format pentru status — standard Supabase/PostgreSQL
- TypeScript union type pentru status — `'planificat' | 'anulat' | 'efectuat'`

## Deferred Ideas

- Preț per-club per tip stagiu (tabel `preturi_stagii`) — mai complex, nevalidat pentru MVP
- UI editare `tipuri_stagii.pret` în TipuriStagiiAdmin — Phase 4
