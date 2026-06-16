# Phase 9: Raport Financiar - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Tab nou "Restanțe" adăugat în `RaportFinanciar.tsx` existent — tabel per-sportiv cu sumă totală datorată, număr facturi neachitate, data celei mai vechi scadențe. Filtrare pe interval `data_scadenta`. Export CSV și PDF via funcții noi în `utils/exportFinanciar.ts`.

</domain>

<decisions>
## Implementation Decisions

### Amplasare UI
- **D-01:** Tab nou `'restante'` adăugat la `activeTab` state din `RaportFinanciar.tsx` — zero rute/views noi, zero wiring AppRouter
- **D-02:** Tab apare în bara de tab-uri existentă (după taburile curente), vizibil pentru ADMIN_CLUB și SUPER_ADMIN

### Structura tabelului (FIN-01)
- **D-03:** 1 rând per sportiv cu coloane: Sportiv (nume+prenume) | Sumă Totală RON | Nr. Facturi | Cea Mai Veche Scadență
- **D-04:** Sortare default descrescător după sumă totală (cel mai mare debitor sus)
- **D-05:** Fără expandare/accordion în v1.1 — un rând plat per sportiv

### Filtrare perioadă (FIN-02)
- **D-06:** Filtrul se aplică pe `data_scadenta` a facturilor cu `status='Neachitat'`
- **D-07:** Refolosim `PeriodFilterBar` existent din `components/Plati/PeriodFilterBar.tsx` — aceeași UI ca la celelalte tab-uri

### Export (FIN-03, FIN-04)
- **D-08:** Funcții noi `exportRestanteCSV(rows, clubNume)` și `exportRestantePDF(rows, clubNume, dataGenerare)` adăugate în `utils/exportFinanciar.ts`
- **D-09:** CSV cu separator `;` compatibil Excel — coloane: Sportiv, Suma Totala (RON), Nr Facturi, Cea Mai Veche Scadenta
- **D-10:** PDF cu antet: `[ClubNume] — Raport Restanțe` + dată generare, apoi tabel jspdf-autotable (același pattern ca exportIncasariPDF)

### Claude's Discretion
- Culori/iconuri UI în tab (warning/amber pentru restanțe, consistent cu AgingReport)
- Mesaj empty state când nu există restanțe în intervalul filtrat
- Formatare sumă (2 zecimale RON, `toLocaleString('ro-RO')`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Componentă host
- `components/Plati/RaportFinanciar.tsx` — componentă în care se adaugă tab-ul; citește tab state, imports, pattern-ul de PeriodFilterBar

### Componente reutilizabile
- `components/Plati/PeriodFilterBar.tsx` — filter bar perioadă, refolosit direct pentru FIN-02
- `components/Plati/AgingReport.tsx` — pattern de calcul restanțe (logica de `zileRestanta`), dar NU se modifică
- `components/ui.tsx` — design system intern (Button, Card, Input, Select, Badge etc.)

### Export utilities
- `utils/exportFinanciar.ts` — funcții exportIncasariCSV/PDF existente; adăugăm exportRestanteCSV/PDF după același pattern
- `utils/formatareSportiv.ts` — `formatNume(sportiv)` pentru nume complet consistent

### Tipuri
- `types.ts` — interfețele `Plata`, `Sportiv` (câmpurile folosite: `sportiv_id`, `suma`, `data_scadenta`, `status`, `club_id`)

### Cerințe
- `.planning/REQUIREMENTS.md` — FIN-01..FIN-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PeriodFilterBar`: acceptă `startDate`, `endDate`, `onChange` — drop-in pentru FIN-02
- `exportIncasariCSV/exportIncasariPDF` în `utils/exportFinanciar.ts`: pattern exact de replicat pentru restanțe
- `AgingReport`: calculează `zileRestanta = differenceInDays(today, new Date(plata.data_scadenta))` — refolosim logica
- `formatNume(sportiv)` din `utils/formatareSportiv.ts`: format "PRENUME NUME" consistent
- `formatSum` local în RaportFinanciar: `(n).toLocaleString('ro-RO', {minimumFractionDigits:2}) + ' RON'`

### Established Patterns
- Tab state în RaportFinanciar e `useState<'incasari' | 'lunar' | ...>` — extindem union cu `'restante'`
- Datele `plati` vin ca prop din parent (Plati/index.tsx) — filtrul de `status='Neachitat'` se face în `useMemo`
- RLS asigurat prin header `active-role-context-id` — datele plăților sunt deja filtrate pe club

### Integration Points
- `RaportFinanciar` primește `plati: Plata[]` ca prop — suficient pentru FIN-01 (nu trebuie query nou)
- Butonul Export apare în header-ul tab-ului (pattern din tab `incasari` cu `DownloadIcon`)
- PDF folosește `jsPDF` + `jspdf-autotable` deja instalate

</code_context>

<specifics>
## Specific Ideas

- Tabelul restanțe e conceptual diferit de AgingReport (care grupează pe buckets de zile) — cele două coexistă
- Filtrul de perioadă este optional — fără filtru = toate restanțele clubului
- Sortare secundară: la sumă egală, sportivul cu scadența mai veche apare primul

</specifics>

<deferred>
## Deferred Ideas

- Expandare accordion cu facturile individuale per sportiv — v2.0
- Notificare WhatsApp/email din interfața de raport restanțe — v2.0
- Sold pozitiv (avansuri) în același ecran — out of scope v1.1

</deferred>

---

*Phase: 9-raport-financiar*
*Context gathered: 2026-06-16*
