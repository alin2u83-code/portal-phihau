---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 10
subsystem: ui
tags: [plati, hub, tokens, tailwind]
requires: [34-01, 34-04, 34-05]
provides:
  - PlatiHub cu strip de tab-uri conform contractului HubTabs, fara h1
  - PlatiScadente cu tabel/filtre/actiuni pe tokeni
affects: [components/Plati/hub/PlatiHub.tsx, components/Plati/PlatiScadente.tsx]
key-files:
  modified:
    - components/Plati/hub/PlatiHub.tsx
    - components/Plati/PlatiScadente.tsx
decisions:
  - "Singurul Button primary pe ecran: 'Incaseaza N facturi selectate' (actiunea financiara principala); 'Trimite notificari restantieri', 'Genereaza abonamente', 'Notifica debitori' -> secondary"
metrics:
  tasks: 2
  files: 2
  completed: 2026-11-03
---

# Phase 34 Plan 10: Plati-hub si PlatiScadente pe tokeni Summary

Strip de tab-uri al Plati-hub adus la contractul comun (44px, subliniere 2px --t-primary, fara iconite/pastile), chip-uri de sectiune neutre, iar tabelul si actiunile din PlatiScadente pe tokeni, fara nicio modificare de logica financiara.

## Commits

- `dcdd062` feat(34-10): PlatiHub fara h1, strip de tab-uri si chip-uri neutre
- `37cb783` feat(34-10): PlatiScadente tabel, filtre si actiuni pe tokeni

## Ce s-a facut

**PlatiHub.tsx:** h1 "Plati & Facturi" sters; butonul "Meniu" ramane `secondary ghost sm` pe rand propriu; strip `role="tablist"` cu clasele din HubTabs; `ICONITE_TABURI` si importurile de iconite eliminate; chip-uri de sectiune `rounded-lg`, neutre. `rezolvaPozitieHub`, `schimbaPozitie`, F1-F4, efectul de golire a selectiei, `propsComune`, Suspense si Tab* neatinse.

**Tab*.tsx:** verificate, nu contineau clase hardcodate (slate/font-bold/text-white) -> nemodificate.

**PlatiScadente.tsx (doar randare):**
- l.816 h1 "Management Facturi & Plati" sters (titlul e in Header); l.818 gap-4 -> gap-2 la Card-ul de filtre
- l.858-873 butoane: info/warning -> secondary; notificari restantieri primary -> secondary; Incaseaza success (cu `bg-green-800` hardcodat) -> primary
- l.947-957 antet: `text-xs font-semibold`; tbody `divide-[var(--t-table-border)]`; rand cu `hover:bg-[var(--t-table-row-hover)]` (selectia foloseste acelasi token in loc de `bg-brand-primary/20`)
- celule: text-white/slate/font-bold/font-medium -> `--t-text` / `--t-text-muted`, sume `font-semibold`
- chip-uri sky/amber din randuri: neutre / text amber fara fundal; `text-[10px]` -> `text-xs`; pastila de stare (STATUS_DISPLAY_CONFIG) ramasa singura pastila de stare per rand
- lista mobila si PrezenteFacturaRow (l.74): aceleasi inlocuiri de clase

## Deviations from Plan

**1. [Rule 1 - verify-gate fals pozitiv, documentat]** Poarta T-34-10-01 (diff fara `set[A-Z]...(` / `restDePlata`) raporteaza 3 linii: `variant="primary"->"secondary"` pe butonul `setIsNotificariRestantieriOpen(true)` si doua `restDePlata(p).toFixed(2)` unde s-au schimbat doar clasele. Expresiile/handler-ele sunt identice; schimbarea e strict de clasa/variant. Necesar pentru "un singur primary".

**2. Neschimbat (limita gate-ului):** butoanele de rand `variant="success"` (Incaseaza rapid, icon-only, l.1010/1148) nu au fost atinse, pentru ca linia contine `setPlataForPayment(`/`setPaymentAmount(`. Raman verzi. Filtrele folosesc componentele ui.tsx (Select/SearchInput) fara control de inaltime `h-11 lg:h-10` din acest fisier; doar gap-ul a fost ajustat. Banner-ul amber "Sportivi fara factura" si modalele nu au fost atinse.

## Verificare

- `npx tsc --noEmit`: zero erori in fisierele atinse
- `npm run build`: reuseste
- NU verificat: browser (1280x800 / 390x844, Lavender Light + QwanKiDo Blue), teste `platiHubConfig.test.ts` / `soldService.test.ts` nerulate (fara runner verificat)

## Known Stubs

None.

## Self-Check: PASSED
- components/Plati/hub/PlatiHub.tsx, components/Plati/PlatiScadente.tsx modificate; commit-uri dcdd062, 37cb783 existente.
