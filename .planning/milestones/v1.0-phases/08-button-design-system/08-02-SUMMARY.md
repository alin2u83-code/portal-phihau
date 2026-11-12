---
phase: 08-button-design-system
plan: "02"
subsystem: design-system
tags: [button, catalog, lazy-loading, spa-routing, rbac, typescript]
dependency_graph:
  requires: [08-01]
  provides: [ButtonCatalog-page, view-button-catalog-routing]
  affects:
    - components/ButtonCatalog.tsx
    - types.ts
    - components/LazyComponents.tsx
    - components/AppRouter.tsx
    - components/NavMenu.tsx
tech_stack:
  added: []
  patterns: [lazy-named-export, renderProtected-rbac, spa-view-registration]
key_files:
  created:
    - components/ButtonCatalog.tsx
  modified:
    - types.ts
    - components/LazyComponents.tsx
    - components/AppRouter.tsx
    - components/NavMenu.tsx
decisions:
  - "ButtonCatalog este o pagina statica — zero props, zero data fetching, zero React Query"
  - "NavMenu foloseste ShieldCheckIcon pentru Button Catalog (deja importat, nu s-a adaugat import nou)"
  - "Fragment React (<>...</>) folosit in blocul isFederationAdmin pentru a invalui doua NavItem-uri fara wrapper div"
  - "menuConfig.ts lasat nemodificat — Button Catalog nu apare in meniul general (vizibil numai pentru SUPER_ADMIN_FEDERATIE via NavMenu.tsx)"
  - "LazyComponents pattern cu .then(m => ({ default: m.ButtonCatalog })) consistent cu toate exporturile named din fisier"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
  files_created: 1
---

# Phase 08 Plan 02: Button Design System — ButtonCatalog + Wiring SPA Summary

**One-liner:** Pagina catalog vizual ButtonCatalog (grid variante x size x stari + ConfirmButton demo) creata si wirata complet in SPA: View in types.ts, lazy export, case renderProtected(isFederationAdmin) in AppRouter, NavItem vizibil NUMAI pentru SUPER_ADMIN_FEDERATIE.

## Ce s-a construit

### Task 1: ButtonCatalog.tsx — grid variante × size × stari + ConfirmButton demo (BTN-03)

**Commit:** `982b8b4`

Fisier nou `components/ButtonCatalog.tsx`:

- **Header**: titlu + subtitlu pe fond `bg-slate-900 text-slate-100`
- **Sectiunea Variante × Dimensiuni**: tabel HTML cu 6 variante (primary/secondary/danger/success/info/warning) × 4 dimensiuni (xs/sm/md/lg) — 24 butoane
- **Ghost Variants**: grid cu `ghost` si `ghost pill` pentru toate 6 variantele
- **Outline Variants**: grid cu `outline` si `outline pill` pentru toate 6 variantele
- **Cu Icoane**: 5 exemple cu `leftIcon`/`rightIcon` (span cu text simplu ca placeholder)
- **Stari**: `isLoading` si `disabled` pentru 6 combinatii
- **Pill**: 5 butoane cu `rounded-full` la diferite dimensiuni si variante
- **ConfirmButton demo interactiv**: 2 instante ConfirmButton + state local `lastAction` cu afisare live

Import-uri: exclusiv `Button` si `ConfirmButton` din `./ui` — zero dependinte externe.

### Task 2: Wiring complet — types.ts + LazyComponents.tsx + AppRouter.tsx + NavMenu.tsx (BTN-04)

**Commit:** `4894bd0`

4 modificari additive in fisiere existente:

**types.ts** (linia 517):
- `'setup-mfa'` → `'setup-mfa' | 'button-catalog'` — singura modificare

**components/LazyComponents.tsx** (dupa linia 59):
```typescript
export const ButtonCatalog = lazy(() =>
  import('./ButtonCatalog').then(m => ({ default: m.ButtonCatalog }))
);
```

**components/AppRouter.tsx** (inainte de `case 'setup-mfa'`):
```typescript
case 'button-catalog':
    return renderProtected(<Lazy.ButtonCatalog />, isFederationAdmin);
```
ButtonCatalog nu primeste niciun prop (componenta statica).

**components/NavMenu.tsx** (blocul isFederationAdmin):
- Inlocuit `<NavItem ... admin-dashboard />` cu `<>...</>` Fragment cu doua NavItem-uri: Admin Dashboard + Button Catalog
- `view: 'button-catalog'`, `icon: ShieldCheckIcon` (deja importat — zero import-uri noi)

## Verificari finale

| Verificare | Rezultat |
|------------|----------|
| `npx tsc --noEmit` | ZERO ERORI |
| `grep -c "button-catalog" types.ts` | 1 |
| `grep -c "ButtonCatalog" components/LazyComponents.tsx` | 2 (export + import path) |
| `grep -c "button-catalog" components/AppRouter.tsx` | 1 |
| `grep -c "button-catalog" components/NavMenu.tsx` | 2 (view + isActive) |
| `grep -c "button-catalog" components/menuConfig.ts` | 0 (nemodificat) |

## Deviations from Plan

None — planul executat exact ca scris.

## Known Stubs

None — ButtonCatalog este o pagina demo statica; nu exista date lipsa sau placeholder-uri functionale.

## Threat Flags

Nicio suprafata de securitate noua introdusa in afara celor documentate in threat_model:
- T-08-03: `renderProtected(<Lazy.ButtonCatalog />, isFederationAdmin)` implementat corect
- T-08-04: NavItem in blocul `{permissions?.isFederationAdmin && ...}` — nu se randeaza in DOM pentru non-admins
- T-08-05: ButtonCatalog nu afiseaza date utilizator (zero fetch, zero date sensibile)

## Self-Check: PASSED

- `components/ButtonCatalog.tsx` — FOUND
- `982b8b4` — FOUND (feat(08-02): creeaza ButtonCatalog.tsx)
- `4894bd0` — FOUND (feat(08-02): wiring complet view button-catalog)
