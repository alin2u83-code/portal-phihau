---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
verified: 2026-11-15T09:00:00Z
status: human_needed
score: 7/7 must-haves verified (cod + UAT); 3 verificari umane ramase
overrides_applied: 0
re_verification: false
gaps: []
human_verification:
  - test: "Test 1 negativ: autentificare ca ADMIN_CLUB / INSTRUCTOR / SPORTIV / extern pe tab Categorii al unei competitii nefinalizate"
    expected: "Nu apar coloana de checkbox, coloana Actiuni, bara Fuzioneaza; panoul 'Fara categorie' apare (read-only, fara checkbox/Realoca)"
    why_human: "Gate UI = poateAdminCategorii (index.tsx:114) verificat doar prin citire cod; UAT a testat doar super admin. Garda reala (RPC is_super_admin + RLS) e dovedita live (baterie 41-04, checks 1,2,13)."
  - test: "Competitie cu status 'finalizata', logat ca super admin, tab Categorii"
    expected: "Nu apar Editeaza/Cloneaza/Imparte/Anuleaza/Fuzioneaza/checkbox; FaraCategoriePanel fara Realoca"
    why_human: "Doar RPC-ul refuza finalizata (dovedit live, check 12); ascunderea in UI (status !== 'finalizata') nu a fost vazuta in browser."
  - test: "Cai atinse doar de review-fixes (14.11 22:05) si NEtestate in browser: banner 'Fara categorie' in wizard Inscriere club + garda rand orfan la reinscriere (InscriereModal/Pas4Sumar/InscrieriView); avertismentele noi din CategorieForm (varsta_max/arma, taxa derivata); selectia golita la schimbare tab"
    expected: "Comportamentul descris in 41-REVIEW-FIXES.md (rand orfan nu se reinscrie la aceeasi proba+arma, mesaj clar; avertismente nebloc.)"
    why_human: "41-REVIEW-FIXES.md declara explicit 'NU testat in browser'; UAT 11/11 acopera doar fluxurile super admin, nu wizardul clubului."
---

# Phase 41: Administrare categorii competitie (super admin) — Raport de verificare

**Goal (ROADMAP):** Super adminul federatiei administreaza categoriile unei competitii din tab-ul Categorii: editare/modificare (avertisment eligibilitate), clonare, anulare (inscrierile raman "Fara categorie", taxa se anuleaza, cele achitate raman de realocat/returnat), fuziune si impartire (varsta/grad/gen) cu preview + confirmare si realocare; totul atomic prin RPC `categorii_aplica_operatie` (is_super_admin, blocat doar la competitie finalizata, fara stergeri).
**Requirements:** D-01..D-12 (41-DECISIONS.md). ROADMAP nu defineste Success Criteria separate; must-haves derivate din Goal + decizii.
**Mod:** initial (fara VERIFICATION anterior).

## Truths observabile

| # | Truth | Status | Evidenta |
|---|-------|--------|----------|
| 1 | Operatiile (anulare/fuziune/impartire/mutare) sunt atomice, doar super admin, refuza finalizata, fara DELETE | VERIFIED | `supabase/migrations/20261114a_categorii_aplica_operatie.sql`: `is_super_admin()` linia 75, `FOR UPDATE` pe competitie (91), refuz `finalizata` (95-97), un singur corp plpgsql (tranzactie), zero DELETE (grep), SECURITY DEFINER + `search_path`, REVOKE anon. Baterie live `tests/categorii_admin_faza41.ts` 16/16 PASS (41-04): ADMIN_CLUB si anon refuzati, finalizata refuzata, drift refuzat. Declarata aplicata live; UAT 11/11 pe prod o foloseste efectiv. |
| 2 | Anulare: inscrierile raman legate de categoria ne-activa ("Fara categorie"), taxa anulata, cea achitata raportata de realocat | VERIFIED | RPC linia 324-336 (status 'anulata', numara taxe_anulate / taxe_achitate_anulate, nu schimba `taxa_achitata`, nu muta randuri). UI: `FaraCategoriePanel` randat necondizionat de rol (`index.tsx:605`), `InscrieriView.tsx:156,247` badge; `FinanciarView.tsx:155` "Achitat pe categorii anulate". UAT 5, 9, 10, test volum C (11 inscrieri, 1100 lei, 0 plati noi, total 182 neschimbat). |
| 3 | Fuziune si impartire (varsta/grad/gen) cu preview + confirmare si mutare; o singura cale de fuziune | VERIFIED | `utils/categoriiAdmin.ts` planFuziune/planImpartire/copiiImpartire (424 L), `CategorieOperatieModal.tsx` (305 L): Confirm `disabled={blocaje.length>0 || loading}` (l.297), apel `aplicaOperatieCategorii` (l.111). `FuzionariPanel.tsx`: fara DELETE/`handleFuzioneaza` (grep). UAT 6, 7 + volum A, B pass. |
| 4 | Editare/modificare cu avertisment eligibilitate (neblocant) si clonare prefilata | VERIFIED | `CategorieForm.tsx` (255 L), wired in `index.tsx:633-646` (`cloneDin`, `inscrisi`, `areInscrieri`). UAT 3 (clonare, #152 creata), 4 (Proba/Tip blocate, avertisment 2 sportivi). Editarea = UPDATE direct cu RLS (baterie check 13: super admin da, ADMIN_CLUB 0 randuri). |
| 5 | Realocare din "Fara categorie" (mutare) doar pentru super admin, tinte active compatibile | VERIFIED | RPC ramura `mutare` (l.197-219: tinta activa, aceeasi proba/tip/arma, retrasii nu se muta); `FaraCategoriePanel` cu `poateRealoca={poateAdminCategorii}` (`index.tsx:611`). Bug mutare (surse nevide) gasit in UAT si reparat `a8992e0f` (`p_surse: p.surse ?? []`, service l.30), retestat pe prod; volum C (11 inscrieri) si D (3 echipe) pass. |
| 6 | Taxa derivata nu mai intra in totaluri pe categorii ne-active in toate view-urile financiare (D-08) | VERIFIED | `utils/taxeCompetitie.ts` + test (PASS rulat de mine); folosit in FinanciarView, PlatiClubExtern, RaportInscrieri, InscrieriView. UAT 10: 5 inscrisi / 4 sportivi / 320 lei, 80 lei anulat exclus. |
| 7 | Calea veche nesigura eliminata; stergere categorie doar fara niciun rand; docs actualizate | VERIFIED | FuzionariPanel fara scrieri; `AdminPanel.tsx:74` DELETE ramas dar gated pe "activa fara niciun rand" (41-07, UAT 11 pass). `docs/ARHITECTURA_COMPETITII.md` 7.7 rescrisa (commit fe8fb93c). |

**Scor:** 7/7 truths VERIFIED (statice + UAT live).

## Artefacte (3 nivele + flux date)

| Artefact | Status | Detalii |
|----------|--------|---------|
| `supabase/migrations/20261114a_categorii_aplica_operatie.sql` (364 L) | VERIFIED | substantiv, urmarit in git, aplicat live; allowlist ACL `tests/acl_definer_faza37.allowlist.json:30` contine semnatura |
| `services/categoriiAdminService.ts` | VERIFIED | `supabase.rpc('categorii_aplica_operatie')`, folosit doar din modal (singurul consumator) |
| `utils/categoriiAdmin.ts` + test | VERIFIED | 31 teste PASS (rulat de mine) |
| `utils/taxeCompetitie.ts` + test | VERIFIED | PASS (rulat de mine) |
| `CategorieOperatieModal.tsx`, `CategorieForm.tsx`, `FaraCategoriePanel.tsx` | VERIFIED | importate si randate in `index.tsx` cu date reale (`inscrieri`, `echipe`, `categorii` din fetchData cu SELECT-uri partajate) |
| `tests/categorii_admin_faza41.ts` | EXISTS | baterie live; nu a fost re-rulata de mine (necesita credentiale live) |

## Key links

| De la | La | Via | Status |
|-------|----|-----|--------|
| index.tsx tab Categorii | CategorieOperatieModal | `operatieCat` state + butoane gated `poateAdminCategorii` | WIRED |
| Modal | RPC | `aplicaOperatieCategorii` -> `supabase.rpc` | WIRED (UAT confirma efect in DB) |
| Modal onDone | refresh date | `fetchDataSilent()` (index.tsx:628) | WIRED |
| FaraCategoriePanel.onRealoca | modal mutare | `setOperatieCat({operatie:'mutare', selectie})` | WIRED |
| CategorieForm onSaved | refresh | `fetchDataSilent()` | WIRED |

## Verificari rulate de mine
- `npx tsc --noEmit`: exit 0.
- `npx tsx utils/categoriiAdmin.test.ts`: toate trec. `npx tsx utils/taxeCompetitie.test.ts`: toate trec.
- Anti-patterne: zero TBD/FIXME/XXX/TODO in fisierele fazei (`CategorieOperatieModal`, `CategorieForm`, `FaraCategoriePanel`, serviciu, utils).
- NU rulat: baterie live `tests/categorii_admin_faza41.ts`, ACL ratchet (`87304948` declara 30/30), browser.

## Goluri / limite (non-blocante, de stiut)

1. **Netestat explicit:** Test 1 negativ (alte roluri) si competitie finalizata in UI — vezi `human_verification`. Garda reala in DB e dovedita (baterie live), deci riscul e UX, nu securitate.
2. **D-09 doar partial server-side:** blocarea pe `finalizata` e impusa de RPC pentru anulare/fuziune/impartire/mutare, dar Editare/Clonare (INSERT/UPDATE direct pe `categorii_competitie`) si stergerea din AdminPanel sunt blocate doar de UI (`poateAdminCategorii` / RLS). Un super admin prin API direct poate edita o competitie finalizata. Acceptabil (super admin de incredere), dar de notat fata de textul "blocat doar la finalizata".
3. **Review-fixes necomplete verificate in browser** (vezi human_verification 3). Wizardul clubului si garda rand orfan sunt validate doar prin tipuri + teste de logica pura.
4. **Limite documentate:** randurile retrase nu au UI de reactivare/stergere; echipele orfane nu blocheaza formarea unei echipe noi; blocajul de reinscriere e la sumar, nu in Pas1; `CategorieForm` din AdminPanel nu primeste `inscrisi`/`dataCompetitie` (avertisment eligibilitate doar din tab Categorii).
5. **Neverificat pe mobil / sub profilare** (re-render din starea de selectie la nivel `CompetitieDetail`).
6. **Reziduu informativ:** 30 randuri audit_log create de bateria live (fara DELETE).
7. **Taxa anuala FRQKD/FRAM nu se anuleaza** (decizie planner D-08, "de confirmat cu utilizatorul" — neconfirmat explicit in documentele fazei).

## Concluzie

Goal-ul fazei este atins in cod si dovedit live (RPC aplicat, 16/16 baterie, UAT 11/11 + 5 teste la volum pe clona). Nicio truth FAILED, niciun blocker. Status `human_needed` doar din cauza celor 3 verificari umane de mai sus (roluri non-super-admin, competitie finalizata, cai din review-fixes), nu din cauza unor goluri de implementare.

_Verified: 2026-11-15_
_Verifier: Claude (gsd-verifier)_
