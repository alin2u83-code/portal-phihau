---
phase: quick-260704-nbx
plan: 01
subsystem: Competitii / InscriereClubWizard
tags: [bugfix, react-state, competitii, inscriere-club]
dependency-graph:
  requires: []
  provides: [onEchipeRefresh]
  affects:
    - components/Competitii/index.tsx
    - components/Competitii/InscriereClubWizard/types.ts
    - components/Competitii/InscriereClubWizard/index.tsx
    - components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
tech-stack:
  added: []
  patterns:
    - "Refresh silențios (fetchDataSilent) firelat prin prop opțional în loc de callback care închide wizard-ul (onSaved)"
key-files:
  created: []
  modified:
    - components/Competitii/index.tsx
    - components/Competitii/InscriereClubWizard/types.ts
    - components/Competitii/InscriereClubWizard/index.tsx
    - components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
decisions:
  - "Nu s-a refolosit onSaved (închide wizard-ul prin setWizardOpen(false)) — s-a adăugat un prop nou dedicat onEchipeRefresh"
  - "Zero query-uri Supabase noi — refolosire completă a fetchDataSilent existent"
metrics:
  duration: "~15 min"
  completed: "2026-07-04"
---

# Quick Task 260704-nbx: Fix status stale hub Înscriere club Summary

Firul callback-ului de refresh silențios (`fetchDataSilent`) până în Pas3Echipe, apelat la retragere/reset echipă, astfel încât contorul hub-ului "Înscriere club" (Competiții) nu mai rămâne stale după retragerea unei echipe.

## Ce s-a implementat

**Cauza bugului:** `InscriereClubCards.calculeazaStatusCard` citește prop-ul `echipe` de nivel competiție pentru contorul probelor echipă/pereche (`song_luyen`/`sincron`). La salvarea unei echipe, `InscriereModal.onSaved()` declanșează `fetchDataSilent()` în parent, care reîmprospătează `echipe` fără să remonteze wizard-ul. La retragere însă, `Pas3Echipe.handleNuParticipaEchipa` scria direct în DB (`status='retrasa'`) fără să declanșeze niciun refresh al prop-ului `echipe` de nivel competiție — hub-ul rămânea cu valoarea veche (ex. "1/12" în loc de "0/12") până la apăsarea manuală a butonului Refresh al competiției.

**Fix (Task 1):**

1. `components/Competitii/InscriereClubWizard/types.ts` — adăugat prop opțional `onEchipeRefresh?: () => void;` în `InscriereClubWizardProps`, cu comentariu explicativ.
2. `components/Competitii/index.tsx` — cablat `onEchipeRefresh={fetchDataSilent}` la `<InscriereClubWizard>` (linia ~465), fără a atinge `onSaved` existent.
3. `components/Competitii/InscriereClubWizard/index.tsx` — destructurat `onEchipeRefresh` din props și propagat mai departe la `<Pas3FormareEchipe onEchipeRefresh={onEchipeRefresh} ...>`.
4. `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx`:
   - Adăugat `onEchipeRefresh?: () => void;` în `Pas3Props` și destructurat în semnătura componentei.
   - În `handleNuParticipaEchipa`, apelat `onEchipeRefresh?.()` imediat după `setEchipeRetraseLocal(...)`, DOAR în ramura unde update-ul DB `status='retrasa'` a reușit (nu rulează dacă `error` face `return` mai devreme).
   - La butonul "← Participăm" (reset), extins handler-ul inline la `() => { onToggleSkipCategorie(cat.id); onEchipeRefresh?.(); }`.

Toate propurile noi sunt opționale (`?`) — API-ul componentelor rămâne compatibil retroactiv cu alți consumatori.

## Verificare automată efectuată

- `npx tsc --noEmit` — trece fără erori (rulat după toate modificările).
- Confirmare vizuală a codului: `onSaved` neatins, `fetchDataSilent` neschimbat, zero query-uri Supabase noi adăugate.

## Verificare umană — PASSED (2026-07-04, Playwright pe localhost:5173)

**Task 2 (checkpoint:human-verify) executat via test Playwright** (ADMIN_CLUB, competiția "Cupa" CN Tehnica, categoria "11-12 ani / Mixt / Sincron / CV - CV 4 Cap Alb"):

1. ✅ Echipă salvată (3/3, LEOHCHI/POPA/ANDRICIUC) → hub "1/12 completate" (non-regresie salvare→hub OK).
2. ✅ "🚫 Nu participăm la această categorie" (retrage) → "← Participăm" (reset) → detaliu "0/12 categorii configurate"; wizard-ul NU s-a închis/remontat.
3. ✅ "Înapoi la probe" → hub arată **"0/12 completate" IMEDIAT, fără Refresh manual** — bug-ul stale nu se mai reproduce.
4. ✅ Zero erori JS în consolă pe tot fluxul.
5. ✅ Date de test curățate: Înscrieri (0), Sincron 0/12.

Screenshot: `verify-fix-stale-hub-0of12-no-refresh.png` (rădăcina repo).

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `a700a79`: fix(quick-260704-nbx-01): refresh silențios hub la retragere/reset echipă

## Self-Check: PASSED

- FOUND: components/Competitii/index.tsx (onEchipeRefresh cablat la fetchDataSilent)
- FOUND: components/Competitii/InscriereClubWizard/types.ts (prop onEchipeRefresh)
- FOUND: components/Competitii/InscriereClubWizard/index.tsx (propagare la Pas3FormareEchipe)
- FOUND: components/Competitii/InscriereClubWizard/Pas3Echipe.tsx (apel în handleNuParticipaEchipa + buton "← Participăm")
- FOUND commit: a700a79
