# Faza 39 — Audit LIVE (read-only)

Proiect: wuhidifzsutwgdfkwhmd. Data: 2026-11-11. GDPR: doar nume de obiecte si numaratori, fara date personale.

**ATENTIE (acoperire partiala):** uneltele MCP Supabase (`execute_sql`) NU au fost disponibile executorului. Au fost rulate doar citiri PostgREST read-only cu service role (SELECT/count pe tabele). Interogarile pe catalog (`pg_policies`, `pg_proc`, `pg_default_acl`, `pg_trigger`) NU au putut fi rulate: sectiunile (1), (2), (3), (8), (9) sunt marcate **NERULAT** si trebuie rulate inainte de 39-04 (interogarile sunt date mai jos). Nu s-a rulat niciun DDL/DML.

**Granturi legacy:** 0 granturi active (0 total) in `acces_competitie_extern` -> nimeni nu pierde accesul la aplicarea 20261111c (T-39-07 nu se materializeaza).

## Etapa 1

### (1) Politici live care folosesc helperii / acces_competitie_extern — NERULAT pe live
Din repo (20261106b/c): politicile ext_p_*, ext_r_*, ic_r_scope_*, ec_r_scope_* si cele din 20261106b folosesc doar helperii `acces_extern_competitie`, `acces_extern_la_competitie`, `acces_extern_la_club`, `acces_extern_la_sportiv`, `acces_extern_sportiv_competitie`. Singura referinta la tabela `acces_competitie_extern` in politici este in lista de tabele a restrictivelor `ext_r_acces_competitie_extern_ins/upd/del` (zero scriere pentru extern). De confirmat live:
```sql
SELECT schemaname, tablename, policyname, cmd, permissive
FROM pg_policies
WHERE qual ILIKE '%acces_extern_%' OR with_check ILIKE '%acces_extern_%'
   OR qual ILIKE '%acces_competitie_extern%' OR with_check ILIKE '%acces_competitie_extern%'
ORDER BY 2,3;
```

### (2) Functii care citesc direct acces_competitie_extern — NERULAT pe live
Din repo: citesc tabela doar cele 5 helperi `acces_extern_*` (rescrisi in 20261111c) si, in vechea 20261111b (neaplicata, eliminata acum), RPC-urile per grant. `vize_club_competitie` apeleaza `acces_extern_competitie` (helper), deci trece automat pe modelul de club. Cod client care citeste tabela: `services/accesExternService.ts:48`, `components/Competitii/CereriAccesAdmin.tsx:75,193`, `api/_aprobaCerereAcces.ts` (de adaptat in 39-02/39-03). De confirmat live:
```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosrc ILIKE '%acces_competitie_extern%';
```

### (3) Corpuri live ale celor 5 helperi + este_doar_extern — NERULAT
```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('acces_extern_competitie','acces_extern_la_competitie','acces_extern_la_club',
  'acces_extern_la_sportiv','acces_extern_sportiv_competitie','este_doar_extern');
```
Indiciu indirect: toate 5 exista in allowlist-ul ACL (`tests/acl_definer_faza37.allowlist.json`, snapshot 20261107a), deci sunt aplicate live; si tabelele `acces_competitie_extern` / `cereri_acces_competitie` raspund la PostgREST (aplicat 20261106a).

### (4) Granturi si cereri
- `acces_competitie_extern`: 0 active, 0 total.
- `cereri_acces_competitie`: in_asteptare = 0, aprobata = 0, respinsa = 0.

### (5) Statusuri competitii (live)
`finalizata` = 3, `inscrieri_deschise` = 2 (5 competitii; niciun `draft` / `inscrieri_inchise` in prezent). Setul din cod ('draft','inscrieri_deschise','inscrieri_inchise','finalizata') e consistent cu live.

### (6) Existenta obiectelor noi (asteptat: lipsa — 20261111b/c neaplicate)
- `proprietari_aplicatie`: PGRST205 (tabela lipsa) — OK.
- `conturi_competitie_club`: PGRST205 (tabela lipsa) — OK.
- `este_proprietar()`: PGRST202 (functie lipsa) — OK.

### (7) Baza D-02 (rolurile existente care NU trebuie modificate)
- ADMIN_CLUB = 41
- INSTRUCTOR = 2
- REPREZENTANT_COMPETITIE = 0
(dupa aplicare, aceste numere trebuie sa ramana identice)

### (8) Privilegii implicite pe tabele noi (pg_default_acl) — NERULAT
```sql
SELECT defaclrole::regrole, defaclobjtype, defaclacl FROM pg_default_acl
WHERE defaclnamespace = 'public'::regnamespace;
```
Pentru `conturi_competitie_club`, migrarea face explicit `REVOKE ALL ... FROM PUBLIC, anon, authenticated` apoi `GRANT SELECT TO authenticated`, `GRANT ALL TO service_role`, deci rezultatul nu depinde de default ACL. De verificat post-aplicare (39-04) cu `has_table_privilege`.

### (9) Triggere pe inscrieri_competitie / echipe_competitie — NERULAT
```sql
SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal AND c.relname IN ('inscrieri_competitie','echipe_competitie');
```
Cunoscut din 36-AUDIT-LIVE (DEC-9): `trg_activeaza_taxa_anuala` pe INSERT in `inscrieri_competitie`; trigger de audit pe `inscrieri_competitie`. De verificat daca vreunul creeaza plati/facturi inainte de testul live din 39-04.

## Etapa 1 — dupa aplicare (11.11.2026)

OK explicit al utilizatorului (AskUserQuestion, "Da, aplica si verifica") dupa auditul catalog. Aplicate cu MCP apply_migration pe wuhidifzsutwgdfkwhmd: 20261111b, apoi 20261111c.

### Audit catalog (inainte de aplicare, read-only) — punctele NERULAT din etapa 1
- (1) Politici care folosesc helperii: doar ext_p_*, ext_r_*, ic_r_scope_*, ec_r_scope_*, es_r_scope_* (12 tabele). Nicio politica nu citeste direct acces_competitie_extern.
- (2) Functii care citesc acces_competitie_extern: exact cele 5 helperi acces_extern_* (semnaturi confirmate).
- (3) Toti 5 helperii SECURITY DEFINER, search_path public,pg_catalog; corpurile live = cele din 20261106a/c (rollback valid).
- (8) pg_default_acl: tabelele noi din public primesc implicit drepturi complete pentru anon+authenticated -> REVOKE-ul explicit din migrare e necesar (verificat dupa aplicare).
- (9) Triggere: inscrieri_competitie = audit_inscrieri_competitie, trg_taxa_anuala_inscrieri_competitie (apeleaza activeaza_taxa_anuala(sportiv)), trg_extern_protejeaza_inscrieri, trg_inscrieri_sportiv_in_club; echipe_competitie = trg_echipe_denumire_implicita, trg_extern_protejeaza_echipe. Niciunul pe echipe nu creeaza plati.

### Verificari catalog dupa aplicare
- Tabele existente: conturi_competitie_club, proprietari_aplicatie. Politici pe conturi_competitie_club: doar ccc_select_propriu, ccc_select_proprietar (SELECT, authenticated).
- anon: 0 drepturi pe ambele tabele; authenticated: SELECT pe conturi_competitie_club, 0 pe proprietari_aplicatie; service_role: ALL.
- anon fara EXECUTE pe toate cele 8 functii noi/rescrise; authenticated cu EXECUTE.
- 4 din 5 helperi citesc conturi_competitie_club; al 5-lea (sportiv_competitie) deleaga catre ceilalti. 0 referinte la acces_competitie_extern in helperi.
- proprietari_aplicatie = 1 rand. D-02: ADMIN_CLUB=41, INSTRUCTOR=2 (identic cu baza).
- NOTA FORCE: relforcerowsecurity = true pe ambele tabele noi, desi migrarile nu il seteaza. Cauza: event trigger live `ensure_rls_on_create`. Proprietarul functiilor (postgres) are BYPASSRLS, deci SECURITY DEFINER merge: este_proprietar() = true cu JWT-ul proprietarului (verificat). Comentariul despre FORCE din 20261111b e depasit.

### Teste
- `npx tsx tests/cont_club_faza39.ts`: 40/40 PASS, exit 0, fara reziduuri (plati/vize noi = 0).
- `npx tsx tests/acl_definer_faza37.ts`: 28/30. 2 FAIL, ambele din aceeasi cauza, PREEXISTENTE si NEAFILIATE fazei 39: functia `trg_echipe_denumire_implicita()` (migrarea 20261110b) e SECURITY DEFINER, executabila de authenticated si lipseste din allowlist; self-check-ul de sensibilitate numara astfel 2 detectii in loc de 1. De triat de utilizator (REVOKE EXECUTE ... FROM authenticated pe o functie trigger, sau adaugare in allowlist). Nu s-a modificat nimic live.
