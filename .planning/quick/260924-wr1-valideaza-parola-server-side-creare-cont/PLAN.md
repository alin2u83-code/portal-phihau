---
quick_id: 260924-wr1
slug: valideaza-parola-server-side-creare-cont
date: 2026-09-24
---

Retroactive tracking — cod deja scris/testat/commis inainte de a fi rulat
prin /gsd-quick (audit interactiv al fluxului "adauga club nou + admin",
gap WR-01 identificat: `api/creare-cont.ts` nu valida complexitatea parolei
primite in payload, doar existenta ei implicita prin `auth.admin.createUser`).

## Task

1. In `api/creare-cont.ts`, dupa validarea payload-ului existent (email/nume/
   prenume), adauga o garda server-side pt parola: minim 12 caractere, cel
   putin o majuscula, o minuscula si o cifra — respinge cu 400 daca nu
   respecta regula, inainte de orice apel `auth.admin.createUser`.
2. Verifica ca singurul apelant (`hooks/useRoleAssignment.ts` <-
   `components/CluburiManagement.tsx`, `genereazaParolaTemporara()` din
   `utils/parola.ts`, 16 caractere, toate clasele) ramane compatibil — zero
   schimbari necesare in flux.
3. `tsc --noEmit` curat pe proiect dupa modificare.
