# Faza 45 — Raport avocat-diavol (18.11.2026)

Verdict agent: MODIFICAT. Cloneaza = da; template per tip = amanat/respins in forma propusa. (Raport al agentului, nu decizie user. Nu a rulat SELECT-uri live; UNIQUE pe numar_categorie, RLS pe probe/categorii_competitie si UI pe 375/768/1280 neverificate.)

## Reutilizabil
- GenerareSabloaneModal.tsx:105-131 (mapare tip_proba -> proba_id, creare categorii); logica se reutilizeaza cu sursa = categoriile competitiei vechi.
- CategoriiTemplateManager/BulkCategoryWizard/CategoryWizard: CRUD complet pe categorii_template; nu e nevoie de alt creator de template.
- RPC categorii_aplica_operatie (20261114a): sablonul pentru noul RPC (SECURITY DEFINER, search_path public,pg_catalog, garda is_super_admin(), REVOKE PUBLIC/anon, GRANT authenticated/service_role).
- MigrareModal.tsx:37-48: exemplu de insert in competitii cu mapare de campuri.

## Contestare
- Cloneaza cu bife acopera ~90% din nevoie (editia noua = editia veche fara inscrieri).
- Template per tip = a doua copie a aceluiasi lucru, plus drift. Alternativa: sursa clonarii preselectata = ultima competitie finalizata de acelasi tip. Zero tabel nou.
- categorii_template ramane global. Daca totusi per tip: o coloana tip_competitie, nu tabel nou (verifica ca tip_proba nu implica deja tipul).
- Bifa "probe" fara "categorii" nu are sens (categoria are proba_id): categorii implica probe.

## Integritate / 3NF
- Snapshot la clonare, nu referinta live (categoria apartine competitiei) = corect, nu e denormalizare.
- Clonare doar categorii cu status_categorie='activa'; reset este_fuzionata=false, categorii_fuzionate_din=null (altfel FK-uri orfane). Cum se trateaza cele 2 categorii fuzionate: de decis (de regula sursele originale).
- proba_id remapat: probe intai (RETURNING), apoi categorii. Totul intr-un singur RPC tranzactional (nu 3 inserturi client; risc de clonare pe jumatate).
- Renumerotare numar_categorie/ordine_afisare continua pe active. UNIQUE pe (competitie_id, numar_categorie) de verificat live.
- config_taxe, taxa_individual, taxa_echipa, fram_obligatoriu: se copiaza. NU: legacy_eveniment_id, status, date, deadline_inscrieri, club_id. denumire editabila in asistent.
- Verifica ca triggerele din 20261115a nu blocheaza insertul in categorii_competitie pe draft.

## Permisiuni
- Un singur RPC competitie_cloneaza(p_sursa, p_setari jsonb, p_categorii bool, p_probe bool, ...), garda 42501 prima instructiune. Garda reala in DB.
- FORCE RLS: verifica pe live (pg_policies) ca owner-ul poate insera in competitii/probe/categorii_competitie; test cu rol non-super-admin => 42501.
- Fara tabel nou => fara politici noi. Sursa clonarii inregistrata in observatii/log, nu coloana noua.

## Intrebari deschise
1. Categorii fuzionate/impartite: active-only (recomandat) sau surse?
2. Template per tip necesar, sau "clona din ultima competitie de acelasi tip" il inlocuieste? Daca template: ce se intampla cu cele 283 randuri?
3. Nume, date, deadline noii competitii: obligatorii in asistent?
4. Clonare intre tipuri (CN Tehnica -> CVD) permisa?
5. numar_categorie/ordine_afisare: identic sau renumerotat?
