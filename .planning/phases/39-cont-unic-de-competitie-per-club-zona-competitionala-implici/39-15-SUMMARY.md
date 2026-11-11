---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 15
subsystem: acces-extern / conturi cluburi
tags: [management, cont-club, rls, owner-only]
requires: [39-12, 39-13 (RPC-uri, migrare 20261111e neaplicata la momentul executiei)]
provides:
  - "services/accesExternService.ts: RolManagementAcordabil, incarcaManagementConturi, acordaManagementContClub, revocaManagementContClub"
  - "Comutator Acordă/Retrage management pe cardul clubului (doar proprietar)"
  - "schimbaEmailContClub muta managementul pe noua identitate"
key-files:
  modified:
    - services/accesExternService.ts
    - components/ConturiCluburiProprietar.tsx
    - api/_contCompetitieClub.ts
    - docs/roluri-permisiuni.md
decisions:
  - "Randul de rol nou la mutare e copiat din randul vechi (rol_id, nume_utilizator_cache) in loc de lookup in roluri"
  - "avertisment endpoint devine lista separata prin virgula (ban_esuat,management_nemutat); UI-ul foloseste includes"
metrics:
  tasks: 2
  files: 4
completed: 2026-11-11
---

# Phase 39 Plan 15: Comutator management pe cardul clubului Summary

Proprietarul acorda/retrage managementul (Instructor sau Admin club, D-16) de pe cardul clubului, iar schimbarea emailului (D-15) muta grantul pe identitatea noua.

## Ce s-a facut

- **Serviciu:** trei functii peste RPC-urile din 39-13; `incarcaManagementConturi` intoarce lista goala la eroare (grad de degradare cand migrarea 20261111e nu e aplicata: cardurile apar fara management, butonul "Acordă management" da eroare vizibila prin showError la apasare).
- **UI (`ConturiCluburiProprietar`):** pe cardurile cu cont, badge amber "Management: Instructor/Admin club" + "Retrage management", altfel "Acordă management". Modal acordare cu Select rol (Instructor implicit / Admin club) si text conform planului; modal retragere cu confirmare. Erori 23505/42501/P0002 mapate in romana; succes invalideaza `['management-conturi']`. Query-ul e activ doar pentru proprietar. Nimic in CereriAccesAdmin (D-18).
- **Endpoint:** `mutaManagement` in `schimbaEmailContClub`: insert rol nou, update grant (`user_id`, `rol_row_id`), delete rol vechi; rollback al randului nou daca update-ul esueaza. Esec -> raspuns ok cu `management_nemutat` + log fara date personale. UI-ul arata mesaj dedicat.
- **Docs:** paragraf "Management" in sectiunea Faza 39.

## Deviations from Plan

- **[Rule 2 - robustete]** `avertisment` combinat (`ban_esuat` si `management_nemutat` pot aparea simultan), deci UI schimbat din `=== 'ban_esuat'` in `includes`; mesajul de succes pastreaza continutul vechi pentru ban.
- Rol nou copiat din randul vechi (are nevoie de `rol_id`, planul nu il mentiona explicit).

## Verificare

- `npx tsc --noEmit`: 0 erori in fisierele atinse.
- `node --import tsx api/_contCompetitieClub.test.ts`: ALL PASSED.
- Criteriile grep din plan: toate satisfacute.
- **Neverificat:** RPC-urile live (migrarea 20261111e nu e aplicata), UI in browser, `mutaManagement` pe DB real (nu exista test pentru ea; logica cu service role, doar tipizata). Test manual dupa aplicarea migrarii: acorda -> schimba email -> verifica `acces_management_cont_club.user_id` si ca vechiul rol a disparut.

## Known Stubs

None.

## Self-Check: PASSED
