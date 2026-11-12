---
phase: "04-stagii-completare"
plan: "03"
subsystem: "stagii/participanti-raport"
tags: [react, typescript, stagii, csv, permisiuni, usememo]
dependency_graph:
  requires:
    - "04-01 — types.ts cu Plata.eveniment_id și Rezultat.created_at"
    - "04-02 — calculeazaCategorieStagiu + getTaxaStagiu + handleAddParticipant cu eveniment_id"
  provides:
    - "components/Competitii/StagiiCompetitii.tsx — platiParticipanti useMemo cu fallback eveniment_id null"
    - "components/Competitii/StagiiCompetitii.tsx — randuriiParticipanti useMemo (sportiv + data + categorie + taxa + status)"
    - "components/Competitii/StagiiCompetitii.tsx — secțiune Raport Participanți cu tabel 5 coloane"
    - "components/Competitii/StagiiCompetitii.tsx — exportParticipantiCSV cu Blob download"
  affects:
    - "EvenimentDetail — vizualizare completă status plăți per participant"
tech_stack:
  added: []
  patterns:
    - "useMemo Map<string, Plata> pentru join eficient sportiv→plată"
    - "Blob + URL.createObjectURL pentru CSV download fără librărie externă"
    - "Guard permissions.isAdminClub pe secțiunea raport — date financiare vizibile doar adminilor"
    - "Fallback join pe sportiv_id + tip='Taxa Stagiu' pentru plăți premerge fix-ului eveniment_id"
key_files:
  created: []
  modified:
    - "components/Competitii/StagiiCompetitii.tsx"
decisions:
  - "platiParticipanti: fallback eveniment_id==null acceptat (T-04-07) — risc scăzut documentat în threat model"
  - "CSV construit manual fără PapaParse — 5 coloane fixe, fără caractere speciale complexe"
  - "randuriiParticipanti derivat din rezultate deja filtrate pe eveniment.id — nu se adaugă al doilea filtru"
  - "exportParticipantiCSV funcție în closure — citește randuriiParticipanti direct, nu parametri"
metrics:
  duration: "12 minute"
  completed: "2026-06-05"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 1
status: "complete"
---

# Phase 04 Plan 03: Tabel Participanți + Export CSV — Raport Stagiu

**One-liner:** useMemo join plăți-participanți cu fallback + tabel 5 coloane colorat (status plată) + export CSV Blob în EvenimentDetail, condiționat de isAdminClub.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Tabel Participanți cu status plată în EvenimentDetail | `46be7a0` | `components/Competitii/StagiiCompetitii.tsx` |
| 2 | Export CSV participanți cu Blob download | `46be7a0` | `components/Competitii/StagiiCompetitii.tsx` |
| 3 (checkpoint) | Verificare vizuală — APROBAT de utilizator | — | — |

## What Was Built

### Task 1: platiParticipanti + randuriiParticipanti + Tabel JSX

**useMemo platiParticipanti** (Map<string, Plata>):
```typescript
filteredData.plati
  .filter(p =>
    p.tip === 'Taxa Stagiu' &&
    (p.eveniment_id === eveniment.id ||
      (p.eveniment_id == null && rezultate.some(r => r.sportiv_id === p.sportiv_id)))
  )
  .forEach(p => { if (p.sportiv_id) map.set(p.sportiv_id, p); });
```
- Fallback pentru plăți cu `eveniment_id = NULL` (generate înainte de fix-ul din 04-02)
- Eficient: O(n) build, O(1) lookup per rând

**useMemo randuriiParticipanti** — derivat din `rezultate` (deja filtrate pe `eveniment.id`):
- `dataInscriere`: `r.created_at` formatat cu `toLocaleDateString('ro-RO')` sau `'-'`
- `categorie`: apelează `calculeazaCategorieStagiu` din 04-02 → string afișabil ('Copii (7-12 ani)' / 'Grade (13+)' / 'Centuri Negre')
- `taxa`: `platiParticipanti.get(sportiv_id)?.suma ?? null`
- `statusPlata`: `platiParticipanti.get(sportiv_id)?.status ?? 'Fără plată'`

**Secțiune JSX "Raport Participanți"** — condiționat pe `permissions.isAdminClub && rezultate.length > 0`:
- Tabel 5 coloane: Sportiv | Data Înscrierii | Categorie | Taxă (lei) | Status Plată
- Status colorat: verde (`text-green-400`) = Achitat, roșu (`text-red-400`) = Neachitat, amber (`text-amber-400`) = Achitat Parțial, slate-500 = Fără plată
- Inserată DUPĂ lista participanți existentă și ÎNAINTE de formularul "Înscrie Participant"

### Task 2: exportParticipantiCSV

Funcție în closure `EvenimentDetail`, citește `randuriiParticipanti` direct:
```typescript
const exportParticipantiCSV = () => {
    const header = 'Sportiv,Data Inscrierii,Categorie,Taxa (lei),Status Plata';
    const rows = randuriiParticipanti.map(rand => ...);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    // URL.createObjectURL → a.click() → URL.revokeObjectURL
};
```
- Filename: `participanti_{denumire}_{data}.csv`
- Butonul "Export CSV" apelează direct funcția prin `onClick={exportParticipantiCSV}`

## Verification Results

1. `grep -n "exportParticipantiCSV" StagiiCompetitii.tsx` → linia 383 (definiție) + linia 424 (apel button)
2. `grep -n "isAdminClub" StagiiCompetitii.tsx` → linia 418 (guard raport) + linia 465 (guard form înscriere)
3. `grep -n "platiParticipanti\|randuriiParticipanti" StagiiCompetitii.tsx` → 6 matches (2 definiții useMemo + 4 utilizări)
4. `npx tsc --noEmit` → **0 erori**

## Checkpoint Verificat

**Checkpoint 3 (visual verification)** — APROBAT de utilizator ("aprobat").

Verificări confirmate:
- Admin vede "Raport Participanți" cu tabel colorat (Achitat=verde, Neachitat=roșu)
- Export CSV descarcă fișier valid cu header corect
- Guard permisiune `isAdminClub` funcționează corect

## Deviations from Plan

### Context: TDD flag fără infrastructură de testare

**Found during:** Task 1 (tdd="true")
**Issue:** Proiectul nu are niciun framework de testare (nu jest, nu vitest, nu @testing-library în package.json, niciun director `__tests__/`).
**Fix:** S-a procedat direct cu implementarea. Verificarea automată `npx tsc --noEmit` servește ca check de compilare. Comportamentele din `<behavior>` sunt acoperite prin verificarea vizuală din checkpoint.
**Classification:** Comportament intenționat al proiectului — nu o deviere funcțională.

## Known Stubs

Niciun stub prezent. Datele din tabel vin din `filteredData.plati` și `filteredData.rezultate` — surse reale, nu mock-uri.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-04-06 mitigated | StagiiCompetitii.tsx | Guard `permissions.isAdminClub` pe secțiunea tabel și butonul Export CSV — datele financiare nu sunt vizibile instructorilor |
| threat_flag: T-04-07 accepted | StagiiCompetitii.tsx | Fallback join pe sportiv_id+tip='Taxa Stagiu' poate asocia plată greșită dacă sportivul are 2 stagii în aceeași zi — risc scăzut, documentat |

## Self-Check: PASSED

- [x] `components/Competitii/StagiiCompetitii.tsx` modificat cu toate adăugirile planificate
- [x] `46be7a0` — commit există în git log
- [x] `exportParticipantiCSV` definită la linia 383 și apelată la linia 424
- [x] `platiParticipanti` useMemo definit la linia 348
- [x] `randuriiParticipanti` useMemo definit la linia 361
- [x] Guard `permissions.isAdminClub` pe secțiunea raport (linia 418)
- [x] TypeScript compilation: 0 erori
- [x] Tabel 5 coloane prezent în JSX cu colorare status plată
