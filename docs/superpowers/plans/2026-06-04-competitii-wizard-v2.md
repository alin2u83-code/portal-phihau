# Competiții Wizard v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rezolvă 5 probleme în InscriereClubWizard: consistență nume, filtre complete Pas1, scope sportivi echipe, cereri inter-club cu aprobare super admin, și UI responsive mobil/tabletă.

**Architecture:** Modificări incrementale pe componentele existente — nu se schimbă arhitectura hub-first. Feature 4 adaugă un tabel nou `cereri_coechipier` cu RLS + un component nou `CereriInterclubAdmin`. Feature 2 extrage un `FilterDropdown` reutilizabil în `shared.tsx`.

**Tech Stack:** React 18 + TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, React Query v5

---

## Fișiere modificate/create

| Fișier | Tip | Features |
|--------|-----|----------|
| `ProbaIndividualaView.tsx` | MODIFICAT | F1, F2, F5 |
| `InscriereClubWizard/shared.tsx` | MODIFICAT | F2 (FilterDropdown component) |
| `ProbaEchipeView.tsx` | MODIFICAT | F3, F4, F5 |
| `Pas3Echipe.tsx` | MODIFICAT | F3 |
| `InscriereClubWizard/index.tsx` | MODIFICAT | F4 (state cereri) |
| `InscriereClubCards.tsx` | MODIFICAT | F5 |
| `Pas4Sumar.tsx` | MODIFICAT | F5 |
| `components/Competitii/CereriInterclubAdmin.tsx` | NOU | F4 super admin UI |
| `supabase/migrations/20260604_cereri_coechipier.sql` | NOU | F4 DB |
| `types.ts` | MODIFICAT | F4 (CerereCoechipier type) |

---

## Task 1: F1 — Consistență formatNume în Pas2Quyen

**Files:**
- Modify: `components/Competitii/InscriereClubWizard/ProbaIndividualaView.tsx:478`

- [ ] **Step 1: Găsește și înlocuiește afișarea manuală a numelui în Pas2**

La linia 477-479 din `ProbaIndividualaView.tsx`:
```tsx
// ÎNAINTE (linia 477-479)
<span className="font-semibold text-sm text-white min-w-[90px]">
  {sportiv.prenume} {sportiv.nume}
</span>

// DUPĂ
<span className="font-semibold text-sm text-white min-w-[90px]">
  {formatNume(sportiv)}
</span>
```

Verifică că `formatNume` este deja importat în fișier (linia ~17: `import { formatNume } from '../../../utils/formatareSportiv';`). Este deja prezent din Task anterior — nu adăuga import duplicate.

- [ ] **Step 2: Scan complet wizard pentru alte apariții manuale**

Rulează în terminal:
```bash
grep -n "sportiv\.prenume.*sportiv\.nume\|sportiv\.nume.*sportiv\.prenume" components/Competitii/InscriereClubWizard/*.tsx
```

Înlocuiește orice alte apariții găsite cu `formatNume(sportiv)`.

- [ ] **Step 3: Commit**

```bash
git add components/Competitii/InscriereClubWizard/ProbaIndividualaView.tsx
git commit -m "fix(competitii): formatNume consistent in Pas2Quyen"
```

---

## Task 2: F2 — FilterDropdown component în shared.tsx

**Files:**
- Modify: `components/Competitii/InscriereClubWizard/shared.tsx`

- [ ] **Step 1: Adaugă tipurile pentru FilterDropdown**

La sfârșitul importurilor din `shared.tsx` adaugă:

```tsx
// Types pentru FilterDropdown
export interface FilterOption {
  value: string;
  label: string;
}
```

- [ ] **Step 2: Adaugă componenta FilterDropdown în shared.tsx**

Adaugă înainte de ultimul export din `shared.tsx`:

```tsx
interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    const next = new Set(selected);
    next.has(val) ? next.delete(val) : next.add(val);
    onChange(next);
  };

  const count = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ touchAction: 'manipulation' }}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all min-h-[36px] ${
          count > 0
            ? 'border-indigo-500 bg-indigo-900/20 text-indigo-300'
            : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
        }`}
      >
        {label}
        {count > 0 && (
          <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
            {count}
          </span>
        )}
        <span className="text-slate-500 text-[10px]">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden">
          {options.map(opt => {
            const isSel = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                style={{ touchAction: 'manipulation' }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-slate-700 transition-colors min-h-[44px]"
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-[10px] ${
                  isSel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-500'
                }`}>
                  {isSel ? '✓' : ''}
                </span>
                <span className={isSel ? 'text-indigo-300 font-semibold' : 'text-slate-300'}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

Verifică că `useState` și `useEffect` sunt importate din `'react'` la începutul fișierului.

- [ ] **Step 3: Commit**

```bash
git add components/Competitii/InscriereClubWizard/shared.tsx
git commit -m "feat(competitii): FilterDropdown reutilizabil in shared"
```

---

## Task 3: F2 — Filtre Pas1 (grad + vârstă + gen + reset)

**Files:**
- Modify: `components/Competitii/InscriereClubWizard/ProbaIndividualaView.tsx`

- [ ] **Step 1: Adaugă helper getCategoriiVarsta**

Adaugă înainte de interfața `Pas1Props` (linia ~60):

```tsx
interface VarstaInterval {
  key: string;          // ex: "10-11"
  label: string;        // ex: "U12 (10–11 ani)"
  varstaMin: number;
  varstaMax: number;
}

function getCategoriiVarsta(categorii: CategorieCompetitie[], probaId: string): VarstaInterval[] {
  const seen = new Set<string>();
  const result: VarstaInterval[] = [];
  for (const cat of categorii) {
    if (cat.proba_id !== probaId) continue;
    const min = cat.varsta_min ?? 0;
    const max = cat.varsta_max ?? 99;
    const key = `${min}-${max}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const labelVarsta = max >= 99 ? `${min}+ ani` : `${min}–${max} ani`;
    const labelCateg = cat.denumire?.match(/U\d+|Senior|Copii|Juniori/i)?.[0] ?? '';
    result.push({
      key,
      label: labelCateg ? `${labelCateg} (${labelVarsta})` : labelVarsta,
      varstaMin: min,
      varstaMax: max,
    });
  }
  return result.sort((a, b) => a.varstaMin - b.varstaMin);
}
```

- [ ] **Step 2: Înlocuiește starea filtrelor în Pas1Sportivi**

La linia 75-76, înlocuiește:
```tsx
// ÎNAINTE
const [cautare, setCautare] = useState('');
const [gradFilter, setGradFilter] = useState<string | null>(null);

// DUPĂ
const [cautare, setCautare] = useState('');
const [gradFilter, setGradFilter] = useState<Set<string>>(new Set());
const [varstaFilter, setVarstaFilter] = useState<Set<string>>(new Set());
const [genFilter, setGenFilter] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Adaugă opțiunile pentru dropdown-uri**

Înlocuiește `gradePresente` useMemo și adaugă memourile pentru vârstă și gen (după linia 101):

```tsx
// ÎNLOCUIEȘTE gradePresente useMemo cu:
const optiuiniGrade = useMemo((): FilterOption[] => {
  const m = new Map<string, string>();
  for (const { grad } of sportiviEligibili) {
    if (grad) m.set(grad.id, grad.nume);
  }
  return Array.from(m.entries())
    .sort(([, a], [, b]) => a.localeCompare(b, 'ro'))
    .map(([value, label]) => ({ value, label }));
}, [sportiviEligibili]);

const optiuiniVarsta = useMemo(
  () => getCategoriiVarsta(categorii, probaId),
  [categorii, probaId]
);

const optiuiniGen = useMemo((): FilterOption[] => {
  const valori = new Set<string>();
  for (const { sportiv } of sportiviEligibili) {
    if (sportiv.sex) valori.add(sportiv.sex);
  }
  const labels: Record<string, string> = { M: 'Masculin', F: 'Feminin' };
  return Array.from(valori).sort().map(v => ({ value: v, label: labels[v] ?? v }));
}, [sportiviEligibili]);
```

- [ ] **Step 4: Actualizează logica sportiviVizibili**

Înlocuiește `sportiviVizibili` useMemo (linia 103-111):

```tsx
const sportiviVizibili = useMemo(() => {
  let lista = sportiviEligibili;
  if (gradFilter.size) lista = lista.filter(e => gradFilter.has(e.grad?.id ?? ''));
  if (varstaFilter.size) lista = lista.filter(e => {
    const v = e.varsta ?? 0;
    return optiuiniVarsta
      .filter(opt => varstaFilter.has(opt.key))
      .some(opt => v >= opt.varstaMin && v <= opt.varstaMax);
  });
  if (genFilter.size) lista = lista.filter(e => genFilter.has(e.sportiv.sex ?? ''));
  if (cautare.trim()) {
    const q = cautare.trim().toLowerCase();
    lista = lista.filter(e => formatNume(e.sportiv).toLowerCase().includes(q));
  }
  return lista;
}, [sportiviEligibili, gradFilter, varstaFilter, genFilter, cautare, optiuiniVarsta]);

const resetFiltre = () => {
  setGradFilter(new Set());
  setVarstaFilter(new Set());
  setGenFilter(new Set());
  setCautare('');
};
const areFiltre = gradFilter.size > 0 || varstaFilter.size > 0 || genFilter.size > 0 || cautare.trim().length > 0;
```

- [ ] **Step 5: Înlocuiește UI filtrelor în JSX**

Înlocuiește blocul `{/* Filtru căutare + grad */}` (linia 126-170) cu:

```tsx
{/* Filtre */}
{sportiviEligibili.length > 0 && (
  <div className="flex flex-col gap-2 mb-3">
    <input
      type="text"
      value={cautare}
      onChange={e => setCautare(e.target.value)}
      placeholder="Caută după nume..."
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
    />
    <div className="flex flex-wrap gap-1.5 items-center">
      {optiuiniGrade.length > 1 && (
        <FilterDropdown
          label="Grad"
          options={optiuiniGrade}
          selected={gradFilter}
          onChange={setGradFilter}
        />
      )}
      {optiuiniVarsta.length > 1 && (
        <FilterDropdown
          label="Vârstă"
          options={optiuiniVarsta.map(v => ({ value: v.key, label: v.label }))}
          selected={varstaFilter}
          onChange={setVarstaFilter}
        />
      )}
      {optiuiniGen.length > 1 && (
        <FilterDropdown
          label="Gen"
          options={optiuiniGen}
          selected={genFilter}
          onChange={setGenFilter}
        />
      )}
      {areFiltre && (
        <button
          type="button"
          onClick={resetFiltre}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center gap-1 rounded-lg border border-red-800/60 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/50 transition-colors min-h-[36px]"
        >
          ✕ Reset
        </button>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 6: Adaugă import FilterDropdown**

La importurile din `ProbaIndividualaView.tsx` (linia ~1-20), adaugă `FilterDropdown, FilterOption` la importul din `'./shared'`:
```tsx
import { StepIndicator, FilterDropdown, type FilterOption } from './shared';
```

- [ ] **Step 7: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep ProbaIndividualaView
```
Erori de tip zero așteptate.

- [ ] **Step 8: Commit**

```bash
git add components/Competitii/InscriereClubWizard/ProbaIndividualaView.tsx
git commit -m "feat(competitii): filtre dropdown multi-select Pas1 (grad/varsta/gen + reset)"
```

---

## Task 4: F3 — Toți sportivii activi la ProbaEchipe / Pas3

**Files:**
- Modify: `components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx:489-492`
- Modify: `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx:470-473`

- [ ] **Step 1: Fix ProbaEchipeView — scoate filtrul selectedSportivi**

La linia 489-492 din `ProbaEchipeView.tsx`, înlocuiește:
```tsx
// ÎNAINTE
const sportiviSelectati = useMemo(
  () => sportivi.filter(s => selectedSportivi.has(s.id) && (!myClubId || s.club_id === myClubId)),
  [sportivi, selectedSportivi, myClubId]
);

// DUPĂ — păstrează doar filtrul de club, elimină selectedSportivi
const sportiviSelectati = useMemo(
  () => sportivi.filter(s => !myClubId || s.club_id === myClubId),
  [sportivi, myClubId]
);
```

- [ ] **Step 2: Fix Pas3Echipe — scoate filtrul selectedSportivi**

La linia 470-473 din `Pas3Echipe.tsx`, înlocuiește:
```tsx
// ÎNAINTE
const sportiviSelectati = useMemo<Sportiv[]>(() =>
  sportivi.filter(s => selectedSportivi.has(s.id)),
  [sportivi, selectedSportivi]
);

// DUPĂ
const sportiviSelectati = useMemo<Sportiv[]>(
  () => sportivi,
  [sportivi]
);
```

- [ ] **Step 3: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "ProbaEchipeView|Pas3Echipe"
```

- [ ] **Step 4: Commit**

```bash
git add components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx
git add components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
git commit -m "fix(competitii): song luyen/sincron folosesc toti sportivii activi, nu doar selectati la thao quyen"
```

---

## Task 5: F4 — Migrație DB + tip CerereCoechipier

**Files:**
- Create: `supabase/migrations/20260604_cereri_coechipier.sql`
- Modify: `types.ts`

- [ ] **Step 1: Creează fișierul de migrație**

Creează `supabase/migrations/20260604_cereri_coechipier.sql`:

```sql
-- Cereri completare echipă din alt club
-- Clubul solicitor cere super admin să asigneze un sportiv eligibil din orice club

CREATE TABLE IF NOT EXISTS cereri_coechipier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitie_id UUID NOT NULL REFERENCES competitii(id) ON DELETE CASCADE,
  categorie_id UUID NOT NULL REFERENCES categorii_competitie(id) ON DELETE CASCADE,
  club_solicitant_id UUID NOT NULL REFERENCES cluburi(id),
  nr_locuri_solicitate INTEGER NOT NULL DEFAULT 1 CHECK (nr_locuri_solicitate > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'aprobat', 'respins', 'anulat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  rezolvat_de UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (competitie_id, categorie_id, club_solicitant_id)
);

-- RLS
ALTER TABLE cereri_coechipier ENABLE ROW LEVEL SECURITY;

-- ADMIN_CLUB: vede și poate crea/anula pentru clubul propriu
CREATE POLICY "cereri_coechipier_club_select" ON cereri_coechipier
  FOR SELECT USING (
    club_solicitant_id = (
      SELECT club_id FROM roluri_utilizatori
      WHERE user_id = auth.uid()
        AND rol IN ('ADMIN_CLUB', 'INSTRUCTOR')
        AND id = current_setting('request.headers')::json->>'active-role-context-id'
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1 FROM roluri_utilizatori
      WHERE user_id = auth.uid()
        AND rol = 'SUPER_ADMIN_FEDERATIE'
    )
  );

CREATE POLICY "cereri_coechipier_club_insert" ON cereri_coechipier
  FOR INSERT WITH CHECK (
    club_solicitant_id = (
      SELECT club_id FROM roluri_utilizatori
      WHERE user_id = auth.uid()
        AND rol = 'ADMIN_CLUB'
        AND id::text = (current_setting('request.headers', true)::json->>'active-role-context-id')
      LIMIT 1
    )
  );

-- Anulare de club (status → 'anulat')
CREATE POLICY "cereri_coechipier_club_anulare" ON cereri_coechipier
  FOR UPDATE USING (
    status = 'pending'
    AND club_solicitant_id = (
      SELECT club_id FROM roluri_utilizatori
      WHERE user_id = auth.uid()
        AND rol = 'ADMIN_CLUB'
        AND id::text = (current_setting('request.headers', true)::json->>'active-role-context-id')
      LIMIT 1
    )
  )
  WITH CHECK (status = 'anulat');

-- SUPER_ADMIN: poate face orice pe toate cererile
CREATE POLICY "cereri_coechipier_super_admin" ON cereri_coechipier
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roluri_utilizatori
      WHERE user_id = auth.uid()
        AND rol = 'SUPER_ADMIN_FEDERATIE'
    )
  );

-- Index pentru performanță
CREATE INDEX idx_cereri_coechipier_competitie ON cereri_coechipier(competitie_id);
CREATE INDEX idx_cereri_coechipier_status ON cereri_coechipier(status) WHERE status = 'pending';
```

- [ ] **Step 2: Aplică migrația**

```bash
npx supabase db push
```
sau via MCP: `mcp__plugin_supabase_supabase__apply_migration` cu conținutul SQL.

- [ ] **Step 3: Adaugă tipul CerereCoechipier în types.ts**

La finalul `types.ts` (după linia 693), adaugă:

```typescript
export interface CerereCoechipier {
  id: string;
  competitie_id: string;
  categorie_id: string;
  club_solicitant_id: string;
  nr_locuri_solicitate: number;
  status: 'pending' | 'aprobat' | 'respins' | 'anulat';
  created_at: string;
  resolved_at: string | null;
  rezolvat_de: string | null;
  created_by: string | null;
  // joined
  categorie?: CategorieCompetitie;
  club_solicitant?: { id: string; nume: string };
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604_cereri_coechipier.sql types.ts
git commit -m "feat(competitii): migratie cereri_coechipier + tip TS"
```

---

## Task 6: F4 — UI Club Admin: buton cerere per categorie incompletă

**Files:**
- Modify: `components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx`
- Modify: `components/Competitii/InscriereClubWizard/index.tsx`

- [ ] **Step 1: Adaugă import supabase în ProbaEchipeView**

Verifică că `supabase` este importat. Dacă nu, adaugă:
```tsx
import { supabase } from '../../../supabaseClient';
```

- [ ] **Step 2: Adaugă state cereri în index.tsx**

În `index.tsx`, adaugă state după `echipeFormate`:
```tsx
const [cereriInterclub, setCereriInterclub] = useState<Map<string, 'pending' | 'aprobat' | 'respins'>>(new Map());
// key = categorie_id, value = status cerere activă
```

Pasează `cereriInterclub` și `onUpdateCereri={(m) => setCereriInterclub(m)}` ca props la `ProbaEchipeView`.

- [ ] **Step 3: Adaugă props în interfața ProbaEchipeView**

Găsește interfața props a `ProbaEchipeView` și adaugă:
```tsx
cereriInterclub: Map<string, 'pending' | 'aprobat' | 'respins'>;
onUpdateCereri: (m: Map<string, 'pending' | 'aprobat' | 'respins'>) => void;
competitieId: string;
clubSolicitantId: string;
```

Verifică că `competitieId` și `clubSolicitantId` sunt deja pasate sau adaugă-le din `index.tsx` (sunt disponibile din props-urile wizardului).

- [ ] **Step 4: Adaugă helper isCategoryIncomplete**

În `ProbaEchipeView.tsx`, adaugă helper (după `sportiviDisponibiliPerCategorie`):

```tsx
const isCategoryIncomplete = (cat: CategorieCompetitie): boolean => {
  const echipa = echipeFormate.find(e => e.categorieId === cat.id);
  if (!echipa || echipa.echipaSkip) return false;
  const min = cat.sportivi_per_echipa_min ?? 2;
  return echipa.titulari.length < min;
};
```

- [ ] **Step 5: Adaugă funcția trimite/anulează cerere**

În `ProbaEchipeView.tsx`:

```tsx
const handleSolicitaInterclub = async (categorieId: string, nrLocuri: number) => {
  try {
    const { error } = await supabase.from('cereri_coechipier').insert({
      competitie_id: competitieId,
      categorie_id: categorieId,
      club_solicitant_id: clubSolicitantId,
      nr_locuri_solicitate: nrLocuri,
    });
    if (error) throw error;
    const next = new Map(cereriInterclub);
    next.set(categorieId, 'pending');
    onUpdateCereri(next);
  } catch (err) {
    showError('Trimitere cerere inter-club', err);
  }
};

const handleAnuleazaCerere = async (categorieId: string) => {
  try {
    const { error } = await supabase
      .from('cereri_coechipier')
      .update({ status: 'anulat' })
      .eq('competitie_id', competitieId)
      .eq('categorie_id', categorieId)
      .eq('club_solicitant_id', clubSolicitantId)
      .eq('status', 'pending');
    if (error) throw error;
    const next = new Map(cereriInterclub);
    next.delete(categorieId);
    onUpdateCereri(next);
  } catch (err) {
    showError('Anulare cerere inter-club', err);
  }
};
```

- [ ] **Step 6: Adaugă UI buton per categorie**

Găsește în ProbaEchipeView zona unde se randează categoriile cu sloturi echipă (secțiunea map peste `categoriiCuEligibili`). Adaugă după lista de sloturi a fiecărei categorii:

```tsx
{/* Buton cerere inter-club — vizibil doar dacă echipa e incompletă */}
{isCategoryIncomplete(cat) && (() => {
  const statusCerere = cereriInterclub.get(cat.id);
  const min = cat.sportivi_per_echipa_min ?? 2;
  const echipa = echipeFormate.find(e => e.categorieId === cat.id);
  const nrLocuriLipsa = min - (echipa?.titulari.length ?? 0);

  if (statusCerere === 'pending') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-blue-800/50 bg-blue-950/20 px-3 py-2.5">
        <span className="text-sm">📨</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-300">Cerere trimisă</p>
          <p className="text-[11px] text-blue-400/60">Super admin decide completarea</p>
        </div>
        <button
          type="button"
          onClick={() => handleAnuleazaCerere(cat.id)}
          style={{ touchAction: 'manipulation' }}
          className="text-[11px] text-slate-500 underline hover:text-slate-400"
        >
          Anulează
        </button>
      </div>
    );
  }

  if (statusCerere === 'aprobat') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-3 py-2.5">
        <span className="text-sm">✅</span>
        <p className="text-xs font-semibold text-emerald-300">Completare aprobată de super admin</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => handleSolicitaInterclub(cat.id, nrLocuriLipsa)}
      style={{ touchAction: 'manipulation' }}
      className="mt-2 w-full flex items-center gap-2 rounded-xl border border-dashed border-amber-700/60 bg-amber-950/10 px-3 py-2.5 text-left hover:bg-amber-950/20 transition-colors"
    >
      <span className="text-sm">🤝</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-400">
          Solicită completare din alt club
          {nrLocuriLipsa > 1 ? ` (${nrLocuriLipsa} locuri)` : ''}
        </p>
        <p className="text-[11px] text-amber-600/70">Super admin asignează sportivi eligibili</p>
      </div>
      <span className="text-amber-600 text-xs">→</span>
    </button>
  );
})()}
```

- [ ] **Step 7: Încarcă cererile existente la mount**

Adaugă `useEffect` în `ProbaEchipeView.tsx` pentru a încărca cererile pending existente:

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const { data, error } = await supabase
        .from('cereri_coechipier')
        .select('categorie_id, status')
        .eq('competitie_id', competitieId)
        .eq('club_solicitant_id', clubSolicitantId)
        .in('status', ['pending', 'aprobat']);
      if (error || cancelled) return;
      const m = new Map<string, 'pending' | 'aprobat' | 'respins'>();
      for (const row of data ?? []) {
        m.set(row.categorie_id, row.status as 'pending' | 'aprobat');
      }
      onUpdateCereri(m);
    } catch (_) {}
  })();
  return () => { cancelled = true; };
}, [competitieId, clubSolicitantId]);
```

- [ ] **Step 8: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "ProbaEchipeView|index\.tsx"
```

- [ ] **Step 9: Commit**

```bash
git add components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx
git add components/Competitii/InscriereClubWizard/index.tsx
git commit -m "feat(competitii): buton cerere coechipier inter-club per categorie incompleta"
```

---

## Task 7: F4 — UI Super Admin: CereriInterclubAdmin

**Files:**
- Create: `components/Competitii/CereriInterclubAdmin.tsx`

- [ ] **Step 1: Creează componenta CereriInterclubAdmin**

Creează `components/Competitii/CereriInterclubAdmin.tsx`:

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { CerereCoechipier } from '../../types';
import { useError } from '../ErrorProvider';
import { formatNume } from '../../utils/formatareSportiv';

interface Props {
  competitieId: string;
}

export const CereriInterclubAdmin: React.FC<Props> = ({ competitieId }) => {
  const { showError } = useError();
  const [cereri, setCereri] = useState<CerereCoechipier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCereri = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cereri_coechipier')
        .select(`
          *,
          categorie:categorii_competitie(id, denumire, gen, varsta_min, varsta_max, grad_min_ordine),
          club_solicitant:cluburi(id, nume)
        `)
        .eq('competitie_id', competitieId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCereri((data ?? []) as CerereCoechipier[]);
    } catch (err) {
      showError('Încărcare cereri inter-club', err);
    } finally {
      setLoading(false);
    }
  }, [competitieId, showError]);

  useEffect(() => { fetchCereri(); }, [fetchCereri]);

  const handleUpdateStatus = async (id: string, status: 'aprobat' | 'respins') => {
    try {
      const { error } = await supabase
        .from('cereri_coechipier')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchCereri();
    } catch (err) {
      showError('Actualizare cerere', err);
    }
  };

  const pending = cereri.filter(c => c.status === 'pending');
  const rezolvate = cereri.filter(c => c.status !== 'pending');

  const genLabel: Record<string, string> = { M: 'Masculin', F: 'Feminin', Mixt: 'Mixt' };

  const renderCard = (cerere: CerereCoechipier, showActions: boolean) => (
    <div key={cerere.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold bg-indigo-900/40 text-indigo-300 rounded-md px-2 py-0.5">
              {cerere.club_solicitant?.nume ?? '—'}
            </span>
            <span className="text-sm font-semibold text-white">
              {cerere.categorie?.denumire ?? '—'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {cerere.categorie?.gen && (
              <span className="text-[11px] bg-slate-700 text-slate-300 rounded px-2 py-0.5">
                👤 {genLabel[cerere.categorie.gen] ?? cerere.categorie.gen}
              </span>
            )}
            {cerere.categorie?.varsta_min != null && (
              <span className="text-[11px] bg-slate-700 text-slate-300 rounded px-2 py-0.5">
                📅 {cerere.categorie.varsta_min}–{cerere.categorie.varsta_max ?? '∞'} ani
              </span>
            )}
            {cerere.nr_locuri_solicitate > 1 && (
              <span className="text-[11px] bg-amber-900/40 text-amber-300 rounded px-2 py-0.5">
                {cerere.nr_locuri_solicitate} locuri necesare
              </span>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
          cerere.status === 'pending' ? 'bg-amber-900/40 text-amber-300' :
          cerere.status === 'aprobat' ? 'bg-emerald-900/40 text-emerald-300' :
          'bg-red-900/40 text-red-300'
        }`}>
          {cerere.status === 'pending' ? '⏳ Pending' :
           cerere.status === 'aprobat' ? '✓ Aprobat' : '✕ Respins'}
        </span>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleUpdateStatus(cerere.id, 'aprobat')}
            className="flex-1 bg-emerald-900/30 border border-emerald-700/50 rounded-lg py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-colors"
          >
            ✓ Aprobă
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus(cerere.id, 'respins')}
            className="bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/50 transition-colors"
          >
            ✕ Respinge
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="text-center text-slate-500 py-8 text-sm animate-pulse">Se încarcă...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {pending.length === 0 && rezolvate.length === 0 && (
        <div className="text-center text-slate-500 py-12 text-sm italic">
          Nicio cerere inter-club pentru această competiție.
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
            Cereri pending ({pending.length})
          </h3>
          <div className="flex flex-col gap-3">
            {pending.map(c => renderCard(c, true))}
          </div>
        </section>
      )}

      {rezolvate.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
            Rezolvate
          </h3>
          <div className="flex flex-col gap-3 opacity-70">
            {rezolvate.map(c => renderCard(c, false))}
          </div>
        </section>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Integrează în CompetitiiManagement sau InscriereClubWizard**

Deschide `components/Competitii/CompetitiiManagement.tsx` (sau componenta care afișează detalii competiție pentru super admin). Adaugă un tab "Cereri inter-club" care randează `<CereriInterclubAdmin competitieId={competitieId} />`.

Dacă nu există sistem de tab-uri, adaugă un buton/secțiune condiționat pe `isSuperAdmin`:

```tsx
{isSuperAdmin && nrCereriPending > 0 && (
  <button
    onClick={() => setActiveTab('cereri-interclub')}
    className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-700/50 bg-amber-950/20 text-amber-300"
  >
    Cereri inter-club
    <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
      {nrCereriPending}
    </span>
  </button>
)}
```

- [ ] **Step 3: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep CereriInterclub
```

- [ ] **Step 4: Commit**

```bash
git add components/Competitii/CereriInterclubAdmin.tsx
git commit -m "feat(competitii): UI super admin cereri inter-club per competitie"
```

---

## Task 8: F5 — Responsive mobil/tabletă

**Files:**
- Modify: `components/Competitii/InscriereClubWizard/InscriereClubCards.tsx`
- Modify: `components/Competitii/InscriereClubWizard/Pas4Sumar.tsx`
- Modify: `components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx`

- [ ] **Step 1: InscriereClubCards — grid responsive**

Găsește în `InscriereClubCards.tsx` clasa grid pe container-ul de cards (probabil `grid grid-cols-2` sau similar). Adaugă responsive:

```tsx
// Caută cu: grep -n "grid-cols" components/Competitii/InscriereClubWizard/InscriereClubCards.tsx
// Înlocuiește grid-ul de cards cu:
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
```

Footer buton "Finalizează înscrierea" — asigură că e `w-full` pe mobil:
```tsx
// Butonul de finalizare din footer:
className="w-full sm:w-auto ..."
```

- [ ] **Step 2: ProbaEchipeView — sloturi echipă full-width pe mobil**

Găsește containerul de sloturi echipă. Înlocuiește orice `grid-cols-2` cu:
```tsx
className="grid grid-cols-1 sm:grid-cols-2 gap-2"
```

Butoane add/remove sportiv — adaugă min touch target:
```tsx
// La toate butoanele de adăugare/eliminare sportiv:
className="... min-h-[44px] min-w-[44px] ..."
```

- [ ] **Step 3: Pas4Sumar — stacked cards pe mobil**

Deschide `Pas4Sumar.tsx`. Găsește tabelul sau grid-ul de sportivi la sumar. Dacă există `<table>`, înlocuiește cu layout responsiv:

```tsx
{/* Pe mobil: cards stacked; pe desktop: tabel */}
<div className="hidden sm:block">
  {/* tabelul existent */}
</div>
<div className="sm:hidden flex flex-col gap-2">
  {sportiviSumar.map(s => (
    <div key={s.sportiv.id} className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
      <div className="font-semibold text-white text-sm">{formatNume(s.sportiv)}</div>
      <div className="text-xs text-slate-400">{s.categorie?.denumire}</div>
      <div className="text-xs text-slate-400">{s.grad?.nume} · {s.quyen?.denumire}</div>
    </div>
  ))}
</div>
```

Adaptează la structura exactă din `Pas4Sumar.tsx` — folosește aceleași câmpuri disponibile.

- [ ] **Step 4: Verifică la 375px**

Pornește dev server:
```bash
npm run dev
```
Deschide DevTools → Toggle device toolbar → iPhone SE (375px). Navighează prin toate ecranele wizard-ului și verifică că nu există scroll orizontal.

- [ ] **Step 5: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "InscriereClubCards|Pas4Sumar|ProbaEchipeView"
```

- [ ] **Step 6: Commit**

```bash
git add components/Competitii/InscriereClubWizard/InscriereClubCards.tsx
git add components/Competitii/InscriereClubWizard/Pas4Sumar.tsx
git add components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx
git commit -m "feat(competitii): responsive mobil/tableta - hub cards, echipe, sumar"
```

---

## Verificare end-to-end

1. **F1:** În Pas2 Quyen, `{sportiv.prenume} {sportiv.nume}` nu mai apare nicăieri — doar `formatNume()`
2. **F2:** Filtre dropdown (Grad / Vârstă / Gen) se deschid pe click, multi-select funcționează, Reset curăță tot, combinația filtrelor (AND) funcționează corect
3. **F3:** La Sincron/Song Luyen, un sportiv care NU a fost selectat la Thao Quyen APARE în lista disponibilă pentru echipă
4. **F4:** Club admin vede buton "Solicită completare" per categorie incompletă → trimite → apare în super admin → super admin aprobă/respinge → starea se reflectă în UI club
5. **F5:** La 375px (iPhone SE), toate ecranele wizard sunt utilizabile fără scroll orizontal
