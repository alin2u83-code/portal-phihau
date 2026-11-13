# Faza 40 — ramase dupa testul real pe C.S. Phi Hau (13.11.2026)

Stare: tot codul e pe main (ultimul push 583d7be9), deploy Vercel. Migrari live: 20261112a/b, 20261113a/b. Baterie live 27/27.

## De verificat maine (user, pe https://portal-phihau.vercel.app/competitie, Ctrl+Shift+R)
- [ ] Primul ecran = "Pasul 1: Grade sportivi" (PasGrade); banner echivalare; "Continua" -> Arme
- [ ] Sonia Andriciuc, Gomei Luisa, Leohchi: echivalare la 1 Cap Albastru (apar in lista, badge galben "Actualizeaza gradul")
- [ ] Arme: filtre nume/grad/varsta (PasArme) + salvare arme pe sportivi ascunsi de filtru
- [ ] Song Luyen 13-15 Feminin: Balmus Iustina + Sfica = 2 eligibili, pereche Bong+Bong (fix 8ddbd641: arma potrivita doar in categoriile aceleiasi probe)
- [ ] Refresh dupa schimbare grad (arme/inscrieri/echipe se reincarca)
- [ ] Giao Dau: de clarificat ce nu e clar (userul a zis "nu e totul clar")

## De facut
- [ ] Giao Dau individual cu arme poate avea aceeasi problema de prioritate intre probe (categoriePentruArma) - neverificat, nemodificat
- [ ] Card "Grade sportivi" in hub (acum pasul se vede doar la intrare; din hub nu mai ai drum inapoi decat prin Pas 1 "Schimba grad")
- [ ] Rulat /gsd-verify-work 40: UAT creat (40-UAT.md, 7 teste, toate pending) - continua dupa verificarea reala; apoi tranzitie faza (STATE/ROADMAP)
- [ ] Rulat /gsd-secure-phase 40 (security enforcement activ, SECURITY.md lipseste)
- [ ] Review separat pe diff-ul din commit-urile post-c3823dac (PasGrade, Pas1, Pas3, InscriereModal, PasArme, index.tsx) - nerulat
- [ ] Testat pe telefon real, rol INSTRUCTOR, anulare dupa deadline cu motiv in UI
- [ ] 2 esecuri ACL preexistente: trg_echipe_denumire_implicita(), self-check sensibilitate
- [ ] Fixturi de test editate pt deadline obligatoriu (7 fisiere + scripts/import_cn_copii_2025.ts) nerulate
- [ ] Date reale modificate azi in Phi Hau: Balmus Iustina + Sfica Diana -> 1 Cap Albastru (echivalare), inscrise Giao Dau; anulabile pana 22.11.2026
- [ ] Tutorial competitii (logare -> finalizare) DUPA ce modulul e gata; 3 video WhatsApp model (nu pot fi vizionate; cere descriere/capturi)
