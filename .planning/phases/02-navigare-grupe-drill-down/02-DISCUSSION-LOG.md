# Phase 2: Navigare Grupe Drill-Down - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 02-navigare-grupe-drill-down
**Areas discussed:** OrarEditorModal inline, Tab Sportivi conținut, Buton Detalii în GrupaCard

---

## OrarEditorModal inline

| Option | Description | Selected |
|--------|-------------|----------|
| Extrage OrarEditor intern | Creezi OrarEditorContent fără Modal; OrarEditorModal rămâne wrapper. Cel mai curat, zero regresii. | |
| Reutilizezi modalul cu showModal=true fix | Nu refactorizezi nimic; Tab Orar montezi cu isOpen=true permanent + onClose=no-op. Risc z-index. | |
| Copiezi logica direct în Tab Orar | Duplicezi logica în GrupaDetailView > TabOrar. Zero risc regresie modal, cod duplicat (173 linii). | ✓ |

**User's choice:** Copiezi logica direct în Tab Orar  
**Notes:** Prioritate zero risc regresie față de DRY. Logica de 173 linii e clară și izolată.

---

### Comportament "Anulează" inline

| Option | Description | Selected |
|--------|-------------|----------|
| Reverte la orar salvat | "Anulează" resetează state-ul local la grupa.program original — comportament Undo. | ✓ |
| Ascunde tab-ul temporar | "Anulează" revine pe Tab Antrenamente; modificarea locală se pierde. | |
| Elimină butonul Anulează | Tab inline fără "Anulează" — doar "Salvează Orar". | |

**User's choice:** Reverte la orar salvat  
**Notes:** Comportament intuitiv, analog cu Undo. Nu navigează, nu pierde context.

---

### Post-save behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Toast succes + rămâne în Tab Orar | Orarul salvat, tab rămâne deschis, utilizatorul continuă dacă vrea. | ✓ |
| Toast succes + salt automat pe Tab Antrenamente | Reflectă că un orar nou e aplicat — salt automat. | |

**User's choice:** Toast succes + rămâne în Tab Orar

---

## Tab Sportivi conținut

| Option | Description | Selected |
|--------|-------------|----------|
| Lista inline + buton deschide modalul existent | Tab = lista sportivilor + buton "Adaugă Sportivi" → AdaugaSportiviModal. Zero risc regresie. | ✓ |
| AdaugaSportiviModal complet inline | 388 linii de logică inline în tab (search, paginate, add/remove). | |

**User's choice:** Lista inline + buton deschide modalul existent

---

### Sursă date lista sportivi

| Option | Description | Selected |
|--------|-------------|----------|
| Query separat cu detalii per grupă | Tab face query propriu (id, nume, prenume) per grupă. | ✓ |
| Din contextul global DataContext.sportivi | Filtrare locală din cache-ul DataContext. | |

**User's choice:** Query separat cu detalii per grupă

---

### Acțiuni per sportiv în tab

| Option | Description | Selected |
|--------|-------------|----------|
| Doar vizualizare + buton Adaugă (read-only) | Fiecare rând = nume + grad. Management complet prin modal. | ✓ |
| Buton Scoate din grupă per rând | Acțiune directă de scoatere din tab. | |

**User's choice:** Doar vizualizare + buton Adaugă

---

## Buton Detalii în GrupaCard

| Option | Description | Selected |
|--------|-------------|----------|
| Detalii = buton primar, înlocuiește Orar+Sportivi | Card: [Detalii] (primary) \| [Gestionează] (secondary) \| [...] (dropdown). Card mai curat. | ✓ |
| Detalii adăugat în rândul existent | Gestionează \| Sportivi \| Orar \| Detalii \| ... — 5 butoane, aglomerat. | |
| Detalii în meniul dropdown (...) | Adaugi "Detalii" în meniu. Discret, nu promovează noul flow. | |

**User's choice:** Detalii = buton primar, înlocuiește Orar+Sportivi

---

### Păstrare buton Gestionează

| Option | Description | Selected |
|--------|-------------|----------|
| Da, păstrăm Gestionează + Detalii ca două CTA-uri | Card final: Detalii \| Gestionează \| ... . | ✓ |
| Mută Gestionează în Tab Detalii | Card cu un singur CTA: Detalii. | |

**User's choice:** Păstrăm Gestionează + Detalii

---

### Tab implicit la deschidere

| Option | Description | Selected |
|--------|-------------|----------|
| Tab Antrenamente | Default logic; Phase 3 adaugă calendarul. | ✓ |
| Tab Orar | Ce există funcțional deja. | |
| Tab Sportivi | Context rapid sportivi. | |

**User's choice:** Tab Antrenamente

---

## Claude's Discretion

- **Drill-down mount**: User nu a selectat zona pentru discuție → Claude decide. Ales: view swap în NavigationContext (`setActiveView('grupa-detail', { grupaId })`). Motivare: consistent cu SPA pattern existent, back button funcționează prin history stack, fără conflicte z-index modale.
- **Tab Antrenamente Phase 2**: placeholder sau lista simplă — planner decide formatul exact.

## Deferred Ideas

- Tab "Editează Grupă" în GrupaDetailView — păstrăm "Gestionează" ca buton separat pe card (Phase 2)
- Acțiuni directe per sportiv în Tab Sportivi (scoatere din grupă) — Phase 2 = read-only
- Navigare directă la tab specific din GrupaCard (ex: click card → deschide pe Tab Orar) — complexitate nejustificată MVP
