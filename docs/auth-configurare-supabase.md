# Configurare Auth Supabase — SMTP, rate limits, politică parolă, sesiuni

**Faza 32** — audit complet Auth. Acest runbook conține configurarea care **nu se poate face din cod**: SMTP custom (D-01/D-01b), rate limit-uri emailuri (D-06), politica de parolă la nivel de proiect (D-07 — bariera reală, JS-ul e doar UX), sesiuni/JWT (D-08), praguri de monitorizare (D-06), și schimbarea domeniului SMTP (D-02).

Proiect Supabase: `wuhidifzsutwgdfkwhmd`. Aplicație: `https://portal-phihau.vercel.app` (sau domeniul custom din Vercel).

**Acest document nu conține și nu trebuie să conțină niciodată o parolă, un token sau o cheie reală** — doar placeholdere de tipul `<...>`.

## 0. Ordinea recomandată

1. **SMTP + rate limit** (secțiunile 1-2) — se pot activa imediat, independent de codul aplicației.
2. **Deploy codul Fazei 32** în producție (push → Vercel) — endpoint-urile securizate (`api/reset-parola-sportiv.ts`, `api/account.ts`, `api/genereaza-magic-link.ts`) și apelanții client cu `Authorization: Bearer` trebuie să ajungă **în același deploy**. Dacă serverul e securizat înaintea clientului (sau invers), fluxurile de reset parolă / schimbare email / magic link vor primi 401.
3. **Politica de parolă** (secțiunea 3) — **DOAR DUPĂ** deploy-ul de la pasul 2. Dacă o activezi înainte, utilizatorii văd mesajele vechi din UI ("min. 8 caractere") peste o regulă de 12 impusă de server, ceea ce confuzează fără rost.
4. **Sesiuni / JWT** (secțiunea 4) — independent de deploy.
5. **Praguri monitorizare** (secțiunea 5) — după ce cunoști limitele reale (Supabase + Hostinger).
6. **Verificare** (secțiunea 7).

## 1. SMTP Hostinger (D-01, D-01b, D-03)

### Pre-rechizite în hPanel Hostinger

- Creează mailbox-ul **`noreply@phihau.ro`** (hPanel → Emails → Email Accounts). Notează parola **doar** în managerul tău de parole — niciodată în repo, `.env` sau acest document.
- Verifică înregistrările DNS **SPF / DKIM / DMARC** pentru `phihau.ro` (hPanel → Emails → configurare DNS / Autentificare email). Fără acestea, emailurile pot ajunge în Spam sau pot fi respinse de provideri mari (Gmail/Outlook).
- Notează limitele planului tău Hostinger: câte emailuri/oră și câte emailuri/zi permite mailbox-ul. Aceste valori devin pragurile din secțiunea 5.

### Configurare în Supabase Dashboard

`Authentication → Emails → SMTP Settings`, activează **Enable Custom SMTP** cu:

| Câmp | Valoare |
|---|---|
| Sender email | `noreply@phihau.ro` |
| Sender name | Federația QwanKiDo România |
| Host | `smtp.hostinger.com` |
| Port | `465` (SSL). Dacă Save/Test eșuează, încearcă `587` (STARTTLS). |
| Username | `noreply@phihau.ro` |
| Password | parola mailbox-ului (din managerul de parole, nu de aici) |

**D-01b — un singur sender pentru toate cele 4 tipuri de email:** Supabase Auth SMTP Settings are UN SINGUR "Sender email" global (nu suportă adrese diferite per tip de email fără Auth Hook custom, deja respins). `noreply@phihau.ro` acoperă toate cele 4 fluxuri: resetare parolă, confirmare cont, cod MFA, schimbare email.

**Dezactivează link tracking** dacă providerul SMTP oferă această opțiune (nu e cazul cu SMTP direct Hostinger, dar verifică dacă folosești un intermediar) — link tracking poate deforma link-urile single-use din emailurile Supabase.

### Discreția D-01 — dacă SMTP-ul Hostinger nu funcționează

Dacă **AMBELE** porturi (465 și 587) eșuează la Save/Test în Supabase: **NU** continua cu alte variante (nu improviza o rută prin n8n — respinsă explicit de utilizator, vezi secțiunea Deferred din `32-CONTEXT.md`). Raportează blocajul exact ("blocat: `<mesajul de eroare>`") și oprește-te — decizia următoare (alt provider, alt port, suport Hostinger) rămâne a utilizatorului.

### Test imediat

Pagina de login → "Am uitat parola" cu adresa ta reală → verifică:
- Emailul ajunge în < 2 minute, de la `noreply@phihau.ro`.
- Verifică și folderul Spam.
- Verifică antetul emailului pentru "signed-by" / DKIM valid (client de mail → afișează sursa/originalul).

### Rollback

Dacă emailurile sau codurile MFA nu mai pleacă după activare: dezactivează **Enable Custom SMTP** din Supabase Dashboard — revii la canalul implicit Supabase (limitat la 2 emailuri/oră, dar funcțional pentru testare).

## 2. Rate limits (D-06)

`Authentication → Rate Limits`:

- **Rate limit for sending emails**: implicit devine **30/oră** după activarea SMTP custom (față de 2/oră pe canalul implicit Supabase). Setează o valoare **≤ limita orară a planului Hostinger** notată la pasul 1.
- **OTP rate limit** (`/auth/v1/otp`): implicit 360/oră — nu necesită schimbare pentru scara actuală (7 cluburi, ~480 sportivi/club test).

Valoarea aleasă pentru "Rate limit for sending emails" devine `prag_ora` în tabela `public.auth_email_praguri` (secțiunea 5).

## 3. Politica de parolă (D-07 — bariera reală, server-side)

**Aplică DOAR după ce codul Fazei 32 e deployat în producție** (vezi secțiunea 0, pasul 3).

`Authentication → Providers → Email` → secțiunea Password:

| Setare | Valoare |
|---|---|
| Minimum password length | `12` |
| Password Requirements | **"Lowercase, uppercase letters and digits"** (fără simboluri — aliniat cu `utils/parola.ts` → `valideazaParola`, care nu cere simboluri) |
| Prevent use of leaked passwords | Activează dacă planul o permite (altfel rămâne verificarea HIBP client-side existentă din `utils/checkLeakedPassword.ts`) |

**Confirmă vizual eticheta exactă din dropdown-ul "Password Requirements"** — poate diferi ușor de textul de mai sus în UI-ul curent Supabase.

**Efect:** login-ul cu parole vechi (setate sub politica anterioară, 6-11 caractere) continuă să funcționeze — Supabase nu blochează autentificarea retroactiv când politica de parolă crește, doar viitoarele setări/schimbări de parolă.

### Test de barieră server (validarea JS din formulare e doar UX — poate fi ocolită din consolă)

```
PUT https://wuhidifzsutwgdfkwhmd.supabase.co/auth/v1/user
Headers:
  apikey: <VITE_SUPABASE_ANON_KEY>
  Authorization: Bearer <access_token al unui cont DE TEST>
  Content-Type: application/json
Body:
  {"password":"parolaslaba12"}
```

Rezultat așteptat: `422` cu `weak_password` (parola de mai sus are 14 caractere dar nu conține literă mare — trebuie respinsă).

## 4. Sesiuni / JWT (D-08)

`Authentication → Sessions` (sau `Project Settings → JWT`, în funcție de versiunea Dashboard-ului):

| Setare | Valoare recomandată | Disponibilitate |
|---|---|---|
| JWT expiry | `3600` secunde (redu dacă e setat mai mare) | Toate planurile |
| Refresh token reuse detection | ON, interval `10` secunde | Toate planurile |
| Time-box user sessions | `720` ore (30 zile) | **Doar planuri plătite** |
| Inactivity timeout | `168` ore (7 zile) | **Doar planuri plătite** |

Aceste setări sunt **globale** (nu per rol) — de aceea, pentru rolurile privilegiate (`ADMIN_CLUB`, `SUPER_ADMIN_FEDERATIE`), Faza 32 adaugă în plus:
- **Delogare automată după 60 min de inactivitate** aplicată client-side, doar acestor roluri (32-04, `hooks/useExpirareInactivitate.ts`) — funcționează indiferent de planul Supabase.
- **Re-verificare MFA la 12 ore** (deja live din Faza 17, `services/emailMfaService.ts` → `DURATA_VALABILITATE_ORE`).

**Pe plan Free**: time-box și inactivity timeout indiferent nu sunt disponibile — consemnează acest fapt ca risc rezidual acceptat (atenuat parțial de delogarea la 60min per rol și de re-verificarea MFA la 12h).

## 5. Praguri monitorizare (D-06)

După ce cunoști valorile reale (rate limit Supabase de la pasul 2, limitele Hostinger de la pasul 1):

```sql
UPDATE public.auth_email_praguri
SET prag_ora = <min(rate limit Supabase, limita orară Hostinger)>,
    prag_zi = <limita zilnică Hostinger>,
    actualizat_la = now()
WHERE id = 1;
```

Rulează via SQL Editor (Supabase Dashboard) sau MCP `execute_sql` pe proiectul `wuhidifzsutwgdfkwhmd`.

Bannerul de alertă (`components/MonitorEmailuriAuth.tsx`, `mod="alerta"`) apare pentru `SUPER_ADMIN_FEDERATIE` când trimise/prag ≥ 80% (oră SAU 24h). Statistica completă e vizibilă oricând în **Jurnal Audit** (`mod="complet"`).

## 6. Schimbare domeniu → frqkd.ro (D-02)

Decizia curentă (`phihau.ro`) e provizorie. Trecerea pe `frqkd.ro` e **pur operațională** — zero modificări de cod:

1. Creează mailbox nou pe `frqkd.ro` (ex. `noreply@frqkd.ro`) și verifică DNS SPF/DKIM/DMARC pe acel domeniu.
2. Actualizează în Supabase Dashboard (`Authentication → Emails → SMTP Settings`): Host, Port, Username, Password, Sender email, Sender name.
3. Retestează (secțiunea 1, "Test imediat").
4. Dacă limitele planului diferă pentru mailbox-ul nou, actualizează pragurile (secțiunea 5).

**Variantă via Management API** (dacă se preferă automatizare, necesită `SUPABASE_ACCESS_TOKEN` — nu există azi în `.env`):

```
PATCH https://api.supabase.com/v1/projects/wuhidifzsutwgdfkwhmd/config/auth
Body: { "smtp_host": "...", "smtp_port": ..., "smtp_user": "...", "smtp_pass": "...", "smtp_admin_email": "...", "smtp_sender_name": "..." }
```

Token-ul și parola SMTP se citesc **doar din variabile de mediu locale ale operatorului**, niciodată comise în repo.

**Avertismente:**
- Conturile provizorii create de `api/genereaza-magic-link.ts` folosesc adrese `<prenume>.<nume>[.<n>]@frqkd.ro`. Dacă domeniul `frqkd.ro` primește vreodată un catch-all de email, aceste adrese provizorii ar începe să primească emailuri reale (astăzi nu sunt cutii de mail funcționale).
- Adresele placeholder `@phihau.ro` folosite implicit în `CreateAccountModal.tsx`/`Sportivi` nu au cutii de mail — emailurile Auth trimise către ele ricoșează (bounce). Nu afectează livrarea către utilizatori reali cu email propriu.

## 7. Verificare post-configurare

Checklist automat (rulat de agent, secțiunea "Porți finale" din `32-08-SUMMARY.md`) + checklist uman end-of-phase (8 puncte, în `32-08-SUMMARY.md`). Rezumat rapid:

- [ ] Emailurile Auth (reset parolă, confirmare cont, cod MFA, schimbare email) pleacă de la `noreply@phihau.ro` via Hostinger.
- [ ] Codul MFA ajunge efectiv la ADMIN_CLUB/SUPER_ADMIN_FEDERATIE (critic — MFA folosește ACELAȘI canal SMTP).
- [ ] Testul `PUT /auth/v1/user` cu parolă slabă → `422 weak_password`.
- [ ] Endpoint-urile `/api/reset-parola-sportiv`, `/api/account`, `/api/genereaza-magic-link` refuză cereri fără `Authorization: Bearer` (401).
- [ ] Cardul "Emailuri Auth (SMTP)" din Jurnal Audit arată pragurile setate și crește după teste.
- [ ] Delogare automată la 60min inactivitate funcțională pentru ADMIN_CLUB/SUPER_ADMIN_FEDERATIE, fără efect pe SPORTIV/INSTRUCTOR.

Detalii complete în `.planning/phases/32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf/32-08-SUMMARY.md`.
