---
phase: quick/260901-nvc
plan: 01
subsystem: Competitii
tags: [raport, financiar, competitii, taxe]
dependency-graph:
  requires: [utils/taxeCompetitie.ts calculeazaTaxaIndividuala/calculeazaTaxaEchipa]
  provides: [construiesteRanduriPlata(), sectiune "Situatie plata" in RaportInscrieri]
  affects: [components/Competitii/RaportInscrieri.tsx]
tech-stack:
  added: []
  patterns: ["funcție pură de agregare financiară reutilizabilă", "un rând per echipă (nu per membru) pentru evitarea dublării taxei"]
key-files:
  created: []
  modified:
    - utils/taxeCompetitie.ts
    - components/Competitii/RaportInscrieri.tsx
decisions:
  - "Rânduri de plată construite separat de raportul per-sportiv existent (care iterează echipa_sportivi per membru) — altfel taxa de echipă s-ar fi numărat de 2-5 ori"
  - "Două seturi de rânduri scopate pe club: filteredIns/filteredEc (respectă bara de filtre) și insClub/ecClub (doar scoping club, fără filtru categorie) — pentru totalul cumulativ real afișat separat când filtrele sunt active"
  - "FinanciarView.tsx, Pas4Sumar.tsx și Competitii/index.tsx neatinse — zero risc de regresie pe fluxurile lor existente"
metrics:
  duration: ~25min
  completed: 2026-09-01
---

# Quick Task 260901-nvc: Raport plată competiții club — sumă cumulativă Summary

Tab-ul „Raport" din modulul Competiții afișează acum o secțiune „Situație plată" cu total/achitat/restant cumulativ real (din DB, nu din state-ul wizardului) + tabel detaliat + footer TOTAL, pentru clubul curent la competiția selectată.

## What Was Built

- **`utils/taxeCompetitie.ts`** — funcție pură nouă `construiesteRanduriPlata(competitie, categorii, probe, inscrieri, echipe): SituatiePlataCompetitie`, plus tipurile exportate `RandPlataCompetitie` și `SituatiePlataCompetitie`. Agregă rânduri de plată (un rând per înscriere individuală, EXACT un rând per echipă — nu per membru), sare peste rândurile cu status `retras`/`retrasa`, calculează `totalCalculat`/`totalAchitat`/`totalRestant`/`nrIndividuale`/`nrEchipe`. `calculeazaTaxaIndividuala` și `calculeazaTaxaEchipa` rămân neschimbate.
- **`components/Competitii/RaportInscrieri.tsx`** — secțiune nouă „Situație plată" randată între `CompetitieFilterBar` și lista existentă per sportiv:
  - Sumar: Total / Achitat / Restant (calculat din `plataFiltrata`, care respectă bara de filtre)
  - Când sunt filtre active: rând secundar „Total competiție (fără filtre): {plataTotala.totalCalculat} lei" — `plataTotala` e calculat din rânduri scopate DOAR pe club, fără filtrul de categorie, deci rămâne suma cumulativă completă
  - Tabel responsive (`overflow-x-auto`, `min-w-[560px]`) cu coloane Participant (badge IND/ECH) | Club (doar super admin) | Categorie | Probă (+ tip probă) | Status plată (pill Achitat/Neachitat) | Sumă
  - Footer `TOTAL` cu `colSpan` adaptat prezenței coloanei Club
  - Componenta rămâne strict read-only — zero apeluri `supabase`, zero mutații `taxa_achitata` (editarea rămâne exclusiv în `FinanciarView.tsx`)
  - Guard listă goală actualizat: `if (raport.length === 0 && plataFiltrata.randuri.length === 0)` — o competiție cu doar echipe (fără membri joinați în props) tot afișează secțiunea financiară

Props/semnătura `RaportInscrieriProps` neschimbate — `components/Competitii/index.tsx` nu a fost atins. `FinanciarView.tsx` și `Pas4Sumar.tsx` neatinse.

## Deviations from Plan

None — plan executat exact cum a fost scris, inclusiv gate-urile grep structurale (verificate mai jos).

## Verification Performed (Automated)

- `npx tsc --noEmit` — trece fără erori, rulat de 2 ori (după fiecare task).
- Gate Task 1: `construiesteRanduriPlata` exportat exact o dată, zero referințe `echipa_sportivi`/`supabase`/`import React` în `utils/taxeCompetitie.ts` — GATE_OK.
- Gate Task 2: `construiesteRanduriPlata` apare de 3 ori (import + 2 apeluri) în `RaportInscrieri.tsx`, zero `supabase`/`taxa_achitata:` (mutație), `plataTotala` prezent, `Pas4Sumar.tsx`/`FinanciarView.tsx`/`Competitii/index.tsx` neatinse — GATE_OK.
- `git diff --name-only HEAD~2 HEAD` == exact `components/Competitii/RaportInscrieri.tsx` + `utils/taxeCompetitie.ts`.
- `npm run dev` pornit local (Vite 5.4.21, port de test 5199) — a pornit fără erori de compilare ("ready in 842 ms", niciun overlay de eroare în log).

## Known Stubs

None.

## Threat Flags

None — planul avea deja `<threat_model>` complet (T-nvc-01/02/03) cu mitigări implementate:
- T-nvc-01 (Information Disclosure): `filteredIns`/`filteredEc`/`insClub`/`ecClub` toate scopate pe `(isAdmin || club_id === myClubId)` înainte de a intra în `construiesteRanduriPlata`.
- T-nvc-02 (Tampering): zero apeluri `supabase` în `RaportInscrieri.tsx`, verificat prin gate grep automat.
- T-nvc-03 (date incorecte — dublare taxă echipă): gate grep `echipa_sportivi == 0` în `utils/taxeCompetitie.ts` + comentariu explicit deasupra funcției.

## Pending Manual Verification (Task 3 — checkpoint:human-verify)

Task 3 din plan este `checkpoint:human-verify` (browser vizual). Nu a fost disponibil un om interactiv în această rulare — dispatch-ul a fost configurat explicit să NU blocheze indefinit pe acest checkpoint. Verificarea automată posibilă (tsc, gate-uri grep, pornire `npm run dev`) a fost făcută mai sus și a trecut. **Rămâne de verificat manual în browser de către utilizator, înainte de a considera task-ul complet aprobat:**

1. `npm run dev`, autentificare ca ADMIN_CLUB la un club cu înscrieri reale (ex. competiția CN QKD Juniori1/Seniori/Veterani sau „Cupa").
2. Competiții → deschide competiția → tab **Raport**.
3. Confirmă apariția secțiunii „Situație plată" cu Total / Achitat / Restant și tabelul detaliat.
4. **Verificare cheie (dublare taxă echipă):** dacă clubul are cel puțin o echipă înscrisă, confirmă că echipa apare pe UN SINGUR rând (badge ECH), nu câte un rând per membru, și că taxa ei apare o singură dată în total.
5. **Reconciliere cu Financiar:** compară `Total` din Raport cu tab-ul admin **Financiar** (necesită acces super admin) — totalul clubului trebuie să fie identic cu `totalCalculat` afișat acolo pentru același club.
6. Aplică un filtru (gen sau probă): tabelul și `Total` se restrâng, iar rândul „Total competiție (fără filtre)" apare și rămâne la suma completă.
7. Verifică pe mobil (DevTools ~390px lățime): tabelul are scroll orizontal, nu sparge layoutul.
8. Ca ADMIN_CLUB, confirmă că NU apar rânduri ale altor cluburi.
9. Apasă „Imprimă" — noua secțiune apare în previzualizarea de print.

**Status: NEVERIFICAT VIZUAL** — cod complet și verificat static/automat, dar pasul 4 (verificare cheie anti-dublare) și pasul 5 (reconciliere cu Financiar) necesită confirmare umană directă în browser cu date reale înainte ca acest quick task să fie marcat "Verified" în STATE.md.

## Self-Check: PASSED

- FOUND: `utils/taxeCompetitie.ts` (modificat, commit 94218eb)
- FOUND: `components/Competitii/RaportInscrieri.tsx` (modificat, commit 8b97c36)
- FOUND commit 94218eb (`git log --oneline` confirmă)
- FOUND commit 8b97c36 (`git log --oneline` confirmă)
