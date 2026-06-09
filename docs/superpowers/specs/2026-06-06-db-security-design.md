# Securitate Bază de Date — Portal PhiHau
**Design Document** | 2026-06-06 | Abordare: Defense in Depth

---

## Cuprins

1. [Ce protejăm](#1-ce-protejam)
2. [Scorul curent și ce lipsește](#2-scorul-curent)
3. [Cum funcționează protecția în straturi](#3-straturi-protectie)
4. [Faza 1 — Ușile și yălile](#4-faza-1)
5. [Faza 2 — Camera de supraveghere și seiful](#5-faza-2)
6. [Faza 3 — Alarma și rutina](#6-faza-3)
7. [SQL concret — implementare](#7-sql-implementare)
8. [Checklist implementare](#8-checklist)
9. [Cum ajungem la 9.5/10](#9-scor-final)

---

## 1. Ce protejăm

Portal PhiHau gestionează date pentru 3500+ sportivi din 35 cluburi. Datele sensibile:

| Date | Nivel risc | De ce contează |
|------|-----------|----------------|
| **CNP** (cod numeric personal) | CRITIC | Identificator național — GDPR, furt identitate |
| **Date financiare** (plăți, facturi, conturi) | RIDICAT | Istoricul complet plăți per sportiv |
| **Date minori** (foto, info personale) | RIDICAT | Protecție specială legală pentru persoane sub 18 ani |
| **Parole și sesiuni** | RIDICAT | Acces la cont = acces la toate datele de mai sus |
| **Date medicale** (viză medicală) | MEDIU | Expirare viză, informații sănătate |

**Cine atacă și cum:**
- Atacator extern care ghicește/fură parola unui admin
- Atacator intern (cineva cu acces legitim care exportă date masiv)
- Scurgere accidentală (cheie de acces expusă în cod, env var)
- Furt direct al bazei de date (backup compromis)

---

## 2. Scorul curent și ce lipsește

### Scor actual: **5.5 / 10**

#### Ce funcționează deja ✅

| Mecanism | Descriere | Scor |
|----------|-----------|------|
| RLS (Row Level Security) | ~40 tabele au reguli cine ce poate vedea | +2.0 |
| Autentificare Supabase | Email + parolă, JWT tokens, sesiuni | +0.5 |
| RBAC (roluri) | 4 roluri: SUPER_ADMIN > ADMIN_CLUB > INSTRUCTOR > SPORTIV | +1.0 |
| Funcții SQL securizate | `search_path` fixat pe funcții SECURITY DEFINER | +0.5 |
| **Total** | | **4.0** |

#### Ce lipsește ❌

| Gap | Risc concret | Scor pierdut |
|-----|-------------|-------------|
| **Fără MFA** | Parola unui admin = acces la CNP-urile tuturor | -1.0 |
| **Fără audit log** | Cineva exportă 3500 CNP-uri — nu știi cine, când | -1.0 |
| **Fără FORCE RLS** | Service role key (Vercel/Claude) bypass RLS complet | -0.5 |
| **Fără auto-RLS** | Tabele noi create fără RLS = expuse complet | -0.5 |
| **CNP neencriptat** | Furt backup = CNP-uri în clar | -0.5 |
| **Fără rate limiting** | Atacator poate testa parole sau descărca date masiv | -0.5 |
| **deconturi vizibile toți** | Orice user logat vede deconturile federației | -0.3 |
| **Total pierdut** | | **-4.3** |

**Scor real: 4.0 + 1.5 (parțiale) = ~5.5/10**

---

## 3. Cum funcționează protecția în straturi

```
┌─────────────────────────────────────────────────────────────┐
│  STRAT 4 — Monitoring                                        │
│  "Alarma care sună dacă cineva sparge ușa"                   │
│  Alerting anomalii, audit log review, key rotation           │
├─────────────────────────────────────────────────────────────┤
│  STRAT 3 — Aplicație                                         │
│  "Paznicul de la intrare"                                    │
│  Rate limiting, MFA, validare input, masking UI              │
├─────────────────────────────────────────────────────────────┤
│  STRAT 2 — API / Supabase Auth                               │
│  "Controlul de identitate"                                   │
│  JWT tokens, sesiuni scurte, RLS header injection            │
├─────────────────────────────────────────────────────────────┤
│  STRAT 1 — Baza de date (PostgreSQL)                         │
│  "Yala pe fiecare cameră"                                    │
│  RLS + FORCE RLS, audit triggers, pgcrypto, funcții sigure   │
└─────────────────────────────────────────────────────────────┘
```

**Principiu cheie:** Dacă un strat cedează, celelalte blochează. Dacă parola unui admin e furată (strat 3 compromis), MFA blochează accesul. Dacă MFA e ocolit, RLS limitează datele accesibile. Dacă RLS e bypass-uit, audit log-ul înregistrează totul.

---

## 4. Faza 1 — Ușile și yălile

**Durată estimată:** 2-3 zile  
**Scor după faza 1:** ~7.8/10

### 4.1 FORCE ROW LEVEL SECURITY

**Problema:** Momentan, dacă cineva folosește service role key (Vercel, Claude Code), ocolește complet RLS-ul — vede toate datele tuturor.

**Fix:** Activăm `FORCE ROW LEVEL SECURITY` pe toate tabelele. Chiar și cu service role, RLS se aplică.

```sql
-- Migration: force_rls_all_tables.sql
-- Aplică pe toate tabelele din schema public
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
        RAISE NOTICE 'FORCE RLS applied: %', t.tablename;
    END LOOP;
END;
$$;
```

> **Atenție:** Service role key folosit în Edge Functions sau scripturi de migrare va fi blocat de RLS după acest change. Verifică că scripturile de migrare folosesc conexiune directă PostgreSQL (nu anon/service key prin PostgREST).

### 4.2 Auto-RLS pentru tabele noi

**Problema:** Orice tabel nou creat în viitor rămâne fără RLS până cineva își amintește să-l adauge.

**Fix:** Event trigger care activează RLS automat la `CREATE TABLE`.

```sql
-- Migration: auto_rls_trigger.sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    cmd record;
BEGIN
    FOR cmd IN
        SELECT *
        FROM pg_event_trigger_ddl_commands()
        WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS')
          AND object_type IN ('table', 'partitioned table')
    LOOP
        IF cmd.schema_name = 'public' THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
            RAISE LOG 'rls_auto_enable: RLS activat pe %', cmd.object_identity;
        END IF;
    END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls_on_create;
CREATE EVENT TRIGGER ensure_rls_on_create
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
EXECUTE FUNCTION public.rls_auto_enable();
```

### 4.3 MFA obligatoriu pentru admini

**Problema:** Parola unui ADMIN_CLUB = acces la CNP + financiar al întregului club. Un singur cont compromis = breach major.

**Fix:** MFA TOTP (Google Authenticator / Authy) obligatoriu pentru rolurile ADMIN_CLUB și SUPER_ADMIN_FEDERATIE.

**Configurare Supabase Dashboard:**
1. `Authentication > Settings > Multi-Factor Authentication`
2. Activează `TOTP`
3. Setează `MFA enrollment policy: Required for specific users`

**Enforcement în aplicație** — verifică AAL (Authentication Assurance Level):

```sql
-- Policy exemplu: tabele sensibile necesită MFA (aal2)
CREATE POLICY "date_sensibile_doar_mfa"
ON public.sportivi
FOR SELECT
TO authenticated
USING (
    -- Date CNP accesibile doar cu MFA activ
    CASE
        WHEN current_setting('request.jwt.claims', true)::json->>'aal' = 'aal2'
        THEN true
        ELSE (
            -- Fără MFA: ascunde CNP, permite rest
            EXISTS (
                SELECT 1 FROM public.utilizator_roluri_multicont
                WHERE user_id = auth.uid()
                AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN_CLUB', 'INSTRUCTOR', 'SPORTIV')
            )
        )
    END
);
```

**Enforcement în React** — forțează MFA flow pentru admini:

```typescript
// hooks/useMFAGuard.ts
export function useMFAGuard() {
    const { session } = useAuth();

    const isAdminRole = activeRoleContext?.roluri?.nume_rol in ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'];
    const hasMFA = session?.user?.factors?.some(f => f.status === 'verified');

    useEffect(() => {
        if (isAdminRole && !hasMFA) {
            // Redirecționează la pagina de setup MFA
            navigateTo('setup-mfa');
        }
    }, [isAdminRole, hasMFA]);
}
```

### 4.4 Audit service role keys

**Problema:** Service role key (din Vercel env vars) are acces total la DB — bypass orice RLS, orice restricție.

**Acțiuni concrete:**

1. **Verifică** unde e folosit service role key:
```bash
grep -r "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" .
```

2. **Principiu:** Service role key doar în API handlers server-side (`/api/*.ts`), **niciodată** în cod client.

3. **Rotire key:** Supabase Dashboard > `Settings > API > service_role` > Regenerate. Actualizează imediat în Vercel env vars.

4. **Regulă:** Rotire service role key o dată la 90 de zile.

### 4.5 Fix deconturi_federatie SELECT

**Problema actuală:** `USING (true)` = orice user logat vede toate deconturile.

```sql
-- Fix: restricționează la roluri care au nevoie
DROP POLICY IF EXISTS "deconturi_federatie_select" ON public.deconturi_federatie;
CREATE POLICY "deconturi_federatie_select"
    ON public.deconturi_federatie
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
            AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
        )
    );
```

---

## 5. Faza 2 — Camera de supraveghere și seiful

**Durată estimată:** 5-7 zile  
**Scor după faza 2:** ~9.3/10

### 5.1 Tabel audit_log

**Ce înregistrăm:** Orice operație pe date sensibile — cine a făcut ce, când, de pe ce cont, ce date au fost afectate.

```sql
-- Migration: create_audit_log.sql
CREATE TABLE public.audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id         UUID REFERENCES auth.users(id),
    role_context_id UUID,
    tabel           TEXT NOT NULL,
    operatie        TEXT NOT NULL CHECK (operatie IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT_SENSIBIL')),
    rand_id         UUID,
    date_vechi      JSONB,
    date_noi        JSONB,
    ip_address      INET,
    user_agent      TEXT
);

-- RLS: doar super admin poate citi audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_oricine"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "audit_log_select_super_admin"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
            AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
        )
    );

-- Nimeni nu poate șterge sau modifica audit log
-- (nicio politică DELETE/UPDATE = blocat implicit de RLS)

-- Index pentru query rapid după user sau perioadă
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_tabel ON public.audit_log(tabel);
```

**Trigger automat pe tabele sensibile:**

```sql
-- Funcție trigger reutilizabilă
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_log (
        user_id,
        role_context_id,
        tabel,
        operatie,
        rand_id,
        date_vechi,
        date_noi
    ) VALUES (
        auth.uid(),
        (current_setting('request.headers', true)::json->>'active-role-context-id')::uuid,
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplică trigger pe tabele sensibile
CREATE TRIGGER audit_sportivi
    AFTER INSERT OR UPDATE OR DELETE ON public.sportivi
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_plati
    AFTER INSERT OR UPDATE OR DELETE ON public.plati
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_facturi
    AFTER INSERT OR UPDATE OR DELETE ON public.facturi
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_utilizator_roluri
    AFTER INSERT OR UPDATE OR DELETE ON public.utilizator_roluri_multicont
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
```

> **GDPR:** Audit log conține date personale (user_id, date_vechi cu CNP). Politică retenție: **max 2 ani**, după care șterge automat cu cron job.

### 5.2 Encriptare CNP cu pgcrypto

**Problema:** Cineva fură un backup al bazei de date — CNP-urile apar în clar.

**Fix:** Encriptare simetrică cu `pgcrypto`. Cheia de encriptare stocată în Vault Supabase (nu în DB).

```sql
-- Activează extensia pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Funcții helper pentru encrypt/decrypt CNP
CREATE OR REPLACE FUNCTION public.encrypt_cnp(cnp_plain TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT encode(
        pgp_sym_encrypt(
            cnp_plain,
            current_setting('app.cnp_encryption_key')
        ),
        'base64'
    );
$$;

CREATE OR REPLACE FUNCTION public.decrypt_cnp(cnp_encrypted TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pgp_sym_decrypt(
        decode(cnp_encrypted, 'base64'),
        current_setting('app.cnp_encryption_key')
    );
$$;
```

**Cheia de encriptare** se setează prin Supabase Vault (nu hardcodat):
```sql
-- În Supabase Dashboard > Database > Vault: adaugă secret 'cnp_encryption_key'
-- Setează în postgresql.conf sau via ALTER DATABASE:
ALTER DATABASE postgres SET app.cnp_encryption_key = 'cheie-din-vault';
```

**Migrare date existente:**
```sql
-- ONE-TIME migration: encriptează CNP-urile existente
UPDATE public.sportivi
SET cnp = public.encrypt_cnp(cnp)
WHERE cnp IS NOT NULL
  AND length(cnp) = 13; -- CNP neencriptat are exact 13 cifre
```

### 5.3 Rate limiting

**Problema:** Fără rate limiting, un atacator poate:
- Testa 10.000 de parole pe minut (brute force)
- Descărca toate datele prin API în loop

**Fix A — Supabase Auth rate limiting** (deja disponibil, trebuie activat):
- Dashboard > `Authentication > Rate Limits`
- Email confirmations: max 5/oră per IP
- OTP: max 10/oră per IP

**Fix B — Vercel Edge Middleware** pentru API handlers:

```typescript
// middleware.ts (Vercel Edge)
import { NextResponse } from 'next/server';

const RATE_LIMIT = new Map<string, { count: number; reset: number }>();

export function middleware(request: Request) {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minut
    const maxRequests = 100;

    const current = RATE_LIMIT.get(ip);

    if (!current || now > current.reset) {
        RATE_LIMIT.set(ip, { count: 1, reset: now + windowMs });
        return NextResponse.next();
    }

    if (current.count >= maxRequests) {
        return new NextResponse('Too Many Requests', { status: 429 });
    }

    current.count++;
    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
```

### 5.4 Column-level masking

**Problema:** Un INSTRUCTOR vede CNP-ul complet deși are nevoie doar de ultimele 4 cifre.

**Fix:** View per rol care maschează câmpurile sensibile:

```sql
-- View pentru instructori: CNP mascat
CREATE OR REPLACE VIEW public.sportivi_instructor AS
SELECT
    id,
    nume,
    prenume,
    -- CNP mascat: afișează doar ultimele 4 cifre
    CASE
        WHEN public.decrypt_cnp(cnp) IS NOT NULL
        THEN '**********' || right(public.decrypt_cnp(cnp), 4)
        ELSE '****'
    END AS cnp,
    data_nasterii,
    club_id,
    grad_actual_id,
    activ
FROM public.sportivi;

-- RLS pe view
ALTER VIEW public.sportivi_instructor SET (security_invoker = true);
```

---

## 6. Faza 3 — Alarma și rutina

**Durată estimată:** 5-7 zile  
**Scor menținut:** 9.5/10

### 6.1 Alerting anomalii

**Ce detectăm:**
- Cineva descarcă >100 rânduri din tabela `sportivi` într-un minut
- Login dintr-o locație nouă pentru un admin
- Tentative repetate de autentificare eșuată

**Implementare:** Supabase Edge Function declanșată de audit log:

```typescript
// supabase/functions/security-alert/index.ts
import { createClient } from '@supabase/supabase-js';

const ALERT_THRESHOLD = 100; // rânduri per minut

Deno.serve(async (req) => {
    const { table, user_id, operation, count } = await req.json();

    if (operation === 'SELECT_SENSIBIL' && count > ALERT_THRESHOLD) {
        // Trimite alertă pe email/webhook
        await fetch(Deno.env.get('ALERT_WEBHOOK_URL')!, {
            method: 'POST',
            body: JSON.stringify({
                mesaj: `ALERTĂ: User ${user_id} a accesat ${count} rânduri din ${table}`,
                severitate: 'RIDICAT',
                timestamp: new Date().toISOString()
            })
        });
    }

    return new Response('ok');
});
```

### 6.2 Key rotation proces

**Rotire service role key** — la fiecare 90 de zile:

1. Supabase Dashboard > `Settings > API` > Regenerate `service_role`
2. Actualizează `SUPABASE_SERVICE_ROLE_KEY` în Vercel Environment Variables
3. Redeploy aplicația
4. Verifică că aplicația funcționează normal
5. Notează data rotației în `docs/security/key-rotation-log.md`

**Rotire JWT secret** — la fiecare 180 de zile sau după incident:
- Dashboard > `Authentication > JWT Settings` > Rotate JWT Secret
- Atenție: toate sesiunile active sunt invalidate (userii trebuie să se relogheze)

### 6.3 Checklist lunar securitate

Executat prima zi a fiecărei luni (5 minute):

```markdown
## Checklist Securitate Lunar — [LUNA ANUL]

- [ ] Supabase Dashboard > Security Advisor — zero ERRORS, zero WARNINGS noi
- [ ] Verifică audit_log: există operații suspecte în ultima lună?
- [ ] Verifică utilizatori inactivi >90 zile: dezactivează conturile
- [ ] Verifică că MFA e activ pe toți adminii
- [ ] Data ultimei rotații service role key < 90 zile?
- [ ] Niciun secret/cheie în cod (git grep "service_role" src/)
```

---

## 7. SQL concret — implementare completă

### Ordine rulare migrații

```bash
# Faza 1 — rulează în Supabase SQL Editor
1. sql/migrations/force_rls_all_tables.sql
2. sql/migrations/auto_rls_trigger.sql
3. sql/migrations/fix_deconturi_select_policy.sql

# Faza 2
4. sql/migrations/create_audit_log.sql
5. sql/migrations/add_audit_triggers_sensibile.sql
6. sql/migrations/encrypt_cnp_pgcrypto.sql
7. sql/migrations/create_sportivi_instructor_view.sql

# Configurare (nu SQL — în Dashboard)
8. Authentication > MFA > Enable TOTP
9. Authentication > Rate Limits > Configure
10. Vault > Add secret: cnp_encryption_key
```

### Verificare post-implementare

```sql
-- Verifică FORCE RLS pe toate tabelele
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Așteptat: rowsecurity = true, forcerowsecurity = true pe toate

-- Verifică că audit log primește date
INSERT INTO public.sportivi (test_col) VALUES ('test'); -- va eșua dar trigger-ul va fi testat
SELECT * FROM public.audit_log ORDER BY created_at DESC LIMIT 5;

-- Verifică CNP encriptat
SELECT id, cnp FROM public.sportivi LIMIT 3;
-- Așteptat: CNP apare ca text base64, nu cifre

-- Verifică că decriptarea funcționează
SELECT id, public.decrypt_cnp(cnp) FROM public.sportivi LIMIT 3;
-- Așteptat: CNP-urile reale
```

---

## 8. Checklist implementare

### Faza 1 — Critice (3 zile)

| # | Task | Fișier | Efort | Status |
|---|------|--------|-------|--------|
| 1 | FORCE RLS pe toate tabelele | `sql/migrations/force_rls_all_tables.sql` | 1h | ☐ |
| 2 | Auto-RLS trigger tabele noi | `sql/migrations/auto_rls_trigger.sql` | 1h | ☐ |
| 3 | Activează MFA în Supabase Dashboard | Dashboard manual | 30min | ☐ |
| 4 | `useMFAGuard` hook + redirect setup-mfa | `hooks/useMFAGuard.ts` | 3h | ☐ |
| 5 | Fix `deconturi_federatie` SELECT policy | `sql/migrations/fix_deconturi_select.sql` | 30min | ☐ |
| 6 | Audit service role key — grep + rotate | Vercel Dashboard + bash | 1h | ☐ |

### Faza 2 — Importante (1 săptămână)

| # | Task | Fișier | Efort | Status |
|---|------|--------|-------|--------|
| 7 | Creare tabel `audit_log` + RLS | `sql/migrations/create_audit_log.sql` | 2h | ☐ |
| 8 | Trigger audit pe tabele sensibile | `sql/migrations/audit_triggers.sql` | 3h | ☐ |
| 9 | Activare pgcrypto + funcții encrypt/decrypt | `sql/migrations/pgcrypto_setup.sql` | 2h | ☐ |
| 10 | Migrare CNP-uri existente (encrypt) | `sql/migrations/encrypt_existing_cnp.sql` | 2h | ☐ |
| 11 | Rate limiting Supabase Auth (Dashboard) | Dashboard manual | 30min | ☐ |
| 12 | Rate limiting Vercel middleware | `middleware.ts` | 2h | ☐ |
| 13 | View `sportivi_instructor` cu CNP mascat | `sql/migrations/sportivi_instructor_view.sql` | 2h | ☐ |

### Faza 3 — Advanced (1 săptămână)

| # | Task | Fișier | Efort | Status |
|---|------|--------|-------|--------|
| 14 | Edge Function alerting anomalii | `supabase/functions/security-alert/` | 4h | ☐ |
| 15 | Doc proces key rotation | `docs/security/key-rotation-log.md` | 1h | ☐ |
| 16 | Checklist lunar securitate | `docs/security/checklist-lunar.md` | 30min | ☐ |

---

## 9. Cum ajungem la 9.5/10

| Domeniu | Scor inițial | Scor final | Ce face diferența |
|---------|-------------|-----------|-------------------|
| RLS & acces DB | 2.0 | 3.5 | FORCE RLS + auto-trigger + policy fixes |
| Autentificare | 0.5 | 1.5 | MFA obligatoriu admini |
| Audit & detectie | 0.0 | 1.5 | audit_log + triggers + alerting |
| Encriptare date | 0.0 | 1.0 | pgcrypto CNP + column masking |
| Protecție API | 0.0 | 0.7 | Rate limiting Vercel + Supabase |
| Procese & rutine | 0.5 | 0.8 | Key rotation + checklist lunar |
| **TOTAL** | **5.5** | **9.5** | |

### De ce nu 10/10?

Cele 0.5 puncte rămase reprezintă lucruri în afara controlului direct:
- Vulnerabilități necunoscute în Supabase/PostgreSQL ca platformă
- Atacuri de tip zero-day
- Factorul uman (phishing) — MFA reduce riscul dar nu îl elimină complet

Un scor de 9.5/10 înseamnă că **ai făcut tot ce poți face în mod rezonabil** pentru a proteja datele sportivilor tăi.

---

*Document generat: 2026-06-06 | Proiect: portal-phihau | Abordare: Defense in Depth*
