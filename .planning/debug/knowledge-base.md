# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## loading-hang-istoric-grade — App blocata pe loading screen, query vedere_istoric_grade_sportiv PENDING indefinit (URL supradimensionat)
- **Date:** 2026-07-12
- **Error patterns:** hang loading, fetchAllPages, vedere_istoric_grade_sportiv, PostgREST, PENDING indefinit, timeout tacut, MartialArtsSkeleton, loadingData, .in(sportiv_id), URL supradimensionat, HeadersOverflowError, UND_ERR_HEADERS_OVERFLOW, connection pool
- **Root cause:** Query-ul paginat `fetchAllPages` pentru `vedere_istoric_grade_sportiv` per club folosea `.in('sportiv_id', idsInClub)` cu id-urile TUTUROR sportivilor clubului inline in URL, pe langa `.eq('club_id', clubId)`. Pentru cluburi mari (400+ sportivi), URL-ul generat depasea ~14-15KB, peste limita acceptata de infrastructura Supabase (proxy/gateway), cauzand request-ul sa esueze sau sa ramana blocat fara raspuns (hang tacut, fara eroare, fara timeout vizibil in browser). Clauza era redundanta dupa fix-ul 260708-h7k care garanteaza `club_id` derivat corect (COALESCE) din `sportivi.club_id` in view.
- **Fix:** Eliminat query-ul prealabil pentru `clubSportivIds` si clauza `.in('sportiv_id', idsInClub)` din constructia `fetchAllPages` pentru istoricGrade in `hooks/useDataProvider.ts`. Se foloseste acum doar `.eq('club_id', clubId)` + paginare `.range()`, simetric cu `inscrieriExamene`.
- **Files changed:** hooks/useDataProvider.ts
---
