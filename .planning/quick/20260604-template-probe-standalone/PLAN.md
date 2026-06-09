---
slug: template-probe-standalone
date: 2026-06-04
status: in-progress
---

# Template Probe Standalone — Acces în afara competiției

Permite pregătirea template-urilor de probe ÎNAINTE de crearea unei competiții, printr-un view dedicat accesibil din meniu.

## Goal

`CategoriiTemplateManager` există și funcționează deja standalone (când `competitieId` e undefined, butoanele de import nu apar). Trebuie doar expus ca view independent.

## Tasks

1. Adaugă `'template-probe'` la tipul `View` în `types.ts`
2. Adaugă case `'template-probe'` în `AppRouter.tsx` → renderizează `CategoriiTemplateManager` fără `competitieId`
3. Adaugă link navigare în `Sidebar.tsx` pentru `SUPER_ADMIN_FEDERATIE` și `ADMIN_CLUB` (vizibil în secțiunea Competiții)

## Files

- `types.ts` — adaugă View
- `components/AppRouter.tsx` — adaugă case
- `components/Sidebar.tsx` — adaugă nav item
- `components/Competitii/CategoriiTemplateManager.tsx` — verifică props interface (poate trebuie `competitieId?` optional)
