# Faza 45 — Clonare competitie: decizii (LOCKED 18.11.2026, user)

Sursa: sesiune 18.11.2026 (AskUserQuestion). Raportul avocat-diavol se adauga la 45-AVOCAT-DIAVOL.md; poate rafina designul, nu deciziile fara OK user.

- D-01 Ce se cloneaza: setari competitie (tip, config_taxe, locatie, organizator, fram_obligatoriu; FARA date si FARA status), categorii, probe. NU se cloneaza inscrieri/echipe.
- D-02 (REVIZUIT 18.11.2026, dupa avocat-diavol) Template: INLOCUIT cu 'clona din ultima competitie finalizata de acelasi tip', sursa preselectata in asistent. Fara tabel/coloana noua de template, fara sincronizare. categorii_template ramane global, pentru crearea de la zero. (Varianta initiala 'template per tip' respinsa.)
- D-03 UX: asistent cu bife (setari / categorii / probe) inainte de confirmare.
- D-04 Permisiuni: doar SUPER_ADMIN_FEDERATIE.

- D-05 Categorii: se cloneaza STRUCTURA INITIALA (sursele fuzionarilor/impartirilor din Faza 41), nu cea finala activa. Contrar recomandarii avocat-diavol (active-only); decizie user 18.11.2026. RISC DE FEZABILITATE: de verificat in research daca istoricul permite reconstruirea (categorii_fuzionate_din uuid[] pentru fuzionate; pentru impartite si anulate nu e confirmat). Daca nu se poate reconstrui fidel, revenim la user cu fallback active-only.
- D-06 Asistent: numele noii competitii OBLIGATORIU (editabil); datele si deadline-ul se cer in asistent.
- D-07 Se permite clonare INTRE tipuri (ex. CN Tehnica -> CVD). Atentie: probele/categoriile sursa pot fi incompatibile cu tipul tinta; asistentul trebuie sa valideze/avertizeze (de proiectat in discuss/plan).
- D-08 numar_categorie si ordine_afisare se RENUMEROTEAZA continuu in competitia noua.
- D-09 (din avocat-diavol, tehnic, neconstestat) Un singur RPC tranzactional competitie_cloneaza (SECURITY DEFINER, search_path public,pg_catalog, garda is_super_admin() 42501, REVOKE PUBLIC/anon); categoriile implica probele (bifa 'probe' fara 'categorii' nu exista); NU se copiaza legacy_eveniment_id, status, club_id; se copiaza config_taxe, taxa_individual, taxa_echipa, fram_obligatoriu. Raport complet: 45-AVOCAT-DIAVOL.md.

## Context existent (de reutilizat, nu duplicat)
- `categorii_template` (283 randuri), global, cheiat pe `tip_proba`, nu pe tip competitie.
- `components/Competitii/GenerareSabloaneModal.tsx`, `AdminPanel.tsx`: genereaza categorii din template la creare.
- Faza 41: RPC `categorii_aplica_operatie` + `CategorieForm` (cloneDin) pentru clonare categorie.

## Constrangeri proiect
3NF (template referentiaza, nu dubleaza), UI doar `components/ui.tsx`, RPC SECURITY DEFINER cu garda super admin + search_path, migrari reversibile, aplicare live doar cu OK user.

## Intrebari deschise (de decis in discuss-phase)
- `config_taxe`: copiat ca atare (recomandat de avocat-diavol) sau resetat? Nedecis de user.
- D-05: fezabilitate reconstruire structura initiala (vezi D-05).
- D-07: ce se intampla cu probe/categorii incompatibile cu tipul tinta?
- Verificari live nefacute: UNIQUE pe (competitie_id, numar_categorie), RLS/owner pe competitii/probe/categorii_competitie, triggere 20261115a pe draft.
