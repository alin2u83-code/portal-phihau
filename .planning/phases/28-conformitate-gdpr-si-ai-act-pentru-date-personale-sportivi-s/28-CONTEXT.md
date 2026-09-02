# Phase 28: Conformitate GDPR si AI Act - Context

**Gathered:** 2026-09-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Faza aduce portal-phihau de la zero documentatie GDPR/AI Act la: 4 documente de conformitate (registru prelucrari, DPIA, DPA/subprocesatori, politica retentie), consimtamant parinte digital pt minori <16 ani, minimizare date trimise la Claude API (elimina userName), pagina "Protectia datelor" in UI, si flux self-service cerere export/stergere date cu coada aprobare ADMIN_CLUB.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements sunt locked.** Vezi `28-SPEC.md` pt requirements complete, boundaries si acceptance criteria.

Agentii downstream TREBUIE sa citeasca `28-SPEC.md` inainte de planning/implementare. Requirements nu sunt duplicate aici.

**In scope (din SPEC.md):**
- 4 documente markdown in `docs/gdpr/` (registru, DPIA, subprocesatori, retentie)
- Nota informare UI la inregistrare
- Camp consimtamant parinte digital (minori <16 ani) in formular + DB
- Minimizare `userName` din `claudeService.ts`
- Pagina "Protectia datelor" in UI
- Flux cerere GDPR (export/stergere) cu coada aprobare ADMIN_CLUB — stergerea efectiva ramane manuala dupa aprobare

**Out of scope (din SPEC.md):**
- Numire DPO oficial
- Audit extern / certificare GDPR
- Migrarea infrastructurii (regiune Supabase, provider AI)
- Export automat instant fara aprobare
- Modificarea `ragService.ts`

</spec_lock>

<decisions>
## Implementation Decisions

### Consimtamant parinte (minori <16 ani)
- **D-01:** Coloanele `consimtamant_parinte_nume` si `consimtamant_parinte_data` merg pe tabelul `sportivi` (NU `fisa_inscriere`, care e gol/0 randuri si nefolosit in cod azi).
- **D-02:** Varsta <16 se calculeaza live la schimbarea `data_nasterii` in formular (camp apare/dispare imediat, nu doar la submit). Refolosim `calculeazaVarstaLaData(dataNasterii, dataDeReferinta)` din `utils/eligibilitateCompetitie.ts`, apelata cu data curenta ca al doilea parametru.
- **D-03:** Sportivii <16 ani EXISTENTI (creati inainte de migratie, fara consimtamant salvat) sunt blocati la urmatoarea EDITARE — nu doar la creare sportiv nou. Salvarea esueaza cu mesaj clar pana completeaza campul. (Extindere fata de textul literal SPEC "sportiv nou", dar in domeniul aceleiasi cerinte — nu capacitate noua.)
- **D-04:** Campuri: `consimtamant_parinte_nume` (input text nume complet parinte) + `consimtamant_parinte_data` (setata automat = data curenta la submit, NU editabila de user).
- **D-05:** Campul apare in tabul General din `SportivFormModal.tsx`, imediat sub campul `data_nasterii`.

### Tabel `cereri_gdpr` + coada aprobare
- **D-06:** Status enum refoloseste EXACT pattern-ul existent din `cereri_inscriere` (vezi `components/Sportivi/CereriInscriere.tsx`): `'in_asteptare' | 'aprobata' | 'respinsa'` (romana, nu engleza ca in textul SPEC). Camp `procesat_la` (timestamp) + `procesat_de` (user id admin).
- **D-07:** Coloane: `sportiv_id`, `tip_cerere` (`export` | `stergere`), `status`, `data_cerere`, `procesat_la`, `procesat_de`.
- **D-08:** Ecran admin nou dedicat "Cereri GDPR" in meniul admin (view separat, similar structural cu `CereriInscriere.tsx`), NU tab combinat in pagina Protectia datelor.
- **D-09:** Orice rol logat creeaza cerere pt PROPRIUL cont sportiv — nu se poate crea cerere in numele altui sportiv. `sportiv_id` se determina din legatura existenta `sportivi.user_id = auth.uid()` (confirmat: coloana exista, folosita in `utils/auth.ts` si alte fisiere).
- **D-10:** Daca userul curent nu are `sportiv_id` legat (ex. SUPER_ADMIN_FEDERATIE fara profil sportiv), butonul de creare cerere e ASCUNS/dezactivat — nu vizibil cu eroare la click.
- **D-11:** La aprobare (orice tip_cerere), tehnic se schimba DOAR `status -> 'aprobata'` + `procesat_de` + `procesat_la`. Nicio actiune automata pe date (nu deschide modal stergere, nu genereaza export automat). Admin actioneaza manual separat (Sportivi > Sterge existent, sau export-urile CSV/PDF deja existente in aplicatie).
- **D-12:** RLS pe `cereri_gdpr`: sportivul vede DOAR cererile proprii (join prin `sportivi.user_id = auth.uid()`); ADMIN_CLUB vede toate cererile clubului activ (`club_id = get_active_club_id()` prin join `sportivi.club_id`, pattern identic cu restul schemei); SUPER_ADMIN bypass total; INSTRUCTOR NU are acces deloc (nici read-only) — consistent cu alte fluxuri administrative sensibile (facturi federale).

### Pagina "Protectia datelor"
- **D-13:** Intra ca sectiune noua in meniul de Setari/Cont (nu item top-level in sidebar principal).
- **D-14:** Continut: text drepturi (acces/rectificare/stergere/opozitie) + buton creare cerere + LISTA cererilor proprii ale userului cu status (satisface direct acceptance criteria SPEC "sportivul vede statusul actualizat").
- **D-15:** Accesibila TUTUROR rolurilor autentificate (inclusiv SUPER_ADMIN_FEDERATIE, per acceptance criteria SPEC). Pt roluri fara `sportiv_id` (ex. super-admin pur): vede doar textul de drepturi, fara buton de cerere (consistent cu D-10).

### Nota informare GDPR
- **D-16:** Format: accordion expandabil, INCHIS implicit — nu aglomereaza formularul.
- **D-17:** Pozitie: tab General din `SportivFormModal.tsx`, SUS, inainte de campurile de date (prima informatie vazuta la deschidere).
- **D-18:** Apare DOAR la creare sportiv NOU — nu la editare sportiv existent (strict pe textul SPEC Requirement 4, fara extindere).
- **D-19:** Contine link catre pagina "Protectia datelor" (D-13/D-14) — SINGURA legatura intre cele doua arii, fara alta integrare.

### Claude's Discretion
- Text exact al notei de informare si al paginii Protectia datelor (continut GDPR-compliant, romana) — Claude redacteaza in planificare/implementare.
- Denumire exacta a view-ului nou in `types.ts`/`AppRouter.tsx` (ex. `'protectia-datelor'`, `'cereri-gdpr'`) — Claude alege consistent cu convențiile existente.
- Structura interna exacta a celor 4 documente markdown (dincolo de coloanele minime cerute de SPEC) — Claude redacteaza pe baza research-ului legal deja facut (memory `project_gdpr_ai_act_conformitate.md`).

</decisions>

<canonical_refs>
## Canonical References

**Agentii downstream TREBUIE sa citeasca acestea inainte de planning/implementare.**

### Spec si cercetare
- `.planning/phases/28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s/28-SPEC.md` — 9 requirements locked, boundaries, acceptance criteria (MANDATORY, citit inainte de orice)
- Memory `project_gdpr_ai_act_conformitate.md` (Claude memory system) — research legal GDPR + Legea 190/2018 + AI Act facut 2026-09-03, 10 obligatii concrete cu surse ANSPDCP/EDPB

### Cod existent — consimtamant/varsta
- `utils/eligibilitateCompetitie.ts` — functia `calculeazaVarstaLaData(dataNasterii, dataReferinta)` (linia ~9), de refolosit pt calcul varsta <16 ani
- `components/Sportivi/SportivFormFields.tsx` (linia ~150-217) — tab General, camp `data_nasterii` existent, loc unde intra campul nou de consimtamant
- `components/Sportivi/SportivFormModal.tsx` — modalul complet, loc pt accordion Nota informare

### Cod existent — pattern cereri/coada aprobare
- `components/Sportivi/CereriInscriere.tsx` — pattern COMPLET de referinta pt `cereri_gdpr`: status enum (`in_asteptare`/`aprobata`/`respinsa`), camp `procesat_la`, UI tabs pe status, butoane aprobare/respingere (liniile 4, 16, 29-30, 62-88, 302-343)

### Cod existent — legatura user-sportiv si minimizare Claude
- `utils/auth.ts` — confirma legatura `sportivi.user_id`
- `services/claudeService.ts` — functia `buildSystemPrompt()` (linia ~44), interfata `ClaudeRequestContext`, linia 56 `${ctx.userName}` de eliminat

### RLS / conventii DB
- `docs/baza-de-date.md` — lista tabele existente (nu contine detalii coloane fisa_inscriere — schema thin)
- `.planning/phases/16-elimina-politici-rls-using-true-ramase-rezultate-facturi-fed/16-01-SUMMARY.md` — precedent RLS pe `fisa_inscriere` (functie SECURITY DEFINER `fisa_practicant_club_id`), pattern de urmat pt `cereri_gdpr` RLS
- **Nota migratii:** `supabase/migrations/` e gitignored/netracked in acest repo (confirmat in 16-01-SUMMARY.md) — migratiile se aplica live via Supabase MCP `apply_migration`, nu prin commit obisnuit de fisier SQL.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calculeazaVarstaLaData()` (`utils/eligibilitateCompetitie.ts`) — calcul varsta, gata de refolosit fara modificare
- Pattern `CereriInscriere.tsx` — copiabil structural pt `cereri_gdpr` (status enum, tabs, actiuni aprobare/respingere)
- `sportivi.user_id` — legatura user<->sportiv deja existenta, folosita in `utils/auth.ts`

### Established Patterns
- Status enum-uri de tip "cerere" sunt in romana (`in_asteptare`/`aprobata`/`respinsa`), nu engleza — conventie de urmat si pt `cereri_gdpr` desi SPEC.md scrie termenii in engleza generic
- RLS scoping pe club urmeaza pattern `club_id = get_active_club_id()` prin join, cu bypass explicit pt super-admin — vezi precedent `fisa_inscriere` din Faza 16
- Migratiile SQL se aplica live prin Supabase MCP, nu sunt urmarite in git in acest repo

### Integration Points
- Camp consimtamant + accordion nota informare se integreaza in `SportivFormModal.tsx` / `SportivFormFields.tsx` tab General (fisiere deja existente, nu componente noi separate pt formular)
- View nou "Protectia datelor" + "Cereri GDPR" se adauga in `types.ts` (union `View`) si `AppRouter.tsx` (dispatch), plus intrare in Sidebar sub sectiunea Setari/Cont
- `claudeService.ts` `buildSystemPrompt()` — modificare minima, elimina o linie, nicio schimbare de arhitectura

</code_context>

<specifics>
## Specific Ideas

Niciuna suplimentara fata de deciziile de mai sus — discutia a ramas pe intrebari de plasare/structura tehnica, nu pe "vreau sa arate ca X".

</specifics>

<deferred>
## Deferred Ideas

- **Audit + export date existente in DB, curatare campuri nefolosite (data minimization pe date live)** — propus de user in timpul discutiei, dar e o capacitate noua (audit al datelor deja stocate, nu al fluxurilor noi din SPEC) — nu parte din cele 9 requirements locked ale fazei 28. Candidat pt o faza viitoare dedicata data minimization / cleanup DB.

### Reviewed Todos (not folded)
None — nicio potrivire de todo-uri pentru aceasta faza.

</deferred>

---

*Phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s*
*Context gathered: 2026-09-03*
