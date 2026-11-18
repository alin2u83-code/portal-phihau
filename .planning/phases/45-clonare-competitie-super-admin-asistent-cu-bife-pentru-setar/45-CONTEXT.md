# Phase 45: Clonare competitie (super admin) - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Super adminul cloneaza o competitie existenta intr-o competitie NOUA in `schita` (draft), printr-un asistent cu bife: setari competitie, categorii, probe. Fara inscrieri/echipe. Un singur RPC tranzactional. "Template per tip" este INLOCUIT de clonare din orice competitie (de obicei ultima finalizata de acelasi tip); fara tabel/coloana noua de template, `categorii_template` ramane global pentru crearea de la zero.

Fisiere conexe in faza: `45-DECISIONS.md` (decizii initiale), `45-AVOCAT-DIAVOL.md` (raport critic).

</domain>

<decisions>
## Implementation Decisions

### Ce se cloneaza si cum
- **D-01:** Se cloneaza: setari competitie (tip, `config_taxe`, `taxa_individual`, `taxa_echipa`, locatie, organizator, `fram_obligatoriu`), categorii, probe. NU se cloneaza: inscrieri/echipe, `legacy_eveniment_id`, `status` (noua = `schita`), `club_id`. Datele si deadline-ul se cer in asistent.
- **D-02:** "Template per tip" inlocuit cu clonare. Fara tabel/coloana de template noua si fara sincronizare template<->competitie.
- **D-03:** Categoriile implica probele: bifa "probe" fara "categorii" nu exista (categoria are `proba_id`; `proba_id` se remapeaza vechi -> nou, probe inserate prima data).
- **D-04:** Un singur RPC tranzactional `competitie_cloneaza` (SECURITY DEFINER, `SET search_path = public, pg_catalog`, prima instructiune garda `is_super_admin()` -> 42501, `REVOKE ... FROM PUBLIC, anon`, `GRANT ... TO authenticated, service_role`), dupa modelul `categorii_aplica_operatie` (`20261114a`). Fara clonare partiala. Fara coloane noi (3NF).
- **D-05:** Doar `SUPER_ADMIN_FEDERATIE`; garda reala in DB, butonul doar ascuns in UI pentru restul.

### Structura initiala a categoriilor (anulate, fuzionate, impartite)
- **D-06:** Se cloneaza STRUCTURA INITIALA a sursei, nu cea finala. Reconstruire verificata fezabila pe date reale: la fuzionari sursele raman cu `status_categorie='fuzionata'` (rezultatul = categorie activa cu `este_fuzionata=true`, de exclus); la impartiri sursele raman cu `status_categorie='impartita'` si `categorii_fuzionate_din` = id-urile categoriilor NOI rezultate (de exclus). Categoriile clonate au `status_categorie='activa'`, `este_fuzionata=false`, `categorii_fuzionate_din=NULL`.
- **D-07:** Categoriile ANULATE se INCLUD in clona, cu status activ (super adminul le anuleaza din nou daca nu le vrea). (Contrar recomandarii agentului avocat-diavol.)
- **D-08:** Previzualizarea marcheaza doar categoriile care NU pot fi reconstruite fidel. Daca o categorie nu poate fi reconstruita fidel (surse lipsa sau ambigue): se ia varianta activa si se avertizeaza in previzualizare; clonarea NU se opreste.
- **D-09:** `numar_categorie` si `ordine_afisare` se RENUMEROTEAZA continuu in competitia noua.

### Taxe
- **D-10:** `config_taxe`, `taxa_individual`, `taxa_echipa` se copiaza AS-IS (recomandarea avocat-diavol). Se modifica in draft inainte de deschiderea inscrierilor. Fara camp de taxe in asistent si fara reset.

### Clonare intre tipuri
- **D-11:** Clonarea intre tipuri e permisa (ex. CN Tehnica -> CVD). Se copiaza TOT, cu avertisment in previzualizare pentru probele/categoriile incompatibile cu tipul tinta; super adminul raspunde de rezultat si corecteaza in draft.
- **D-12:** "Compatibil" = dupa tipul probei: o proba e compatibila daca tipul ei (`thao_quyen`, `giao_dau`, `thao_lo_individual`, `song_luyen` etc.) exista in probatia tipului tinta; categoriile urmeaza proba. Lista exacta a tipurilor de proba per tip competitie = de stabilit in research din codul/DB existent.

### Pornire si iesire din asistent
- **D-13:** Butonul "Cloneaza" este pe RANDUL fiecarei competitii din lista (langa Editeaza/Sterge); sursa e fixa (cea de pe rand). Preselectarea "ultima finalizata de acelasi tip" nu mai are sens, fiindca sursa o alege super adminul prin randul ales.
- **D-14:** Asistentul = UN SINGUR ecran (Modal din `components/ui.tsx`): bife (setari / categorii / probe, cu categorii implica probe), nume (OBLIGATORIU, editabil, fara dubluri), date, deadline, apoi previzualizare cu numarul de categorii si avertismentele (incompatibilitati, reconstruiri, anulate incluse), buton Creeaza.
- **D-15:** Dupa creare se DESCHIDE noua competitie, in draft (detaliul ei), ca super adminul sa verifice taxele si sa deschida inscrierile.
- **D-16:** Sursa clonarii se noteaza in `competitii.observatii` ca text liber (ex. "Clonata din <denumire> (<id>) la <data>"). Fara coloana noua, fara rand dedicat in `audit_log`.

### Claude's Discretion
- Structura interna a RPC-ului (parametri, format `p_setari jsonb`, tratarea erorilor), structura exacta a previzualizarii, ordinea inserturilor in tranzactie, sufix implicit pentru nume.
- Layout responsive al Modalului (mobil `items-end`, bife `min-h-10`), in limitele `components/ui.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Faza 45
- `.planning/phases/45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar/45-DECISIONS.md` — decizii initiale 18.11 (D-02 revizuit)
- `.planning/phases/45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar/45-AVOCAT-DIAVOL.md` — raport critic: reutilizabil, 3NF, RLS/ACL, intrebari

### Model RPC si categorii (Faza 41/42)
- `supabase/migrations/20261114a_categorii_aplica_operatie.sql` — sablon RPC (garda, search_path, ACL); stari categorie (activa/anulata/fuzionata/impartita), `categorii_fuzionate_din`
- `supabase/migrations/20261115a_categorii_securitate_hardening.sql` — triggere (stergere blocata, categorie activa), search_path; de verificat ca nu blocheaza insertul pe draft
- `supabase/migrations/20261115b_competitie_fram_editare.sql` — `fram_obligatoriu` (immutabil dupa draft/participanti)
- `.planning/phases/41-administrare-categorii-competitie-super-admin-modificare-anu/41-DECISIONS.md` — decizii categorii admin
- `tests/categorii_admin_faza41.ts`, `tests/fram_editare_faza42.ts` — modele de teste live

### Docs proiect
- `docs/baza-de-date.md` — schema `competitii`, `categorii_competitie`, `probe`, `categorii_template`
- `docs/ARHITECTURA_COMPETITII.md` — tipuri competitii, probe, categorii
- `docs/module.md` — modulul Competitii
- `docs/roluri-permisiuni.md` — super admin, garda RLS, header `active-role-context-id`
- `CLAUDE.md` (radacina) — 3NF obligatoriu, UI doar `components/ui.tsx`, aplicare live doar cu OK user

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/Competitii/GenerareSabloaneModal.tsx` (rd. ~105-131): mapare `tip_proba -> proba_id` si creare categorii; logica de "categorie noua cu proba_id remapat" se reutilizeaza cu sursa = categoriile competitiei vechi.
- `components/Competitii/MigrareModal.tsx` (rd. ~37-48): exemplu de insert in `competitii` cu mapare de campuri.
- `components/Competitii/CategorieForm.tsx` (`cloneDin`): clonare de o singura categorie (doar UI) — nu se extinde, ramane separata.
- `components/Competitii/CompetitieForm.tsx`, `AdminPanel.tsx`: formular competitie si panou admin; `index.tsx` lista (butoane Editeaza/Sterge pe rand).
- Tipuri: `types.ts` (Competitie, ProbaCompetitie, CategorieCompetitie).

### Established Patterns
- RPC SECURITY DEFINER cu garda `is_super_admin()` + `REVOKE/GRANT` (Faza 41); migrari reversibile, aplicate live doar cu OK.
- Servicii returneaza `{ data, error }`; erori in UI prin `Alert`/`ErrorState`; `useError().showError`.
- Modal din `components/ui.tsx`; filtrare client-side pe date deja incarcate.

### Integration Points
- Buton "Cloneaza" pe randul competitiei in lista (`components/Competitii/index.tsx`), vizibil doar pentru super admin.
- Invalidare cache React Query dupa creare + navigare la noua competitie in draft.
- `competitii.observatii` primeste textul sursei clonarii.

</code_context>

<specifics>
## Specific Ideas

- Exemplu real pentru testare: competitia finalizata "Juniori 1, Seniori, Veterani" are 68 active, 9 anulate, 2 fuzionate, 5 impartite (verificat live 18.11.2026) — acopera toate cazurile de reconstruire. Competitia "Copii si Juniori (Iasi 2025)" (149 active) este sursa naturala pentru o editie noua.
- La clonare intre tipuri: previzualizarea listeaza explicit ce e incompatibil (nu ascunde).

</specifics>

<deferred>
## Deferred Ideas

- Clonare de inscrieri/echipe — respinsa; nu face parte din faza.
- Template per tip competitie cu sincronizare — respins in favoarea clonarii; de redeschis doar daca clonarea se dovedeste insuficienta.

### Reviewed Todos (not folded)
- Cele 4 todo-uri potrivite de `todo.match-phase` (ex. `2026-11-05-faza-36-acces-extern-deschise.md`, `2026-11-12-faza39-verificari-amanate.md`, `2026-11-12-reprezentant-schimba-grad-in-competitie.md`, `2026-09-01-reactivare-asistent-ai-dupa-fix-functionare.md`) — potriviri doar pe cuvinte generice ("competitie", "2026"); nu tin de clonare.

</deferred>

---

*Phase: 45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar*
*Context gathered: 2026-11-18*
