# Quick Access — Design Spec
**Data:** 2026-06-19

## Obiectiv
Bandă de pill-butoane mici în dashboard, cu două zone: Preferate (fixate manual) și Folosite des (auto din frecvență click-uri). Permite navigare rapidă la cele mai relevante secțiuni.

## Locație UI
Deasupra hero-card "Prezență Rapidă" în `AdminMasterMap.tsx`.

## Date — localStorage
- `qkd_nav_counts_{userId}` — `Record<string, number>` — contor per view, incrementat la fiecare click din nav
- `qkd_nav_favorites_{userId}` — `string[]` — views fixate de utilizator

## Hook `useQuickAccess(userId: string)`
```ts
{
  favorites: View[],         // views fixate
  topViews: View[],          // top 5 frecvență, exclude favorites
  toggleFavorite: (view: View) => void,
  trackView: (view: View) => void,
}
```
- `topViews` = sortare descrescătoare pe count, primele 5, filtrate față de favorites
- Modificări scrise instant în localStorage, state actualizat prin `useState`

## Componentă `QuickAccess.tsx`
Props: `{ onNavigate: (view: View) => void, userId: string, labelMap: Record<string, string> }`

Render:
1. Dacă `favorites.length > 0`: rând "⭐ Preferate" — pill-uri cu icon stea galbenă + label + click navighează
2. Dacă `topViews.length > 0`: rând "🔥 Folosite des" — pill-uri auto, max 5
3. Dacă amândouă goale: null (nu redă nimic — prima utilizare fără date)

Pill styling: `h-8 px-3 rounded-full text-xs font-medium border border-slate-700 bg-slate-800/60 hover:bg-amber-400/10 hover:border-amber-400/40 flex items-center gap-1.5`

## Star pe ItemCard (AdminMasterMap)
- Star icon în colțul dreapta-sus, vizibil la hover pe card
- Star galben fill = favorit; star gol = nefavorit
- Click star: `toggleFavorite(view)`, stopPropagation (nu navighează)

## Tracking
- La fiecare click pe ItemCard din acordeon: `trackView(view)`
- La click pe pill din QuickAccess: `trackView(view)` + `onNavigate(view)`
- Nu se trackează navigarea din sidebar (sidebar rămâne neschimbat)

## Label Map
`AdminMasterMap` deține un `Record<View, string>` cu labelurile tuturor item-urilor pentru a le afișa în QuickAccess fără a duplica stringurile.

## Fișiere modificate
- **nou** `hooks/useQuickAccess.ts`
- **nou** `components/QuickAccess.tsx`
- **modificat** `components/AdminMasterMap.tsx`

## Out of scope
- Sidebar tracking
- Supabase sync
- Reordonare drag-and-drop
- Limită maximă favorite
