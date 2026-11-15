# Faza 38 — Context (decizii luate 15.11.2026)

Sursa: 38-DIAGNOSTIC-20261115.md (măsurat) + 38-RESEARCH.md (cauze, valuri, probe de non-lărgire RLS). Decizii de produs luate de utilizator în chat.

## Obiectiv
Login și pornire fără "Eroare de Sistem" (statement timeout 8 s), inclusiv ca SUPER_ADMIN_FEDERATIE (azi nu pornește deloc), cu 3500 sportivi; pagina MFA apare imediat.

## Decizii blocate
- D-01 Încărcare la cerere: interogările grele (plăți, taxe, istoric plăți/grade) se încarcă doar când se deschide pagina care le folosește, nu la pornire. Pornirea încarcă doar esențialul (rol/context, sportivi club, grupe).
- D-02 MFA gate: datele de pornire se încarcă abia după ce MFA e trecut; ecranul MFA nu concurează cu ~35 de cereri.
- D-03 Prezență: fereastră implicită la pornire (ultimele 90 zile + următoarele 30); istoricul complet se cere explicit din rapoarte; liste `.in(ids)` pe bucăți (evită URL enorm).
- D-04 FĂRĂ ridicare temporară de statement_timeout; se repară cauza (nicio ALTER ROLE live).

## Constrângeri (din proiect/cercetare)
- Orice modificare RLS trebuie dovedită ne-lărgitoare: amprentă per utilizator+context (`count(*)` + `md5(string_agg(id))` înainte/după), matrice SUPER_ADMIN, 2×ADMIN_CLUB, INSTRUCTOR, SPORTIV, extern, multi-rol, comisie; suitele `tests/rls_*.ts` și `acl_definer_faza37` ca poartă de regresie.
- Nu se mută în funcții DEFINER subinterogările EXISTS pe `inscrieri_competitie`/`echipa_sportivi` din politica sportivi (ar lărgi accesul INSTRUCTOR/SPORTIV). `ext_r_deny_all` nu se atinge, doar se măsoară.
- `CREATE OR REPLACE VIEW` resetează security_invoker; materialized views ocolesc RLS; verificare live a politicilor (pg_policies), nu doar migrări (Faza 25).
- Subagenții nu au Supabase MCP: măsurătorile/aplicările live (Wave 0 L1–L10, EXPLAIN E0–E6 în BEGIN..ROLLBACK, migrări) se fac de orchestrator, aplicarea live doar cu OK explicit.
- Fără librării noi; limitator de concurență ~15 linii.
- Corecție diagnostic: `vedere_sportivi_detaliat_mv` NU e interogat de aplicație; e un job pg_cron `refresh-dashboard-sportivi` care eșuează (30-01-SUMMARY.md) → `cron.unschedule` după verificare că nimic nu-l citește.

## Valuri propuse (din cercetare)
- Wave 0 (fără schimbări): verificări live + EXPLAIN pentru a măsura plafonul fiecărui fix; clarificare "current transaction is aborted" la SUPER_ADMIN (L10).
- Wave 1 (doar front-end, risc RLS zero): decuplare attendance din `loading`/`error` (nu mai doboară toată aplicația), guard `enabled` pe useSportivi/usePlati, fără retry pe 57014 și `retry: 1`, fără `count:'exact'` fără paginare, limitator de concurență, lazy load (D-01), gate MFA (D-02), fereastră prezență (D-03), `processSettledQueries` nu mai suprascrie date cu `[]` la eroare.
- Wave 2 (DB, rezultate identice): pre-agregare count în `vedere_cluburi_program_antrenamente`, `@>` + GIN pe `tranzactii.plata_ids`, indexuri (după verificare live), unschedule cron.
- Wave 3 (doar dacă după 0–1 RLS rămâne dominant): `(select fn())` pe funcțiile fără argumente, helperi set-based `col = ANY(ARRAY(select ...))`.
