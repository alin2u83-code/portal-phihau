# Phase 2: Navigare Grupe Drill-Down - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Adaugă navigare drill-down în modulul Grupe: butonul "Detalii" pe GrupaCard deschide GrupaDetailView (view swap în NavigationContext, nu modal) cu 3 tab-uri — Antrenamente | Orar | Sportivi. Tab Orar: logică copiată din OrarEditorModal, inline fără wrapper Modal. Tab Sportivi: lista sportivilor + buton care deschide AdaugaSportiviModal existent. Zero logică de calendar sau anulare antrenament (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Drill-down mount (Claude's discretion)
- **D-01:** GrupaDetailView se montează ca **view swap în NavigationContext** — `setActiveView('grupa-detail')` cu `viewParams: { grupaId }`. Butonul Back din view navighează înapoi la gridul de carduri prin NavigationContext history stack. Nu se folosește modal fullscreen (ar conflicta cu z-index-ul modalelor existente și ar pierde navigarea back din hardware button).

### OrarEditorModal inline în Tab Orar
- **D-02:** Logica din OrarEditorModal se **copiează direct** în componenta Tab Orar (nu se extrage o componentă partajată). OrarEditorModal rămâne neschimbat — zero risc de regresie la modalul existent.
- **D-03:** Butonul "Anulează" în Tab Orar inline → **resetează state-ul local** la `grupa.program` original (comportament Undo, nu navighează). Nu există un modal de închis.
- **D-04:** După "Salvează Orar" cu succes → **toast succes + rămâne în Tab Orar** cu datele actualizate. Nu se sare automat pe alt tab.

### Tab Sportivi conținut
- **D-05:** Tab Sportivi = **lista sportivilor inline** (query separat cu detalii: id, nume, prenume per grupă) + butonul "Adaugă Sportivi" care deschide **AdaugaSportiviModal existent** ca modal separat. AdaugaSportiviModal nu se copiază/extrage inline.
- **D-06:** Lista sportivilor în tab = **read-only** (nume + grad). Nicio acțiune de scoatere din grupă direct din tab — managementul complet prin AdaugaSportiviModal.

### Buton Detalii în GrupaCard
- **D-07:** "Detalii" = **buton primar CTA** care **înlocuiește** butoanele "Orar" și "Sportivi" de pe card. Card final: `[Detalii]` (primary) | `[Gestionează]` (secondary) | `[...]` (dropdown: Modifică Program, Generează Antrenamente, Secundari, Șterge Grupa).
- **D-08:** Butonul "Gestionează" (deschide GrupaFormModal — edit denumire/sală/descriere) **rămâne** pe card alături de "Detalii".
- **D-09:** Tab implicit la deschidere GrupaDetailView: **Antrenamente** (pregătit pentru Phase 3 care adaugă calendarul).

### Tab Antrenamente (Phase 2)
- **D-10:** Tab Antrenamente în Phase 2 = **placeholder** ("Calendar antrenamente — disponibil în curând") sau lista simplă a antrenamentelor din `program_antrenamente`. Calendarul complet vine în Phase 3. Planner decide formatul exact al placeholder-ului.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Componente existente de integrat
- `components/Grupe/GrupaCard.tsx` — structura butoanelor actuale (Gestionează | Sportivi | Orar | ...); D-07 modifică acest fișier
- `components/Grupe/OrarEditorModal.tsx` — logica completă de copiat în Tab Orar (D-02); rămâne nemodificat
- `components/Grupe/AdaugaSportiviModal.tsx` — modalul existent deschis din Tab Sportivi (D-05); rămâne nemodificat
- `components/Grupe/index.tsx` — orchestratorul Grupe; mountează toate modalele; trebuie să mounteze GrupaDetailView și să gestioneze `grupaSelectedForDetail`

### Navigare SPA
- `contexts/NavigationContext.tsx` — `setActiveView`, `viewParams`, history stack; D-01 folosește view swap pattern

### Schema DB & Types
- `types.ts` — interfețele `Antrenament`, `Grupa`, `ProgramItem` (actualizate în Phase 1)
- `.planning/phases/01-db-types/01-CONTEXT.md` — decizii Phase 1 (status/motiv_anulare pe Antrenament, TipStagiu)

### Documentație proiect
- `docs/arhitectura.md` — SPA navigation pattern, NavigationContext, activeView
- `.planning/PROJECT.md` — requirements active NAV-01, NAV-02, NAV-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui.tsx` — Button, Card, Modal, Input, Select (design system intern; tab-urile se implementează cu div+className, nu o componentă Tab dedicată)
- `components/Grupe/GrupaCard.tsx` (linia 141-214) — row de butoane cu dropdown "..." deja implementat; D-07 modifică exact această zonă
- `components/Grupe/OrarEditorModal.tsx` (linia 23-173) — logică completă de editat orar săptămânal: `program` state, `handleSave`, `handleAddItem`, `handleRemoveItem`, `programByDay` memo; se copiază în Tab Orar

### Established Patterns
- **View swap SPA**: nu există URL routing; navigarea între view-uri se face prin `setActiveView(viewName, { params })` din NavigationContext
- **Modal state în parent**: Grupe/index.tsx gestionează `grupaForOrar`, `grupaForAdaugaSportivi` etc. ca state local; GrupaDetailView urmează același pattern — `grupaSelectedForDetail` în index.tsx
- **Query per componentă**: fiecare componentă face propriul query Supabase (nu depinde de DataContext pentru detalii); Tab Sportivi face query separat pentru lista sportivilor
- **setGrupe ca prop**: OrarEditorModal primește `setGrupe` pentru a actualiza cache-ul local după salvare; Tab Orar trebuie să primească același prop sau echivalent (queryClient.invalidateQueries)

### Integration Points
- `components/Grupe/index.tsx` → adaugă state `grupaSelectedForDetail`, handler `handleDetaliiGrupa`, și renderizare condiționată `{grupaSelectedForDetail ? <GrupaDetailView> : <gridCarduri>}`
- `components/Grupe/GrupaCard.tsx` → prop nou `onDetalii: (g) => void`; elimină props `onAdaugaSportivi` și `onConfigurareOrar` (nu mai apar ca butoane principale)
- `contexts/NavigationContext.tsx` → view swap sau state local în Grupe/index.tsx (planner alege)

</code_context>

<specifics>
## Specific Ideas

- GrupaCard simplificată: 2 butoane principale (Detalii + Gestionează) + dropdown. Mai aerisit, mai clar.
- Tab Antrenamente = placeholder în Phase 2 — nu inventăm funcționalitate prematură, Phase 3 adaugă calendarul complet.
- "Anulează" în Tab Orar = Undo local (nu navighează) — comportament intuitiv când nu există context de modal.

</specifics>

<deferred>
## Deferred Ideas

- Tab suplimentar "Editează Grupă" în GrupaDetailView (editare denumire/sală) — Phase 2 păstrează "Gestionează" ca buton separat pe card
- Acțiuni per sportiv în Tab Sportivi (scoatere din grupă direct) — Phase 2 = read-only; management prin AdaugaSportiviModal
- Navigare directă la un tab specific din GrupaCard (ex: click "Orar" → deschide Detalii pe Tab Orar) — complexitate nejustificată în MVP; toate drumurile pornesc din Tab Antrenamente

</deferred>

---

*Phase: 2-navigare-grupe-drill-down*
*Context gathered: 2026-06-05*
