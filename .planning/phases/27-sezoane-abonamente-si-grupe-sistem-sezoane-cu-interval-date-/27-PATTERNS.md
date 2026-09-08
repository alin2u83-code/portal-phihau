# Phase 27: Sezoane Abonamente si Grupe - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 9
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `sql/migrations/add_sezoane.sql` (nou tabel + RLS + index unic) | migration | CRUD | `supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql` (secțiunea `tipuri_abonament`/`perioade_vacanta`) | exact |
| `sql/migrations/add_sezon_id_grupe_tipuri_abonament.sql` (ALTER TABLE) | migration | CRUD | `sql/migrations/add_sportiv_grupa_istoric.sql` | role-match |
| `components/Sezoane/index.tsx` | component (page/screen) | CRUD (request-response) | `components/Plati/PerioadaVacanta.tsx` (`PerioadaVacantaView`) | exact |
| `components/Sezoane/SezonFormModal.tsx` | component (modal form) | request-response | `components/Plati/PerioadaVacanta.tsx` (`CrudModal`, lines 26-95) | exact |
| `components/Grupe/GrupaFormModal.tsx` (extindere) | component (modal form) | request-response | self (existing file, extend conditional-field pattern already used for `showAddLocatie`) | exact |
| `components/Grupe/GrupaCard.tsx` (extindere) | component (card/display) | request-response | self (existing file, extend badge + menu-action pattern) | exact |
| `components/Grupe/ArhiveazaCloneazaModal.tsx` | component (modal, action) | request-response | `components/Plati/PerioadaVacanta.tsx` (`AdaugaParticipantiModal`, lines 106-244 — modal that performs a batch write and calls `onSaved`/`onClose`) | role-match |
| `components/Plati/TipuriAbonament.tsx` (extindere: sezon label + disable-delete + versionare) | component (list/CRUD) | CRUD | self (existing file) + `components/Plati/ConfigurarePreturi.tsx` (`handleSaveClick`, lines 97-135, versioning pattern) | exact (self) / exact (versioning) |
| `components/Plati/PlatiScadente.tsx` (fix fallback linia ~252) | service/component (billing generation) | batch / transform | self (existing file, bug-fix in place — no external analog needed) | n/a (in-place fix) |
| `hooks/useSezoane.ts` (nou, opțional) | hook | CRUD | `hooks/useGrupe.ts` / `hooks/useDataProvider.ts` | role-match |

## Pattern Assignments

### `components/Sezoane/index.tsx` (component, CRUD)

**Analog:** `components/Plati/PerioadaVacanta.tsx` (`PerioadaVacantaView`, full file)

**Imports pattern** (lines 1-12):
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { PerioadaVacanta, ParticipareVacanta } from '../../types';
import { Button, Card, Input, Modal } from '../ui';
import {
    ArrowLeftIcon, PlusIcon, TrashIcon, EditIcon,
    ChevronDownIcon, ChevronUpIcon, XIcon, SearchIcon, UsersIcon,
} from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
```
For `Sezoane/index.tsx`, swap `ChevronDownIcon/ChevronUpIcon/XIcon/SearchIcon` for `CalendarDaysIcon`/`CheckCircleIcon` per UI-SPEC, and use `EmptyState` from `../ui` instead of the manual `Card` empty-state pattern (UI-SPEC explicitly calls out `EmptyState` as canonical post-Phase-25, unlike the older `PerioadaVacanta.tsx`).

**Permissions/admin-gate pattern** (lines 376-382):
```typescript
export const PerioadaVacantaView: React.FC<PerioadaVacantaViewProps> = ({ onBack }) => {
    const { filteredData, activeRoleContext } = useData();
    const { showError } = useError();
    const permissions = usePermissions(activeRoleContext);

    const clubId = activeRoleContext?.club_id;
    const isAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
```
Reuse verbatim for `Sezoane/index.tsx` — matches D-02 (ADMIN_CLUB+ manages sezoane).

**Fetch-per-club pattern** (lines 449-466):
```typescript
const fetchPerioade = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data, error } = await supabase
        .from('perioade_vacanta')
        .select('*')
        .eq('club_id', clubId)
        .order('data_start', { ascending: false });
    if (error) {
        showError('Eroare la încărcare', error);
    } else {
        setPerioade(data ?? []);
    }
    setLoading(false);
}, [clubId]);

useEffect(() => { fetchPerioade(); }, [fetchPerioade]);
```
For `sezoane`, replicate 1:1 (table name `sezoane`, order by `data_start desc`).

**CRUD save pattern** (lines 490-512):
```typescript
const handleSavePeriada = async (values: { denumire: string; data_start: string; data_end: string }) => {
    if (!clubId) return;
    setIsSaving(true);
    try {
        if (modalState?.mode === 'edit' && modalState.item) {
            const { error } = await supabase
                .from('perioade_vacanta')
                .update(values)
                .eq('id', modalState.item.id)
                .eq('club_id', clubId);
            if (error) showError('Eroare la actualizare', error);
            else { await fetchPerioade(); setModalState(null); }
        } else {
            const { error } = await supabase
                .from('perioade_vacanta')
                .insert({ ...values, club_id: clubId });
            if (error) showError('Eroare la creare', error);
            else { await fetchPerioade(); setModalState(null); }
        }
    } finally {
        setIsSaving(false);
    }
};
```
For sezoane's "Activează" flow (D-03), extend this pattern: before/after the insert/update, add an explicit `UPDATE sezoane SET activ=false WHERE club_id=X AND id != noul_id` step (never rely on the UNIQUE INDEX alone to fix state — treat the index violation as a race-condition guard, not the primary mechanism), wrapped with the `ConfirmModal` copy specified in UI-SPEC ("Activează sezon nou").

**Row/Card list + admin actions pattern** (lines 613-677): reuse the `Card` per-row list structure with `EditIcon`/`TrashIcon` ghost buttons (`Button variant="secondary" size="xs" ghost` / `variant="danger" size="xs" ghost"`) — this is the exact pattern UI-SPEC calls for on the Sezoane screen.

**Delete confirmation pattern** (lines 781-789):
```typescript
<ConfirmDeleteModal
    isOpen={perioadaToDelete !== null}
    onClose={() => setPerioadaToDelete(null)}
    onConfirm={handleDeletePeriada}
    tableName="perioade_vacanta"
    isLoading={isDeleting}
    customMessage={deleteMessage}
/>
```
Reuse for sezon delete with `tableName="sezoane"` and the custom message specified in UI-SPEC Copywriting Contract.

---

### `components/Sezoane/SezonFormModal.tsx` (component, request-response)

**Analog:** `components/Plati/PerioadaVacanta.tsx` → `CrudModal` (lines 28-95)

**Full pattern to copy (structure + date validation)**:
```typescript
const CrudModal: React.FC<CrudModalProps> = ({ mode, item, onClose, onSave, isSaving }) => {
    const [denumire, setDenumire] = useState(item?.denumire ?? '');
    const [dataStart, setDataStart] = useState(item?.data_start ?? '');
    const [dataEnd, setDataEnd] = useState(item?.data_end ?? '');
    const [dateError, setDateError] = useState('');

    const handleSave = async () => {
        if (!denumire.trim()) return;
        if (!dataStart || !dataEnd) return;
        if (dataEnd < dataStart) {
            setDateError('Data de sfârșit trebuie să fie >= data de start.');
            return;
        }
        setDateError('');
        await onSave({ denumire: denumire.trim(), data_start: dataStart, data_end: dataEnd });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={mode === 'add' ? 'Adaugă Perioadă' : 'Editează Perioadă'}>
            <div className="space-y-4">
                <Input label="Denumire *" value={denumire} onChange={e => setDenumire(e.target.value)} placeholder="ex: Vacanță de vară 2026" />
                <Input label="Data Start *" type="date" value={dataStart} onChange={e => setDataStart(e.target.value)} />
                <Input label="Data Sfârșit *" type="date" value={dataEnd} onChange={e => setDataEnd(e.target.value)} error={dateError || undefined} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose} disabled={isSaving}>Anulează</Button>
                <Button variant="primary" onClick={handleSave} isLoading={isSaving} disabled={!denumire.trim() || !dataStart || !dataEnd}>Salvează</Button>
            </div>
        </Modal>
    );
};
```
Adapt: field names `data_start`/`data_final` (per RESEARCH.md schema, not `data_end`), error copy exactly `"Data de sfârșit trebuie să fie după data de start."` per UI-SPEC Copywriting Contract, and add a `Switch` (from `../ui`) "Activează acest sezon acum" per UI-SPEC section 1 (default checked only when the club has zero existing sezoane — check via a prop like `isFirstSezon`).

---

### `components/Grupe/GrupaFormModal.tsx` (extindere)

**Analog:** self — existing conditional-field pattern (`showAddLocatie`, lines 88, 171-187) is the established show/hide pattern in this exact file; UI-SPEC explicitly directs reuse of this same mechanism for the conditional "Sezon" select.

**Conditional field pattern to replicate** (lines 166-188):
```typescript
<div className="space-y-1">
    <Select label="Locație (Sala)" name="locatie_id" value={formState.locatie_id} onChange={handleChange}>
        <option value="">Selectează locație...</option>
        {locatiiFiltrate.map(l => <option key={l.id} value={l.id}>{l.nume}{l.adresa ? ` — ${l.adresa}` : ''}</option>)}
    </Select>
    {!showAddLocatie && (
        <button type="button" onClick={() => setShowAddLocatie(true)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
            <PlusIcon className="w-3 h-3" />
            Adaugă locație nouă
        </button>
    )}
    {showAddLocatie && (
        <AddLocatieInline clubId={formState.club_id || activeClubId || currentUser.club_id || null} onAdded={handleLocatieAdded} onCancel={() => setShowAddLocatie(false)} />
    )}
</div>
```
New pattern: `<Select label="Tip Grupă" name="tip_grupa" value={formState.tip_grupa} onChange={handleChange}>` with two `<option>`s (`permanent` default / `per_sezon`), then conditionally render `<Select label="Sezon" name="sezon_id" ...>` only when `formState.tip_grupa === 'per_sezon'` — same instant show/hide, no animation, matching this file's existing convention. Add helper `<p>` text below using `text-[var(--t-text-muted)]` per UI-SPEC.

**Form-state init pattern** (lines 85, 98-109) — extend `formState` shape and the `useEffect` that resets it from `grupaToEdit` to include `tip_grupa: grupaToEdit?.tip_grupa || 'permanent'` and `sezon_id: grupaToEdit?.sezon_id || ''`.

**Submit payload pattern** (lines 138-154) — extend `finalGrupa` object to include `tip_grupa: formState.tip_grupa, sezon_id: formState.tip_grupa === 'per_sezon' ? (formState.sezon_id || null) : null`.

---

### `components/Grupe/GrupaCard.tsx` (extindere)

**Analog:** self — existing badge row (lines 98-114) and dropdown-menu action pattern (lines 144-205).

**Badge pattern to replicate** (lines 100-113):
```typescript
<div className="flex flex-col items-end gap-1 shrink-0">
    {anulatAzi && (
        <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs px-2 py-0.5 rounded-full font-medium">
            <ExclamationTriangleIcon className="w-3 h-3" />
            Anulat azi
        </span>
    )}
    {programModificat && !anulatAzi && (
        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs px-2 py-0.5 rounded-full font-medium">
            <CalendarIcon className="w-3 h-3" />
            Program modificat
        </span>
    )}
</div>
```
UI-SPEC overrides the raw `<span>` styling here with the project's canonical `Badge` component (`components/ui.tsx`, variants `blue`/`amber`/`slate`) — do NOT copy the inline Tailwind span classes for the new tip_grupa/arhivat badges, use `<Badge variant="blue">Permanentă</Badge>` / `<Badge variant="amber">Per Sezon</Badge>` / `<Badge variant="slate">Arhivată</Badge>` instead, placed in the same header row (line ~98) next to `grupa.denumire`.

**Dropdown menu action pattern** (lines 170-179, "Generează Antrenamente" button) — copy this exact button shape for the new "Dublează în sezon nou" action (D-07), conditionally rendered only when `grupa.arhivat === true` and the club has an active sezon different from the grupă's own `sezon_id`:
```typescript
{onGenerareAntrenamente && (
    <button
        onClick={() => { setIsMenuOpen(false); onGenerareAntrenamente(grupa); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-emerald-400 hover:bg-slate-700 transition-colors text-left min-h-[44px] touch-manipulation"
        title="Generează antrenamente pe o perioadă din orarul săptămânal"
    >
        <SparklesIcon className="w-4 h-4 shrink-0" />
        Generează Antrenamente
    </button>
)}
```
Per UI-SPEC section 3, on archived cards this "Dublează în sezon nou" action REPLACES the primary edit/delete actions (not just added to the "..." menu) and the whole `Card` gets `opacity-60`.

---

### `components/Grupe/ArhiveazaCloneazaModal.tsx` (nou)

**Analog:** `components/Plati/PerioadaVacanta.tsx` → `AdaugaParticipantiModal` (lines 106-244) — closest existing example of "a modal that performs a batch write via a loop of Supabase calls and then calls `onSaved()` + `onClose()`".

**Batch-write + close pattern** (lines 145-160):
```typescript
const handleSave = async () => {
    if (selected.size === 0) return;
    setIsSaving(true);
    const rows = Array.from(selected).map(sid => ({
        perioada_id: perioadaId,
        sportiv_id: sid,
    }));
    const { error } = await supabase.from('participare_vacanta').insert(rows);
    if (error) {
        showError('Eroare adăugare participanți', error);
        setIsSaving(false);
    } else {
        onSaved();
        onClose(); // component unmounts — no further state updates after this
    }
};
```
For clone action, this becomes a single `INSERT` into `grupe` (new row: same `denumire`/`sala`/`club_id`/`locatie_id`/`program`, but `sezon_id = sezonActivId`, `tip_grupa = 'per_sezon'`, `arhivat = false`) — NO sportivi copy step (D-08), matching UI-SPEC's confirmation copy: *"Se va crea o grupă nouă '{denumire}' legată de sezonul '{sezon activ}', fără sportivi asignați..."*. Use `ConfirmModal` (per UI-SPEC) rather than a full custom modal if the only input is a confirmation, not a form.

---

### `components/Plati/TipuriAbonament.tsx` (extindere)

**Analog (existing CRUD in same file):** `handleAdd`/`doAdd` (lines 43-84) and `confirmDelete` (lines 100-114).

**Insert pattern to extend** (lines 43-66) — add `sezon_id: sezonActivId` to the `newAbonament` payload automatically (silent, per UI-SPEC section 4 — "no new form field").

**Delete pattern to guard** (lines 100-114):
```typescript
const confirmDelete = async (id: string) => {
    if(!supabase) return;
    setIsDeleting(true);
    try {
        const { error } = await supabase.from('tipuri_abonament').delete().eq('id', id);
        if (error) throw error;
        setTipuriAbonament(prev => prev.filter(ab => ab.id !== id));
        showSuccess('Succes', 'Tipul de abonament a fost șters.');
    } catch (err: any) {
        showError('Eroare la ștergere', err);
    } finally {
        setIsDeleting(false);
        setToDelete(null);
    }
};
```
Per UI-SPEC and RESEARCH Anti-Patterns, hard-`delete()` must be guarded: before showing the delete button, check `plati.some(p => p.tip_abonament_id === tip.id)` (or a `count` query) and render a disabled button (`title="Tip folosit în facturi emise — nu poate fi șters"`) instead of calling `confirmDelete` when referenced.

**Versioning pattern for price/sezon changes (istoric, D-09):**
`components/Plati/ConfigurarePreturi.tsx`, `handleSaveClick` (lines 97-134):
```typescript
// Pas 1: Dezactivează prețul vechi
const { error: updateError } = await supabase.from('grade_preturi_config').update({ is_activ: false }).eq('id', oldPrice.id);
if (updateError) {
    showError("Eroare la dezactivarea prețului vechi", updateError);
    setLoading(false);
    return;
}
// Pas 2: Inserează prețul nou
const newPriceRecord = {
    grad_id: oldPrice.grad_id,
    suma: sumaNum,
    data_activare: new Date().toISOString().split('T')[0],
    is_activ: true
};
const { error: insertError } = await supabase.from('grade_preturi_config').insert(newPriceRecord);
if (insertError) {
    showError("Eroare critică la salvare", "Prețul nou nu a putut fi salvat. Se încearcă reactivarea prețului vechi...");
    await supabase.from('grade_preturi_config').update({ is_activ: true }).eq('id', oldPrice.id);
    setLoading(false);
    return;
}
```
This is the canonical "dezactivează + inserează, cu rollback pe eroare" pattern — use it verbatim (adapted field names) anywhere `tipuri_abonament` needs a price/season change without breaking `plati.tip_abonament_id` FK history (RESEARCH.md Pattern 1).

---

### `components/Plati/PlatiScadente.tsx` (fix, no external analog)

**In-place fix required (Pitfall 1, RESEARCH.md line ~244):** the fallback `.find()` at line ~252 must filter `tipuriAbonament` by `sezon_id === sezonActivId` (or `sezon_id === null` for pre-sezon legacy rows) BEFORE the `.find(ab => ab.numar_membri === 1)` fallback executes. Apply the same filter-before-fallback guard to any other of the 12 files listed in RESEARCH.md Pitfall 1 that perform a similar `.find()`/`.filter()` on `tipuriAbonament` for billing purposes.

---

## Shared Patterns

### RLS canonical per-club (write restricted to admin roles)
**Source:** `supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`, lines 166-196 (`tipuri_abonament_select`/`tipuri_abonament_write`)
**Apply to:** new `sezoane` table (SELECT + WRITE policies)
```sql
CREATE POLICY "tipuri_abonament_select" ON public.tipuri_abonament
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.has_access_to_club(club_id)
    );

CREATE POLICY "tipuri_abonament_write" ON public.tipuri_abonament
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
        )
        AND (public.este_staff_club(club_id) OR public.is_super_admin())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
        )
        AND (public.este_staff_club(club_id) OR public.is_super_admin())
    );
```
Note (A1, RESEARCH.md): `este_staff_club()` includes INSTRUCTOR — since D-02 restricts sezon write strictly to ADMIN_CLUB+, use `public.has_access_to_club(club_id)` (NOT `este_staff_club`) as the club-scope predicate alongside the explicit `rol_denumire IN (...)` gate, i.e. do not reuse `este_staff_club` verbatim for `sezoane_write` — only the role-predicate structure is shared, the club-scope check differs. `grupe`'s existing `Staff - Full Access Grupe` policy (`has_access_to_club(club_id)` with no role gate, lines 273-276) stays unchanged — INSTRUCTOR keeps write access to `grupe.tip_grupa`/`sezon_id` per D-04.

### Unique-active-per-club index
**Source:** `sql/migrations/add_sportiv_grupa_istoric.sql` (`idx_sgi_activ`, pattern referenced in RESEARCH.md Pattern 2)
**Apply to:** `sezoane` table — enforces D-03 at the DB layer
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_sezoane_activ_per_club
    ON public.sezoane(club_id) WHERE activ = true;
```
UI layer must catch the resulting `unique_violation` and show the exact copy from UI-SPEC: *"Activarea a eșuat — este posibil ca alt admin să fi activat deja un sezon în același timp..."*.

### Error handling / service layer
**Source:** `useError()` hook, used identically across `PerioadaVacanta.tsx`, `TipuriAbonament.tsx`, `ConfigurarePreturi.tsx` — `showError(title, error)` / `showSuccess(title, message)`.
**Apply to:** all new/modified files in this phase — no new error-handling pattern needed, reuse `useError()` verbatim.

### Confirm-before-destructive-or-state-changing-action
**Source:** `ConfirmDeleteModal` (deletes) + `ConfirmModal`/`confirmDialog` state pattern in `TipuriAbonament.tsx` (lines 29-30) for non-delete confirmations.
**Apply to:** sezon activation (D-03 state change), grupă clone (D-07), sezon delete — matches UI-SPEC's explicit requirement that "Activează" is not silent.

## No Analog Found

None — every file in scope has at least a role-match analog already in the codebase (RESEARCH.md explicitly notes this: "Nu există în cod niciun precedent de tabel 'sezon'" for the schema itself, but the `perioade_vacanta` interval+club_id shape plus the `sportiv_grupa_istoric` unique-active-index pattern together fully cover the new `sezoane` table's needs).

## Metadata

**Analog search scope:** `components/Plati/`, `components/Grupe/`, `sql/migrations/`, `supabase/migrations/`, `hooks/`
**Files scanned:** `PerioadaVacanta.tsx`, `TipuriAbonament.tsx`, `ConfigurarePreturi.tsx`, `GrupaFormModal.tsx`, `GrupaCard.tsx`, `20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`, `add_sportiv_grupa_istoric.sql` (referenced), `useGrupe.ts`/`useDataProvider.ts` (referenced)
**Pattern extraction date:** 2026-09-02
