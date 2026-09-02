# Phase 28: Conformitate GDPR si AI Act - Research

**Researched:** 2026-09-03
**Domain:** GDPR/Legea 190/2018/AI Act compliance implementation — documentation + DB schema + RLS + React/Supabase UI flows
**Confidence:** HIGH (code-grounded findings) / MEDIUM (legal claims, cited from prior research memory, not re-verified against primary legal text this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Consimtamant parinte (minori <16 ani)**
- D-01: Coloanele `consimtamant_parinte_nume` si `consimtamant_parinte_data` merg pe tabelul `sportivi` (NU `fisa_inscriere`, care e gol/0 randuri si nefolosit in cod azi).
- D-02: Varsta <16 se calculeaza live la schimbarea `data_nasterii` in formular (camp apare/dispare imediat, nu doar la submit). Refolosim `calculeazaVarstaLaData(dataNasterii, dataDeReferinta)` din `utils/eligibilitateCompetitie.ts`, apelata cu data curenta ca al doilea parametru.
- D-03: Sportivii <16 ani EXISTENTI (creati inainte de migratie, fara consimtamant salvat) sunt blocati la urmatoarea EDITARE — nu doar la creare sportiv nou. Salvarea esueaza cu mesaj clar pana completeaza campul. (Extindere fata de textul literal SPEC "sportiv nou", dar in domeniul aceleiasi cerinte — nu capacitate noua.)
- D-04: Campuri: `consimtamant_parinte_nume` (input text nume complet parinte) + `consimtamant_parinte_data` (setata automat = data curenta la submit, NU editabila de user).
- D-05: Campul apare in tabul General din `SportivFormModal.tsx`, imediat sub campul `data_nasterii`.

**Tabel `cereri_gdpr` + coada aprobare**
- D-06: Status enum refoloseste EXACT pattern-ul existent din `cereri_inscriere` (vezi `components/Sportivi/CereriInscriere.tsx`): `'in_asteptare' | 'aprobata' | 'respinsa'` (romana, nu engleza ca in textul SPEC). Camp `procesat_la` (timestamp) + `procesat_de` (user id admin).
- D-07: Coloane: `sportiv_id`, `tip_cerere` (`export` | `stergere`), `status`, `data_cerere`, `procesat_la`, `procesat_de`.
- D-08: Ecran admin nou dedicat "Cereri GDPR" in meniul admin (view separat, similar structural cu `CereriInscriere.tsx`), NU tab combinat in pagina Protectia datelor.
- D-09: Orice rol logat creeaza cerere pt PROPRIUL cont sportiv — nu se poate crea cerere in numele altui sportiv. `sportiv_id` se determina din legatura existenta `sportivi.user_id = auth.uid()` (confirmat: coloana exista, folosita in `utils/auth.ts` si alte fisiere).
- D-10: Daca userul curent nu are `sportiv_id` legat (ex. SUPER_ADMIN_FEDERATIE fara profil sportiv), butonul de creare cerere e ASCUNS/dezactivat — nu vizibil cu eroare la click.
- D-11: La aprobare (orice tip_cerere), tehnic se schimba DOAR `status -> 'aprobata'` + `procesat_de` + `procesat_la`. Nicio actiune automata pe date (nu deschide modal stergere, nu genereaza export automat). Admin actioneaza manual separat (Sportivi > Sterge existent, sau export-urile CSV/PDF deja existente in aplicatie).
- D-12: RLS pe `cereri_gdpr`: sportivul vede DOAR cererile proprii (join prin `sportivi.user_id = auth.uid()`); ADMIN_CLUB vede toate cererile clubului activ (`club_id = get_active_club_id()` prin join `sportivi.club_id`, pattern identic cu restul schemei); SUPER_ADMIN bypass total; INSTRUCTOR NU are acces deloc (nici read-only) — consistent cu alte fluxuri administrative sensibile (facturi federale).

**Pagina "Protectia datelor"**
- D-13: Intra ca sectiune noua in meniul de Setari/Cont (nu item top-level in sidebar principal).
- D-14: Continut: text drepturi (acces/rectificare/stergere/opozitie) + buton creare cerere + LISTA cererilor proprii ale userului cu status (satisface direct acceptance criteria SPEC "sportivul vede statusul actualizat").
- D-15: Accesibila TUTUROR rolurilor autentificate (inclusiv SUPER_ADMIN_FEDERATIE, per acceptance criteria SPEC). Pt roluri fara `sportiv_id` (ex. super-admin pur): vede doar textul de drepturi, fara buton de cerere (consistent cu D-10).

**Nota informare GDPR**
- D-16: Format: accordion expandabil, INCHIS implicit — nu aglomereaza formularul.
- D-17: Pozitie: tab General din `SportivFormModal.tsx`, SUS, inainte de campurile de date (prima informatie vazuta la deschidere).
- D-18: Apare DOAR la creare sportiv NOU — nu la editare sportiv existent (strict pe textul SPEC Requirement 4, fara extindere).
- D-19: Contine link catre pagina "Protectia datelor" (D-13/D-14) — SINGURA legatura intre cele doua arii, fara alta integrare.

### Claude's Discretion
- Text exact al notei de informare si al paginii Protectia datelor (continut GDPR-compliant, romana) — Claude redacteaza in planificare/implementare.
- Denumire exacta a view-ului nou in `types.ts`/`AppRouter.tsx` (ex. `'protectia-datelor'`, `'cereri-gdpr'`) — Claude alege consistent cu convențiile existente.
- Structura interna exacta a celor 4 documente markdown (dincolo de coloanele minime cerute de SPEC) — Claude redacteaza pe baza research-ului legal deja facut (memory `project_gdpr_ai_act_conformitate.md`).

### Deferred Ideas (OUT OF SCOPE)
- Audit + export date existente in DB, curatare campuri nefolosite (data minimization pe date live) — propus de user in timpul discutiei, dar e o capacitate noua (audit al datelor deja stocate, nu al fluxurilor noi din SPEC) — nu parte din cele 9 requirements locked ale fazei 28. Candidat pt o faza viitoare dedicata data minimization / cleanup DB.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| REQ-1 | Registru evidenta prelucrari (`docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md`) | See "Documents to Produce" — table of tables/columns/subprocessors gathered below (Sportivi, `sportivi`, `fisa_inscriere`, `plati`, `istoricGrade`, AI flow) |
| REQ-2 | DPIA AI Assistant (`docs/gdpr/DPIA-AI-ASSISTANT.md`) | Critical finding: real AI code path is `services/agents/*` + `services/agents/orchestrator.ts`, NOT `services/claudeService.ts` (dead code). DPIA must cite the real files. Real live provider is Groq by default, not Claude. |
| REQ-3 | DPA / subprocesatori (`docs/gdpr/SUBPROCESATORI.md`) | 5 real subprocessors identified (Supabase, Google/Gemini, Anthropic/Claude, Groq, SMS provider) — SPEC's list of 4 is missing Groq, see Critical Findings |
| REQ-4 | Nota de informare UI la inregistrare sportiv nou | Exact insertion point found: `SportivFormFields.tsx` tab "general" (line ~183), accordion above `FormSection title="Date Personale"` |
| REQ-5 | Consimtamant parinte digital minori <16 | Exact reuse path: `calculeazaVarstaLaData()` in `utils/eligibilitateCompetitie.ts`; validation hook point: `utils/validation.ts` `validateSportiv()`; DB target `sportivi` table (per D-01) |
| REQ-6 | Minimizare `userName` la Claude API | **SPEC target file is wrong/dead code.** Real fix must touch `services/agents/types.ts` (`AgentContext`), all 9 agent files (`adminAgent.ts`, `grupeAgent.ts`, `sportiviAgent.ts`, `generalAgent.ts`, `rapoarteAgent.ts`, `financiarAgent.ts`, `prezentaAgent.ts`, `exameneAgent.ts`, `legitimatiiAgent.ts`), and `contexts/AIAssistantContext.tsx` (line ~96) |
| REQ-7 | Politica de retentie (`docs/gdpr/POLITICA-RETENTIE.md`) | No existing retention/archival job in codebase found — document-only requirement, no code changes required for REQ-7 itself |
| REQ-8 | Pagina "Protectia datelor" (view nou) | Exact integration points found: `types.ts` View union (line 600), `components/menuConfig.ts` (4 menu arrays), `components/AppRouter.tsx` switch, `components/LazyComponents.tsx` lazy import pattern |
| REQ-9 | Flux cerere GDPR export/stergere + coada aprobare | Full reference pattern found in `components/Sportivi/CereriInscriere.tsx` — copy structurally. RLS precedent found in Phase 16 (`fisa_practicant_club_id` SECURITY DEFINER join pattern) |
</phase_requirements>

## Summary

This phase has no new external dependencies, no new UI framework, and no architectural risk in the traditional sense — it is a **documentation + additive-schema + UI-wiring** phase entirely inside the existing React/TypeScript/Supabase stack. The real research value here was **code-grounding**: verifying which files in this specific, sprawling codebase actually implement the flows the SPEC references, because two of SPEC.md's file references turned out to be materially wrong or incomplete.

**Critical finding #1 (blocks REQ-6 as literally specified):** `services/claudeService.ts` (`buildSystemPrompt`, `ClaudeRequestContext`, `askClaude`) is **dead code** — not imported or called anywhere in the app (confirmed via grep across the repo; only self-reference). The live AI Assistant chat path is `contexts/AIAssistantContext.tsx` → `services/agents/orchestrator.ts` (`orchestrate()`) → one of 9 domain agents in `services/agents/*Agent.ts`, each with its **own** `buildSystemPrompt(ctx: AgentContext)` that embeds `${ctx.userName}` in the prompt sent to the LLM. Editing `services/claudeService.ts` alone (as SPEC's acceptance criterion literally states — "Grep pe `services/claudeService.ts` nu mai gaseste `userName`") would satisfy the letter of the acceptance criterion while leaving `userName` flowing to the real LLM provider in all 9 agents, unchanged. The planner must target `services/agents/types.ts` (`AgentContext` interface) + all 9 `*Agent.ts` files + `contexts/AIAssistantContext.tsx` to actually achieve minimization.

**Critical finding #2 (affects REQ-3):** SPEC.md lists 4 subprocessors (Supabase, Google/Gemini, Anthropic/Claude, SMS provider). Code shows the AI chat feature's **default and only currently-wired-in-production LLM provider is Groq** (`api/llm-proxy.ts` defaults `provider = 'groq'`, and both `orchestrator.ts` and the dead `claudeService.ts` explicitly call `/api/llm-proxy?provider=groq`). Anthropic Claude and Google Gemini proxy code paths exist in `api/llm-proxy.ts` but are not called by the live chat UI (only `groq` is called). Google Gemini IS used elsewhere for RAG embeddings (per `docs/RAG_IMPLEMENTARE.md`, not re-verified line-by-line this session). `SUBPROCESATORI.md` must list **Groq** as the actual chat-completion subprocessor (US-based, Groq Inc.) alongside Supabase, Google (embeddings), and the SMS provider (`android_gateway` by default per `.env.example` — a self-hosted gateway, not a third-party SaaS processor, worth noting explicitly rather than treating it as an external DPA-needing vendor). Anthropic should be listed as a configured-but-not-currently-invoked processor if the team wants forward compatibility, or omitted with a note if strictly documenting current production reality.

**Critical finding #3 (minor doc/code discrepancy):** `docs/baza-de-date.md` names the registration-request table `cereri_inscriere`; the actual live table (per `components/Sportivi/CereriInscriere.tsx` line 48) is `cereri_inregistrare`. The View constant is `'cereri-inscriere'` (hyphenated, matches neither exactly but closer to the docs name). This is a pre-existing naming inconsistency unrelated to Phase 28, but relevant because CONTEXT.md's D-06 says to copy the `cereri_inscriere`/`CereriInscriere.tsx` pattern "exactly" — the new table should be named `cereri_gdpr` (per D-07, already decided) and the new View should NOT reuse the `cereri-inscriere`/`cereri_inregistrare` naming split; pick one consistent name (`cereri_gdpr` table, `'cereri-gdpr'` View) and do not introduce a third variant.

**Primary recommendation:** Treat REQ-1/2/3/7 as pure documentation tasks (no code dependencies except grounding facts, which this research supplies). Treat REQ-4/5/8/9 as additive UI+DB tasks following the `SportivFormFields.tsx`/`CereriInscriere.tsx`/`menuConfig.ts` patterns exactly. Treat REQ-6 as a **multi-file, not single-file** fix spanning `services/agents/`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Registru/DPIA/DPA/Retentie docs | Documentation (repo `docs/`) | — | Pure markdown, no runtime component |
| Nota informare GDPR (UI) | Browser / Client (React component) | — | Static informational text rendered client-side, no new data flow |
| Consimtamant parinte (camp + validare) | Browser / Client (form validation) | Database (Supabase `sportivi` table) | Validation happens client-side in `validateSportiv()`; persisted value is authoritative in DB |
| Minimizare userName la LLM | API / Backend boundary (client → `/api/llm-proxy`) | Browser / Client (`AgentContext` construction) | The payload sent over the wire to the external LLM processor is the compliance-relevant boundary; both the client-side context builder AND the prompt-building functions must be fixed |
| Pagina Protectia datelor | Browser / Client (new View + component) | — | Read-mostly informational + request-creation page, standard SPA view |
| Tabel + RLS `cereri_gdpr` | Database / Storage (Supabase RLS) | API (PostgREST via `supabase-js`) | RLS is the actual security boundary per project convention (`RLS enforcement: All table queries MUST use header or auth.uid()`); UI is UX-only |
| Coada aprobare ADMIN_CLUB | Browser / Client (new admin View, mirrors `CereriInscriere.tsx`) | Database (RLS write scope) | Same tier split as existing `cereri_inregistrare` admin queue |

## Standard Stack

No new libraries required for this phase. All work uses the existing stack:

### Core (existing, reused)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| React 18.3.1 + TypeScript | existing | New views/components | Already the entire app's stack |
| `@supabase/supabase-js` 2.98.0 | existing | New table CRUD + RLS-scoped queries | Existing client already injects `active-role-context-id` header |
| Tailwind CSS 3.4.6 + `components/ui.tsx` | existing | All new UI (accordion, page, admin queue) | CLAUDE.md forbids new UI libs; project constraint reiterated in SPEC.md Constraints |

### Supporting
None — no PDF/CSV export changes needed for this phase (D-11 explicitly keeps export/deletion manual using tools that already exist elsewhere in the app).

### Alternatives Considered
Not applicable — SPEC.md Constraints explicitly forbid new libraries ("Nicio librarie noua externa — Tailwind + `components/ui.tsx` existent"), and no functional gap requires one.

**Installation:** N/A — no new packages.

## Package Legitimacy Audit

Not applicable. This phase installs zero external packages (confirmed against SPEC.md Constraints and this research's code review — no `npm install` targets identified for any of the 9 requirements).

## Architecture Patterns

### System Architecture Diagram

```
[Sportiv nou / editare] --SportivFormModal.tsx--> [SportivFormFields.tsx tab "general"]
        |                                                  |
        |                                         [NotaInformareGDPR accordion] (REQ-4, new-only)
        |                                         [Camp consimtamant_parinte_*] (REQ-5, <16 ani only)
        v                                                  |
   [validateSportiv() in utils/validation.ts] <-------------
        |
        v (fails if <16 && no consimtamant)
   [supabase.from('sportivi').update/insert]  --> Postgres `sportivi` table (+2 new columns)


[Any authenticated user] --Sidebar/menuConfig--> [View: 'protectia-datelor'] (REQ-8)
        |                                                |
        |                                        [text drepturi + buton "Creare cerere"]
        |                                        (buton ascuns daca !sportiv_id, D-10)
        v
   [supabase.from('cereri_gdpr').insert({sportiv_id, tip_cerere})]  (REQ-9)
        |
        v (RLS: sportiv vede doar propriile cereri)
   Postgres `cereri_gdpr` table (RLS scoped by sportivi.user_id / sportivi.club_id)
        |
        v
[ADMIN_CLUB] --menuConfig 'Cereri GDPR'--> [View: 'cereri-gdpr' admin queue] (REQ-8/D-08)
        |                                          (mirrors CereriInscriere.tsx exactly)
        v
   [update status -> 'aprobata'/'respinsa' + procesat_de + procesat_la]
        |
        v (D-11: NO automated side effect)
   [Admin manually deletes via Sportivi>Sterge, or manually exports via existing CSV/PDF tools]


[AI Assistant chat message] --contexts/AIAssistantContext.tsx--> [orchestrate() in services/agents/orchestrator.ts]
        |                                                                  |
        |                                                    [selectAgent() picks 1 of 9 domain agents]
        v                                                                  |
   [AgentContext { activeView, userRole, userName, clubName }]  <----------
        |  <-- REQ-6 fix: remove userName from this interface + all 9 buildSystemPrompt() usages
        v
   [agent.buildSystemPrompt(ctx)] --> system prompt string (currently embeds ${ctx.userName})
        |
        v
   fetch('/api/llm-proxy?provider=groq', {system, messages}) --> Groq API (external subprocessor)
```

### Recommended Project Structure

No new top-level folders needed beyond `docs/gdpr/`:

```
docs/
└── gdpr/                              # NEW — 4 markdown compliance documents
    ├── REGISTRU-EVIDENTA-PRELUCRARI.md
    ├── DPIA-AI-ASSISTANT.md
    ├── SUBPROCESATORI.md
    └── POLITICA-RETENTIE.md

components/
├── Sportivi/
│   ├── SportivFormFields.tsx          # EDIT — add accordion (REQ-4) + consimtamant fields (REQ-5)
│   └── CereriGDPR.tsx                 # NEW — admin queue, mirrors CereriInscriere.tsx (REQ-9/D-08)
├── ProtectiaDatelor/                  # NEW folder (or single file) — REQ-8
│   └── index.tsx
└── menuConfig.ts                      # EDIT — 4 arrays get 'protectia-datelor'; 2 admin arrays get 'cereri-gdpr'

services/agents/
├── types.ts                           # EDIT — remove userName from AgentContext (REQ-6)
├── orchestrator.ts                    # check — likely no direct userName reference, verify
├── adminAgent.ts / grupeAgent.ts / sportiviAgent.ts / generalAgent.ts /
│   rapoarteAgent.ts / financiarAgent.ts / prezentaAgent.ts / exameneAgent.ts /
│   legitimatiiAgent.ts                # EDIT (all 9) — remove ${ctx.userName} from buildSystemPrompt template

contexts/AIAssistantContext.tsx        # EDIT — stop building/passing userName (line ~96)

utils/validation.ts                    # EDIT — validateSportiv() gains age<16 + consimtamant check (REQ-5)

types.ts                               # EDIT — View union +2 entries; Sportiv interface +2 optional fields
```

### Pattern 1: Reusing the `CereriInscriere.tsx` admin-queue pattern for `cereri_gdpr` (D-06/D-08/D-09)
**What:** `CereriInscriere.tsx` is a complete, working reference implementation of exactly the pattern needed for REQ-9: status enum in Romanian (`in_asteptare`/`aprobata`/`respinsa`), tabbed filter UI, `procesat_la` timestamp set on approve/reject, optimistic refetch after mutation.
**When to use:** Build the new "Cereri GDPR" admin screen as a structural copy of this component, swapping the Supabase table name, field names, and the approve/reject side-effects (D-11: approving must NOT trigger any deletion/export — unlike nothing in `CereriInscriere.tsx` that would need suppressing, since that component also only flips status, matching D-11 exactly).
**Example:**
```typescript
// Source: components/Sportivi/CereriInscriere.tsx (lines 65-73), verified in this codebase
const handleAproba = async (id: string) => {
    setProcessingId(id);
    await supabase
        .from('cereri_inregistrare')   // -> cereri_gdpr for the new flow
        .update({ status: 'aprobata', procesat_la: new Date().toISOString() })
        .eq('id', id);
    await fetchCereri();
    setProcessingId(null);
};
```
Note: `procesat_de` (admin user id, per D-06/D-07) is NOT set in the existing `cereri_inregistrare` pattern — this is a new field the new table must add and the new mutation must populate from `currentUser.id` (or `auth.uid()` via a DB default/trigger), since `cereri_inregistrare`'s existing code does not have this precedent to copy.

### Pattern 2: Age-gated conditional required field (D-02/D-05)
**What:** `calculeazaVarstaLaData(dataNasterii: string, dataCompetitie: string): number` already implements DOB→age math correctly (including month/day rollover), and is a pure function with no competition-specific coupling despite its name/file location.
**When to use:** Call it with `new Date().toISOString().split('T')[0]` (or equivalent) as the second argument to get "age today" for the consimtamant-parinte gate.
**Example:**
```typescript
// Source: utils/eligibilitateCompetitie.ts lines 9-18, verified in this codebase
export function calculeazaVarstaLaData(dataNasterii: string, dataCompetitie: string): number {
  const nastere = new Date(dataNasterii);
  const competitie = new Date(dataCompetitie);
  let varsta = competitie.getFullYear() - nastere.getFullYear();
  const m = competitie.getMonth() - nastere.getMonth();
  if (m < 0 || (m === 0 && competitie.getDate() < nastere.getDate())) {
    varsta--;
  }
  return varsta;
}
```
Integration point for the required-field check is `utils/validation.ts` `validateSportiv()` (currently 9 lines, checks nume/prenume/data_nasterii/parola) — add:
```typescript
// New logic to add to validateSportiv()
if (data.data_nasterii) {
    const varsta = calculeazaVarstaLaData(data.data_nasterii, new Date().toISOString().split('T')[0]);
    if (varsta < 16 && !data.consimtamant_parinte_nume?.trim()) {
        newErrors.consimtamant_parinte_nume = "Consimțământul părintelui/tutorelui este obligatoriu pentru sportivii sub 16 ani.";
    }
}
```
This single change point satisfies both REQ-5 (new sportiv) and D-03 (existing sportiv blocked at edit) automatically, because `validateSportiv()` already runs on every form open/change for both create and edit flows (confirmed: `SportivFormFields.tsx` calls `validate(formData)` in a `useEffect` keyed on `formData`, with no create/edit branching) — no separate "existing sportiv" code path needs to be built.

### Pattern 3: New View wiring (REQ-8, D-13/D-15)
**What:** Adding a new SPA view requires 4 coordinated edits (no URL routing in this app, per CLAUDE.md).
**When to use:** For both `'protectia-datelor'` and `'cereri-gdpr'` views.
**Example:**
```typescript
// 1. types.ts line 600 — add to the View union string literal
| 'protectia-datelor' | 'cereri-gdpr'

// 2. components/LazyComponents.tsx — add lazy import, pattern from line 44
export const ProtectiaDatelor = lazy(() => import('./ProtectiaDatelor').then(m => ({ default: m.ProtectiaDatelor })));
export const CereriGDPR = lazy(() => import('./Sportivi/CereriGDPR').then(m => ({ default: m.CereriGDPR })));

// 3. components/AppRouter.tsx — add case to the switch, pattern from line 276-277
case 'protectia-datelor':
    return <Lazy.ProtectiaDatelor onBack={handleBackToDashboard} currentUser={currentUser!} />;
case 'cereri-gdpr':
    return <Lazy.CereriGDPR onBack={handleBackToDashboard} />;

// 4. components/menuConfig.ts — add menu entries
// 'protectia-datelor' -> add to ALL 4 arrays (adminMenu, adminClubMenu, instructorMenu, sportivMenu),
//   inside "Setări & Admin" submenu where one exists (adminMenu/adminClubMenu), or as a flat item
//   next to 'account-settings' where no submenu exists (instructorMenu/sportivMenu) — per D-13.
// 'cereri-gdpr' -> add ONLY to adminMenu and adminClubMenu (mirrors 'cereri-inscriere' placement
//   at lines 98/180), consistent with D-12 (INSTRUCTOR has zero access, SPORTIV has zero admin-queue access).
```

### Anti-Patterns to Avoid
- **Editing `services/claudeService.ts` and calling REQ-6 done:** This file is dead code (zero call sites found via repo-wide grep for `askClaude` and for imports of `claudeService`). The literal SPEC acceptance criterion references this file; a plan that only touches it will pass the literal acceptance check while shipping zero actual data-minimization to production. The planner MUST expand REQ-6's scope to `services/agents/*`.
- **Treating `fisa_inscriere` as the consent-storage table:** Already explicitly rejected in D-01 (table is empty/unused) — do not resurrect this despite it being the table SPEC.md's Requirement 5 originally suggested as an option.
- **Auto-triggering deletion/export on `cereri_gdpr` approval:** Explicitly rejected by D-11 and by the SPEC's Boundaries ("Export automat instant fara aprobare — riscul de stergere accidentala... a fost explicit respins in interviu"). Any plan task that wires `handleAproba` to call a delete/export function is out of scope and must be flagged.
- **Assuming Anthropic Claude is "the" AI provider for DPIA/SUBPROCESATORI purposes:** The default and only-currently-invoked chat provider in the live UI is Groq. Do not write compliance docs that only mention Anthropic/Claude and omit Groq — that would misdescribe the actual data flow being audited by REQ-2/REQ-3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Age-from-DOB calculation | A new age-calc utility in the consimtamant field logic | `calculeazaVarstaLaData()` from `utils/eligibilitateCompetitie.ts` | Already correct (handles month/day rollover), already used and tested in the competitions module; D-02 explicitly mandates reuse |
| Status-enum approval queue UI | A new tab/filter/approve-reject component from scratch | Structural copy of `components/Sportivi/CereriInscriere.tsx` | Working, styled, accessible reference implementation exists in this exact codebase; D-06 mandates pattern reuse |
| Club-scoped RLS via join to a parent table without a direct `club_id` column | A denormalized `club_id` column duplicated onto `cereri_gdpr` | SECURITY DEFINER join function, following the `fisa_practicant_club_id(uuid)` precedent from Phase 16 (`16-01-SUMMARY.md`) | Established project convention for RLS-scoping child tables through a FK join to `sportivi.club_id`; avoids data duplication/drift |

**Key insight:** Every UI and RLS pattern this phase needs already has a working precedent somewhere in this specific codebase. The research risk here was never "what library to use" — it was "which existing file is the real, live implementation vs. a decoy/dead file," which is why the Critical Findings above (dead `claudeService.ts`, `cereri_inscriere` vs `cereri_inregistrare` naming split) matter more than any external-library research would.

## Common Pitfalls

### Pitfall 1: Fixing the wrong file for REQ-6
**What goes wrong:** A plan/implementation edits `services/claudeService.ts`, satisfies the literal grep-based acceptance criterion in SPEC.md, and ships with `userName` still flowing to Groq/the LLM via all 9 `services/agents/*Agent.ts` files.
**Why it happens:** SPEC.md Requirement 6 and its acceptance criterion were written against `services/claudeService.ts` without the author realizing an agent-orchestrator layer was built later and superseded it (dead code was left behind).
**How to avoid:** Plan REQ-6 as: (1) remove `userName` from `services/agents/types.ts` `AgentContext`, (2) remove `${ctx.userName}` from all 9 agent `buildSystemPrompt()` template literals, (3) stop constructing `userName` in `contexts/AIAssistantContext.tsx` (or keep it in local UI state but stop passing it into `orchestrate()`/`AgentContext`), (4) optionally delete or leave `services/claudeService.ts` as documented dead code (out of scope to require its removal, but note it in the DPIA as "unused, superseded by services/agents/").
**Warning signs:** Any task description for REQ-6 that only lists `services/claudeService.ts` as a file to change.

### Pitfall 2: Writing SUBPROCESATORI.md against the SPEC's literal 4-vendor list instead of the actual code
**What goes wrong:** Document ships listing Anthropic/Claude as "the" chat AI processor, omitting Groq (the one actually receiving every chat message + system prompt in production).
**Why it happens:** SPEC.md Background section explicitly names `services/claudeService.ts` and Anthropic as the analyzed flow, written before this research's file-level verification.
**How to avoid:** Cross-check `api/llm-proxy.ts` default provider (`groq`) and `services/agents/orchestrator.ts`'s hardcoded `fetch('/api/llm-proxy?provider=groq', ...)` call before finalizing the subprocessor list.
**Warning signs:** SUBPROCESATORI.md that doesn't mention "Groq" anywhere.

### Pitfall 3: `docs/gdpr/*` becomes stale documentation disconnected from REQ-6's actual fix
**What goes wrong:** DPIA-AI-ASSISTANT.md is written first (before REQ-6 code changes), describing the current `userName`-including prompt as if it were already fixed, or vice versa — describing the fix as already-applied when it isn't yet.
**Why it happens:** SPEC.md's own acceptance criterion for REQ-2 requires the DPIA to "lista campurile efectiv trimise la fiecare API dupa implementarea Requirement 6" — i.e., the DPIA must describe the POST-fix state, meaning REQ-6 code changes should land before or alongside DPIA authoring, not after.
**How to avoid:** Sequence REQ-6 (code fix) before or in the same wave as REQ-2 (DPIA doc), or explicitly draft REQ-2 twice (before/after) if wave ordering makes that impractical.
**Warning signs:** DPIA document listing `userName`/`ctx.userName` as still being sent, dated after REQ-6 is marked complete.

### Pitfall 4: Migration not applied live
**What goes wrong:** SQL for `sportivi.consimtamant_parinte_*` columns and the new `cereri_gdpr` table (+ RLS policies) is written to a migration file but, per this project's established pattern (`supabase/` is gitignored, confirmed in `.gitignore` line 17, and confirmed in `16-01-SUMMARY.md`, `27-CONTEXT.md`), never actually applied to the live database — a recurring pattern in this project's history (`270705-pgg`, `260717-f99` both shipped "Needs SQL apply" in `STATE.md`).
**Why it happens:** Migrations in this repo are applied live via Supabase MCP `apply_migration`, not via a committed file + CI/CD migration runner — so "the code is written" does not imply "the schema exists."
**How to avoid:** Plan tasks must explicitly call the Supabase MCP `apply_migration` tool as a task action (not just "write SQL to a file"), and a verification task must query `information_schema.columns`/`pg_policies` live to confirm the migration actually applied, following the Phase 16/25 precedent of live-verifying via MCP rather than trusting the file.
**Warning signs:** Task marked complete with only a `.sql` file diff and no MCP tool-call evidence.

## Code Examples

### RLS policy pattern for a table without a direct `club_id`, scoped through a join (REQ-9/D-12)
```sql
-- Source: pattern verified via .planning/phases/16-elimina-politici-rls-using-true-ramase-rezultate-facturi-fed/16-01-SUMMARY.md
-- (fisa_practicant_club_id precedent) — this is the established project convention, not invented here.

CREATE OR REPLACE FUNCTION public.cerere_gdpr_sportiv_club_id(p_sportiv_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.sportivi WHERE id = p_sportiv_id;
$$;

-- SELECT policy: sportiv sees own requests only
CREATE POLICY "Sportiv_Vede_Propriile_Cereri_GDPR" ON public.cereri_gdpr
  FOR SELECT
  USING (
    sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
  );

-- SELECT/UPDATE policy: ADMIN_CLUB sees/processes club-scoped requests
CREATE POLICY "Admin_Club_Vede_Cereri_GDPR_Club" ON public.cereri_gdpr
  FOR SELECT
  USING (
    public.cerere_gdpr_sportiv_club_id(sportiv_id) = public.get_active_club_id()
  );

-- Super admin bypass (established convention, e.g. Bypass_Super_Admin on fisa_inscriere)
CREATE POLICY "Bypass_Super_Admin_Cereri_GDPR" ON public.cereri_gdpr
  FOR ALL
  USING (public.is_super_admin());

-- No policy for INSTRUCTOR role -> implicit deny, matching D-12 ("INSTRUCTOR NU are acces deloc")
```
Note: exact function names `get_active_club_id()` and `is_super_admin()` are confirmed live in this project (referenced by name in `16-01-SUMMARY.md` and `25-04` STATE.md notes) but their SQL bodies were not re-read this session — verify signatures via Supabase MCP before writing the final migration (e.g. confirm `get_active_club_id()` takes no arguments and reads from the `active-role-context-id` header/session, as documented in CLAUDE.md's Supabase client section).

### Insert-your-own-request pattern (REQ-9/D-09/D-10)
```typescript
// New UI code pattern for "Protectia datelor" page create-request button
const misSportivId = currentUser?.roluri.some(r => r.nume === 'SPORTIV')
  ? sportivi.find(s => s.user_id === currentUser.id)?.id  // or however sportiv_id-for-self is resolved elsewhere in this app — verify against utils/auth.ts resolution pattern before implementing
  : null;

// Button hidden (not disabled-with-error) per D-10:
{misSportivId && (
  <Button onClick={() => creeazaCerere(misSportivId, tipCerere)}>
    Solicită {tipCerere === 'export' ? 'export' : 'ștergere'} date
  </Button>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| No documented AI Act transparency posture | AI Act (Reg. UE 2024/1689) transparency obligations for GPAI/chat-assistant-style systems | Entered into force 2026 per prior research (Goodwin Law source, memory `project_gdpr_ai_act_conformitate.md`) | Directly motivates REQ-2 (DPIA) scope including AI Act framing, not just GDPR Art. 35 |
| N/A | ANSPDCP actively fining Romanian public-institution-facing app developers in 2026 | Cited in memory file (StartupCafe source, 3000€ fine example) | Establishes this is treated as a real compliance risk, not theoretical, per the phase's own rationale |

**Deprecated/outdated:** None identified specific to this phase's tech (no library version changes involved).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | The 10 GDPR/AI Act legal obligations listed in memory `project_gdpr_ai_act_conformitate.md` (baza legala, consimtamant minori, drepturi persoana vizata, DPIA, registru, DPA, nota informare, minimizare, retentie, breach response) are accurate summaries of GDPR/Legea 190/2018/AI Act requirements — this research did not re-fetch ANSPDCP/EDPB primary sources this session, it relies on the prior session's research (dated 2026-09-03, same day) | Summary, Common Pitfalls, State of the Art | If the prior legal research was itself inaccurate or has since become outdated, the 4 markdown docs (REQ-1/2/3/7) could misstate legal obligations. Given the docs are Requirement-driven (SPEC.md already locks specific acceptance criteria for their content), risk is contained to interpretive nuance, not wholesale wrong direction. |
| A2 | Groq (the LLM provider actually receiving every chat request in production) should be added to `SUBPROCESATORI.md` as a data processor requiring the same DPA/SCC scrutiny as Anthropic/Google | Critical Findings, Pitfall 2 | If Groq's terms of service differ materially from a "standard" LLM API processor (e.g., different data retention/training-use terms), the SUBPROCESATORI.md entry drafted from this research's generic assumption could be inaccurate — team should verify Groq's actual DPA/privacy terms before publishing, same as the existing SPEC already flags for the other 3 named processors ("nota daca transfera date in afara UE") |
| A3 | `android_gateway` (default `SMS_PROVIDER`) is a self-hosted/self-controlled infrastructure component (phone + ngrok/Cloudflare Tunnel) rather than a third-party SaaS vendor requiring its own DPA | Critical Findings | If any club actually runs `SMS_PROVIDER=smslink`/`twilio`/`vonage` in production (the `.env.example` lists 4 options), that specific club's deployment DOES have a real third-party SMS subprocessor needing a DPA — `SUBPROCESATORI.md` should note this is env-configurable, not assume `android_gateway` universally |

**If this table is empty:** N/A — see above.

## Open Questions (RESOLVED)

1. **Does `get_active_club_id()` read from the `active-role-context-id` header at the DB session level, or from `auth.uid()`-derived state?**
   - What we know: CLAUDE.md documents the header is injected by `supabaseClient.ts` on every request, and RLS policies are documented to use `club_id = get_active_club_id()`.
   - What's unclear: The exact function body/mechanism (session variable set via header vs. a join through `utilizator_roluri_multicont`) was not re-read this session.
   - Recommendation: Before writing the final `cereri_gdpr` RLS migration, the planner/implementer should query the function definition live via Supabase MCP (`SELECT pg_get_functiondef('public.get_active_club_id()'::regprocedure)`) to confirm it composes correctly with the new `cerere_gdpr_sportiv_club_id()` join function proposed above.
   - **RESOLVED:** Plan 28-01 Task 1 runs this exact live query via Supabase MCP before writing the migration.

2. **Should `services/claudeService.ts` be deleted as part of this phase, or left as documented dead code?**
   - What we know: It is unused (zero call sites). SPEC.md's Requirement 6 target and acceptance criterion reference it directly, suggesting the SPEC author believed it was live.
   - What's unclear: CONTEXT.md's Claude's Discretion section doesn't address this file's fate; it's not called out as in/out of scope anywhere in CONTEXT.md or SPEC.md.
   - Recommendation: Treat deletion as optional cleanup (Claude's Discretion), not a requirement — the compliance-relevant fix is in `services/agents/*`, not this file. If left in place, the DPIA doc (REQ-2) should note it explicitly as "dead code, not part of the live data flow" to avoid future confusion.
   - **RESOLVED:** Plan 28-02 Task 1 keeps the file (Claude's Discretion) but strips `userName` from it too and documents it in the DPIA as dead code, not part of the live data flow.

3. **Is there an actual GROQ_API_KEY / CLAUDE_API_KEY / GEMINI_API_KEY currently configured in the production Vercel environment, or are some of these theoretical/unused?**
   - What we know: `api/llm-proxy.ts` supports all 3 providers; the app only calls `provider=groq` from the live UI code paths found. `GEMINI_API_KEY` is used for RAG embeddings per CLAUDE.md's dependency list (not re-verified line-by-line this session).
   - What's unclear: Whether `CLAUDE_API_KEY` is actually set in Vercel (if unset, `handleClaude` in `api/llm-proxy.ts` 500s, meaning Claude is fully inert in this deployment, not just unused-by-the-UI).
   - Recommendation: DPIA/SUBPROCESATORI authors (human or Claude during implementation) should ask the user directly whether `CLAUDE_API_KEY` is configured live, rather than assuming — this affects whether Anthropic belongs in `SUBPROCESATORI.md` at all.
   - **RESOLVED:** Plan 28-02 Task 3 does not assert either way — it writes "cod prezent, neinvocat de UI; a se confirma daca CLAUDE_API_KEY este setata" in SUBPROCESATORI.md, deferring the factual confirmation to the operator.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Supabase MCP `apply_migration` tool | REQ-5 (new columns), REQ-9 (new table + RLS) | Not verified this session (prior phases, e.g. 16, confirm it was available to the orchestrator in this environment; `gsd-executor` subagent reportedly lacks MCP access per `16-01-SUMMARY.md` — "Executat direct de orchestrator... gsd-executor nu are acces MCP Supabase") | — | If MCP unavailable to the executing agent, orchestrator must apply migrations directly (established precedent from Phase 16) rather than a subagent |
| `docs/gdpr/` write access | REQ-1/2/3/7 | ✓ (standard file write, no external dependency) | — | — |

**Missing dependencies with no fallback:** None identified — this phase has no hard external tool dependency beyond the already-proven-available Supabase MCP write path.

**Missing dependencies with fallback:** Supabase MCP access for subagents — established fallback is orchestrator-direct execution (see Phase 16/25 precedent), should be planned for explicitly if this phase's plan delegates DB tasks to a subagent.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|-----------------|---------|---------------------|
| V2 Authentication | No | No new auth flow introduced |
| V3 Session Management | No | No session changes |
| V4 Access Control | Yes | RLS policies on `cereri_gdpr` (D-12) — role-scoped SELECT/UPDATE via `get_active_club_id()`/`is_super_admin()`/join-to-`sportivi.user_id`, matching established project RLS convention (two-layer: RLS hard gate + UI hide for UX, per CLAUDE.md Error Handling / Cross-Cutting Concerns) |
| V5 Input Validation | Yes | `validateSportiv()` extension for `consimtamant_parinte_nume` (required, non-empty string check, per existing pattern for `nume`/`prenume`) |
| V6 Cryptography | No | No new cryptographic material; `consimtamant_parinte_data` is a plain timestamp, not a signed/hashed consent artifact — SPEC.md does not require cryptographic proof of consent, only a name+timestamp record |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Sportiv A crafts a request to create/view a `cereri_gdpr` row for sportiv B (privilege escalation on a sensitive personal-data-request record) | Elevation of Privilege / Information Disclosure | RLS `SELECT`/`INSERT` policy scoped strictly to `sportiv_id IN (SELECT id FROM sportivi WHERE user_id = auth.uid())` — never accept `sportiv_id` from client-supplied unvalidated input as the sole check; RLS must independently re-derive it server-side (D-09 already specifies this outcome, the risk is an implementation that trusts client-supplied `sportiv_id` without the RLS backstop) |
| ADMIN_CLUB from Club A approves/views a `cereri_gdpr` row belonging to a sportiv in Club B (cross-club leak — the exact class of bug found repeatedly in this project's audit history, e.g. Phase 15/16/25) | Information Disclosure | Same join-through-`sportivi.club_id` RLS pattern as `fisa_inscriere` (Phase 16 precedent) — do NOT rely on frontend `visibleClubIds` filtering alone, which CLAUDE.md itself documents as "defend against RLS bypass," i.e., a defense-in-depth layer, not the primary gate |
| `consimtamant_parinte_nume` accepted as any non-empty string with no server-side re-validation (client bypass) | Tampering | Not a high-severity concern per SPEC (Boundaries explicitly scope this to a name+timestamp field, not identity-verified consent) — but note DB-level `NOT NULL`-style guard should exist in addition to the client `validateSportiv()` check if the team wants defense-in-depth (matches project convention of RLS/DB constraints as the hard gate, UI as soft gate) |

## Sources

### Primary (HIGH confidence — verified in this codebase this session)
- `components/Sportivi/CereriInscriere.tsx` — full read, confirms status enum, table name `cereri_inregistrare`, approve/reject pattern
- `utils/eligibilitateCompetitie.ts` — full read, confirms `calculeazaVarstaLaData()` signature and logic
- `services/claudeService.ts`, `contexts/AIAssistantContext.tsx`, `services/agents/orchestrator.ts`, `services/agents/types.ts`, all 9 `services/agents/*Agent.ts` (grepped) — confirms dead-code status of `claudeService.ts` and the real `AgentContext`/`userName` flow
- `api/llm-proxy.ts` — full read, confirms 3 providers (claude/gemini/groq), default `groq`, and per-provider env var requirements
- `services/ragService.ts` — full read, confirms only query text + knowledge_base content sent, no personal-data fields
- `types.ts` (View union line 600, `Sportiv` interface line 77, `User` interface line 7) — confirms exact insertion points
- `components/menuConfig.ts` (full 4 menu arrays) — confirms exact menu-wiring pattern and current `account-settings`/`cereri-inscriere` placements
- `components/AppRouter.tsx`, `components/LazyComponents.tsx`, `components/UserMenu.tsx` — confirm View dispatch and lazy-load pattern
- `utils/validation.ts` `validateSportiv()` — full read, confirms current 4-check validation function
- `components/Sportivi/SportivFormFields.tsx`, `SportivFormModal.tsx` — full/partial read, confirms tab structure and form-state flow
- `docs/baza-de-date.md` — full read, confirms table name discrepancy vs. live code (`cereri_inscriere` doc name vs `cereri_inregistrare` actual table)
- `.planning/phases/16-elimina-politici-rls-using-true-ramase-rezultate-facturi-fed/16-01-SUMMARY.md` — confirms `get_active_club_id()`, `is_super_admin()`, `fisa_practicant_club_id()` RLS precedent and MCP `apply_migration` live-application pattern
- `.gitignore` line 17 (`supabase/`) — confirms migrations-not-committed convention
- `.env.example` — confirms `SMS_PROVIDER` options and default

### Secondary (MEDIUM confidence — carried from prior same-day research session, not re-verified against primary legal sources this session)
- Claude memory `project_gdpr_ai_act_conformitate.md` — 10 legal obligations list, citing dataprotection.ro (ANSPDCP), EDPB/RO DPIA guide, Goodwin Law (AI Act transparency 2026), Microsoft GDPR+GenAI public-sector guide, StartupCafe (2026 fine example), Avocatoo (children's data), artificialintelligenceact.eu Art. 59

### Tertiary (LOW confidence)
- None used this session — all findings above are either code-grounded (HIGH) or carried from the cited prior legal research (MEDIUM, with explicit sources).

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no new libraries
- Architecture / code-grounding: HIGH — every file reference in this document was read or grepped directly this session
- Legal/compliance content for the 4 markdown docs: MEDIUM — sourced from a same-day prior research session with cited ANSPDCP/EDPB/legal sources, not independently re-verified against primary legal text in this session
- Pitfalls: HIGH — Pitfall 1 and 2 (dead code, wrong subprocessor) are directly observed code facts, not inferred

**Research date:** 2026-09-03
**Valid until:** 30 days for the code-grounding findings (stable unless the AI Assistant module is refactored again); legal claims should be re-validated by the team against a lawyer/DPO consultation before publishing `docs/gdpr/*` as authoritative — this was explicitly out of scope per SPEC.md ("Numire DPO oficial... decizie organizationala separata")
