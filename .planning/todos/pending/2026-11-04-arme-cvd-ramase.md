# Faza 35 — Arme CVD: ce a ramas (4.11.2026)

Cod complet + migrarea aplicata live (arme, sportiv_arme, competitie_sportiv_arme, arma_id pe inlantuiri/inscrieri/echipe). NIMIC pushat (main ~23 commit-uri inaintea origin). **NU da push inainte sa verifici lista de mai jos** — dupa push Vercel deployeaza.
Ledger SDD (gitignored): `.superpowers/sdd/2026-11-04-arme-cvd/` (progress.md, task-N-review.md, final-review.md).

## 1. Verificare Chrome ramasa (competitia Roman 2026, goala, dev server localhost:5173)
Verificat OK: pas Arme (chips, restrictii, stagii, salvare), Pas1, Pas2 pe arme (Lungu: Bong/Moc Guom/Ma Dao), banner "De rezolvat".
- [ ] Hub dupa fix 9d7f5c2: card Thao Lo "x/y completate", "Finalizeaza inscrierea" deblocat.
- [ ] Pas4 sumar: 3 randuri (sportiv, arma), 3 taxe, fara "Salveaza" pe date reale (sau stergi dupa).
- [ ] Giao Dau: eticheta "Arme permise la lupta" + avertisment cand lipseste arma de lemn.
- [ ] Song Luyen: selector "Arma echipei", candidati doar cu aceeasi arma + categoria potrivita, salvare scrie echipe_competitie.arma_id.
- [ ] Retragere arma (debifare + "Salveaza armele" -> ConfirmModal), blocat daca taxa_achitata.
- [ ] Mobil (chips, banner, Pas2) — netestat.
- [ ] Testare cu rol INSTRUCTOR (doar citire) si cu alt club (RLS) — netestat.

## 2. Decizii/date de confirmat
- [ ] Grad afisat diferit: BALMUS IUSTINA / SFICA DIANA = "1 Cap Albastru" in pasul Arme dar "C.V. 2 Cap Alb · neactualizat" in Pas1. Care e corect? (armele sunt calculate pe gradul efectiv la data competitiei)
- [ ] `cerinte_stagii_cvd` cere 5 stagii la C.N. 4 Dang; circulara (ARHITECTURA_COMPETITII.md:115) zice minim 3 la centuri negre. Corecteaza tabelul daca e gresit.
- [ ] 21/29 sportivi "Nicio arma disponibila" (ex. 3-4 Cap Rosu): vine din matricea inlantuiri_grade; verifica daca trebuie sa aiba arme.
- [ ] "2 Long Gian" nu apare la Lungu desi e in circulara (lipsa drept/categorie?).
- [ ] Hub: Thao Lo arata "0/0 completate" inainte de selectie; Song Luyen "13 categorii (11 excluse auto)" — de inteles.
- [ ] Echipa CVD veche stearsa (Roman 2026: 5 inscrieri + 1 echipa sterse la cererea userului).
- [ ] Decizie separata: migrare drop pentru politicile permisive `inscrieri_delete_club` / `inscrieri_update_club` (orice ADMIN_CLUB poate sterge/modifica inscrieri oricarui club; retragerea din Task 6 le foloseste). Se pregateste doar la cerere.

## 3. Limite cunoscute (minor, acceptate)
- Hook useArmeCvd re-adauga armele implicite daca sportivul goleste toate armele (nu deosebeste "gol" de "fara rand").
- Contor "eligibili" din Pas3Echipe simplificat (nu aplica categoriePentruArma).
- Pas1 Retrage pe CVD nu goleste armeAlese/formaPerArma (nu corupe date).
- Pas4: randuri deduplicate/fara forma apar in PDF/borderou cu taxa 0; arma fara forma disponibila blocheaza Finalizeaza cu mesaj general.
- "Deschide profilul" din banner distruge starea wizardului (acum cu confirmare).
- Politici RLS vechi lasa INSTRUCTOR sa scrie arma_id pe inscrieri/echipe.
- InscriereModal citeste armele salvate in DB, nu draftul din wizard.
- esuatiRef (PasArme) nu se curata niciodata (minor).

## 4. Curatenie
- [ ] Commit `.claude/hooks/.last-captured-hash`, `.claude/session_state.md` (auto, ignora) si restul `.planning/` necomise (phases 31/32/34, quick/261016) — nu sunt din Faza 35.
- [ ] `/gsd-plan-phase 35` optional (Faza 35 e in ROADMAP doar ca intrare).
- [ ] finishing-a-development-branch: review final facut (OK de merge); push doar dupa pct. 1.
