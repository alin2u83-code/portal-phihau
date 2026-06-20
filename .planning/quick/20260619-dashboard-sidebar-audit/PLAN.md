---
slug: dashboard-sidebar-audit
date: 2026-06-19
status: complete
---

# Dashboard & Sidebar Audit — Completare linkuri lipsă

## Obiectiv
Orice pagină accesibilă în AppRouter să fie linkată în sidebar sau dashboard (sau ambele).

## Fișiere modificate
1. `components/menuConfig.ts` — adaugă pagini orfane în meniuri
2. `components/AdminMasterMap.tsx` — completare cu toate elementele + secțiune SuperAdmin

## Task-uri

### 1. menuConfig.ts

**adminMenu (SuperAdmin):**
- Activitate Sală: nou grup → grupe, program-antrenamente, prezenta, raport-prezenta, raport-lunar-prezenta
- Activități Naționale: + activitati-nationale
- Financiar: nou grup → financial-dashboard, gestiune-facturi, plati-scadente, jurnal-incasari, raport-financiar, taxe-anuale, tipuri-abonament, configurare-preturi, reduceri
- Setări: + nomenclatoare, reduceri, calendar
- Misc: + calendar

**adminClubMenu:**
- Activitate Sală: + raport-activitate (nu e instructor-only la club admin)
- Activități Naționale: + activitati-nationale
- Financiar: + financial-dashboard, gestiune-facturi, reduceri, nomenclatoare
- Setări: + reduceri, nomenclatoare
- Misc: + calendar

**instructorMenu:**
- Activitate Sală: + raport-activitate, arhiva-prezente
- Misc: + calendar

### 2. AdminMasterMap.tsx

**Membri** (existent): + legitimatii, import-sportivi, deduplicare-sportivi
**Activitate Sală** (existent): + raport-lunar-prezenta, calendar
**Examene & Competiții** (existent): + activitati-nationale
**Administrativ & Plăți** (existent): + jurnal-incasari, taxe-anuale, configurare-preturi, gestiune-facturi, financial-dashboard, reduceri, nomenclatoare
**Setări** (NOU): setari-club, notificari, admin-sms, cereri-inscriere, istoric-activitate, account-settings
**SuperAdmin** (NOU, isFederationAdmin): template-probe, cluburi, structura-federatie, data-maintenance, inlantuiri-admin

Adaugă `permissions` via `usePermissions(useDataProvider().activeRoleContext)` intern.
