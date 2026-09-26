# Phase 31: Hub Plati si Facturi — Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Modulul Plati e in prezent 14 view-uri top-level separate (rutate individual in `AppRouter.tsx`), fara punct de intrare comun, gasite/atinse din carduri diferite (`UnifiedDashboard`, `AdminDashboard`, `ReportsDashboard`). Aceasta faza consolideaza cele 14 view-uri intr-un singur hub navigabil dintr-un punct unic de intrare in dashboard, cu 4 tab-uri interne dupa scop (Facturi / Incasari / Rapoarte / Configurare). Familii si Deconturi Federatie raman ecrane separate (nu intra in hub). Plus: ecran de detaliu factura cu suma facturata vs incasata editabile separat, istoric tranzactii pe factura, date complete (tip taxa, perioada, sportiv, club) si buton de corectie rapida.

**Nu intra in scope:** logica de business a platilor (calcule sold, RLS, triggere DB) — doar reorganizare navigare/UI si ecranul de detaliu factura.

</domain>

<decisions>
## Implementation Decisions

### Grupare tab-uri (confirmata de utilizator)
- **D-01:** Tab "Facturi" — inlocuieste `gestiune-facturi`, `plati-scadente`, `facturi-fara-prezenta`.
- **D-02:** Tab "Incasari" — inlocuieste `jurnal-incasari`, `istoric-plati`.
- **D-03:** Tab "Rapoarte" — inlocuieste `raport-financiar`, `financial-dashboard`.
- **D-04:** Tab "Configurare" — inlocuieste `tipuri-abonament`, `configurare-preturi`, `reduceri`, `taxe-anuale`, `nomenclatoare` (tipuri_plati).
- **D-05:** `familii` si `deconturi-federatie` raman view-uri separate, NU intra in hub — motiv: domenii diferite (familii = date sportivi, deconturi = flux club-federatie), nu factura individuala.

### Ecran detaliu factura (bug + feature)
- **D-06:** Suma facturata (`suma_initiala`) si suma incasata/ramasa (`suma`) sunt campuri separate, editabile independent — nu un singur camp "sumă".
- **D-07:** Update-ul catre tabela `plati` trebuie sa fie payload explicit whitelist (status/suma_initiala/suma/descriere/data) — NU spread din obiectul de stare, pentru ca acesta provine din view-ul `rbv_plati_club` (are camp extra `club_nume` inexistent ca si coloana reala) + campuri calculate client-side (`descriereDetaliata`, `reducereDetalii` ca obiect). Pattern deja aplicat corect in `GestiuneFacturi.tsx:353-357` si `UserProfile.tsx:314` — de urmat consecvent in tot hub-ul.
- **D-08:** Ecranul de detaliu trebuie sa arate: suma factura vs suma incasata (separat), istoric tranzactii asociate facturii, alte date (tip taxa, perioada luna/an, sportiv, club), plus un buton de actiune rapida (ex: "Marcheaza Achitat cu suma X") fara editare manuala camp cu camp.
- **D-09:** Acces la ecranul de detaliu si butonul de corectie rapida: ADMIN_CLUB si INSTRUCTOR (nu doar SUPER_ADMIN_FEDERATIE).

### Bug deja rezolvat in aceasta sesiune (referinta, nu re-implementa)
- `components/Plati/PlatiScadente.tsx` `handleSaveEdit` (linia ~485) fixat: payload whitelist explicit in loc de spread; camp `suma_initiala` adaugat separat in modalul de editare existent. Planul acestei faze trebuie sa verifice ca acelasi tipar de bug (spread peste view-uri cu coloane suplimentare) nu exista si in celelalte componente Plati care fac `.update()` pe tabela `plati` (`GestiuneFacturi.tsx`, `RaportFinanciar.tsx`, `JurnalIncasari.tsx`, `SMSIncasari.tsx`).

### Claude's Discretion
- Denumirea exacta a view-ului hub nou (ex: `plati-hub` sau reutilizare `plati-scadente` ca alias) — Claude alege convenind cu `NavigationContext`/`View` union din `types.ts`.
- Daca hub-ul se implementeaza ca un singur component cu tab-uri interne (ca pattern-ul Competitii) sau ca shell + sub-rutare — decizie tehnica, nu de produs.
- Ordinea exacta a tab-urilor in UI si iconitele.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Modulul Plati — cod existent
- `components/Plati/PlatiScadente.tsx` — bug fixat linia ~485 (handleSaveEdit), model de payload whitelist.
- `components/Plati/GestiuneFacturi.tsx:333-368` — pattern corect deja existent de update whitelist (`handleOpenEdit`/`handleSaveEdit`).
- `components/UserProfile.tsx:314` — pattern de destructurare pentru a elimina campuri joined (`club_nume`, `grad_nume`, etc.) inainte de update.
- `hooks/usePlati.ts` — sursa datelor: view `rbv_plati_club` (JOIN club), explica de ce `Plata` are campuri extra la runtime fata de tipul TS din `types.ts`.
- `types.ts:157-183` (`interface Plata`) — campurile reale vs. campurile de JOIN documentate in comentarii.
- `components/AppRouter.tsx:228-285` — toate cele 14 case-uri de view routate azi (sursa inventarului din `<domain>`).
- `components/UnifiedDashboard.tsx:96-98`, `components/AdminDashboard.tsx:96-131`, `components/ReportsDashboard.tsx:11-16` — cele 3 puncte de intrare curente fragmentate care trebuie consolidate/actualizate.

### Convenții proiect
- `CLAUDE.md` (proiect) — design system intern `components/ui.tsx`, fara Shadcn/MUI, filtrare client-side, română pentru domeniu.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui.tsx` — `Modal`, `Card`, `Button`, `Select`, `Input` — de refolosit pentru orice tab nou/ecran detaliu.
- Pattern hub-cu-tab-uri deja validat in proiect la modulul Competitii (`project_competitii.md` in memorie) — model de urmat pentru structura interna a hub-ului Plati.

### Established Patterns
- Payload whitelist explicit la `.update()` pe tabele cu view-uri JOIN suprapuse (`rbv_plati_club`, `view_plata_sportiv`) — obligatoriu, nu doar recomandat, pentru a evita PGRST204.
- Navigare SPA fara URL routing — `activeView` string in `NavigationContext`; hub-ul nou trebuie sa se integreze in acelasi model (probabil cu state intern de tab, nu view-uri separate per tab).

### Integration Points
- `AppRouter.tsx` — punctul unde cele 14 case-uri trebuie reduse/redirectionate catre noul hub.
- `DataContext` / `useData()` — sursa `filteredData.plati` neschimbata, doar consumatorii se reorganizeaza.

</code_context>

<specifics>
## Specific Ideas

Utilizatorul a confirmat explicit gruparea D-01..D-04 si faptul ca Familii + Deconturi Federatie raman separate (D-05). Ecranul de detaliu factura (D-06..D-09) a fost cerut explicit ca reactie la bug-ul de editare sume.

</specifics>

<deferred>
## Deferred Ideas

None — discutia a ramas in limitele fazei (reorganizare navigare + ecran detaliu factura).

</deferred>

---

*Phase: 31-Hub Plati si Facturi*
*Context gathered: 2026-09-26*
