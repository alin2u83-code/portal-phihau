# Intel: Constraints

Generated: 2026-06-09
Mode: merge (additive — design constraints observed from reference research DOC)

---

## Active project constraints (from .planning/PROJECT.md)

source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md

### CON-tech-stack
Type: nfr
Content: React 18 + TypeScript + Tailwind — fara librarii externe noi pentru Sistemul Filtrare Unificat
Source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md (Constraints section)

### CON-design-system
Type: api-contract
Content: Toate componentele UI folosesc components/ui.tsx (design system intern) — nu Shadcn, nu MUI, nu Chakra UI
Source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md (Constraints section)

### CON-api-compat
Type: api-contract
Content: Nu se sparge API-ul existent al componentelor — interfetele publice ale componentelor existente raman neschimbate
Source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md (Constraints section)

### CON-client-side-perf
Type: nfr
Content: Filtrare client-side pe date deja incarcate — fara query-uri noi Supabase. Datele sunt in memorie dupa fetch initial
Source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md (Constraints section)

### CON-monolith-scope
Type: nfr
Content: Modificarile pentru filtrare se fac in index.tsx monolitic (~3942 linii) — atentie la re-rendere nedorite; evita state-uri inutile in componente parinte
Source: C:\Users\lungu\portal-phihau\.planning\PROJECT.md (Constraints section)

---

## Design constraints observed from Adservio reference (informational)

These are NOT binding constraints on portal-phihau. They are patterns observed in Adservio
that should be evaluated as ANTI-PATTERNS to avoid (they conflict with our stack decisions)
or as GOOD PATTERNS to adapt.

source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md

### CON-adservio-no-chakra
Type: nfr
Title: Nu se adopta Chakra UI
Content: Adservio foloseste Chakra UI (chakra-table, chakra-modal, chakra-checkbox, chakra-switch).
Portal-phihau are CON-design-system activ care interzice librarii UI externe.
Orice componenta UI inspirata din Adservio se implementeaza folosind components/ui.tsx + Tailwind CSS.
Status: Informational — ANTI-PATTERN de adoptat direct
Source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md (section 1)

### CON-adservio-no-jquery
Type: nfr
Title: Nu se adopta jQuery UI legacy
Content: Adservio are pagini legacy cu jQuery UI Dialog (ui-dialog). Portal-phihau este full React 18 SPA.
Nicio componenta jQuery nu se introduce.
Status: Informational — ANTI-PATTERN de adoptat direct
Source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md (section 6, clase CSS catalog legacy)

### CON-adservio-inline-form-pattern
Type: protocol
Title: Formular inline vs modal — pattern de evaluat
Content: Adservio foloseste doua abordari in paralel: formular inline in tabel (absente) si modal Chakra UI (notare clasa).
La portal-phihau, echivalentele se evalueaza caz cu caz: absente prezenta = inline (deja implementat), notare examen = modal (pattern recomandat din research).
Status: Informational — de tinut cont la design viitor
Source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md (sections 4 and 5)

### CON-adservio-spa-nav
Type: protocol
Title: Navigatie SPA fara anchor tags — pattern validat
Content: Adservio foloseste butoane chakra-button fara <a> pentru navigatie — SPA pur.
Portal-phihau are acelasi pattern (activeView string in NavigationContext, fara URL routing intern).
Pattern-ul este consistent si validat de ambele aplicatii.
Status: Informational — pattern confirmat ca bun
Source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md (section 2)

### CON-adservio-role-determines-actions
Type: protocol
Title: Rolul determina actiunile, nu datele afisate
Content: In Adservio, view elev = view parinte — acelasi URL, aceleasi date, doar actiunile difera dupa rol.
Portal-phihau are acelasi pattern in SportivDashboard.
Orice nou feature de catalog/raport per sportiv trebuie sa respecte aceasta conventie.
Status: Informational — GOOD PATTERN confirmat
Source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md (section 8 and 9, Pattern 5)
