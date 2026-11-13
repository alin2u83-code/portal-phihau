# 40-02 SUMMARY

Decizie utilizator (13.11.2026): **apply-both**. Migrari 20261112a + 20261112b APLICATE LIVE pe phi-hau-db.

## Post-checks live
- competitii cu deadline NULL/dupa start: 0; deadline_inscrieri is_nullable = NO
- schimbari_grad_competitie: relforcerowsecurity = false; politici exact sgc_select_club (SELECT), sgc_select_federatie (SELECT)
- anon EXECUTE = false pe toate 4 functiile

## Baterie tests/grade_competitie_faza40.ts: 27/27 PASS
Acopera: anon, fara sesiune, echivalare, audit cu autor, cross-club (A->B si B->A), +1, timp, varsta, grad vechi in UI, undo in/dupa fereastra, undo cand nu mai e ultimul, achitat doar federatie, scrieri directe refuzate, constrangere deadline, rol REPREZENTANT lipsa.
Deviere: CLUB_B in test = He Pai Suceava (80c0bd76...), deoarece C.S. Phi Hau (cbb0b228) are cont real de competitie din pilotul Faza 39 (testul aborta corect). Reziduuri 0; 10 randuri audit_log raman (fara DELETE).

## Fixturi reparate (efect NOT NULL)
tests/acces_extern_aprobare_faza36, acces_extern_fundatie_faza36, autor_modificari_faza39, cont_club_faza39, rls_acces_extern_faza36, rls_competitii_scriere_faza36, ui_acces_extern_faza36.spec: deadline_inscrieri nu mai e NULL. scripts/import_cn_copii_2025.ts (gitignored) primeste deadline. NERULATE (doar modificate).

## ACL test tests/acl_definer_faza37.ts: 28/30
Cele 4 functii noi NU apar ca noi. 2 FAIL PRE-EXISTENTE, nelegate de Faza 40:
- noi=trg_echipe_denumire_implicita() (migrarea 20261110b, Faza 39) expusa authenticated, nepusa in allowlist
- self-check sensibilitate (tinta acces_extern_competitie) - neinvestigat
Neremediat (decizia ramane a userului).
