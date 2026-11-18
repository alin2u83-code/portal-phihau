# Phase 45: Clonare competitie (super admin) - Research

**Researched:** 2026-11-18
**Domain:** Postgres RPC tranzactional (Supabase) + asistent React intr-un Modal intern; schema competitii/probe/categorii
**Confidence:** HIGH pe schema si date (citite live read-only prin PostgREST/OpenAPI + migrari), MEDIUM pe constrangeri/politici/triggere (nu am putut citi `pg_catalog`; derivate din migrari, de reconfirmat live de orchestrator prin Supabase MCP)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Ce se cloneaza si cum**
- **D-01:** Se cloneaza: setari competitie (tip, `config_taxe`, `taxa_individual`, `taxa_echipa`, locatie, organizator, `fram_obligatoriu`), categorii, probe. NU se cloneaza: inscrieri/echipe, `legacy_eveniment_id`, `status` (noua = `schita`), `club_id`. Datele si deadline-ul se cer in asistent.
- **D-02:** "Template per tip" inlocuit cu clonare. Fara tabel/coloana de template noua si fara sincronizare template<->competitie.
- **D-03:** Categoriile implica probele: bifa "probe" fara "categorii" nu exista (categoria are `proba_id`; `proba_id` se remapeaza vechi -> nou, probe inserate prima data).
- **D-04:** Un singur RPC tranzactional `competitie_cloneaza` (SECURITY DEFINER, `SET search_path = public, pg_catalog`, prima instructiune garda `is_super_admin()` -> 42501, `REVOKE ... FROM PUBLIC, anon`, `GRANT ... TO authenticated, service_role`), dupa modelul `categorii_aplica_operatie` (`20261114a`). Fara clonare partiala. Fara coloane noi (3NF).
- **D-05:** Doar `SUPER_ADMIN_FEDERATIE`; garda reala in DB, butonul doar ascuns in UI pentru restul.

**Structura initiala a categoriilor (anulate, fuzionate, impartite)**
- **D-06:** Se cloneaza STRUCTURA INITIALA a sursei, nu cea finala. Reconstruire verificata fezabila pe date reale: la fuzionari sursele raman cu `status_categorie='fuzionata'` (rezultatul = categorie activa cu `este_fuzionata=true`, de exclus); la impartiri sursele raman cu `status_categorie='impartita'` si `categorii_fuzionate_din` = id-urile categoriilor NOI rezultate (de exclus). Categoriile clonate au `status_categorie='activa'`, `este_fuzionata=false`, `categorii_fuzionate_din=NULL`.
- **D-07:** Categoriile ANULATE se INCLUD in clona, cu status activ (super adminul le anuleaza din nou daca nu le vrea). (Contrar recomandarii agentului avocat-diavol.)
- **D-08:** Previzualizarea marcheaza doar categoriile care NU pot fi reconstruite fidel. Daca o categorie nu poate fi reconstruita fidel (surse lipsa sau ambigue): se ia varianta activa si se avertizeaza in previzualizare; clonarea NU se opreste.
- **D-09:** `numar_categorie` si `ordine_afisare` se RENUMEROTEAZA continuu in competitia noua.

**Taxe**
- **D-10:** `config_taxe`, `taxa_individual`, `taxa_echipa` se copiaza AS-IS (recomandarea avocat-diavol). Se modifica in draft inainte de deschiderea inscrierilor. Fara camp de taxe in asistent si fara reset.

**Clonare intre tipuri**
- **D-11:** Clonarea intre tipuri e permisa (ex. CN Tehnica -> CVD). Se copiaza TOT, cu avertisment in previzualizare pentru probele/categoriile incompatibile cu tipul tinta; super adminul raspunde de rezultat si corecteaza in draft.
- **D-12:** "Compatibil" = dupa tipul probei: o proba e compatibila daca tipul ei (`thao_quyen`, `giao_dau`, `thao_lo_individual`, `song_luyen` etc.) exista in probatia tipului tinta; categoriile urmeaza proba. Lista exacta a tipurilor de proba per tip competitie = de stabilit in research din codul/DB existent.

**Pornire si iesire din asistent**
- **D-13:** Butonul "Cloneaza" este pe RANDUL fiecarei competitii din lista (langa Editeaza/Sterge); sursa e fixa (cea de pe rand). Preselectarea "ultima finalizata de acelasi tip" nu mai are sens, fiindca sursa o alege super adminul prin randul ales.
- **D-14:** Asistentul = UN SINGUR ecran (Modal din `components/ui.tsx`): bife (setari / categorii / probe, cu categorii implica probe), nume (OBLIGATORIU, editabil, fara dubluri), date, deadline, apoi previzualizare cu numarul de categorii si avertismentele (incompatibilitati, reconstruiri, anulate incluse), buton Creeaza.
- **D-15:** Dupa creare se DESCHIDE noua competitie, in draft (detaliul ei), ca super adminul sa verifice taxele si sa deschida inscrierile.
- **D-16:** Sursa clonarii se noteaza in `competitii.observatii` ca text liber (ex. "Clonata din <denumire> (<id>) la <data>"). Fara coloana noua, fara rand dedicat in `audit_log`.

### Claude's Discretion
- Structura interna a RPC-ului (parametri, format `p_setari jsonb`, tratarea erorilor), structura exacta a previzualizarii, ordinea inserturilor in tranzactie, sufix implicit pentru nume.
- Layout responsive al Modalului (mobil `items-end`, bife `min-h-10`), in limitele `components/ui.tsx`.

### Deferred Ideas (OUT OF SCOPE)
- Clonare de inscrieri/echipe — respinsa; nu face parte din faza.
- Template per tip competitie cu sincronizare — respins in favoarea clonarii; de redeschis doar daca clonarea se dovedeste insuficienta.
- Todo-uri revizuite si nefolosite: `2026-11-05-faza-36-acces-extern-deschise.md`, `2026-11-12-faza39-verificari-amanate.md`, `2026-11-12-reprezentant-schimba-grad-in-competitie.md`, `2026-09-01-reactivare-asistent-ai-dupa-fix-functionare.md` (nu tin de clonare).
</user_constraints>

<phase_requirements>
## Phase Requirements

Nu au fost date ID-uri de cerinte (TBD). Planner-ul mapeaza direct pe D-01..D-16.

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01..D-05 | Ce se cloneaza, RPC atomic, doar super admin | Schema live completa (sectiunea Standard Stack / Schema), sablon RPC `20261114a`, triggere care nu blocheaza insertul |
| D-06..D-09 | Structura initiala, anulate, renumerotare | Algoritm de reconstruire + DATE REALE care corecteaza premisa D-06 (vezi Pitfall 1) |
| D-10..D-12 | Taxe as-is, clonare intre tipuri, compatibilitate | `DEFAULT_PROBE_PER_TIP`, CHECK `tip`, capcana `config_taxe` NULL (Pitfall 4) |
| D-13..D-16 | UI asistent, deschidere draft, observatii | Pattern `index.tsx` (lista cu state local, nu React Query), `Modal`/`Input`/`Select` din `ui.tsx` |
</phase_requirements>

## Summary

Clonarea se poate face integral cu ce exista deja: o singura migrare (RPC `competitie_cloneaza`, SECURITY DEFINER, tipar identic cu `categorii_aplica_operatie`), un serviciu `{data,error}`, un modul pur TS pentru reconstruirea structurii initiale + avertismente, si un Modal nou in `components/Competitii/`. Nicio biblioteca noua, nicio coloana/tabela noua. Triggerele existente pe `categorii_competitie` (audit, blocare DELETE) si pe `competitii` (`trg_competitii_fram_imutabil`) nu blocheaza un INSERT facut de super admin; politicile RLS sunt ocolite de definer (postgres are `rolbypassrls`, verificat live in Faza 41/42).

**Descoperire importanta (corecteaza D-06):** premisa din D-06 ("la fuzionari sursele raman `fuzionata`, rezultatul = categorie NOUA cu `este_fuzionata=true`") este adevarata doar pentru fuzionarile facute prin RPC-ul Faza 41. Pe datele reale, ambele fuzionari (nr. 9 si 12 din competitia "Juniori 1, Seniori, Veterani") sunt fuzionari LEGACY (`20260412`): categoria "pastrata" ramane `activa`, are `este_fuzionata=true`, `categorii_fuzionate_din` o contine PE EA INSASI (autoreferinta, vezi comentariul din `types.ts:918`), iar denumirea/varsta/gradele ei au fost rescrise in loc. Definitia originala a categoriei pastrate este pierduta, deci reconstruirea fidela nu e posibila; se aplica fallback-ul D-08 (varianta activa + avertisment), nu D-06. Impartirile (5/5) sunt toate prin RPC si se reconstruiesc exact. Rezultat verificat pe date reale: clona din competitia de test are 72 de categorii (56 active simple + 2 pastrate-legacy cu avertisment + 9 anulate + 5 impartite), cu 10 categorii-copil excluse si 2 surse-legacy excluse.

Alta capcana de date: `status` real in DB este `'draft'` (nu `'schita'`; "Schita" e doar eticheta UI), iar CHECK-ul `competitii.tip IN ('tehnica','giao_dau','cvd')` (migrarea `20260319`) respinge tipul `stagiu` care apare in `tipuri_competitie`/Select-ul din `CompetitieForm`.

**Primary recommendation:** Un RPC `competitie_cloneaza(p_sursa, p_denumire, p_tip, p_data_inceput, p_data_sfarsit, p_deadline, p_setari boolean, p_probe boolean, p_categorii uuid[])` care primeste lista EXACTA de id-uri de categorii de copiat, calculata in TS de `structuraInitiala()` (o singura implementare a reconstruirii, testabila cu fixtures), si pe care serverul doar o valideaza (apartin sursei) si o copiaza remapat si renumerotat, intr-o singura tranzactie.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Garda "doar super admin" | Database (RPC `is_super_admin()`, 42501) | Browser (buton ascuns) | RPC-ul ocoleste RLS; singura poarta reala e garda din functie |
| Inserare atomica competitie+probe+categorii | Database (RPC plpgsql, o tranzactie) | — | Evita clonarea pe jumatate; deja pattern Faza 41 |
| Reconstruirea structurii initiale + avertismente | Browser (modul pur TS in `utils/`) | Database (valideaza apartenenta id-urilor) | Datele sunt deja incarcabile client-side (<=150 randuri); filtrare client-side e cerinta proiectului; testabil unitar |
| Validari (nume unic, date, deadline<=start, tip permis) | Database (RPC) | Browser (UX: mesaje inainte de submit) | Garda reala in DB; UI dubleaza doar pentru mesaje bune |
| Asistentul cu bife + previzualizare | Browser (Modal `ui.tsx`) | — | UI intern, un singur ecran |
| Deschiderea noii competitii in draft | Browser (state local `CompetitiiManagement`) | — | Lista foloseste `useState` local, nu React Query |
| Sursa clonarii in `observatii` | Database (RPC construieste textul) | — | Server-side evita text fals din client |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL plpgsql (Supabase) | live `phi-hau-db` | RPC `competitie_cloneaza` | Tipar `categorii_aplica_operatie` (`20261114a`) [VERIFIED: codebase] |
| `@supabase/supabase-js` | 2.98.0 | `supabase.rpc(...)` din serviciu | Deja in proiect [VERIFIED: CLAUDE.md/package.json] |
| React 18 + TypeScript + Tailwind | 18.3.1 / 5.5.3 / 3.4.6 | Modal asistent | Stack proiect; fara librarii noi (constrangere) [VERIFIED: CLAUDE.md] |
| `components/ui.tsx` (`Modal`, `Input`, `Select`, `Button`, `Badge`, `Switch`) | intern | UI asistent | Design system intern obligatoriu; nu exista `Alert` exportat din `ui.tsx` (grep), foloseste `useError().showError` + blocuri Tailwind inline ca in `CompetitieForm` [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | 4.21.0 | Rulare teste (`npx tsx utils/x.test.ts`, `npx tsx tests/x.ts`) | Proiectul nu are vitest/jest; pattern `utils/categoriiAdmin.test.ts`, `tests/categorii_admin_faza41.ts` [VERIFIED: codebase] |
| `utils/competitiiTemplates.ts` `DEFAULT_PROBE_PER_TIP` | intern | Sursa de adevar pentru D-12 (tipuri de proba per tip competitie) | Verificarea compatibilitatii cross-tip |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TS calculeaza id-urile, RPC valideaza si copiaza (recomandat) | Reconstruire si in SQL (RPC primeste doar `p_sursa`) | Duplica logica complexa in SQL + TS (preview ar trebui oricum sa o stie); drift garantat. Doar daca userul vrea ca serverul sa impuna D-06 |
| Parametri tipati in RPC | `p_setari jsonb` (propunerea din CONTEXT) | `jsonb` ascunde tipurile si cere validare manuala; parametrii tipati dau validare gratis (cast la `date`). `p_setari` devine `boolean` (bifa) |
| Preview calculat in TS | Dry-run in RPC (`p_previzualizare`) | Dry-run ar da o a doua cale de cod; TS are deja datele incarcate |

**Installation:** nimic de instalat (fara pachete noi).

**Version verification:** nu se recomanda pachete externe; versiunile din tabel sunt cele din `CLAUDE.md`/`package.json` (lockfile). [VERIFIED: codebase]

## Package Legitimacy Audit

Faza nu instaleaza nicio dependenta externa. Nu s-a rulat slopcheck (nu e cazul).

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Schema live relevanta (citita prin PostgREST OpenAPI, service_role, 18.11.2026; read-only)

`competitii`: `id, denumire (NN), tip (NN), data_inceput (NN), data_sfarsit (NN), locatie, organizator, status (NN, default 'draft'), deadline_inscrieri (NN), club_id, taxa_individual (default 0), taxa_echipa (default 0), observatii, created_at, updated_at, legacy_eveniment_id, config_taxe jsonb, fram_obligatoriu (NN default false)`. [VERIFIED: live OpenAPI]

`probe_competitie`: `id, competitie_id (FK CASCADE), tip_proba (NN, CHECK 5 valori), denumire (NN), ordine_afisare`. Nu are UNIQUE pe (competitie_id, tip_proba); live: 0 dubluri. [VERIFIED: live + migrare 20260319]

`categorii_competitie` (23 coloane): `id, competitie_id (FK CASCADE), proba_id (FK probe_competitie), numar_categorie, denumire, varsta_min (NN), varsta_max, gen (NN), grad_min_ordine, grad_max_ordine, arma, tip_participare (NN default 'individual'), sportivi_per_echipa_min/max, rezerve_max, max_echipe_per_club, min_participanti_start, ordine_afisare, max_membri_echipa, min_membri_start, este_fuzionata, categorii_fuzionate_din uuid[], status_categorie (default 'activa'), doua_quyenuri (NN default false)`. [VERIFIED: live OpenAPI]

Date live (483 categorii, 5 competitii): `proba_id` NULL = 0; `numar_categorie` NULL = 0; dubluri `numar_categorie` per competitie = 0; categorii cu proba din alta competitie = 0. Nu exista UNIQUE pe `(competitie_id, numar_categorie)` in nicio migrare (doar `uq_inscriere_sportiv_categorie` pe inscrieri). [VERIFIED: live + grep migrari; constrangerile live neconfirmate prin pg_constraint]

`competitii.tip` valori reale: `tehnica`, `cvd` (nicio `giao_dau` momentan). `tipuri_competitie` are 4 coduri (`giao_dau, cvd, stagiu, tehnica`), dar `competitii.tip` are CHECK `IN ('tehnica','giao_dau','cvd')` (`20260319_competitii_schema.sql:16`; nicio migrare ulterioara nu il schimba, de reconfirmat live). [VERIFIED: migrari; live neconfirmat]

Probe per tip competitie (live): `tehnica` -> thao_quyen_individual, sincron, song_luyen (+ `giao_dau` in competitia J1SV, care e o competitie unificata tehnica+lupte cu `tip='tehnica'`); `cvd` -> thao_lo_individual, song_luyen, giao_dau. Sursa in cod pentru D-12: `DEFAULT_PROBE_PER_TIP` (`utils/competitiiTemplates.ts:823`): `tehnica`={thao_quyen_individual, sincron, song_luyen}, `giao_dau`={giao_dau}, `cvd`={thao_lo_individual, song_luyen, giao_dau}. [VERIFIED: codebase + live]

### System Architecture Diagram

```
[Lista competitii: rand + buton "Cloneaza" (doar isSuperAdmin)]
        |
        v
[CloneazaCompetitieModal]  <- fetch sursa: probe_competitie + categorii_competitie (select columns, filtrare client-side)
   bife: setari / categorii / probe (categorii => probe fortat)
   nume*, tip tinta, data_inceput, data_sfarsit, deadline
        |
        v
[utils/clonareCompetitie.ts  structuraInitiala(categorii)]  -> { ids[], avertismente[], excluse[] }
[utils/clonareCompetitie.ts  avertismenteTip(probe, categorii, tipTinta)]  -> compat. cross-tip (DEFAULT_PROBE_PER_TIP)
        |  (previzualizare: nr. categorii, anulate incluse, legacy nereconstruibile, incompatibile)
        v  [Creeaza]
[services/clonareCompetitieService.ts  -> supabase.rpc('competitie_cloneaza', {...})]
        |
        v
[RPC competitie_cloneaza  (1 tranzactie, SECURITY DEFINER)]
   1 garda is_super_admin() -> 42501
   2 validari params (nume, date, tip, id-uri apartin sursei)
   3 lock advisory + sursa FOR SHARE
   4 INSERT competitii (draft, club_id NULL, legacy NULL, observatii=sursa)
   5 INSERT probe (loop, harta old->new)         [daca p_probe sau p_categorii]
   6 INSERT categorii (set-based, remap proba_id, renumerotare row_number, status activa)
   7 RETURN jsonb {id, probe, categorii}
        |
        v
[client: select competitii id => setCompetitii([nou,...]); setSelectedComp; ssSet(SS_KEY_COMP_ID); ssDel(SS_KEY_TAB); setView('detail')]
```

### Recommended Project Structure
```
supabase/migrations/20261118g_competitie_cloneaza.sql   # RPC (git add -f; supabase/ e gitignored)
services/clonareCompetitieService.ts                     # { data, error }, tipar categoriiAdminService.ts
utils/clonareCompetitie.ts                               # structuraInitiala, avertismenteTip, numeImplicit (pure, fara Supabase)
utils/clonareCompetitie.test.ts                          # npx tsx; fixtures cu formele reale (legacy autoref, impartita, anulata)
components/Competitii/CloneazaCompetitieModal.tsx        # asistentul (un ecran)
components/Competitii/index.tsx                          # + buton "Cloneaza" pe rand + onCloned
tests/competitie_cloneaza_faza45.ts                      # live, competitii efemere ZZ_TEST_FAZA45_*
tests/acl_definer_faza37.allowlist.json                  # + "competitie_cloneaza(...)" in "authenticated" + nota
types.ts                                                 # + RezultatClonareCompetitie (tipurile doar in types.ts)
docs/baza-de-date.md, docs/module.md                     # nota scurta despre RPC si buton
```

### Pattern 1: RPC (schelet; semnatura finala = discretia planner-ului)
**What:** o functie, o tranzactie, garda prima instructiune, `search_path` fixat, ACL explicit.
**When to use:** exact acest RPC.
**Example:**
```sql
-- Source: tipar din supabase/migrations/20261114a_categorii_aplica_operatie.sql + hardening 20261115a
CREATE OR REPLACE FUNCTION public.competitie_cloneaza(
  p_sursa        uuid,
  p_denumire     text,
  p_tip          text,
  p_data_inceput date,
  p_data_sfarsit date,
  p_deadline     date,
  p_setari       boolean DEFAULT true,
  p_probe        boolean DEFAULT true,
  p_categorii    uuid[]  DEFAULT '{}'::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public   -- pg_catalog primul, ca in 20261115a/b (CONTEXT scrie public, pg_catalog; vezi A2)
AS $$
DECLARE
  v_src public.competitii%ROWTYPE;
  v_new uuid; v_map jsonb := '{}'::jsonb; v_pr record; v_pid uuid; v_nc integer; v_np integer := 0;
  v_den text := btrim(COALESCE(p_denumire, ''));
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;   -- PRIMA instructiune

  IF char_length(v_den) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Denumire invalida.' USING ERRCODE = '22023'; END IF;
  IF p_tip IS NULL OR p_tip NOT IN ('tehnica','giao_dau','cvd') THEN RAISE EXCEPTION 'Tip invalid.' USING ERRCODE = '22023'; END IF;
  IF p_data_inceput IS NULL OR p_data_sfarsit IS NULL OR p_deadline IS NULL
     OR p_data_sfarsit < p_data_inceput OR p_deadline > p_data_inceput THEN
    RAISE EXCEPTION 'Date invalide (sfarsit >= inceput, deadline <= inceput).' USING ERRCODE = '22023';
  END IF;
  p_categorii := COALESCE(p_categorii, '{}'::uuid[]);

  PERFORM pg_advisory_xact_lock(hashtext('competitie_cloneaza'));          -- dublu-click / 2 admini: numele ramane unic
  SELECT * INTO v_src FROM public.competitii WHERE id = p_sursa FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Competitia sursa nu exista.' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.competitii c WHERE lower(btrim(c.denumire)) = lower(v_den)) THEN
    RAISE EXCEPTION 'Exista deja o competitie cu aceasta denumire.' USING ERRCODE = '23505';
  END IF;
  -- id-urile primite trebuie sa fie TOATE din sursa (nu se deduce nimic pe server; se refuza orice altceva)
  IF cardinality(p_categorii) > 0 AND
     (SELECT count(*) FROM public.categorii_competitie k WHERE k.id = ANY(p_categorii) AND k.competitie_id = p_sursa)
       <> (SELECT count(DISTINCT x) FROM unnest(p_categorii) x) THEN
    RAISE EXCEPTION 'Categorii invalide pentru competitia sursa.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.competitii (denumire, tip, data_inceput, data_sfarsit, deadline_inscrieri, status, observatii,
                                 locatie, organizator, config_taxe, taxa_individual, taxa_echipa, fram_obligatoriu)
  VALUES (v_den, p_tip, p_data_inceput, p_data_sfarsit, p_deadline, 'draft',
          'Clonata din ' || v_src.denumire || ' (' || v_src.id || ') la ' || to_char(now(), 'DD.MM.YYYY'),
          CASE WHEN p_setari THEN v_src.locatie END, CASE WHEN p_setari THEN v_src.organizator END,
          CASE WHEN p_setari THEN v_src.config_taxe ELSE /* default ca in CompetitieForm, vezi Pitfall 4 */ NULL END,
          CASE WHEN p_setari THEN v_src.taxa_individual ELSE 80 END, CASE WHEN p_setari THEN v_src.taxa_echipa ELSE 120 END,
          CASE WHEN p_setari THEN v_src.fram_obligatoriu ELSE false END)
  RETURNING id INTO v_new;                        -- trg_competitii_fram_imutabil: INSERT cu fram=true cere is_super_admin() => trece

  IF p_probe OR cardinality(p_categorii) > 0 THEN  -- categorii => probe (D-03)
    FOR v_pr IN SELECT * FROM public.probe_competitie WHERE competitie_id = p_sursa ORDER BY ordine_afisare, id LOOP
      INSERT INTO public.probe_competitie (competitie_id, tip_proba, denumire, ordine_afisare)
      VALUES (v_new, v_pr.tip_proba, v_pr.denumire, v_pr.ordine_afisare) RETURNING id INTO v_pid;
      v_map := v_map || jsonb_build_object(v_pr.id::text, v_pid); v_np := v_np + 1;
    END LOOP;
  END IF;

  INSERT INTO public.categorii_competitie (competitie_id, proba_id, numar_categorie, ordine_afisare, denumire, varsta_min, varsta_max, gen,
      grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max,
      max_echipe_per_club, min_participanti_start, max_membri_echipa, min_membri_start, doua_quyenuri,
      status_categorie, este_fuzionata, categorii_fuzionate_din)
  SELECT v_new, (v_map ->> k.proba_id::text)::uuid, k.rn, k.rn, k.denumire, k.varsta_min, k.varsta_max, k.gen,
         k.grad_min_ordine, k.grad_max_ordine, k.arma, k.tip_participare, k.sportivi_per_echipa_min, k.sportivi_per_echipa_max, k.rezerve_max,
         k.max_echipe_per_club, k.min_participanti_start, k.max_membri_echipa, k.min_membri_start, k.doua_quyenuri,
         'activa', false, NULL
    FROM (SELECT c.*, row_number() OVER (ORDER BY c.ordine_afisare, c.numar_categorie, c.id)::integer AS rn
            FROM public.categorii_competitie c WHERE c.id = ANY(p_categorii) AND c.competitie_id = p_sursa) k;
  GET DIAGNOSTICS v_nc = ROW_COUNT;
  -- (de adaugat: refuz daca k.proba_id nu are corespondent in v_map si nu e NULL)

  RETURN jsonb_build_object('id', v_new, 'probe', v_np, 'categorii', v_nc);
END; $$;

REVOKE ALL ON FUNCTION public.competitie_cloneaza(uuid,text,text,date,date,date,boolean,boolean,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.competitie_cloneaza(uuid,text,text,date,date,date,boolean,boolean,uuid[]) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
-- Rollback: DROP FUNCTION IF EXISTS public.competitie_cloneaza(uuid,text,text,date,date,date,boolean,boolean,uuid[]);
```
(Schelet ilustrativ, nerulat; planner-ul fixeaza detaliile. `categorii_fuzionate_din` si `este_fuzionata` se seteaza explicit pentru a nu depinde de default-uri.)

### Pattern 2: Reconstruirea structurii initiale (TS pur, o singura implementare)
**What:** regula unica: categoria face parte din structura initiala daca NU e rezultat de fuzionare si NU e copil de impartire; statusul oricarei categorii incluse devine `activa` (anulatele incluse, D-07).
**Example:**
```ts
// utils/clonareCompetitie.ts  (schelet; fixtures in .test.ts cu formele din date reale)
export function structuraInitiala(cats: CategorieCompetitie[]) {
  const byId = new Map(cats.map(k => [k.id, k]));
  const excluse = new Set<string>();
  const avertismente: { categorieId: string; mesaj: string }[] = [];
  // 1) copiii impartirilor (RPC Faza 41): categorii_fuzionate_din al categoriei 'impartita' = ids COPIILOR
  for (const k of cats) if (k.status_categorie === 'impartita') (k.categorii_fuzionate_din ?? []).forEach(id => excluse.add(id));
  // 2) rezultate de fuzionare
  for (const k of cats) {
    if (!k.este_fuzionata) continue;
    const surse = k.categorii_fuzionate_din ?? [];
    const legacy = surse.includes(k.id) || surse.some(id => !byId.has(id)); // autoreferinta = fuziune LEGACY, in loc
    if (!legacy) { excluse.add(k.id); continue; }                           // Faza 41: rezultat nou; sursele ('fuzionata') raman incluse
    surse.filter(id => id !== k.id).forEach(id => excluse.add(id));         // legacy: pastram varianta activa
    avertismente.push({ categorieId: k.id, mesaj: 'Fuzionare veche: definitia initiala nu se poate reconstrui; se copiaza varianta fuzionata.' });
  }
  return { ids: cats.filter(k => !excluse.has(k.id)).map(k => k.id), excluse, avertismente };
}
```
Verificat mental pe datele reale: 84 categorii - 10 copii impartire - 2 surse legacy = 72; 2 avertismente. Cazuri de margine acoperite: fuzionari inlantuite prin RPC (rezultatele `este_fuzionata` raman excluse, sursele incluse), copil de impartire fuzionat ulterior (copilul e exclus, parintele ramane), `fuzionata` fara rezultat (orfana) ramane inclusa.

### Pattern 3: Deschiderea noii competitii (index.tsx)
Lista foloseste state local (`competitii`, `selectedComp`, `view`), NU React Query. Dupa RPC: `select().eq('id', id).single()` (ca `CompetitieForm` cu `freshComp`), apoi `setCompetitii(prev => [nou, ...prev]); setSelectedComp(nou); ssSet(SS_KEY_COMP_ID, nou.id); ssDel(SS_KEY_TAB); setView('detail')` (ca blocul de auto-intrare din `fetchCompetitii`, `index.tsx:1011-1017`). Butonul se afiseaza doar cu `permissions.isSuperAdmin` (nu `isAdmin`, care include `isFederationAdmin` — RPC-ul refuza oricum ADMIN federatie). [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **3 inserturi client (competitie, probe, categorii):** exact ce fac `CompetitieForm`/`MigrareModal`/`GenerareSabloaneModal`; ruleaza fara tranzactie, clonare pe jumatate la eroare. Totul intr-un RPC.
- **Reconstruirea in doua locuri (SQL + TS):** drift. Una singura, in TS, serverul valideaza doar apartenenta id-urilor.
- **Copierea `categorii_fuzionate_din`/`este_fuzionata`/`status_categorie` din sursa:** id-uri orfane catre categorii ale altei competitii. Mereu `activa/false/NULL`.
- **`status='schita'`:** violeaza CHECK. Valoarea reala e `'draft'`.
- **Modificarea `components/ui.tsx` pentru `items-end` pe mobil:** `Modal` are `items-center` fix; nu cere modificare, ramane in limitele existente (A4).
- **Reutilizarea `CategorieForm.cloneDin`:** clonare de o categorie, doar UI; nu se extinde.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Garda super admin | Verificare de rol in JS/RLS noua | `public.is_super_admin()` (prima instructiune RPC) | Citeste header-ul `active-role-context-id` din `utilizator_roluri_multicont`; deja folosit |
| Atomicitate | Compensari/rollback manual client | O functie plpgsql = o tranzactie | Orice exceptie anuleaza tot |
| Remap `proba_id` | Mapare dupa `tip_proba` in client | Harta `old_id -> new_id` in RPC (loop pe probe) | Nu exista UNIQUE `(competitie_id, tip_proba)`; maparea pe id e corecta si pentru dubluri |
| Compatibilitate tip-proba | O noua lista de probe per tip | `DEFAULT_PROBE_PER_TIP` | Sursa unica existenta (D-12) |
| Mesaje de eroare DB | Parsare ad-hoc in componenta | Tipar `clarificaEroare` din `categoriiAdminService.ts` (mesaj prietenos, `{data,error}`) | Consistent cu Faza 41 |
| Nume unic | Verificare doar client | `EXISTS` in RPC sub `pg_advisory_xact_lock` + verificare client pentru UX | Doi super admini / dublu-click |

**Key insight:** tot ce are nevoie faza exista deja ca tipar in repo; singurul cod "nou" cu logica reala este reconstruirea structurii initiale, care trebuie scrisa o data, in TS, cu teste pe forme reale de date.

## Runtime State Inventory

Nu e faza de rename/refactor/migrare. Nu se aplica. (Faza adauga o functie noua; nu redenumeste nimic.)

## Common Pitfalls

### Pitfall 1: Fuzionarile legacy nu se pot reconstrui (D-06 are premisa partial gresita)
**What goes wrong:** aplicand D-06 literal (surse = incluse, rezultat `este_fuzionata` = exclus), pe cele 2 fuzionari reale s-ar exclude categoria pastrata (activa, cea care are participanti) si s-ar include doar sursa `fuzionata` + niciun corespondent al celeilalte jumatati => clona pierde ~2 categorii sau le duce intr-o forma gresita.
**Why it happens:** fuzionarea veche (`20260412`) modifica categoria pastrata IN LOC (denumire/varsta/grade rescrise), `categorii_fuzionate_din` = [sursa, ea insasi]; doar fuzionarea RPC Faza 41 insereaza un rezultat nou. [VERIFIED: live — nr.9: surse = {categoria 1 `fuzionata`, categoria 9 insasi}; nr.12: {10 `fuzionata`, 12 insasi}]
**How to avoid:** detecteaza autoreferinta (`surse.includes(k.id)`), pastreaza categoria activa, exclude celelalte surse, avertizeaza (fallback D-08). Reflecta si `categorieEticheta` din `constants.tsx:50` (stie deja de autoreferinta).
**Warning signs:** numar de categorii clonate != 72 pe competitia de test; lipsa avertismentelor pe competitia J1SV.
**De comunicat userului:** D-06 ramane valabil pentru viitor (fuzionari prin RPC) dar cele 2 cazuri reale cad pe D-08; nu e nevoie de decizie noua (D-08 acopera), doar de transparenta in previzualizare.

### Pitfall 2: `status='schita'` si CHECK-urile
**What goes wrong:** INSERT respins (`competitii_status_check`).
**How to avoid:** `'draft'` (DEFAULT). Eticheta UI "Schita" vine din `statusLabel`.

### Pitfall 3: Cross-tip: `stagiu` si CHECK `tip`
**What goes wrong:** Select-ul din `CompetitieForm` listeaza tot `tipuriLabels` (include `stagiu`); CHECK `competitii.tip IN ('tehnica','giao_dau','cvd')` il respinge. Asistentul nu trebuie sa ofere `stagiu`.
**How to avoid:** lista fixa de 3 tipuri in asistent (sau `tipuriLabels` filtrat dupa `DEFAULT_PROBE_PER_TIP` keys) + validare in RPC. Reconfirma CHECK-ul live.

### Pitfall 4: `config_taxe` NULL -> taxe 0 tacit
**What goes wrong:** daca bifa "setari" e debifata si RPC lasa `config_taxe` NULL + `taxa_individual` default 0, `calculeazaTaxaIndividuala` (`utils/taxeCompetitie.ts:4-10`) intoarce `taxa_individual ?? 80` = 0 => competitie cu taxa 0 deschisa din greseala. (D-10 spune "copiate as-is"; nu spune ce se intampla cand "setari" e debifat.)
**How to avoid:** cand `p_setari=false`, foloseste aceleasi valori implicite ca `CompetitieForm` (config 80/80/120/150/80 RON, `taxa_individual=80`, `taxa_echipa=120`) si noteaza in previzualizare "taxe implicite". A se confirma de user (Open Question 2).

### Pitfall 5: Triggere / audit
**What goes wrong (de verificat, nu blocant):** `audit_categorii_competitie` (AFTER INSERT, `audit_trigger_fn`, `20261115a`) scrie un rand in `audit_log` per categorie inserata (~72); `trg_competitii_fram_imutabil` BEFORE INSERT (`20261115b`) cere `is_super_admin()` pentru `fram_obligatoriu=true` — trece in RPC pentru ca garda ruleaza prima. `trg_categorie_blocheaza_stergere` e doar BEFORE DELETE; `trg_participant_*` sunt pe inscrieri/echipe, nu pe categorii. [VERIFIED: migrari; de reconfirmat live prin `pg_trigger`]
**How to avoid:** include in teste live: clona cu `fram_obligatoriu=true` reuseste; numara randurile din `audit_log` (nu se sterg).

### Pitfall 6: ACL — allowlist-ul definer
**What goes wrong:** `tests/acl_definer_faza37.ts` pica daca apare o functie SECURITY DEFINER expusa lui `authenticated` care nu e in `tests/acl_definer_faza37.allowlist.json` (Faza 41 a adaugat `categorii_aplica_operatie(...)` acolo; `"nota"` mentioneaza "41-01: +1 functie").
**How to avoid:** planul include adaugarea semnaturii exacte `competitie_cloneaza(uuid,text,text,date,date,date,boolean,boolean,uuid[])` in lista `authenticated` + actualizarea notei, si rularea testului dupa apply. Supabase acorda EXECUTE explicit lui `anon` la functii noi — `REVOKE ... FROM PUBLIC, anon` este obligatoriu; verifica `has_function_privilege('anon', ...) = false` dupa apply.

### Pitfall 7: `search_path`
CONTEXT D-04 scrie `public, pg_catalog`, dar `20261115a/b` au mutat tot (RPC Faza 41, `is_super_admin`, toate functiile noi) pe `pg_catalog, public`. Foloseste `pg_catalog, public` si calificare explicita `public.` (vezi A2).

### Pitfall 8: UX si mobil
`Modal` din `ui.tsx` are `items-center`, `max-h-[90vh]`, corp scrollabil; la 375px lista de avertismente trebuie sa fie in zona scrollabila a corpului, butonul "Creeaza" in afara listei lungi (ca in `GenerareSabloaneModal`: footer separat). Bifele `min-h-10`, `touch-manipulation`. Dublu-click: `loading` dezactiveaza butonul; RPC are oricum lock advisory.

### Pitfall 9: Date si FRAM
`fram_obligatoriu` se evalueaza pe anul calendaristic al `data_inceput` NOU (trigger `trg_participant_fram`); copierea flag-ului e corecta, dar previzualizarea ar trebui sa arate anul FRAM (`anFramCompetitie`) cand flag-ul e activ. Dupa clonare, `fram_obligatoriu` ramane modificabil pentru ca noua competitie e `draft` fara participanti.

## Code Examples

### Serviciu (tipar `{ data, error }`)
```ts
// Source: services/categoriiAdminService.ts (pattern)
export async function cloneazaCompetitie(p: {
  sursaId: string; denumire: string; tip: string; dataInceput: string; dataSfarsit: string; deadline: string;
  setari: boolean; probe: boolean; categorii: string[];
}): Promise<{ data: RezultatClonareCompetitie | null; error: any }> {
  if (!supabase) return { data: null, error: 'Supabase neinitializat' };
  const { data, error } = await supabase.rpc('competitie_cloneaza', {
    p_sursa: p.sursaId, p_denumire: p.denumire, p_tip: p.tip, p_data_inceput: p.dataInceput, p_data_sfarsit: p.dataSfarsit,
    p_deadline: p.deadline, p_setari: p.setari, p_probe: p.probe, p_categorii: p.categorii,
  });
  return { data: error ? null : (data as RezultatClonareCompetitie), error };
}
```

### Avertismente cross-tip (D-11/D-12)
```ts
// Source: utils/competitiiTemplates.ts DEFAULT_PROBE_PER_TIP (D-12)
export function avertismenteTip(sursaTip: string, tinta: string, probe: ProbaCompetitie[], ids: Set<string>, cats: CategorieCompetitie[]) {
  if (sursaTip === tinta) return { probe: [], categorii: 0 };            // aceeasi tip => zero avertismente (J1SV tehnica are giao_dau legitim)
  const ok = new Set((DEFAULT_PROBE_PER_TIP[tinta] ?? []).map(p => p.tip_proba));
  const inc = probe.filter(p => !ok.has(p.tip_proba));
  const incIds = new Set(inc.map(p => p.id));
  return { probe: inc, categorii: cats.filter(c => ids.has(c.id) && c.proba_id && incIds.has(c.proba_id)).length };
}
```

### Test live (tipar Faza 41)
`tests/categorii_admin_faza41.ts`: competitii efemere `ZZ_TEST_FAZA45_*`, `admin` (service_role) pentru setup, clienti per rol cu header `active-role-context-id` (`signInWithPassword`), `finally` sterge competitiile (CASCADE) si utilizatorii temporari. Cazuri minime: (1) ADMIN_CLUB / ADMIN federatie / anon => 42501 sau PGRST; (2) clona reusita: `status='draft'`, `club_id` NULL, `legacy_eveniment_id` NULL, `observatii` contine id sursa, nr. probe/categorii corect, toate `proba_id` ale categoriilor noi apartin probelor competitiei noi, `numar_categorie`=`ordine_afisare`=1..N contiguu, toate `activa/false/NULL`, 0 inscrieri/echipe; (3) atomicitate: id de categorie din ALTA competitie -> exceptie si 0 randuri `competitii` noi (numara dupa denumire); (4) nume duplicat refuzat; (5) deadline > data_inceput refuzat; (6) `fram_obligatoriu=true` copiat; (7) `p_categorii` goal + `p_probe=true` => doar probe; (8) `p_setari=false` => taxe implicite.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fuzionare "in loc" (categoria pastrata rescrisa, autoreferinta) | Fuzionare prin RPC: rezultat nou, surse `fuzionata`, copiii impartirii in `categorii_fuzionate_din` al parintelui | Faza 41, 14.11.2026 | Ambele forme coexista in date; reconstruirea trebuie sa le trateze pe amandoua |
| Creare competitie/categorii prin inserturi client succesive | RPC atomic per operatie (Faza 41, 42) | Nov 2026 | Clonarea urmeaza noul tipar |
| `search_path = public, pg_catalog` | `pg_catalog, public` | 20261115a | Foloseste varianta intarita |

**Deprecated/outdated:** template per tip (respins, D-02); `p_setari jsonb` din CONTEXT ramane doar ca sugestie (vezi Alternatives).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Parametri tipati + `p_categorii uuid[]` calculat in client sunt acceptabili ca forma a RPC (CONTEXT lasa structura RPC la discretia mea) | Summary / Pattern 1 | Daca userul vrea ca serverul sa impuna reconstruirea (D-06) => RPC mai complex, preview ar necesita dry-run |
| A2 | `search_path = pg_catalog, public` e preferat fata de `public, pg_catalog` din D-04 (consistent cu hardening 20261115a) | Pitfall 7 | Mic: ambele sigure daca se califica `public.`; planner poate alinia cu textul D-04 |
| A3 | "probe fara categorii" e permis (doar probe); "categorii" forteaza "probe" | Pattern/UI | Daca D-03 se citeste literal ("probe fara categorii nu exista") UI-ul ar trebui sa lege invers; textul cere clarificare scurta |
| A4 | Modalul nu cere `items-end` pe mobil (se ramane la `Modal` existent) | Pitfall 8 | Mic: daca se doreste bottom-sheet, e nevoie de prop nou in `ui.tsx` |
| A5 | CHECK `competitii.tip IN (tehnica,giao_dau,cvd)` inca activ live | Pitfall 3 | Daca a fost eliminat, `stagiu` ar fi permis; lista fixa de 3 tipuri ramane sigura |
| A6 | Nu exista UNIQUE `(competitie_id, numar_categorie)` live | Schema | Fara impact: renumerotarea e contigua pe o competitie noua, fara conflicte |
| A7 | Triggerele `audit_competitii` pe `competitii` nu blocheaza INSERT-ul (necunoscut daca exista) | Pitfall 5 | Ar aparea la primul test live; fara impact de design |
| A8 | Valori implicite taxe cand "setari" e debifat = cele din `CompetitieForm` (80/80/120/150/80, `taxa_individual=80`, `taxa_echipa=120`) | Pitfall 4 | Daca userul prefera 0 sau blocarea ("bifa setari obligatorie") se schimba o ramura |

## Open Questions

1. **Tipul tinta in asistent**
   - What we know: D-11 permite clonare intre tipuri; D-14 nu listeaza campul "tip" printre campurile asistentului. `competitii.tip` e NOT NULL.
   - What's unclear: tipul tinta e preluat din sursa sau editabil?
   - Recommendation: `Select` editabil, implicit tipul sursei, doar cele 3 tipuri permise; avertismentele cross-tip apar cand difera. (Fara aceasta, D-11 nu poate fi folosit.)
2. **"Setari" debifat**
   - What we know: D-10 acopera doar cazul bifat.
   - What's unclear: ce valori primesc taxele/FRAM/locatie/organizator.
   - Recommendation: Pitfall 4 (valori implicite din `CompetitieForm`, FRAM false, locatie/organizator NULL), afisat in previzualizare. Alternativ: bifa "setari" nedezactivabila. Cere confirmare scurta.
3. **Fuzionari legacy (informare, nu decizie noua)**
   - What we know: cele 2 fuzionari reale sunt "in loc"; fallback D-08 se aplica automat.
   - What's unclear: userul vrea sa stie ca "sursa" fuzionata (nr. 1 si 10) NU intra in clona?
   - Recommendation: mesaj explicit in previzualizare ("Categoria 9 provine din fuzionare veche; se copiaza forma fuzionata; sursa 1 omisa").
4. **Prag de drift**
   - Sursa e de regula finalizata si stabila; verificarea `p_asteptat` (ca in Faza 41) e optionala. Recomandare: omisa (minim); se poate adauga `p_asteptat integer` daca planner-ul vrea paritate cu 41.
5. **Ce NU se cloneaza si exista pe competitie**
   - `program_competitie` (program pe categorie), `personal_competitie`, `competitie_sportiv_arme`, `acces_competitie_extern`, `cereri_*`, `rezultate_competitie` au `competitie_id`/`categorie_id`. Per D-01 nu intra; recomandare: o linie in previzualizare "Programul si personalul NU se copiaza".

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm + `tsx` | teste (`npx tsx ...`), `npm run lint` (`tsc --noEmit`) | ✓ | tsx 4.21.0 (package.json) | — |
| Supabase live (PostgREST, service_role din `.env`) | teste live, verificari read-only | ✓ | phi-hau-db | — |
| Supabase MCP (pg_catalog: `pg_policies`, `pg_trigger`, `pg_constraint`, `pg_proc` ACL) | verificarile live ramase + apply migrare | ✗ pentru acest agent (nu are tool SQL); disponibil orchestratorului | — | Orchestratorul ruleaza interogarile din lista de mai jos |
| `supabase` CLI / `psql` | — | ✗ | — | Nu e necesar (MCP + `git add -f`) |
| Playwright MCP | verificare vizuala | ✗ (timeout conectare in aceasta sesiune) | — | Verificare manuala/`npm test` ulterior |

**Interogari live ramase pentru orchestrator (read-only, inainte de apply):**
1. `pg_constraint` pe `competitii` (CHECK tip/status/deadline), `categorii_competitie`, `probe_competitie` (UNIQUE ascunse).
2. `pg_trigger` pe `competitii`, `probe_competitie`, `categorii_competitie` (BEFORE INSERT necunoscute; `audit_*`).
3. `pg_policies` pe cele 3 tabele (politici fantoma; regula din memorie: verifica live, nu doar migrari).
4. `rolbypassrls`/owner `postgres` pentru definer + FORCE RLS pe cele 3 tabele (Faza 41/42 il confirma pentru competitii si categorii_competitie; probe_competitie neconfirmat explicit).

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** acces catalog `pg_*` (MCP la orchestrator).

## Security Domain

`security_enforcement` = true (ASVS nivel 1) in `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (neatinsa) |
| V3 Session Management | no | Header `active-role-context-id` injectat de `supabaseClient.ts` |
| V4 Access Control | yes | `is_super_admin()` prima instructiune RPC; `REVOKE PUBLIC, anon`; buton ascuns in UI (doar UX) |
| V5 Input Validation | yes | Parametri tipati (`date`, `uuid[]`, `boolean`) + verificari explicite (lungime nume, tip permis, date, apartenenta id-urilor) cu `ERRCODE 22023` |
| V6 Cryptography | no | — |

### Known Threat Patterns for Supabase SECURITY DEFINER RPC

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Escaladare privilegii prin DEFINER apelabil de `anon`/orice `authenticated` | Elevation | Garda prima instructiune + REVOKE anon + test cu roluri non-super-admin (ADMIN_CLUB, ADMIN federatie) |
| `search_path` hijack | Tampering | `SET search_path = pg_catalog, public` + obiecte calificate `public.` |
| Id-uri de categorie din alta competitie (IDOR/mass-copy) | Tampering/Info disclosure | Validare `competitie_id = p_sursa` pentru TOATE id-urile, altfel 22023 si rollback |
| Clone-spam / dublu-click | DoS | Lock advisory, buton dezactivat in `loading`, dimensiunea e marginita de sursa |
| Fisier ACL nesincronizat (functie noua expusa) | Info disclosure | `tests/acl_definer_faza37.allowlist.json` + rularea testului ACL |
| Injectie SQL | Tampering | Fara SQL dinamic; parametri tipati |
| Audit | Repudiation | `audit_competitii`/`audit_categorii_competitie` (daca exista) scriu `audit_log`; `observatii` pastreaza sursa (D-16) |

## Verification Notes (nyquist_validation = false, sectiunea completa omisa)

- `npm run lint` (`tsc --noEmit`) dupa fiecare plan TS.
- `npx tsx utils/clonareCompetitie.test.ts` (unit, fara DB; fixtures: legacy autoref, RPC fuzionare, impartita + copii, anulata, orfana, chain).
- `npx tsx tests/competitie_cloneaza_faza45.ts` (live, dupa apply cu OK explicit) + `npx tsx tests/acl_definer_faza37.ts`.
- Verificare reala pe competitia sursa "Juniori 1, Seniori, Veterani" (id `3d2187dc…`): asteptat 72 categorii, 2 avertismente legacy, 9 anulate incluse, 10 copii excluse; se verifica pe clona temporara si se sterge (CASCADE).
- UI: 375 / 768 / 1280; tab ascuns in Chrome MCP da teste false (memorie: verifica `document.hidden`).
- Dupa modificarea non-triviala: review separat pe diff (instructiune globala utilizator) + aplicare live doar cu OK; `git add -f` pe migrare (`supabase/` e in `.gitignore`).

## Sources

### Primary (HIGH confidence)
- Live Supabase PostgREST OpenAPI + SELECT-uri read-only (service_role, 18.11.2026): schema `competitii`, `probe_competitie`, `categorii_competitie`, `categorii_template`, `tipuri_competitie`; distributii status/tip/probe; verificarea structurii categoriilor competitiei `3d2187dc` (fuzionari/impartiri/anulate).
- `supabase/migrations/20261114a_categorii_aplica_operatie.sql`, `20261115a_categorii_securitate_hardening.sql`, `20261115b_competitie_fram_editare.sql`, `20260319_competitii_schema.sql`, `20261106b_rls_competitii_scriere_club_scoped.sql`, `20261112a_deadline_inscrieri_obligatoriu.sql`
- `components/Competitii/{index,CompetitieForm,GenerareSabloaneModal,MigrareModal,constants}.tsx`, `components/ui.tsx` (Modal), `utils/competitiiTemplates.ts`, `utils/taxeCompetitie.ts`, `utils/categoriiAdmin.ts`, `services/categoriiAdminService.ts`, `types.ts`, `tests/categorii_admin_faza41.ts`, `tests/acl_definer_faza37.*`
- `.planning/phases/45-*/45-CONTEXT.md`, `45-DECISIONS.md`, `45-AVOCAT-DIAVOL.md`, `45-DISCUSSION-LOG.md`

### Secondary (MEDIUM confidence)
- Comentariile din migrari privind verificari live anterioare (rolbypassrls, FORCE RLS, triggere) — reconfirmare recomandata.

### Tertiary (LOW confidence)
- Nimic bazat doar pe cautari web (nu a fost necesara documentatie externa; nu exista biblioteci noi).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — doar componente interne existente, verificate in cod
- Architecture: HIGH — tipar Faza 41 + date reale; singura optiune de design (TS calculeaza ids) e o recomandare (A1)
- Pitfalls: HIGH pentru 1-4, 6-8 (date/cod verificate); MEDIUM pentru 5 (triggere/politici fara acces `pg_catalog`)

**Research date:** 2026-11-18
**Valid until:** 2026-12-18 (schema se schimba des intre faze; reverifica `competitii`/`categorii_competitie` daca intervine o migrare noua)
