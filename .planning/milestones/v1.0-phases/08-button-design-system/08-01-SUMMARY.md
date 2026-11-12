---
phase: 08-button-design-system
plan: "01"
subsystem: design-system
tags: [button, ui, typescript, ghost, outline, pill, confirm]
dependency_graph:
  requires: []
  provides: [Button-extended-API, ConfirmButton]
  affects: [components/ui.tsx]
tech_stack:
  added: []
  patterns: [inline-CSS-vars-for-theme, useRef-timer-cleanup, state-machine-idle-confirming]
key_files:
  created: []
  modified:
    - components/ui.tsx
decisions:
  - "Hover state pentru ghost/outline calculat la render (nu la hover event separat) — inline în variantStyles cu isHovered existent"
  - "styleKey = prefix + variant fără _hover suffix — isHovered deja inclus în valoarea CSS din variantStyles"
  - "className ?? '' în finalClassName pentru compatibilitate call-site-uri fără prop className"
  - "ConfirmButtonProps extinde Omit<ButtonProps, 'onClick' | 'as'> — ConfirmButton interceptează onClick și nu are sens semantic ca label"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 08 Plan 01: Button Design System — Extindere Button + ConfirmButton Summary

**One-liner:** Button extins cu pill/ghost/outline/leftIcon/rightIcon/xs/lg via inline CSS vars + ConfirmButton cu state machine idle/confirming și auto-reset 3s via useRef.

## Ce s-a construit

### Task 1: Extindere ButtonProps și sizeClasses (BTN-01)

**Comit:** `5b0ace5`

Modificări additive pe componenta `Button` din `components/ui.tsx`:

- `ButtonProps`: adăugate `pill?`, `ghost?`, `outline?`, `leftIcon?`, `rightIcon?`; `size` extins din `'sm' | 'md'` în `'xs' | 'sm' | 'md' | 'lg'`
- `baseClasses`: `roundedClass` dinamic — `pill ? 'rounded-full' : 'rounded-xl'`
- `sizeClasses`: Record cu xs (`px-3 py-1 text-xs`) și lg (`px-8 py-4 text-lg`) adăugate
- `variantStyles`: 12 chei noi — `ghost_primary/secondary/danger/success/info/warning` și echivalentele `outline_*` cu inline CSS vars pentru theme-following
- `activeStyle`: calcul via `stylePrefix + variant` — inlocuiește `variantStyles[variant]` în ambele ramuri JSX (label și button)
- `content`: ramură `leftIcon || rightIcon` cu `<span className="flex items-center gap-2">`
- `finalClassName`: `className ?? ''` pentru compatibilitate call-site-uri fără prop className

**Backward compatibility:** Toate ~449 call-site-uri existente fără props noi primesc `stylePrefix = ''`, deci `styleKey = variant`, deci `activeStyle = variantStyles[variant]` — identic cu comportamentul anterior.

### Task 2: ConfirmButton (BTN-02)

**Comit:** `b7e6d73`

Componentă nouă exportată din `components/ui.tsx`:

- `export interface ConfirmButtonProps`: extinde `Omit<ButtonProps, 'onClick' | 'as'>` + `onConfirm: () => void` (required) + `confirmText/confirmLabel/cancelLabel` opționale
- `ConfirmButton`: `useState(confirming)` + `useRef<ReturnType<typeof setTimeout>>(timerRef)` pentru timer management
- `startConfirming`: `setTimeout(3000)` cu auto-reset; `handleConfirm`: clearTimeout + onConfirm(); `handleCancel`: clearTimeout + reset
- `useEffect` cleanup: `clearTimeout(timerRef.current)` la unmount — previne memory leak și warning React
- Default: `variant='danger'`, `confirmText='Ești sigur?'`, `confirmLabel='Da'`, `cancelLabel='Nu'`
- Starea `confirming`: `<span>` cu text + `<Button size="sm" variant={variant}>Da</Button>` + `<Button size="sm" variant="secondary">Nu</Button>`

## Verificare

```
npx tsc --noEmit  →  zero erori TypeScript
ghost_primary present in variantStyles  ✓
outline_primary present in variantStyles  ✓
pill?: boolean in ButtonProps  ✓
xs/lg in sizeClasses  ✓
export const ConfirmButton in ui.tsx  ✓
clearTimeout(timerRef.current) in useEffect cleanup  ✓
${className ?? ''} înainte de touch-manipulation  ✓
style={activeStyle} în ambele ramuri label și button  ✓
```

## Deviations from Plan

**Deviation minora — styleKey fara `_hover` suffix:**

Planul descria calculul cheii ca `${stylePrefix}${variant}${isHovered ? '_hover' : ''}` sugerând chei separate `ghost_primary` vs `ghost_primary_hover`. Implementarea folosește direct `isHovered` în valorile CSS din `variantStyles` (pattern existent în componenta originală) — o singură cheie per combinație ghost/outline+variant. Aceasta e mai simplă și consistentă cu pattern-ul existent. Rezultat vizual identic.

## Known Stubs

Niciun stub — toate funcționalitățile sunt complet implementate.

## Threat Flags

Niciun threat flag — modificările sunt additive pe o componentă UI existentă, fără endpoint-uri noi sau acces la date externe.

## Self-Check: PASSED

- `components/ui.tsx` modificat: FOUND
- Comit `5b0ace5` (Task 1): FOUND
- Comit `b7e6d73` (Task 2): FOUND
- `npx tsc --noEmit` zero erori: PASSED
