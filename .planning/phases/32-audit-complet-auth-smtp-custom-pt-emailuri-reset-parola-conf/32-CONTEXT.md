# Phase 32: Audit complet Auth — SMTP custom, reziliență import bulk, monitorizare praguri - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit + hardening complet al modulului Auth existent (Supabase Auth email+parolă), pe 5 fronturi concrete:
1. SMTP custom pentru emailurile Auth (reset parolă, confirmare cont, cod MFA) — azi zero SMTP configurat, folosim canalul default Supabase (rate-limitat agresiv).
2. Reziliență import/generare bulk conturi sportivi la rate limits Auth (retry/backoff).
3. Monitorizare praguri Auth + alertă vizuală cand ne apropiem de limită.
4. Politici parolă (la schimbare, nu doar la creare) + expirare sesiune/token.
5. Audit acoperire MFA (fără schimbări de implementare — MFA e deja live din Faza 17).

Nu se adaugă capabilități noi de business — strict hardening/reziliență pe fluxul de autentificare existent.

</domain>

<decisions>
## Implementation Decisions

### SMTP Custom
- **D-01:** Provider SMTP = mailbox Hostinger pe domeniul **phihau.ro** (ex. `noreply@phihau.ro`), conectat DIRECT în Supabase Dashboard → Auth → SMTP Settings. Fără n8n în calea de trimitere — Supabase trimite el însuși emailul folosind SMTP-ul Hostinger.
- **D-02:** Decizia e temporară/provizorie — utilizatorul clarifică ulterior dacă se trece pe domeniul federației `frqkd.ro`. Researcher/planner trebuie să implementeze astfel încât schimbarea domeniului SMTP să fie doar o reconfigurare de credențiale (host/port/user/parolă), nu o rescriere de cod.
- **D-03:** Cele 3 fluxuri de email Auth care beneficiază de acest SMTP: `resetPasswordForEmail` (LoginPage.tsx), `signUp` confirmare cont (authService.ts), `signInWithOtp` cod MFA (emailMfaService.ts). Toate trec prin același canal Supabase Auth — o singură configurare SMTP le acoperă pe toate trei.
- **Claude's Discretion:** Hostinger folosește n8n pe același hosting — dacă în research reiese că mailbox-ul Hostinger nu suportă SMTP extern direct (ex. restricții port 587/465), documentează blocajul și revino la utilizator înainte de a improviza o soluție prin n8n.
- **D-01b:** Confirmat explicit — Supabase Auth SMTP Settings are UN SINGUR "Sender email" global (nu suportă adrese diferite per tip de email fără Auth Hook custom, deja respins). O singură adresă `noreply@phihau.ro` acoperă toate cele 3 fluxuri (reset/confirmare/MFA); NU se implementează adrese separate (`reset@`, `mfa@` etc.) în această fază.

### Retry/Backoff Bulk Import
- **D-04:** Strategie combinată: delay preventiv fix între requesturi secvențiale (reduce șansa de 429) + retry automat cu backoff exponențial (2-3 încercări, delay crescător ex. 1s/3s/9s) pe erorile de rate-limit specific. Erorile non-rate-limit (validare, sportiv are deja cont) rămân imediate, fără retry.
- **D-05:** Locul exact al buclei: `components/Sportivi/index.tsx` (funcția care generează `bulkLinkuriList` — search `bulkLinkuriStatus`/`for (let i = 0; i < sportiviFaraConturi.length`), care apelează `POST /api/genereaza-magic-link` per sportiv, secvențial, fără delay/retry azi.
- **Claude's Discretion:** UI-ul de progres (`bulkLinkuriProgres`/`bulkLinkuriTotal`) trebuie să reflecte și încercările de retry (nu doar succes/eșec final) — planner decide cum (ex. contor separat sau tooltip pe eroare).

### Monitorizare Praguri + Alertă
- **D-06:** Banner in-app vizibil DOAR pentru `SUPER_ADMIN_FEDERATIE`, care arată câte emailuri Auth s-au trimis în ultima oră/zi vs pragul furnizorului SMTP. Fără alertă activă (SMS/push) în acest scope — doar vizibilitate la cerere/la accesarea zonei relevante.
- **Claude's Discretion:** researcher trebuie să stabilească UNDE se poate obține numărul de emailuri trimise (Supabase nu expune asta prin API client — posibil necesită un tabel de audit propriu populat la fiecare apel `resetPasswordForEmail`/`signUp`/`signInWithOtp`, sau logs Supabase via MCP). Dacă nu există sursă de adevăr existentă, planner poate propune un tabel nou minimal de audit (contorizare, nu conținut email).

### Politici Parolă/Sesiuni
- **D-07:** Verifică dacă regulile de complexitate parolă (min 12 caractere, majusculă/minusculă/cifră — azi doar în `api/creare-cont.ts`) se aplică ȘI la schimbarea parolei (`api/reset-parola-sportiv.ts` azi cere doar min 8 caractere — inconsistent cu D-07, de aliniat) și la orice alt flux de schimbare parolă din profil.
- **D-08:** Verifică și eventual ajustează durata expirării sesiune/token JWT/refresh (azi nesetat explicit, foloseşte default Supabase) — prioritar pentru `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE` (acces date financiare).
- **Scope:** aceasta e o intervenție reală (nu doar raportare) — dacă auditul găsește inconsistențe (ex. min 8 vs min 12), planner trebuie să le repare, nu doar să le documenteze.

### MFA
- **D-09:** MFA e deja implementat și live (Faza 17, email OTP obligatoriu pentru `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE`, fail-open documentat pe eroare de rețea — `hooks/useMFAGuard.ts`). În această fază: DOAR re-rulare `scripts/audit-mfa-coverage.ts` pentru a confirma acoperirea curentă și raporta gap-uri. Fără schimbări de implementare MFA.
- **Notă critică pentru planner:** codul MFA (`signInWithOtp` din `emailMfaService.ts`) trece prin ACELAȘI canal email ca reset-parolă/confirmare cont. Dacă SMTP-ul custom Hostinger nu e configurat corect, MFA-ul poate pica silențios pentru toți adminii — verifică asta după configurarea SMTP-ului (D-01), chiar dacă utilizatorul a ales varianta "doar audit acoperire" pentru MFA în sine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MFA (Faza 17)
- `.planning/phases/17-*/17-CONTEXT.md` — D-02: MFA obligatoriu fără toggle, fără perioadă de grație, roluri exacte
- `hooks/useMFAGuard.ts` — enforcement live, fail-open pe eroare de rețea
- `services/emailMfaService.ts` — MFA implementat ca email OTP via `signInWithOtp`/`verifyOtp`, NU TOTP/app authenticator
- `scripts/audit-mfa-coverage.ts` — script existent de audit acoperire, re-rulează-l, nu-l rescrie

### Creare cont / rate limiting existent
- `api/creare-cont.ts` — rate limit deja aplicat (`checkRateLimit`, 10 req/min per IP), validare parolă min 12 caractere (WR-01)
- `api/_rateLimit.js` — helper rate limit existent, posibil reutilizabil pentru monitorizarea praguri (D-06)
- `api/genereaza-magic-link.ts` — endpoint apelat de bulk-ul din D-04/D-05, folosește `auth.admin.createUser`
- `api/reset-parola-sportiv.ts` — validare parolă azi min 8 caractere (mai slabă decât min 12 de la creare cont — D-07 trebuie să alinieze)

### Notă email infrastructure (Faza 30)
- `.planning/phases/30-*/30-CONTEXT.md` § Deferred Ideas — confirmă că NU exista nicio infrastructură de email în cod înainte de această fază; canalul WhatsApp/email pentru mementouri financiare rămâne explicit în afara scope-ului aici (nu se amestecă cu SMTP Auth)

No alte specs/ADR-uri externe relevante — cerințele sunt capturate integral în deciziile de mai sus.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/_rateLimit.js` (`checkRateLimit`, `getClientIp`) — pattern de rate limit deja folosit în `api/creare-cont.ts`; poate inspira sau fi reutilizat pentru contorizarea din D-06.
- `utils/parola.ts` — generator parole cu regulile de complexitate deja definite client-side; sursă de adevăr pentru regex-urile pe care D-07 trebuie să le alinieze server-side.

### Established Patterns
- Toate endpoint-urile API (`api/*.ts`) folosesc `createClient` cu `SUPABASE_SERVICE_ROLE_KEY`, `autoRefreshToken: false, persistSession: false` — orice endpoint nou (ex. pentru monitorizare praguri) trebuie să urmeze același pattern.
- Fluxurile Auth trimit email EXCLUSIV prin metode native Supabase (`signUp`, `resetPasswordForEmail`, `signInWithOtp`) — nu există niciun cod care compune/trimite email manual. Configurarea SMTP se face la nivel de proiect Supabase (Dashboard/MCP), nu în cod aplicație.

### Integration Points
- Bulk loop din `components/Sportivi/index.tsx` (secțiunea `bulkLinkuri*`) → `POST /api/genereaza-magic-link` → `supabaseAdmin.auth.admin.createUser`. Retry/backoff (D-04) se implementează în bucla client-side sau în endpoint — de decis la planning.
- Banner monitorizare (D-06) se randează probabil în `AppLayout.tsx`/`Sidebar.tsx` (unde există deja alte elemente vizibile condiționat de rol) — verifică pattern-ul de vizibilitate per rol folosit acolo.

</code_context>

<specifics>
## Specific Ideas

- Domeniul SMTP folosit acum: **phihau.ro** (mailbox Hostinger), NU frqkd.ro — decizie provizorie, posibil să se schimbe după ce utilizatorul clarifică cu federația.
- Utilizatorul a respins explicit varianta de a ruta emailurile prin n8n (deși n8n rulează pe același Hostinger) — SMTP direct în Supabase e alegerea fermă.

</specifics>

<deferred>
## Deferred Ideas

- Alertă activă (SMS/push) la depășirea pragului Auth — utilizatorul a ales strict banner in-app pentru acum; SMS pe gateway-ul existent rămâne opțiune pentru o fază viitoare dacă banner-ul nu e suficient.
- Rutare emailuri Auth prin n8n (workflow custom / Auth Hook) — respinsă explicit pentru această fază; SMTP direct e suficient.

None altele — discuția a rămas în interiorul scope-ului fazei (extins deliberat de utilizator la politici parolă/sesiuni + audit MFA, ambele parte din "audit complet Auth" din titlul fazei).

</deferred>

---

*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Context gathered: 2026-09-26*
