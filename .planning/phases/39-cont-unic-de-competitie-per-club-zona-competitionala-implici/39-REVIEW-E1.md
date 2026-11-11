# 39-REVIEW-E1 — Revizuire etapa 1 (planuri 39-01..39-06)

Revizor: agent separat feature-dev:code-reviewer (citire directa fisiere, fara shell/DB). Niciun fix aplicat.

## Findings

| ID | Severitate | Fisier:linie | Descriere | Fix propus |
|----|-----------|--------------|-----------|-----------|
| E1-1 | HIGH (medium daca un trigger live blocheaza) | supabase/migrations/20261111c_cont_competitie_club.sql:51-74 (+ politici 20261106c:48-54); components/CompetitieExterna/index.tsx:226 | "Doar citire" pe istoric e doar badge UI. `acces_extern_competitie` include competitiile TERMINATE cu participare; politicile `ext_p_inscrieri_competitie_ins/upd/del` si `echipe_competitie` verifica doar acest helper -> REPREZENTANT_COMPETITIE poate modifica/sterge (daca `taxa_achitata` false) inscrieri/echipe pe competitii finalizate direct prin API. UI ignora `istoric` in `onAlege`; CompetitieDetail fara flag read-only. NEVERIFICAT live daca un trigger (ex. `ic_r_scope_*`) blocheaza. | (a) migrare noua: `NOT competitie_terminata(competitie_id)` / `competitie_deschisa_inscrieri` in politicile de scriere ext_p_*; (b) UI: transmite `istoric`, CompetitieDetail read-only in modul extern |
| E1-2 | LOW | api/_aprobaCerereAcces.ts:103-107 | Daca `creeazaContClub` reuseste dar `marcheaza(aprobata)` esueaza: cerere ramane `in_asteptare`, retry -> 409 "Clubul are deja cont". | Retry o data pe `marcErr` sau mesaj explicit |
| E1-3 | LOW | 20261111c:102-104 (+ allowlist) | `competitie_vizibila_cont_club(uuid,uuid)` SECURITY DEFINER apelabila de orice `authenticated`: oracol "clubul X a participat la competitia Y terminata". Fara PII. | REVOKE de la authenticated (dupa verificare ca nicio politica n-o apeleaza direct) |
| PRE-1 | LOW (preexistent) | tests/acl_definer_faza37.ts | 28/30: `trg_echipe_denumire_implicita()` (20261110b) definer+authenticated fara allowlist; self-check cascadeaza. Nelegat de faza 39. | triaj separat |

## Verificat
- `npx tsc --noEmit`: 0 erori.
- `npx vite build`: OK.
- Teste pure (accesExtern, _contCompetitieClub, _aprobaCerereAcces): toate PASS.
- `tests/cont_club_faza39.ts` live: 40/40, fara reziduuri.
- `tests/acl_definer_faza37.ts` live: 28/30 (vezi PRE-1).
- Revizor (citire cod): auth endpoint (auth inainte de orice, proprietar fail-closed), rollback creare/schimbare email, email existent -> 409, SQL definer cu search_path fix + REVOKE anon/PUBLIC, apelanti construiesteContexte/incarcaContexteEligibile (unul singur), D-02 pastrat, hooks ConturiCluburiProprietar, clasificare SQL = client.

## Neverificat
- Browser / UI zona /competitie si ecran proprietar; mobil.
- OTP real pe email; SMTP 32-08.
- Politici `ic_r_scope_*`/`ec_r_scope_*`, `este_doar_extern()`, grant-uri `user_id_dupa_email` (exista doar live, neinterogate de revizor).
- E1-1: efectiv exploatabil live? (necesita test cu cont REPREZENTANT pe competitie terminata).
- `relforcerowsecurity` pe tabela noua; `useEsteProprietar` staleTime Infinity la logout/login fara reload (doar afisare, serverul refuza).

## Poarta etapa 2
cont_club_curent() aplicata live: 39-04 a aplicat migrarile (baterie 40/40 il confirma). De reverificat explicit cu `to_regprocedure` la reluare.

## Decizie utilizator
Utilizator: "Toate (E1-1..3)" (11.11.2026).

| ID | Status |
|----|--------|
| E1-1 | reparat in cod: migrare `20261111c2_istoric_doar_citire_extern.sql` scrisa (APLICATA live 11.11.2026 dupa OK; politici ext_p_* confirmate in pg_policies) + UI `poateInscrie` fals pe istoric in `components/Competitii/index.tsx` |
| E1-2 | reparat: un retry `marcheaza` in `api/_aprobaCerereAcces.ts` |
| E1-3 | reparat in migrarea c2 (REVOKE authenticated) + intrare scoasa din `tests/acl_definer_faza37.allowlist.json`; efectiv doar dupa aplicare |
| PRE-1 | amanat (preexistent, triaj separat) |

Re-verificat dupa fix: tsc 0 erori; 3 teste pure PASS. NEreverificat: migrarea c2 pe DB live, acl_definer (allowlist e desincronizat pana la aplicare), UI browser.

## Post-aplicare c2
cont_club_faza39: 40/40. acl_definer_faza37: 28/30 (doar PRE-1 + self-check cascadat; intrarea competitie_vizibila_cont_club nu mai pica). Netestat: scriere reala REPREZENTANT pe competitie terminata, browser.
