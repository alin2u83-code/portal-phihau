# Phase 26: Wizard onboarding club nou — Pattern Map

**Mapped:** 2026-08-31
**Files analyzed:** 3 (1 modified component, 0 new API endpoints — `api/creare-cont.ts` reused unmodified)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/CluburiManagement.tsx` (`ClubFormModal`, `handleSave`) | component (form modal) | CRUD + request-response (chained club-insert → account-create) | `components/UserProfile/CreateAccountModal.tsx` | role-match (best available two-step account-creation UI) |
| (no new file) sequential submit logic inside `handleSave` | service-like inline logic | request-response, sequential/compensating | `hooks/useRoleAssignment.ts` → `createAccountAndAssignRole` | exact (this is literally the function to call) |
| (reused, no changes) `api/creare-cont.ts` | route/endpoint (Vercel serverless) | request-response | itself — already the analog, reused verbatim | exact |
| Result screen (reused, no changes) `components/ui.tsx` → `CredentialeContModal` | component | display-only | itself — reused verbatim | exact |

No brand-new files are created in this phase. Everything is either an extension of `ClubFormModal`/`handleSave` in `CluburiManagement.tsx`, or a straight reuse of `api/creare-cont.ts`, `hooks/useRoleAssignment.ts`, and `components/ui.tsx` → `CredentialeContModal`.

## Pattern Assignments

### `components/CluburiManagement.tsx` — `ClubFormModal` (component, CRUD form)

**Analog:** itself (extend in place) + `components/UserProfile/CreateAccountModal.tsx` for the "form → submit → show CredentialeContModal" sequencing pattern.

**Current imports** (`components/CluburiManagement.tsx` lines 1-10):
```tsx
import React, { useState } from 'react';
import { Club, User, Permissions } from '../types';
import { Button, Modal, Input, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { clearCache } from '../utils/cache';
```
**Additions needed:** `CredentialeContModal` from `./ui` (already exported, see below), `useRoleAssignment` from `../hooks/useRoleAssignment`, `UserPlusIcon`/`BuildingOfficeIcon` from `./icons`, and `Rol`/`Sportiv`-adjacent types as needed for `useRoleAssignment`'s signature (it expects `allRoles: Rol[]` and `currentUser: User` — both must be threaded into `CluburiManagement` props, likely via `usePermissions`/`useData` context already available at the call site — check how `UserManagement.tsx` sources `allRoles`).

**Current form structure** (`components/CluburiManagement.tsx` lines 19-61, `ClubFormModal`):
```tsx
const ClubFormModal: React.FC<ClubFormModalProps> = ({ isOpen, onClose, onSave, clubToEdit }) => {
    const [formData, setFormData] = useState({ nume: '', cif: '', oras: '' });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                nume: clubToEdit?.nume || '',
                cif: clubToEdit?.cif || '',
                oras: clubToEdit?.oras || '',
            });
        }
    }, [isOpen, clubToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const dataToSave = { id: clubToEdit?.id, ...formData };
        await onSave(dataToSave);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={clubToEdit ? "Editează Club" : "Adaugă Club Nou"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nume Club" name="nume" value={formData.nume} onChange={handleChange} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="CIF / CUI (Opțional)" name="cif" value={formData.cif} onChange={handleChange} />
                    <Input label="Oraș (Opțional)" name="oras" value={formData.oras} onChange={handleChange} />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};
```
Per UI-SPEC: add `formData` fields `numeAdmin`, `prenumeAdmin`, `emailAdmin` (only used/rendered when `!clubToEdit`), a section header with `BuildingOfficeIcon`/`UserPlusIcon` (already exported from `./icons` per UI-SPEC — verify at implementation time), helper text below the admin section, and change submit button label conditionally (`"Creează Club și Admin"` vs `"Salvează"` per Copywriting Contract). `onSave` signature must be extended to pass the admin fields through (e.g. `dataToSave = { id: clubToEdit?.id, ...formData }` already spreads all fields generically, so no signature change needed if `handleSave` reads `clubData.numeAdmin` etc.).

**Sequential submit pattern to copy** — model on `CreateAccountModal.tsx` lines 35-55 (`handleSaveParola`): build a form → call one hook function → on success show `CredentialeContModal`, on failure `showError`. Adapt this by chaining club-insert (existing `handleSave` logic) then `createAccountAndAssignRole` (from `useRoleAssignment`) for the admin account, and only opening `CredentialeContModal` after BOTH succeed.

**`handleSave` — current club-insert pattern to extend** (`components/CluburiManagement.tsx` lines 79-146, particularly the `else` "create" branch lines 111-134):
```tsx
} else {
    const { id, ...insertData } = clubData;
    if (insertData.cif === '') insertData.cif = null as any;
    if (insertData.cif) {
        const { data: existing } = await supabase
            .from('cluburi')
            .select('id')
            .eq('cif', insertData.cif)
            .maybeSingle();
        if (existing) {
            showError("CIF Duplicat", "Există deja un club înregistrat cu acest CIF/CUI. Verificați datele sau lăsați câmpul gol.");
            return;
        }
    }
    const { data, error } = await supabase.from('cluburi').insert([insertData]).select().single();
    if (error) throw error;
    if (data) {
        clearCache('cache_clubs'); // pattern to preserve
        setClubs(prev => [...prev, data]);
        showSuccess("Succes", "Club adăugat.");
    }
}
```
**Extension point:** after `clearCache('cache_clubs')` + `setClubs(...)` succeeds for a NEW club (not edit), call `createAccountAndAssignRole(emailAdmin, generatedPassword, { nume: numeAdmin, prenume: prenumeAdmin, club_id: data.id }, [adminClubRoleObj])` from `useRoleAssignment`. On failure (D-07), do NOT roll back the club — surface the inline retry banner instead of the generic toast-only `showError` used elsewhere in this function. Track `data.id` (newly created club) in local state so the retry button can re-call `createAccountAndAssignRole` with the same `club_id` without re-inserting the club.

**Error handling pattern already in file** (lines 135-145) — keep as-is for club-insert errors (RLS / CIF duplicate / generic); do not reuse this catch block for the admin-creation step, which needs the dedicated D-07 inline banner instead of a toast.

---

### Reused verbatim: `hooks/useRoleAssignment.ts` — `createAccountAndAssignRole`

**Full function** (`hooks/useRoleAssignment.ts` lines 30-83):
```ts
const createAccountAndAssignRole = async (email: string, parola: string, sportivData: Partial<Sportiv>, rolesToAssign: Rol[]): Promise<{ success: boolean; sportiv?: Sportiv; error?: string; generatedPassword?: string }> => {
    setLoading(true);
    try {
        const response = await fetch('/api/creare-cont', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: parola,
                userData: {
                    nume: sportivData.nume,
                    prenume: sportivData.prenume,
                    username: sportivData.username || email.split('@')[0],
                    club_id: sportivData.club_id || PHI_HAU_IASI_CLUB_ID,
                    data_nasterii: sportivData.data_nasterii || '1900-01-01',
                    status: sportivData.status || 'Activ',
                    data_inscrierii: sportivData.data_inscrierii || new Date().toISOString().split('T')[0],
                    gen: sportivData.gen || 'Masculin',
                    cnp: sportivData.cnp,
                    telefon: sportivData.telefon,
                    adresa: sportivData.adresa,
                    grad_actual_id: sportivData.grad_actual_id,
                    grupa_id: sportivData.grupa_id
                },
                roles: rolesToAssign.map(r => r.nume)
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Eroare la crearea contului.");
        if (!result.userId) throw new Error("Contul a fost creat dar server-ul nu a returnat un userId valid. Reîncărcați pagina.");
        if (!result.sportiv) throw new Error("Contul a fost creat dar profilul sportivului nu a putut fi recuperat de server. Reîncărcați pagina.");
        return { success: true, sportiv: { ...result.sportiv, roluri: rolesToAssign }, generatedPassword: parola };
    } catch (err: any) {
        console.error('Account Creation Error:', err);
        return { success: false, error: err.message || "A apărut o eroare neașteptată." };
    } finally {
        setLoading(false);
    }
};
```
**Important caveat for this phase:** `createAccountAndAssignRole` hard-codes fallback `PHI_HAU_IASI_CLUB_ID` when `sportivData.club_id` is falsy — this is fine since the wizard will always pass the freshly-created club's `id` explicitly, but confirm at plan time that no accidental falsy `club_id` slips through (anti-pattern per `CLAUDE.md` — hardcoded club IDs). Also note the function's post-condition expects `result.sportiv` (an entry in the `sportivi` table) — `api/creare-cont.ts` always looks up `sportivi` after RPC (see below), so this holds even for an `ADMIN_CLUB`-only account as long as `refactor_create_user_account` creates a `sportivi` row for every account (verify — if the RPC does NOT create a `sportivi` row for pure ADMIN_CLUB accounts without SPORTIV role, `result.sportiv` may be null and this check would incorrectly fail; planner should verify RPC behavior or route around this check).

**Do not call `updateRoles`** — that's for editing existing users' roles, not relevant here.

---

### Reused verbatim, no modification: `api/creare-cont.ts`

**Full endpoint** (`api/creare-cont.ts` lines 1-101) — accepts `{ email, password, userData, roles }`, creates `auth.users` entry (or resolves existing), then calls RPC `refactor_create_user_account(p_nume, p_prenume, p_email, p_username, p_club_id, p_roles, p_user_id, p_additional_data)`. Already handles "email already registered" gracefully (lines 36-60). No changes needed — `roles: ['ADMIN_CLUB']` and `userData.club_id = <newly created club id>` is all this phase needs to pass.

---

### Reused verbatim, no modification: `components/ui.tsx` → `CredentialeContModal`

**Props** (`components/ui.tsx` lines 480-486):
```tsx
interface CredentialeContModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  parola: string;
  numeSportiv?: string;
}
```
**Usage pattern to copy** (`components/UserProfile/CreateAccountModal.tsx` lines 83-93):
```tsx
if (credentiale) {
    return (
        <CredentialeContModal
            isOpen={true}
            onClose={() => { setCredentiale(null); onClose(); }}
            email={credentiale.email}
            parola={credentiale.parola}
            numeSportiv={`${sportiv.prenume} ${sportiv.nume}`}
        />
    );
}
```
For this phase, per UI-SPEC: `numeSportiv={`${prenumeAdmin} ${numeAdmin} — Admin ${numeClub}`}`. The generic label reads correctly unmodified — do NOT rename the prop, despite it being semantically "sportiv"-named; this is an accepted verbatim reuse (see UI-SPEC line 26, 116).

---

## Shared Patterns

### Username derivation (silent, no UI field)
**Source:** `hooks/useRoleAssignment.ts` line 45 — `username: sportivData.username || email.split('@')[0]` (simple split, no sanitize needed since this is a real typed email, not the synthetic `@frqkd.ro` domain used by magic-link).
**Apply to:** admin account creation call in `ClubFormModal` — derive `username = emailAdmin.split('@')[0]` before calling `createAccountAndAssignRole` (or just omit and let the hook derive it, since the hook already does this fallback).
**Contrast:** `api/genereaza-magic-link.ts` lines 4, 49-54 uses a heavier sanitize (`toLowerCase().normalize("NFD")...replace(/[^a-z0-9]/g,'')`) because it constructs a synthetic `@frqkd.ro` email from name parts. That pattern is NOT needed here since CONTEXT.md D-06 explicitly rejects the magic-link flow — email is user-typed and real.

### Password generation
**Source:** `components/UserProfile/CreateAccountModal.tsx` line 31 — `const defaultPassword = \`${nume}.1234!\`;` is the only existing "default password" pattern in the codebase, but it's deterministic/guessable (not suitable for D-05's "generated automatically" requirement, which implies unpredictability since it's shown once and must be secure).
**No dedicated secure-random-password utility currently exists in the codebase** — planner should introduce a small `generateParola()` utility (e.g. in a new or existing `utils/` file) producing a random string satisfying whatever Supabase Auth password policy is in effect. No existing analog to copy verbatim; treat this as new utility code, not a pattern.

### Error handling — toast vs inline banner
**Source (toast):** `components/CluburiManagement.tsx` lines 135-145 — `showError()` calls from `useError()` context, used for club-insert failures.
**Source (inline banner, closest analog):** none exists in current codebase for a "step 1 succeeded, step 2 failed, retry step 2" UI — this is genuinely new UI per D-07. Base the visual style on `CredentialeContModal`'s existing amber caution banner (`components/ui.tsx` lines 531-534: `text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2`) but swap to `var(--t-status-danger)` per UI-SPEC Color section, with an `AlertCircleIcon` (already imported in codebase — check `./icons` exports) and a retry `Button`.
**Apply to:** the new D-07 error sub-state inside `ClubFormModal`.

### Cache invalidation after club insert
**Source:** `components/CluburiManagement.tsx` line 130 — `clearCache('cache_clubs');`
**Apply to:** preserve exactly as-is; this must still run immediately after club insert succeeds, before attempting admin-account creation (so the club appears in lists even if the admin step fails and user navigates away mid-retry).

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| Secure random password generator | utility | transform | No existing "generate random secure password" utility in codebase — only a deterministic placeholder pattern (`${nume}.1234!}`) exists, which is unsuitable for this phase's security requirement. Planner must design this as new code. |
| D-07 inline retry-on-partial-failure banner UI | component (inline UI state) | request-response, retry | No existing "step 2 of 2 failed, keep step 1, retry step 2 only" UI pattern anywhere in the codebase; nearest visual/stylistic analog is the amber caution banner in `CredentialeContModal`, adapted to danger-tinted colors per UI-SPEC. |

## Metadata

**Analog search scope:** `components/CluburiManagement.tsx`, `components/UserProfile/CreateAccountModal.tsx`, `hooks/useRoleAssignment.ts`, `api/creare-cont.ts`, `api/genereaza-magic-link.ts`, `components/ui.tsx` (`CredentialeContModal`)
**Files scanned:** 6 read in full/targeted sections, plus grep sweep for password-generation utilities across repo (none found)
**Pattern extraction date:** 2026-08-31
