# Quick Task 260626-buf: Sistem Perioade Vacanță Antrenamente — Research

**Cercetat:** 2026-06-26
**Domeniu:** Schema DB + RLS + UI integration în Plati module + multi-select sportivi
**Confidence:** HIGH (bazat direct pe codebase verificat, nu pe training data)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tab nou "Vacanțe" în modulul Plăți (ca view separat în sidebar sub "Financiar & Plăți"), NU modul separat
- Admin selectează manual sportivii participanți — NU opt-in din dashboard sportiv
- NU se generează factură automată — admin înregistrează manual din Portofel
- Antrenamentele de vacanță folosesc ACELAȘI sistem Prezență existent
- Nu se creează sistem de prezență separat

### Claude's Discretion
- Schema DB: `perioade_vacanta` (id, club_id, denumire, data_start, data_end, created_at)
- Schema DB: `participare_vacanta` (id, sportiv_id, perioada_id, created_at)
- RLS: politici standard per club_id
- UI: modal CRUD pentru perioade + selector sportivi (multi-select)

### Deferred Ideas (OUT OF SCOPE)
- Opt-in sportiv din dashboard
- Generare automată factură la opt-in
- Sistem de prezență separat pentru vacanță
</user_constraints>

---

## 1. Schema DB — Convenții confirmate din codebase [VERIFIED: codebase]

### Câmpuri standard

Din analiza migrațiilor existente (`create_missing_tables.sql`, `add_decont_sportivi.sql`):

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
club_id     UUID REFERENCES public.cluburi(id) ON DELETE CASCADE
```

`ON DELETE CASCADE` este convenția pentru `club_id` (ex: `taxe_anuale_config`, `deconturi_federatie`).
`ON DELETE RESTRICT` este folosit pentru `sportiv_id` (ex: `decont_sportivi`) — previne ștergerea sportivului dacă are înregistrări.

### Tabele propuse — confirmate cu convenții corecte

**`perioade_vacanta`:**
```sql
CREATE TABLE IF NOT EXISTS public.perioade_vacanta (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    club_id    UUID NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    denumire   TEXT NOT NULL,
    data_start DATE NOT NULL,
    data_end   DATE NOT NULL,
    CONSTRAINT vacanta_date_valide CHECK (data_end >= data_start)
);

CREATE INDEX IF NOT EXISTS perioade_vacanta_club_id_idx ON public.perioade_vacanta(club_id);
CREATE INDEX IF NOT EXISTS perioade_vacanta_data_idx ON public.perioade_vacanta(data_start, data_end);
```

**`participare_vacanta`:**
```sql
CREATE TABLE IF NOT EXISTS public.participare_vacanta (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    perioada_id UUID NOT NULL REFERENCES public.perioade_vacanta(id) ON DELETE CASCADE,
    sportiv_id  UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE RESTRICT,
    UNIQUE(perioada_id, sportiv_id)
);

CREATE INDEX IF NOT EXISTS participare_vacanta_perioada_idx ON public.participare_vacanta(perioada_id);
CREATE INDEX IF NOT EXISTS participare_vacanta_sportiv_idx  ON public.participare_vacanta(sportiv_id);
```

`DATE` (nu `TIMESTAMPTZ`) pentru `data_start`/`data_end` — convenție din `taxe_anuale_config.data_inceput/data_sfarsit`.

---

## 2. Pattern RLS — strategia proiectului [VERIFIED: codebase]

**Strategia dominantă** din `fix_rls_all_tables.sql` (confirmat în toate migrațiile recente):

- SELECT: `USING (true)` pentru `authenticated` — JS face filtrarea pe `club_id`
- INSERT/UPDATE/DELETE: verificare rol în `utilizator_roluri_multicont`

```sql
-- Pattern simplu (identic cu tipuri_abonament, sesiuni_examene, nom_locatii, etc.)
ALTER TABLE public.perioade_vacanta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perioade_vacanta_select" ON public.perioade_vacanta;
CREATE POLICY "perioade_vacanta_select"
    ON public.perioade_vacanta FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "perioade_vacanta_write" ON public.perioade_vacanta;
CREATE POLICY "perioade_vacanta_write"
    ON public.perioade_vacanta FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
          AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
          AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
    ));

-- Același pattern pentru participare_vacanta
ALTER TABLE public.participare_vacanta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participare_vacanta_select" ON public.participare_vacanta;
CREATE POLICY "participare_vacanta_select"
    ON public.participare_vacanta FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "participare_vacanta_write" ON public.participare_vacanta;
CREATE POLICY "participare_vacanta_write"
    ON public.participare_vacanta FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
          AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
          AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
    ));
```

**Notă:** `participare_vacanta` nu are `club_id` propriu — se accesează prin JOIN cu `perioade_vacanta`. Filtrul JS va face `.eq('perioade_vacanta.club_id', clubId)` sau va filtra local după `perioada_id` deja filtrat.

---

## 3. Integrare UI — unde se adaugă tab-ul "Vacanțe" [VERIFIED: codebase]

### Modelul de navigare actual

Modulul Plăți NU are tab-uri interne — fiecare secțiune este un **view separat** în `AppRouter.tsx` (switch-case pe `activeView`) și un **entry în `menuConfig.ts`**.

Vizualizat din `menuConfig.ts` (linia 148-161 pentru `adminClubMenu`):
```typescript
{
    label: 'Financiar & Plăți', icon: BanknotesIcon,
    submenu: [
        { label: 'Dashboard Financiar',   view: 'financial-dashboard' },
        { label: 'Facturi & Plăți',       view: 'plati-scadente' },
        { label: 'Gestiune Facturi',       view: 'gestiune-facturi' },
        { label: 'Jurnal Încasări',        view: 'jurnal-incasari' },
        { label: 'Raport Financiar',       view: 'raport-financiar' },
        { label: 'Taxe Anuale',            view: 'taxe-anuale' },
        { label: 'Config. Abonamente',     view: 'tipuri-abonament' },
        // ... etc.
    ]
}
```

### Ce trebuie modificat pentru "Vacanțe"

**Fișier 1 — `types.ts`:** Adaugă `'perioade-vacanta'` în union type `View`:
```typescript
export type View = /* ... existente ... */ | 'perioade-vacanta';
```

**Fișier 2 — `components/menuConfig.ts`:** Adaugă în submenu-ul "Financiar & Plăți" (în ambele `adminMenu` și `adminClubMenu`):
```typescript
{ label: 'Vacanțe Antrenamente', view: 'perioade-vacanta' },
```
Poziție logică: după `'taxe-anuale'`, înainte de `'tipuri-abonament'`.

**Fișier 3 — `components/AppRouter.tsx`:** Adaugă case în switch:
```typescript
case 'perioade-vacanta':
    return renderProtected(
        <Lazy.PerioadaVacanta onBack={handleBackToDashboard} />,
        isAtLeastClubAdmin
    );
```

**Fișier 4 — `components/LazyComponents.tsx`:** Adaugă lazy import:
```typescript
export const PerioadaVacanta = lazy(() =>
    import('./Plati/PerioadaVacanta').then(m => ({ default: m.PerioadaVacanta }))
);
```

**Fișier 5 — `components/Plati/PerioadaVacanta.tsx`:** Componenta nouă (self-contained).

### Pattern component Plati existent

Componentele din `Plati/` primesc date din `useData()` → `filteredData`. Nu primesc props masive — se conectează direct la context. Exemplu din `PlatiScadente.tsx`:
```typescript
const { filteredData, setPlati, currentUser, clubs, grade } = useData();
```

Componenta nouă va urma același pattern — NU primește `sportivi` ca prop, ci îi ia din `useData().filteredData.sportivi`.

---

## 4. Pattern multi-select sportivi existent [VERIFIED: codebase]

**Referință canonică:** `components/Grupe/AdaugaSportiviModal.tsx`

Acesta este exact pattern-ul necesar pentru selectorul de participanți vacanță:

```typescript
// State: Set<string> pentru selecție multiplă
const [selected, setSelected] = useState<Set<string>>(new Set());

// Toggle individual
const toggleSportiv = (id: string) => {
    setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
};

// Toggle all (selectare/deselectare totală)
const toggleAll = () => {
    if (selected.size === rezultateCautare.length && rezultateCautare.length > 0) {
        setSelected(new Set());
    } else {
        setSelected(new Set(rezultateCautare.map(s => s.id)));
    }
};

// Salvare: Array.from(selected)
await onSave(Array.from(selected));
```

**UI pattern:** Liste cu checkbox vizual (click pe rând → toggle), search input deasupra, buton "Selectează tot", count afișat în header.

**Diferența față de AdaugaSportiviModal:** Pentru vacanță, lista arată sportivii activi din club care NU sunt deja în perioadă. Lista curentă de participanți se afișează separat (pot fi scoși individual cu buton X).

---

## 5. Tipuri TypeScript necesare în `types.ts` [VERIFIED: codebase — convenție]

```typescript
// --- Domain: Vacanță Antrenamente ---
export interface PerioadaVacanta {
  id: string;
  created_at: string;
  club_id: string;
  denumire: string;
  data_start: string;  // ISO date string 'YYYY-MM-DD' (DATE din DB)
  data_end: string;    // ISO date string 'YYYY-MM-DD'
}

export interface ParticipareVacanta {
  id: string;
  created_at: string;
  perioada_id: string;
  sportiv_id: string;
  // joined fields (opțional, pentru display)
  sportivi?: Pick<Sportiv, 'id' | 'nume' | 'prenume' | 'grad_actual_id'>;
}
```

**Notă `data_start`/`data_end`:** Câmpurile `DATE` din Postgres vin ca string `'YYYY-MM-DD'` în JS (fără timezone). Nu `TIMESTAMPTZ`. Același pattern ca `data_examen` din `SesiuneExamen`.

---

## 6. Supabase queries — pattern coerent cu restul aplicației [VERIFIED: codebase]

```typescript
// Fetch perioade pentru club curent
const { data: perioade } = await supabase
    .from('perioade_vacanta')
    .select('*')
    .eq('club_id', activeRoleContext.club_id)
    .order('data_start', { ascending: false });

// Fetch participanți pentru o perioadă (cu join sportivi)
const { data: participari } = await supabase
    .from('participare_vacanta')
    .select('*, sportivi(id, nume, prenume, grad_actual_id, status)')
    .eq('perioada_id', perioadaId);

// Adaugă participanți (bulk insert)
const { error } = await supabase
    .from('participare_vacanta')
    .insert(sportiviIds.map(sid => ({
        perioada_id: perioadaId,
        sportiv_id: sid,
    })));

// Șterge participare individuală
const { error } = await supabase
    .from('participare_vacanta')
    .delete()
    .eq('id', participareId);

// Șterge perioadă (CASCADE șterge și participările)
const { error } = await supabase
    .from('perioade_vacanta')
    .delete()
    .eq('id', perioadaId);
```

---

## 7. Pitfall: ștergere perioadă cu participanți [ASSUMED]

Decizia din CONTEXT.md spune "confirmare dacă au participanți". Pattern existent în aplicație: `ConfirmDeleteModal` (ex: `PlatiScadente.tsx` linia ~88 `plataToDelete`). Componenta este deja importată în mai multe locuri:

```typescript
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
// ...
const [perioadaToDelete, setPerioadaToDelete] = useState<PerioadaVacanta | null>(null);
```

Înainte de ștergere, verifică dacă există participanți (count local sau fetch) și afișează mesaj cu numărul de participanți afectați.

---

## 8. Structura fișierului de migrație

Convenție de denumire din `sql/migrations/`: fișiere cu prefix descriptiv, fără număr ordinal explicit pentru cele recente. Noul fișier:

```
sql/migrations/create_perioade_vacanta.sql
```

---

## Rezumat decizii pentru planner

| Aspect | Decizie |
|--------|---------|
| View name | `'perioade-vacanta'` (adaugă în `View` type) |
| Componenta | `components/Plati/PerioadaVacanta.tsx` |
| Date din context | `useData().filteredData.sportivi` + query direct Supabase pentru perioade/participări |
| Multi-select pattern | `Set<string>` + `AdaugaSportiviModal` ca referință |
| RLS pattern | `USING (true)` SELECT + `utilizator_roluri_multicont` pentru write |
| Migrație | `sql/migrations/create_perioade_vacanta.sql` — 2 tabele + RLS |
| Menu | Adaugă în `adminMenu` + `adminClubMenu`, sub "Taxe Anuale" |
| LazyComponents | Adaugă entry pentru lazy load |

## Assumptions Log

| # | Claim | Risk dacă greșit |
|---|-------|-----------------|
| A1 | `LazyComponents.tsx` are pattern `lazy(() => import(...))` consistent | Scăzut — e convenție vizibilă din `AppRouter.tsx` |
| A2 | ConfirmDeleteModal acceptă mesaj custom cu număr participanți | Scăzut — e un modal generic cu prop `message` |

**Fișiere cheie verificate:**
- `sql/migrations/create_missing_tables.sql` — convenție CREATE TABLE
- `sql/migrations/fix_rls_all_tables.sql` — pattern RLS dominant
- `sql/migrations/add_decont_sportivi.sql` — pattern junction table + UNIQUE constraint
- `components/menuConfig.ts` — structura submenu Financiar & Plăți
- `components/AppRouter.tsx` — cum se adaugă case nou
- `components/Grupe/AdaugaSportiviModal.tsx` — multi-select pattern complet
- `types.ts` linia 536 — `View` type union
- `types.ts` linia 77-118 — `Sportiv` interface
