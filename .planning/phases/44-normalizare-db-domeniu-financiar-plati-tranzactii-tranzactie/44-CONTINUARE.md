Continuăm Faza 44 (normalizare DB domeniu financiar) din portal-phihau. Context în repo, nu presupune nimic din conversația veche.

CITEȘTE ÎNTÂI:
- .planning/phases/44-normalizare-db-domeniu-financiar-plati-tranzactii-tranzactie/44-CONTEXT.md (decizii LOCKED D-01..D-04 + reguli de siguranță)
- .planning/audit-normalizare-db-20261117.md (auditul read-only al schemei)
- memory: feedback_normalizare_db_si_refactor.md
- planurile 44-01..44-11-PLAN.md din același folder

STARE LA CLEAR (17.11.2026):
- Regula "3NF + excepții justificate" e în CLAUDE.md (commit local ce1620b6, NEPUSH) și în memory.
- Audit făcut. Faza 44 adăugată în ROADMAP și STATE.md. 11 planuri în 8 valuri, scrise de gsd-planner, NECOMISE.
- Plan-checker iterația 1: 1 BLOCKER + 8 WARNING. Planner-ul a REVIZUIT toate cele 9 puncte (terminat 17.11.2026). Revizia NU a fost re-verificată de checker (iterația 2 pornită la sfârșitul sesiunii; rezultatul poate fi pierdut la clear).
- Fix-ul RLS pentru grupe (SPORTIV citește propria grupă) e deja pe origin/main (5ec49958). Main-ul local diverge: are Faza 43 auth nepusă (22 commit-uri) + duplicate ale hotfix-urilor auth. NU da push pe tot main-ul; Faza 43 e nefinalizată.

PRIMUL PAS: verifică dacă revizia s-a aplicat. Caută în planuri:
1. 44-03 migrarea B: rollback șterge doar id-urile scrise în header (nu "not in backup").
2. 44-09 migrarea d: valorile pre-apply ale suma_ramasa obligatorii în header; opțiunea `neachitat` scoasă din 44-07 și 44-09 (nu se face UPDATE pe plati.status).
3. 44-06 și 44-08 au precondiția "migrarea B aplicată, altfel STOP"; Task 3 din 44-06 mutat în 44-08.
4. 44-10: gate de cod pe toate directoarele + supabase/functions; 44-01 și 44-11 citesc și edge functions deployate.
5. SC-03 în 44-07 marcată "propunere, neconfirmată".
Dacă lipsesc, aplică-le cu gsd-planner (revizie), apoi rulează din nou gsd-plan-checker (max 3 iterații în total, am consumat 1). Rulează frontmatter.validate și verify.plan-structure.

DUPĂ CE CHECKER-UL TRECE:
- Comite planurile + 44-CONTEXT.md + audit + STATE.md/ROADMAP.md cu `git add -f` doar pentru fișierele fazei (arborele de lucru are modificări fără legătură; nu le include). NU da push.
- NU executa nimic și NU modifica DB-ul fără să-mi ceri OK. Execuția fazei (/gsd-execute-phase 44) pornește doar la cererea mea, inline (gsd-executor cu worktree eșuează pe Windows).

REGULI PERMANENTE:
- Caveman terse, română pentru domeniu. Raportează ce ai verificat și ce nu.
- Orice migrare: rollback scris, fără CASCADE, `git add -f supabase/migrations`, verificare live pg_policies/triggere.
- Live doar cu OK explicit; datele reale sunt cele ale celor 7 cluburi (auditul a numărat și cele de test).
- Code review separat pe diff înainte de "gata", fără fix-uri din review aplicate fără OK-ul meu.
