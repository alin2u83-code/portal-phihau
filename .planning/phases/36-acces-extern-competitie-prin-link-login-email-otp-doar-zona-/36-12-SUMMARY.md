---
phase: 36
plan: 12
status: partial
requirements: [ACX-02, ACX-03, ACX-08, ACX-11, ACX-12]
---
# 36-12 SUMMARY — verificare finala (PARTIAL: 1 test UI blocat de defect DB)

## Task-uri
| Task | Rezultat | Commit |
|------|----------|--------|
| 1. Test live aprobare + contract endpoint | PASS, 28/28, reziduuri 0 | dd25fea |
| 2. Spec Playwright pe build de productie | 5/6 PASS; testul 3 (Solicita acces) PICA — defect DB | 9c6cc89 |
| 3. Docs + 36-VERIFICARE.md + verificari finale | PASS (tsc, build, unit teste, rls 57/57, grep-uri) | 19fd903 |

## Defect gasit (nerezolvat, cere migratie DB)
`anon` nu poate citi `cluburi` (0 randuri), deci formularul „Solicita acces" nu poate selecta un club. RPC-ul `trimite_cerere_acces` functioneaza (dovedit in task 1). Fix propus: RPC public `lista_cluburi_publice()` (SQL in `36-VERIFICARE.md`). Codul aplicatiei (`services/accesExternService.ts`) il apeleaza deja, cu fallback pe tabela. Dupa aplicarea migratiei: re-rulare spec UI, test 3.

## Deviatii
- [Rule 1 - test] Asertiunea „ADMIN_CLUB@B vede doar clubul B" inlocuita cu comparatie inainte/dupa aprobare: vizibilitatea interna larga pe `sportivi` (inscrisii la competitii, migrarea 20260507) e preexistenta (31 cluburi vizibile si inainte de aprobare). Nu s-a relaxat nicio verificare pe rolul extern.
- [Rule 3 - test] Spec UI: sesiunea injectata nu se mai reinjecteaza la reload (altfel „Deconectare" parea inoperanta); testele nu mai sunt `serial` ca un esec sa nu ascunda restul.
- [Rule 2 - app] `incarcaCluburiPublice`: incearca RPC-ul public, cade pe tabela.

## Ne-verificat
Email real cu OTP; telefon real (screenshot-ul mobil e Chromium headless redimensionat); inscrierea efectiva din browser; formularul de cerere in browser; endpoint prin Vercel; consumatorii interni ai view-urilor `security_invoker`; code review separat pe diff.

## Riscuri reziduale
Integral in `36-VERIFICARE.md` (include HIGH: ~170 RPC SECURITY DEFINER apelabile de orice authenticated; MEDIUM: `sportivi` cu toate coloanele, inclusiv cnp/adresa, pentru clubul din grant).

ROADMAP: `update-plan-progress` NU s-a rulat (nu toate task-urile au trecut).

## Self-Check: PASSED (fisiere si commit-uri prezente)
