# Plan implementare: Wizard Înscriere Competiție v2 + Sistem înlănțuiri normalizat

**Data:** 2026-05-08  
**Design spec:** `docs/superpowers/specs/2026-05-08-inscriere-competitie-design.md`  
**Target principal:** `components/Competitii/InscriereClubWizard.tsx`

---

## Stare curentă

| Faza | Status | Detalii |
|------|--------|---------|
| F1 — DB schema inlantuiri | ✅ DONE | `supabase/migrations/20260508_inlantuiri_normalizate.sql` creat, neaplicat în prod |
| F1 — DB wizard v2 | ✅ DONE | `doua_quyenuri`, drop `acord_parental` |
| F2 — TypeScript types | ✅ DONE | `Inlantuire`, `InlantuireGrad`, `InscriereCompetitie` actualizat |
| F3 — Pas1 | ✅ DONE | Categorie auto, filtre avansate, gender override |
| F4 — Pas2 | ✅ DONE | Tabel coloane, `inlantuire_id` UUID, 2Q, fetch `inlantuiri_grade` |
| F5 — Pas3 | ✅ DONE | Gender locking, program echipă, `inlantuire_id` pe echipe |
| F6 — Pas4 | ✅ DONE | Sumar, `inlantuiriById` map pentru display, insert UUID |
| Migrație aplicată în Supabase | ✅ DONE | phi-hau-db: 47 înlănțuiri, 64 asocieri, views recreate |
| Admin UI înlănțuiri | ✅ DONE | InlantuciriAdmin + InlantuireFormModal + InlantuireGradePanel |
| Meniu + rută admin | ✅ DONE | menuConfig adminMenu + AppRouter isFederationAdmin |

---

## Arhitectura DB finală (înlocuiește sistemul vechi)

### Ce s-a schimbat față de planul inițial

Planul inițial prevedea câmpuri text `quyen_ales`/`quyen_ales_2` pe `inscrieri_competitie`. **Acestea au fost înlocuite** cu sistem normalizat complet:

| Vechi (eliminat) | Nou |
|------------------|-----|
| `drepturi_grad_competitie` (text[]) | `inlantuiri` + `inlantuiri_grade` (FK reale) |
| `inscrieri_competitie.quyen_ales` (text) | `inscrieri_competitie.inlantuire_id` (UUID FK) |
| `inscrieri_competitie.quyen_ales_2` (text) | `inscrieri_competitie.inlantuire_id_2` (UUID FK) |
| `inscrieri_competitie.arma_ales` (text) | `inscrieri_competitie.inlantuire_id` (refolosit pentru CVD) |
| `echipe_competitie.quyen_ales` (inexistent în DB) | `echipe_competitie.inlantuire_id` (UUID FK) |

### Tabel `inlantuiri`
```sql
CREATE TABLE inlantuiri (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  denumire   text NOT NULL UNIQUE,
  ordine     integer NOT NULL DEFAULT 0,
  activ      boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```
Seed: ~40 înlănțuiri (13 Thao Quyen, 7 Song Luyen, 15 Thao Lo CVD, 12 arme CVD).

### Tabel `inlantuiri_grade` (junction)
```sql
CREATE TABLE inlantuiri_grade (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inlantuire_id  uuid NOT NULL REFERENCES inlantuiri(id) ON DELETE CASCADE,
  grade_id       uuid NOT NULL REFERENCES grade(id) ON DELETE CASCADE,
  tip_proba      text NOT NULL CHECK (tip_proba IN (
                   'thao_quyen_individual', 'sincron', 'song_luyen',
                   'thao_lo_individual', 'giao_dau')),
  UNIQUE (inlantuire_id, grade_id, tip_proba)
);
```

### Modificări tabele existente
- `inscrieri_competitie`: ADD `inlantuire_id uuid FK`, `inlantuire_id_2 uuid FK`; DROP `quyen_ales`, `quyen_ales_2`, `arma_ales`
- `echipe_competitie`: ADD `inlantuire_id uuid FK`
- `categorii_competitie`: ADD `doua_quyenuri boolean DEFAULT false`
- `inscrieri_competitie`: DROP `acord_parental`

**Migrație completă:** `supabase/migrations/20260508_inlantuiri_normalizate.sql`

---

## Wizard — starea implementării

### `PickCategorie` (state intern Pas2)
```typescript
export interface PickCategorie {
  inlantuire_id?: string;  // UUID, era: quyen_ales (text)
  acord_parental?: boolean; // rămas în interfață, drop din DB
}
```

### `DreptGrad` (fetch din `inlantuiri_grade`)
```typescript
interface DreptGrad {
  grade_id: string;        // era: grad_ordine: number
  tip_proba: string;
  inlantuiri: Inlantuire[]; // era: programe_permise: string[]
}
```

### Fetch pattern (3 locuri în wizard)
```typescript
const { data } = await supabase
  .from('inlantuiri_grade')
  .select('grade_id, tip_proba, inlantuiri!inlantuire_id(id, denumire, ordine, activ)');
// Cast: as unknown as { grade_id: string; tip_proba: string; inlantuiri: Inlantuire | null }[]
```
Hint `!inlantuire_id` necesar — tabela are 2 FK spre `inlantuiri`.

### Submit payload
```typescript
// Individual:
inlantuire_id: pick?.q1 || undefined,      // UUID
inlantuire_id_2: pick?.q2 || undefined,    // UUID

// Echipă:
inlantuire_id: rand.echipa.program ?? null // UUID
```

### Display (Pas4 sumar)
```typescript
// Fetch la mount Pas4:
supabase.from('inlantuiri').select('id, denumire, ordine, activ')
// → inlantuiriById: Map<string, Inlantuire>

// Render:
inlantuiriById.get(rand.inlantuire_id)?.denumire ?? '—'
```

---

## TODO — ce mai rămâne

### TODO 1: Aplicare migrație în Supabase
```
mcp__plugin_supabase__apply_migration
fișier: supabase/migrations/20260508_inlantuiri_normalizate.sql
```
**Atenție:** distructiv — drop coloane + drop tabel. Backup recomandat înainte.

### TODO 2: Admin UI înlănțuiri (SUPER_ADMIN_FEDERATIE)

**Rută:** `/inlantuiri-admin`  
**Acces:** doar `SUPER_ADMIN_FEDERATIE`

**Fișiere de creat:**

#### `components/InlantuciriAdmin.tsx` — pagina principală
- Tabel: denumire | ordine | activ | acțiuni (Edit / Delete)
- Buton "Adaugă înlănțuire" → deschide `InlantuireFormModal`
- Click pe rând → expandabil sau drawer cu `InlantuireGradePanel`
- Filtre: tip (Thao Quyen / Song Luyen / CVD forme / Arme CVD) — via `ordine` ranges

#### `components/InlantuireFormModal.tsx` — add/edit
```typescript
interface Props {
  inlantuire?: Inlantuire;  // undefined = add, set = edit
  onSave: (values: Partial<Inlantuire>) => void;
  onClose: () => void;
}
// Câmpuri: denumire (text), ordine (number), activ (toggle)
```

#### `components/InlantuireGradePanel.tsx` — asociere grade × tip_proba
```typescript
interface Props {
  inlantuireId: string;
}
// Afișează matricea: grade (rânduri) × tip_proba (coloane) cu checkboxuri
// Toggle = insert/delete în inlantuiri_grade
// Fetch: grade + inlantuiri_grade WHERE inlantuire_id = inlantuireId
```

**Hooks necesari:**
```typescript
// hooks/useInlantuiri.ts
const { inlantuiri, addInlantuire, updateInlantuire, deleteInlantuire } = useInlantuiri();

// hooks/useInlantuiriGrade.ts
const { asocieri, toggle } = useInlantuiriGrade(inlantuireId);
```

### TODO 3: Meniu + rută

#### `components/menuConfig.ts`
Adaugă item în secțiunea SUPER_ADMIN_FEDERATIE:
```typescript
{
  path: '/inlantuiri-admin',
  label: 'Înlănțuiri',
  icon: ListIcon,
  roles: ['SUPER_ADMIN_FEDERATIE'],
}
```

#### `components/AppRouter.tsx`
```typescript
<Route path="/inlantuiri-admin" element={
  <RequireRole roles={['SUPER_ADMIN_FEDERATIE']}>
    <InlantuciriAdmin />
  </RequireRole>
} />
```

---

## Verificare end-to-end (după TODO 1 aplicat)

1. Wizard Pas2 → dropdown înlănțuiri populat per grad (fetch `inlantuiri_grade`)
2. Submit → `inscrieri_competitie.inlantuire_id` = UUID valid (nu text)
3. Sumar Pas4 → afișează `denumire` corect (via `inlantuiriById`)
4. Echipă → `echipe_competitie.inlantuire_id` = UUID valid
5. Admin UI: adaugă înlănțuire → apare imediat în dropdown wizard (fără cache bust)
6. Admin UI: dezactivează (`activ=false`) → dispare din dropdown (wizard filtrează `activ=true`)
7. ADMIN_CLUB → `/inlantuiri-admin` → 403 (RLS SUPER_ADMIN_FEDERATIE only)
8. Sincron: dropdown folosește `grad_min` al echipei (nu gradul fiecărui sportiv individual)

---

## Fișiere modificate (rezumat)

| Fișier | Status | Ce s-a schimbat |
|--------|--------|-----------------|
| `supabase/migrations/20260508_inlantuiri_normalizate.sql` | ✅ creat | Schema completă, neaplicat în Supabase |
| `types.ts` | ✅ done | `Inlantuire`, `InlantuireGrad`; `InscriereCompetitie` cu `inlantuire_id/2` |
| `components/Competitii/InscriereClubWizard.tsx` | ✅ done | `PickCategorie`, `DreptGrad`, 3 fetch-uri, dropdown, submit, Pas4 display |
| `components/InlantuciriAdmin.tsx` | ✅ DONE | tabel + expand + CRUD |
| `components/InlantuireFormModal.tsx` | ✅ DONE | add/edit denumire/ordine/activ |
| `components/InlantuireGradePanel.tsx` | ✅ DONE | matrice grade × tip_proba checkboxuri |
| `hooks/useInlantuiri.ts` | ✅ DONE | CRUD hook |
| `hooks/useInlantuiriGrade.ts` | ✅ DONE | toggle asocieri per inlantuire |
| `components/menuConfig.ts` | ✅ DONE | item Înlănțuiri în Setări & Admin |
| `components/AppRouter.tsx` | ✅ DONE | rută inlantuiri-admin, guard isFederationAdmin |
