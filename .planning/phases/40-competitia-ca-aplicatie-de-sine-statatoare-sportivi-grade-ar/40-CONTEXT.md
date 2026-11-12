# Phase 40: Competitia ca aplicatie de sine statatoare (grade v1) - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Reprezentantul clubului (cont comun /competitie, rol REPREZENTANT_COMPETITIE, Faza 39) schimba **gradul** sportivilor clubului sau direct din Pasul de inscriere al competitiei, fara Management. Schimbarea e gradul oficial (istoric_grade + sportivi), cu autor declarat, vizibila federatiei intr-un tab nou. **v1 = doar grade.** Arme si sportiv nou/activare = faze ulterioare.

Legatura cu Management: o singura directie (competitia scrie, managementul citeste).
Design sursa: `docs/superpowers/specs/2026-11-12-competitie-aplicatie-proprie-grade-design.md` (unde difera de deciziile de mai jos, CONTEXT.md prevaleaza).
</domain>

<decisions>
## Implementation Decisions

### Reguli de business grad
- **D-01 (U1):** Promovare maxim +1 treapta, permisa doar dupa timpul de asteptare de la ultima modificare de grad, din `grade.timp_asteptare` (text "N luni"; rosu 4-6, alb/albastru 10-12, negru 12-96). Confirmat de utilizator ("este bine asa"). Pragurile 8/11 luni citate de utilizator = exemple ale aceleiasi reguli, nu valori separate.
- **D-02 (U3):** Echivalare: orice sportiv sub 13 ani (grade rosii si Centura Violet / C.V. 1-4 Cap Alb) -> **1 Cap Albastru** (ordine 15), fara cost. NU mai e regula ordine +4. Sistemul decide tipul (echivalare/promovare), reprezentantul nu alege.
- **D-03 (U2):** Doar undo, fara retrogradare reala in v1. Undo = DELETE controlat al randului creat de RPC. **Undo refuzat cu mesaj** daca randul creat nu mai e ultimul grad al sportivului (Management a adaugat altul intre timp).
- **D-04:** Undo in perioada de inscrieri (status `inscrieri_deschise`, deadline neexpirat): fara motiv. In afara ei: cu motiv obligatoriu.
- **D-05:** Motivul NU e cerut la promovare/echivalare; doar la undo dupa deadline.
- **D-06 (U5):** Gradul se schimba global (peste tot, toate competitiile). Aviz in UI cand sportivul e inscris la alte competitii.
- **D-07:** Regula de timp blocheaza cu **mesaj clar, fara exceptie**: "Ultimul grad: <data>, mai trebuie X luni". Exceptii = federatia prin fluxul existent de grade.

### UI reprezentant
- **D-08:** Control pe randul sportivului din Pasul de Inscriere; refolosit `onGradSchimbat` din `components/Competitii/index.tsx:544`, dar pentru extern apeleaza RPC (azi `canEditGrad = !extern && ...`, linia 213).
- **D-09:** Doar REPREZENTANT_COMPETITIE poate schimba gradul in zona externa. Instructorii externi doar vad.

### DB / securitate
- **D-10:** Schimbarea se aplica printr-o functie RPC SECURITY DEFINER atomica (contul extern nu scrie direct: verificat LIVE, `ext_r_deny_all` pe istoric_grade, `ext_r_sportivi_ins/upd/del` pe sportivi). Verificari in functie: sportiv.club_id = clubul contului, rol REPREZENTANT, acces la competitie, competitie neterminata, regula de timp, sesiune de autor (garda 20261111g), ACL Faza 37, test cross-club.
- **D-11:** Tabel propriu doar pentru grade (nu EAV): schimbare grad cu sportiv, club, competitie, grad_vechi/nou (FK grade), tip (echivalare/promovare), motiv (undo), taxa (snapshot din `grade_preturi_config`), achitat, referinta la randul istoric_grade. Autorul ramane in `audit_log` (trigger `audit_istoric_grade` exista live). NU atinge `sesiuni_examene`, `inscrieri_examene`, `plata`.
- **D-12 (U4):** "Examen de achitat" = doar stare + contor, marcat manual "achitat" de federatie. Nu apare in NotificationBell.
- **D-13:** Gradul promovat fara pret in `grade_preturi_config` (8 din 26 fara inregistrare activa): se permite, taxa = necunoscuta, federatia completeaza.
- **D-14 (U6):** `competitii.deadline_inscrieri` devine NOT NULL cu `deadline <= data_inceput`; migrare cu backfill = data_inceput (3 competitii NULL din 5 + una cu deadline dupa competitie), formularul cere deadline.
- **D-15:** Ecran federatie: tab nou "Schimbari grad" langa JurnalActori in zona competitiei: filtre club/competitie, "examen de achitat" cu contor si buton "Marcheaza achitat". Card pe mobil, tabel de la md; badge text (nu doar culoare).

### Claude's Discretion
- "Ultima modificare" = max(`istoric_grade.data_obtinere`) al sportivului; fara istoric -> fara blocare de timp.
- Varsta se calculeaza la `competitii.data_inceput`.
- Denumirea tabelei si a RPC-ului, forma exacta a controlului pe rand, forma badge-urilor.

### Folded Todos
- `2026-11-12-reprezentant-schimba-grad-in-competitie.md` — sursa fazei.
- `2026-11-11-istoric-grade-drop-staff-full-access.md` — curatare politici istoric_grade ("UNIFIED_CLUB_ACCESS", "Super Admin - Acces total grade" sunt pe rol public); de decis la plan daca intra aici sau ramane separat.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Faza 40
- `.planning/phases/40-competitia-ca-aplicatie-de-sine-statatoare-sportivi-grade-ar/40-AVOCAT-DIAVOL.md` — critica design + verificare RLS live (adendum).
- `.planning/phases/40-competitia-ca-aplicatie-de-sine-statatoare-sportivi-grade-ar/40-DECIZII-UTILIZATOR.md` — raspunsurile utilizatorului la U1-U7 (CONTEXT.md prevaleaza).
- `docs/superpowers/specs/2026-11-12-competitie-aplicatie-proprie-grade-design.md` — design aprobat.
- `.planning/todos/pending/2026-11-12-reprezentant-schimba-grad-in-competitie.md` — todo sursa.
- `.planning/todos/pending/2026-11-12-faza39-verificari-amanate.md` — H6/H8/H9 amanate (H8 inainte de lansare).
- `.planning/todos/pending/2026-11-11-istoric-grade-drop-staff-full-access.md` — politici istoric_grade.

### Cod si DB
- `components/Competitii/index.tsx:213,544` — canEditGrad, onGradSchimbat.
- `components/Competitii/JurnalActori.tsx` — jurnal din `audit_log`, de extins cu tab Schimbari grad.
- `supabase/migrations/20261111d*` (audit_istoric_grade, actor), `20261111g*` (garda autor REPREZENTANT), `20260329_normalize_grade_sources.sql:44-110` (`trg_sync_grad_actual_from_istoric`: grad_actual = max ordine).
- Tabele: `grade` (ordine, varsta_minima, timp_asteptare, tip_avansare), `grade_preturi_config` (grad_id, suma, is_activ), `istoric_grade`, `audit_log`, `competitii` (deadline_inscrieri, data_inceput, status).
- `docs/roluri-permisiuni.md`, `docs/baza-de-date.md`, `docs/module.md` (Competitii).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `onGradSchimbat` / control de grad existent (mod non-extern) in Competitii/index.tsx.
- `JurnalActori.tsx` (audit_log filtrat pe tabele, ETICHETA_TABEL deja are istoric_grade).
- `audit_log` cu actor_nume, actor_user_id, club_id, competitie_id; trigger `audit_istoric_grade`.
- `grade_preturi_config` pentru taxa.

### Established Patterns
- Zona externa: RESTRICTIVE `ext_r_*` + RPC SECURITY DEFINER; `acces_extern_la_club`, `cont_club_curent()`.
- `fetchDataSilent` / `onEchipeRefresh` pentru refresh dupa mutatii in hub-ul de inscriere.
- Migrari: `supabase/migrations`, `git add -f` (folder in .gitignore).

### Integration Points
- `istoric_grade` -> trigger sync `sportivi.grad_actual_id` (max ordine): undo prin DELETE.
- `sportivi.grad_actual_id` citit de eligibilitate/categorii in toate competitiile.
</code_context>

<specifics>
## Specific Ideas

Declansator: BALMUS si SFICA (C.S. Phi Hau, 13 ani, grad ordine 12) fara categorie la Song Luyen.
</specifics>

<deferred>
## Deferred Ideas

- Arme si sportiv nou/activare/dezactivare din contul comun (faza ulterioara; GDPR minori/CNP/dedup).
- Retrogradare reala cu motiv (nu merge cu modelul grad_actual = max).
- Notificare in NotificationBell pentru examen de achitat.
- Factura automata la schimbare grad, email federatiei, aprobare prealabila.
- Regula "2 sportivi la aceeasi arma" (contor Pas3 vs modal).
- Revert de catre federatie ca mecanism nou.
- `audit_trigger_fn` copiaza CNP in audit (de curatat separat).

### Reviewed Todos (not folded)
- arme-cvd-ramase, faza-36-acces-extern-deschise, faza37-ramase, faza39-verificari-amanate — nu tin de grade v1.
</deferred>

---

*Phase: 40-Competitia ca aplicatie de sine statatoare*
*Context gathered: 2026-11-12*
