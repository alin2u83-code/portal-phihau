---
phase: quick-260626-buf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - sql/migrations/create_perioade_vacanta.sql
  - types.ts
  - components/Plati/PerioadaVacanta.tsx
  - components/menuConfig.ts
  - components/LazyComponents.tsx
  - components/AppRouter.tsx
autonomous: true
requirements:
  - VACANTA-01  # CRUD perioade vacanță per club
  - VACANTA-02  # Admin selectează manual participanți per perioadă
  - VACANTA-03  # Navigare via meniu Financiar & Plăți
must_haves:
  truths:
    - "Admin vede lista de perioade de vacanță pentru clubul activ"
    - "Admin poate crea o perioadă nouă cu denumire, data_start, data_end"
    - "Admin poate edita denumirea și datele unei perioade existente"
    - "Admin poate șterge o perioadă (cu confirmare care afișează nr. participanți)"
    - "Admin poate expanda o perioadă și vede lista participanților"
    - "Admin poate adăuga sportivi la perioadă prin modal multi-select cu search"
    - "Admin poate scoate un sportiv individual din perioadă (buton X)"
    - "Meniul 'Financiar & Plăți' conține intrarea 'Vacanțe Antrenamente'"
  artifacts:
    - path: "sql/migrations/create_perioade_vacanta.sql"
      provides: "DDL + RLS pentru perioade_vacanta și participare_vacanta"
      contains: "CREATE TABLE.*perioade_vacanta"
    - path: "types.ts"
      provides: "PerioadaVacanta, ParticipareVacanta interfaces + 'perioade-vacanta' în View"
      contains: "interface PerioadaVacanta"
    - path: "components/Plati/PerioadaVacanta.tsx"
      provides: "Componenta UI completă — list + CRUD + participanți"
      exports: ["PerioadaVacantaView"]
    - path: "components/menuConfig.ts"
      provides: "Intrare 'Vacanțe Antrenamente' în submenu Financiar & Plăți"
      contains: "perioade-vacanta"
    - path: "components/LazyComponents.tsx"
      provides: "Lazy import PerioadaVacantaView"
      contains: "PerioadaVacantaView"
    - path: "components/AppRouter.tsx"
      provides: "case 'perioade-vacanta' în switch"
      contains: "perioade-vacanta"
  key_links:
    - from: "components/menuConfig.ts"
      to: "components/AppRouter.tsx"
      via: "view string 'perioade-vacanta'"
      pattern: "'perioade-vacanta'"
    - from: "components/AppRouter.tsx"
      to: "components/LazyComponents.tsx"
      via: "Lazy.PerioadaVacantaView"
      pattern: "Lazy\\.PerioadaVacantaView"
    - from: "components/Plati/PerioadaVacanta.tsx"
      to: "Supabase tables"
      via: "supabase.from('perioade_vacanta') + supabase.from('participare_vacanta')"
      pattern: "perioade_vacanta"
---

<objective>
Sistem complet de gestionare a perioadelor de antrenamente de vacanță per club.

Purpose: Adminul de club definește intervale de date (vacanțe), selectează manual sportivii participanți, și poate gestiona multiple perioade pe an. Prezența se face prin sistemul Prezență existent — nu se duplica logica.

Output:
- Migrație SQL cu 2 tabele noi + RLS
- Tipuri TypeScript integrate în types.ts
- Componenta self-contained components/Plati/PerioadaVacanta.tsx
- Wiring complet: menu → LazyComponents → AppRouter
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260626-buf-task-3-perioade-vacanta-antrenamente/260626-buf-CONTEXT.md
@.planning/quick/260626-buf-task-3-perioade-vacanta-antrenamente/260626-buf-RESEARCH.md
@.planning/STATE.md

<!-- Referințe structurale cheie -->
@types.ts
@components/menuConfig.ts
@components/LazyComponents.tsx
@components/Plati/TaxeAnuale.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: SQL Migration + TypeScript Types</name>
  <files>sql/migrations/create_perioade_vacanta.sql, types.ts</files>
  <action>
Creează fișierul `sql/migrations/create_perioade_vacanta.sql` cu conținut exact conform RESEARCH.md §1 și §2:

**Tabel 1 — `perioade_vacanta`:**
- Coloane: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `club_id UUID NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE`, `denumire TEXT NOT NULL`, `data_start DATE NOT NULL`, `data_end DATE NOT NULL`
- Constraint: `CONSTRAINT vacanta_date_valide CHECK (data_end >= data_start)`
- Index pe `club_id` și index compus pe `(data_start, data_end)`

**Tabel 2 — `participare_vacanta`:**
- Coloane: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `perioada_id UUID NOT NULL REFERENCES public.perioade_vacanta(id) ON DELETE CASCADE`, `sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE RESTRICT`
- Constraint UNIQUE: `(perioada_id, sportiv_id)`
- Indexuri pe `perioada_id` și `sportiv_id`

**RLS — Pattern identic cu fix_rls_all_tables.sql** (RESEARCH.md §2):
- SELECT: `USING (true)` pentru `authenticated` pe ambele tabele
- ALL (INSERT/UPDATE/DELETE): `USING (EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')))` pe ambele tabele

**În `types.ts`**, fă două modificări:

Modificarea 1 — adaugă `'perioade-vacanta'` în union type `View` (linia 536). Adaugă-l la sfârșitul string-urilor existente, înainte de `;`.

Modificarea 2 — adaugă la capătul fișierului (după linia 983, după `}` final) blocul:

```
// ===================================================
// Domain: Vacanță Antrenamente
// ===================================================

export interface PerioadaVacanta {
  id: string;
  created_at: string;
  club_id: string;
  denumire: string;
  data_start: string;  // 'YYYY-MM-DD' (DATE din Postgres)
  data_end: string;    // 'YYYY-MM-DD'
}

export interface ParticipareVacanta {
  id: string;
  created_at: string;
  perioada_id: string;
  sportiv_id: string;
  // câmp joined pentru display
  sportivi?: {
    id: string;
    nume: string;
    prenume: string;
    grad_actual_id: string | null;
    status: string;
  };
}
```

Nu crea fișiere de tipuri separate — toate tipurile rămân în `types.ts` conform convenției proiectului.
  </action>
  <verify>
    <automated>grep -c "perioade_vacanta" "C:/Users/lungu/portal-phihau/sql/migrations/create_perioade_vacanta.sql" && grep -c "PerioadaVacanta" "C:/Users/lungu/portal-phihau/types.ts" && grep -c "perioade-vacanta" "C:/Users/lungu/portal-phihau/types.ts"</automated>
  </verify>
  <done>
    - `sql/migrations/create_perioade_vacanta.sql` există cu ambele tabele + RLS pentru ambele
    - `types.ts` conține `PerioadaVacanta` și `ParticipareVacanta` interfaces
    - `types.ts` View union include `'perioade-vacanta'`
  </done>
</task>

<task type="auto">
  <name>Task 2: Componenta PerioadaVacanta.tsx</name>
  <files>components/Plati/PerioadaVacanta.tsx</files>
  <action>
Creează `components/Plati/PerioadaVacanta.tsx` — componentă self-contained (fără props masive, ia datele din context și Supabase direct).

**Import-uri necesare:**
- `React, { useState, useEffect, useCallback }` din 'react'
- `PerioadaVacanta, ParticipareVacanta` din '../../types'
- `Button, Input, Card, Modal` din '../ui'
- `ArrowLeftIcon, PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon, SearchIcon, UsersIcon, CalendarIcon` din '../icons' (verifică ce există în icons — folosește ce e disponibil)
- `supabase` din '../../supabaseClient'
- `useError` din '../ErrorProvider'
- `ConfirmDeleteModal` din '../ConfirmDeleteModal'
- `useData` din '../../contexts/DataContext'
- `format` din 'date-fns' (sau scrie helper local `formatDataRo` ca în TaxeAnuale.tsx)

**Props:**
```typescript
interface PerioadaVacantaViewProps {
  onBack: () => void;
}
export const PerioadaVacantaView: React.FC<PerioadaVacantaViewProps> = ({ onBack }) => { ... }
```

**State local:**
- `perioade: PerioadaVacanta[]` — lista perioadelor clubului
- `loading: boolean` — stare fetch inițial
- `expandedId: string | null` — perioadă expandată
- `participari: Record<string, ParticipareVacanta[]>` — map perioadaId → participanți (cu join sportivi)
- `loadingParticipari: Record<string, boolean>` — stare fetch per perioadă
- `modalState: { mode: 'add' | 'edit'; item?: PerioadaVacanta } | null` — modal CRUD
- `perioadaToDelete: PerioadaVacanta | null` — confirmare ștergere
- `isDeleting: boolean`
- `adaugaParticipantiPerioadaId: string | null` — modal multi-select participanți

**Date din context** (pattern identic cu TaxeAnuale.tsx):
```typescript
const { filteredData, activeRoleContext, currentUser, permissions } = useData();
const sportiviActivi = filteredData.sportivi.filter(s => s.status === 'Activ');
const clubId = activeRoleContext?.club_id;
const isAdmin = permissions?.isAdminClub || permissions?.isFederationAdmin;
```

**Fetch perioade** (direct Supabase, nu React Query):
```typescript
const fetchPerioade = useCallback(async () => {
  if (!clubId) return;
  setLoading(true);
  const { data, error } = await supabase
    .from('perioade_vacanta')
    .select('*')
    .eq('club_id', clubId)
    .order('data_start', { ascending: false });
  if (error) showError('Eroare', error);
  else setPerioade(data ?? []);
  setLoading(false);
}, [clubId]);

useEffect(() => { fetchPerioade(); }, [fetchPerioade]);
```

**Fetch participanți** (la expand):
```typescript
const fetchParticipanti = async (perioadaId: string) => {
  setLoadingParticipari(prev => ({ ...prev, [perioadaId]: true }));
  const { data, error } = await supabase
    .from('participare_vacanta')
    .select('*, sportivi(id, nume, prenume, grad_actual_id, status)')
    .eq('perioada_id', perioadaId);
  if (!error) setParticipari(prev => ({ ...prev, [perioadaId]: data ?? [] }));
  setLoadingParticipari(prev => ({ ...prev, [perioadaId]: false }));
};

const handleToggleExpand = (id: string) => {
  if (expandedId === id) { setExpandedId(null); return; }
  setExpandedId(id);
  if (!participari[id]) fetchParticipanti(id);
};
```

**CRUD Perioadă:**
- `handleSavePeriada` — INSERT sau UPDATE în `perioade_vacanta`, validează că `data_start <= data_end` și că `denumire` nu e goală, then `fetchPerioade()` și închide modal
- `handleDeletePeriada` — verifică `(participari[id] ?? []).length` — afișează în mesaj count-ul, then DELETE din `perioade_vacanta` (CASCADE șterge participările), then `fetchPerioade()`
- La delete: mesajul din ConfirmDeleteModal trebuie să afișeze: `"Perioadă '${p.denumire}' va fi ștearsă${count > 0 ? ` împreună cu ${count} participanți` : ''}."`

**Scoatere participant individual:**
```typescript
const handleRemoveParticipant = async (participareId: string, perioadaId: string) => {
  await supabase.from('participare_vacanta').delete().eq('id', participareId);
  fetchParticipanti(perioadaId); // re-fetch lista după ștergere
};
```

**Layout principal:**
```
<div className="p-4 md:p-6">
  <div className="flex items-center gap-3 mb-6">
    <Button variant="ghost" onClick={onBack}><ArrowLeftIcon /></Button>
    <h1>Vacanțe Antrenamente</h1>
    {isAdmin && <Button onClick={() => setModalState({ mode: 'add' })}><PlusIcon /> Adaugă Perioadă</Button>}
  </div>

  {loading ? <LoadingState /> : perioade.length === 0 ? <EmptyState /> : (
    <div className="space-y-3">
      {perioade.map(p => (
        <Card key={p.id}>
          <!-- Header card: denumire + date interval + nr participanți + butoane edit/delete + chevron expand -->
          <!-- Body (dacă expandedId === p.id): lista participanți + buton Adaugă Participanți -->
        </Card>
      ))}
    </div>
  )}
</div>
```

**Header card perioadă** (o linie, flex justify-between):
- Stânga: denumire (font-semibold), data_start–data_end (text-sm text-muted), badge nr participanți
- Dreapta (isAdmin): PencilIcon (edit), TrashIcon (delete), ChevronDown/Up (expand)

**Lista participanți expandată:**
- Rând per participant: `${s.sportivi.prenume} ${s.sportivi.nume}` + buton X (handleRemoveParticipant)
- Buton "Adaugă Participanți" la final (deschide modal multi-select)
- Dacă loadingParticipari[p.id]: spinner

**Modal CRUD Perioadă** (`modalState !== null`):
- titlu: "Adaugă Perioadă" sau "Editează Perioadă"
- Input "Denumire" (required)
- Input type="date" "Data Start"
- Input type="date" "Data Sfârșit"
- Validare: data_end >= data_start (eroare inline)
- Butoane: Anulează + Salvează

**Modal Adaugă Participanți** (`adaugaParticipantiPerioadaId !== null`):
Pattern exact din `components/Grupe/AdaugaSportiviModal.tsx` (RESEARCH.md §4):
- State local al modalului: `selected: Set<string>`, `searchTerm: string`
- Lista sportiviActivi filtrați: exclude deja participanți în această perioadă + filtrare după searchTerm (`${s.prenume} ${s.nume}`)
- Rând clickabil → toggle în Set (nu checkbox HTML nativ — click pe rând schimbă selecția)
- Indicator vizual selecție: `bg-blue-50 dark:bg-blue-900/30` sau marcaj similar
- Buton "Selectează tot" / "Deselectează tot"
- Counter "X selecționate" în header modal
- Buton "Adaugă (X)" dezactivat dacă selected.size === 0
- La save: bulk insert `Array.from(selected).map(sid => ({ perioada_id, sportiv_id: sid }))`
- După save: `fetchParticipanti(perioadaId)`, închide modal, golește selected

**ConfirmDeleteModal** pentru perioadă — folosește componenta importată, nu `window.confirm`.

**Helper formatare dată:**
```typescript
function formatDataRo(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}
```

Nu folosi `date-fns` sau import extern — scrie helper local consistent cu TaxeAnuale.tsx.

Nu adăuga funcționalitate de opt-in din dashboard sportiv (decizie user).
Nu genera factură automată (decizie user).
Nu crea sistem de prezență separat (decizie user).
  </action>
  <verify>
    <automated>grep -c "PerioadaVacantaView" "C:/Users/lungu/portal-phihau/components/Plati/PerioadaVacanta.tsx" && grep -c "participare_vacanta" "C:/Users/lungu/portal-phihau/components/Plati/PerioadaVacanta.tsx"</automated>
  </verify>
  <done>
    - `components/Plati/PerioadaVacanta.tsx` există și exportă `PerioadaVacantaView`
    - Componenta include CRUD pentru perioade (add/edit/delete cu confirmare)
    - Componenta include management participanți (multi-select add + remove individual)
    - TypeScript: `npx tsc --noEmit` nu returnează erori în acest fișier
  </done>
</task>

<task type="auto">
  <name>Task 3: App Wiring — Menu + LazyComponents + AppRouter</name>
  <files>components/menuConfig.ts, components/LazyComponents.tsx, components/AppRouter.tsx</files>
  <action>
Trei modificări mici de wiring. Ordinea nu contează (fișiere independente).

**1. `components/menuConfig.ts`** — Adaugă intrarea în AMBELE meniuri (adminMenu pentru SUPER_ADMIN și adminClubMenu pentru ADMIN_CLUB). Localizează submenu-ul "Financiar & Plăți" și inserează după intrarea `{ label: 'Taxe Anuale', view: 'taxe-anuale' }` (liniile ~72 și ~156):

```typescript
{ label: 'Vacanțe Antrenamente', view: 'perioade-vacanta' },
```

Verifică că adaugi în ambele apariții (adminMenu + adminClubMenu) — RESEARCH.md §3 confirmă că sunt două locuri distincte.

**2. `components/LazyComponents.tsx`** — Adaugă import lazy după intrarea existentă pentru TaxeAnuale (linia ~27):

```typescript
export const PerioadaVacantaView = lazy(() =>
  import('./Plati/PerioadaVacanta').then(m => ({ default: m.PerioadaVacantaView }))
);
```

**3. `components/AppRouter.tsx`** — Adaugă case în switch, după case `'taxe-anuale'` (linia ~248). Folosește pattern identic cu TaxeAnuale:

```typescript
case 'perioade-vacanta':
  return renderProtected(
    <Lazy.PerioadaVacantaView onBack={handleBackToDashboard} />,
    isAtLeastClubAdmin
  );
```

Permisiunea `isAtLeastClubAdmin` este corectă (ADMIN_CLUB sau SUPER_ADMIN_FEDERATIE pot gestiona vacanțele clubului) — conform cu celelalte view-uri administrative financiare.
  </action>
  <verify>
    <automated>grep -c "perioade-vacanta" "C:/Users/lungu/portal-phihau/components/menuConfig.ts" && grep -c "PerioadaVacantaView" "C:/Users/lungu/portal-phihau/components/LazyComponents.tsx" && grep -c "perioade-vacanta" "C:/Users/lungu/portal-phihau/components/AppRouter.tsx"</automated>
  </verify>
  <done>
    - `menuConfig.ts` conține `'perioade-vacanta'` în AMBELE meniuri (count >= 2)
    - `LazyComponents.tsx` exportă `PerioadaVacantaView` ca lazy import
    - `AppRouter.tsx` are `case 'perioade-vacanta'` cu `renderProtected` și `isAtLeastClubAdmin`
    - TypeScript compile: `npx tsc --noEmit` returnează exit 0
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→Supabase | Mutații (INSERT/DELETE în perioade_vacanta, participare_vacanta) trec prin Supabase RLS |
| admin UI→DB | UI acceptă input de text (denumire, date) — XSS și injection posibile |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-BUF-01 | Elevation of Privilege | RLS perioade_vacanta / participare_vacanta | mitigate | politica `utilizator_roluri_multicont` verifică rol ADMIN_CLUB/SUPER_ADMIN la fiecare write — implementat în SQL migration (Task 1) |
| T-BUF-02 | Tampering | Input `denumire` (text liber) | accept | Supabase parameterizează automat string-urile; XSS e mitigat de React DOM escaping |
| T-BUF-03 | Information Disclosure | SELECT USING(true) | accept | Filtrare client-side pe `club_id` din `activeRoleContext` — pattern existent în tot proiectul, risc acceptat |
| T-BUF-04 | Tampering | Date interval invalid (`data_end < data_start`) | mitigate | DB CHECK constraint + validare UI înainte de save (Task 2) |
| T-BUF-05 | Denial of Service | Ștergere perioadă cu mulți participanți | accept | CASCADE la nivel DB e atomic; confirmare UI previne ștergerea accidentală |
</threat_model>

<verification>
Verificare finală după toate cele 3 task-uri:

```bash
# 1. Migrație SQL există și are ambele tabele
grep -c "CREATE TABLE" "C:/Users/lungu/portal-phihau/sql/migrations/create_perioade_vacanta.sql"
# Expected: 2

# 2. View type extins
grep -v '^//' "C:/Users/lungu/portal-phihau/types.ts" | grep -c "perioade-vacanta"
# Expected: >= 1

# 3. Componenta exportă corect
grep -c "export const PerioadaVacantaView" "C:/Users/lungu/portal-phihau/components/Plati/PerioadaVacanta.tsx"
# Expected: 1

# 4. Menu wiring în ambele meniuri
grep -c "perioade-vacanta" "C:/Users/lungu/portal-phihau/components/menuConfig.ts"
# Expected: 2 (adminMenu + adminClubMenu)

# 5. TypeScript compile fără erori
cd "C:/Users/lungu/portal-phihau" && npx tsc --noEmit
# Expected: exit 0
```
</verification>

<success_criteria>
- Admin de club poate accesa "Vacanțe Antrenamente" din meniu Financiar & Plăți
- Poate crea/edita/șterge perioade cu interval de date validat
- Poate adăuga sportivi activi din club la o perioadă prin modal cu search și multi-select
- Poate scoate individual un sportiv din perioadă cu buton X
- Ștergerea unei perioade cu participanți afișează confirmarea cu numărul lor
- TypeScript compile trece fără erori noi
- Prezența vacanței rămâne pe sistemul existent (nu s-a creat logică paralelă)
</success_criteria>

<output>
Creează `.planning/quick/260626-buf-task-3-perioade-vacanta-antrenamente/260626-buf-SUMMARY.md` după execuție cu:
- Fișierele create/modificate
- Decizie luată pentru cazuri edge (ex: sportiv deja în altă perioadă activă — permis, fără restricție)
- Orice deviere de la plan + motivare
</output>
