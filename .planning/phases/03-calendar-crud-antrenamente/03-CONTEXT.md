# Phase 3: Calendar & CRUD Antrenamente - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Înlocuiește placeholder-ul `TabAntrenamente` din `GrupaDetailView.tsx` cu un calendar lunar funcțional: grid 7 coloane cu dot-uri colorate pe zile, panel dedesubt la click pe zi, modal adaugă antrenament one-off, modal anulare cu motiv opțional, hard delete cu confirmare și buton reactivare antrenamente anulate.

</domain>

<decisions>
## Implementation Decisions

### Calendar Layout
- **D-01:** Grid lunar 7 coloane (Luni–Duminică), 4-6 rânduri — div-uri Tailwind fără librărie externă. Zero dependențe noi.
- **D-02:** Navigație: săgeți prev/next lună. Header: "Lună An" (ex: "Iunie 2026"). Fără buton Jump-to-today.
- **D-03:** Dot-uri colorate pe zile: verde = planificat/efectuat, roșu = anulat. Maximum vizibil per zi: nu e specificat — Claude decide (ex: 3 dots + "..." dacă mai mult).
- **D-04:** Ziua de azi: border indigo + text bold pe numărul zilei. Consistentă cu pattern-ul portalului.

### Expand zi la click
- **D-05:** Panel fix dedesubt grilei (nu modal, nu inline expand pe rând). Ziua selectată = highlight activ.
- **D-06:** Dacă ziua nu are antrenamente: mesaj "Niciun antrenament pe [data]" + buton primar "Adaugă Antrenament".
- **D-07:** Per antrenament în panel: Ora start–sfârșit | Badge status (planificat/anulat/efectuat) | Butoane: [Anulează] [Șterge] (și [Reactivează] dacă status='anulat'). Compact, pe un rând.

### Adaugă antrenament one-off
- **D-08:** Modal dedicat pentru adăugare. Câmpuri: Data (input date, pre-filled cu ziua selectată din calendar), Ora start (time), Ora sfârșit (time). `is_recurent=false` hardcodat. Submit → INSERT în `program_antrenamente`.
- **D-09:** Butonul "Adaugă Antrenament" plasat în header-ul tab-ului Antrenamente (colț dreapta sus), mereu vizibil indiferent de ziua selectată.

### Anulare antrenament
- **D-10:** Butonul "Anulează" deschide modal mic cu textarea "Motiv anulare" (OPȚIONAL — nu required, spre deosebire de ROADMAP care spunea required). Submit → UPDATE `status='anulat'` și `motiv_anulare=text` (sau NULL dacă necompletat). Antrenamentul rămâne în DB, apare cu dot roșu.
- **D-11:** Anularea NU este ireversibilă. Pe antrenamentele cu status='anulat' apare butonul [Reactivează] → UPDATE `status='planificat'`, `motiv_anulare=null`.

### Ștergere antrenament
- **D-12:** Hard delete cu `ConfirmButton` (din Phase 8 — primul click = "Ești sigur? [Da] [Nu]") → DELETE din `program_antrenamente`. Complet eliminat, nu mai apare în calendar.

### Reutilizare `useCalendarView`
- **D-13 (Claude's Discretion):** Hook-ul existent `hooks/useCalendarView.ts` are deja `fetchAntrenamente` (fetch lunar), `handleSaveCustom` (insert one-off), `handleGenerate`. Planner decide dacă se reutilizează direct sau se adaptează în `TabAntrenamente` cu un query React Query local. Preferabil reutilizare pentru a evita duplicarea logicii.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Componenta de modificat
- `components/Grupe/GrupaDetailView.tsx` — `TabAntrenamente` (linia 24-36) = placeholder de înlocuit; structura GrupaDetailView cu tab-uri și props existente
- `components/Grupe/index.tsx` — orchestratorul Grupe; mountează GrupaDetailView; `grupaSelectedForDetail` state

### Hook existent de reutilizat
- `hooks/useCalendarView.ts` — fetch lunar din `program_antrenamente`, `handleSaveCustom` (insert one-off), `handleGenerate`; studiați înainte de a reimplementa logica

### Tipuri
- `types.ts` (liniile 323-362) — `Antrenament` (id, data, ora_start, ora_sfarsit, status, motiv_anulare, is_recurent), `ProgramItem`, `Grupa`

### Decizii din faze anterioare
- `.planning/phases/02-navigare-grupe-drill-down/02-CONTEXT.md` — D-01 (state local în index.tsx), D-09 (tab activ implicit = antrenamente), D-10 (placeholder pregătit)
- `.planning/phases/01-db-types/01-CONTEXT.md` — decizii schema DB: status CHECK constraint ('planificat'|'anulat'|'efectuat'), motiv_anulare nullable TEXT

### Design System
- `components/ui.tsx` — Button, Card, Modal, Input, ConfirmButton (Phase 8). Fără Shadcn/MUI.
- `components/icons.tsx` — pentru iconițe acțiuni (ChevronLeft, ChevronRight, PlusIcon, XCircleIcon, TrashIcon)

### DB Schema
- `sql/migrations/add_status_motiv_antrenamente.sql` — migrația Phase 1; confirmă coloanele status + motiv_anulare pe `program_antrenamente`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hooks/useCalendarView.ts` — hook complet cu fetch lunar, insert one-off, generare; reutilizabil sau adaptabil direct
- `ConfirmButton` (din `components/ui.tsx`, Phase 8) — pentru butonul Șterge (D-12); primul click = confirm inline
- `components/ui.tsx` → `Button`, `Card`, `Input` — design system; tab-urile ca div+className (nu componentă Tab dedicată)
- `utils/date.ts` → `formatTime` — util pentru afișare ore (importat deja în GenerareAntrenamenteModal, GrupaCard)

### Established Patterns
- **Query lunar:** `supabase.from('program_antrenamente').select(...).gte('data', startOfMonth).lte('data', endOfMonth)` — pattern din `useCalendarView.ts`
- **Data locală:** `toLocaleDateString('sv-SE')` returnează `YYYY-MM-DD` fără decalaj UTC — pattern consacrat în proiect
- **State modal:** fiecare modal gestionat cu useState în componenta parent (GrupaDetailView)
- **Invalidare cache:** `queryClient.invalidateQueries({ queryKey: ['grupe'] })` după mutații + `clearCache` localStorage — pattern din TabOrar

### Integration Points
- `TabAntrenamente` în `GrupaDetailView.tsx` — locul exact de înlocuit (liniile 24-36)
- `GrupaDetailView` primește `grupa: GrupaWithDetails` — include `grupa.id`, `grupa.club_id`, `grupa.program` (orar săptămânal)
- Buton "Adaugă Antrenament" în header-ul GrupaDetailView (D-09): `GrupaDetailView.tsx` zona header + tab bar (linia 264-286)

</code_context>

<specifics>
## Specific Ideas

- Motiv anulare OPȚIONAL (deviere de la ROADMAP): textarea disponibil, dar submit posibil fără text
- Reactivare antrenament anulat: buton [Reactivează] vizibil doar pe antrenamente cu status='anulat'
- Panel dedesubt grilei: nu overlay, nu modal — element DOM fix care apare sub calendar

</specifics>

<deferred>
## Deferred Ideas

- Jump-to-today buton (nav calendar) — considerat, respins ca complexitate inutilă pentru MVP
- Tip antrenament (regular/stagiu/examen) în formularul de adăugare — v2
- Calendar săptămânal (week view) — deja în deferred de la STATE.md (v2)
- WhatsApp la anulare antrenament — deja în deferred de la STATE.md (v2)

</deferred>

---

*Phase: 3-calendar-crud-antrenamente*
*Context gathered: 2026-06-15*
