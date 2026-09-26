# Phase 32: Audit complet Auth — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
**Areas discussed:** Scope audit general, SMTP custom provider, Retry/backoff bulk, Monitorizare praguri, Politici parolă/sesiuni, MFA audit

---

## Scope audit general

| Option | Description | Selected |
|--------|-------------|----------|
| Strict cele 3 din titlu | SMTP + retry/backoff + monitorizare, nimic în plus | |
| + Politici parolă/sesiuni | Adaugă verificare complexitate/expirare sesiune | ✓ |
| + MFA | Readuce MFA (deja implementat Faza 17) în discuție | ✓ |

**User's choice:** Ambele extensii de scope acceptate.
**Notes:** Titlul fazei era deja "audit complet Auth" — extinderea e în interiorul domeniului, nu scope creep.

---

## SMTP custom provider

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | 3000/lună gratis, domeniu propriu | |
| Gmail/Google Workspace | Refolosire cont existent | |
| SendGrid | 100/zi gratis | |
| Altul / am deja un cont | — | ✓ |

**User's choice:** "putem folosi deocamdata phihau.ro? pana clarific cu frqkd.ro"
**Notes:** Follow-up a clarificat că hosting-ul e Hostinger (cu n8n rulând pe același server).

### Arhitectura SMTP (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| SMTP direct Hostinger → Supabase | Configurare directă în Supabase Dashboard, fără n8n | ✓ |
| Prin n8n (Auth Hook custom) | Rutare prin webhook n8n, mult mai complex | |

**User's choice:** SMTP direct, respins explicit n8n.

### Adrese separate per funcție (follow-up mid-turn)

| Option | Description | Selected |
|--------|-------------|----------|
| Un singur noreply@frqkd.ro | Migrare imediată la frqkd.ro | |
| noreply@phihau.ro acum, migrare frqkd.ro după | Rămâne planul inițial | ✓ |
| Adrese diferite per funcție | Necesită Auth Hook custom | |

**User's choice:** noreply@phihau.ro acum — plan inițial confirmat, fără schimbare.
**Notes:** Utilizatorul a întrebat dacă poate avea emailuri separate per funcție (reset@, mfa@ etc.) folosind frqkd.ro. I s-a explicat constrângerea Supabase (un singur sender email global fără Auth Hook custom) — a ales să rămână la soluția simplă inițială.

---

## Retry/backoff bulk import

| Option | Description | Selected |
|--------|-------------|----------|
| Retry automat cu backoff exponențial | 2-3 încercări, delay crescător | |
| Doar throttling preventiv | Delay fix între requesturi | |
| Ambele | Delay preventiv + retry pe 429 | ✓ |

**User's choice:** Ambele — acoperire maximă.

---

## Monitorizare praguri + alertă

| Option | Description | Selected |
|--------|-------------|----------|
| Banner in-app pt SUPER_ADMIN | Vizibilitate la cerere, fără alertă activă | ✓ |
| Banner + alertă SMS | Alertă automată la 80% prag | |
| Doar log/audit | Fără UI dedicat | |

**User's choice:** Banner in-app pentru SUPER_ADMIN, fără SMS.

---

## Politici parolă/sesiuni

| Option | Description | Selected |
|--------|-------------|----------|
| Expirare sesiune/token | Verifică/ajustează durata JWT | ✓ |
| Politica parolă la schimbare | Aliniază regulile cu creare cont | ✓ |
| Doar raportare | Fără schimbări | |

**User's choice:** Ambele — verificare ȘI aliniere/fix, nu doar raportare.

---

## MFA audit

| Option | Description | Selected |
|--------|-------------|----------|
| Doar audit acoperire | Re-rulează scriptul existent | ✓ |
| Audit + verifică impact SMTP pe OTP | Confirmă că MFA nu pică silențios | |

**User's choice:** Doar audit acoperire (dar planner e avertizat în CONTEXT.md despre riscul SMTP→MFA oricum, ca notă critică).

---

## Claude's Discretion

- Dacă mailbox-ul Hostinger nu suportă SMTP extern (restricții port), documentează blocajul înainte de a improviza prin n8n.
- UI-ul de progres bulk trebuie să reflecte și încercările de retry — planner decide mecanismul exact.
- Sursa de adevăr pentru numărul de emailuri trimise (pentru banner monitorizare) — de stabilit în research; posibil tabel de audit nou.

## Deferred Ideas

- Alertă SMS activă la depășire prag — rămâne pentru o fază viitoare dacă banner-ul nu e suficient.
- Rutare emailuri prin n8n / Auth Hook custom — respinsă pentru această fază.
- Adrese email separate per funcție (reset@, mfa@ etc.) — respinsă, necesită Auth Hook custom.
