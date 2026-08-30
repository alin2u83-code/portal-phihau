# Phase 26: Wizard onboarding club nou ghidat de SUPER_ADMIN - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-31
**Phase:** 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
**Areas discussed:** Punct de intrare flow, Livrare acces cont, Rollback pe esec admin, Campuri formular admin, Submit flow

---

## Punct de intrare flow

| Option | Description | Selected |
|--------|-------------|----------|
| Wizard multi-step nou | Ecran/modal dedicat cu pasi: date club -> date admin -> confirmare+rezultat | |
| Extinde ClubFormModal | Campuri admin adaugate direct in modalul actual de creare club, un singur formular | ✓ |

**User's choice:** Extinde ClubFormModal
**Notes:** Simplitate — nu se justifica un flow separat pentru 2 formulare mici.

---

## Livrare acces cont

| Option | Description | Selected |
|--------|-------------|----------|
| Parola temporara afisata SUPER_ADMIN | Parola generata, afisata pe ecran dupa creare, trebuie_schimbata_parola=true | ✓ |
| Magic link generat | Fara parola, link de autentificare afisat SUPER_ADMIN | |

**User's choice:** Parola temporara afisata SUPER_ADMIN
**Notes:** Pattern deja folosit in api/creare-cont.ts + services/authService.ts.

---

## Rollback pe esec admin

| Option | Description | Selected |
|--------|-------------|----------|
| Club ramane creat, retry doar pe pasul admin | Fara tranzactie cross-tabel; wizard detecteaza club existent si reincearca doar admin | ✓ |
| Rollback complet (sterge clubul) | Necesita compensating delete pe cluburi daca pasul admin esueaza | |

**User's choice:** Club ramane creat, retry doar pe pasul admin
**Notes:** Evita complexitate de tranzactie cross-tabel intre `cluburi` si `auth.users`/RPC.

---

## Campuri formular admin

| Option | Description | Selected |
|--------|-------------|----------|
| Nume, prenume, email | Username derivat din email, parola generata automat | ✓ |
| Nume, prenume, email, parola manuala | SUPER_ADMIN alege parola initiala manual | |

**User's choice:** Nume, prenume, email
**Notes:** Minim necesar, parola generata automat.

---

## Submit flow

| Option | Description | Selected |
|--------|-------------|----------|
| Un singur submit | Un buton Salveaza creeaza club+admin secvential, campuri admin obligatorii | ✓ |
| Camp admin optional | SUPER_ADMIN poate salva doar clubul, admin adaugat separat ulterior | |

**User's choice:** Un singur submit
**Notes:** Campurile admin devin obligatorii la creare club nou.

---

## Claude's Discretion

- Mecanism exact de retry pe pasul admin (buton dedicat vs reluare submit cu detectie club existent)
- Format ecran de rezultat cu parola (Modal nou vs extindere Modal existent)
- Generarea parolei (lungime, charset)
- Confirmarea daca username se genereaza identic cu pattern-ul din api/genereaza-magic-link.ts

## Deferred Ideas

- Wizard multi-pas separat — respins
- Livrare acces prin magic link — respins
- Rollback complet cu stergere club — respins
- Copiere template de la club sursa — deja respins in Faza 25
- Signup public fara SUPER_ADMIN — deja respins in Faza 25
