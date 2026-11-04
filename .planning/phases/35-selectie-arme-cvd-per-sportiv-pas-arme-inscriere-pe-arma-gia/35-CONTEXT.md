# Faza 35 — Selectie arme CVD per sportiv (context)

Creat 2026-11-04. Design aprobat de utilizator. Nimic implementat inca.

## Documente
- Spec: docs/superpowers/specs/2026-11-04-arme-cvd-design.md
- Plan (9 task-uri): docs/superpowers/plans/2026-11-04-arme-cvd.md

## Decizii cheie (utilizator)
- Pas "Arme" la nivel de competitie CVD, inainte de probe; alegere salvata pe sportiv (implicit) si pe competitie.
- Un rand inscrieri_competitie per arma, o arma per categorie, o taxa per inscriere.
- Restrictii pe arme: lama vs articulata; grade la Bong vs Long Gian/Song Cot/Moc Can (blocare dura). Stagii si max 3 sportivi/club = avertisment.
- Giao Dau CVD: doar Bong, Song Cot, Moc Can, Moc Guom, Long Gian; portalul retine doar armele permise, nu arma per lupta.
- Song Luyen: doar aceeasi arma cu aceeasi arma, o echipa per arma comuna.
- Phuc Su Dao si Cuu Khuc eliminate deocamdata.
- Plata se face dupa clarificarea inscrierilor; lacatul (taxa_achitata) doar dupa plata.
- Editare: doar ADMIN_CLUB/SUPER_ADMIN cat timp inscrierile sunt deschise; INSTRUCTOR citeste.

## Legatura cu activitatea anterioara
- Commit-uri Competitii: 5f247f6, 203c150 (Giao Dau individual), c747f9e (Retrage, inactivi, Pas4), d3b87d7 (spec).
- Phase 20 (retragere individuala DELETE vs UPDATE status): Task 6 extrage retrage.ts cu hard delete existent; decizia 20 ramane deschisa.
- Phase 21 (Pas4Sumar insert dublu): Task 6 modifica handleSave din Pas4Sumar; de verificat ca nu apare insert dublu.
- Phase 25 (RLS fantoma): politicile inscrieri_delete_club / inscrieri_update_club din DB live sunt permisive; migrarea de drop nu face parte din aceasta faza, decizie separata a utilizatorului.
- Faza 34: shell/UI neatinse; UI-ul nou foloseste ui.tsx si tokeni.

## Precondiții / blocaje
- Migrarea 35-01 se aplica pe DB live doar cu OK explicit (date reale).
