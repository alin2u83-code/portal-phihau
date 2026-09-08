# Phase 28: Conformitate GDPR si AI Act - Pattern Map

**Mapped:** 2026-09-03
**Files analyzed:** 17 (4 new docs, 6 new/modified code files, 7 modified existing files)
**Analogs found:** 13 / 13 code-relevant files (docs have no code analog, N/A)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md` | doc | N/A | none (new doc type) | no analog (see below) |
| `docs/gdpr/DPIA-AI-ASSISTANT.md` | doc | N/A | none | no analog |
| `docs/gdpr/SUBPROCESATORI.md` | doc | N/A | none | no analog |
| `docs/gdpr/POLITICA-RETENTIE.md` | doc | N/A | none | no analog |
| `components/Sportivi/CereriGDPR.tsx` | component (admin queue) | CRUD (status-transition) | `components/Sportivi/CereriInscriere.tsx` | exact |
| `components/ProtectiaDatelor/index.tsx` | component (page) | request-response + CRUD (insert own request) | `components/Sportivi/CereriInscriere.tsx` (list/status logic) + `components/UserMenu.tsx` (self-service account page pattern) | role-match |
| `components/Sportivi/SportivFormFields.tsx` (edit) | component (form) | CRUD | itself (existing file, add accordion + fields) | exact (self) |
| `utils/validation.ts` (edit) | utility (validator) | transform | itself (existing file, extend `validateSportiv`) | exact (self) |
| `types.ts` (edit) | config/types | N/A | itself — `View` union (line ~600), `Sportiv` interface (line ~77) | exact (self) |
| `components/menuConfig.ts` (edit) | config | N/A | itself — existing `cereri-inscriere`/`account-settings` entries (lines 91, 98, 175, 180, 217, 227) | exact (self) |
| `components/AppRouter.tsx` (edit) | route/dispatcher | request-response | itself — `case 'cereri-inscriere':` (line 142-143) | exact (self) |
| `components/LazyComponents.tsx` (edit) | config (lazy loader) | N/A | itself — existing `CereriInscriere` lazy export | exact (self) |
| `services/agents/types.ts` (edit) | model/interface | N/A | itself — `AgentContext` interface (line 12-17) | exact (self) |
| `services/agents/*Agent.ts` (9 files, edit) | service (prompt builder) | transform | `services/agents/sportiviAgent.ts` (representative — all 9 share identical `buildSystemPrompt` shape) | exact |
| `contexts/AIAssistantContext.tsx` (edit) | provider/context | event-driven (chat) | itself — `orchestrate()` call site (line 93-99) | exact (self) |
| `sql: sportivi.consimtamant_parinte_*` (migration) | migration | CRUD (schema) | Phase 16 `fisa_practicant_club_id` migration pattern (`16-01-SUMMARY.md`) | role-match |
| `sql: cereri_gdpr` table + RLS (migration) | migration | CRUD (schema + RLS) | Phase 16 `fisa_inscriere` RLS precedent (`16-01-SUMMARY.md`) | exact |

## Pattern Assignments

### `components/Sportivi/CereriGDPR.tsx` (new component, admin queue, CRUD)

**Analog:** `components/Sportivi/CereriInscriere.tsx` (full file is the reference — copy structurally, ~180 lines)

**Imports pattern** (lines 1-2):
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
```

**Type + status enum pattern** (lines 4-31):
```typescript
type StatusCerere = 'in_asteptare' | 'aprobata' | 'respinsa';

interface CerereInscriere {
    id: string;
    club_id: string;
    // ... domain fields
    status: StatusCerere;
    created_at: string;
    procesat_la: string | null;
    motiv_respingere: string | null;
    club: { nume: string; slug?: string | null } | null;
}

const TAB_LABELS: { key: StatusCerere; label: string }[] = [
    { key: 'in_asteptare', label: 'În așteptare' },
    { key: 'aprobata', label: 'Aprobate' },
    { key: 'respinsa', label: 'Respinse' },
];
```
For `CereriGDPR.tsx`: rename type to `CerereGDPR`, fields per D-07 (`sportiv_id`, `tip_cerere: 'export' | 'stergere'`, `status`, `data_cerere`, `procesat_la`, `procesat_de`), same `TAB_LABELS` (identical status enum per D-06).

**Fetch pattern** (lines 45-60):
```typescript
const fetchCereri = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('cereri_inregistrare')
        .select('*, club:club_id(nume, slug)')
        .order('created_at', { ascending: false });

    if (!error && data) {
        setCereri(data as CerereInscriere[]);
    }
    setLoading(false);
}, []);

useEffect(() => {
    fetchCereri();
}, [fetchCereri]);
```
For `CereriGDPR.tsx`: `.from('cereri_gdpr').select('*, sportiv:sportiv_id(nume, prenume, club_id)')`.

**Approve mutation pattern** (lines 65-73) — **critical: D-11 requires ONLY status flip, no side effect, matches this pattern exactly, plus add `procesat_de`:**
```typescript
const handleAproba = async (id: string) => {
    setProcessingId(id);
    await supabase
        .from('cereri_inregistrare')
        .update({ status: 'aprobata', procesat_la: new Date().toISOString() })
        .eq('id', id);
    await fetchCereri();
    setProcessingId(null);
};
```
For `CereriGDPR.tsx`, add `procesat_de: currentUser.id` to the update payload (new field per D-07, not present in the `cereri_inregistrare` source — must be added, `currentUser` must be threaded as a prop).

**Reject mutation pattern** (lines 75-97):
```typescript
const handleRespinge = (id: string) => {
    setMotivRespingere('');
    setRespingereModal({ open: true, cerereId: id });
};

const handleConfirmRespingere = async () => {
    if (!respingereModal.cerereId) return;
    setProcessingId(respingereModal.cerereId);
    setRespingereModal({ open: false, cerereId: null });

    await supabase
        .from('cereri_inregistrare')
        .update({
            status: 'respinsa',
            procesat_la: new Date().toISOString(),
            motiv_respingere: motivRespingere || null,
        })
        .eq('id', respingereModal.cerereId);

    await fetchCereri();
    setProcessingId(null);
    setMotivRespingere('');
};
```
`cereri_gdpr` per D-07 has no `motiv_respingere` column decided — reuse the reject-confirmation UI shell but drop the `motivRespingere` field unless the planner adds the column (not in D-07's locked column list; treat as optional discretion).

---

### `components/ProtectiaDatelor/index.tsx` (new component, self-service page)

**Analog (list/status portion):** `components/Sportivi/CereriInscriere.tsx` fetch/status pattern above, scoped to own `sportiv_id` instead of all-club.

**Insert-own-request pattern** (from RESEARCH.md Code Examples, verified against `utils/auth.ts` `sportivi.user_id` linkage per D-09/D-10):
```typescript
// Resolve own sportiv_id — button hidden (not disabled) if none found, per D-10
const misSportivId = sportivi.find(s => s.user_id === currentUser?.id)?.id ?? null;

{misSportivId && (
  <Button onClick={() => creeazaCerere(misSportivId, tipCerere)}>
    Solicită {tipCerere === 'export' ? 'export' : 'ștergere'} date
  </Button>
)}

const creeazaCerere = async (sportivId: string, tip: 'export' | 'stergere') => {
    await supabase.from('cereri_gdpr').insert({ sportiv_id: sportivId, tip_cerere: tip });
    await fetchMyCereri();
};
```

**Own-request list fetch** — same shape as `fetchCereri` above but filtered to self via RLS (no client-side `.eq()` needed if RLS scopes correctly per D-12; belt-and-suspenders `.eq('sportiv_id', misSportivId)` still recommended, matching CLAUDE.md's "frontend also filters ... to defend against RLS bypass").

---

### `components/Sportivi/SportivFormFields.tsx` (edit — REQ-4 accordion + REQ-5 consimtamant fields)

**Analog:** itself, existing structure + `ui.tsx` `Accordion`/`AccordionItem` components (already exist — no new UI primitive needed).

**Imports to add** (extends existing block, line 1-6):
```typescript
import { Button, Input, Select, FormSection, Switch, DateInputDMY, Accordion, AccordionItem } from '../ui';
import { calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';
```

**Existing Accordion component to reuse** (`components/ui.tsx` lines 1209-1241):
```typescript
export const AccordionItem: React.FC<AccordionItemProps> = ({ id, title, icon: Icon, isOpen, onToggle, children }) => (
  <div className="border border-[var(--t-border)] rounded-lg overflow-hidden">
    <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between px-4 py-3 bg-[var(--t-surface-2)] hover:bg-[var(--t-surface)] transition-colors text-left">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-amber-400 shrink-0" />}
        <span className="font-semibold text-slate-200 text-sm uppercase tracking-wider">{title}</span>
      </div>
      <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="p-3 bg-slate-900/40">{children}</div>}
  </div>
);
export const Accordion: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="space-y-2">{children}</div>;
```
Use with local `isOpen` state defaulted `false` (D-16: closed by default) at the top of the `'general'` tab block, only when `!initialData.id` (D-18: new sportiv only — gate on absence of existing `id`).

**Insertion point for accordion** (before line 185 `<FormSection title="Date Personale">`, inside `{activeTab === 'general' && (...)}` at line 183-184):
```typescript
{activeTab === 'general' && (
    <div className="space-y-4 animate-fade-in">
        {!initialData.id && (
            <Accordion>
                <AccordionItem id="gdpr-info" title="Notă de informare GDPR" isOpen={gdprInfoOpen} onToggle={() => setGdprInfoOpen(o => !o)}>
                    {/* text + link catre 'protectia-datelor' view */}
                </AccordionItem>
            </Accordion>
        )}
        <FormSection title="Date Personale">
            {/* existing fields */}
```

**Insertion point for consimtamant fields** (immediately after `data_nasterii` field, lines 208-217, D-05):
```typescript
<div className="col-span-full sm:col-span-1">
    <DateInputDMY
        label="Data Nașterii *"
        value={formData.data_nasterii || ''}
        onChange={handleDateChange('data_nasterii')}
        required
        disabled={loading}
        error={visibleErrors.data_nasterii}
    />
</div>
{formData.data_nasterii && calculeazaVarstaLaData(formData.data_nasterii, new Date().toISOString().split('T')[0]) < 16 && (
    <Input
        label="Nume complet părinte/tutore (consimțământ) *"
        name="consimtamant_parinte_nume"
        value={formData.consimtamant_parinte_nume || ''}
        onChange={handleChange}
        onBlur={() => markTouched('consimtamant_parinte_nume')}
        required
        disabled={loading}
        error={visibleErrors.consimtamant_parinte_nume}
        placeholder="ex: Popescu Ion"
    />
)}
```
`consimtamant_parinte_data` is set programmatically at submit time (D-04, not a form field) — set in the parent `SportivFormModal.tsx` submit handler: `consimtamant_parinte_data: new Date().toISOString()` when `consimtamant_parinte_nume` is present and changed.

**`generalFields` badge array update** (line 153):
```typescript
const generalFields = ['nume', 'prenume', 'data_nasterii', 'consimtamant_parinte_nume'];
```

---

### `utils/validation.ts` (edit — REQ-5/D-03 age-gated required field)

**Analog:** itself (existing 10-line file, full content below).

**Current full pattern**:
```typescript
import { Sportiv } from '../types';

export const validateSportiv = (data: Partial<Sportiv>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
    if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
    if (!data.data_nasterii) newErrors.data_nasterii = "Data nașterii este obligatorie.";
    if (!data.id && data.parola && data.parola.length < 6) newErrors.parola = "Parola trebuie să aibă minim 6 caractere.";
    return newErrors;
};
```

**Extension to add** (import `calculeazaVarstaLaData`, add age-gate check — this single check satisfies both REQ-5 new-sportiv and D-03 existing-sportiv-blocked-at-edit since `validateSportiv` runs unconditionally for create AND edit):
```typescript
import { Sportiv } from '../types';
import { calculeazaVarstaLaData } from './eligibilitateCompetitie';

export const validateSportiv = (data: Partial<Sportiv>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
    if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
    if (!data.data_nasterii) newErrors.data_nasterii = "Data nașterii este obligatorie.";
    if (!data.id && data.parola && data.parola.length < 6) newErrors.parola = "Parola trebuie să aibă minim 6 caractere.";
    if (data.data_nasterii) {
        const varsta = calculeazaVarstaLaData(data.data_nasterii, new Date().toISOString().split('T')[0]);
        if (varsta < 16 && !data.consimtamant_parinte_nume?.trim()) {
            newErrors.consimtamant_parinte_nume = "Consimțământul părintelui/tutorelui este obligatoriu pentru sportivii sub 16 ani.";
        }
    }
    return newErrors;
};
```

**Source of reused age function** (`utils/eligibilitateCompetitie.ts` lines 9-18, read-only reuse, no modification):
```typescript
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

---

### `services/agents/types.ts` + all 9 `services/agents/*Agent.ts` (edit — REQ-6 minimization)

**Current `AgentContext` interface** (`services/agents/types.ts` lines 12-17):
```typescript
export interface AgentContext {
  activeView: string;
  userRole: string;
  userName: string;
  clubName?: string;
}
```
**Change:** remove `userName: string;` line.

**Current per-agent pattern** (identical shape across all 9 files — representative excerpt `services/agents/sportiviAgent.ts` lines 3-5, `adminAgent.ts`/`generalAgent.ts`/`exameneAgent.ts`/`grupeAgent.ts`/`financiarAgent.ts`/`prezentaAgent.ts`/`legitimatiiAgent.ts`/`rapoarteAgent.ts` all share this exact structure):
```typescript
const buildSystemPrompt = (ctx: AgentContext): string => `Ești Agentul Sportivi — specialistul în gestionarea sportivilor din aplicația Qwan Ki Do Club Management.

Utilizator: ${ctx.userName} | Rol: ${ctx.userRole}${ctx.clubName ? ` | Club: ${ctx.clubName}` : ''}
...
```
**Change (apply identically to all 9 files):**
```typescript
const buildSystemPrompt = (ctx: AgentContext): string => `Ești Agentul Sportivi — specialistul în gestionarea sportivilor din aplicația Qwan Ki Do Club Management.

Rol: ${ctx.userRole}${ctx.clubName ? ` | Club: ${ctx.clubName}` : ''}
...
```
Files requiring this identical edit: `adminAgent.ts`, `grupeAgent.ts`, `sportiviAgent.ts`, `generalAgent.ts`, `rapoarteAgent.ts`, `financiarAgent.ts`, `prezentaAgent.ts`, `exameneAgent.ts`, `legitimatiiAgent.ts`.

**Caller to update** (`contexts/AIAssistantContext.tsx` lines 93-99):
```typescript
const result = await orchestrate(apiMessages, {
    activeView,
    userRole: activeRole,
    userName: currentUser
      ? `${currentUser.nume || ''} ${currentUser.prenume || ''}`.trim()
      : 'Utilizator',
    clubName,
```
**Change:** remove the `userName:` block entirely (4 lines: `userName: currentUser ? ... : 'Utilizator',`).

**Do NOT edit** `services/claudeService.ts` as the sole fix — it is dead code (zero call sites, confirmed via repo grep in RESEARCH.md). Editing only that file satisfies the literal SPEC grep-check but ships zero real minimization.

---

### New View wiring — `types.ts`, `menuConfig.ts`, `AppRouter.tsx`, `LazyComponents.tsx` (REQ-8/REQ-9)

**Analog:** existing `'cereri-inscriere'` / `account-settings` wiring, 4-file coordinated pattern (no URL routing in this SPA — CLAUDE.md).

**`components/menuConfig.ts`** — existing entries to mirror (lines 91, 98, 175, 180, 217, 227):
```typescript
{ label: 'Setări Cont', view: 'account-settings' },
...
{ label: 'Cereri Înscriere', icon: UserPlusIcon, view: 'cereri-inscriere' },
```
Add `{ label: 'Protecția datelor', icon: ShieldIcon /* or similar */, view: 'protectia-datelor' }` to ALL 4 menu arrays (near `account-settings`, per D-13). Add `{ label: 'Cereri GDPR', icon: UserPlusIcon, view: 'cereri-gdpr' }` ONLY to the two admin arrays (same lines as `cereri-inscriere` entries at 98/180), per D-08/D-12.

**`components/AppRouter.tsx`** — existing dispatch pattern (lines 142-143):
```typescript
case 'cereri-inscriere':
    return renderProtected(<Lazy.CereriInscriere onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
```
Add:
```typescript
case 'protectia-datelor':
    return <Lazy.ProtectiaDatelor onBack={handleBackToDashboard} currentUser={currentUser!} />;
case 'cereri-gdpr':
    return renderProtected(<Lazy.CereriGDPR onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
```

**`components/LazyComponents.tsx`** — mirror the existing `CereriInscriere` lazy export pattern for the two new components.

**`types.ts`** — add `'protectia-datelor' | 'cereri-gdpr'` to the `View` union (near line 600), and add `consimtamant_parinte_nume?: string; consimtamant_parinte_data?: string;` to the `Sportiv` interface (near line 77).

## Shared Patterns

### Status-enum approval queue (source: `components/Sportivi/CereriInscriere.tsx`)
**Apply to:** `CereriGDPR.tsx`
Romanian status enum `'in_asteptare' | 'aprobata' | 'respinsa'`, tab-per-status UI, `procesat_la` timestamp set on transition, `fetchCereri()` refetch after every mutation, no side effects beyond the status write (matches D-11 exactly).

### RLS join-through-parent-table (source: Phase 16 `fisa_practicant_club_id` precedent, `16-01-SUMMARY.md`)
**Apply to:** `cereri_gdpr` migration
```sql
CREATE OR REPLACE FUNCTION public.cerere_gdpr_sportiv_club_id(p_sportiv_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT club_id FROM public.sportivi WHERE id = p_sportiv_id; $$;

CREATE POLICY "Sportiv_Vede_Propriile_Cereri_GDPR" ON public.cereri_gdpr
  FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

CREATE POLICY "Admin_Club_Vede_Cereri_GDPR_Club" ON public.cereri_gdpr
  FOR SELECT USING (public.cerere_gdpr_sportiv_club_id(sportiv_id) = public.get_active_club_id());

CREATE POLICY "Bypass_Super_Admin_Cereri_GDPR" ON public.cereri_gdpr
  FOR ALL USING (public.is_super_admin());
-- No policy for INSTRUCTOR -> implicit deny (D-12)
```
Verify `get_active_club_id()` / `is_super_admin()` signatures live via Supabase MCP before finalizing (RESEARCH.md Open Question 1).

### Accordion / collapsible UI (source: `components/ui.tsx` lines 1209-1241)
**Apply to:** `SportivFormFields.tsx` GDPR info note (D-16), reuse `Accordion`/`AccordionItem` — no new UI component needed, design system already has this primitive.

### Age-from-DOB calculation (source: `utils/eligibilitateCompetitie.ts` lines 9-18)
**Apply to:** `SportivFormFields.tsx` (live field visibility) and `utils/validation.ts` (submit-time gate) — same function, two call sites, no duplication.

### Migration application (source: `16-01-SUMMARY.md`, project convention)
**Apply to:** both new migrations (`sportivi.consimtamant_parinte_*` columns, `cereri_gdpr` table + RLS)
`supabase/` is gitignored in this repo — migrations must be applied live via Supabase MCP `apply_migration`, not committed as a `.sql` file alone. Verify with `information_schema.columns`/`pg_policies` queries after applying.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md` | doc | N/A | First compliance-doc set in this repo; no `docs/` precedent for this doc type. Structure per SPEC.md acceptance criteria + memory `project_gdpr_ai_act_conformitate.md`. |
| `docs/gdpr/DPIA-AI-ASSISTANT.md` | doc | N/A | Same — no analog; must cite real code path (`services/agents/orchestrator.ts` + 9 agents), not dead `claudeService.ts` (RESEARCH.md Critical Finding #1). |
| `docs/gdpr/SUBPROCESATORI.md` | doc | N/A | Same — no analog; must list Groq (default live provider), not just Anthropic/Google/SMS (RESEARCH.md Critical Finding #2). |
| `docs/gdpr/POLITICA-RETENTIE.md` | doc | N/A | Same — no analog; document-only requirement, no code changes needed for REQ-7 itself. |

## Metadata

**Analog search scope:** `components/Sportivi/`, `components/ui.tsx`, `components/menuConfig.ts`, `components/AppRouter.tsx`, `services/agents/`, `contexts/AIAssistantContext.tsx`, `utils/validation.ts`, `utils/eligibilitateCompetitie.ts`, `types.ts`, prior phase summary `.planning/phases/16-.../16-01-SUMMARY.md`
**Files scanned:** ~15 read/grepped directly this session (CONTEXT.md + RESEARCH.md already code-grounded every reference)
**Pattern extraction date:** 2026-09-03
