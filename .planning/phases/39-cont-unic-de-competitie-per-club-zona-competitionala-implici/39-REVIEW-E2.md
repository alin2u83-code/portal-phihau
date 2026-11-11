# 39-REVIEW-E2 — Revizuire etapa 2 (39-08..39-11)
Revizor: agent separat feature-dev:code-reviewer (doar citire cod). Niciun fix aplicat.

## Findings
| ID | Sev | Fisier:linie | Descriere | Fix propus |
|----|-----|--------------|-----------|-----------|
| E2-1 | MEDIE | services/autorModificariService.ts:25-29; components/CompetitieExterna/index.tsx:91-101,118 | `sesiuneActorCurenta()` da data:null si pe eroare RPC (retea/token); la refetch esuat (focus/5 min) CompetitieDetail se demonteaza, wizardul pierde formularul, apare dialogul | `if (error) throw error` in queryFn (React Query pastreaza ultimul data) |
| E2-2 | MEDIE | 20261111d:116,175-182; index.tsx:91-100,118 | Expirarea 4h se reimprospateaza doar prin scrieri auditate; cine lucreaza ore in formular fara salvare pierde munca la expirare | dialog PESTE continut (nu demonta CompetitieDetail); optional `sesiune_actor_curenta` reimprospateaza activitatea |
| E2-3 | MEDIE | 20261111d:276 (politica audit_log_select_jurnal_club), :170-189 | Scriere a contului de club fara sesiune valida (API direct/expirat) -> rand cu actor_nume NULL, invizibil pentru ADMIN_CLUB/instructor (doar super admin). Cele mai suspecte scrieri lipsesc din jurnalul clubului | marcheaza `actor_nume='(fara autor)'` cand cont_club_curent() nu e null, SAU politica vede si randurile contului clubului; (alt fix: refuza scrierea fara sesiune - mai strict, in linie cu "doar cei cu cont") |
| E2-4 | MICA | index.tsx:69-72,100; service:31-35 | Inchiderea sesiunii best effort; tab inchis fara Deconectare lasa sesiunea 4h; alt om pe contul comun nu primeste dialog si lucreaza sub numele precedentului | reconfirmare autor la intrarea in competitie ("Lucrezi ca X?" Da/Schimba) sau inchide sesiunea la login |
| NOTA | info | tipuri | `SesiuneActor` declara user_id/ultima_activitate pe care RPC nu le intoarce; fara efect la rulare | aliniaza tipul |

## Verificat
Revizor: audit_trigger_fn vs textul live (format, rand_id tolerant, STRICT INTO sigur, EXCEPTION pe sesiune, performanta), deschide_sesiune_actor (validari, anti-spoof), RLS audit_log (fara scurgere cross-club; d2 inchide insert direct), reguli hooks, logout normal.
Orchestrator: coloane utilizator_roluri_multicont live = id,user_id,rol_denumire,club_id,sportiv_id,is_primary,created_at,nume_utilizator_cache,rol_id (fara email/telefon -> politica urm_cont_club_vede_staff nu expune date de contact). Teste: autor_modificari 33/33, cont_club 40/40, acl_definer 28/30 (preexistent).
## Neverificat
Browser/mobil (dialog "Cine lucreaza?", tab jurnal); triggere BEFORE INSERT pe audit_log; contradictia BYPASSRLS vs FORCE din 39-08 (rezolvata empiric de bateria live); date_noi (istoric_grade.observatii) citibil de ADMIN_CLUB al clubului prin API (datele lui proprii, nu cross-club).

## Decizie utilizator
(in asteptare)
