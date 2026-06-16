---
phase: 09-raport-financiar
reviewed: 2026-06-16T09:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - utils/exportFinanciar.ts
  - components/Plati/RaportFinanciar.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-06-16T09:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 09 adds the tab "Restanțe" to `RaportFinanciar.tsx` and introduces four export functions in `utils/exportFinanciar.ts`. The implementation is generally coherent and follows project conventions (Tailwind, internal design system, client-side filtering). However, three correctness bugs were found — two in aggregation logic and one in the date-filter path — plus five quality warnings. No new security vulnerabilities were introduced. CSV injection is properly mitigated by double-quoting all cells.

---

## Critical Issues

### CR-01: `restanteRows` aggregates `p.suma` (nominal amount) instead of `p.rest_de_plata` — overstates debt for partially-paid invoices

**File:** `components/Plati/RaportFinanciar.tsx:294`

**Issue:** The grouping loop pushes `p.suma` (the originally-billed amount) into the `sume` array. For invoices in status `'Achitat Parțial'`, `p.suma` is the full original amount while `p.rest_de_plata` (or `p.suma - p.suma_incasata`) is the actual remaining balance. The tab "Restanțe" therefore inflates the reported total for any athlete who has made a partial payment. The same inflated value is exported via `exportRestanteCSV` / `exportRestantePDF`.

The `Plata` interface does **not** carry `rest_de_plata` directly (that field lives on `IstoricPlataDetaliat`). The correct approximation using only `Plata` fields is `p.suma - (p.suma_incasata ?? 0)`, but `Plata` does not expose `suma_incasata` either. The cleanest fix is to use `istoricPlatiDetaliat` as the source for this tab (it already has `rest_de_plata`) or to add `suma_incasata` to the `Plata` type and compute the remainder.

**Fix:**
```tsx
// Option A — use IstoricPlataDetaliat (already available as prop)
const neachitate = (istoricPlatiDetaliat || []).filter(p => {
    if (p.status === 'Achitat') return false;
    // date-range filter on p.data_emitere
    ...
});
// then push p.rest_de_plata ?? p.suma_datorata instead of p.suma
byId[sid].sume.push(p.rest_de_plata ?? p.suma_datorata);
```

---

### CR-02: Date filter in `restanteRows` treats `NaN` dates as always-included — rows with corrupt `data` bypass the filter

**File:** `components/Plati/RaportFinanciar.tsx:279-285`

**Issue:** When `restanteStart` or `restanteEnd` is set and `p.data` produces `NaN` (e.g., null, empty string, unexpected format), the filter falls through to `return true` (line 280). This means invoices with an invalid or missing date are always included in the filtered result regardless of the chosen period. This is a silent correctness bug: the user believes they are viewing restanțe for a specific interval but the count and totals include undate-able rows.

```ts
const d = new Date(p.data.toString().slice(0, 10));
if (isNaN(d.getTime())) return true;   // ← bug: should be false when a filter is active
```

**Fix:**
```ts
const d = new Date(p.data.toString().slice(0, 10));
if (isNaN(d.getTime())) return false;  // exclude rows with unparseable dates when filter is active
```

---

### CR-03: `lunaCurenta` computed at render time is outside every `useMemo` — causes stale or inconsistent derived state across a session spanning midnight

**File:** `components/Plati/RaportFinanciar.tsx:166`

**Issue:** `lunaCurenta` is computed with `new Date().toISOString().slice(0, 7)` directly in the component body (outside any `useMemo`). It is then used as a dependency-value inside `raportLunarData` (line 170) and in the JSX for the Select value (line 615). However, it is **not listed as a dependency** of the `raportLunarData` useMemo (line 179), meaning if the date changes (midnight session) the memo will not re-compute and the displayed luna will be stale.

Additionally, since this value is recalculated on every render it creates a derived-value inconsistency: the value used in the Select's `value` prop (computed in JSX, line 615) can differ from the value used inside the `raportLunarData` memo's closure if a re-render races with a memo hit.

**Fix:**
```tsx
// Move into a useMemo so it participates in the dependency graph
const lunaCurenta = useMemo(() => new Date().toISOString().slice(0, 7), []);

// Add to raportLunarData's dep array
}, [selectedMonth, luniDisponibile, istoricPlatiDetaliat, lunaCurenta]);
```

---

## Warnings

### WR-01: BOM in `exportRestanteCSV` is a literal embedded character, not the `﻿` escape — inconsistent with `exportIncasariCSV`

**File:** `utils/exportFinanciar.ts:132`

**Issue:** `exportIncasariCSV` uses the explicit escape `'﻿'` (line 23), which is clear and portable across editors and source-control tools. `exportRestanteCSV` uses a literal `'﻿'` character (the invisible UTF-8 BOM rendered as a raw codepoint, line 132). Both resolve to U+FEFF at runtime (verified), so they are functionally equivalent, but the literal form is invisible in most editors, may be stripped by some linters/formatters, and is inconsistent with the established pattern in the same file.

**Fix:**
```ts
const BOM = '﻿';  // same as exportIncasariCSV
```

---

### WR-02: `URL.revokeObjectURL` is called synchronously before the browser has time to initiate the download — may fail on some browsers/environments

**File:** `utils/exportFinanciar.ts:46`, `utils/exportFinanciar.ts:154`

**Issue:** Both CSV export functions call `a.click()` then immediately `URL.revokeObjectURL(url)`. Programmatic `.click()` is asynchronous in some browsers (Safari, older Firefox): the download is scheduled but not yet started when `revokeObjectURL` is called, causing the object URL to be invalidated before the browser can fetch it. The standard fix is to revoke on a `setTimeout(0)` or to append the anchor to the DOM before clicking.

**Fix:**
```ts
a.click();
setTimeout(() => URL.revokeObjectURL(url), 100);
```

---

### WR-03: `exportRestantePDF` ignores the `clubNume` parameter for the header — always falls back to the hardcoded default in the function signature, not the passed value

**File:** `utils/exportFinanciar.ts:171`

**Issue:** `exportRestantePDF` accepts `clubNume` as a parameter with a default of `'Club QwanKiDo'`. The value is correctly used in the PDF header: `doc.text(clubNume, 14, 14)` (line 171). This part is fine. However `exportIncasariPDF` hardcodes `'Club Qwan Ki Do'` at line 67 without accepting a `clubNume` parameter at all. The two functions are inconsistent — one personalizes the club name in the export header, the other does not. When the club is "Iași" or "Brăila", the PDF for Încasări will still say "Club Qwan Ki Do".

**Fix:** Add a `clubNume` parameter to `exportIncasariPDF` and pass `clubNume` from the component:
```ts
export async function exportIncasariPDF(
    data: IstoricPlataDetaliat[],
    total: number,
    filename = 'incasari.pdf',
    titlu = 'Raport Încasări',
    clubNume = 'Club QwanKiDo',  // new param
) {
    ...
    doc.text(clubNume, 14, 14);  // line 67
```

---

### WR-04: `restanteRows` aggregation silently collapses both `sportiv_id` and `familie_id` null cases under `'__necunoscut__'` — rows from different anonymous families merge into a single line

**File:** `components/Plati/RaportFinanciar.tsx:292`

**Issue:** When a `Plata` has both `sportiv_id === null` and `familie_id === null`, the fallback key `'__necunoscut__'` is used. If there are multiple such payments (e.g., old imported data with no owner), they all aggregate into a single `RestantaRow` named `'—'`. The displayed sum is a sum over unrelated invoices that happen to be orphaned. Additionally, the same row will be rendered twice — once in the desktop table and once in the mobile card list — both sharing the same `key={r.sportiv_id}`, which equals `'__necunoscut__'`, violating React's key uniqueness requirement and causing potential reconciliation bugs.

**Fix:**
```ts
// Generate a unique key per orphaned plata instead of collapsing
const sid = p.sportiv_id ?? p.familie_id ?? `__orfan__${p.id}`;
```
Or filter orphaned payments out and surface them separately.

---

### WR-05: `raportLunarData.restante` uses `data_emitere` as the date field for month filtering but treats it as a scadentă display label — semantic mismatch

**File:** `components/Plati/RaportFinanciar.tsx:175-176`, `652-656`

**Issue:** The filter `p.data_emitere?.toString().startsWith(luna)` (line 176) selects "restanțe" for a month by matching on issue date (`data_emitere`). In the table header the column is labelled "Scadență" and the value displayed is `formatDate(p.data_emitere)` (line 656). If an invoice was issued in March but is due in May, it will appear in the March report labelled as a "scadentă" with the March date. This is semantically misleading — users expect "scadentă" to refer to when the payment is due, not when it was issued. There is no separate due-date field on `IstoricPlataDetaliat`, so the fix is to relabel the column to "Dată emitere" or to change the filter to use the correct due-date field if/when it is added.

**Fix (minimal — relabel only):**
```tsx
<th>Dată emitere</th>
// and
<td>{formatDate(p.data_emitere)}</td>  {/* already correct value, wrong label */}
```

---

## Info

### IN-01: `formatDate` and `fmtDate` are duplicate helpers across two files

**File:** `utils/exportFinanciar.ts:8-12` vs `components/Plati/RaportFinanciar.tsx:39-43`

**Issue:** Both files implement identical date-formatting logic (parse with `new Date`, guard against `NaN`, `toLocaleDateString('ro-RO')`). The only difference is the fallback sentinel: `fmtDate` returns `''`, `formatDate` returns `'—'`. This is accidental duplication. The export file cannot import from the component, but a shared utility in `utils/` (e.g., `utils/formatari.ts`) would eliminate the duplication.

**Fix:** Extract to a shared utility; pass a `fallback` parameter:
```ts
export const formatDataRO = (val?: string | null, fallback = '—') => { ... }
```

---

### IN-02: Total sum in the "Restanțe" tab is computed twice inline instead of being memoized

**File:** `components/Plati/RaportFinanciar.tsx:1012`, `1040`

**Issue:** `restanteRows.reduce((s, r) => s + r.sumaTotala, 0)` is called in two separate JSX expressions (mobile and desktop totals, lines 1012 and 1040). Both iterate the full array on every render. With 3500+ athletes this is a minor but unnecessary duplication. A single `useMemo` derived from `restanteRows` would be cleaner and consistent with how `totalIncasari` is handled.

**Fix:**
```tsx
const totalRestanteTab = useMemo(
    () => restanteRows.reduce((s, r) => s + r.sumaTotala, 0),
    [restanteRows]
);
// then use {formatSum(totalRestanteTab)} in both places
```

---

### IN-03: `SportivLink` component is defined inside the component body — recreated on every render

**File:** `components/Plati/RaportFinanciar.tsx:321-333`

**Issue:** `SportivLink` is declared as a `const` arrow function inside `RaportFinanciar`. React treats inline component definitions as new component types on each render, forcing full unmount+remount of every `SportivLink` in the list. This is a well-known React anti-pattern that also defeats React DevTools component naming.

**Fix:** Move `SportivLink` outside `RaportFinanciar` and pass `sportivi` and `onViewSportiv` as props:
```tsx
interface SportivLinkProps {
    row: IstoricPlataDetaliat;
    sportivi: Sportiv[];
    onViewSportiv?: (s: Sportiv) => void;
}
const SportivLink: React.FC<SportivLinkProps> = ({ row, sportivi, onViewSportiv }) => { ... };
```

---

_Reviewed: 2026-06-16T09:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
