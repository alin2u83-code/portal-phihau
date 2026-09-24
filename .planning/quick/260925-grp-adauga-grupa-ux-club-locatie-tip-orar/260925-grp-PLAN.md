---
quick_id: 260925-grp
description: UX Adauga Grupa - club auto, locatie implicita, tip sezon default, orar multi-zi + ascunde Activitate Sala pt Super Admin
date: 2026-09-25
---

# Plan: UX modal Adaugă Grupă + meniu Activitate Sală

## Context

User (ADMIN_CLUB): "cand adaug grupa, clubul sa fie atribuit automat iar locatie sa sala sa fie una implicita cu posibilitatea de a alege doar locatiile clubului respectiv. tip grupa, per sezon. iar plus de la zi si ora in grupa nu este intuitiv, vreau sa fie ceva mai usor de gestionat de cineva non tehnic". Urmat de: "activitate sala nu este o zona necesara pentru super admin, este doar pentru cluburi".

## Investigatie

Cauza reala pt "club nu se atribuie automat": `GrupaFormModal.tsx` calcula `isFederationAdmin` din TOATE rolurile globale ale userului (`currentUser.roluri.some(...)`), nu din rolul activ. Plus `components/Grupe/index.tsx` nu trimitea deloc `activeClubId` catre modal (desi modalul il suporta). Un user cu rol SUPER_ADMIN_FEDERATIE la alta entitate vedea dropdown Club chiar cand era ADMIN_CLUB activ.

## Task 1: Club auto-atribuit

- `components/Grupe/GrupaFormModal.tsx`: prop nou `isFederationLevel?: boolean`, `isFederationAdmin = isFederationLevel ?? currentUser.roluri.some(...)` (fallback compat)
- `components/Grupe/index.tsx`: trimite `activeClubId={activeRoleContext?.club_id ?? null}` si `isFederationLevel={permissions.isFederationLevel}` catre `<GrupaFormModal>`

## Task 2: Locatie implicita

- `GrupaFormModal.tsx`: useEffect nou — daca `locatiiFiltrate.length === 1` si `formState.locatie_id` gol si grupa e noua, preselecteaza acea locatie. Cu 2+ locatii, ramane dropdown (nu forteaza alegerea).

## Task 3: Tip Grupa implicit Per Sezon

- `GrupaFormModal.tsx`: default `formState.tip_grupa` = `'per_sezon'` (era `'permanent'`) doar pt grupa noua (grupaToEdit pastreaza valoarea proprie la editare)
- useEffect nou — cand tip_grupa e per_sezon si sezon_id gol si grupa e noua, preselecteaza `sezonActiv.id` de indata ce se incarca (nu doar la comutare manuala a dropdown-ului)

## Task 4: Program Saptamanal - UX non-tehnic

- `components/Grupe/ProgramEditor.tsx`: inlocuit dropdown single-zi cu chip-uri multi-select zile (bifezi Marti+Joi, un singur interval orar aplicat pe toate zilele bifate deodata)
- Buton cu text explicit "Adauga in program (N zile)" in loc de doar icon "+", disabled cand nicio zi bifata
- `GrupaFormModal.tsx` handleSubmit: `window.confirm` daca `program.length === 0` la Salveaza — avertizeaza userul ca a uitat sa apese butonul de adaugare in lista

## Task 5: Ascunde "Activitate Sala" pt Super Admin Federatie

- `components/menuConfig.ts`: eliminat blocul `{ label: 'Activitate Sală', ... }` din `adminMenu` (folosit de SUPER_ADMIN_FEDERATIE + ADMIN). Ramane neschimbat in `adminClubMenu` si `instructorMenu`.

## Must-haves

- [x] ADMIN_CLUB nu mai vede dropdown Club la Adauga Grupa
- [x] Locatie unica per club se preselecteaza automat
- [x] Tip Grupa = Per Sezon cu sezonul activ deja completat la deschidere
- [x] Poti bifa mai multe zile si adauga acelasi interval orar odata
- [x] Avertisment la salvare daca program ramane gol
- [x] "Activitate Sala" disparut din sidebar Super Admin Federatie (verificat vizual)
- [x] `tsc --noEmit` curat

## Verificare

Testat live in browser (Playwright): context ADMIN_CLUB — modal fara dropdown Club, Tip Grupa Per Sezon + Sezon 2026-2027 (activ) preselectat, bifat Marti+Joi -> un click adauga ambele randuri in lista. Context Super Admin Federatie — sidebar fara "Activitate Sala". O eroare 500 nelegata (vedere_prezenta_detaliata, widget dashboard sportiv) observata in consola, in afara scope-ului, neatinsa.
