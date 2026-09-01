# Dashboard Newsfeed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home dashboard for ADMIN_CLUB/INSTRUCTOR arată ce urmează (examene, stagii, competiții) cu countdown + link direct, plus anunțuri manuale de la federație, vizibile pe dashboard-ul cluburilor țintă.

**Architecture:** Un widget nou (`NewsfeedWidget`) montat în `AdminMasterMap.tsx` — acesta e dashboard-ul real de start pentru ADMIN_CLUB/INSTRUCTOR (case `'dashboard'`/`'my-portal'` din `AppRouter.tsx:150-166`), NU `UnifiedDashboard.tsx` cum presupunea spec-ul inițial (fișier nefolosit nicăieri în app — verificat prin grep, zero randări). Widget-ul citește 3 surse existente (`sesiuni_examene`, `evenimente` cu `tip='Stagiu'`, `competitii`) + un tabel nou `anunturi_federatie` (CRUD doar SUPER_ADMIN_FEDERATIE, pagină nouă `AnunturiFederatie.tsx` legată din secțiunea "Administrare Federație" a aceluiași `AdminMasterMap.tsx`).

**Tech Stack:** React 18 + TypeScript, `@tanstack/react-query` (`useQuery`, staleTime 5min — pattern din `hooks/useGrupeIstoric.ts`), Supabase (RLS via helperele `has_access_to_club(p_club_id)` / `is_super_admin()` din `sql/migrations/fix_rls_context_aware_role_helpers.sql`), `components/ui.tsx` (Card, Modal, Input, Button, ConfirmDeleteModal).

**Spec:** `docs/superpowers/specs/2026-09-01-dashboard-newsfeed-acces-platit-design.md` (Secțiunea A — Secțiunea B rămâne neimplementată, doar spec).

## Global Constraints

- Fără librării externe noi — doar `components/ui.tsx` + `@tanstack/react-query` deja instalat.
- Fără URL routing — navigare prin `onNavigate(view: View)` / `setActiveView`.
- RLS e stratul dur de securitate — orice filtrare pe club se pune și în policy, nu doar în JS.
- Niciun test framework unitar în repo (`package.json` are doar `tsc --noEmit` + Playwright e2e) — verificarea per task e `npx tsc --noEmit` (trebuie curat) + verificare manuală/browser descrisă la fiecare task, nu teste unitare inventate.
- Corecție față de spec (documentată, aprobată implicit prin acest plan): sursele "evenimente" nu sunt un singur query, ci 3 — `sesiuni_examene`, `evenimente` (`tip='Stagiu'` doar — rândurile `tip='Competitie'` din `evenimente` sunt legacy, suprapuse de tabela `competitii` reală, vezi `components/Competitii/index.tsx:685-693`), `competitii`. Tabela `competitii` NU se filtrează pe `club_id` (evenimente create de federație, vizibile tuturor cluburilor pentru înscriere — vezi `components/Competitii/index.tsx:149,214` unde `club_id` apare doar pe `inscrieri_competitie`/`echipe_competitie`, nu ca "owner" pe `competitii`).

---

### Task 1: Tabel `anunturi_federatie` + RLS

**Files:**
- Create: `sql/migrations/add_anunturi_federatie.sql`

**Interfaces:**
- Produces: tabel `public.anunturi_federatie(id uuid pk, titlu text, continut text, club_id_target uuid null, creat_de uuid, created_at timestamptz, expira_la timestamptz null)`, folosit de Task 3 (`newsfeedService.ts`) și Task 6 (`AnunturiFederatie.tsx`).

- [ ] **Step 1: Scrie migrarea SQL**

```sql
-- ============================================================
-- Anunțuri Federație — dashboard newsfeed
-- Creat: 2026-09-01
-- Scop: Anunțuri manuale SUPER_ADMIN_FEDERATIE afișate pe
--   dashboard-ul cluburilor țintă (sau tuturor, dacă club_id_target
--   e NULL). Vezi docs/superpowers/specs/2026-09-01-dashboard-
--   newsfeed-acces-platit-design.md secțiunea A.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anunturi_federatie (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titlu           TEXT NOT NULL,
    continut        TEXT NOT NULL,
    club_id_target  UUID NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    creat_de        UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_la       TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS anunturi_federatie_club_target_idx ON public.anunturi_federatie(club_id_target);
CREATE INDEX IF NOT EXISTS anunturi_federatie_created_idx ON public.anunturi_federatie(created_at DESC);

-- ============================================================
-- RLS — folosește helperele context-aware existente
-- (sql/migrations/fix_rls_context_aware_role_helpers.sql):
--   is_super_admin()          -> rol activ SUPER_ADMIN_FEDERATIE
--   has_access_to_club(uuid)  -> rol activ are acces la clubul dat
-- ============================================================

ALTER TABLE public.anunturi_federatie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anunturi_federatie_select" ON public.anunturi_federatie;
CREATE POLICY "anunturi_federatie_select"
    ON public.anunturi_federatie FOR SELECT TO authenticated
    USING (
        club_id_target IS NULL
        OR public.has_access_to_club(club_id_target)
    );

DROP POLICY IF EXISTS "anunturi_federatie_write" ON public.anunturi_federatie;
CREATE POLICY "anunturi_federatie_write"
    ON public.anunturi_federatie FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DO $$
BEGIN
    RAISE NOTICE 'add_anunturi_federatie applied successfully.';
END $$;
```

- [ ] **Step 2: Aplică migrarea live pe Supabase**

Rulează SQL-ul de mai sus în SQL Editor Supabase (proiectul din `.env` `VITE_SUPABASE_URL`). Nu există CLI de migrări în acest repo — aplicarea e manuală, ca restul fișierelor din `sql/migrations/`.

- [ ] **Step 3: Verifică tabelul + policy-urile există**

```bash
source .env && curl -s "${VITE_SUPABASE_URL}/rest/v1/anunturi_federatie?select=id&limit=1" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}"
```

Expected: `[]` (tabel gol, fără eroare 404/42P01) când rulat neautentificat — cu RLS activ, un query fără sesiune validă întoarce fie `[]`, fie eroare de auth, niciodată eroare "relation does not exist".

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/add_anunturi_federatie.sql
git commit -m "feat(newsfeed): tabel anunturi_federatie + RLS club-scoped"
```

---

### Task 2: Tipuri noi în `types.ts`

**Files:**
- Modify: `types.ts`

**Interfaces:**
- Consumes: nimic (doar definiții).
- Produces: `AnuntFederatie`, `NewsfeedItemTip`, `NewsfeedItem` — folosite de Task 3, 4, 5, 6. `View` extins cu `'anunturi-federatie'` — folosit de Task 6.

- [ ] **Step 1: Adaugă tipurile lângă `Eveniment` (după linia 415, imediat sub interfața `Eveniment`)**

```typescript
export interface AnuntFederatie {
  id: string;
  titlu: string;
  continut: string;
  club_id_target: string | null;
  creat_de: string;
  created_at: string;
  expira_la: string | null;
}

export type NewsfeedItemTip = 'examen' | 'stagiu' | 'competitie';

export interface NewsfeedItem {
  id: string;
  tip: NewsfeedItemTip;
  titlu: string;
  data: string; // ISO date (yyyy-mm-dd sau timestamptz) — dată eveniment, folosită pt countdown
  view: View;
}
```

- [ ] **Step 2: Adaugă `'anunturi-federatie'` în union-ul `View` (linia 580)**

Găsește linia care conține `export type View = 'dashboard' | ...` și adaugă `| 'anunturi-federatie'` chiar înainte de `'facturi-fara-prezenta'` (ultimul element).

- [ ] **Step 3: Verifică tipurile compilează**

```bash
npx tsc --noEmit
```

Expected: fără erori noi față de starea curentă (pot exista erori preexistente în repo — verifică doar că nu apar erori în `types.ts`).

- [ ] **Step 4: Commit**

```bash
git add types.ts
git commit -m "feat(newsfeed): tipuri AnuntFederatie, NewsfeedItem + View 'anunturi-federatie'"
```

---

### Task 3: `services/newsfeedService.ts`

**Files:**
- Create: `services/newsfeedService.ts`

**Interfaces:**
- Consumes: `NewsfeedItem`, `AnuntFederatie` din `types.ts` (Task 2); `supabase` din `../supabaseClient`.
- Produces: `fetchUpcomingExamene(clubId: string)`, `fetchUpcomingStagii(clubId: string)`, `fetchUpcomingCompetitii()`, `fetchAnunturiActive()` — toate `async (...) => Promise<{ data: T[]; error: Error | null }>`, consumate de Task 4 (`useNewsfeed.ts`).

- [ ] **Step 1: Scrie serviciul**

```typescript
import { supabase } from '../supabaseClient';
import type { NewsfeedItem, AnuntFederatie } from '../types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export async function fetchUpcomingExamene(clubId: string): Promise<{ data: NewsfeedItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('sesiuni_examene')
    .select('id, data, nume, status, club_id')
    .eq('club_id', clubId)
    .gte('data', todayISO())
    .neq('status', 'Finalizat')
    .order('data', { ascending: true });

  if (error) return { data: [], error };
  const items: NewsfeedItem[] = (data || []).map(row => ({
    id: row.id,
    tip: 'examen',
    titlu: `Sesiune examen ${row.nume}`,
    data: row.data,
    view: 'examene',
  }));
  return { data: items, error: null };
}

export async function fetchUpcomingStagii(clubId: string): Promise<{ data: NewsfeedItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('evenimente')
    .select('id, denumire, data, club_id, vizibilitate_globala, tip')
    .eq('tip', 'Stagiu')
    .gte('data', todayISO())
    .or(`club_id.eq.${clubId},vizibilitate_globala.eq.true`)
    .order('data', { ascending: true });

  if (error) return { data: [], error };
  const items: NewsfeedItem[] = (data || []).map(row => ({
    id: row.id,
    tip: 'stagiu',
    titlu: row.denumire,
    data: row.data,
    view: 'activitati-nationale',
  }));
  return { data: items, error: null };
}

export async function fetchUpcomingCompetitii(): Promise<{ data: NewsfeedItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitii')
    .select('id, denumire, data_inceput, status')
    .gte('data_inceput', todayISO())
    .in('status', ['draft', 'inscrieri_deschise', 'inscrieri_inchise'])
    .order('data_inceput', { ascending: true });

  if (error) return { data: [], error };
  const items: NewsfeedItem[] = (data || []).map(row => ({
    id: row.id,
    tip: 'competitie',
    titlu: row.denumire,
    data: row.data_inceput,
    view: 'competitii',
  }));
  return { data: items, error: null };
}

export async function fetchAnunturiActive(): Promise<{ data: AnuntFederatie[]; error: Error | null }> {
  const nowISO = new Date().toISOString();
  const { data, error } = await supabase
    .from('anunturi_federatie')
    .select('*')
    .or(`expira_la.is.null,expira_la.gte.${nowISO}`)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error };
  return { data: (data || []) as AnuntFederatie[], error: null };
}
```

- [ ] **Step 2: Verifică compilarea**

```bash
npx tsc --noEmit
```

Expected: fără erori în `services/newsfeedService.ts`.

- [ ] **Step 3: Commit**

```bash
git add services/newsfeedService.ts
git commit -m "feat(newsfeed): servicii fetch examene/stagii/competitii/anunturi viitoare"
```

---

### Task 4: `hooks/useNewsfeed.ts`

**Files:**
- Create: `hooks/useNewsfeed.ts`

**Interfaces:**
- Consumes: cele 4 funcții din `services/newsfeedService.ts` (Task 3); `useQuery` din `@tanstack/react-query`.
- Produces: `useNewsfeed(clubId: string | null | undefined)` → `{ items: NewsfeedItem[]; anunturi: AnuntFederatie[]; isLoading: boolean }`, consumat de Task 5 (`NewsfeedWidget.tsx`).

- [ ] **Step 1: Scrie hook-ul**

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchUpcomingExamene, fetchUpcomingStagii, fetchUpcomingCompetitii, fetchAnunturiActive } from '../services/newsfeedService';
import type { NewsfeedItem, AnuntFederatie } from '../types';

interface NewsfeedData {
  items: NewsfeedItem[];
  anunturi: AnuntFederatie[];
}

export function useNewsfeed(clubId: string | null | undefined) {
  return useQuery<NewsfeedData>({
    queryKey: ['newsfeed', clubId],
    queryFn: async () => {
      const [examene, stagii, competitii, anunturi] = await Promise.allSettled([
        clubId ? fetchUpcomingExamene(clubId) : Promise.resolve({ data: [], error: null }),
        clubId ? fetchUpcomingStagii(clubId) : Promise.resolve({ data: [], error: null }),
        fetchUpcomingCompetitii(),
        fetchAnunturiActive(),
      ]);

      const items: NewsfeedItem[] = [
        ...(examene.status === 'fulfilled' ? examene.value.data : []),
        ...(stagii.status === 'fulfilled' ? stagii.value.data : []),
        ...(competitii.status === 'fulfilled' ? competitii.value.data : []),
      ].sort((a, b) => a.data.localeCompare(b.data));

      const anunturiData = anunturi.status === 'fulfilled' ? anunturi.value.data : [];

      return { items, anunturi: anunturiData };
    },
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Verifică compilarea**

```bash
npx tsc --noEmit
```

Expected: fără erori în `hooks/useNewsfeed.ts`.

- [ ] **Step 3: Commit**

```bash
git add hooks/useNewsfeed.ts
git commit -m "feat(newsfeed): hook useNewsfeed cu Promise.allSettled pe cele 3 surse + anunturi"
```

---

### Task 5: `NewsfeedWidget.tsx` + integrare în `AdminMasterMap.tsx`

**Files:**
- Create: `components/NewsfeedWidget.tsx`
- Modify: `components/AdminMasterMap.tsx`

**Interfaces:**
- Consumes: `useNewsfeed` (Task 4), `NewsfeedItem`/`AnuntFederatie` (Task 2), `Card` din `./ui`, `BellIcon`/`CalendarDaysIcon`/`TrophyIcon`/`ChevronRightIcon` din `./icons`.
- Produces: `NewsfeedWidget` — `React.FC<{ clubId: string | null | undefined; onNavigate: (view: View) => void }>`.

- [ ] **Step 1: Scrie `NewsfeedWidget.tsx`**

```typescript
import React from 'react';
import { View } from '../types';
import { Card } from './ui';
import { CalendarDaysIcon, TrophyIcon, BookMarkedIcon, BellIcon, ChevronRightIcon } from './icons';
import { useNewsfeed } from '../hooks/useNewsfeed';

interface NewsfeedWidgetProps {
  clubId: string | null | undefined;
  onNavigate: (view: View) => void;
}

const TIP_ICON: Record<string, React.ElementType> = {
  examen: TrophyIcon,
  stagiu: BookMarkedIcon,
  competitie: TrophyIcon,
};

function countdownLabel(dataISO: string): string {
  const azi = new Date(); azi.setHours(0, 0, 0, 0);
  const target = new Date(dataISO); target.setHours(0, 0, 0, 0);
  const zile = Math.round((target.getTime() - azi.getTime()) / 86400000);
  if (zile <= 0) return 'astăzi';
  if (zile === 1) return 'mâine';
  return `peste ${zile} zile`;
}

export const NewsfeedWidget: React.FC<NewsfeedWidgetProps> = ({ clubId, onNavigate }) => {
  const { data, isLoading } = useNewsfeed(clubId);
  const items = data?.items ?? [];
  const anunturi = data?.anunturi ?? [];

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-slate-500 text-sm italic">Se încarcă noutățile...</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <CalendarDaysIcon className="w-5 h-5 text-amber-400" /> Ce urmează
      </h3>

      {anunturi.length > 0 && (
        <div className="space-y-2">
          {anunturi.map(a => (
            <div key={a.id} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <BellIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-200">{a.titlu}</p>
                <p className="text-xs text-slate-300 mt-0.5">{a.continut}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm italic py-2 text-center">Niciun eveniment programat.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const Icon = TIP_ICON[item.tip] || CalendarDaysIcon;
            return (
              <button
                key={`${item.tip}-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="w-full flex items-center justify-between gap-3 bg-slate-800/50 hover:bg-slate-700/60 rounded-lg p-3 border border-slate-700/30 hover:border-amber-400/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{item.titlu}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-semibold text-amber-400">{countdownLabel(item.data)}</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 2: Integrează widget-ul în `AdminMasterMap.tsx`**

În `components/AdminMasterMap.tsx`, adaugă importul:

```typescript
import { NewsfeedWidget } from './NewsfeedWidget';
```

Apoi, imediat după blocul "Prezență Rapidă" (după `</div>` de la linia 166, înainte de `{/* Acordeon module */}` linia 168), inserează:

```typescript
            <NewsfeedWidget clubId={activeRoleContext?.club_id ?? currentUser?.club_id ?? null} onNavigate={onNavigate} />

```

(`activeRoleContext` e deja disponibil în componentă din `useDataProvider()` linia 84.)

- [ ] **Step 3: Verifică compilarea**

```bash
npx tsc --noEmit
```

Expected: fără erori în `NewsfeedWidget.tsx` sau `AdminMasterMap.tsx`.

- [ ] **Step 4: Verificare manuală în browser**

Pornește `npm run dev`, login ca ADMIN_CLUB sau INSTRUCTOR, verifică pe dashboard (`case 'dashboard'`):
- Widget "Ce urmează" apare deasupra acordeonului de module.
- Dacă există examene/stagii/competiții viitoare pentru club, apar în listă cu countdown corect ("astăzi"/"mâine"/"peste N zile") și click navighează la view-ul corect.
- Club fără evenimente viitoare → "Niciun eveniment programat."

- [ ] **Step 5: Commit**

```bash
git add components/NewsfeedWidget.tsx components/AdminMasterMap.tsx
git commit -m "feat(newsfeed): NewsfeedWidget cu countdown + integrare in AdminMasterMap"
```

---

### Task 6: CRUD `AnunturiFederatie.tsx` (doar SUPER_ADMIN_FEDERATIE)

**Files:**
- Create: `components/AnunturiFederatie.tsx`
- Modify: `components/LazyComponents.tsx`
- Modify: `components/AppRouter.tsx`
- Modify: `components/AdminMasterMap.tsx`

**Interfaces:**
- Consumes: `AnuntFederatie` (Task 2), `Club` din `../types`, `supabase` din `../supabaseClient`, `useError` din `./ErrorProvider`, `Card`/`Modal`/`Input`/`Button`/`Select` din `./ui`, `ConfirmDeleteModal` din `./ConfirmDeleteModal`, `PlusIcon`/`EditIcon`/`TrashIcon`/`BellIcon` din `./icons`.
- Produces: `AnunturiFederatie` — `React.FC<{ onBack: () => void; clubs: Club[]; currentUser: User }>`.

- [ ] **Step 1: Scrie `components/AnunturiFederatie.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { AnuntFederatie, Club, User } from '../types';
import { Card, Modal, Input, Select, Button } from './ui';
import { PlusIcon, EditIcon, TrashIcon, BellIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AnuntFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { titlu: string; continut: string; club_id_target: string | null; expira_la: string | null }) => Promise<boolean>;
  clubs: Club[];
  anuntToEdit: AnuntFederatie | null;
}

const AnuntFormModal: React.FC<AnuntFormModalProps> = ({ isOpen, onClose, onSave, clubs, anuntToEdit }) => {
  const [titlu, setTitlu] = useState('');
  const [continut, setContinut] = useState('');
  const [clubIdTarget, setClubIdTarget] = useState<string>('');
  const [expiraLa, setExpiraLa] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitlu(anuntToEdit?.titlu || '');
      setContinut(anuntToEdit?.continut || '');
      setClubIdTarget(anuntToEdit?.club_id_target || '');
      setExpiraLa(anuntToEdit?.expira_la ? anuntToEdit.expira_la.slice(0, 10) : '');
    }
  }, [isOpen, anuntToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const inchide = await onSave({
      titlu: titlu.trim(),
      continut: continut.trim(),
      club_id_target: clubIdTarget || null,
      expira_la: expiraLa ? new Date(expiraLa).toISOString() : null,
    });
    setLoading(false);
    if (inchide) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={anuntToEdit ? 'Editează Anunț' : 'Anunț Nou'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Titlu" value={titlu} onChange={e => setTitlu(e.target.value)} required />
        <div className="w-full">
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Conținut</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white resize-none"
            rows={4}
            value={continut}
            onChange={e => setContinut(e.target.value)}
            required
          />
        </div>
        <Select label="Club țintă (gol = toate cluburile)" value={clubIdTarget} onChange={e => setClubIdTarget(e.target.value)}>
          <option value="">Toate cluburile</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
        </Select>
        <Input label="Expiră la (opțional)" type="date" value={expiraLa} onChange={e => setExpiraLa(e.target.value)} />
        <div className="flex justify-end pt-2 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
        </div>
      </form>
    </Modal>
  );
};

interface AnunturiFederatieProps {
  onBack: () => void;
  clubs: Club[];
  currentUser: User;
}

export const AnunturiFederatie: React.FC<AnunturiFederatieProps> = ({ clubs, currentUser }) => {
  const [anunturi, setAnunturi] = useState<AnuntFederatie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anuntToEdit, setAnuntToEdit] = useState<AnuntFederatie | null>(null);
  const [anuntToDelete, setAnuntToDelete] = useState<AnuntFederatie | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError, showSuccess } = useError();

  const fetchAnunturi = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('anunturi_federatie').select('*').order('created_at', { ascending: false });
    if (error) showError('Eroare', error.message);
    else setAnunturi((data || []) as AnuntFederatie[]);
    setLoading(false);
  };

  useEffect(() => { fetchAnunturi(); }, []);

  const handleSave = async (formData: { titlu: string; continut: string; club_id_target: string | null; expira_la: string | null }): Promise<boolean> => {
    try {
      if (anuntToEdit) {
        const { data, error } = await supabase.from('anunturi_federatie').update(formData).eq('id', anuntToEdit.id).select().single();
        if (error) throw error;
        if (data) setAnunturi(prev => prev.map(a => a.id === anuntToEdit.id ? data as AnuntFederatie : a));
      } else {
        const { data, error } = await supabase.from('anunturi_federatie').insert([{ ...formData, creat_de: currentUser.id }]).select().single();
        if (error) throw error;
        if (data) setAnunturi(prev => [data as AnuntFederatie, ...prev]);
      }
      showSuccess('Succes', 'Anunțul a fost salvat.');
      return true;
    } catch (err: any) {
      showError('Eroare la salvare', err.message);
      return false;
    }
  };

  const confirmDelete = async (id: string) => {
    setIsDeleting(true);
    const { error } = await supabase.from('anunturi_federatie').delete().eq('id', id);
    if (error) showError('Eroare la ștergere', error.message);
    else {
      setAnunturi(prev => prev.filter(a => a.id !== id));
      showSuccess('Succes', 'Anunțul a fost șters.');
    }
    setIsDeleting(false);
    setAnuntToDelete(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-2">
          <BellIcon className="w-6 h-6 text-amber-400" /> Anunțuri Federație
        </h1>
        <Button onClick={() => { setAnuntToEdit(null); setIsModalOpen(true); }} variant="info">
          <PlusIcon className="w-5 h-5 mr-2" /> Anunț Nou
        </Button>
      </div>

      {loading ? (
        <Card className="text-center p-8"><p className="text-slate-400 italic">Se încarcă...</p></Card>
      ) : anunturi.length === 0 ? (
        <Card className="text-center p-8"><p className="text-slate-400 italic">Niciun anunț publicat încă.</p></Card>
      ) : (
        <div className="space-y-3">
          {anunturi.map(a => {
            const club = a.club_id_target ? clubs.find(c => c.id === a.club_id_target) : null;
            const expirat = a.expira_la ? new Date(a.expira_la) < new Date() : false;
            return (
              <Card key={a.id} className={`p-4 ${expirat ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{a.titlu}</p>
                    <p className="text-sm text-slate-300 mt-1">{a.continut}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {club ? `Club: ${club.nume}` : 'Toate cluburile'}
                      {a.expira_la && ` · Expiră: ${new Date(a.expira_la).toLocaleDateString('ro-RO')}`}
                      {expirat && ' · EXPIRAT'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="primary" onClick={() => { setAnuntToEdit(a); setIsModalOpen(true); }}><EditIcon /></Button>
                    <Button size="sm" variant="danger" onClick={() => setAnuntToDelete(a)}><TrashIcon /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AnuntFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} clubs={clubs} anuntToEdit={anuntToEdit} />
      <ConfirmDeleteModal isOpen={!!anuntToDelete} onClose={() => setAnuntToDelete(null)} onConfirm={() => { if (anuntToDelete) confirmDelete(anuntToDelete.id); }} tableName="Anunț" isLoading={isDeleting} />
    </div>
  );
};
```

- [ ] **Step 2: Adaugă export lazy în `components/LazyComponents.tsx`**

Lângă `CluburiManagement` (linia 39), adaugă:

```typescript
export const AnunturiFederatie = lazy(() => import('./AnunturiFederatie').then(m => ({ default: m.AnunturiFederatie })));
```

- [ ] **Step 3: Adaugă case în `components/AppRouter.tsx`**

Lângă `case 'cluburi':` (linia ~240), adaugă:

```typescript
                            case 'anunturi-federatie':
                                return renderProtected(<Lazy.AnunturiFederatie onBack={handleBackToDashboard} clubs={clubs} currentUser={currentUser!} />, isFederationAdmin);
```

- [ ] **Step 4: Adaugă link în secțiunea "Administrare Federație" din `AdminMasterMap.tsx`**

În blocul `permissions.isFederationAdmin && (<AccordionItem id="superadmin" ...>` (linia 232-242), adaugă un `ItemCard` nou:

```typescript
                            <ItemCard title="Anunțuri Federație" view="anunturi-federatie" icon={BellIcon} onNavigate={nav} isFavorite={favorites.includes('anunturi-federatie')} onToggleFavorite={toggleFavorite} />
```

Și adaugă `BellIcon` la importul din `./icons` de la începutul fișierului (linia 4-29).

Adaugă și `'anunturi-federatie': 'Anunțuri Federație'` în `labelMap` (lângă `'inlantuiri-admin'`, linia 109).

- [ ] **Step 5: Verifică compilarea**

```bash
npx tsc --noEmit
```

Expected: fără erori în cele 4 fișiere atinse.

- [ ] **Step 6: Verificare manuală în browser**

Login ca SUPER_ADMIN_FEDERATIE:
- Dashboard → secțiunea "Administrare Federație" → "Anunțuri Federație" e vizibilă și navighează corect.
- Creează un anunț cu club țintă = un club existent → salvează cu succes, apare în listă.
- Login (sau schimbă context) ca ADMIN_CLUB al clubului țintă → anunțul apare pe `NewsfeedWidget` de pe dashboard-ul lui.
- Login ca ADMIN_CLUB al altui club → anunțul NU apare.
- Editează anunțul să pună `club_id_target` gol (toate cluburile) → apare la ambele cluburi.
- Șterge anunțul → dispare din listă și din widget la refresh.

- [ ] **Step 7: Commit**

```bash
git add components/AnunturiFederatie.tsx components/LazyComponents.tsx components/AppRouter.tsx components/AdminMasterMap.tsx
git commit -m "feat(newsfeed): CRUD AnunturiFederatie (SUPER_ADMIN_FEDERATIE) + link in Administrare Federatie"
```

---

## Self-Review Notes

- **Spec coverage:** tabel `anunturi_federatie` + RLS (Task 1) ✓; hook `useNewsfeed` cu `Promise.allSettled`, staleTime 5min (Task 4) ✓; `NewsfeedWidget` cu countdown + link (Task 5) ✓; CRUD anunțuri doar SUPER_ADMIN_FEDERATIE (Task 6) ✓; integrare pe dashboard real (Task 5 — corectat de la `UnifiedDashboard.tsx` la `AdminMasterMap.tsx`) ✓; empty state (Task 5) ✓.
- **Type consistency:** `NewsfeedItem.view` e `View` (Task 2) — folosit identic în `NewsfeedWidget.onNavigate` (Task 5) și în valorile `view:` din `newsfeedService.ts` (Task 3, toate din union-ul `View` existent: `'examene'`, `'activitati-nationale'`, `'competitii'`). `AnuntFederatie` identic între `types.ts` (Task 2), `newsfeedService.ts` (Task 3) și `AnunturiFederatie.tsx` (Task 6).
- **Fără corelare cu Secțiunea B** (acces plătit) — niciun task de mai sus adaugă gating sau tabele din acea secțiune, cum a cerut utilizatorul.
