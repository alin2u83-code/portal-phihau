# Deferred Items — 260709-kr1

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| scope-extension | `CompetitieFilterBar` e cablat momentan DOAR pe tab-ul "Categorii" din `Competitii/index.tsx` (~linia 288). Nu e refolosit pe tab-urile Înscrieri/Raport/Template. Extinderea filtrului unificat descris în CLAUDE.md la toate cele 4 tab-uri e un gap separat de acest task, deliberat NEIMPLEMENTAT în 260709-kr1. | Deferred | 2026-07-09 |

## Note

Acest quick task (260709-kr1) acoperă DOAR conversia filtrelor existente la `SearchableSelect` (căutare inline) pe tab-urile/componentele unde erau deja prezente filtre `<select>` cu liste lungi — nu extinderea sistemului de filtrare unificat (gen/vârstă/grad/probă) la Înscrieri/Raport/Template din modulul Competiții. Vezi PLAN.md `success_criteria` și CONTEXT.md `<specifics>` pentru scope-ul exact.

Duplicat notă: fișierul `.planning/quick/260709-kr1-searchableselect-pentru-filtre-luna-an-g/deferred-items.md` (fără prefix) conține aceeași informație, creat anterior în timpul planificării.
