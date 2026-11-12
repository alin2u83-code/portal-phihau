# Phase 1: DB & Types - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrații SQL + update TypeScript types — schema completă pentru noile feature-uri. Livreaza: coloana `motiv_anulare` pe `program_antrenamente`, verificarea/crearea constraint `status` cu 3 valori, coloana `pret` pe `tipuri_stagii`, și update `Antrenament` interface în `types.ts`. Zero logică UI sau business logic în această fază.

</domain>

<decisions>
## Implementation Decisions

### Status antrenament
- **D-01:** `program_antrenamente.status` va folosi CHECK constraint cu 3 valori: `'planificat' | 'anulat' | 'efectuat'`
- **D-02:** `DEFAULT 'planificat'` pe coloana `status` — rows existente primesc valoarea implicită
- **D-03:** Dacă `status` există deja ca TEXT fără constraint, adaugă `ALTER TABLE ... ADD CONSTRAINT`; dacă nu există, creează coloana

### Motiv anulare
- **D-04:** `motiv_anulare TEXT` nullable pe `program_antrenamente` — NULL înseamnă nespecificat sau neaplicabil
- **D-05:** Nu există valoare implicită — NULL explicit

### Preț tip stagiu
- **D-06:** Coloana `pret NUMERIC(10,2)` nullable pe `tipuri_stagii` — preț global per tip stagiu, același pentru toate cluburile
- **D-07:** NULL = tip fără preț configurat → fallback la taxa globală din `preturiConfig` (comportament existent nemodificat)

### TypeScript types
- **D-08:** `Antrenament` interface în `types.ts` primește câmpurile: `status?: 'planificat' | 'anulat' | 'efectuat'` și `motiv_anulare?: string | null`
- **D-09:** `TipStagiu` interface (sau tipul existent) primește câmpul `pret?: number | null`
- **D-10:** Nu se creează fișiere de tipuri separate — tot în `types.ts` (convention existentă)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema DB
- `docs/baza-de-date.md` — schema completă tabele, convenții, relații
- `.planning/PROJECT.md` — requirements validate și active pentru Phase 1

### Cod existent relevant
- `components/Grupe/GenerareAntrenamenteModal.tsx` — folosește `status: 'planificat'` la insert în `program_antrenamente`
- `components/Competitii/StagiiCompetitii.tsx` — citește `tipuri_stagii` (doar `cod` și `denumire` acum); inserează în `plati` cu prețul din `getPretValabil(preturiConfig, 'Taxa Stagiu', ...)`
- `components/Competitii/TipuriStagiiAdmin.tsx` — componenta admin pentru editare nomenclator `tipuri_stagii`
- `types.ts` — interfața `Antrenament` la linia ~335; `TipStagiuOpt` local în StagiiCompetitii (nu în types.ts)

### Migrații SQL
- `sql/migrations/` — directorul unde se scriu fișierele de migrație (aplicate manual în Supabase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/Competitii/TipuriStagiiAdmin.tsx` — admin UI pentru `tipuri_stagii`; va trebui extins să afișeze/editeze `pret` (Phase 4, nu Phase 1)
- Pattern `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — sigur pentru coloane noi

### Established Patterns
- Migrații SQL plain — fișiere `.sql` în `sql/migrations/`, aplicate manual în Supabase Studio sau CLI
- TypeScript strict mode dezactivat — tipuri opționale (`?:`) acceptate fără probleme
- Toate tipurile în `types.ts` — nu se creează fișiere separate

### Integration Points
- `program_antrenamente.status` — GenerareAntrenamenteModal (scrie), viitoarea componentă AnulareModal (va scrie `anulat` + `motiv_anulare`)
- `tipuri_stagii.pret` — StagiiCompetitii.tsx Phase 4 va citi acest câmp la select tip stagiu

</code_context>

<specifics>
## Specific Ideas

- Status enum cu 3 valori (nu 2) ales explicit de user — permite cuplare viitoare cu modulul Prezență
- `tipuri_stagii.pret` e global (aceeași sumă la toate cluburile) — editabil doar prin TipuriStagiiAdmin, restricționat la SUPER_ADMIN_FEDERATIE prin RLS existent

</specifics>

<deferred>
## Deferred Ideas

- Preț per-club per tip stagiu (tabel separat `preturi_stagii`) — mai complex, nevalidat necesar pentru MVP
- UI pentru editarea `tipuri_stagii.pret` în TipuriStagiiAdmin — Phase 4

</deferred>

---

*Phase: 1-db-types*
*Context gathered: 2026-06-04*
