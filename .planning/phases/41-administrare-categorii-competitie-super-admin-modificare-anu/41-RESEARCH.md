# Phase 41: Administrare categorii competitie (super admin) - Research

**Researched:** 2026-11-14
**Domain:** React 18 + Supabase (Postgres RLS + plpgsql RPC) — operatii pe `categorii_competitie` si repointarea `inscrieri_competitie` / `echipe_competitie`
**Confidence:** MEDIUM-HIGH (cod si migrari citite direct; `pg_policies` LIVE si date live NU au fost verificate, vezi Open Questions)

<user_constraints>
## User Constraints (from 41-DECISIONS.md — nu exista CONTEXT.md)

### Locked Decisions
- UI: tab Categorii existent; actiuni per categorie + selectie multipla (fuziune); DOAR SUPER_ADMIN_FEDERATIE.
- Operatii: modificare, editare, anulare (sportivi insuficienti), clonare, fuziune, split.
- Inscrieri existente la anulare/fuziune/split: mutare automata + PREVIEW, super admin confirma. Anulare => inscrierile raman "fara categorie" pt realocare.
- Split direct din grupa/categorie (zona super admin): criteriu varsta | grad | gen (feminin/masculin/mixt separat) etc; super admin alege cum imparte. Lista grupei arata nume, club, grad, quyen executat.
- Constrangeri: fara librarii noi, ui.tsx, RLS existent.

### Claude's Discretion
- Nu exista sectiune explicita. Raman libere: modelul de date pentru "fara categorie", atomicitatea (RPC vs client), forma preview-ului, numerotarea categoriilor noi, statusurile competitiei in care operatiile sunt permise.

### Deferred Ideas (OUT OF SCOPE)
- Niciuna listata.
</user_constraints>

## Project Constraints (from CLAUDE.md)
- Fara librarii noi; UI doar din `components/ui.tsx` (Button, Modal, ConfirmModal, Input, Select, SearchableSelect, Badge, Card) — nu Shadcn/MUI.
- Tipuri doar in `types.ts`; limba: romana pentru domeniu/UI, engleza pentru patternuri tehnice. TS strict dezactivat.
- Servicii returneaza `{ data, error }`, nu arunca. Erori UI via `useError().showError`.
- Filtrare/derivari client-side pe date deja incarcate (constrangere proiect Sistem Filtrare Unificat) — preview-ul se calculeaza pe `categorii/inscrieri/echipe` deja in state.
- RLS = poarta reala; FE doar UX. Orice audit RLS trebuie confirmat pe `pg_policies` LIVE (memory: feedback_audit_rls_verifica_live).
- Migrari noi in `supabase/migrations/` se adauga cu `git add -f` (folderul e in .gitignore).
- Workflow: schimbari de cod doar prin comenzi GSD; dupa cod non-trivial, review separat (global CLAUDE.md) si raport "ce am verificat / ce nu".

## Summary

Fundatia exista deja pe jumatate. `categorii_competitie` are din 20260412 coloanele `status_categorie` ('activa'|'fuzionata'|'anulata', extins cu 'impartita' in 20261110a), `este_fuzionata`, `categorii_fuzionate_din uuid[]`. `constants.tsx` are deja `categorieActiva()` si `categorieEticheta()` (insigne "Fuzionata in N", "Impartita in ...", "Anulata"), iar `index.tsx` foloseste `categoriiActive` pentru wizardul de inscriere. Deci modelul de date pentru fuziune/split/anulare e prevazut: sursele ramane ca randuri istorice cu status, nu se sterg. Faza 41 e in principal: (1) UI nou pe tab-ul Categorii (care azi e read-only), (2) RPC-uri atomice SECURITY DEFINER pentru operatii, (3) preview client-side.

Doua lucruri existente intra in conflict si trebuie tratate: `FuzionariPanel.handleFuzioneaza` (tab Admin > Fuzionari) face 4 apeluri client succesive si la final STERGE categoria B (nu foloseste `status_categorie`, nu e atomic, `DELETE` esueaza daca B e referita de `rezultate_competitie`/`solicitari_echipe_incomplete`, dupa ce inscrierile au fost deja mutate) si `AdminPanel.handleDeleteCategorie` (delete real, FK `ON DELETE CASCADE` pe inscrieri/echipe/cereri_coechipier). Planul trebuie sa inlocuiasca logica de fuzionare cu noul RPC (sau sa o dezactiveze) ca sa nu existe doua mecanisme.

Cea mai importanta constatare de schema: `inscrieri_competitie.categorie_id` si `echipe_competitie.categorie_id` sunt NOT NULL (confirmat live prin schema OpenAPI PostgREST: `required=[..."categorie_id"...]`). "Fara categorie" deci NU se poate reprezenta cu NULL fara migrare de schema. Recomandare: NU se sterge NOT NULL; inscrierile unei categorii anulate raman legate de categoria `anulata` si UI le trateaza ca "Fara categorie (realocare)" — derivat din `!categorieActiva(cat)`.

**Primary recommendation:** 4 RPC-uri plpgsql SECURITY DEFINER cu garda `is_super_admin()` (anulare, fuziune, split, mutare/realocare) care primesc maparea explicita calculata de preview si re-valideaza in aceeasi tranzactie; clonare si modificare raman insert/update direct (RLS `categorii_w_all`/`categorii_r_*` deja permite SUPER_ADMIN_FEDERATIE); UI nou in tab Categorii cu modale din `ui.tsx`; statusul final al surselor prin `status_categorie`, niciodata DELETE.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vizibilitate butoane/selectie (doar super admin) | Browser (permissions.isSuperAdmin) | API (RLS/RPC garda) | UX in FE; poarta reala in DB |
| Calcul preview (cine se muta unde, coliziuni) | Browser | — | Datele sunt deja incarcate; constrangere "fara query-uri noi" |
| Aplicare anulare/fuziune/split (multi-tabel) | Database (RPC plpgsql) | — | Tranzactie unica; client multi-step lasa stari partiale |
| Clonare / modificare camp categorie | Database (insert/update RLS) | Browser | Operatie simpla pe un rand, RLS permite super admin |
| Garda "doar SUPER_ADMIN" | Database (`is_super_admin()`) | Browser | Header `active-role-context-id` e controlat de client; garda trebuie in DB |
| Afisare "Fara categorie" | Browser | — | Derivat din `categorieActiva(cat)`; fara schimbare de schema |
| Lista grupei (nume, club, grad, quyen) | Browser | — | Join din state + nomenclator `inlantuiri` |

## Standard Stack

Nicio dependenta noua (constrangere). Se foloseste ce exista:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI | existent [VERIFIED: package.json via CLAUDE.md] |
| @supabase/supabase-js | 2.98.0 | `supabase.rpc('...')`, insert/update | existent |
| `components/ui.tsx` | intern | Button, Modal, ConfirmModal, Select, Input, Badge | design system intern obligatoriu |
| `utils/competitiiTemplates.ts` `buildCategorieDenumire` | intern | denumire categorie noua | deja folosit de FuzionariPanel |
| `utils/eligibilitateCompetitie.ts` (`calculeazaVarstaLaData`, `gradEfectivLaData`, `verificaEligibilitate`) | intern | varsta/grad la data competitiei pentru preview split | regula unica de varsta/grad din wizard |
| `components/Competitii/constants.tsx` (`categorieActiva`, `categorieEticheta`) | intern | stare categorie | deja existent |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RPC plpgsql atomic | Client multi-step (stilul FuzionariPanel) | Client nu are tranzactie: stare partiala daca un pas pica; RLS RESTRICTIVE pe inscrieri adauga alte moduri de esec. Respins. |
| Pastrare `categorie_id` NOT NULL + "fara categorie" derivat | `ALTER ... DROP NOT NULL` | DROP NOT NULL: UNIQUE(categorie_id, sportiv_id) nu mai prinde dubluri cu NULL, `categorie_apartine_competitiei(NULL,..)` esueaza in gate-uri pentru non-super-admin, mai multe `!`/`.find` in FE. Se pierde si istoricul "din ce categorie venea". Doar daca userul cere explicit. |
| Surse fuzionate = `DELETE` | status `fuzionata`/`impartita` | DELETE pierde istoricul si risca FK (`rezultate_competitie`, `solicitari_echipe_incomplete`, CASCADE pe `cereri_coechipier`). Folosim statusuri. |

**Installation:** nimic. **Package Legitimacy Audit:** faza nu instaleaza pachete externe — sectiune N/A.

## Architecture Patterns

### System Architecture Diagram

```
Super admin (tab Categorii)
   |  selecteaza 1..n categorii / alege operatie
   v
[ Preview builder (client, pur) ] <-- state: categorii, inscrieri(+sportiv), echipe(+membri), grade, inlantuiri
   |  produce: plan = { surse[], categorii_noi[], mutari: [{tip:'inscriere'|'echipa', id, tinta}], avertismente[] }
   v
[ Modal Preview (ui.tsx Modal) ]  -- super admin poate schimba tinta pe rand (Select), apoi Confirma
   |
   v
supabase.rpc('categorii_<op>', { p_..., p_mutari: jsonb, p_asteptat: jsonb })
   |
   v  (o singura tranzactie, SECURITY DEFINER, is_super_admin() ELSE 42501)
[ RPC ]: lock categorii FOR UPDATE -> valideaza (aceeasi competitie, status != finalizata,
         conteaza == p_asteptat, nu exista dubluri UNIQUE) -> INSERT categorii noi ->
         UPDATE inscrieri/echipe SET categorie_id -> UPDATE surse SET status_categorie -> RETURN jsonb sumar
   |
   v
onRefresh() / fetchDataSilent()  (pattern existent) -> UI re-randeaza; inscrieri pe categorie anulata apar la "Fara categorie"
```

### Recommended Project Structure
```
components/Competitii/
├── index.tsx                        # tab Categorii: coloana Actiuni + checkbox selectie (doar permissions.isSuperAdmin)
├── CategoriiAdminActiuni.tsx        # NOU: bara selectie + butoane (Modifica/Clonează/Anulează/Fuzionează/Împarte)
├── CategorieOperatieModal.tsx       # NOU: preview + confirmare (un modal cu mod = anulare|fuziune|split)
├── ListaGrupaSplit.tsx              # NOU (sau in modal): lista nume/club/grad/quyen pentru split
utils/
└── categoriiAdmin.ts                # NOU: functii PURE (planAnulare, planFuziune, planSplit) + teste .ts rulate cu tsx
services/
└── categoriiAdminService.ts         # NOU: wrapper rpc -> { data, error } (conventie servicii)
supabase/migrations/
└── 20261114a_categorii_admin_rpc.sql  # NOU (git add -f)
tests/
├── categorii_admin_faza41.ts        # RLS/RPC test (stil tests/rls_competitii_scriere_faza36.ts)
└── (teste pure pentru utils/categoriiAdmin.ts)
```

### Pattern 1: RPC SECURITY DEFINER cu garda super admin (sablon: 20261112b `marcheaza_schimbare_grad_achitata`, `schimba_grad_competitie`)
**What:** `LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog`; prima linie `IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE='42501'; END IF;`; mesaje de eroare in romana; `NOTIFY pgrst, 'reload schema';` la sfarsitul migrarii.
**When to use:** orice operatie care atinge >1 tabel / >1 rand.
**ACL (Faza 37):** migrarea 20261107b a revocat EXECUTE implicit de la PUBLIC/anon. Functiile noi: `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION ... TO authenticated;` si adaugate in `tests/acl_definer_faza37.allowlist.json` sectiunea `authenticated` (testul ratchet altfel pica) [VERIFIED: fisiere citite].
**Example:**
```sql
-- Source: sablon din supabase/migrations/20261112b_schimbari_grad_competitie.sql
CREATE OR REPLACE FUNCTION public.categorii_anuleaza(p_categorie uuid, p_asteptat int)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE c record; n_i int; n_e int;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
  SELECT cc.*, k.status AS st INTO c FROM public.categorii_competitie cc
    JOIN public.competitii k ON k.id = cc.competitie_id WHERE cc.id = p_categorie FOR UPDATE OF cc;
  IF NOT FOUND THEN RAISE EXCEPTION 'Categoria nu exista.'; END IF;
  IF c.st = 'finalizata' THEN RAISE EXCEPTION 'Competitia este finalizata.'; END IF;
  IF COALESCE(c.status_categorie,'activa') <> 'activa' THEN RAISE EXCEPTION 'Categoria nu este activa.'; END IF;
  SELECT count(*) INTO n_i FROM public.inscrieri_competitie WHERE categorie_id = p_categorie AND status <> 'retras';
  SELECT count(*) INTO n_e FROM public.echipe_competitie   WHERE categorie_id = p_categorie AND status <> 'retrasa';
  IF n_i + n_e IS DISTINCT FROM p_asteptat THEN RAISE EXCEPTION 'Numarul de inscrisi s-a schimbat (% vs %); redeschide.', n_i+n_e, p_asteptat; END IF;
  UPDATE public.categorii_competitie SET status_categorie = 'anulata' WHERE id = p_categorie;
  RETURN jsonb_build_object('inscrieri', n_i, 'echipe', n_e);   -- raman legate de categoria anulata = "Fara categorie"
END $$;
```

### Pattern 2: Preview pur (functie fara efecte) + mutari explicite
`planFuziune(surse, tintaDefinitie, inscrieri, echipe)` returneaza `{ tintaNoua, mutari[], coliziuni[], avertismente[] }`; modalul afiseaza tabel (nume, club, grad, quyen, din → in) cu `Select` per rand pentru override; la confirmare se trimite `p_mutari jsonb` (`[{tip, id, tinta}]`). RPC valideaza: fiecare `id` apartine unei surse; fiecare `tinta` apartine aceleiasi competitii si e activa/nou creata; nicio pereche (sportiv,tinta) duplicata. `UPDATE ... FROM jsonb_to_recordset(...)`.

### Pattern 3: Fuziune cu randuri pastrate (modelul din docs/ARHITECTURA_COMPETITII.md 7.7 + `categorieEticheta`)
Fuziune = INSERT categorie noua (`este_fuzionata=true`, `status_categorie='activa'`, `categorii_fuzionate_din = surse`), mutare inscrieri/echipe pe ea, surse `status_categorie='fuzionata'`. `categorieEticheta` cauta tinta prin `k.este_fuzionata && categorii_fuzionate_din.includes(c.id)` — deci tinta trebuie sa contina ID-urile surselor (NU pe sine; comentariul din types.ts spune "incl. ea insasi" doar pentru varianta in care se refoloseste una din surse ca tinta — alegeti una si fiti consecventi; recomandare: categorie NOUA, `categorii_fuzionate_din = surse`).
Split = copii noi activi (copiaza toate campurile, ajusteaza interval/gen), sursa `status_categorie='impartita'`, `categorii_fuzionate_din = copii` (exact ce asteapta `categorieEticheta`).

### Anti-Patterns to Avoid
- **DELETE pe categorii cu istoric** (ca `handleDeleteCategorie` / `FuzionariPanel` pas 4): CASCADE sterge inscrieri/echipe/cereri_coechipier; FK fara cascade (`rezultate_competitie`, `solicitari_echipe_incomplete`) blocheaza dupa ce o parte a muncii s-a facut.
- **Lanturi `await supabase...update` in FE** pentru operatii multi-tabel (nu exista tranzactie).
- **`.eq('categorie_id', B)` fara filtru de status** la mutare: muta si inscrierile `retras`; decideti explicit (recomand: muta TOATE randurile incl. retras ca istoricul sa ramana coerent, dar contorizeaza doar active in preview).
- **Garda doar in FE** (`permissions.isSuperAdmin`): header-ul de context e client-controlled.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Denumire categorie | string concat | `buildCategorieDenumire` | format unic folosit in lista/fise |
| Varsta/grad la data competitiei | calcul propriu | `calculeazaVarstaLaData`, `gradEfectivLaData` | regula "grad urmator" (7/13 ani) deja codificata |
| Eticheta stare | badge nou | `categorieEticheta` / `categorieActiva` | deja in constants.tsx |
| Confirmare | modal propriu | `ConfirmModal` / `Modal` din ui.tsx | design system |
| Garda super admin | verificare rol in FE | `public.is_super_admin()` in RPC | citeste rolul din `utilizator_roluri_multicont` dupa header |
| Transaction | rollback manual | corp plpgsql unic | atomicitate nativa |

**Key insight:** domeniul pare simplu ("muta inscrieri") dar are coliziuni de UNIQUE, FK-uri laterale si stari partiale; singurul loc sigur e o functie plpgsql care valideaza si aplica intr-o tranzactie.

## Impact FK / date (ce atinge fiecare operatie)

Tabele cu `categorie_id` -> `categorii_competitie` [VERIFIED: migrari + schema OpenAPI live]:
| Tabel | FK | Nullable | Note |
|-------|----|----------|------|
| `inscrieri_competitie` | ON DELETE CASCADE | NOT NULL | `UNIQUE(categorie_id, sportiv_id)` si `UNIQUE(competitie_id, sportiv_id, categorie_id)`; coloane relevante: `inlantuire_id`, `inlantuire_id_2`, `arma_id`, `quyen_ales`, `club_id`, `status`, `taxa_achitata` |
| `echipe_competitie` | CASCADE | NOT NULL | membri in `echipa_sportivi(echipa_id)` (urmeaza echipa); `inlantuire_id`, `arma_id`, `club_id` |
| `cereri_coechipier` | CASCADE | NOT NULL | `UNIQUE(competitie_id, categorie_id, club_solicitant_id)` — repointarea ar putea coliziona |
| `solicitari_echipe_incomplete` | fara cascade | nullable | se afiseaza in `SolicitariEchipePanel` cu `categorii.find` |
| `rezultate_competitie` | fara cascade | nullable | blocheaza DELETE; nu se muta la fuziune/split (rezultate post-competitie) |
| Views `rbv_inscrieri_competitie_*`, `rbv_echipe_competitie_club` | LEFT JOIN | — | ok daca categoria ramane; `categorie_denumire` vine din categoria legata (anulata inclusa) |

Per operatie:
- **Modificare/editare:** UPDATE pe `categorii_competitie`. Atentie: schimbarea intervalului (varsta/grad/gen) pe o categorie cu inscrieri poate lasa sportivi neeligibili — avertisment in UI (nu blocare), reutilizand `verificaEligibilitate`. `CategorieForm` NU are campul `doua_quyenuri` si foloseste `parseInt(x) || null` (grad `0` devine null) — pentru "editare" extindeti `CategorieForm` cu `doua_quyenuri` si tratati `0` corect.
- **Clonare:** INSERT copie (toate campurile incl. `doua_quyenuri`, `proba_id`, `arma`), `numar_categorie = max+1`, `ordine_afisare = max+1`, `status_categorie='activa'`, `este_fuzionata=false`, `categorii_fuzionate_din=null`; fara inscrieri. Direct client (RLS permite), nu necesita RPC.
- **Anulare:** `status_categorie='anulata'`; inscrierile/echipele raman pe ea (= "Fara categorie"). Nu se sterg, nu se retrag. Taxe: raman datorate pana la realocare/retragere — decizie de business neacoperita (vezi Open Questions).
- **Fuziune (n>=2 surse):** validari: aceeasi competitie si proba, `tip_participare` identic, status activ; coliziune daca acelasi sportiv e in 2 surse (UNIQUE tinta) -> preview marcheaza, RPC refuza sau marcheaza duplicatul `retras`; echipe: `max_echipe_per_club` al tintei poate fi depasit -> avertisment. Tinta noua: min varsta, max varsta (NULL daca oricare e NULL), min/max grad, `min_participanti_start`/`sportivi_per_echipa_*` din sursa 1 (validati ca sunt egale).
- **Split:** criteriu varsta (praguri), grad (praguri), gen (Mixt -> Feminin + Masculin; "mixt separat"). Fiecare copil = clona sursei cu interval ajustat. Atribuire individuala: varsta la `competitie.data_inceput` (`calculeazaVarstaLaData`), grad = `gradEfectivLaData`, gen = `sportiv.gen`. **`index.tsx` selecteaza azi `sportiv:sportivi(id, nume, prenume, grad_actual_id, data_nasterii, club_id, cluburi(id, nume))` — fara `gen`; trebuie adaugat `gen` in ambele selecturi (fetchData + fetchDataSilent).** Echipe: gen/varsta/grad ale echipei = ambiguu -> atribuire implicita dupa membri titulari (ex. toti din copil X) si altfel "de alocat manual" in preview.
- **Realocare dupa anulare:** operatie "Muta in categorie" (RPC mic `categorii_muta_inscrieri(p_mutari)`) — necesara, altfel "fara categorie" nu are iesire. RLS `ic_r_gate_upd` cere `categorie_apartine_competitiei` sau `is_super_admin()`.

## Atomicitate si RLS

**Atomicitate:** RPC. Caile client existente (`FuzionariPanel`) sunt neatomice [VERIFIED: cod]. Controale in RPC: `SELECT ... FOR UPDATE` pe categoriile sursa (serializeaza dublu-click si doi admini), re-numarare vs `p_asteptat` (inscrierile pot aparea intre preview si confirmare — clubul inscrie prin wizard), refuz daca `competitii.status='finalizata'`.

**RLS (din migrari — NEVERIFICAT LIVE):**
- `categorii_competitie`: `categorii_w_all` FOR ALL + RESTRICTIVE `categorii_r_ins/upd/del` cu `get_active_role() IN ('SUPER_ADMIN_FEDERATIE','ADMIN')` [CITED: 20261106b]. Deci super admin (si rolul 'ADMIN') POT insera/actualiza/sterge categorii direct -> clonare/modificare nu cer RLS nou. NOTA: politica permite si rolul `ADMIN`, nu doar SUPER_ADMIN; cerinta "doar SUPER_ADMIN_FEDERATIE" se aplica in UI (`permissions.isSuperAdmin`) si in RPC (`is_super_admin()`).
- `inscrieri_competitie` UPDATE: permisiva `rbv_ic_update` (`has_access_to_club` — true pentru super admin pe orice club) + RESTRICTIVE `ic_r_scope_upd` (`has_access_to_club(club_id) OR acces_extern_competitie`) + `ic_r_gate_upd` (`is_super_admin() OR categorie_apartine_competitiei(...)`) [CITED: 20261106b, 20261106e]. Super admin trece pe UPDATE direct; in RPC definer (owner BYPASSRLS, dar vezi nota FORCE) nu conteaza oricum.
- `echipe_competitie`: analog (`ec_w_upd`, `ec_r_scope_upd`, `ec_r_gate_upd`).
- NOTA FORCE (memory + 20261111d): un event trigger live (`ensure_rls_on_create`) pune FORCE ROW LEVEL SECURITY pe tabele NOI; tabelele competitiei sunt vechi, dar functia definer trebuie testata real — daca owner-ul ar fi supus RLS, UPDATE-ul din RPC ar trebui sa treaca prin `is_super_admin()` (header-ul ramane vizibil in definer) deci ramane OK pentru super admin.
- Audit trigger `audit_trigger_fn` pe `inscrieri_competitie` si `echipe_competitie`: garda "Alege cine lucreaza" se aplica doar cand `cont_club_curent() IS NOT NULL` (conturi externe de club) si nu e context management [CITED: 20261111g]; super admin portal nu e afectat — dar functia LIVE nu a fost citita, verificati la testul RPC ca UPDATE-ul din definer nu cere sesiune de autor.
- `get_active_role()` exista live (folosita in 20261106b); `is_super_admin()` are mai multe definitii in istoric (20260305, 20260313 cu header, 20260319) — ultima ajunsa live decide; verificati `pg_get_functiondef` inainte de a depinde de comportamentul header-ului.

**Gap potential:** niciun gap RLS evident pentru scrierile super admin. Gap de verificat live: politici "fantoma" permisive pe `categorii_competitie` (precedent Faza 25); RESTRICTIVE le acopera la scriere.

## Common Pitfalls

### Pitfall 1: Coliziune UNIQUE la fuziune
**What goes wrong:** `UPDATE inscrieri SET categorie_id = tinta` pica cu 23505 cand acelasi sportiv e in doua surse (CVD: acelasi sportiv cu arme diferite in aceeasi proba; UNIQUE e pe (categorie, sportiv), nu pe arma — vezi comentariul din `Pas4Sumar.tsx:143`).
**How to avoid:** preview detecteaza perechile (sportiv) duplicate; RPC refuza cu mesaj clar sau marcheaza duplicatul `retras` cu confirmarea adminului.
**Warning signs:** eroare 23505 la confirmare, stare partiala daca era neatomic.

### Pitfall 2: "Fara categorie" invizibil in UI
**What goes wrong:** inscrierile raman pe categoria `anulata`; wizardul primeste doar `categoriiActive` (index.tsx:541) iar `Pas1.tsx:326`, `InscriereClubCards.tsx:42` si `index.tsx:92-101` din wizard filtreaza `catIds.has(i.categorie_id)` -> randurile dispar din wizard (clubul crede ca sportivul nu e inscris, il reinscrie in alta categorie -> duplicat orfan nerealocat, taxa dubla).
**How to avoid:** sectiune/filtru "Fara categorie" in tab Categorii si Inscrieri pentru super admin; in wizard, afiseaza bannerul "inscriere fara categorie — contacteaza federatia" sau excluderea sportivului de la reinscriere; la reinscriere, RPC/wizard sa verifice orfani pe (competitie, sportiv).
**Warning signs:** `Înscrieri (N)` din header include orfani; `FinanciarView`/`RaportInscrieri` numara taxe pentru categorii anulate.

### Pitfall 3: Calcule financiare/raport pe categorii neactive
`FinanciarView.tsx:52,71`, `RaportInscrieri.tsx:53-100`, `utils/taxeCompetitie.ts` itereaza inscrierile si fac `categorii.find(...)`. Inscrieri orfane (anulate) intra in totaluri; categoriile `fuzionata`/`impartita` raman in `categorii` si ar trebui sa nu mai aiba inscrieri (dupa mutare), dar `AdminPanel` calculeaza "categorii cu minim atins" pe toate categoriile (inclusiv anulate/fuzionate -> numere inselatoare). Planul trebuie sa treaca prin aceste locuri (filtru `categorieActiva` unde se numara categorii; decizie explicita pentru taxe orfane).

### Pitfall 4: `FuzionariPanel`/`handleDeleteCategorie` coexista cu modelul nou
Doua mecanisme de fuziune dau stari contradictorii (B sters vs B `fuzionata`). Inlocuiti `handleFuzioneaza` cu apelul RPC (sau scoateti panoul) si limitati stergerea la categorii fara nicio referinta (`cnt === 0` nu acopera `solicitari`/`rezultate`/randuri `retras`; CASCADE sterge si inscrierile retrase).

### Pitfall 5: Stale state / `useRegisterRefresh`
Dupa RPC apelati `onRefresh`/`fetchData` existent; `setCategorii` local nu e suficient (inscrierile se schimba). Pattern memorat: `fetchDataSilent` pentru a nu remonta wizardul.

### Pitfall 6: Drift preview vs aplicare
Un club se inscrie intre preview si confirmare -> RPC trebuie sa verifice `p_asteptat` / sa trateze randurile noi (ex. refuz cu "s-a schimbat, redeschide").

### Pitfall 7: Date lipsa pentru split
`sportiv.gen`, `data_nasterii`, `grad_actual_id` pot fi NULL (memorie: telefon lipsa pe multi; verificati). Sportivii fara data nasterii/grad -> in preview ca "neclasificat — alege manual", nu se pierd. Reutilizeaza `verificaEligibilitate` (motive "Data nasterii lipsa").

### Pitfall 8: Teams
Un `echipa_sportivi` poate avea membri din cluburi diferite (echipe inter-club, 34 randuri legacy); mutarea pe categorie urmeaza `echipe_competitie.categorie_id`, nu membrii. `max_echipe_per_club` in tinta.

### Pitfall 9: Competitie in curs
Operatii permise cand `status` e `inscrieri_deschise`/`inscrieri_inchise`; docs/ARHITECTURA_COMPETITII 7.7 spune "dupa inscrieri_inchise" pentru fuziune. Blocati la `finalizata`; restul de decis (Open Questions).

### Pitfall 10: Re-render / index.tsx monolit
Tab-ul Categorii e inline in `index.tsx` (1092 linii). Extrageti componentele noi in fisiere separate si pasati doar props necesare; `useMemo` pentru planurile preview (constrangere "atentie la re-rendere").

## Code Examples

### Apel RPC + wrapper de serviciu (conventie `{data,error}`)
```ts
// services/categoriiAdminService.ts  (patternul din services/taxeAnualeService.ts)
import { supabase } from '../supabaseClient';
export async function aplicaFuziune(payload: { surse: string[]; tinta: object; mutari: Array<{tip:'inscriere'|'echipa'; id:string; tinta:string|'NOU'}>; asteptat: number }) {
  const { data, error } = await supabase.rpc('categorii_fuzioneaza', { p_payload: payload });
  return error ? { data: null, error } : { data, error: null };
}
```

### Predicat "fara categorie" (derivat, fara schimbare de schema)
```ts
// utils/categoriiAdmin.ts
export const faraCategorie = (catId: string, categorii: CategorieCompetitie[]) => {
  const c = categorii.find(k => k.id === catId);
  return !!c && c.status_categorie === 'anulata';
};
```

### Atribuire split dupa varsta (pur, testabil)
```ts
// Source: utils/eligibilitateCompetitie.ts (calculeazaVarstaLaData, gradEfectivLaData)
export function copilPentruSportiv(s: Sportiv, copii: CategorieCompetitie[], grade: Grad[], dataComp: string) {
  const r = copii.filter(c => verificaEligibilitate(s, c, grade, dataComp).eligibil);
  return r.length === 1 ? r[0].id : null;   // 0 sau >1 => manual in preview
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `FuzionariPanel` muta + sterge sursa | surse pastrate cu `status_categorie` (`fuzionata`/`impartita`/`anulata`) + `categorii_fuzionate_din` | coloanele din 20260412, `impartita` in 20261110a, etichete in `constants.tsx` | Faza 41 completeaza implementarea modelului |
| Scripturi service-role (`j1sv_*`, `import_cn_copii_2025`) pentru restructurari | RPC in-app pentru super admin | Faza 41 | Scripturile raman pentru date de import; nu le reutilizati |

**Deprecated/outdated:** `FuzionariPanel.handleFuzioneaza` (non-atomic + DELETE) — de inlocuit.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Fara categorie" = inscrieri ramase pe categoria `anulata` (fara DROP NOT NULL) satisface decizia userului | Summary, FK impact | Daca userul vrea efectiv `categorie_id IS NULL`, e nevoie de migrare + audit UNIQUE/gate/FE — de confirmat in discutie |
| A2 | Politicile LIVE pe `categorii_competitie`/`inscrieri_competitie`/`echipe_competitie` corespund migrarii 20261106b/e (fara fantome care sa blocheze) | RLS | Scrieri esuate sau permisive; necesita `pg_policies` live cu Supabase MCP |
| A3 | `audit_trigger_fn` live nu cere sesiune de autor pentru super admin din portal | RLS | RPC ar esua cu "Alege cine lucreaza" |
| A4 | `is_super_admin()` live citeste rolul din header-ul de context (20260313/20260319), nu "orice rand SUPER_ADMIN" | RLS | Daca e varianta fara header, un utilizator cu rol SUPER_ADMIN pe alt context ar trece garda — tolerabil dar de stiut |
| A5 | Operatiile se permit pe orice status al competitiei != `finalizata` | Pitfall 9 | Poate fi prea permisiv/restrictiv fata de regula business |
| A6 | Taxele inscrierilor raman neschimbate la fuziune/split/anulare | FK impact | Taxa e per-categorie/tip? (`taxeCompetitie.ts` nu a fost citit in detaliu) |
| A7 | `sportivi.gen` exista si e populat ('Feminin'/'Masculin') | Split | Fara gen, splitul pe gen nu clasifica |

## Open Questions

1. **"Fara categorie": confirma userul varianta derivata (A1)?**
   - Stim: `categorie_id` NOT NULL live; modelul de statusuri exista.
   - Neclar: daca "fara categorie" trebuie sa dispara din listele categoriei anulate.
   - Recomandare: varianta derivata + sectiune "Fara categorie (de realocat)" in tab Categorii.
2. **Taxe si inscrieri orfane:** raman datorate pana la realocare? se retrag automat? (impact `FinanciarView`, `taxeCompetitie`, facturi generate la inscriere — memorie: factura automata la inscriere).
3. **Statusuri permise:** anulare/fuziune/split in `inscrieri_deschise`? (clubul poate fi la mijlocul wizardului).
4. **Notificare cluburi** cand sportivii sunt mutati? (nu e in decizii; recomand: nu in aceasta faza, doar jurnal prin audit trigger).
5. **Echipe la split** (atribuire dupa membri vs manual): confirmati manual-cu-sugestie.
6. **Verificari live necesare in Wave 0 (nu au putut fi facute in sesiunea de research):** `pg_policies` pentru cele 3 tabele, `pg_get_functiondef('is_super_admin')`, `audit_trigger_fn`, date reale (cate categorii au statusuri non-active, exista `rezultate_competitie`). In aceasta sesiune a rulat o singura citire a schemei OpenAPI PostgREST cu cheia service (fara date de randuri); o a doua interogare de date cu cheia service a fost blocata de sistemul de permisiuni si nu a fost reincercata — verificarile live raman de facut prin Supabase MCP.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase (live DB, migrari) | RPC + verificari pg_policies | Necunoscut in research (MCP Supabase nu a fost disponibil in acest agent) | — | Executorul foloseste Supabase MCP in sesiunea principala; migrarea se aplica live + `git add -f` |
| Node + tsx | teste `tests/*.ts` | probabil (npm scripts existente) | — | — |
| Playwright MCP | verificare UI | indisponibil in aceasta sesiune (timeout conectare) | — | verificare manuala / `playwright-portal-test` skill in executie |
| psql / supabase CLI | — | nu sunt in PATH | — | Supabase MCP |

## Validation Architecture
Sarit: `workflow.nyquist_validation = false` in `.planning/config.json`. (Recomandare de executie: teste pure `tsx` pentru `utils/categoriiAdmin.ts` — stil `services/soldService.test.ts` — si un test RPC in stilul `tests/rls_competitii_scriere_faza36.ts` cu prefix `ZZ_TEST_FAZA41_` si cleanup.)

## Security Domain

### Applicable ASVS Categories (nivel 1, `security_enforcement` activ)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (neschimbat) | — |
| V3 Session Management | no | — |
| V4 Access Control | **yes** | `is_super_admin()` in fiecare RPC + RLS existent; butoane ascunse in FE doar UX |
| V5 Input Validation | **yes** | RPC valideaza ID-uri (aceeasi competitie, apartin surselor), enum-uri (`gen`, `status_categorie`), `jsonb_to_recordset` cu tipuri, lungimi; fara SQL dinamic |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Escaladare: non-super-admin apeleaza RPC direct (anon key + header fals) | Elevation | garda `is_super_admin()` in corp; REVOKE FROM PUBLIC, anon; GRANT doar authenticated; adaugare in allowlist ACL (Faza 37) |
| IDOR: `p_mutari` cu inscrieri din alta competitie / tinta din alta competitie | Tampering | RPC verifica `competitie_id` al fiecarui rand si al tintei = competitia surselor |
| Mutare in categorie inactiva / nepotrivita proba | Tampering | RPC cere tinta `activa` sau nou creata; aceeasi proba/tip_participare |
| SECURITY DEFINER fara `search_path` | Elevation | `SET search_path = public, pg_catalog` obligatoriu |
| Race (admin dublu / club inscrie in paralel) | Tampering | `FOR UPDATE` pe categorii + `p_asteptat` |
| Pierdere date prin CASCADE | Tampering/DoS | niciun DELETE de categorie in operatii; statusuri |

## Sources

### Primary (HIGH confidence)
- Cod citit direct: `components/Competitii/{index,AdminPanel,FuzionariPanel,CategorieForm,InscrieriView,constants}.tsx`, `InscriereClubWizard/*` (grep), `types.ts`, `utils/eligibilitateCompetitie.ts`, `utils/competitiiTemplates.ts`
- Migrari: `20260319_competitii_schema.sql`, `20260412_flux_inscriere_competitii.sql`, `20260604_cereri_coechipier.sql`, `20261106b/c/e`, `20261110a`, `20261111d/f/g`, `20261112b`, `20261107b`, `tests/acl_definer_faza37.allowlist.json`
- Schema live (OpenAPI PostgREST, o singura citire): `inscrieri_competitie`/`echipe_competitie` `categorie_id` required; `categorii_competitie.doua_quyenuri` required; tabele cu FK catre categorii (`solicitari_echipe_incomplete`, `cereri_coechipier`, `rezultate_competitie`)
- `docs/ARHITECTURA_COMPETITII.md` sectiunea 7.7 (flux fuzionare)

### Secondary (MEDIUM)
- Memory proiect (Faza 25 RLS fantoma, FORCE RLS, Faza 36/39/40 context)

### Tertiary (LOW)
- Definitia LIVE a `is_super_admin`/`audit_trigger_fn`/politicilor — dedusa din migrari, neverificata live.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nicio dependenta noua, componente existente
- Architecture: HIGH — RPC + statusuri, modelul exista deja in schema/constants
- Pitfalls: MEDIUM-HIGH — derivate din cod/migrari; efectele pe finante/rapoarte necesita citire detaliata in plan
- RLS live: LOW-MEDIUM — neverificat pe `pg_policies`

**Research date:** 2026-11-14
**Valid until:** 2026-12-14 (schema competitiei se schimba rapid: fazele 39/40 au atins-o recent)
