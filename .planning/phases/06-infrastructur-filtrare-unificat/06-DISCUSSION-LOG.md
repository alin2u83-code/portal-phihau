# Phase 6: Infrastructură Filtrare Unificată - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 06-infrastructur-filtrare-unificat
**Areas discussed:** Hook API, Toggle filtre, UI Grad, Funcție filtrare, Hook shape, Props FilterBar, Loc funcție

---

## Hook API

| Option | Description | Selected |
|--------|-------------|----------|
| Destructurat plat | filterGen, filterProbaId, ... + funcții individuale — oglindă InscrieriView.tsx | |
| Grupat (filtre + setters separat) | filtre = obiect, setters = obiect cu funcții | ✓ |
| Tu decideți | Plannerul alege | |

**User's choice:** Grupat
**Notes:** Preferă obiect grupat `filtre` pentru claritate

---

## Toggle filtre

| Option | Description | Selected |
|--------|-------------|----------|
| Mereu vizibilă (inline) | Fără toggle, mereu afișată | |
| Collapsibilă | Buton "Filtre (N)" toggle-ează panoul, badge activ | ✓ |
| Tu decideți | Plannerul decide | |

**User's choice:** Collapsibilă — identic cu pattern-ul din InscrieriView.tsx

---

## UI Grad

| Option | Description | Selected |
|--------|-------------|----------|
| Număr ordine | Inputs numerice gradMin/gradMax | |
| Dropdown cu nume grade | Select cu "Albă", "Galbenă" etc., necesită grade[] prop | ✓ |

**User's choice:** Dropdown cu nume grade

---

## Funcție filtrare

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicată CategorieCompetitie | aplicaFiltreCategorie(categorii, filtre): CategorieCompetitie[] | ✓ |
| Generică (predicate factory) | creeazăPredicat(filtre): predicate function | |

**User's choice:** Dedicată

---

## Hook shape (clarificare)

| Option | Description | Selected |
|--------|-------------|----------|
| { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } | Un singur setFiltre(partial) | ✓ |
| { filtre, setters, resetFiltre, nrFiltreActive } | setters separat cu funcții individuale | |

**User's choice:** Varianta 1 — setFiltre(partial) pentru simplitate

---

## Props FilterBar

**User's choice:** Props directe — grade: Grad[] + probe: ProbaCompetitie[] ca props, zero context nou

---

## Loc funcție aplicaFiltreCategorie

| Option | Description | Selected |
|--------|-------------|----------|
| Exportată din hook | hooks/useCompetitieFilters.ts exportă și funcția | ✓ |
| utils/filtreCompetitie.ts | Fișier separat în utils/ | |
| Tu decideți | Plannerul alege | |

**User's choice:** Exportată din hook — un singur import

---

## Claude's Discretion

- Structura exactă UI dropdown grad (native select vs custom)
- Valoarea inițială filtreVisible (probabil colapsat = false)
- Ordinea vizuală controale în FilterBar

## Deferred Ideas

- Persistență localStorage filtre (v2 — PERS-01, PERS-02)
- Filtru după club pentru super admin (v2 — ADV-01)
- Filtru după status (v2 — ADV-02)
