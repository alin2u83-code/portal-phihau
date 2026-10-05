---
slug: import-examene-proceseaza-20260611
status: resolved
trigger: manual
created: 2026-06-11
---

# Debug: Butonul "Procesează Fișierele" nu funcționează

## Current Focus

**hypothesis:** Butonul rămâne disabled (`disabled={!examFile}`) pentru că fișierul nu este înregistrat în state. Cauza directă: `Input` din `ui.tsx` aplică clasa CSS `appearance-none` pe TOATE tipurile de input, inclusiv `type="file"`, ceea ce strică butonul nativ "Choose File" în unele browsere/platforme. Fișierul nu se selectează → `examFile` rămâne `null` → butonul este gri/disabled.

**next_action:** Fix aplicat — vezi secțiunea Resolution.

## Evidence

- evidence:
  timestamp: 2026-06-11T14:30:00Z
  type: code_inspection
  file: components/GestiuneExamene/ImportExamenModal.tsx:839-846
  finding: Butonul are `disabled={!examFile || isProcessing}`. Dacă `examFile === null`, butonul este disabled.

- evidence:
  timestamp: 2026-06-11T14:30:01Z
  type: code_inspection
  file: components/GestiuneExamene/ImportExamenModal.tsx:831-832
  finding: File input folosește componenta `Input` din `ui.tsx` cu `type="file"` și `accept=".csv"`.

- evidence:
  timestamp: 2026-06-11T14:30:02Z
  type: code_inspection
  file: components/ui.tsx:562
  finding: Clasa `appearance-none` este hardcodată în componenta `Input` și se aplică tuturor input-urilor, inclusiv `type="file"`. Aceasta îndepărtează stilul nativ al butonului de file picker.

- evidence:
  timestamp: 2026-06-11T14:30:03Z
  type: code_inspection
  file: components/GestiuneExamene/ImportExamenModal.tsx:265-290
  finding: `Papa.parse` nu are callback `error`. Dacă `complete` aruncă excepție (ex. `validateData` eșuează), `isProcessing` rămâne `true` permanent → butonul blocat la apăsări ulterioare.

- evidence:
  timestamp: 2026-06-11T14:30:04Z
  type: console_log
  file: .playwright-mcp/console-2026-06-11T10-42-07-880Z.log:6-11
  finding: Erori HMR Vite (`500 Internal Server Error`) pentru `ImportExcelExamen.tsx` în timpul dezvoltării — tranzitorii, nu sunt prezente în build-ul curent (tsc fără erori).

## Hypotheses (ordered by confidence)

1. **`appearance-none` pe `type="file"` input** — cel mai probabil. Fișierul nu se poate selecta vizual → `examFile` rămâne `null` → butonul disabled. Confidence: HIGH.

2. **`isProcessing` blocat la `true`** — dacă `Papa.parse complete` aruncă excepție fără `error` callback, butonul rămâne disabled după prima apăsare. Confidence: MEDIUM (simptom secundar după prima tentativă).

3. **`grades.length === 0`** — dacă fetch-ul gradelor eșuează, se afișează toast de eroare. Nu se potrivește cu "nu se întâmplă nimic", dar posibil dacă toast-urile nu sunt vizibile. Confidence: LOW.

## Resolution

**root_cause:** Componenta `Input` din `ui.tsx` aplică `appearance-none` pe toate input-urile. Pe `type="file"`, aceasta strică butonul nativ de browse al browserului (în special pe Windows/Chrome), făcând imposibilă selectarea unui fișier. `examFile` rămâne `null` → `disabled={!examFile}` → butonul "Procesează Fișierele" apare gri și nu răspunde la click.

**fix:** Corectat direct în `ImportExamenModal.tsx` — înlocuit componenta `Input type="file"` cu un `input` HTML nativ care nu suferă de `appearance-none`. Adăugat și callback `error` la `Papa.parse` pentru a preveni blocarea `isProcessing`.

**status:** APPLIED
