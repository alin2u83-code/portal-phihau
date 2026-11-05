---
phase: 37
plan: 01
status: complete
requirements: [SEC-37-V0]
---
# 37-01 SUMMARY — plasa de regresie ACL (Val 0a)

## Livrat
- Migrare `20261107a_acl_functii_snapshot.sql` aplicata live: `acl_functii_snapshot()` SECURITY INVOKER, doar service_role (anon=false, authenticated=false, service_role=true).
- `tests/acl_definer_faza37.ts` + `acl_definer_faza37.allowlist.json` (baseline: anon=25, authenticated=131, plus prefix exceptie `scoala_ioncreanga_`). Test 7/7 PASS, self-check mutatie detectat.
- Snapshot live: 223 functii, 177 definer (59 anon, 165 authenticated) = cifrele din inventar.

## Baseline regresie (inainte de orice schimbare de permisiuni)
| Test | Rezultat |
|---|---|
| rls_acces_extern_faza36 | 57/57 |
| acces_extern_aprobare_faza36 | 36/36 |
| rls_competitii_scriere_faza36 | 42/42 |
| acces_extern_fundatie_faza36 | 36/36 |
| playwright ui_acces_extern_faza36 | 6/6 |
| tsc --noEmit | OK |
| rls_izolare_cross_club_faza25 | ROSU PRE-EXISTENT: pica la setup ("Grupa ... nu are sezon asignat"), nu e legat de ACL; nereparat aici |

## Review separat (agent-skills:code-reviewer) — 0 CRITICAL, 0 HIGH
- MEDIUM `tests/acl_definer_faza37.ts:104-109`: intrari invechite in allowlist doar INFO -> ratchet se poate redeschide tacit dupa REVOKE (fix propus: FAIL).
- MEDIUM `tests/acl_definer_faza37.ts:63-77`: `--write-baseline` poate whitelist-ui tacit o functie noua (fix propus: refuz de crestere / `--allow-grow`).
- LOW `allowlist.json` `anon_obligatoriu` gol (check trece pe gol; de populat in 37-03 cu lista_cluburi_publice, get_competitie_publica, trimite_cerere_acces).
- LOW `.ts:59,71` prefixe nevalidate (`''` ar inghiti tot).
- LOW `.ts:116-125` self-check doar pe authenticated; nu se verifica snapshot-ul pentru authenticated.
- LOW limita PostgREST 1000 randuri; extensii excluse global; doar SECURITY DEFINER in scope.
Fix-urile NU sunt aplicate (necesita OK utilizator).

## Verificat / Neverificat
Verificat: migrare live, ACL functie, test verde pe live, suita de regresie de mai sus, review static.
Neverificat: browser (nu era nevoie), fix-urile din review, faza25 (rosu pre-existent).
