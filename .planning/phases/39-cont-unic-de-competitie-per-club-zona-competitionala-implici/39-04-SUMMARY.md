---
phase: 39
plan: 04
status: complete
requirements: [D-01, D-02, D-03, D-12, D-14, D-15]
---
# 39-04 SUMMARY — aplicare live etapa 1 + baterie de izolare

**Decizie utilizator (Task 2):** OK explicit prin AskUserQuestion, de doua ori: (1) "Audit catalog intai", (2) "Da, aplica si verifica". Raspunsul nu provine de la un agent.

**Facut**
- Task 1 (executor, commit 92b9fe5): `tests/cont_club_faza39.ts` (8 grupe, cleanup in finally) + linii SUPERSEDED in testele Faza 36. Participarea se seedeaza doar prin `echipe_competitie` (triggerul de taxa anuala de pe inscrieri nu se declanseaza: pe inscrieri se testeaza doar cazuri respinse).
- Audit catalog read-only inainte de aplicare (punctele 1,2,3,8,9 din 39-AUDIT-LIVE.md).
- Task 3 (orchestrator, MCP): aplicate 20261111b si 20261111c pe wuhidifzsutwgdfkwhmd.

**Verificat live**
- `tests/cont_club_faza39.ts`: 40/40 PASS, fara reziduuri.
- Catalog: privilegii, politici, EXECUTE anon, helperi pe conturi_competitie_club, 1 proprietar, D-02 (41/2) neschimbat.
- `tests/acl_definer_faza37.ts`: 28/30 — 2 FAIL PREEXISTENTE (functia trigger `trg_echipe_denumire_implicita()` din 20261110b, definer+authenticated, fara allowlist; self-check cascadeaza). Neinrudite cu faza 39; de triat de utilizator.

**Neverificat:** fluxul UI in browser (zona /competitie, ecranul proprietarului); endpoint HTTP real (testul apeleaza functiile direct); mobil.

**Deviatii:** FORCE RLS apare pe tabelele noi din cauza event trigger-ului `ensure_rls_on_create` (nu din migrari); fara efect, owner postgres are BYPASSRLS. Aplicarea si testele rulate de orchestrator, nu de executor (subagentii nu au MCP Supabase).
