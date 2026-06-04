# Sistem Filtrare Unificat — Competiții

## What This Is

Un sistem de filtrare unificat (gen, vârstă, grad, probă) aplicat consistent pe toate tab-urile principale din modulul de Competiții al portalului PhiHau: Categorii, Înscrieri, Raport și Template (admin). Filtrele funcționează combinat (AND) și sunt inline, deasupra listei de conținut, pe fiecare tab.

## Core Value

Orice admin sau instructor poate filtra rapid sportivii/categoriile după gen + vârstă + grad simultan, pe orice tab din competiție, folosind o interfață identică pretutindeni.

## Requirements

### Validated

- ✓ Filtre probe (pills) pe tab Categorii — existing (`selectedProbaId`)
- ✓ Filtre gen + vârstă + grad pe tab Template (admin) — existing (`filterGen`, `filterVarstaMin/Max`, `filterGradMin/Max`)
- ✓ Logica AND de filtrare implementată în Template — existing, liniile 1840-1844 din `components/Competitii/index.tsx`

### Active

- [ ] Hook reutilizabil `useCompetitieFilters` extras din logica existentă de pe tab Template
- [ ] Componentă `CompetitieFilterBar` inline (gen chips + vârstă range + grad range + probă pills)
- [ ] Filtre aplicate pe tab Categorii (înlocuiește pills-urile simple de probe)
- [ ] Filtre aplicate pe tab Înscrieri (filtrare sportivi înscriși per gen/vârstă/grad)
- [ ] Filtre aplicate pe tab Raport (același filtru, aplicate pe datele de raport)
- [ ] Tab Template (admin) refactorizat să folosească `CompetitieFilterBar` shared în loc de implementarea locală

### Out of Scope

- Wizard Înscriere (Pas2, Pas3, Pas4) — rămâne neschimbat, nu necesită filtrare
- Filtre URL-persistente sau shareable — complexitate nejustificată pentru uz intern
- Filtre server-side / query Supabase — datele sunt deja în memorie, filtrare client-side suficientă
- Tab Admin, Tab Cereri Interclub, Tab Financiar — nu conțin liste de categorii/sportivi filtrabile în același sens

## Context

**Codebase existent:**
- `components/Competitii/index.tsx` — ~3942 linii, monolitic, conține toate tab-urile
- Două implementări de filtre existente, inconsistente:
  1. **Tab Categorii** (linia ~769): `selectedProbaId` state + pills UI — simplu, filtrează doar după probă
  2. **Tab Template** (linia ~1804): `filterGen`, `filterVarstaMin/Max`, `filterGradMin/Max` + UI complet — dar local, nedistribuit
- `utils/eligibilitateCompetitie.ts` — conține `filtreazaSportiviEligibili` și `calculeazaVarstaLaData` — util pentru filtrarea înscriși
- `types.ts` — tipuri `CategorieCompetitie` cu câmpurile `gen`, `varsta_min`, `varsta_max`, `grad_min_ordine`, `grad_max_ordine`

**Arhitectura targetată:**
- Extrage logica din Template în `hooks/useCompetitieFilters.ts`
- Creează `components/Competitii/CompetitieFilterBar.tsx`
- Aplică pe 4 tab-uri — Categorii, Înscrieri, Raport, Template

## Constraints

- **Tech Stack**: React 18 + TypeScript + Tailwind — fără librării externe noi
- **UI**: `components/ui.tsx` design system intern — nu Shadcn/MUI
- **Compatibilitate**: Nu se sparge API-ul existent al componentelor
- **Performance**: Filtrare client-side pe date deja încărcate — fără query-uri noi Supabase
- **Scope fișier**: Modificări în `index.tsx` monolitic — atenție la re-rendere nedorite

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hook `useCompetitieFilters` separat | Logica de filtrare reutilizabilă pe multiple tab-uri fără prop-drilling | — Pending |
| Componentă `CompetitieFilterBar` shared | UI identic pe toate tab-urile, modificare dintr-un loc | — Pending |
| Filtrare client-side | Datele categorii/inscrieri/echipe deja în state — nu merită query separat | — Pending |
| Tab Template refactorizat (nu duplicat) | Elimină duplicarea codului de filtrare existent | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-04 after initialization*
