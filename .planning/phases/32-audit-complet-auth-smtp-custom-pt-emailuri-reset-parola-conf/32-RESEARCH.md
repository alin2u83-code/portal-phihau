# Phase 32: Audit complet Auth — SMTP custom, reziliență import bulk, monitorizare praguri - Research

**Researched:** 2026-09-28
**Domain:** Supabase Auth (GoTrue) configuration, transactional email delivery (SMTP), client-side resilience patterns, password/session policy hardening
**Confidence:** MEDIUM-HIGH (SMTP/rate-limit/session-config facts verified against official Supabase docs + Hostinger's own support pages; the "source of truth for email-sent counts" sub-problem remains genuinely unresolved by Supabase's public API surface — flagged explicitly below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Provider SMTP = mailbox Hostinger pe domeniul **phihau.ro** (ex. `noreply@phihau.ro`), conectat DIRECT în Supabase Dashboard → Auth → SMTP Settings. Fără n8n în calea de trimitere.
- **D-02:** Decizia e temporară/provizorie — schimbarea domeniului SMTP (spre `frqkd.ro`) trebuie să fie doar o reconfigurare de credențiale (host/port/user/parolă), nu o rescriere de cod.
- **D-03:** Cele 3 fluxuri de email Auth care beneficiază de acest SMTP: `resetPasswordForEmail` (LoginPage.tsx), `signUp` confirmare cont (authService.ts), `signInWithOtp` cod MFA (emailMfaService.ts). O singură configurare SMTP le acoperă pe toate trei.
- **D-01b:** Confirmat explicit — Supabase Auth SMTP Settings are UN SINGUR "Sender email" global. NU se implementează adrese separate (`reset@`, `mfa@` etc.) în această fază.
- **D-04:** Strategie combinată: delay preventiv fix între requesturi secvențiale (reduce șansa de 429) + retry automat cu backoff exponențial (2-3 încercări, delay crescător ex. 1s/3s/9s) pe erorile de rate-limit specific. Erorile non-rate-limit (validare, sportiv are deja cont) rămân imediate, fără retry.
- **D-05:** Locul exact al buclei: `components/Sportivi/index.tsx` (funcția `handleGenerareBulkLinkuri`, bucla `for (let i = 0; i < sportiviFaraConturi.length...)`), care apelează `POST /api/genereaza-magic-link` per sportiv, secvențial, fără delay/retry azi.
- **D-06:** Banner in-app vizibil DOAR pentru `SUPER_ADMIN_FEDERATIE`, care arată câte emailuri Auth s-au trimis în ultima oră/zi vs pragul furnizorului SMTP. Fără alertă activă (SMS/push) în acest scope.
- **D-07:** Verifică dacă regulile de complexitate parolă (min 12 caractere, majusculă/minusculă/cifră — azi doar în `api/creare-cont.ts`) se aplică ȘI la schimbarea parolei (`api/reset-parola-sportiv.ts` azi cere doar min 8 caractere) și la orice alt flux de schimbare parolă din profil. **Scope: intervenție reală — repară inconsistențele, nu doar le documentează.**
- **D-08:** Verifică și eventual ajustează durata expirării sesiune/token JWT/refresh (azi nesetat explicit, foloseşte default Supabase) — prioritar pentru `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE`.
- **D-09:** MFA e deja implementat și live (Faza 17). În această fază: DOAR re-rulare `scripts/audit-mfa-coverage.ts`. Fără schimbări de implementare MFA. **Notă critică:** MFA (`signInWithOtp`) trece prin ACELAȘI canal email ca reset-parolă/confirmare cont — verifică asta după configurarea SMTP-ului (D-01).

### Claude's Discretion

- Dacă research arată că mailbox-ul Hostinger nu suportă SMTP extern direct (restricții port 587/465), documentează blocajul și revino la utilizator — nu improviza prin n8n.
- UI-ul de progres bulk (`bulkLinkuriProgres`/`bulkLinkuriTotal`) trebuie să reflecte și încercările de retry — planner decide mecanismul exact (contor separat sau tooltip pe eroare).
- Sursa de adevăr pentru numărul de emailuri trimise (D-06) — de stabilit în research; posibil tabel de audit nou dacă nu există sursă existentă.

### Deferred Ideas (OUT OF SCOPE)

- Alertă activă (SMS/push) la depășirea pragului Auth — doar banner in-app pentru acum.
- Rutare emailuri Auth prin n8n (workflow custom / Auth Hook) — respinsă explicit pentru această fază.
- Adrese email separate per funcție (`reset@`, `mfa@` etc.) — respinsă, ar necesita Auth Hook custom.

</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Fără librării externe noi** — orice retry/backoff, throttling, sau contorizare se implementează în TypeScript vanilla (fără `p-retry`, `exponential-backoff`, etc.). Confirmat aplicabil aici: nu există niciun pachet npm de instalat în această fază.
- **Limbă**: română pentru domeniu (mesaje UI, nume coloane DB, comentarii de business), engleză pentru pattern-uri tehnice (nume funcții hook-like, tipuri).
- **`components/ui.tsx`** design system intern — orice banner nou (D-06) trebuie să reutilizeze componentele existente (`Alert`, `Card`, badge-uri), nu Shadcn/MUI.
- **Supabase client**: toate endpoint-urile `api/*.ts` noi trebuie să urmeze pattern-ul existent `createClient(url, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })`.
- **Erori**: servicii returnează `{ data, error }`, nu throw (pattern documentat în `docs/conventii-cod.md`).
- **GSD workflow**: orice modificare de fișiere trece prin `/gsd-execute-phase` — nu edit direct.

## Summary

Acest audit acoperă cinci fronturi independente pe modulul Auth existent (Supabase Auth email+parolă). Cercetarea a confirmat, corectat sau extins fiecare decizie din CONTEXT.md pe baza codului real din repo și a documentației oficiale Supabase + Hostinger:

1. **SMTP custom** este o simplă configurare în Supabase Dashboard (Authentication → Emails → SMTP Settings) sau via Management API — host `smtp.hostinger.com`, port 465 (SSL) sau 587 (STARTTLS), confirmat direct din pagina oficială de suport Hostinger. Nu există blocaj de rețea documentat pentru mailbox-uri Hostinger conectate ca SMTP extern. Limita de trimitere Hostinger (500-3000/oră sau /zi, în funcție de tipul planului) este cu mult peste nevoia proiectului.

2. **Reziliența bulk import** necesită o corecție de premisă importantă: bucla din `components/Sportivi/index.tsx` NU trimite emailuri și NU apelează endpoint-urile Auth publice documentate ca rate-limitate (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/otp`). Apelează `auth.admin.createUser()` + `auth.admin.generateLink()` — API-uri Admin cu `service_role`, care conform documentației oficiale de rate-limits NU apar în tabelul de limite (acelea listează doar endpoint-uri publice, limitate per IP/user). Backoff-ul rămâne totuși justificat — dar pentru alte cauze (erori de rețea tranzitorii, contenție Postgres pe RPC-ul `refactor_create_user_account`, limite necunoscute/nedocumentate la nivel de API gateway) — nu pentru "rate limits Auth" în sensul strict din titlul fazei.

3. **Monitorizarea pragurilor** (D-06) se lovește de o limitare reală: Supabase NU expune, prin API-ul client public, un contor de emailuri Auth trimise. Tabelul intern `auth.audit_log_entries` există și înregistrează evenimente relevante (`user_recovery_requested` etc.), dar trăiește în schema `auth` (neexpusă prin PostgREST) și documentația Supabase notează explicit că interogarea lui e "limitată la interfața dashboard-ului". Recomandarea de research: **tabel de audit propriu, populat de aplicație la fiecare apel** al celor 3 fluxuri din D-03 — sursă de adevăr garantat corectă (aplicația controlează toate cele 3 puncte de apel), fără dependență de un API nedocumentat.

4. **Politicile de parolă** au un gap mai mare decât cel descris inițial în CONTEXT.md: nu doar `api/reset-parola-sportiv.ts` (min 8), ci și **patru fluxuri client-side** (`components/ResetPasswordPage.tsx`, `MandatoryPasswordChange.tsx`, `AccountSettings.tsx`, `OnboardingCompletare.tsx`) apelează `supabase.auth.updateUser({ password })` direct cu cheia anon, ocolind complet orice validare server-side din `api/*.ts`. Singurul punct de aplicare universal e setarea de proiect Supabase `password_min_length`/`password_required_characters` (Auth → Providers → Email), care azi e probabil la valoarea implicită (6 caractere, fără cerințe de complexitate).

5. **MFA**: doar re-rulare script, fără schimbări — dar research confirmă nota critică din D-09: `signInWithOtp` (emailMfaService.ts) folosește exact același canal Auth ca reset-parolă, deci după activarea SMTP-ului trebuie verificat manual că un cod OTP MFA chiar ajunge pe `noreply@phihau.ro`.

**Primary recommendation:** Configurează SMTP Hostinger direct din Dashboard (fără cod); tratează D-04 ca hardening general (nu ca fix pentru un rate-limit confirmat); construiește un tabel de audit nou dedicat pentru D-06 (nu depinde de `auth.audit_log_entries`); aliniază parola la min 12 + complexitate în TOATE cele 6 puncte de intrare identificate (2 server + 4 client) ȘI la nivel de proiect Supabase; ajustează `sessions_timebox`/`sessions_inactivity_timeout`/`jwt_exp` via Management API sau Dashboard pentru rolurile privilegiate.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SMTP email delivery pentru Auth (D-01..D-03) | Auth Provider (Supabase-managed, configurat din Dashboard) | — | Nu există cod aplicație pentru trimitere email — Supabase Auth compune și trimite intern; configurarea e infrastructură, nu cod |
| Retry/backoff bulk generare linkuri (D-04/D-05) | Browser/Client (`components/Sportivi/index.tsx`, bucla secvențială) | API/Backend (`api/genereaza-magic-link.ts` trebuie să semnaleze corect 429 vs alte erori) | Bucla `await fetch` secvențială rulează în componenta React; backend-ul trebuie doar să propage eroarea real (status code, nu mesaj generic) |
| Contorizare + banner monitorizare praguri (D-06) | Database/Storage (tabel audit nou) | Browser/Client (banner UI) + API/Backend (RPC citire, scopat SUPER_ADMIN_FEDERATIE) | Sursa de adevăr trebuie să fie un rând persistat per email trimis, nu un calcul client-side |
| Politici parolă — validare (D-07) | API/Backend (2 endpoint-uri server) + Auth Provider (setare proiect Supabase) | Browser/Client (4 componente cu validare inline, doar UX, nu security boundary) | Validarea client e UX; singura barieră reală e server-side + politica de proiect Supabase, pentru că toate cele 4 componente client apelează `supabase.auth.updateUser` direct cu cheia anon |
| Expirare sesiune/JWT (D-08) | Auth Provider (setare proiect Supabase: `jwt_exp`, `sessions_timebox`, `sessions_inactivity_timeout`) | — | Nu există cod aplicație care gestionează expirarea — e complet delegată la GoTrue |
| Audit acoperire MFA (D-09) | API/Backend (script Node service-role, `scripts/audit-mfa-coverage.ts`) | — | Script offline, rulat manual, nu parte din runtime-ul aplicației |

## Standard Stack

### Core

Nicio librărie nouă. Toate cele 5 fronturi se rezolvă cu:

| Instrument | Deja instalat? | Scop în această fază |
|---|---|---|
| `@supabase/supabase-js` 2.98.0 | Da | Client apeluri `auth.admin.*`, `resetPasswordForEmail`, RPC-uri noi pentru D-06 |
| Supabase Dashboard / Management API | N/A (extern) | Configurare SMTP (D-01), rate limits, password policy, session/JWT expiry (D-07/D-08) — fără cod |
| `fetch` + `setTimeout` (vanilla) | Nativ | Retry/backoff exponențial în buclă (D-04) |
| SQL (migrare nouă) | N/A | Tabel de audit contorizare emailuri (D-06), eventual coloană/funcție pentru praguri |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tabel de audit propriu (D-06) | Interogare directă `auth.audit_log_entries` via funcție `SECURITY DEFINER` | Mai "adevărat" (sursa nativă Supabase), dar documentația oficială spune explicit că interogarea programatică e "limitată la dashboard" — nume exacte de `action` pentru OTP/signup neconfirmate; risc de a construi pe un API intern nedocumentat care se poate schimba fără preaviz |
| Backoff manual (vanilla) | Librărie npm (`p-retry`, `exponential-backoff`) | Interzis explicit de CLAUDE.md ("fără librării externe noi") — nu se discută |
| Validare parolă duplicată în 6 locuri | Utilitar comun `utils/validarePassword.ts` reutilizat de toate cele 6 puncte | Recomandat — vezi Don't Hand-Roll |

**Installation:** Niciuna. Toate schimbările sunt cod TypeScript existent + o migrare SQL nouă + configurare Supabase Dashboard/Management API.

## Package Legitimacy Audit

**N/A — această fază nu instalează niciun pachet extern.** CLAUDE.md interzice explicit adăugarea de librării noi, iar toate cele 5 fronturi (SMTP, retry/backoff, monitorizare, parolă/sesiune, MFA) se rezolvă cu `@supabase/supabase-js` (deja instalat), TypeScript vanilla, și configurare Supabase Dashboard/Management API. Protocolul de legitimitate pachete (slopcheck) nu se aplică.

## Architecture Patterns

### System Architecture Diagram — fluxuri email Auth existente

```
┌─────────────────────────────────────────────────────────────────────┐
│ BROWSER (client, cheie anon)                                        │
│                                                                       │
│  LoginPage.tsx ──resetPasswordForEmail()──┐                         │
│  authService.ts ──signUp()────────────────┤                         │
│  emailMfaService.ts ──signInWithOtp()─────┤                         │
└────────────────────────────────────────────┼─────────────────────────┘
                                              ▼
                              ┌───────────────────────────────┐
                              │ Supabase Auth (GoTrue)         │
                              │ /auth/v1/recover               │
                              │ /auth/v1/signup                │
                              │ /auth/v1/otp                   │
                              │  — rate-limitate per IP/email   │
                              │  — scriu în auth.audit_log_entries│
                              └───────────┬─────────────────────┘
                                          ▼
                         ┌────────────────────────────────┐
                         │ SMTP (D-01: Hostinger)          │
                         │ smtp.hostinger.com:465/587      │
                         │ sender: noreply@phihau.ro        │
                         └────────────────────────────────┘

─────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────┐
│ BROWSER — components/Sportivi/index.tsx                              │
│  handleGenerareBulkLinkuri() → for (sportiv of sportiviFaraConturi) │
│    await fetch('/api/genereaza-magic-link')  ← D-04/D-05 aici       │
└────────────────────────────────────┬──────────────────────────────────┘
                                     ▼
                    ┌────────────────────────────────────┐
                    │ api/genereaza-magic-link.ts          │
                    │ (Vercel serverless, service_role)    │
                    │  auth.admin.createUser()             │
                    │  auth.admin.generateLink()  ← NU trimite email, │
                    │                                doar returnează link │
                    │  → NU trece prin endpoint-urile publice/rate-limitate │
                    └────────────────────────────────────┘
```

### Recommended Project Structure (fișiere atinse, nu foldere noi)

```
api/
├── genereaza-magic-link.ts     # eventual: propagă 429 real (nu 500 generic) dacă Supabase întoarce rate-limit
├── reset-parola-sportiv.ts     # D-07: aliniază validarea la min 12 + complexitate
├── auth-metrics.ts             # NOU posibil (D-06): endpoint/RPC citire contor emailuri, scopat SUPER_ADMIN_FEDERATIE
components/
├── Sportivi/index.tsx          # D-04/D-05: backoff exponențial + delay preventiv în handleGenerareBulkLinkuri
├── ResetPasswordPage.tsx       # D-07: min 12 + complexitate (azi min 8)
├── MandatoryPasswordChange.tsx # D-07: min 12 + complexitate (azi min 8)
├── AccountSettings.tsx         # D-07: min 12 + complexitate (azi min 8)
├── OnboardingCompletare.tsx    # D-07: min 12 + complexitate (azi min 8 + doar cifră)
├── AppLayout.tsx / Sidebar.tsx # D-06: banner condiționat SUPER_ADMIN_FEDERATIE
utils/
├── validarePassword.ts         # NOU posibil: sursă unică regex/reguli, reutilizat de toate cele 6 puncte
├── retryBackoff.ts             # NOU posibil: utilitar generic backoff exponențial (sau inline în Sportivi/index.tsx per D-05)
sql/migrations/
├── auth_email_audit_260928.sql # NOU (D-06): tabel contorizare emailuri Auth trimise
```

### Pattern 1: Retry cu backoff exponențial + delay preventiv (D-04)

**What:** Combinație delay fix înainte de fiecare request + retry cu backoff exponențial doar pe erori de rate-limit (nu pe erori de validare).
**When to use:** Bucla `handleGenerareBulkLinkuri` din `components/Sportivi/index.tsx`.
**Notă design:** `api/genereaza-magic-link.ts` trebuie mai întâi să distingă eroarea de rate-limit Supabase (verifică `error.status === 429` sau mesajul GoTrue) de alte erori și să răspundă cu `res.status(429)` real — azi TOATE erorile devin `res.status(500)` generic, deci clientul n-are cum să decidă azi dacă merită retry.

```typescript
// Pattern ilustrativ — vanilla, fără librării externe (CLAUDE.md)
// Sursă: pattern standard exponential backoff + jitter, verificat împotriva
// recomandărilor generale de industrie (respectă Retry-After dacă există,
// backoff doar pe erori tranzitorii/429, cap pe nr. încercări).

const DELAY_PREVENTIV_MS = 300;       // D-04: delay fix între requesturi secvențiale
const MAX_INCERCARI = 3;              // D-04: 2-3 încercări
const BACKOFF_BASE_MS = 1000;         // 1s/3s/9s aproximativ cu exponent 3, sau 1s/2s/4s cu exponent 2

async function fetchCuRetry(sportivId: string, roles: string[]): Promise<Response> {
    for (let incercare = 0; incercare < MAX_INCERCARI; incercare++) {
        const response = await fetch('/api/genereaza-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sportiv_id: sportivId, roles }),
        });

        if (response.status !== 429) {
            return response; // succes SAU eroare non-rate-limit -> nu retry
        }

        // Rate-limit: backoff exponențial înainte de reîncercare
        const retryAfterHeader = response.headers.get('Retry-After');
        const delayMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : BACKOFF_BASE_MS * Math.pow(3, incercare); // 1s, 3s, 9s

        if (incercare < MAX_INCERCARI - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
            return response; // ultima încercare epuizată — propagă 429 mai departe
        }
    }
    throw new Error('unreachable');
}

// În buclă (delay preventiv fix ÎNTRE sportivi, separat de backoff pe eroare):
for (let i = 0; i < sportiviFaraConturi.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, DELAY_PREVENTIV_MS));
    const response = await fetchCuRetry(sportiviFaraConturi[i].id, ['SPORTIV']);
    // ... procesare rezultat, actualizare bulkLinkuriProgres
}
```

### Pattern 2: Tabel de audit dedicat pentru contorizare emailuri Auth (D-06)

**What:** Un rând INSERT per apel reușit al celor 3 fluxuri din D-03, populat din cod aplicație (nu din `auth.audit_log_entries`, inaccesibil programatic conform documentației oficiale).
**When to use:** La fiecare apel `resetPasswordForEmail`, `signUp`, `signInWithOtp` din `LoginPage.tsx`, `authService.ts`, `emailMfaService.ts`.

```sql
-- Sursă: pattern derivat din audit_log existent (sql/migrations/create_audit_log.sql,
-- extend_audit_log_260705.sql) — aceeași convenție RLS (SELECT doar SUPER_ADMIN_FEDERATIE,
-- INSERT doar pentru propriul user_id sau prin funcție SECURITY DEFINER dacă apelul
-- e anonim ca la resetPasswordForEmail înainte de autentificare).

CREATE TABLE IF NOT EXISTS public.auth_email_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    tip         TEXT NOT NULL CHECK (tip IN ('reset_parola', 'confirmare_cont', 'cod_mfa')),
    email       TEXT,  -- opțional: pentru debugging, NU pentru GDPR audit extins
    reusit      BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.auth_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_email_events FORCE ROW LEVEL SECURITY;

-- INSERT permis oricui (inclusiv anonim — resetPasswordForEmail se apelează
-- înainte de autentificare); risc acceptabil pentru un simplu contor.
CREATE POLICY "auth_email_events_insert_any"
    ON public.auth_email_events FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- SELECT doar SUPER_ADMIN_FEDERATIE (banner D-06)
CREATE POLICY "auth_email_events_select_super_admin"
    ON public.auth_email_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid() AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
        )
    );

CREATE INDEX idx_auth_email_events_created_at ON public.auth_email_events(created_at DESC);
```

```typescript
// services/emailMfaService.ts — exemplu instrumentare (aplică identic la
// resetPasswordForEmail în LoginPage.tsx și signUp în authService.ts)
export async function trimiteCodMfaEmail(email: string) {
    const { error } = await supabase!.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });
    // Contorizare pentru banner D-06 — best-effort, nu blochează fluxul
    supabase!.from('auth_email_events').insert({ tip: 'cod_mfa', reusit: !error }).then(() => {});
    return { error };
}
```

### Pattern 3: Validator de parolă comun, reutilizat în toate cele 6 puncte (D-07)

**What:** O singură sursă de adevăr pentru regulile de complexitate, apelată din 2 endpoint-uri server + 4 componente client.
**Why:** Azi regex-ul e duplicat (corect) doar în `api/creare-cont.ts`; celelalte 5 puncte au reguli diferite/mai slabe (`min 8`, unele fără cerință de literă mare).

```typescript
// utils/validarePassword.ts — sursă unică, importabilă atât în api/*.ts
// (Node/Vercel) cât și în components/*.tsx (browser) — fără dependențe externe.
export const PAROLA_LUNGIME_MINIMA = 12;

export function valideazaParola(parola: string): { valid: boolean; mesaj?: string } {
    if (typeof parola !== 'string' || parola.length < PAROLA_LUNGIME_MINIMA) {
        return { valid: false, mesaj: `Parola trebuie să aibă cel puțin ${PAROLA_LUNGIME_MINIMA} caractere.` };
    }
    if (!/[A-Z]/.test(parola)) return { valid: false, mesaj: 'Parola trebuie să conțină cel puțin o literă mare.' };
    if (!/[a-z]/.test(parola)) return { valid: false, mesaj: 'Parola trebuie să conțină cel puțin o literă mică.' };
    if (!/[0-9]/.test(parola)) return { valid: false, mesaj: 'Parola trebuie să conțină cel puțin o cifră.' };
    return { valid: true };
}
```

Aplicat identic în `api/reset-parola-sportiv.ts` (înlocuiește `if (parola_noua.length < 8)`), `components/ResetPasswordPage.tsx`, `MandatoryPasswordChange.tsx`, `AccountSettings.tsx`, `OnboardingCompletare.tsx` (înlocuiește fiecare `if (x.length < 8)` local).

**IMPORTANT — barieră reală, nu doar UX:** toate cele 4 componente client apelează `supabase.auth.updateUser({ password })` direct cu cheia **anon**, deci un atacator poate ocoli complet acest validator JS apelând SDK-ul din consolă. Singura barieră reală, universală, e setarea de proiect Supabase `password_min_length=12` + `password_required_characters` (Auth → Providers → Email, sau Management API `PATCH /v1/projects/{ref}/config/auth`). Fără această setare, `updateUser({password: 'a'.repeat(12).toLowerCase()})` (fără majusculă/cifră) va fi ACCEPTAT de Supabase indiferent de validarea noastră JS.

### Anti-Patterns to Avoid

- **A crede că `auth.admin.createUser`/`generateLink` sunt limitate de aceleași reguli ca `/auth/v1/signup`:** documentația oficială de rate-limits (`supabase.com/docs/guides/auth/rate-limits`) listează explicit doar endpoint-urile publice. API-urile Admin cu `service_role` nu apar în acel tabel. Nu presupune că adăugarea de backoff "rezolvă" un rate-limit Auth documentat pe acest flux — motivele reale de eșec sunt altele (rețea, Postgres, Vercel).
- **A valida parola doar în componenta React, fără să atingi setarea de proiect Supabase:** vezi Pattern 3 — validarea JS e cosmetică dacă `password_min_length` din Supabase rămâne la valoarea implicită.
- **A presupune că `resetPasswordForEmail` a "trimis" emailul doar pentru că nu a întors eroare:** Supabase întoarce succes generic indiferent dacă adresa există (pattern de securitate anti user-enumeration, deja implementat corect în `LoginPage.tsx` — mesajul "Email trimis dacă adresa există" e afișat necondiționat). Contorul din D-06 trebuie să numere *apeluri*, nu confirmări de livrare (Supabase nu oferă webhook de livrare fără provider terț).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trimitere email SMTP | Client SMTP custom (nodemailer etc.) în `api/*.ts` | Configurare nativă Supabase Dashboard → Auth → SMTP Settings | Supabase Auth are integrare SMTP nativă; niciun cod de trimitere nu trebuie scris — confirmă și `32-CONTEXT.md` (Established Patterns: "Configurarea SMTP se face la nivel de proiect Supabase, nu în cod aplicație") |
| Rate-limiting / backoff generic | Librărie npm (`p-retry`) | `setTimeout` + buclă `for` vanilla (Pattern 1) | CLAUDE.md interzice dependențe noi; problema e suficient de mică pentru cod inline |
| Expirare sesiune custom (middleware, cron de invalidare token) | Sistem propriu de expirare sesiuni în DB | `jwt_exp`, `sessions_timebox`, `sessions_inactivity_timeout` din Supabase Auth config | GoTrue gestionează nativ expirarea — orice soluție custom ar duplica/intra în conflict cu refresh-token rotation-ul deja activ (`autoRefreshToken: true` în `supabaseClient.ts`) |
| Verificare parolă scursă (leaked password) | — (deja există: `utils/checkLeakedPassword.ts`, k-anonymity HaveIBeenPwned) | Reutilizează `checkLeakedPassword` existent SAU migrează pe `password_hibp_enabled` nativ Supabase | Există deja o implementare corectă (k-anonymity, fail-open documentat) în 3 din cele 4 componente client — nu rescrie; opțional, evaluează consolidarea pe flag-ul nativ Supabase `password_hibp_enabled` pentru a elimina duplicarea |
| Generare parolă temporară | Math.random() sau His own | `utils/parola.ts` `genereazaParolaTemporara()` — deja există, `crypto.getRandomValues` + rejection sampling | Deja implementat corect (Faza 26), nu reinventa |

**Key insight:** Acest audit nu adaugă infrastructură nouă de email/sesiuni — toată logica "grea" (trimitere SMTP, expirare token, refresh rotation) e deja gestionată de Supabase Auth. Munca reală e de **aliniere** (parolă consistentă în 6 locuri) și **instrumentare** (contor pentru banner D-06), nu de construcție.

## Common Pitfalls

### Pitfall 1: Confuzia "rate limit Auth" pentru fluxul bulk (D-04/D-05)

**What goes wrong:** Se implementează backoff crezând că se apără de `/auth/v1/signup` sau `/auth/v1/otp` rate limits, dar bucla din `components/Sportivi/index.tsx` apelează un endpoint propriu (`api/genereaza-magic-link.ts`) care folosește `auth.admin.createUser()` + `auth.admin.generateLink()` — API-uri Admin cu `service_role`, absente din tabelul oficial de rate limits.
**Why it happens:** Presupunere naturală din titlul fazei ("reziliență la rate limits Auth"), dar codul real arată alt tipar de apel.
**How to avoid:** Implementează backoff-ul oricum (D-04 e o decizie blocată, nu se renegociază) dar documentează în cod/PR că motivul real e reziliență generică (rețea, Postgres, limite nedocumentate ale API Admin), nu evitarea unui rate-limit confirmat. Actualizează `api/genereaza-magic-link.ts` să distingă corect erorile 429 (dacă apar vreodată) de alte erori 500, altfel clientul nu poate decide când să reîncerce.
**Warning signs:** Dacă în producție bucla EȘUEAZĂ des, verifică întâi log-urile Vercel pentru cauza reală (timeout, eroare RPC, Postgres connection limit) înainte de a presupune 429.

### Pitfall 2: Validare parolă "de fațadă" pe fluxurile client-side

**What goes wrong:** Se aliniază regex-ul JS în cele 4 componente client (`ResetPasswordPage.tsx` etc.) la min 12 + complexitate, dar se omite setarea de proiect Supabase `password_min_length`/`password_required_characters` — un apel direct la SDK din consolă browser tot poate seta o parolă de 6 caractere.
**Why it happens:** Validarea JS e vizibilă și ușor de testat manual din UI; setarea de proiect Supabase e "invizibilă" (Dashboard, nu cod).
**How to avoid:** Tratează D-07 ca doi pași obligatorii, nu unul: (1) aliniază regex-ul în toate cele 6 puncte identificate, (2) setează explicit `password_min_length=12` + `password_required_characters` în Supabase (Dashboard sau Management API `PATCH /v1/projects/{ref}/config/auth`).
**Warning signs:** Testează cu `curl` direct către `PUT /auth/v1/user` cu o parolă slabă și un JWT valid — dacă trece, bariera server nu e activă.

### Pitfall 3: `auth.audit_log_entries` ca sursă de adevăr pentru D-06

**What goes wrong:** Se încearcă interogarea `auth.audit_log_entries` printr-o funcție `SECURITY DEFINER` ca sursă "oficială" de adevăr pentru numărul de emailuri trimise, dar numele exacte ale acțiunilor pentru `signUp`/`signInWithOtp` (spre deosebire de `user_recovery_requested`, confirmat) nu sunt documentate public — risc de a construi pe presupuneri fragile.
**Why it happens:** Pare "mai corect" să citești direct sursa Supabase decât să întreții un contor propriu.
**How to avoid:** Folosește tabelul de audit propriu (Pattern 2) ca sursă primară — aplicația controlează toate cele 3 puncte de apel (D-03), deci contorul e garantat corect indiferent de schimbări interne Supabase.
**Warning signs:** Dacă planul propune interogarea `auth.audit_log_entries`, verifică mai întâi (manual, în Dashboard → Logs → Auth Logs) exact ce valori are coloana `payload->>'action'` pentru cele 3 fluxuri, înainte de a scrie cod care depinde de ele.

### Pitfall 4: SMTP Hostinger cu link tracking / rewrite

**What goes wrong:** Dacă mailbox-ul Hostinger sau vreun add-on de securitate/antivirus rescrie link-urile din email (link tracking), link-urile single-use din Supabase (reset parolă, confirmare cont) pot fi "consumate" de un scanner automat înainte ca utilizatorul să dea click, rezultând erori "link expirat/invalid" reclamate de utilizatori.
**Why it happens:** Documentat explicit de Supabase ca risc general la orice SMTP custom.
**How to avoid:** Verifică, la configurare, că mailbox-ul Hostinger folosit nu are link-scanning activ (de obicei nu e cazul la mailbox-uri simple, dar poate fi cazul dacă domeniul are un filtru antivirus la nivel de gateway).
**Warning signs:** Reclamații repetate "link-ul de resetare nu funcționează" deși userul dă click imediat.

## Code Examples

### Configurare SMTP Hostinger în Supabase — pași concreți (D-01)

```
Dashboard Supabase → Authentication → Emails → SMTP Settings → Enable Custom SMTP

Host:              smtp.hostinger.com
Port:              465                    (SSL/implicit TLS)
                   sau 587                (STARTTLS, dacă 465 dă erori de handshake)
Username:          noreply@phihau.ro      (adresa completă, nu doar partea locală)
Password:          <parola mailbox-ului Hostinger>
Sender email:      noreply@phihau.ro
Sender name:       "Federația QwanKiDo România" (sau "PhiHau")
```

Sursă: Hostinger, pagina oficială de suport pentru configurare client email extern
(host + port + encriptare confirmate direct din documentația Hostinger) și
Supabase, ghidul oficial de custom SMTP (câmpurile cerute în formular).

**Alternativ (Management API, pentru a documenta schimbarea de domeniu D-02 ca simplă reconfigurare):**
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.hostinger.com",
    "smtp_port": 465,
    "smtp_user": "noreply@phihau.ro",
    "smtp_pass": "***",
    "smtp_sender_name": "PhiHau",
    "smtp_admin_email": "noreply@phihau.ro"
  }'
```
Când `frqkd.ro` va fi clarificat (D-02), migrarea e un singur PATCH cu noile credențiale — fără nicio schimbare de cod, confirmând că D-02 e respectată automat de abordarea "configurare, nu cod".

### Setare politică parolă + expirare sesiune la nivel de proiect (D-07/D-08)

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password_min_length": 12,
    "password_required_characters": "lower_upper_letters_digits",
    "jwt_exp": 3600,
    "sessions_timebox": 43200,
    "sessions_inactivity_timeout": 3600
  }'
```

Notă: `password_required_characters` acceptă o valoare enum specifică (formatul exact — ex.
`lower_upper_letters_digits` vs `lower_upper_letters_digits_symbols` — trebuie confirmat direct
în Dashboard → Auth → Providers → Email → "Password Requirements" dropdown înainte de a seta
via API, valorile enum nu au fost verificate 1:1 împotriva codului sursă GoTrue în această
cercetare). `sessions_timebox`/`sessions_inactivity_timeout` sunt în **secunde**; valorile de
mai sus (12h timebox, 1h inactivitate) sunt un punct de plecare — D-08 cere "prioritar pentru
ADMIN_CLUB/SUPER_ADMIN_FEDERATIE" dar Supabase nu suportă politici diferite per-rol la nivel de
proiect (setarea e globală) — planner trebuie să decidă dacă valoarea globală e acceptabilă
pentru SPORTIV/INSTRUCTOR sau dacă e nevoie de un guard suplimentar în `useMFAGuard.ts`-style
pentru rolurile privilegiate.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Supabase built-in email provider (fără SMTP custom) | SMTP custom obligatoriu pentru producție | Documentat ca "best practice" permanent, dar limita implicită (2 emailuri/oră) a devenit mai strictă — actualizată 3 sept 2024 | Cu 35 cluburi / 3500+ sportivi, 2 emailuri/oră e complet insuficient; SMTP custom e obligatoriu, nu opțional |
| Presupunerea că orice apel Supabase Auth e rate-limitat identic | API-urile Admin (`service_role`) sunt documentat separate de endpoint-urile publice rate-limitate | N/A — a fost mereu așa, dar nu evident din titlul fazei | Bucla bulk din `components/Sportivi/index.tsx` nu se confruntă cu rate-limits Auth documentate; backoff-ul rămâne utilă pentru alte tipuri de eșec |

**Deprecated/outdated:** Niciun API folosit în acest proiect (auth-js v2, `@supabase/supabase-js` 2.98.0) nu are metode deprecate relevante pentru acest audit.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mailbox-ul Hostinger folosit de `phihau.ro` e pe un plan care permite ≥500 emailuri/oră sau ≥1000/zi (planurile Hostinger Business Email/shared hosting cu email inclus) | Summary, Common Pitfalls | Dacă mailbox-ul e pe un plan cu limite mai mici (ex. un cont email gratuit inclus în hosting de bază), pragul din banner-ul D-06 trebuie ajustat manual — nu poate fi dedus din cod |
| A2 | Numele exact al acțiunii `auth.audit_log_entries` pentru `signInWithOtp`/`signUp` (altele decât `user_recovery_requested`, confirmat) | Pitfall 3, Pattern 2 | Dacă planul ar folosi totuși `auth.audit_log_entries` ca sursă, presupunerea greșită a numelui de acțiune ar produce un contor mereu 0 pentru 2 din cele 3 fluxuri — de aceea recomandarea primară e tabelul de audit propriu, nu acest API intern |
| A3 | `password_required_characters` acceptă exact valoarea enum `lower_upper_letters_digits` prin Management API | Code Examples | Dacă valoarea enum e diferită, apelul PATCH eșuează cu 400 — trebuie verificat direct în Dashboard înainte de a automatiza |
| A4 | Portul 465 (SSL) funcționează fără restricții suplimentare pentru conexiuni externe (Supabase → Hostinger), nu doar pentru clienți de mail desktop | Common Pitfalls, Code Examples | Dacă Hostinger aplică vreo restricție IP-based sau necesită whitelisting pentru conexiuni SMTP externe de la servere cloud (nu clienți desktop), configurarea din Dashboard va eșua la Save/Test — CONTEXT.md D-01 discretion cere să documentezi blocajul dacă apare, nu să improvizezi prin n8n |
| A5 | API-urile Admin GoTrue (`service_role`) nu au NICIUN rate-limit intern nedocumentat la nivel de infrastructură (ex. un throttling general de gateway ~120 req/min menționat de o singură sursă secundară, neconfirmat oficial) | Summary, Pitfall 1 | Dacă există un asemenea throttling nedocumentat, bucla bulk tot poate primi 429/503 la scară mare (35 cluburi) — motiv suplimentar pentru care D-04 (backoff) rămâne justificat indiferent de acest research |

## Open Questions

1. **Care e planul Hostinger exact folosit pentru `noreply@phihau.ro`?**
   - What we know: Hostinger are 3+ nivele diferite (email inclus în shared hosting cu limite mai mici documentate separat, vs. planuri dedicate Business Email cu 1000-3000/zi per mailbox).
   - What's unclear: Pragul exact aplicabil mailbox-ului real al utilizatorului.
   - Recommendation: Cere utilizatorului să confirme (din hPanel Hostinger → Emails) planul exact înainte ca planner-ul să fixeze un prag numeric în banner-ul D-06; alternativ, pune pragul ca valoare configurabilă (nu hardcodată), cu default conservator (ex. 100/oră).

2. **Formatul exact acceptat de `password_required_characters` prin Management API.**
   - What we know: Parametrul există (confirmat din referința oficială Management API).
   - What's unclear: Valorile enum exacte acceptate.
   - Recommendation: Planner/executor verifică direct din Dashboard (Auth → Providers → Email → dropdown "Password Requirements") înainte de a scrie orice automatizare/migrare care setează acest parametru.

3. **Trebuie adăugat `checkRateLimit` (deja existent în `api/_rateLimit.ts`) pe `api/genereaza-magic-link.ts`?**
   - What we know: Endpoint-ul azi NU are nicio protecție de rate-limit per IP (spre deosebire de `api/creare-cont.ts`, care are `10 req/min`), deși ambele creează conturi via `service_role`.
   - What's unclear: Dacă asta e în scope-ul explicit al D-04/D-05 (care vorbește despre reziliență LA rate limits Supabase, nu despre protejarea propriului endpoint) sau dacă e un gap de securitate separat, demn de semnalat dar nu de reparat în această fază.
   - Recommendation: Nu e o decizie blocată în CONTEXT.md — planner-ul poate opta să o adauge ca îmbunătățire minoră (consistent cu spiritul "audit complet Auth") sau să o lase explicit ca "found but out of scope" pentru o fază viitoare.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Proiect Supabase live (wuhidifzsutwgdfkwhmd, conform migrărilor aplicate) | Toate cele 5 fronturi | ✓ (confirmat prin istoricul de migrări aplicate live, ex. `extend_audit_log_260705.sql`) | — | — |
| Acces Supabase Dashboard (pentru SMTP Settings, Rate Limits, Password Policy, Sessions) | D-01, D-06 (verificare), D-07, D-08 | Necesită verificare umană — agentul de research NU a avut acces MCP Supabase în această sesiune | — | Fără acces Dashboard, orice setare de proiect (SMTP, jwt_exp etc.) trebuie făcută manual de utilizator sau via Management API cu `SUPABASE_ACCESS_TOKEN` |
| Credențiale mailbox Hostinger `noreply@phihau.ro` (user + parolă SMTP) | D-01 | Necesită furnizare de utilizator — nu există în `.env` azi (`.env` conține doar chei Supabase/Gemini/Claude/Groq/SMS, fără SMTP) | — | Blocant pentru D-01 până la furnizare |
| `SUPABASE_ACCESS_TOKEN` (Management API, pentru automatizare via `curl`) | Automatizare opțională D-01/D-07/D-08 | Necunoscut — nu apare în `.env` documentat din CLAUDE.md | — | Fallback: configurare manuală din Dashboard (întotdeauna disponibilă, nu necesită token suplimentar) |

**Missing dependencies with no fallback:**
- Credențialele SMTP Hostinger (`noreply@phihau.ro` user/parolă) — blochează D-01 până sunt furnizate de utilizator.

**Missing dependencies with fallback:**
- `SUPABASE_ACCESS_TOKEN` pentru Management API — fallback complet funcțional prin configurare manuală din Dashboard.

## Validation Architecture

Omisă — `workflow.nyquist_validation` e explicit `false` în `.planning/config.json`.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`) — secțiune obligatorie.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Da | Supabase Auth (GoTrue) gestionează hashing parolă (bcrypt intern) — nu se hand-rollează niciodată; MFA email OTP deja live (Faza 17), doar audit în această fază |
| V3 Session Management | Da | `jwt_exp`, `sessions_timebox`, `sessions_inactivity_timeout` — setări native GoTrue (D-08); `autoRefreshToken: true` deja configurat corect în `supabaseClient.ts` |
| V4 Access Control | Da (existent) | RLS + `has_access_to_club`/`is_super_admin()` — neschimbat în această fază; banner D-06 trebuie să respecte același pattern (SELECT restricționat la `SUPER_ADMIN_FEDERATIE`) |
| V5 Input Validation | Da | Validare complexitate parolă — `utils/validarePassword.ts` (Pattern 3), aplicat în 6 puncte identificate |
| V6 Cryptography | Da (fără schimbare cod) | Hashing parolă = intern GoTrue (nu se atinge); `checkLeakedPassword.ts` folosește SHA-1 k-anonymity corect (doar pentru verificare HIBP, nu pentru stocare — nu e un anti-pattern) |

### Known Threat Patterns for Supabase Auth + SMTP custom

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bypass validare parolă client prin apel direct SDK (anon key) cu parolă slabă | Tampering | Setare de proiect Supabase `password_min_length`/`password_required_characters` (barieră server, nu doar JS) — vezi Pattern 3 |
| Contorul de emailuri (D-06) expus către roluri non-SUPER_ADMIN | Information Disclosure | RLS SELECT restricționat la `SUPER_ADMIN_FEDERATIE`, oglindind exact pattern-ul din `audit_log` existent |
| Link-uri de reset/confirmare single-use "consumate" de scannere email (link tracking Hostinger sau gateway corporate) | — (disponibilitate, nu STRIDE clasic) | Verifică/dezactivează link-tracking dacă mailbox-ul Hostinger are un asemenea add-on; documentat oficial ca risc general SMTP custom |
| Sesiuni fără expirare (refresh token implicit fără expirare) pentru conturi ADMIN_CLUB/SUPER_ADMIN_FEDERATIE cu acces financiar | Elevation of Privilege (persistență) | `sessions_timebox`/`sessions_inactivity_timeout` (D-08) — azi nesetate, deci o sesiune compromisă (token furat) rămâne validă la nesfârșit prin refresh-rotation |
| Enumerare utilizatori prin mesaje diferite la `resetPasswordForEmail` | Information Disclosure | Deja mitigat corect — `LoginPage.tsx` afișează mereu același mesaj generic indiferent dacă emailul există |

## Sources

### Primary (HIGH confidence)
- [supabase.com/docs/guides/auth/rate-limits](https://supabase.com/docs/guides/auth/rate-limits) — tabel complet rate limits Auth, valori implicite, comportament custom SMTP
- [supabase.com/docs/guides/auth/auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp) — pași configurare SMTP custom, câmpuri cerute
- [supabase.com/docs/reference/api/v1-update-auth-service-config](https://supabase.com/docs/reference/api/v1-update-auth-service-config) — parametri Management API (`smtp_*`, `rate_limit_*`, `password_min_length`, `password_required_characters`, `jwt_exp`, `sessions_timebox`, `sessions_inactivity_timeout`)
- [Hostinger — Set up Hostinger Email on your applications and devices](https://www.hostinger.com/support/4305847-set-up-hostinger-email-on-your-applications-and-devices/) — host `smtp.hostinger.com`, porturi 465/587, encriptare
- [Hostinger — Parameters and limits of Hostinger Mail](https://www.hostinger.com/support/4625828-parameters-and-limits-of-hostinger-email/) — limite trimitere per plan
- `.firecrawl/supabase-prod-auth-rate-limits.md` (fișier local, deja prezent în repo din sesiunea de discuție anterioară) — tabel oficial Supabase Production Checklist, rate limits Auth pe endpoint
- Cod real citit direct din repo: `api/creare-cont.ts`, `api/reset-parola-sportiv.ts`, `api/genereaza-magic-link.ts`, `api/_rateLimit.ts`, `utils/parola.ts`, `utils/checkLeakedPassword.ts`, `services/emailMfaService.ts`, `services/authService.ts`, `hooks/useMFAGuard.ts`, `components/Sportivi/index.tsx`, `components/LoginPage.tsx`, `components/ResetPasswordPage.tsx`, `components/MandatoryPasswordChange.tsx`, `components/AccountSettings.tsx`, `components/OnboardingCompletare.tsx`, `sql/migrations/create_audit_log.sql`, `sql/migrations/extend_audit_log_260705.sql`, `sql/migrations/mfa_email_verificari_260907.sql`, `services/auditLogService.ts`, `scripts/audit-mfa-coverage.ts`

### Secondary (MEDIUM confidence)
- WebSearch agregat (multiple surse independente, corroborate) — `auth.admin.generateLink()` nu trimite email, doar returnează link-ul (Supabase reference docs pentru Python/Dart/Kotlin/JS `generateLink`, consistent între toate)
- WebSearch — `auth.admin.createUser` cu `service_role` nu are rate-limit documentat public (inferat din absența din tabelul oficial de rate limits + discuții GitHub Supabase)
- [deepwiki.com/supabase/auth/12.3-audit-logs](https://deepwiki.com/supabase/auth/12.3-audit-logs) — existența `auth.audit_log_entries`, acțiunea `user_recovery_requested` confirmată; alte nume de acțiuni neconfirmate (mirror al codului sursă GoTrue, nu documentație oficială Supabase)

### Tertiary (LOW confidence)
- Un singur rezultat de căutare menționează un "throttling general de ~120 req/min" pe API-uri "resource-intensive" — neconfirmat din documentație oficială, marcat A5 în Assumptions Log
- Limitele exacte Hostinger (500/oră shared hosting cPanel vs. 1000-3000/zi Business Email) — surse terțe (hostadvice, webhostingadvices) inconsistente între ele privind care plan Hostinger are care limită; A1 în Assumptions Log

## Metadata

**Confidence breakdown:**
- SMTP config (D-01/D-02/D-03): HIGH — verificat direct din documentația oficială Supabase + pagina de suport Hostinger
- Rate limits reali pe bucla bulk (D-04/D-05): MEDIUM-HIGH — tabelul oficial de rate limits e clar (HIGH), dar absența admin API din el e o inferență (nu o afirmație explicită "admin API e exempt") — MEDIUM pe acest punct specific
- Monitorizare praguri (D-06): MEDIUM — problema și soluția recomandată sunt clare (tabel propriu), dar alternativa `auth.audit_log_entries` rămâne parțial nedocumentată
- Politici parolă/sesiune (D-07/D-08): HIGH pe findings din cod (6 puncte de intrare identificate direct din grep), HIGH pe parametrii Management API disponibili, MEDIUM pe valorile enum exacte pentru `password_required_characters`
- MFA (D-09): HIGH — script existent, doar re-rulare, fără necunoscute

**Research date:** 2026-09-28
**Valid until:** ~30 zile pentru configurările Supabase (schimbări rare la API-ul de rate-limits/config), ~90 zile pentru limitele Hostinger (rar schimbate, dar necesită confirmare umană a planului exact oricum)
