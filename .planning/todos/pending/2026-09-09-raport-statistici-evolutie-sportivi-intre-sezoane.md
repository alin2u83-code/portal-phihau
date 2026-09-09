---
created: 2026-09-09T15:02:00.016Z
title: Raport statistici evolutie sportivi intre sezoane
area: ui
files:
  - components/Sezoane/index.tsx
  - services/grupeIstoricService.ts
  - hooks/useSezoane.ts
---

## Problem

Utilizatorul vrea un raport/vizualizare care sa compare doua sezoane consecutive
la nivel de club: cati sportivi au ramas (prezenti in ambele sezoane), cati au
plecat (prezenti doar in sezonul vechi), cati sunt noi (prezenti doar in
sezonul nou) — o evolutie cantitativa, nu doar lista bruta de membri.

Context: continuare a task-ului "grupele din sezoane anterioare sa isi pastreze
componenta" (2026-09-09) — infrastructura de baza (sportiv_grupa_istoric,
TabIstoricMembri, GrupeIstoricTab) exista deja si a fost verificata
functionala; primele 2 sugestii (filtru sezon in Istoric Membri + vizibilitate
tab-uri) au fost deja implementate. Acest todo e extensia #4, cea mai
costisitoare dintre cele 4 sugestii — de facut separat, dupa validarea celor
deja livrate.

## Solution

TBD — idee de plecare: foloseste `sportiv_grupa_istoric` (data_intrare/
data_iesire) suprapus cu intervalul `[data_start, data_final]` al fiecarui
sezon (tabela `sezoane`) ca sa determini apartenenta unui sportiv la un sezon.
Probabil cel mai simplu ca un nou tab/sectiune in `components/Sezoane/index.tsx`
("Comparatie sezoane"), cu selectie a doua sezoane si un query/RPC care
calculeaza cele 3 seturi (ramasi/plecati/noi). Verifica intai daca exista deja
vreun index pe `sportiv_grupa_istoric(grupa_id, data_intrare)` inainte de a
scrie query-ul, ca sa nu fie lent pe cluburi mari.
