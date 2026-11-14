# Faza 41 — decizii (clarificate 14.11.2026)
- UI: tab Categorii existent; actiuni per categorie + selectie multipla (fuziune); DOAR SUPER_ADMIN_FEDERATIE.
- Operatii: modificare, editare, anulare (sportivi insuficienti), clonare, fuziune, split.
- Inscrieri existente la anulare/fuziune/split: mutare automata + PREVIEW, super admin confirma. Anulare => inscrierile raman "fara categorie" pt realocare.
- Split direct din grupa/categorie (zona super admin): criteriu varsta | grad | gen (feminin/masculin/mixt separat) etc; super admin alege cum imparte. Lista grupei arata nume, club, grad, quyen executat.
- Constrangeri: fara librarii noi, ui.tsx, RLS existent.

## ID-uri decizii (adaugate la planificare, 14.11.2026) — citate in 41-NN-PLAN.md

Din lista de mai sus:
- D-01: UI in tab-ul Categorii existent; actiuni per categorie + selectie multipla (fuziune); DOAR SUPER_ADMIN_FEDERATIE (garda reala in DB: is_super_admin()).
- D-02: Operatii: modificare (criterii varsta/grad/gen), editare (restul campurilor), anulare (sportivi insuficienti), clonare, fuziune, split.
- D-03: Inscrierile existente la anulare/fuziune/split: mutare automata + PREVIEW; super adminul confirma.
- D-04: Anulare => inscrierile raman "Fara categorie" pentru realocare.
- D-05: Split direct din categorie (zona super admin): criteriu varsta | grad | gen (Feminin / Masculin / Mixt separat pentru echipele mixte); super adminul alege pragurile si poate schimba tinta pe fiecare rand. Lista grupei arata nume, club, grad, quyen executat.
- D-06: Constrangeri: fara librarii noi, components/ui.tsx, RLS existent.

Decizii suplimentare ale utilizatorului din sesiunea de planificare (14.11.2026, blocate):
- D-07: "Fara categorie" = inscrierile/echipele raman legate de categoria ne-activa (fara DROP NOT NULL pe categorie_id); UI afiseaza "Fara categorie" cand categoria nu e activa; realocarea se face prin RPC de mutare.
- D-08: Cand o categorie se anuleaza, se anuleaza si factura de plata (taxa de competitie) a sportivilor inscrisi in ea. Taxele deja achitate NU se sterg si nu se pierd: raman marcate achitate si sunt semnalate "de realocat / de returnat". La realocarea intr-o categorie noua, taxa reapare (datorata) pe categoria noua; o taxa achitata ramane achitata.
- D-09: Operatiile sunt blocate doar cand competitia e `finalizata`.
- D-10: La split, echipele se aloca manual, cu sugestie.
- D-11: Fara notificare catre cluburi in aceasta faza.
- D-12: Verificarea live prin Supabase MCP (pg_policies pe categorii_competitie/inscrieri_competitie/echipe_competitie, is_super_admin, audit_trigger_fn) este task de Wave 0; migrarile se adauga cu `git add -f` (supabase/ e in .gitignore); functiile SECURITY DEFINER noi intra in tests/acl_definer_faza37.allowlist.json; fara UI-SPEC (comportamentul UI e descris in task-uri).

Interpretare planner pentru D-08 (verificata in cod, re-verificata live in 41-01 Task 1):
- In modulul nou de competitii taxa de competitie NU este un rand in tabela `plati`. Este derivata pe fiecare inscriere/echipa (utils/taxeCompetitie.ts: calculeazaTaxaIndividuala/calculeazaTaxaEchipa + coloana `taxa_achitata`). Singurul cod care scrie `plati` cu tip 'Taxa Competitie' este calea veche pe `evenimente` (StagiiCompetitii.tsx, eveniment_id), care nu atinge `categorii_competitie`.
- Deci "factura anulata" = randul de plata derivat nu mai este datorat cat timp categoria nu este activa (anulata/fuzionata/impartita); dupa realocare pe o categorie activa redevine datorat, cu taxa categoriei noi. Fara coloana noua, fara stergere de date.
- Taxa anuala FRQKD/FRAM (viza de sezon, creata de triggerul trg_taxa_anuala_inscrieri_competitie la PRIMA inscriere din sezon) NU se anuleaza: nu este taxa competitiei si sportivul ramane membru in sezon. De confirmat cu utilizatorul daca vrea altfel.
