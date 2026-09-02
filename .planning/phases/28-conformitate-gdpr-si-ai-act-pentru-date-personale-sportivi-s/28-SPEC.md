# Phase 28: Conformitate GDPR si AI Act — Specification

**Created:** 2026-09-03
**Ambiguity score:** 0.16 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

Portal-phihau trece de la zero documentatie GDPR/AI Act si zero mecanism digital pt drepturile persoanei vizate, la: (1) documente de conformitate complete (registru prelucrari, DPIA, DPA, nota informare, politica retentie), (2) camp digital de consimtamant parinte pt minori in formularul de inregistrare sportiv, (3) flux self-service cerere export/stergere date aprobat de ADMIN_CLUB, (4) minimizare date personale trimise la Claude API (elimina userName din system prompt).

## Background

Cercetare legala facuta 2026-09-03 (salvata in memory `project_gdpr_ai_act_conformitate.md`): GDPR + Legea 190/2018 + AI Act (Reg. UE 2024/1689) se aplica simultan. Scouting cod releva:

- `services/ragService.ts` — trimite catre `/api/rag-search` DOAR query text + cauta in `knowledge_base` (continut static de ajutor aplicatie) — NU trimite date personale sportivi. Risc scazut, confirmat prin cod.
- `services/claudeService.ts` `buildSystemPrompt()` — trimite `ctx.userName` + `ctx.clubName` + `ctx.userRole` + `ctx.activeView` la Claude API la FIECARE chat request. `userName` e date personal identificabil trimis la procesator extern fara minimizare — confirmat prin cod (linia ~9, `ClaudeRequestContext.userName`).
- `fisa_inscriere` (date medicale/familiale minori) — deja izolat RLS cross-club din Faza 16 (`SEC-05` in REQUIREMENTS.md), dar ZERO nota de informare sau consimtamant parinte digital exista azi in `SportivFormModal.tsx`.
- Zero fisier `docs/gdpr/` sau echivalent exista azi in repo — zero registru evidenta prelucrari, zero DPIA, zero DPA scrise.
- Zero pagina "Protectia datelor" sau view dedicat exista in `AppRouter.tsx` azi.
- Zero mecanism de cerere export/stergere date exista azi in UI sau DB (fara tabel `cereri_gdpr` sau echivalent).

## Requirements

1. **Registru evidenta prelucrari**: Document markdown listand toate categoriile de date, scop, baza legala, destinatari (inclusiv Supabase/Gemini/Claude/SMS provider ca subprocesatori).
   - Current: Nu exista niciun document.
   - Target: `docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md` — tabel cu min. coloanele: categorie date, scop, baza legala, destinatar/subprocesator, perioada retentie, referinta tabel DB.
   - Acceptance: Documentul exista, acopera minim tabelele `sportivi`, `fisa_inscriere`, `plati`, `istoric_grade`, si fluxul AI Assistant (Gemini + Claude), fiecare rand are toate coloanele completate (nu "TBD").

2. **DPIA modul AI Assistant**: Evaluare impact pt fluxul RAG + Claude chat.
   - Current: Nu exista.
   - Target: `docs/gdpr/DPIA-AI-ASSISTANT.md` — descrie fluxul de date catre Gemini (embeddings) si Claude (chat), riscurile identificate, masurile de minimizare aplicate (vezi Requirement 6).
   - Acceptance: Documentul citeaza explicit fisierele `services/ragService.ts` si `services/claudeService.ts` ca sursa fluxului analizat, si lista campurile efectiv trimise la fiecare API dupa implementarea Requirement 6.

3. **DPA / lista subprocesatori**: Document ce confirma statusul contractual cu fiecare procesator extern.
   - Current: Nu exista.
   - Target: `docs/gdpr/SUBPROCESATORI.md` — lista Supabase, Google (Gemini), Anthropic (Claude), provider SMS (din `SMS_PROVIDER` env), cu link catre DPA-ul public al fiecaruia (Anthropic, Google, Supabase publica DPA standard online) si nota daca transfera date in afara UE (necesita SCC).
   - Acceptance: Toti cei 4 procesatori din `.env`/`vercel.json` sunt listati, fiecare cu link catre DPA-ul lor public sau nota "DPA lipsa — de solicitat".

4. **Nota de informare in UI**: Text vizibil la inregistrare sportiv.
   - Current: `SportivFormModal.tsx` nu afiseaza nicio nota GDPR.
   - Target: Componenta noua (ex: `components/ui/NotaInformareGDPR.tsx`) afisata in `SportivFormModal.tsx` la creare sportiv nou — text simplu (ce date, de ce, cui se trimit, cum ceri stergere) + link catre pagina "Protectia datelor" (Requirement 8).
   - Acceptance: La deschiderea formularului de sportiv nou, nota e vizibila fara scroll suplimentar sau in accordion expandabil clar marcat; nu blocheaza submit-ul (nu e checkbox obligatoriu — vezi Requirement 5 pt minori).

5. **Consimtamant parinte digital pt minori**: Camp nou in formular + DB.
   - Current: Nicio coloana de consimtamant parinte exista in `sportivi` sau `fisa_inscriere`.
   - Target: Coloane noi (`consimtamant_parinte_nume`, `consimtamant_parinte_data`) pe tabelul relevant (`fisa_inscriere` sau `sportivi`, decis in discuss-phase), camp obligatoriu in `SportivFormModal.tsx` DOAR cand varsta calculata a sportivului e sub 16 ani.
   - Acceptance: Salvarea unui sportiv nou sub 16 ani fara completarea campului esueaza cu mesaj clar; salvarea reuseste cu campul completat; sportiv ≥16 ani nu vede campul (nu e blocat de el).

6. **Minimizare date la Claude API**: Elimina `userName` din system prompt.
   - Current: `services/claudeService.ts` `buildSystemPrompt()` include `ctx.userName` trimis la Claude la fiecare request.
   - Target: `ClaudeRequestContext` nu mai contine `userName`; `buildSystemPrompt()` foloseste doar `roleLabel` + `viewDesc` + `clubName`.
   - Acceptance: Grep pe `services/claudeService.ts` nu mai gaseste `userName` in corpul trimis catre API; raspunsul AI Assistant ramane functional (testat manual: o intrebare simpla primeste raspuns coerent fara sa mentioneze eronat identitatea).

7. **Politica de retentie**: Document + implementare regula 3 ani inactivitate.
   - Current: Nu exista politica scrisa, nu exista job/proces de arhivare.
   - Target: `docs/gdpr/POLITICA-RETENTIE.md` documenteaza regula (sportiv inactiv 3 ani -> date anonimizate/arhivate) per categorie de date (operationale vs financiare — financiarele pot avea termen legal diferit, documentat explicit).
   - Acceptance: Documentul exista si specifica un termen numeric (nu "se stabileste ulterior") pt fiecare categorie majora de date (sportiv, financiar, AI chat log daca exista).

8. **Pagina "Protectia datelor" in UI**: View nou accesibil din meniu.
   - Current: Zero view dedicat in `AppRouter.tsx`.
   - Target: View nou (`protectia-datelor`) accesibil tuturor rolurilor autentificate, afiseaza rezumat drepturi (acces/rectificare/stergere/opozitie) + buton catre formular cerere (Requirement 9).
   - Acceptance: View-ul apare in navigare pt orice rol logat si randeaza fara eroare consola.

9. **Flux self-service cerere export/stergere**: Cerere din UI -> coada aprobare ADMIN_CLUB.
   - Current: Zero mecanism — cererile GDPR ar veni azi doar offline (email/telefon).
   - Target: Tabel nou (`cereri_gdpr`: sportiv_id, tip_cerere export/stergere, status pending/aprobat/respins, data_cerere, data_procesare, procesat_de), formular in pagina "Protectia datelor" (Requirement 8) ca sportiv/parinte sa creeze cerere, ecran nou pt ADMIN_CLUB sa vada coada si sa aprobe/respinga (stergerea efectiva ramane actiune manuala asistata dupa aprobare, NU automata la click — decizie confirmata in interviu).
   - Acceptance: Sportiv poate crea o cerere din UI; cererea apare in coada ADMIN_CLUB clubului sau (RLS scopat pe club, ca restul aplicatiei); admin poate schimba status; sportivul vede statusul actualizat.

## Boundaries

**In scope:**
- 4 documente markdown in `docs/gdpr/` (registru, DPIA, subprocesatori, retentie)
- Nota informare UI la inregistrare
- Camp consimtamant parinte digital (minori <16 ani) in formular + DB
- Minimizare `userName` din `claudeService.ts`
- Pagina "Protectia datelor" in UI
- Flux cerere GDPR (export/stergere) cu coada aprobare ADMIN_CLUB — stergerea efectiva ramane manuala dupa aprobare

**Out of scope:**
- Numire DPO oficial — decizie organizationala separata, nu tehnica
- Audit extern / certificare GDPR — necesita firma specializata, nu parte din implementarea in cod
- Migrarea infrastructurii (schimbare regiune Supabase, provider AI) — doar se documenteaza unde sunt datele azi, nu se muta nimic
- Export automat instant fara aprobare — riscul de stergere accidentala cu impact financiar/istoric grade a fost explicit respins in interviu
- Modificarea `ragService.ts` — deja confirmat prin cod ca nu trimite date personale, fara risc identificat care sa justifice schimbari

## Constraints

- Zero migratii distructive — coloanele noi (`consimtamant_parinte_*`, tabel `cereri_gdpr`) sunt aditive, nu ating date existente.
- RLS pe `cereri_gdpr` trebuie sa urmeze pattern-ul existent de scoping club (`club_id = get_active_club_id()` sau echivalent, consistent cu restul schemei — vezi `docs/baza-de-date.md`).
- Toate textele UI (nota informare, pagina "Protectia datelor") in limba romana, conform conventiei proiectului.
- Nicio librarie noua externa — Tailwind + `components/ui.tsx` existent.

## Acceptance Criteria

- [ ] `docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md` exista, acopera minim sportivi/fisa_inscriere/plati/istoric_grade/AI
- [ ] `docs/gdpr/DPIA-AI-ASSISTANT.md` exista, citeaza fisierele reale analizate
- [ ] `docs/gdpr/SUBPROCESATORI.md` exista, lista toti cei 4 procesatori externi
- [ ] `docs/gdpr/POLITICA-RETENTIE.md` exista cu termene numerice explicite
- [ ] Nota informare vizibila in `SportivFormModal.tsx` la sportiv nou
- [ ] Camp consimtamant parinte obligatoriu doar pt sportiv <16 ani, validat la submit
- [ ] `userName` eliminat din payload-ul catre Claude API in `claudeService.ts`
- [ ] View "Protectia datelor" accesibil din navigare, zero erori consola
- [ ] Cerere GDPR creata din UI apare in coada ADMIN_CLUB scopata pe clubul corect (RLS)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | 4 livrabile concrete + cod exact vizat |
| Boundary Clarity   | 0.90  | 0.70 | ✓      | Out-of-scope explicit cu motive    |
| Constraint Clarity | 0.75  | 0.65 | ✓      | Zero migratii distructive, RLS pattern existent |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | 9 checkbox-uri pass/fail           |
| **Ambiguity**      | 0.16  | ≤0.20| ✓      |                                     |

## Interview Log

| Round | Perspective     | Question summary                                          | Decision locked                                                        |
|-------|-----------------|-------------------------------------------------------------|--------------------------------------------------------------------------|
| 1     | Researcher      | Scop faza: doar documente vs +UI vs full self-service?      | Full — inclusiv drepturi self-service digitale                          |
| 1     | Researcher      | Nivel implementare consimtamant parinte minori?              | Camp digital in formular (nu doar proces hartie)                        |
| 2     | Boundary Keeper | Cine aproba stergerea efectiva a datelor cerute?             | Cerere -> coada ADMIN_CLUB -> aprobare -> stergere ramane manuala/asistata |
| 2     | Boundary Keeper | Cat timp se pastreaza date sportiv inactiv?                  | 3 ani inactivitate, apoi anonimizare/arhivare                           |
| 3     | Failure Analyst | Ce faci cu userName trimis azi la Claude API?                | Elimina complet userName din system prompt                              |
| 3     | Failure Analyst | Ce ramane explicit out of scope?                              | DPO oficial + audit extern excluse — decizii organizationale, nu cod    |

---

*Phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s*
*Spec created: 2026-09-03*
*Next step: /gsd-discuss-phase 28 — implementation decisions (structura tabel cereri_gdpr, unde intra coloanele consimtamant, design pagina Protectia datelor, etc.)*
