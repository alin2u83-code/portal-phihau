# Audit securitate vibecoding — 21.11.2026
Origine: reel-uri despre securitatea aplicatiilor vibe-coded. Audit read-only, apoi fixuri.

## Facut
- `vercel.json`: adaugat X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy si CSP **Report-Only** (nu blocheaza nimic).
- `npm audit fix`: vulnerabilitati productie 11 -> 3 (ramase: `xlsx`, fara fix). tsc curat, `vite build` OK.

## De facut
- Dupa deploy pe preview: citeste consola pentru incalcari CSP; apoi schimba `Content-Security-Policy-Report-Only` in `Content-Security-Policy`.
- Inlocuieste `xlsx` (prototype pollution + ReDoS, fara fix) cu ExcelJS.
- RLS rezidual: tranzactii, grade, istoric_grade, eveniment, reduceri, cluburi (Faza 25).
- Neverificat: RLS live, test in browser.
