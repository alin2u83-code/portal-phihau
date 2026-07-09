# Quick Task 260709-eiw: Restyle Import Sportivi si modulul Examene sa foloseasca paleta si stilul de carduri din AdminMasterMap (Dashboard admin club) - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Task Boundary

Modifica UI-ul paginii Import Sportivi (`components/Sportivi/ImportSportiviPage/`) si al ecranului principal Sesiuni Examene (`components/GestiuneExamene/index.tsx`) sa foloseasca aceeasi paleta de culori si stil de carduri ca Dashboard-ul admin club (`components/AdminMasterMap.tsx`): fundal slate-800/60, accent amber-400, carduri rounded-lg cu border slate-700/50, hover border-amber-400/40.

</domain>

<decisions>
## Implementation Decisions

### Scop vizual
- Aliniere completa: culori SI stil de carduri (padding, border, hover, iconite), nu doar paleta de culori.
- Referinta canonica: `components/AdminMasterMap.tsx` (ItemCard component, liniile 39-70) + header-ul "Buna ziua, {nume}!" (AppRouter.tsx:150).

### Fisiere shared (ui.tsx)
- Voie sa se atinga `components/ui.tsx` daca un pattern shared o cere, dar orice modificare acolo trebuie semnalata explicit inainte de aplicare (poate afecta alte module care refolosesc Card/Button).

### Ce NU se schimba (protejat)
- Logica de import din Import Sportivi ramane 100% functionala: mapare coloane (Pas05Configurare), deduplicare (strict/loose), checkbox selectie per rand NOU adaugat in sesiunea anterioara (excludedNouIndices), executia upsert catre Supabase.
- Toata logica de calcul din Examene: rezultate, promovari grad, comisie cross-club, wizard import bulk Excel — neatinsa in acest task (doar ecranul principal Sesiuni e in scop, vezi mai jos).
- Doar clase Tailwind / structura vizuala se schimba — zero modificari de comportament, zero modificari de query-uri Supabase sau props.

### Scop Examene — faza 1 din task mai mare
- Doar ecranul principal "Gestiune Sesiuni Examen" (`components/GestiuneExamene/index.tsx`) — lista sesiuni, filtre, carduri sesiune, butoane header.
- Rapoarte Examen, wizard Import Bulk Excel, detaliu sesiune — RAMAN NEATINSE in acest quick task, se trateaza separat dupa validarea vizuala a Sesiunilor.

### Test / verificare
- Test manual cu contul curent (TEST_EMAIL din .env), rol Admin Club, club C.S. Phi Hau — acelasi setup folosit in sesiunile anterioare de test Playwright.

### Claude's Discretion
- Alegerea exacta a iconitelor si a micro-interactiunilor hover ramane la latitudinea implementarii, cat timp respecta paleta slate/amber din AdminMasterMap.

</decisions>

<specifics>
## Specific Ideas

Referinta directa de cod pentru paleta/stil tinta:
- `components/AdminMasterMap.tsx:39-70` (ItemCard: `bg-slate-800/60`, `border-slate-700/50`, `hover:border-amber-400/40`, `text-amber-400` pe iconite)
- `components/AppRouter.tsx:147-155` (header dashboard: `text-2xl font-bold text-white` + subtitlu `text-slate-400 text-sm`)

Fisiere in scop:
- `components/Sportivi/ImportSportiviPage/index.tsx`
- `components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx`
- `components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx` (daca exista, stil wizard)
- `components/Sportivi/ImportSportiviPage/Pas2Raport.tsx`
- `components/Sportivi/ImportSportiviPage/utils.tsx` (doar daca are clase de stil relevante)
- `components/GestiuneExamene/index.tsx` (doar ecranul principal Sesiuni)

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>
