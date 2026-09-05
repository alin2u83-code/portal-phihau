---
phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-
plan: 05
subsystem: payments
tags: [react, supabase]

requires:
  - phase: 27-01
    provides: "TipAbonament.sezon_id, hooks/useSezoane.ts"
  - phase: 27-04
    provides: "utils/abonamente.ts (consumatorul regulii populate aici)"
provides:
  - "TipuriAbonament.tsx leaga automat tipurile noi de sezonul activ"
  - "Blocare stergere pentru tipuri referite de sportivi/familii/participare_vacanta"
affects: []

tech-stack:
  added: []
  patterns:
    - "Verificare de referinte inainte de stergere: fail-closed (pe eroare, toate id-urile devin 'referite')"

key-files:
  modified:
    - components/Plati/TipuriAbonament.tsx

key-decisions:
  - "sezon_id se seteaza doar cand clubul tinta al noului tip coincide cu clubul pentru care a fost incarcat sezonul activ (effectiveClubId) — evita legarea gresita a unui tip creat de admin de federatie pentru alt club"
  - "Corectie documentata in plan fata de research: plati.tip_abonament_id exista pe DB (vezi 27-01-SUMMARY.md), dar nicio componenta din cod nu il foloseste azi — verificat prin grep, nu s-a extins garda de stergere la tabela plati"

patterns-established: []

requirements-completed: [SEZ-08, SEZ-09]

duration: ~25min
completed: 2026-09-06
---

# Phase 27 Plan 05: TipuriAbonament legat de sezon Summary

**Tipurile de abonament noi se leagă automat de sezonul activ al clubului (fără câmp în formular), fiecare rând își arată sezonul, iar ștergerea e blocată pentru tipurile încă referite de sportivi/familii/participări la vacanță.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (implementate într-un singur ciclu de editare pe fișier)
- **Files modified:** 1

## Accomplishments
- `doAdd` inserează `sezon_id` = sezonul activ doar când clubul țintă coincide cu clubul contextului activ, altfel `null`
- Etichetă de sezon pe fiecare rând (mobil + coloană nouă `Sezon` desktop) cu cele 3 ramuri: denumire / `Sezon necunoscut` / `— fără sezon (istoric)`
- Subtitlu `Sezon activ: {denumire}` / `Niciun sezon activ — tipurile noi se creează fără sezon.`
- Set de referințe (`sportivi.tip_abonament_id`, `familii.tip_abonament_id`, `participare_vacanta.tip_abonament_anterior_id`) calculat prin `Promise.all`, fail-closed pe eroare; buton de ștergere dezactivat + gardă în `confirmDelete`

## Task Commits

1. **Task 1+2 (un singur commit): legare sezon + blocare ștergere** - `cf27b90` (feat)

## Files Created/Modified
- `components/Plati/TipuriAbonament.tsx` - toate cele 2 task-uri ale planului

## Decisions Made
- Cele deja fixate în plan (regula clubTinta === effectiveClubId, fail-closed pe verificare referințe).

## Deviations from Plan

None - plan executat conform specificației. Un singur commit a acoperit ambele task-uri (editări pe același fișier, aplicate secvențial fără a separa artificial commit-urile pe blocuri de cod care s-ar fi suprapus).

## Issues Encountered
- Niciuna. Executat inline (fără subagent) — infra de worktree din mediu s-a dovedit nefuncțională în această sesiune (vezi 27-02-SUMMARY.md).

## Next Phase Readiness
- Toate cele 5 planuri ale Fazei 27 sunt complete. Fluxul end-to-end (sezon → grupe → facturare) este funcțional prin cele 5 planuri combinate.

---
*Phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-*
*Completed: 2026-09-06*
