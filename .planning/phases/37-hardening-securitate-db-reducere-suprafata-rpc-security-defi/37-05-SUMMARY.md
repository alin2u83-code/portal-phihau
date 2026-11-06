# 37-05 SUMMARY — Val 2/2: garzi pe functiile cu date de sportivi/examen (6.11.2026)

## Aplicat live
- `20261107d_garzi_functii_date_sportivi.sql` (MCP `garzi_functii_date_sportivi`): garda 42501 pe `adauga_sportiv_complet`, `process_exam_row_v4`, `export_sportivi_selectati` (tip reparat cu `::text` + garda per id + limita 1000 + `ids_invalide`/`prea_multe_ids`), `decrypt_cnp` (garda in corp, staff), `transfer_sportiv` (acces la clubul VECHI), `add_sms_to_queue` (sportiv apartine clubului + search_path). `get_all_app_data` STEARSA. Rollback: `rollback/37-05-before.sql` (comentarii condensate, semantica identica).
- `20261107e_fix_garzi_bani_review.sql` (fix-uri 37-04 aprobate): club derivat ajunge in INSERT `tranzactii`; garda `generare_factura_examen` inaintea verificarii de grad.
- Allowlist ACL: -1 (`get_all_app_data`); `decrypt_cnp` ramane (view invoker).

## Verificari dependinte
- `decrypt_cnp`: `app.cnp_encryption_key` NESETATA pe live => functia esueaza pentru oricine. View `sportivi_instructor` (security_invoker) o apeleaza doar pentru CNP ne-numerice (1 din 169 randuri); view-ul nu e folosit in cod. Decizie: garda, nu REVOKE.
- `get_all_app_data`: zero apelanti (cod, api, edge, functii, view-uri, cron) => DROP.
- `adauga_sportiv_complet`, `export_sportivi_selectati`, `process_exam_row_v4`: zero apelanti in cod. `process_exam_row_v4` e NEFUNCTIONALA preexistent (`istoric_examene` nu exista) — recomandat DROP (neaplicat, asteapta OK).

## Teste
- ROSU inainte: oricine putea adauga sportiv in orice club; ADMIN@B/INSTRUCTOR@B trageau sportiv din A in B (transfer); add_sms accepta sportiv strain; export dadea 42804. 33/81.
- VERDE: 82/82 (`tests/rls_definer_garzi_date_faza37.ts`), 37-04 55/55, acl 30/30, rls_acces_extern 57/57, aprobare 36/36, competitii_scriere 42/42, fundatie 36/36, flux_taxe_anuale 30/30, tsc curat, Playwright 6/6. `rls_izolare_cross_club_faza25` rosu preexistent (grupa fara sezon). Numaratori neschimbate, reziduuri 0, audit_log efemer curatat de test.

## Review separat (agent-skills:code-reviewer) — fara CRITICAL/HIGH; NEAPLICATE
- MEDIUM migrare d: `transfer_sportiv` — orice ADMIN/INSTRUCTOR al sursei poate muta in orice club; INSTRUCTOR probabil nedorit.
- MEDIUM `decrypt_cnp` — garda "orice staff", nelegata de club; latent (cheie nesetata). Re-verifica cand se seteaza cheia.
- LOW `process_exam_row_v4` — sportiv inexistent/club NULL cade pe `p_club_id`; propus DROP.
- LOW test: `rpcAllowed` pe process_exam_row_v4 = doar garda. LOW TransferModal: dupa transfer, re-citirea sportivului da null (RLS) -> eroare UI preexistenta.
- Verificat: citit garzi/rollback/grep; testele rulate de mine (nu de reviewer). Neverificat de reviewer: definitii live helperi, performanta unnest.

## Browser (6.11.2026, cont test ADMIN_CLUB C.S. Phi Hau, Chrome headless Playwright)
Login (fara MFA in profil nou), selectie rol, Dashboard, Sportivi, Antrenamente, Examene, Competitii, Stagii, Plati, Administrare: ZERO erori de permisiune (JWT authenticated). Doar 401 anon pre-sesiune (get_my_active_clubs nou refuzat anon dupa 37-03, rbv_* ca inainte; app se recupereaza) si 404 /api/alerta-securitate-login (doar dev local). Timeouts 57014 pe sesiuni_examene/vize/istoric (si pe 5.11 seara, preexistent, nu din Faza 37).
NETESTAT in browser: incasare pe factura de test, cautare membru comisie, flux adaugare/transfer sportiv, instructor/sportiv reali, resetare parola, mobil.

## Ce ramane deschis din T-36-37 (RPC)
supabase_admin default ACL (manual); `service_role` respins pe `add_sms_to_queue`/`cauta_utilizatori_comisie` (api/sms.ts); 90 plati Achitat fara tranzactie (preexistent); 351 randuri audit_log de test vechi (nesterse); 37-06..09.
