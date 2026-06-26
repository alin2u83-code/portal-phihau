# Quick Task 260626-buf: Sistem Perioade Vacanță Antrenamente - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Task Boundary

Sistem pentru gestionarea perioadelor de antrenamente de vacanță per club. Adminul setează intervale de date (data_start, data_end), selectează manual sportivii participanți, și poate gestiona multiple perioade pe an.

</domain>

<decisions>
## Implementation Decisions

### Locație UI Admin
- Tab nou "Vacanțe" în modulul Plăți (lângă "Abonamente"), NU modul separat în sidebar
- Logica: vacanța e legată de abonamente/plăți, nu de grupe

### Mecanism Opt-in Sportivi
- Adminul selectează manual sportivii participanți pentru fiecare perioadă
- Sportivul NU are buton de opt-in din dashboard (nu e nevoie)
- Adminul poate adăuga/scoate sportivi oricând

### Generare Plată
- NU se generează factură automată la opt-in
- Admin înregistrează manual plata din Portofel ca orice altă plată
- Tipul abonamentului "Vacanță" e un label informativ, nu trigger automat

### Prezență Vacanță
- Antrenamentele de vacanță folosesc ACELAȘI sistem Prezență existent
- Apar în calendarul normal — admin marchează prezența ca de obicei
- Nu se creează sistem de prezență separat

### Claude's Discretion
- Schema DB: `perioade_vacanta` (id, club_id, denumire, data_start, data_end, created_at)
- Schema DB: `participare_vacanta` (id, sportiv_id, perioada_id, created_at)
- RLS: politici standard per club_id
- UI: modal CRUD pentru perioade + selector sportivi (multi-select)

</decisions>

<specifics>
## Specific Requirements

- Multiple perioade pe an permise pentru același club
- Admin poate edita și șterge perioade (cu confirmare dacă au participanți)
- Lista sportivi participanți vizibilă per perioadă
- Nu se blochează înregistrarea prezenței normale în perioada de vacanță

</specifics>

<canonical_refs>
## Canonical References

- Structura tabelelor existente: `tipuri_abonamente`, `plati` în DB
- Pattern CRUD existent: componente din `components/Plati/`
- Design system: `components/ui.tsx`

</canonical_refs>
