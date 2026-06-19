# Phase 10: Raport Grade & Examene - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Componentă nouă `RaportGradeExamene.tsx` cu 4 tab-uri de analiză: distribuție grade (GRD-01), promovabilitate per sesiune (GRD-02), eligibili next grad (GRD-03), istoric examene per sportiv (GRD-04). View `'raport-grade-examene'` nou în types.ts, accesat din Sidebar sub secțiunea "Rapoarte". Zero modificări la RapoarteExamen.tsx (session management) sau la alte componente existente.

</domain>

<decisions>
## Implementation Decisions

### Amplasare UI
- **D-01:** Componentă nouă `RaportGradeExamene.tsx` + view `'raport-grade-examene'` adăugat în union-ul `View` din `types.ts` — zero impact pe `RapoarteExamen.tsx` (session management)
- **D-02:** Intrare în Sidebar sub secțiunea "Rapoarte" (alături de RaportFinanciar) — navigateRoot('raport-grade-examene')

### Chart tip (GRD-01)
- **D-03:** BarChart vertical Recharts, ordonat după `Grad.ordine` ascending — include bare pentru toate gradele inclusiv cele cu 0 sportivi; axa X = numele gradelor, axa Y = număr sportivi

### Eligibilitate GRD-03
- **D-04:** Sursă `data_ultimei_promotii` per sportiv: `filteredData.inscrieriExamene` — ultimul 'Admis' cu `grad_sustinut_id === sportiv.grad_actual_id`; logica consistentă cu `getEligibleGrade` din `utils/eligibility.ts`
- **D-05:** Fallback la `sportiv.data_inscrierii` dacă nu există nicio înscriere 'Admis' — același fallback ca în `getEligibleGrade`
- **D-06:** Coloane tabel eligibili: Sportiv | Grad Curent | Timp La Grad | Grad Următor — sortat descrescător după timp la grad curent (cel mai "coaptă" eligibilitate apare primul)

### Navigare GRD-04
- **D-07:** Tab „Istoric Sportiv" cu dropdown Select din toți sportivii clubului; click pe un rând din tabelul GRD-03 (Eligibili) populează automat dropdown-ul — navigare cross-tab
- **D-08:** Display: tabel cronologic descrescător după data examenului; coloane: Data | Sesiune | Grad Susținut | Rezultat (Admis/Respins/Neprezentat); sursă `filteredData.inscrieriExamene` filtrat pe `sportiv_id` selectat

### Claude's Discretion
- Structura internă a tab-urilor în RaportGradeExamene (denumiri, iconuri, ordine tab-uri)
- Culori BarChart, badge-uri Rezultat (verde/roșu/gri)
- Empty state per tab când datele lipsesc
- Formatare „Timp La Grad" în tabelul GRD-03 (ex: "14 luni", "1 an 2 luni")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Componente host și pattern referință
- `components/Plati/RaportFinanciar.tsx` — pattern de componentă analytics cu tab-uri; props din AppRouter, folosit ca referință structurală
- `components/GestiuneExamene/RapoarteExamen.tsx` — NU se modifică; citit pentru a înțelege datele primite (sesiuni, inscrieri, grade, istoricGrade)

### Utilitar reutilizat GRD-03
- `utils/eligibility.ts` — `parseDurationToMonths(durationStr)` + `getEligibleGrade(...)` — logica de eligibilitate; GRD-03 adaptează această logică la „azi" în loc de o sesiune viitoare

### Wiring nou (toate trebuie actualizate)
- `types.ts` — adaugă `'raport-grade-examene'` în union-ul `View`
- `components/LazyComponents.tsx` — înregistrare lazy a noii componente
- `components/AppRouter.tsx` — case nou `'raport-grade-examene'` care renderizează RaportGradeExamene
- `components/Sidebar.tsx` — intrare nouă sub secțiunea Rapoarte

### Design system și utilitare
- `components/ui.tsx` — Button, Card, Modal, Input, Select, Badge, Tab components
- `utils/formatareSportiv.ts` — `formatNume(sportiv)` pentru afișare consistentă

### Cerințe
- `.planning/REQUIREMENTS.md` — GRD-01, GRD-02, GRD-03, GRD-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `utils/eligibility.ts` → `parseDurationToMonths(str)`: parsează "6 luni" / "1 an" → număr luni; exportat, refolosibil direct pentru GRD-03
- `filteredData.grade`: array `Grad[]` sortat după `ordine` — baza pentru GRD-01 BarChart și lookup next grade
- `filteredData.sesiuniExamene`: `SesiuneExamen[]` filtrate pe club — baza pentru GRD-02 promovabilitate
- `filteredData.inscrieriExamene`: din `vedere_detalii_examen` — include `rezultat`, `grad_sustinut_id`, `sesiune_id`, `sportiv_id`; baza pentru GRD-02, GRD-03, GRD-04
- `filteredData.sportivi`: include `grad_actual_id` — necesar pentru GRD-03 eligibility loop
- `utils/formatareSportiv.ts` → `formatNume(sportiv)`: format "PRENUME NUME" consistent

### Established Patterns
- Nou view = (1) `View` union în `types.ts` + (2) intrare în `LazyComponents.tsx` + (3) case în `AppRouter.tsx` + (4) link în `Sidebar.tsx`
- Date primite ca props din AppRouter (pattern din RaportFinanciar, RapoarteExamen)
- Recharts deja instalat (v2.15.4) — BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer
- Tab state intern: `useState<'distributie' | 'promovabilitate' | 'eligibili' | 'istoric'>('distributie')`

### Integration Points
- `AppRouter.tsx` primește `filteredData.sesiuniExamene`, `filteredData.inscrieriExamene`, `filteredData.grade`, `filteredData.istoricGrade`, `filteredData.sportivi` deja — toate disponibile ca props
- Sidebar trigger: `navigateRoot('raport-grade-examene')` din NavigationContext
- GRD-03 → GRD-04 cross-tab: stare `selectedSportivId` ridicată la nivel de RaportGradeExamene; click din tabelul Eligibili setează tab + sportivId

</code_context>

<specifics>
## Specific Ideas

- GRD-03: Click pe rând din tabelul Eligibili schimbă tab la „Istoric Sportiv" și precompletează dropdown-ul cu sportivul respectiv
- BarChart GRD-01: bare colorate uniform (nu per grad), tooltip cu count la hover
- GRD-02: tabel sesiuni ordonat cronologic descrescător (cea mai recentă sesiune sus)
- Timp La Grad în GRD-03: calculat ca `differenceInMonths(today, lastPromotionDate)` din `date-fns` (deja instalat)

</specifics>

<deferred>
## Deferred Ideas

- Expandare accordion per grad în GRD-01 cu lista sportivilor la acel grad — v2.0
- Filtrare GRD-02 pe interval de date (sesiuni dintr-un an anume) — v2.0
- Export CSV/PDF pentru GRD-03 lista eligibili — v2.0
- Notificări email/WhatsApp din interfața GRD-03 — v2.0

</deferred>

---

*Phase: 10-raport-grade-examene*
*Context gathered: 2026-06-19*
