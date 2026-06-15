---
phase: "03-calendar-crud-antrenamente"
plan: "01"
subsystem: "Grupe / Antrenamente"
tags: [calendar, antrenamente, crud, grupe, supabase]

dependency_graph:
  requires:
    - "hooks/useCalendarView.ts (fetch lunar, handleSaveCustom, state)"
    - "components/ui.tsx (Modal, Button, ConfirmButton, Badge, Input, Card)"
    - "components/icons.tsx (ChevronLeft/Right, Plus, XCircle, Trash, CheckCircle)"
    - "utils/date.ts (formatTime)"
    - "types.ts (Antrenament, GrupaType, ProgramItem)"
    - "supabaseClient.ts (RLS via active-role-context-id header)"
  provides:
    - "TabAntrenamente funcțional cu calendar lunar, DayPanel, CRUD complet"
    - "Buton Adaugă Antrenament în header GrupaDetailView (conditionat pe activeTab)"
  affects:
    - "components/Grupe/GrupaDetailView.tsx"

tech_stack:
  added: []
  patterns:
    - "getCalendarCells(year, month) — grid lunar cu offset Luni-first (getDay()+6)%7"
    - "antrenamenteByDate useMemo — Record<string, Antrenament[]> grupat pe câmpul data"
    - "statusVariant helper — mapare status → Badge variant (green/red/amber/slate)"
    - "navigateMonth + setSelectedDate(null) — reset panel la schimbarea lunii (Pitfall 4)"
    - "handleAnulare/handleReactivare/handleStergere local în TabAntrenamente (D-13)"
    - "motiv.trim() || null — NULL în loc de string gol (Pitfall 5)"
    - "handleSaveCustom cu grupa.club_id ca al doilea param (Pitfall 6)"
    - "isModalAdaugareOpen ridicat în GrupaDetailView (state lifting pentru buton header)"

key_files:
  created: []
  modified:
    - path: "components/Grupe/GrupaDetailView.tsx"
      changes: "TabAntrenamente rescris de la placeholder la implementare completă (412 linii adăugate, 21 șterse)"

decisions:
  - "D-13 rezolvat: handleAnulare/handleReactivare/handleStergere definite local în TabAntrenamente (nu extins hook)"
  - "State isModalAdaugareOpen ridicat în GrupaDetailView pentru butonul din header (D-09)"
  - "Cele 3 taskuri implementate într-o singură scriere atomică — toate sunt în același fișier și inter-dependente structural"

metrics:
  duration: "~18 minute"
  completed: "2026-06-15"
  tasks_completed: 3
  tasks_total: 4
  files_modified: 1
---

# Phase 03 Plan 01: Calendar CRUD Antrenamente Summary

**One-liner:** Calendar lunar Tailwind cu dot-uri colorate, DayPanel cu CRUD complet (anulare/reactivare/ștergere + modal adăugare one-off), integrat în TabAntrenamente din GrupaDetailView.

---

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | CalendarGrid lunar cu dot-uri + navigare lună (CAL-01) | 02d3e16 | Done |
| 2 | DayPanel + CRUD anulare/reactivare/ștergere + ModalAnulare (CAL-02, CAL-03) | 02d3e16 | Done |
| 3 | ModalAdaugare one-off + buton header Adaugă Antrenament (CAL-04) | 02d3e16 | Done |
| 4 | Verificare vizuală end-to-end | — | Checkpoint |

*Notă: Toate cele 3 taskuri auto sunt în același fișier și au fost implementate atomic într-un singur commit (02d3e16).*

---

## What Was Built

### CalendarGrid (Task 1 — CAL-01)

Funcția pură `getCalendarCells(year, month)` calculează offset-ul primei zile cu formula Luni-first `(getDay() + 6) % 7` și returnează `(string | null)[]` cu datele YYYY-MM-DD construite cu `padStart` (fără `toISOString` — Pitfall 2). Constanta `LUNI_RO` cu 12 luni în română. `antrenamenteByDate` cu `useMemo`. Header cu `ChevronLeftIcon`/`ChevronRightIcon`, titlu `${LUNI_RO[currentMonth]} ${currentYear}`. Navigare `navigateMonth(direction)` cu `setSelectedDate(null)` la schimbarea lunii (Pitfall 4). Dot-uri `bg-emerald-400` / `bg-rose-400`, highlight azi cu `ring-indigo-400`, selectat cu `bg-indigo-600/30 ring-indigo-500`.

### DayPanel (Task 2 — CAL-02, CAL-03)

Panel fix sub grid cu 3 stări: selectedDate null → mesaj invite, ziua goală → empty state cu buton Adaugă, zile cu antrenamente → rânduri compacte. Funcții locale: `handleAnulare`, `handleReactivare`, `handleStergere` — toate apelează direct `fetchAntrenamente()` după mutație (fără `invalidateQueries(['grupe'])`). Modal anulare cu textarea `resize-none`, `motiv.trim() || null` (Pitfall 5). `ConfirmButton` cu `aria-label="Șterge antrenament"` pentru accesibilitate.

### ModalAdaugare + Buton Header (Task 3 — CAL-04)

`isModalAdaugareOpen` ridicat în `GrupaDetailView` (state lifting — Critical Decision 2). `useEffect` re-sincronizează `formData.data` cu `selectedDate` la deschiderea modalului. `handleSubmitAdaugare` apelează `handleSaveCustom({..., is_recurent: false}, grupa.club_id ?? undefined)` (Pitfall 6). Buton "Adaugă Antrenament" în header conditionat `{activeTab === 'antrenamente' && <Button ...>}`.

---

## Verification Results

```
npm run lint (tsc --noEmit): PASS — zero erori noi
```

### Acceptance Criteria Checks

| Criteriu | Status |
|---------|--------|
| `getCalendarCells` prezent | PASS |
| `(getDay() + 6) % 7` offset Luni-first | PASS |
| `bg-emerald-400` și `bg-rose-400` dots | PASS |
| `LUNI_RO` cu 12 luni | PASS |
| `setSelectedDate(null)` în navigateMonth | PASS |
| `useCalendarView(grupa.id)` hook reutilizat | PASS |
| `ring-indigo-400` (today) și `ring-indigo-500` (selected) | PASS |
| Zero `toISOString()` în logica calendar | PASS |
| `program_antrenamente.update` prezent (anulare + reactivare) | PASS |
| `program_antrenamente.delete` prezent | PASS |
| `motivAnulare.trim() || null` Pitfall 5 | PASS |
| `fetchAntrenamente()` în ≥3 locuri | PASS |
| Zero `invalidateQueries` pentru antrenamente | PASS |
| `ConfirmButton` cu `onConfirm` handleStergere | PASS |
| `Reactivează` conditionat de `status === 'anulat'` | PASS |
| `aria-label="Șterge antrenament"` | PASS |
| `is_recurent: false` în handleSaveCustom | PASS |
| `grupa.club_id` ca al doilea param Pitfall 6 | PASS |
| `activeTab === 'antrenamente'` buton header | PASS |
| `Salvează Antrenament` text submit modal | PASS |
| `type="date"` și `type="time"` în ModalAdaugare | PASS |
| `isModalAdaugareOpen` declarat O singură dată (în GrupaDetailView) | PASS |
| `useEffect` re-sync formData.data cu selectedDate | PASS |

---

## Deviations from Plan

None — plan executed exactly as written.

*Observație: Cele 3 taskuri auto au fost implementate atomic într-un singur commit (structura fișierului impunea scrierea completă). Funcționalitatea este identică cu cea specificată per-task.*

---

## Known Stubs

None — toate câmpurile sunt conectate la Supabase via `useCalendarView` și mutații directe.

---

## Threat Surface Scan

Fișierul modificat: `components/Grupe/GrupaDetailView.tsx`

- T-03-01 (Tampering UPDATE/DELETE cross-club): Mitigat — mutațiile folosesc `supabase` client standard care injectează automat `active-role-context-id` header; RLS filtrează pe club.
- T-03-02 (INSERT cu club_id greșit): Mitigat — `handleSaveCustom` apelat cu `grupa.club_id ?? undefined` (Pitfall 6 respectat).
- T-03-03 (XSS motiv_anulare): Mitigat — `motivAnulare` randat în JSX standard (nu `dangerouslySetInnerHTML`).
- T-03-04 (fetch cross-club): Mitigat — `useCalendarView` filtrează `.eq('grupa_id', grupaId)` + RLS.

Niciun threat flag nou față de planul inițial.

---

## Self-Check

### Files exist:
- `components/Grupe/GrupaDetailView.tsx` — FOUND (modificat)

### Commits exist:
- `02d3e16` — feat(03-01): implement TabAntrenamente calendar lunar cu CRUD complet — FOUND

## Self-Check: PASSED
