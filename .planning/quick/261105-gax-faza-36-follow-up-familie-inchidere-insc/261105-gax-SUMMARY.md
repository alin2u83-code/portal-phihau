---
quick_id: 261105-gax
status: complete
---
# 261105-gax — Faza 36 follow-up

Migrari live: 20261106e (familie, inchidere, plafon, curatare), 20261106f (get_familie_id_sportiv_curent cu ORDER BY).
UI: LoginOtp neutru, buton curatare cereri, verificare 0 randuri dupa inchidere (InscrieriView, InscriereModal, Pas4Sumar, FinanciarView).

Verificat: tsc OK; rls_competitii_scriere 42/42; rls_acces_extern 57/57; acces_extern_aprobare 36/36; acces_extern_fundatie 36/36; playwright ui_acces_extern 6/6 (inainte de fix-urile UI 0-randuri); simulare SQL familie: 22 frate / 0 straini.
Review separat (agent-skills:code-reviewer): 1 obligatoriu (UI 0 randuri) aplicat; drift functie familie aplicat; restul optional neaplicat.
Neverificat: UI in browser pentru login neutru, buton curatare si mesajele 0-randuri; politica familie fara test automat.
Decizie: taxa_achitata dupa inchidere doar federatia (FinanciarView e vizibil doar isAdmin = federatie).
