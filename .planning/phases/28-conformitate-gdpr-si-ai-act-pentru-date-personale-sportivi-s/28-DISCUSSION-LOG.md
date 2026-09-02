# Phase 28: Conformitate GDPR si AI Act - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-03
**Phase:** 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s
**Areas discussed:** Consimtamant parinte (loc), Structura cereri_gdpr + coada admin, Pagina Protectia datelor, Nota informare GDPR, RLS pe cereri_gdpr

---

## Consimtamant parinte — unde

| Option | Description | Selected |
|--------|-------------|----------|
| sportivi | Tabel activ, folosit peste tot | ✓ |
| fisa_inscriere | Tabel gol, nefolosit in cod | |

**User's choice:** sportivi
**Notes:** fisa_inscriere confirmat 0 randuri, zero cod frontend il foloseste.

---

## Varsta <16 — cand se calculeaza

| Option | Description | Selected |
|--------|-------------|----------|
| La schimbarea data_nasterii (live) | Camp apare/dispare imediat | ✓ |
| Doar la submit | Mai simplu, UX mai confuz | |

**User's choice:** live la schimbarea data_nasterii

---

## Sportivi existenti <16 fara consimtamant

| Option | Description | Selected |
|--------|-------------|----------|
| Nimic acum, doar la editare viitoare | Minim, strict pe SPEC | |
| Fortez completare la urmatoarea editare | Extindere fata de "sportiv nou" | ✓ |

**User's choice:** Fortez completare la urmatoarea editare a oricarui sportiv <16 existent
**Notes:** Follow-up: blocare completa a salvarii (nu doar warning) pana completeaza campul.

---

## Calcul varsta — refolosire functie

| Option | Description | Selected |
|--------|-------------|----------|
| Refolosesc functia existenta | Evita duplicare logica | ✓ |
| Functie noua inline | Fara research prealabil | |

**User's choice:** Refolosesc functia existenta
**Notes:** Gasit `calculeazaVarstaLaData(dataNasterii, dataCompetitie)` in `utils/eligibilitateCompetitie.ts`.

---

## Campuri consimtamant — format

| Option | Description | Selected |
|--------|-------------|----------|
| Nume + data auto (azi) | Data nu editabila | ✓ |
| Nume + data editabila manual | Risc date gresite | |

**User's choice:** Nume complet parinte + data automata

---

## Campuri consimtamant — pozitie in formular

| Option | Description | Selected |
|--------|-------------|----------|
| Tab General, langa data_nasterii | Context vizibil | ✓ |
| Tab nou dedicat GDPR | Tab suplimentar doar pt un camp | |

**User's choice:** Tab General, langa data_nasterii

---

## Structura tabel cereri_gdpr — status enum

| Option | Description | Selected |
|--------|-------------|----------|
| Reutilizez pattern existent CereriInscriere.tsx | in_asteptare/aprobata/respinsa | ✓ |
| Pending/aprobat/respins literal din SPEC | Rupe consistenta | |

**User's choice:** Reutilizez exact pattern-ul existent

---

## Ecran admin coada cereri_gdpr

| Option | Description | Selected |
|--------|-------------|----------|
| View nou dedicat "Cereri GDPR" | Similar CereriInscriere | ✓ |
| Tab in pagina Protectia datelor | Combina cu formularul user | |

**User's choice:** View nou dedicat

---

## Initiator cerere GDPR

| Option | Description | Selected |
|--------|-------------|----------|
| Orice rol logat pt propriul cont | Simplu, legat automat | ✓ |
| Admin/instructor creeaza pt alt sportiv | Extra complexitate | |

**User's choice:** Orice rol logat creeaza cerere pt propriul cont sportiv

---

## Legatura user->sportiv_id

| Option | Description | Selected |
|--------|-------------|----------|
| Cauta legatura existenta | Evita duplicare | ✓ |
| Presupun activeRoleContext are sportiv_id | Risc de eroare | |

**User's choice:** Cauta legatura existenta
**Notes:** Confirmat `sportivi.user_id`, folosit in `utils/auth.ts`.

---

## Rol fara sportiv_id — buton cerere

| Option | Description | Selected |
|--------|-------------|----------|
| Buton ascuns/dezactivat | Evita eroare la submit | ✓ |
| Buton vizibil, eroare la click | UX confuz | |

**User's choice:** Buton dezactivat/ascuns

---

## Efect tehnic la aprobare cerere stergere

| Option | Description | Selected |
|--------|-------------|----------|
| Doar status -> aprobata + procesat_de/la | Fara actiune automata | ✓ |
| Deschide automat modal stergere | Integrare cu alt modul, scope extins | |

**User's choice:** Doar status + metadate

---

## Efect tehnic la aprobare cerere export

| Option | Description | Selected |
|--------|-------------|----------|
| Doar status -> aprobata, admin exporta manual | Consistent cu decizia de mai sus | ✓ |
| Genereaza automat PDF/JSON | Scope semnificativ mai mare | |

**User's choice:** Doar status, admin exporta manual

---

## Pagina Protectia datelor — loc in meniu

| Option | Description | Selected |
|--------|-------------|----------|
| Sectiune noua in Setari/Cont | Loc logic | ✓ |
| Item top-level sidebar | Aglomereaza meniul | |

**User's choice:** Sectiune in Setari/Cont

---

## Pagina Protectia datelor — continut

| Option | Description | Selected |
|--------|-------------|----------|
| Text + buton + lista cereri proprii cu status | Satisface acceptance criteria SPEC | ✓ |
| Doar text + buton | Ar dubla UI in alta parte | |

**User's choice:** Text + buton + lista cereri proprii

---

## SUPER_ADMIN_FEDERATIE pe Pagina Protectia datelor

| Option | Description | Selected |
|--------|-------------|----------|
| Vede pagina, doar text, fara buton | Consistent cu D-10 | ✓ |
| Pagina ascunsa complet | Contrazice acceptance criteria SPEC | |

**User's choice:** Vede pagina, doar text drepturi

---

## Nota informare — format

| Option | Description | Selected |
|--------|-------------|----------|
| Accordion inchis implicit | Nu aglomereaza formularul | ✓ |
| Text simplu mereu vizibil | Lungeste formularul | |

**User's choice:** Accordion expandabil, inchis implicit

---

## Nota informare — pozitie in formular

| Option | Description | Selected |
|--------|-------------|----------|
| Tab General, sus | Prima informatie vazuta | ✓ |
| Tab General, jos langa submit | Risc sa fie ignorata | |

**User's choice:** Sus, inainte de campurile de date

---

## Nota informare — cand apare

| Option | Description | Selected |
|--------|-------------|----------|
| Doar la sportiv nou | Strict pe SPEC | ✓ |
| Si la editare existent | Extindere fata de SPEC | |

**User's choice:** Doar la sportiv nou

---

## RLS cereri_gdpr — scoping admin

| Option | Description | Selected |
|--------|-------------|----------|
| Admin club vede tot clubul lui | Consistent cu restul aplicatiei | ✓ |
| Admin vede doar cererile aprobate de el | Restrictie nejustificata | |

**User's choice:** Admin club vede toate cererile clubului

---

## RLS cereri_gdpr — acces INSTRUCTOR

| Option | Description | Selected |
|--------|-------------|----------|
| Deloc | Consistent cu alte fluxuri sensibile | ✓ |
| Read-only | Acces suplimentar nejustificat | |

**User's choice:** Deloc — doar ADMIN_CLUB/SUPER_ADMIN

---

## Claude's Discretion

- Text exact al notei de informare si al paginii Protectia datelor
- Denumire exacta a view-urilor noi in `types.ts`/`AppRouter.tsx`
- Structura interna detaliata a celor 4 documente markdown GDPR

## Deferred Ideas

- **Audit + export date existente in DB, curatare campuri nefolosite** — propus de user in timpul discutiei ("exportam datele existente in baza de date, pastram doar datele necesare pentru functionarea aplicatiei in conditiile actuale"). Identificat ca noua capacitate (data minimization pe date live), nu parte din cele 9 requirements locked ale fazei 28. Candidat pt faza viitoare dedicata.
