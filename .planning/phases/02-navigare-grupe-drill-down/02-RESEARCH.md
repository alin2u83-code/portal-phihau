# Phase 02: Navigare Grupe Drill-Down — Research

**Researched:** 2026-06-05
**Domain:** React SPA component refactoring — drill-down view, tab UI, inline logic extraction
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** GrupaDetailView se montează ca state local în `Grupe/index.tsx` — `grupaSelectedForDetail` state; render conditionat (`{grupaSelectedForDetail ? <GrupaDetailView> : <gridCarduri>}`). Nu NavigationContext view swap (ar conflicta cu z-index-ul modalelor existente).
- **D-02:** Logica din OrarEditorModal se **copiează direct** în componenta Tab Orar (nu se extrage o componentă partajată). OrarEditorModal rămâne neschimbat — zero risc de regresie.
- **D-03:** Butonul "Anulează" în Tab Orar inline → **resetează state-ul local** la `grupa.program` original (Undo). Nu navighează.
- **D-04:** După "Salvează Orar" cu succes → **toast succes + rămâne în Tab Orar** cu datele actualizate.
- **D-05:** Tab Sportivi = **lista sportivilor inline** (query separat) + butonul "Adaugă Sportivi" care deschide **AdaugaSportiviModal existent** ca modal separat. Nu se copiază inline.
- **D-06:** Lista sportivilor în tab = **read-only** (nume + grad). Nicio acțiune de scoatere.
- **D-07:** "Detalii" = **buton primar CTA** care **înlocuiește** butoanele "Orar" și "Sportivi" de pe card. Card final: `[Detalii]` (primary) | `[Gestionează]` (secondary) | `[...]` (dropdown).
- **D-08:** Butonul "Gestionează" (deschide GrupaFormModal) **rămâne** pe card.
- **D-09:** Tab implicit la deschidere: **Antrenamente**.
- **D-10:** Tab Antrenamente în Phase 2 = **placeholder** ("Calendar antrenamente — disponibil în curând"). Calendarul vine în Phase 3.

### Claude's Discretion

- Formatul exact al placeholder-ului Tab Antrenamente (decis în UI-SPEC: `border-dashed border-2 border-slate-700 rounded-xl py-12` centered card).
- Metoda cache-update după salvare orar în Tab Orar (decis: `queryClient.invalidateQueries` fără `setGrupe` state setter — Tab Orar nu primește `setGrupe` ca prop, invalidează React Query direct).

### Deferred Ideas (OUT OF SCOPE)

- Tab suplimentar "Editează Grupă" în GrupaDetailView
- Acțiuni per sportiv în Tab Sportivi (scoatere din grupă)
- Navigare directă la un tab specific din GrupaCard
- Calendarul complet Tab Antrenamente (Phase 3)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | GrupaCard are buton/acțiune "Detalii" care deschide GrupaDetailView | D-07: înlocuiește butoanele Orar+Sportivi; `onDetalii` prop nou; `onAdaugaSportivi`+`onConfigurareOrar` rămân în index.tsx pentru AdaugaSportiviModal și OrarEditorModal existent |
| NAV-02 | GrupaDetailView afișează tab-uri: Antrenamente / Orar / Sportivi — tab activ persistent la navigare back/forward | D-09: tab implicit Antrenamente; state local `useState<tab>('antrenamente')` în GrupaDetailView; persistat cât timp componenta e montată |
| NAV-03 | Tab Orar conține funcționalitatea din OrarEditorModal inline; Tab Sportivi afișează lista + buton Adaugă Sportivi | D-02: logica copiată din OrarEditorModal liniile 22-173; D-05: query separat + AdaugaSportiviModal deschis ca modal |
</phase_requirements>

---

## Summary

Phase 2 este o refactorizare UI pură a modulului Grupe: nu se introduc noi tabele DB, nu se modifică API-ul Supabase, nu se instalează pachete noi. Toate deciziile de arhitectură sunt deja blocate în CONTEXT.md. Cercetarea confirmă că abordarea aleasă este solidă și urmează patternurile stabilite în codebase.

Componentele existente (`OrarEditorModal`, `AdaugaSportiviModal`, `GrupaCard`, `Grupe/index.tsx`) sunt bine înțelese — codul sursă a fost citit integral. Patternul de view swap prin state local în parent este deja folosit în codebase (ex: `selectedSportiv` → `profil-sportiv` via `setActiveView` în AppRouter; tab-uri locale în `Competitii/index.tsx`). Phase 2 urmează exact aceste precedente.

Riscul principal identificat este **prop drilling**: `GrupaDetailView` are nevoie de `setGrupe` din DataContext pentru Tab Orar (cache update). Soluția recomandată: `queryClient.invalidateQueries({ queryKey: ['grupe'] })` direct în Tab Orar — evită prop drilling și e consistent cu patternul existent din `OrarEditorModal` (care deja face ambele: `setGrupe` + `invalidateQueries`).

**Primary recommendation:** Implementare ca state local în `Grupe/index.tsx` cu `grupaSelectedForDetail` — render conditionat fără NavigationContext. GrupaDetailView în fișier separat `components/Grupe/GrupaDetailView.tsx`. Tab Orar ca funcție inline în GrupaDetailView (copiat din OrarEditorModal liniile 22-173).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Drill-down navigation (card → detail view) | Frontend (state local) | — | State `grupaSelectedForDetail` în Grupe/index.tsx; render conditionat; nu NavigationContext (D-01) |
| Tab switching | Frontend (state local GrupaDetailView) | — | `useState<tab>` în GrupaDetailView; nicio persistare între navigări (MVP) |
| Orar edit logic | Frontend → Database | — | Logica copiată din OrarEditorModal; write la `orar_saptamanal` via Supabase |
| Sportivi list (read-only) | Frontend → Database | — | Query separat `sportivi` filtrat pe `grupa_id`; read-only per D-06 |
| Add sportivi (modal) | Frontend → Database | — | AdaugaSportiviModal existent deschis ca modal; handlers deja în Grupe/index.tsx |
| GrupaCard button layout | Frontend | — | Modificare props: `onDetalii` adăugat; `onAdaugaSportivi`+`onConfigurareOrar` rămân în index.tsx |

---

## Standard Stack

### Core (no new packages)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React 18.3.1 | 18.3.1 | Componente, hooks, state local | Deja instalat |
| TypeScript 5.5.3 | 5.5.3 | Tipizare props, state | Deja instalat |
| Tailwind CSS 3.4.6 | 3.4.6 | Styling tab bar, layout GrupaDetailView | Deja instalat |
| @tanstack/react-query 5.90.21 | 5.90.21 | `useQuery` pentru sportivi, `invalidateQueries` | Deja instalat |
| @supabase/supabase-js 2.98.0 | 2.98.0 | Query sportivi per grupă, save orar | Deja instalat |
| react-hot-toast 2.6.0 | 2.6.0 | Toast succes/eroare după save orar | Deja instalat |

**Nicio instalare necesară.** Toate dependențele sunt deja în `package.json`.

---

## Package Legitimacy Audit

> Nu se instalează pachete noi în această fază. Audit nu este aplicabil.

**Packages removed due to slopcheck [SLOP] verdict:** none — no packages to install
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Detalii" on GrupaCard
        |
        v
onDetalii(grupa) prop call
        |
        v
Grupe/index.tsx: setGrupaSelectedForDetail(grupa)
        |
        v
Render: {grupaSelectedForDetail ? <GrupaDetailView> : <card grid>}
        |
        v
GrupaDetailView (new file: components/Grupe/GrupaDetailView.tsx)
   ├── Header: "← Înapoi la Grupe" + grup name + sala
   ├── Tab Bar: [Antrenamente*] [Orar] [Sportivi]
   │      (* default active per D-09)
   │
   ├── Tab: Antrenamente (placeholder per D-10)
   │      └── Dashed border empty state card
   │
   ├── Tab: Orar (logic copied from OrarEditorModal lines 22-173)
   │      ├── state: program, loading (local)
   │      ├── handleSave → supabase orar_saptamanal → invalidateQueries(['grupe']) → toast
   │      ├── handleAddItem / handleRemoveItem / handleItemChange
   │      └── Buttons: [Resetează] [Salvează Orar]
   │
   └── Tab: Sportivi
          ├── useQuery: supabase.from('sportivi').select(...).eq('grupa_id', grupa.id)
          ├── Read-only list: prenume + nume + grad_actual
          └── Button: "Adaugă Sportivi" → setGrupaForAdaugaSportivi(grupa) → AdaugaSportiviModal

Back navigation:
"← Înapoi la Grupe" → setGrupaSelectedForDetail(null)
Hardware back button → NavigationContext.goBack() [handled by existing App.tsx popstate]
```

### Recommended Project Structure

```
components/Grupe/
├── index.tsx              # MODIFICAT: adaugă grupaSelectedForDetail state + render conditionat
├── GrupaCard.tsx          # MODIFICAT: adaugă onDetalii prop, elimină Orar/Sportivi ca butoane principale
├── GrupaDetailView.tsx    # NOU: view complet cu tab bar + 3 tab-uri
├── OrarEditorModal.tsx    # NESCHIMBAT
├── AdaugaSportiviModal.tsx # NESCHIMBAT
├── GrupaFormModal.tsx     # NESCHIMBAT
├── OrarModificareModal.tsx # NESCHIMBAT
├── GrupeSecundareModal.tsx # NESCHIMBAT
├── GenerareAntrenamenteModal.tsx # NESCHIMBAT
└── ProgramEditor.tsx      # NESCHIMBAT
```

### Pattern 1: State-local View Swap (deja stabilit în codebase)

**What:** Parent component deține `selectedItem` state; render conditionat între list view și detail view.
**When to use:** Drill-down fără URL routing, în SPA cu NavigationContext.
**Precedent în codebase:** `profil-sportiv` view (AppRouter.tsx linia 103: `onViewSportiv` setează `selectedSportiv` + `setActiveView('profil-sportiv')`).

```typescript
// Source: VERIFIED — components/Grupe/index.tsx pattern (adaptat)
const [grupaSelectedForDetail, setGrupaSelectedForDetail] = useState<GrupaWithDetails | null>(null);

const handleDetaliiGrupa = (grupa: GrupaWithDetails) => {
    setGrupaSelectedForDetail(grupa);
};

// În JSX:
{grupaSelectedForDetail ? (
    <GrupaDetailView
        grupa={grupaSelectedForDetail}
        onBack={() => setGrupaSelectedForDetail(null)}
        onOpenAdaugaSportivi={(g) => setGrupaForAdaugaSportivi(g)}
    />
) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {grupe.map(grupa => (
            <GrupaCard key={grupa.id} ... onDetalii={handleDetaliiGrupa} />
        ))}
    </div>
)}
```

### Pattern 2: Tab Bar cu div+button (patternul codebase — fără componentă Tab din ui.tsx)

**What:** Tab strip implementat cu `div` + `button` native, nu Tab component dedicat.
**Evidence:** CONTEXT.md `code_context` explicit: "tab-urile se implementează cu div+className, nu o componentă Tab dedicată". Confirmat în `Competitii/index.tsx` liniile 886-969.

```typescript
// Source: VERIFIED — components/Competitii/index.tsx lines 886-969 (pattern copiat)
type TabId = 'antrenamente' | 'orar' | 'sportivi';
const [activeTab, setActiveTab] = useState<TabId>('antrenamente');

// Tab bar JSX:
<div className="flex border-b border-slate-700 px-4 sm:px-6 gap-1">
    {(['antrenamente', 'orar', 'sportivi'] as TabId[]).map(tab => (
        <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
            {tab === 'antrenamente' ? 'Antrenamente' : tab === 'orar' ? 'Orar' : 'Sportivi'}
        </button>
    ))}
</div>
```

### Pattern 3: Tab Orar — copiere logică din OrarEditorModal (fără wrapper Modal)

**What:** Logica din `OrarEditorModal` (liniile 22-173) se copiază în Tab Orar. Diferențe față de original:
1. Nu există `isOpen`/`onClose` props (nu e modal)
2. `React.useEffect([isOpen, grupa])` → înlocuit cu `React.useEffect([grupa.id])` (reset când se schimbă grupa)
3. `onClose()` după save → înlocuit cu toast + rămâne pe tab (D-04)
4. Buton "Anulează" → "Resetează", acțiune: `setProgram(grupa.program)` (D-03)
5. Nu mai există `max-h-[50vh]` pe scroll container — conținut full în tab
6. Cache update: `queryClient.invalidateQueries({ queryKey: ['grupe'] })` + `clearCache` (același pattern ca în OrarEditorModal, dar fără `setGrupe` prop — tab nu primește `setGrupe`)

**ATENȚIE:** `setGrupe` din OrarEditorModal (linia 49) face update optimistic al state-ului local. Tab Orar poate să omită asta în MVP (Phase 2) — invalidateQueries va re-fetcha datele. Dacă se dorește update optimistic, `setGrupe` trebuie primit ca prop sau GrupaDetailView trebuie să primească `setGrupe` din DataContext.

```typescript
// Source: VERIFIED — components/Grupe/OrarEditorModal.tsx lines 22-173 (adaptat)
// Schimbări față de original marcate cu comentariu PHASE2:

// PHASE2: nu mai există isOpen/onClose; grupă vine ca prop direct
const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
const [loading, setLoading] = useState(false);
const { showError, showSuccess } = useError();
const queryClient = useQueryClient();
const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

// PHASE2: reset când se schimbă grupa (nu isOpen)
React.useEffect(() => {
    setProgram(grupa.program || []);
}, [grupa.id]);

const handleSave = async () => {
    setLoading(true);
    try {
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
        const toInsert = program.map(({ id, ...rest }) => ({
            ...rest,
            grupa_id: grupa.id,
            club_id: grupa.club_id,
        }));
        if (toInsert.length > 0) {
            const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
            if (error) throw error;
        }
        // PHASE2: nu setGrupe prop — invalidăm React Query direct
        Object.keys(localStorage)
            .filter(k => k.startsWith('cache_grupe_'))
            .forEach(k => clearCache(k));
        await queryClient.invalidateQueries({ queryKey: ['grupe'] });
        showSuccess('Succes', 'Orarul a fost salvat.');
        // PHASE2: nu onClose() — rămânem pe tab (D-04)
    } catch (error: any) {
        showError('Eroare la salvare orar', error.message);
    } finally {
        setLoading(false);
    }
};
```

### Pattern 4: Query sportivi per grupă în Tab Sportivi

**What:** Tab Sportivi face query Supabase separat, nu din DataContext. Precedent direct în codebase: `InstructorPrezentaPage.tsx` linia 79 și `Prezenta/index.tsx` linia 80 fac exact `sportivi!grupa_id(id, nume, prenume, status, grad_actual_id)`.

```typescript
// Source: VERIFIED — hooks/useGrupe.ts + Prezenta/index.tsx lines 50, 80
// Query sportivi per grupă:
const { data: sportivi, isLoading, error } = useQuery({
    queryKey: ['sportivi-grupa', grupa.id],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('sportivi')
            .select('id, nume, prenume, grad_actual_id')
            .eq('grupa_id', grupa.id)
            .eq('status', 'Activ');
        if (error) throw error;
        return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
});
```

### Anti-Patterns to Avoid

- **Anti-pattern: NavigationContext view swap pentru GrupaDetailView** — D-01 explicit interzice asta. Ar necesita adăugarea unui View nou în `types.ts`, integrare în AppRouter, și ar pierde hardware back button. State local în Grupe/index.tsx e corect.
- **Anti-pattern: Extragerea logicii OrarEditorModal în componentă partajată** — D-02 explicit interzice. Risc de regresie. Copierea directă e intenționată.
- **Anti-pattern: Importul `setGrupe` din DataContext în GrupaDetailView** — creează cuplaj inutil. `queryClient.invalidateQueries` este suficient și urmează patternul existent.
- **Anti-pattern: Adăugarea `onAdaugaSportivi` și `onConfigurareOrar` ca butoane principale pe GrupaCard** — D-07 le înlocuiește cu un singur buton "Detalii". Butoanele individuale Orar+Sportivi dispar de pe card.
- **Anti-pattern: URL routing pentru tab state** — SPA fără URL routing per CLAUDE.md. Tab state rămâne local.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Mesaje de eroare custom | `useError().showError/showSuccess` din `ErrorProvider` | Deja integrat; consistent cu tot restul app |
| Loading spinner | SVG spinner custom | `Button isLoading={true}` din `components/ui.tsx` | Design system intern |
| Cache invalidation | Manual localStorage clear | `queryClient.invalidateQueries` + `clearCache` | Patternul existent din OrarEditorModal (identic) |
| Time formatting | Format manual | `formatTime` din `utils/date` | Folosit deja în GrupaCard |
| Program sorting | Sort manual | `sortProgram` din `ProgramEditor.tsx` | Importat deja în GrupaCard |

**Key insight:** Toată logica necesară există deja în codebase. Phase 2 este copy + adapt + wire-up — nu green-field development.

---

## Common Pitfalls

### Pitfall 1: Prop `onAdaugaSportivi` și `onConfigurareOrar` lăsate pe GrupaCard

**What goes wrong:** Dacă butoanele Sportivi+Orar sunt eliminate de pe card dar props-urile rămân definite în interfața GrupaCard, TypeScript va emite warning sau logica din index.tsx va continua să trimită handlere inutile.
**Why it happens:** Modificare parțială — se adaugă `onDetalii` dar nu se curăță celelalte props.
**How to avoid:** Eliminați `onAdaugaSportivi` și `onConfigurareOrar` din interfața `GrupaCard` și din call-ul din `index.tsx`. Aceste props rămân în index.tsx ca state handlers pentru `grupaForAdaugaSportivi` și `grupaForOrar` (OrarEditorModal e încă montat în index.tsx pentru backward compat), dar **nu mai sunt pasate** la GrupaCard.
**Warning signs:** TypeScript `unused prop` warning sau butoane fantomă pe card.

### Pitfall 2: `useEffect` reset orar în Tab Orar cu dependency greșit

**What goes wrong:** Dacă `useEffect` pentru reset program folosește `[grupa]` (obiect) în loc de `[grupa.id]`, resetul se va declanșa la fiecare re-render din cauza referinței noi de obiect.
**Why it happens:** Pattern din OrarEditorModal folosea `[isOpen, grupa]` — în context modal era OK pentru că `isOpen` era stable. Fără modal, dependency pe obiect e o capcană.
**How to avoid:** `useEffect(() => { setProgram(grupa.program || []); }, [grupa.id])` — dependency pe `string`, nu pe obiect.
**Warning signs:** Program se resetează la orice update din parent (ex: refetch grupe).

### Pitfall 3: `queryClient.invalidateQueries` fără `clearCache` localStorage

**What goes wrong:** React Query este invalidat dar cache-ul localStorage din `useGrupe` nu e curățat. La reload, datele vechi sunt servite din `getCachedData`.
**Why it happens:** Developer uită că `useGrupe` are două nivele de cache: React Query + `localStorage` custom cu key `cache_grupe_*`.
**How to avoid:** Copiați exact patternul din `OrarEditorModal` liniile 52-56: `Object.keys(localStorage).filter(k => k.startsWith('cache_grupe_')).forEach(k => clearCache(k))` ÎNAINTE de `queryClient.invalidateQueries`.
**Warning signs:** Orar pare salvat (toast apare) dar la refresh pagină datele vechi revin.

### Pitfall 4: AdaugaSportiviModal deschis din Tab Sportivi cu handler din GrupaDetailView

**What goes wrong:** Dacă Tab Sportivi definește propriul state `grupaForAdaugaSportivi` și încearcă să randeze `AdaugaSportiviModal` inline, va exista o dublare cu `AdaugaSportiviModal` din `Grupe/index.tsx`. Ambele pot fi deschise simultan sau stările pot intra în conflict.
**Why it happens:** Nu este clar unde ar trebui să se "trăiască" state-ul modalelor când GrupaDetailView e activ.
**How to avoid:** Tab Sportivi primește `onOpenAdaugaSportivi: (g: GrupaWithDetails) => void` ca prop de la GrupaDetailView care la rândul lui primește callback de la `Grupe/index.tsx`. Singurul `AdaugaSportiviModal` rămâne în `Grupe/index.tsx`, montat la același nivel cu toate celelalte modale.
**Warning signs:** Două instanțe de portal `ReactDOM.createPortal` cu `z-[9999]` suprapuse.

### Pitfall 5: GrupaCard — `nrSecundari` prop lipsă după refactorizare

**What goes wrong:** `GrupaCard` are prop `nrSecundari?: number` care afișează badge "N SECUNDARI" și numărul în dropdown Secundari. Actualizat în interfață dar nu pasat în `index.tsx`.
**Why it happens:** `index.tsx` curent (linia 241) nu pasează `nrSecundari` — e `undefined` deja (badge nu apare). La refactorizare se poate omite din noul call.
**How to avoid:** Noul call la GrupaCard în `index.tsx` să mențină `nrSecundari` ca prop opțional (poate rămâne `undefined` dacă nu e calculat).
**Warning signs:** Badge "SECUNDARI" dispare de pe card chiar dacă grupe secundare există (dar în stadiul actual oricum nu apare — `nrSecundari` nu e calculat în index.tsx).

---

## Code Examples

### GrupaDetailView — schelet complet

```typescript
// Source: VERIFIED — adaptat din OrarEditorModal.tsx + Competitii/index.tsx patterns
// File: components/Grupe/GrupaDetailView.tsx

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa, ProgramItem, Sportiv } from '../../types';
import { Button, Card } from '../ui';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';
import { formatTime } from '../../utils/date';
import { AdaugaSportiviModal } from './AdaugaSportiviModal';

interface GrupaWithDetails extends Grupa {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

type TabId = 'antrenamente' | 'orar' | 'sportivi';

interface GrupaDetailViewProps {
    grupa: GrupaWithDetails;
    onBack: () => void;
    onOpenAdaugaSportivi: (g: GrupaWithDetails) => void;
    totiSportivii: Sportiv[];
}

export const GrupaDetailView: React.FC<GrupaDetailViewProps> = ({
    grupa,
    onBack,
    onOpenAdaugaSportivi,
    totiSportivii,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('antrenamente');
    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;

    return (
        <div className="space-y-0">
            {/* Header */}
            <div className="flex items-center justify-between px-0 sm:px-0 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={onBack} className="min-h-[40px] touch-manipulation">
                        <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
                        Înapoi la Grupe
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-white">{grupa.denumire}</h1>
                        <p className="text-sm text-slate-400">
                            Sala: {grupa.sala || 'Nespecificată'} · {sportiviCount} sportivi activi
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-700 gap-1 mt-0">
                {(['antrenamente', 'orar', 'sportivi'] as TabId[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px capitalize ${
                            activeTab === tab
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="py-6 overflow-y-auto">
                {activeTab === 'antrenamente' && <TabAntrenamente />}
                {activeTab === 'orar' && <TabOrar grupa={grupa} />}
                {activeTab === 'sportivi' && (
                    <TabSportivi
                        grupa={grupa}
                        totiSportivii={totiSportivii}
                        onOpenAdaugaSportivi={onOpenAdaugaSportivi}
                    />
                )}
            </div>
        </div>
    );
};
```

### TabAntrenamente — placeholder (Phase 2)

```typescript
// Source: VERIFIED — UI-SPEC.md design contract
const TabAntrenamente: React.FC = () => (
    <div className="flex items-center justify-center py-12">
        <div className="border-dashed border-2 border-slate-700 rounded-xl py-12 px-8 text-center max-w-md">
            <h3 className="text-base font-bold text-white mb-2">
                Calendar antrenamente — disponibil în curând
            </h3>
            <p className="text-sm text-slate-400">
                Gestionarea completă a antrenamentelor va fi disponibilă în faza următoare.
                Folosește tab-ul Orar pentru a configura programul recurent.
            </p>
        </div>
    </div>
);
```

### TabSportivi — query + read-only list

```typescript
// Source: VERIFIED — adaptat din Prezenta/InstructorPrezentaPage.tsx pattern
interface TabSportiviProps {
    grupa: GrupaWithDetails;
    totiSportivii: Sportiv[];
    onOpenAdaugaSportivi: (g: GrupaWithDetails) => void;
}

const TabSportivi: React.FC<TabSportiviProps> = ({ grupa, totiSportivii, onOpenAdaugaSportivi }) => {
    const { data: sportivi = [], isLoading, error } = useQuery({
        queryKey: ['sportivi-grupa', grupa.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, grad_actual_id')
                .eq('grupa_id', grupa.id)
                .eq('status', 'Activ');
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) return <div className="text-center py-8 text-slate-400">Se încarcă...</div>;
    if (error) return <div className="text-center py-8 text-rose-400">Nu s-au putut încărca datele. Verifică conexiunea și încearcă din nou.</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wide">
                    {sportivi.length} sportivi activi
                </h3>
                <Button
                    variant="info"
                    size="sm"
                    onClick={() => onOpenAdaugaSportivi(grupa)}
                    className="min-h-[40px] touch-manipulation"
                >
                    Adaugă Sportivi
                </Button>
            </div>
            {sportivi.length === 0 ? (
                <Card className="text-center py-8">
                    <p className="text-slate-400 font-medium">Niciun sportiv în această grupă</p>
                    <p className="text-slate-500 text-sm mt-1">Adaugă primul sportiv folosind butonul de mai jos.</p>
                </Card>
            ) : (
                <div className="space-y-1">
                    {sportivi.map(s => (
                        <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                            <span className="text-sm text-slate-300">
                                {(s.prenume || '').toUpperCase()} {(s.nume || '').toUpperCase()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
```

### GrupaCard — modificări prop interface

```typescript
// Source: VERIFIED — GrupaCard.tsx lines 43-62 (modificat)
// PHASE2: Adaugă onDetalii. Elimină onAdaugaSportivi și onConfigurareOrar ca butoane.
// Props onAdaugaSportivi și onConfigurareOrar POT rămâne în interfață dacă alte locuri le folosesc,
// dar NU mai sunt afișate ca butoane principale pe card.
export const GrupaCard: React.FC<{
    grupa: GrupaWithDetails;
    onEdit: (g: GrupaWithDetails) => void;
    onDelete: (g: GrupaWithDetails) => void;
    onDetalii: (g: GrupaWithDetails) => void;           // NOU
    onModificareOrar?: (g: GrupaWithDetails) => void;
    onGestionareSecundari?: (g: GrupaWithDetails) => void;
    onGenerareAntrenamente?: (g: GrupaWithDetails) => void;
    nrSecundari?: number;
    // onAdaugaSportivi și onConfigurareOrar ELIMINATE din props
}> = ({ grupa, onEdit, onDelete, onDetalii, ... }) => {
    // ...
    // PHASE2: Butoane principale simplificate:
    // [Detalii] (primary/indigo) | [Gestionează] (secondary/slate) | [...]
    return (
        // ...
        <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-end flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => onDetalii(grupa)} className="min-h-[40px] touch-manipulation">
                Detalii
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onEdit(grupa)} className="min-h-[40px] touch-manipulation">
                Gestionează
            </Button>
            {/* [...] dropdown neschimbat */}
        </div>
    );
};
```

---

## State of the Art

| Old Approach | Current Approach | Impact in Phase 2 |
|--------------|------------------|-------------------|
| Butoane Orar+Sportivi direct pe card | Un singur buton Detalii + view drill-down | Card mai simplu; funcționalitate concentrată în GrupaDetailView |
| OrarEditorModal ca modal popup | Tab Orar inline în GrupaDetailView | Fără z-index conflicts; UX mai fluid; logica copiată, nu abstractizată |

**Nothing deprecated in Phase 2.** OrarEditorModal și AdaugaSportiviModal rămân neschimbate și funcționale.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `nrSecundari` nu este calculat în `index.tsx` — prop opțional nepasat | Pitfall 5 | Dacă e calculat undeva neobservat, poate dispărea după refactorizare |
| A2 | `grad_actual_id` este suficient pentru afișare grad în Tab Sportivi (fără join la `grade`) | TabSportivi query | Dacă UI-SPEC cere `grad_actual` ca string, query trebuie extins cu join |

**Nota:** A2 se rezolvă simplu — query poate include `.select('id, nume, prenume, grad_actual_id, grade:grade_actual_id(denumire)')` dacă denumirea gradului e necesară.

---

## Open Questions

1. **`setGrupe` prop în Tab Orar — update optimistic sau nu?**
   - Ce știm: OrarEditorModal face atât `setGrupe` (update optimistic local) cât și `invalidateQueries` (sync DB). Tab Orar poate omite `setGrupe` — `invalidateQueries` va re-fetcha.
   - Ce e neclar: Dacă există un lag vizibil între save și re-fetch care deranjează UX.
   - Recomandare: Omite `setGrupe` în Phase 2 MVP. Dacă UX-ul e acceptabil cu doar `invalidateQueries`, nu e nevoie de complicare. Planner poate adăuga `setGrupe` ca prop dacă UX validation arată lag.

2. **Afișarea gradului sportivului în Tab Sportivi**
   - Ce știm: Query selectează `grad_actual_id` (UUID). UI-SPEC spune `{grad_actual}` în `text-slate-300 text-sm`.
   - Ce e neclar: E `grad_actual_id` suficient sau trebuie join la tabela `grade` pentru denumire?
   - Recomandare: Adaugă join în query: `.select('id, nume, prenume, grade:grad_actual_id(denumire)')`. Cost minim, elimină ambiguitatea.

---

## Environment Availability

> Faza este cod-only: React + TypeScript + Tailwind. Nicio dependință externă nouă.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build (Vite) | Implicit | — | — |
| Supabase (remote) | Tab Orar save, Tab Sportivi query | Implicit | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Security Domain

> `security_enforcement: true` în config.json. ASVS Level 1 aplicat.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Nu | Nicio autentificare nouă în această fază |
| V3 Session Management | Nu | Nu se modifică sesiunea |
| V4 Access Control | Da | RLS Supabase pe `orar_saptamanal` și `sportivi`; `usePermissions` nu se modifică |
| V5 Input Validation | Da | Inputs timp (ora_start, ora_sfarsit) — `type="time"` HTML native; Supabase validează NOT NULL |
| V6 Cryptography | Nu | Nu se gestionează secrete sau date criptate |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Acces neautorizat la orar grupă din alt club | Elevation of Privilege | RLS pe `orar_saptamanal` filtrează pe `club_id` via header `active-role-context-id` |
| Acces neautorizat la lista sportivi alt club | Elevation of Privilege | RLS pe `sportivi` filtrat pe `club_id` via `auth.uid()` |
| Input malformat în câmpuri timp | Tampering | `type="time"` HTML — browser validează format HH:MM; Supabase TIME column validează la insert |

**Niciun risc de securitate nou introdus în Phase 2.** Modificările sunt frontend-only, urmând patternurile existente de RLS și autorizare.

---

## Sources

### Primary (HIGH confidence)
- `components/Grupe/OrarEditorModal.tsx` — logică completă copiată în Tab Orar (VERIFIED din sursă)
- `components/Grupe/GrupaCard.tsx` — structura actuală butoane + interfața props (VERIFIED din sursă)
- `components/Grupe/index.tsx` — orchestrator modal state patterns (VERIFIED din sursă)
- `components/Grupe/AdaugaSportiviModal.tsx` — interfața props pentru modal (VERIFIED din sursă)
- `contexts/NavigationContext.tsx` — view swap patterns, history stack (VERIFIED din sursă)
- `hooks/useGrupe.ts` — cache pattern, queryKey `['grupe']` (VERIFIED din sursă)
- `types.ts` liniile 317-363 — `ProgramItem`, `Grupa`, `Antrenament`, `TipStagiu` (VERIFIED din sursă)
- `components/ui.tsx` liniile 1-75 — Button variants + Card (VERIFIED din sursă)

### Secondary (MEDIUM confidence)
- `components/Competitii/index.tsx` liniile 761-980 — tab pattern cu `activeTab` state local (VERIFIED din sursă)
- `components/Prezenta/InstructorPrezentaPage.tsx` linia 79 — query `sportivi!grupa_id` pattern (VERIFIED din sursă)
- `02-CONTEXT.md`, `02-UI-SPEC.md` — decizii arhitecturale locked (VERIFIED documente de proiect)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nicio dependință nouă; totul deja în package.json
- Architecture: HIGH — decizii locked în CONTEXT.md; patternuri verificate în sursă
- Code examples: HIGH — derivate direct din sursa existentă cu modificări minime
- Pitfalls: HIGH — identificate din citirea sursei actuale

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (codebase stabilă; dependențe neschimbate)
