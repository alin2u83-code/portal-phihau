# Quick Access — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaugă bandă de pill-butoane rapide în dashboard (Preferate + Top 5 auto), cu star pin pe fiecare card din acordeon.

**Architecture:** Hook `useQuickAccess` gestionează localStorage (frecvență + favorite). Componenta `QuickAccess` renderează două rânduri de pill-uri. `AdminMasterMap` integrează ambele, adaugă star pe `ItemCard` și trackează click-urile.

**Tech Stack:** React 18, TypeScript strict off, Tailwind CSS, localStorage via hook existent `useLocalStorage`

## Global Constraints

- Nu se importă librării externe noi
- Design system: `components/ui.tsx` — nu Shadcn/MUI
- Iconițe doar din `components/icons.tsx`
- `View` type din `../types`
- Nu se modifică sidebar, AppRouter, types.ts, ui.tsx, DataContext
- `useLocalStorage` din `hooks/useLocalStorage.ts` — refolosit

---

### Task 1: Hook `useQuickAccess`

**Files:**
- Create: `hooks/useQuickAccess.ts`

**Interfaces:**
- Consumes: `useLocalStorage<T>` din `hooks/useLocalStorage.ts`
- Produces:
  ```ts
  useQuickAccess(userId: string): {
    favorites: string[];
    topViews: string[];
    toggleFavorite: (view: string) => void;
    trackView: (view: string) => void;
  }
  ```

- [ ] **Step 1: Creează `hooks/useQuickAccess.ts`**

```ts
import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useQuickAccess(userId: string) {
    const countsKey = `qkd_nav_counts_${userId}`;
    const favoritesKey = `qkd_nav_favorites_${userId}`;

    const [counts, setCounts] = useLocalStorage<Record<string, number>>(countsKey, {});
    const [favorites, setFavorites] = useLocalStorage<string[]>(favoritesKey, []);

    const trackView = useCallback((view: string) => {
        setCounts(prev => ({ ...prev, [view]: (prev[view] || 0) + 1 }));
    }, [setCounts]);

    const toggleFavorite = useCallback((view: string) => {
        setFavorites(prev =>
            prev.includes(view) ? prev.filter(v => v !== view) : [...prev, view]
        );
    }, [setFavorites]);

    const topViews = useMemo(() => {
        const favSet = new Set(favorites);
        return Object.entries(counts)
            .filter(([view]) => !favSet.has(view))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([view]) => view);
    }, [counts, favorites]);

    return { favorites, topViews, toggleFavorite, trackView };
}
```

- [ ] **Step 2: Verifică TypeScript**

```bash
npx tsc --noEmit
```
Așteptat: zero erori.

- [ ] **Step 3: Commit**

```bash
git add hooks/useQuickAccess.ts
git commit -m "feat(quick-access): add useQuickAccess hook with localStorage tracking"
```

---

### Task 2: Componentă `QuickAccess`

**Files:**
- Create: `components/QuickAccess.tsx`

**Interfaces:**
- Consumes: `useQuickAccess` din `hooks/useQuickAccess.ts`
- Produces: `<QuickAccess userId onNavigate labelMap />`

```ts
interface QuickAccessProps {
    userId: string;
    onNavigate: (view: string) => void;
    labelMap: Record<string, string>;
}
```

- [ ] **Step 1: Creează `components/QuickAccess.tsx`**

```tsx
import React from 'react';
import { StarIcon } from './icons';
import { useQuickAccess } from '../hooks/useQuickAccess';

interface QuickAccessProps {
    userId: string;
    onNavigate: (view: string) => void;
    labelMap: Record<string, string>;
}

const Pill: React.FC<{
    label: string;
    isFavorite?: boolean;
    onClick: () => void;
}> = ({ label, isFavorite, onClick }) => (
    <button
        onClick={onClick}
        className={`h-8 px-3 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all
            ${isFavorite
                ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
            }`}
    >
        {isFavorite && <StarIcon className="w-3 h-3 text-amber-400 fill-amber-400" />}
        {label}
    </button>
);

export const QuickAccess: React.FC<QuickAccessProps> = ({ userId, onNavigate, labelMap }) => {
    const { favorites, topViews, trackView } = useQuickAccess(userId);

    const handleNavigate = (view: string) => {
        trackView(view);
        onNavigate(view);
    };

    const hasFavorites = favorites.length > 0;
    const hasTop = topViews.length > 0;

    if (!hasFavorites && !hasTop) return null;

    return (
        <div className="space-y-2 mb-4">
            {hasFavorites && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-widest">⭐ Preferate</p>
                    <div className="flex flex-wrap gap-2">
                        {favorites.map(view => (
                            <Pill
                                key={view}
                                label={labelMap[view] || view}
                                isFavorite
                                onClick={() => handleNavigate(view)}
                            />
                        ))}
                    </div>
                </div>
            )}
            {hasTop && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">🔥 Folosite des</p>
                    <div className="flex flex-wrap gap-2">
                        {topViews.map(view => (
                            <Pill
                                key={view}
                                label={labelMap[view] || view}
                                onClick={() => handleNavigate(view)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Verifică că `StarIcon` există în `components/icons.tsx`**

```bash
grep -n "StarIcon" components/icons.tsx
```

Dacă nu există, adaugă în `components/icons.tsx`:
```ts
import { Star } from 'lucide-react';
export const StarIcon = Star;
```

- [ ] **Step 3: Verifică TypeScript**

```bash
npx tsc --noEmit
```
Așteptat: zero erori.

- [ ] **Step 4: Commit**

```bash
git add components/QuickAccess.tsx
git commit -m "feat(quick-access): add QuickAccess pill component"
```

---

### Task 3: Integrare în `AdminMasterMap`

**Files:**
- Modify: `components/AdminMasterMap.tsx`

**Interfaces:**
- Consumes: `QuickAccess` din `components/QuickAccess.tsx`, `useQuickAccess` din `hooks/useQuickAccess.ts`

- [ ] **Step 1: Adaugă import-uri în `AdminMasterMap.tsx`**

La importuri existente adaugă:
```ts
import { QuickAccess } from './QuickAccess';
import { useQuickAccess } from '../hooks/useQuickAccess';
import { StarIcon } from './icons';
```

- [ ] **Step 2: Actualizează `ItemCard` să accepte star**

Înlocuiește definiția `ItemCard`:
```tsx
const ItemCard: React.FC<{
    title: string;
    view: View;
    icon: React.ElementType;
    badge?: number;
    isFavorite?: boolean;
    onNavigate: (view: View) => void;
    onToggleFavorite?: (view: View) => void;
}> = ({ title, view, icon: Icon, badge, isFavorite, onNavigate, onToggleFavorite }) => (
    <div
        onClick={() => onNavigate(view)}
        className="relative bg-slate-800/60 p-4 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-slate-700/70 transition-colors border border-slate-700/50 hover:border-amber-400/40 group"
    >
        <Icon className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="font-medium text-slate-200 text-sm">{title}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {badge > 9 ? '9+' : badge}
            </span>
        )}
        {onToggleFavorite && (
            <button
                onClick={e => { e.stopPropagation(); onToggleFavorite(view); }}
                className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded
                    ${isFavorite ? 'opacity-100' : ''}`}
                title={isFavorite ? 'Elimină din preferate' : 'Adaugă la preferate'}
            >
                <StarIcon className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
            </button>
        )}
    </div>
);
```

**Notă:** Dacă `badge` și star sunt ambele prezente, badge-ul se mută la `bottom-1.5 right-1.5` pentru a nu se suprapune cu star. Ajustează `badge` span la `bottom-1.5 right-1.5` când `onToggleFavorite` e prezent — sau lasă `top-1.5 left-1.5` pentru badge.

Varianta finală mai simplă — badge stânga, star dreapta:
```tsx
        {badge !== undefined && badge > 0 && (
            <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {badge > 9 ? '9+' : badge}
            </span>
        )}
        {onToggleFavorite && (
            <button
                onClick={e => { e.stopPropagation(); onToggleFavorite(view); }}
                className={`absolute top-1.5 right-1.5 p-0.5 rounded transition-opacity
                    ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title={isFavorite ? 'Elimină din preferate' : 'Adaugă la preferate'}
            >
                <StarIcon className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
            </button>
        )}
```

- [ ] **Step 3: Adaugă `labelMap` și hook în `AdminMasterMap`**

În corpul componentei `AdminMasterMap`, după linia `const permissions = usePermissions(activeRoleContext);`:

```tsx
const { favorites, topViews, toggleFavorite, trackView } = useQuickAccess(currentUser?.id || 'anonymous');

const labelMap: Record<string, string> = {
    'sportivi': 'Sportivi',
    'import-sportivi': 'Import Sportivi',
    'deduplicare-sportivi': 'Deduplicare',
    'familii': 'Familii',
    'legitimatii': 'Legitimații',
    'grade': 'Nomenclator Grade',
    'user-management': 'Administrare Staff',
    'grupe': 'Grupe & Orar',
    'program-antrenamente': 'Program Antrenamente',
    'prezenta': 'Înregistrare Prezențe',
    'raport-prezenta': 'Raport Prezențe',
    'raport-lunar-prezenta': 'Raport Lunar',
    'activitati': 'Generator Program',
    'calendar': 'Calendar',
    'examene': 'Sesiuni Examene',
    'rapoarte-examen': 'Rapoarte Examen',
    'competitii': 'Competiții',
    'stagii': 'Stagii Naționale',
    'activitati-nationale': 'Activități Naționale',
    'financial-dashboard': 'Dashboard Financiar',
    'plati-scadente': 'Facturi & Plăți',
    'gestiune-facturi': 'Gestiune Facturi',
    'jurnal-incasari': 'Jurnal Încasări',
    'raport-financiar': 'Raport Financiar',
    'taxe-anuale': 'Taxe Anuale',
    'reduceri': 'Reduceri',
    'tipuri-abonament': 'Config. Abonamente',
    'configurare-preturi': 'Configurare Prețuri',
    'nomenclatoare': 'Nomenclatoare',
    'deconturi-federatie': 'Deconturi Federație',
    'setari-club': 'Setări Club',
    'notificari': 'Notificări',
    'admin-sms': 'SMS',
    'cereri-inscriere': 'Cereri Înscriere',
    'istoric-activitate': 'Istoric Activitate',
    'account-settings': 'Setări Cont',
    'cluburi': 'Gestiune Cluburi',
    'structura-federatie': 'Structură Federație',
    'template-probe': 'Template Probe',
    'data-maintenance': 'Mentenanță Date',
    'inlantuiri-admin': 'Înlănțuiri Grade',
};
```

- [ ] **Step 4: Adaugă `QuickAccess` în JSX, deasupra hero-card**

Înaintea div-ului cu hero-card "Prezență Rapidă":
```tsx
<QuickAccess
    userId={currentUser?.id || 'anonymous'}
    onNavigate={onNavigate}
    labelMap={labelMap}
/>
```

- [ ] **Step 5: Actualizează fiecare `ItemCard` din acordeon**

Adaugă `isFavorite` și `onToggleFavorite` și `trackView` la click. Pattern pentru fiecare `ItemCard`:
```tsx
// Înainte:
<ItemCard title="Sportivi" view="sportivi" icon={UsersIcon} onNavigate={onNavigate} />

// După:
<ItemCard
    title="Sportivi"
    view="sportivi"
    icon={UsersIcon}
    onNavigate={(v) => { trackView(v); onNavigate(v); }}
    isFavorite={favorites.includes('sportivi')}
    onToggleFavorite={toggleFavorite}
/>
```

Aplică același pattern pe TOATE `ItemCard`-urile din acordeon (inclusiv cele cu `badge`).

- [ ] **Step 6: Verifică TypeScript**

```bash
npx tsc --noEmit
```
Așteptat: zero erori.

- [ ] **Step 7: Verifică vizual în browser**

1. Deschide `http://localhost:5173`, navighează la Dashboard
2. `QuickAccess` nu apare (prima utilizare, fără date) ✓
3. Click pe "Sportivi" din acordeon → numărătoarea creşte în localStorage
4. Click pe "Grupe & Orar" de 3 ori → apare în "Folosite des" ✓
5. Hover pe "Prezență Rapidă" card → star apare în colț ✓
6. Click star → item apare în "⭐ Preferate" ✓
7. Click star din nou → dispare din Preferate ✓
8. Refresh pagină → preferatele persistă ✓

- [ ] **Step 8: Commit**

```bash
git add components/AdminMasterMap.tsx components/QuickAccess.tsx hooks/useQuickAccess.ts
git commit -m "feat(quick-access): integrate QuickAccess into AdminMasterMap with star favorites and usage tracking"
```
