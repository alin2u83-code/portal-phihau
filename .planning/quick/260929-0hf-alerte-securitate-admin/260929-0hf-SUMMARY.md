---
phase: quick-260929-0hf
plan: 01
subsystem: auth-securitate
tags: [auth, securitate, email, nodemailer, jurnal-audit, rls]
dependency-graph:
  requires: [Faza 32 (auth_email_events, is_super_admin())]
  provides: [auth_tentative_login, auth_dispozitive_cunoscute, auth_alerte_trimise, get_statistici_alerte_securitate(), MonitorAlerteSecuritate]
  affects: [hooks/useAuth.ts, components/JurnalAudit.tsx]
tech-stack:
  added: [nodemailer, "@types/nodemailer"]
  patterns: [fire-and-forget non-blocant, cooldown anti-spam 30min, RLS select-only super-admin, rate limit dublu IP+email]
key-files:
  created:
    - supabase/migrations/20260929_alerte_securitate_admin.sql
    - api/_mailerSecuritate.ts
    - api/alerta-securitate-login.ts
    - services/alertaSecuritateService.ts
    - components/MonitorAlerteSecuritate.tsx
  modified:
    - types.ts
    - hooks/useAuth.ts
    - components/JurnalAudit.tsx
    - package.json
    - package-lock.json
decisions:
  - "Migrația SQL a fost scrisă și comisă, dar NU a putut fi aplicată live în această sesiune de execuție — mediul nu are acces la Supabase MCP (apply_migration/execute_sql), CLI Supabase (fără SUPABASE_ACCESS_TOKEN), psql sau modul pg. Vezi secțiunea Blocker de mai jos."
  - "Task 2 (checkpoint verificare legitimitate nodemailer) a fost pre-aprobat explicit de utilizator în prompt-ul de execuție — sărit fără re-verificare."
metrics:
  duration: "~35min"
  completed: "2026-09-29"
---

# Phase quick-260929-0hf Plan 01: Alerte Securitate Admin Summary

Alertă email automată (SMTP Hostinger, handler Vercel nou + nodemailer) către SUPER_ADMIN_FEDERATIE la 5+ login-uri eșuate în 15 minute pe același cont și la login admin de pe IP+browser nemaivăzut, cu card nou de statistici în Jurnal Audit.

## Ce s-a implementat

### Task 1 — Migrare SQL (QUICK-260929-0HF-01)

`supabase/migrations/20260929_alerte_securitate_admin.sql` — 3 tabele noi:

- `auth_tentative_login` (email/ip/user_agent/reusit/user_id, index parțial pe burst-uri eșuate)
- `auth_dispozitive_cunoscute` (user_id/ip/user_agent_hash, UNIQUE compus)
- `auth_alerte_trimise` (tip/referinta/destinatari_count/reusit/eroare, index cooldown)

Toate 3 cu `ENABLE ROW LEVEL SECURITY` + `NO FORCE ROW LEVEL SECURITY` + `REVOKE ALL FROM anon, authenticated` + `GRANT SELECT TO authenticated` + politică SELECT `USING (public.is_super_admin())`. Funcție `get_statistici_alerte_securitate()` (SECURITY DEFINER, STABLE, respinge non-super-admin, `RETURNS jsonb` cu exact cele 6 chei cerute).

**IMPORTANT — NEAPLICATĂ LIVE.** Vezi secțiunea "Blocker: migrație neaplicată" mai jos.

### Task 2 — Checkpoint nodemailer

Pre-aprobat explicit de utilizator în prompt-ul acestei execuții ("Checkpoint uman din Task 2 ... e APROBAT"). Sărit fără re-verificare, conform instrucțiunii.

### Task 3 — Handler Vercel + mailer (QUICK-260929-0HF-02, -03, -04)

- `npm install nodemailer` (`^10.0.12`) + `npm install --save-dev @types/nodemailer` (`^8.0.2`) — verificate în `package.json` după install (nu doar presupuse).
- `api/_mailerSecuritate.ts`: transport nodemailer creat o singură dată la nivel de modul (SMTP Hostinger din env vars); `gasesteDestinatariSuperAdmin()` (query pe `utilizator_roluri_multicont` + `auth.admin.getUserById` per id, erori per-id ignorate); `trimiteAlertaSecuritate()` cu cooldown 30min per `(tip, referinta)`, log în `auth_alerte_trimise` pe fiecare ramură (fără destinatari / succes / eroare), niciun `throw` propagat.
- `api/alerta-securitate-login.ts`: handler public POST, rate limit dublu (`ip:30/min`, `email:20/min`), validare body strictă, insert în `auth_tentative_login`, detecție burst (count `reusit=false` ultimele 15min ≥ 5 → alertă `login_esuat_burst`), detecție dispozitiv necunoscut pentru `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE` (hash SHA-256 user-agent + IP, insert/update `auth_dispozitive_cunoscute`, alertă `dispozitiv_necunoscut` doar la primă vedere). Răspunde mereu `200` (fire-and-forget din client).

`npx tsc --noEmit` → exit 0.

### Task 4 — Wiring + card Jurnal Audit (QUICK-260929-0HF-05, -06)

- `types.ts`: `TipAlertaSecuritate` + `StatisticiAlerteSecuritate` (chei identice 1:1 cu `jsonb_build_object` din migrare).
- `services/alertaSecuritateService.ts`: `notificaIncercareLogin()` (fetch fire-and-forget, try/catch înghite orice eroare) + `getStatisticiAlerteSecuritate()` (RPC).
- `hooks/useAuth.ts`: **o singură linie nouă** — `notificaIncercareLogin(email, !authError, data?.user?.id);` — inserată imediat după `signInWithPassword`, înainte de `if (authError) throw`. Zero altă modificare (verificat cu `git diff`).
- `components/MonitorAlerteSecuritate.tsx`: card nou, mod unic "complet" (fără prop `mod`), badge verde/amber/roșu, 4 linii de statistici, notă praguri.
- `components/JurnalAudit.tsx`: `<MonitorAlerteSecuritate />` randat imediat după `<MonitorEmailuriAuth mod="complet" />` (linia existentă neschimbată, verificat cu `git diff` — 0 diff pe `MonitorEmailuriAuth.tsx`, `LoginPage.tsx`, `emailMfaService.ts`, `useExpirareInactivitate.ts`).

`npx tsc --noEmit` → exit 0.

## Blocker: migrație SQL scrisă, NEaplicată live

Task 1 cerea explicit aplicarea live via Supabase MCP `apply_migration` pe proiectul `wuhidifzsutwgdfkwhmd`, urmată de verificare via `execute_sql`. **Acest lucru NU a fost posibil în acest mediu de execuție** — verificat concret, nu presupus:

- Tool-urile MCP Supabase (`apply_migration`, `execute_sql`) nu sunt disponibile în setul de tool-uri al acestui agent executor (doar Read/Write/Edit/Bash/Grep/Glob/SubagentHandback).
- `supabase` CLI nu e instalat local; `npx supabase projects list` → `AccessTokenRequiredError` (fără `SUPABASE_ACCESS_TOKEN` în `.env` sau cache `~/.supabase`).
- Fără `psql` instalat, fără `DATABASE_URL`/`SUPABASE_DB_URL` în `.env`, fără modulul npm `pg`.
- Nu există niciun RPC "exec SQL arbitrar" deja definit în proiect prin care s-ar putea aplica DDL via `supabase-js`/PostgREST.

**Nu s-a inventat/simulat o aplicare live** — nu s-a raportat fals succes. Fișierul e scris corect pe disc (verificat cu `[ -f ... ]` și citire) și comis în git (cu `git add -f`, dat fiind `supabase/` în `.gitignore`), dar tabelele și funcția **nu există încă în DB** până când cineva cu acces MCP Supabase sau Dashboard le aplică.

**Pași necesari (orchestrator sau utilizator, cu acces Supabase MCP/Dashboard):**

1. Aplică `supabase/migrations/20260929_alerte_securitate_admin.sql` — via MCP `apply_migration` (proiect `wuhidifzsutwgdfkwhmd`) sau manual în Supabase SQL Editor.
2. Verifică:
   ```sql
   SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
   WHERE relname IN ('auth_tentative_login','auth_dispozitive_cunoscute','auth_alerte_trimise');
   -- asteptat: 3 randuri, relrowsecurity=true, relforcerowsecurity=false

   SELECT proname FROM pg_proc WHERE proname = 'get_statistici_alerte_securitate';
   -- asteptat: 1 rand
   ```
3. Setează cele 5 variabile SMTP în Vercel (Production + Preview) conform `user_setup` din PLAN.md, apoi redeploy.

Până la aplicare, `api/alerta-securitate-login.ts` va răspunde `200 { ok: false }` pe fiecare apel (insert-urile vor eșua pe tabele inexistente) — flow-ul de login existent rămâne neafectat (fire-and-forget), dar nicio alertă nu va fi trimisă și cardul `MonitorAlerteSecuritate` va arăta eroare de încărcare (RPC inexistentă).

## Deviations from Plan

### Note (nu deviații de cod — false negative în scripturile de verificare din PLAN.md)

1. **Verify Task 3**: `grep -c "nodemailer" package.json | grep -qx 1` întoarce fals negativ — există 2 linii care conțin substringul `nodemailer` (`"nodemailer": "^10.0.12"` ȘI `"@types/nodemailer": "^8.0.2"`), ambele corecte și cerute de plan. Verificat manual cu `grep -n` — ambele dependențe sunt prezente corect.
2. **Verify Task 4**: `grep -c "notificaIncercareLogin" hooks/useAuth.ts | grep -qx 1` întoarce fals negativ — există 2 linii (import + apel), ambele necesare. La fel, `grep -c "MonitorEmailuriAuth" components/JurnalAudit.tsx | grep -qx 1` întoarce fals negativ — există 2 linii (import + `<MonitorEmailuriAuth mod="complet" />`, linie existentă neschimbată). Ambele confirmate corecte manual cu `grep -n` și `git diff` (0 modificări pe fișierele excluse).

Niciuna dintre acestea nu reprezintă o eroare de implementare — sunt limitări ale comenzilor `grep -c` din scriptul de verificare al PLAN.md, care nu au anticipat liniile de import.

### Auto-fixed Issues

Niciuna — planul a fost executat exact cum a fost scris, cu excepția blocker-ului de aplicare live documentat mai sus (în afara controlului acestui agent).

## Auth Gates

Niciunul — checkpoint-ul Task 2 era deja pre-aprobat de utilizator în prompt-ul de execuție.

## Known Stubs

Niciun stub — toate componentele/serviciile sunt complet cablate la sursele lor reale de date (RPC, fetch, tabele). Cardul `MonitorAlerteSecuritate` va afișa eroare de încărcare până la aplicarea live a migrației (comportament corect pentru RPC inexistentă, nu un stub).

## Verificare rămasă (după aplicarea live a migrației)

Din `<verification>` PLAN.md, ce NU s-a putut confirma în această sesiune:

- Confirmarea live RLS (`relrowsecurity`/`relforcerowsecurity`) și existența funcției `get_statistici_alerte_securitate()`.
- Test manual: 5 login-uri eșuate → email + rând `auth_alerte_trimise`; login admin de pe dispozitiv nou → email + rând `auth_dispozitive_cunoscute`; login normal → fără impact vizibil.
- Verificare vizuală Jurnal Audit (ambele carduri, `SUPER_ADMIN_FEDERATIE`).

Ce S-A confirmat în această sesiune: `npx tsc --noEmit` exit 0 (de 2 ori, după Task 3 și după Task 4), fișierele create existente pe disc, cele 3 commit-uri existente în `git log`, `git diff` gol pe cele 4 fișiere excluse.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260929_alerte_securitate_admin.sql
- FOUND: api/_mailerSecuritate.ts
- FOUND: api/alerta-securitate-login.ts
- FOUND: services/alertaSecuritateService.ts
- FOUND: components/MonitorAlerteSecuritate.tsx
- FOUND commit: 3afa2b7 (Task 1 — migrare SQL, scrisă+comisă, NEaplicată live)
- FOUND commit: a74c83e (Task 3 — handler Vercel + mailer)
- FOUND commit: 1e81f43 (Task 4 — wiring useAuth + card Jurnal Audit)

---

## Update orchestrator (2026-09-29, sesiune continuare)

Ce s-a rezolvat față de blocker-ul de mai sus:

1. **Migrația a fost aplicată live** de orchestrator (are acces MCP Supabase, executorul nu avea) pe proiectul `wuhidifzsutwgdfkwhmd` — verificat concret cu `execute_sql`: cele 3 tabele există, `relrowsecurity=true`/`relforcerowsecurity=false` pe toate, funcția `get_statistici_alerte_securitate()` există (`prosecdef=true`).
2. **Cod push-uit pe `origin/main`** (era doar local, 3 commit-uri ahead) — Vercel a redeployat automat pe commit `1e81f43`.
3. **Variabilele SMTP** au fost puse manual de utilizator în Vercel Dashboard (`SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USER=noreply@phihau.ro`, `SMTP_PASS`, `SMTP_FROM`) + redeploy.
4. **Test end-to-end real** (POST direct către `/api/alerta-securitate-login`, 5× `reusit:false` pe un email de test) — logica de detecție funcționează perfect: rândul se scrie în `auth_tentative_login`, burst-ul de 5 e detectat corect, `destinatari_count=2` (găsește corect cei 2 `SUPER_ADMIN_FEDERATIE`), rândul se scrie în `auth_alerte_trimise`.

### BLOCKER NOU — SMTP respinge autentificarea

Trimiterea efectivă a emailului pică la fiecare test, mereu aceeași eroare:
```
Invalid login: 535 5.7.8 Error: authentication failed: (reason unavailable)
```

Confirmat NU e cache/deploy vechi — reprodus identic pe 2 deploy-uri diferite (înainte și după al doilea redeploy cu SMTP re-verificat de utilizator) și pe 2 adrese de test diferite.

**Suspiciune principală (neconfirmată încă):** mailbox-ul `noreply@phihau.ro` posibil nu a fost niciodată creat efectiv în hPanel Hostinger — runbook-ul `docs/auth-configurare-supabase.md` presupunea că exista deja (pas manual din Faza 32), dar nimeni nu a confirmat explicit crearea lui. Utilizator a spus: *"posibil e fapt sa nu am asa ceva facut pana acum"*.

**Pași rămași pentru sesiunea următoare:**
1. Verifică în hPanel Hostinger (Emails → Email Accounts) dacă mailbox-ul `noreply@phihau.ro` există efectiv. Dacă NU — creează-l, setează o parolă, actualizează `SMTP_PASS` în Vercel, redeploy.
2. Dacă mailbox-ul există deja — testează login direct pe `webmail.hostinger.com` cu aceleași credențiale ca în Vercel, ca să izolezi dacă parola e greșită la sursă sau doar în Vercel (typo la copiere).
3. Verifică și SPF/DKIM/DMARC pe `phihau.ro` (secțiunea 1 din `docs/auth-configurare-supabase.md`) — nu blochează autentificarea SMTP dar poate trimite emailurile în Spam odată ce autentificarea merge.
4. Re-rulează testul: `curl -X POST https://portal-phihau.vercel.app/api/alerta-securitate-login -H "Content-Type: application/json" -d '{"emailFolosit":"<email-test-nou>","reusit":false}'` × 5, verifică `auth_alerte_trimise.reusit=true` (nu mai `eroare` populat).
5. Test login admin real de pe dispozitiv/browser nou (Task 4, human-check pasul 3) — abia după ce trimiterea SMTP merge.

**Nimic din codul aplicat nu e suspect** — detecția, rate-limiting, RLS, cooldown, toate verificate funcționale prin test real. Blocajul e strict la nivel de credențiale SMTP/mailbox Hostinger, în afara codului acestui proiect.
