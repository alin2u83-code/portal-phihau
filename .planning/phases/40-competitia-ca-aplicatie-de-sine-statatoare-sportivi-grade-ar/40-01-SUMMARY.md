# 40-01 SUMMARY

Status: DONE (migrari scrise, NEAPLICATE live; aplicarea = 40-02, cere OK).

## Livrat
- supabase/migrations/20261112a_deadline_inscrieri_obligatoriu.sql (backfill + NOT NULL + CHECK deadline <= data_inceput)
- supabase/migrations/20261112b_schimbari_grad_competitie.sql (tabel + RLS select-only + 4 RPC definer)
- components/Competitii/CompetitieForm.tsx: deadline required, max=data_inceput, validare cu showError
- components/Competitii/MigrareModal.tsx: trimite deadline_inscrieri
- types.ts: SchimbareGradCompetitie, PrevizualizareSchimbareGrad
- tests/acl_definer_faza37.allowlist.json: +4 semnaturi

## Step 0 live (phi-hau-db wuhidifzsutwgdfkwhmd, read-only, 13.11.2026)
- postgres.rolbypassrls = true -> definer poate scrie in tabele FORCE RLS
- FORCE RLS: audit_log, competitii, istoric_grade, sportivi = true
- istoric_grade: ext_r_deny_all RESTRICTIVE ALL prezent; Staff_Full_Access etc. neatinse (todo separat)
- is_super_admin() = rol SUPER_ADMIN_FEDERATIE pe contextul din header
- Date live pt 20261112a: 2 competitii deadline NULL, 1 cu deadline > data_inceput, 0 fara data_inceput
- status competitii: finalizata, inscrieri_deschise; echipe: inscrisa/retrasa; inscrieri: inscris

## Verificat / neverificat
- tsc: 0 erori in types.ts, CompetitieForm, MigrareModal
- SQL NEexecutat (doar scris); testele RPC vin in 40-02
