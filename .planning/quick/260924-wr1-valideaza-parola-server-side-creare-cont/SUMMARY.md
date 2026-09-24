---
quick_id: 260924-wr1
slug: valideaza-parola-server-side-creare-cont
status: complete
date: 2026-09-24
commit: e5de885
---

Adaugat gate de validare parola in `api/creare-cont.ts`, inaintea apelului
`auth.admin.createUser`: respinge cu 400 daca `password` nu e string, are
sub 12 caractere, sau ii lipseste majuscula/minuscula/cifra.

Context: gap WR-01 identificat intr-un audit al fluxului "adauga club nou +
admin" (declansat de o cerere reala de adaugare club — Phung Hoang Bucuresti,
admin Dana Anghel). Endpoint-ul avea deja validare de payload (email/nume/
prenume) si garda anti-escaladare per club (CR-01, `api/_permisiuniCont.ts`),
dar nimic nu impunea complexitate minima pe parola — un apel direct (in afara
UI) putea crea conturi cu parole triviale.

Verificat: singurul apelant al endpoint-ului (`hooks/useRoleAssignment.ts`,
folosit din `components/CluburiManagement.tsx`) trimite intotdeauna parola
generata de `genereazaParolaTemporara()` (`utils/parola.ts`) — 16 caractere,
garanteaza toate cele 4 clase. Zero risc de regresie pe fluxul existent.

`tsc --noEmit` curat pe tot proiectul dupa modificare.

Alte 2 gap-uri din acelasi audit verificate, fara modificare necesara:
- RLS live pe `cluburi`/`utilizator_roluri_multicont` (pg_policies interogat
  direct pe DB) — SELECT deschis pe `cluburi` catre orice user autentificat
  e intentionat (query critic in `useDataProvider.ts`, incarcat pt orice rol
  inclusiv SPORTIV, filtrat client-side pe `visibleClubIds`; CIF e date
  public de registru). Nicio schimbare.
- Validare roluri/body din payload — deja acoperita in
  `api/_permisiuniCont.ts` (array nevid, roluri cunoscute).

Fix separat, tot din aceeasi sesiune, nu in scope-ul acestui quick task:
nume/prenume gresit ("Phung Hoang"/"Bucuresti" in loc de "Anghel"/"Dana") pe
randul `sportivi` creat pt admin Phung Hoang — corectat direct in DB
(UPDATE, nu migratie de cod).

Commit: e5de885
