---
created: 2026-09-09T15:02:00.016Z
title: Leaga prezenta de istoricul de grupe pe profil sportiv
area: ui
files:
  - components/UserProfile/GrupeIstoricTab.tsx
  - hooks/useGrupeIstoric.ts
  - services/grupeIstoricService.ts
---

## Problem

Utilizatorul vrea ca evidenta unui sportiv sa arate nu doar la ce grupe a participat
(deja exista, `GrupeIstoricTab.tsx` + `fetchIstoricGrupeSportiv` din
`services/grupeIstoricService.ts`, bazat pe tabela `sportiv_grupa_istoric` cu
`data_intrare`/`data_iesire`), ci si cate prezente a avut in fiecare interval
grupa. Momentan tab-ul arata doar grupa, data intrare/iesire, durata si motiv —
fara nicio legatura cu prezenta efectiva.

Context: continuare a task-ului "grupele din sezoane anterioare sa isi pastreze
componenta" (2026-09-09) — infrastructura de baza (sportiv_grupa_istoric,
TabIstoricMembri in GrupaDetailView, GrupeIstoricTab pe profil sportiv) exista
deja si a fost verificata functionala. Acest todo e extensia #3 din lista de
sugestii data utilizatorului (prioritate dupa itemii 1+2, deja implementati).

## Solution

TBD — idee de plecare: pentru fiecare rand din istoricul de grupe al
sportivului, interogheaza tabela de prezenta filtrata pe `sportiv_id` +
`grupa_id` + intervalul `[data_intrare, data_iesire sau azi]`, si afiseaza
un numar "X prezente" langa fiecare interval. Verifica intai schema exacta a
tabelei de prezenta (denumire coloane, index-uri) inainte de a scrie query-ul,
ca sa nu incarce prea mult profilul la randare (posibil nevoie de agregare
server-side/RPC daca sportivul are istoric lung).
