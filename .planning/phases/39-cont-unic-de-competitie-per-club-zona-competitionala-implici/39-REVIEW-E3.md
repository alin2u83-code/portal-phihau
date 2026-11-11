# 39-REVIEW-E3 — Revizuire etapa 3 + stare finala faza 39
Revizor: agent separat feature-dev:code-reviewer (doar citire cod). Niciun fix aplicat.

## Findings
| ID | Sev | Fisier:linie | Descriere | Fix propus |
|----|-----|--------------|-----------|-----------|
| E3-1 | MEDIE (decizie de design) | 20261111e:68-78 + 20261106a:110-115 | `este_doar_extern()` e true doar daca userul NU are alt rol decat REPREZENTANT, indiferent de contextul activ. Dupa `acorda_management_cont_club` contul devine "nu doar extern": (1) garda de autor din audit_trigger_fn nu se mai aplica; (2) restrictivele `ext_r_*` devin permisive pentru el. Cat timp clubul are management, un request cu contextul REPREZENTANT scrie fara sesiune de autor -> in audit apare contul comun, fara persoana. | (a) garda depinde de contextul activ din header (rol REPREZENTANT) in loc de este_doar_extern(); SAU (b) se accepta si se documenteaza in docs/roluri-permisiuni.md ca managementul dezactiveaza atribuirea per persoana |
| E3-2 | MICA | api/_contCompetitieClub.ts:194-195 | La esec `delete` pe rolul vechi: log + `true`, fara avertisment. Userul vechi (banat) ramane cu ADMIN_CLUB (JWT valid pana expira); proprietarul nu e avertizat | `avertismente.push('rol_vechi_ramas')` / retry la delete |
| E3-3 | MICA | api/_contCompetitieClub.ts:243-246 | Daca `mutaManagement` esueaza, grantul ramane pe user_id vechi (banat), UI arata "acordat". Avertismentul exista in UI; fara pierdere de date | optional: `management_cont_club_stare` marcheaza granturile cu user_id != contul curent |

## Baterii (starea finala, DB live phi-hau-db)
tsc 0 erori; vite build OK; teste pure (accesExtern, _contCompetitieClub, _aprobaCerereAcces) PASS; cont_club_faza39 45/45; autor_modificari_faza39 33/33; acl_definer_faza37 28/30 (2 FAIL preexistente PRE-1: trg_echipe_denumire_implicita + self-check cascadat). D-02 live: ADMIN_CLUB=41, INSTRUCTOR=2 (identic cu baza), 0 granturi, 0 conturi club, 0 REPREZENTANT.

## Findings amanate din etapele anterioare
E1: toate reparate (PRE-1 amanat, preexistent). E2: toate reparate, "NOTA tip" (SesiuneActor declara user_id/ultima_activitate pe care RPC nu le intoarce) amanata, fara efect la rulare.

## Artefacte consolidate
Vezi lista din 39-16-PLAN.md <objective>; adaosuri fata de plan: migrari 20261111c2 (istoric doar citire), d2 (audit_log fara insert extern), d3 (garda autor + sesiune glisanta), e (management).

## Verificat
Revizor: garzile RPC management, revocare exacta pe rol_row_id, concurenta acordare, ordinea mutaManagement, zona demo fara citiri reale, trecere demo->real, MFA, mapare erori UI proprietar.
Orchestrator: bateriile de mai sus.
## Neverificat
Browser/mobil (toate ecranele noi: lista competitii, "Cine lucreaza?", jurnal, Conturi cluburi, Management club/demo); calea pozitiva acorda/revoca si mutarea managementului la schimbare email (0 conturi pilot live); OTP real pe email, SMTP 32-08; bateriile Faza 36 (model inlocuit); `rol_id` la acorda (presupus default/trigger; testele live n-au acoperit calea pozitiva); corpul live audit_trigger_fn (confirmat de orchestrator: contine garda cu este_doar_extern()).

## Decizie utilizator
Utilizator (11.11.2026): "Toate, E3-1 prin context activ".
Status: APLICAT 11.11.2026 (vezi "Fix-uri aplicate" mai jos).
- E3-1: garda de autor din audit_trigger_fn sa depinda de contextul activ din header (REPREZENTANT), nu de este_doar_extern() -> migrare noua (aplicare doar cu OK separat). Nefacut.
- E3-2: avertisment/retry la esec delete rol vechi (api/_contCompetitieClub.ts:194-195). Nefacut.
- E3-3: marcaj grant cu user_id vechi. Nefacut.
Lipsesc si: 39-16-SUMMARY, verificare umana in browser + pilot, actualizare STATE/ROADMAP.

## Fix-uri aplicate (11.11.2026)
- E3-1: migrarea 20261111f (garda dupa contextul activ) aplicata live, apoi INLOCUITA de 20261111g dupa review: varianta f era fail-open (header lipsa/alt uuid sarea garda, H1). g: `context_activ_este_management_club()`, garda sare doar daca header-ul dovedeste rol ADMIN_CLUB/INSTRUCTOR al utilizatorului pe clubul contului; fara grant pentru authenticated; functia din f stearsa (H2); cast sigur (M1).
- E3-2: `mutaManagement` face un retry la stergerea rolului vechi si intoarce `rolVechiRamas` -> avertisment `rol_vechi_ramas` in UI. M2 (curatare rol vechi ramas, `revoca` nu-l sterge) NEFACUT, amanat.
- E3-3: `management_cont_club_stare()` intoarce `user_vechi`; badge in Conturi cluburi.
- Review separat pe diff (feature-dev:code-reviewer): H1, H2, M1 reparate; M2 amanat.
- Teste: autor_modificari_faza39 39/39 (G1-G6 noi: fara header, uuid strain, header invalid, REPREZENTANT, management ADMIN, REPREZENTANT cu management); cont_club_faza39 45/45; tsc 0 erori; acl_definer_faza37: doar PRE-1 preexistent.
- Ramas deschis: restrictivele ext_r_* si inserarea in audit_log devin permisive pentru un cont cu management chiar in contextul REPREZENTANT (documentat in docs/roluri-permisiuni.md); decizie de design a utilizatorului.
- Neverificat: UI in browser (badge user_vechi, mesaj rol_vechi_ramas), calea pozitiva reala acorda/revoca/mutare la schimbare email, H1..H10 verificare umana (de facut de utilizator), 39-16-SUMMARY, STATE/ROADMAP.
