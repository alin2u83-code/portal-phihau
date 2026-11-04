---
phase: 36
plan: 11
status: complete
requirements: [ACX-09, ACX-11, ACX-12]
---
# 36-11 SUMMARY — baterie securitate live rol extern

`tests/rls_acces_extern_faza36.ts` (57 verificari) ruleaza pe DB live cu conturi efemere (EXT_A, EXT_B, EXT_NOGRANT, ADMIN_A, MIXT). Cleanup in finally; reziduuri = 0 (competitii, sportivi test, plati/vize noi).

## Rezultat
- Inainte de ajustarea testului: 54/57 (sweep fara lista de relatii — root OpenAPI e doar service_role; status echipa invalid in test; 2 verificari W4 picau din motive de schema, nu de RLS).
- Dupa ajustari de TEST (nicio relaxare de verificare, nicio migratie corectiva necesara): **57/57**.
- Sweep pe 229 relatii PostgREST (tabele+view-uri), EXT_A si EXT_NOGRANT: ALLOW=30 / OK=199 / **LEAK=0**.
  - 11 view-uri apareau initial ca LEAK; toate sunt `security_invoker=true` peste tabele ALLOW (sportivi/competitii/cluburi/utilizator_roluri) si intorc doar randuri scoped (verificat: club_id=A, user_id propriu; fara grant: 0 randuri sportivi/competitii). Clasificate ca ALLOW-DERIVED in test.
- Citire: izolare per club+competitie (A vs B), fara grant = 0, grant dezactivat = dispare, spoof de header nu extinde accesul.
- Scriere: cross-club, cross-competitie, competitie inchisa, categorie straina, taxa_achitata, schimbare status, stergere inscriere straina/achitata, competitii/probe/categorii/sportivi, escaladare rol/grant/cereri, echipe: toate respinse, starea reala verificata cu service role.
- Regresii interne (D-16): ADMIN_CLUB si utilizator MIXT citesc datele clubului lor. INFO: ADMIN_A vede inca inscrierile clubului B (SELECT intern larg, neatins din D-16).

## Riscuri reziduale (decizie utilizator inainte de lansare)
1. **HIGH — RPC SECURITY DEFINER apelabile de orice `authenticated` (≈170 functii)**, inclusiv: adauga_sportiv_complet, export_sportivi_selectati, decrypt_cnp, get_all_app_data, merge_sportivi, transfer_sportiv, genereaza_taxe_anuale, inregistreaza_plata_federatie, seteaza_scutire_taxa, proceseaza_*, set_primary_context/switch_* si scoala_ioncreanga_*. RLS nu le acopera; garda depinde de corpul fiecarei functii. NEapelate in test (pot muta date). Un cont extern le poate invoca la fel ca orice SPORTIV. Necesita audit al gardelor + REVOKE/guard `NOT este_doar_extern()`.
2. **MEDIUM — `sportivi` SELECT complet pentru club-ul din grant**: extern poate cere orice coloana (cnp, adresa, telefon, email) prin PostgREST, nu doar cele din ExternDataProvider. Mitigare posibila: view limitat/column grants.
3. storage.objects: politica restrictiva creata (aplicata cu succes), `avatars` INSERT blocat pentru extern.
4. `cluburi_public_select` expune cif/setari — risc scazut.
5. View-uri `vedere_prezenta_sportiv`/`vedere_istoric_grade_sportiv` trecute pe security_invoker (36-08): consumatorii interni netestati in browser.
6. Cheie localStorage `phi-hau-active-role-context-id` comuna intre login extern si portal (T-36-31).
