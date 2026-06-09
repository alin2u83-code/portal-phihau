# DB Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ridică scorul de securitate de la 5.5/10 la 9.5/10 prin FORCE RLS, audit log cu triggers, encriptare CNP, MFA obligatoriu pentru admini și rate limiting API.

**Architecture:** Defense in Depth în 3 faze — Faza 1 (RLS hardening + MFA) e independentă și safe de rulat imediat; Faza 2 (audit + CNP encryption) are risc mai mare și necesită backup; Faza 3 (alerting + docs) e zero-risc.

**Tech Stack:** PostgreSQL (pgcrypto, event triggers, audit triggers), React 18 + TypeScript (useMFAGuard hook, SetupMFAPage), Supabase Auth (TOTP MFA), Vercel Node.js Functions (rate limiting utility)

> **ATENȚIE FORCE RLS:** `FORCE ROW LEVEL SECURITY` în PostgreSQL forțează owner-ul tabelei să respecte RLS. Supabase `service_role` are atribut `BYPASSRLS` deci NU este afectat. API handlers Vercel care folosesc `service_role` continuă să funcționeze normal.

> **ATENȚIE CNP:** Task 9 (encrypt_existing_cnp) modifică date de producție ireversibil. Rulează NUMAI după backup confirmat și test în staging.

---

## File Map

| Fișier | Acțiune | Responsabilitate |
|--------|---------|-----------------|
| `sql/migrations/force_rls_v2.sql` | CREATE | FORCE RLS pe toate tabelele publice |
| `sql/migrations/auto_rls_trigger.sql` | CREATE | Event trigger: RLS auto pe tabele noi |
| `sql/migrations/fix_deconturi_federatie_policy.sql` | CREATE | Fix SELECT policy deconturi_federatie |
| `sql/migrations/create_audit_log.sql` | CREATE | Tabel audit_log + RLS + indexuri |
| `sql/migrations/audit_triggers_sensibile.sql` | CREATE | Triggers INSERT/UPDATE/DELETE pe sportivi, plati, facturi, utilizator_roluri_multicont |
| `sql/migrations/pgcrypto_setup.sql` | CREATE | Extensie pgcrypto + funcții encrypt_cnp/decrypt_cnp |
| `sql/migrations/encrypt_existing_cnp.sql` | CREATE | ONE-TIME: encriptează CNP-uri existente |
| `sql/migrations/sportivi_instructor_view.sql` | CREATE | View sportivi_instructor cu CNP mascat |
| `hooks/useMFAGuard.ts` | CREATE | Hook: detectează admini fără MFA, redirectează la setup-mfa |
| `components/SetupMFAPage.tsx` | CREATE | Pagina de enroll TOTP MFA |
| `api/_rateLimit.ts` | CREATE | Utility rate limiting pentru API handlers |
| `types.ts` | MODIFY | Adaugă `'setup-mfa'` la tipul `View` |
| `components/AppRouter.tsx` | MODIFY | Înregistrează view `'setup-mfa'` → SetupMFAPage |
| `App.tsx` | MODIFY | Apelează `useMFAGuard()` |
| `docs/security/key-rotation-log.md` | CREATE | Log rotire chei + proces |
| `docs/security/checklist-lunar.md` | CREATE | Checklist securitate lunar |

---

## FAZA 1 — RLS Hardening + MFA (Critice)

### Task 1: FORCE RLS pe toate tabelele

**Files:**
- Create: `sql/migrations/force_rls_v2.sql`

- [ ] **Step 1: Verifică tabele fără FORCE RLS**

Rulează în Supabase SQL Editor (Dashboard → SQL Editor):
```sql
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY forcerowsecurity ASC, tablename;
```
Notează câte tabele au `forcerowsecurity = false`.

- [ ] **Step 2: Creează migration file**

```sql
-- sql/migrations/force_rls_v2.sql
-- Date: 2026-06-06
-- Purpose: FORCE ROW LEVEL SECURITY pe toate tabelele publice.
-- NOTA: service_role are BYPASSRLS — API handlers Vercel NU sunt afectate.
-- NOTA: postgres/superuser role sunt forțate să respecte RLS după acest change.

DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
        RAISE NOTICE 'FORCE RLS applied: %', t.tablename;
    END LOOP;
    RAISE NOTICE 'force_rls_v2.sql: done.';
END;
$$;
```

- [ ] **Step 3: Rulează în Supabase SQL Editor**

Copiază conținutul din `sql/migrations/force_rls_v2.sql` în SQL Editor → Run.
Așteptat: `FORCE RLS applied: sportivi`, `FORCE RLS applied: plati`, etc. pentru fiecare tabel.
Verifică: niciun `ERROR`.

- [ ] **Step 4: Verificare post-run**

```sql
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Așteptat: `rowsecurity = true` și `forcerowsecurity = true` pe TOATE rândurile.

- [ ] **Step 5: Test aplicație**

Deschide aplicația în browser, loghează-te, navighează la Sportivi, Plăți, Grupe.
Așteptat: date se încarcă normal (service_role în API handlers bypasses RLS, anon/authenticated keys respectă politicile existente).

- [ ] **Step 6: Commit**

```bash
git add sql/migrations/force_rls_v2.sql
git commit -m "security: enable FORCE ROW LEVEL SECURITY on all public tables"
```

---

### Task 2: Auto-RLS trigger pentru tabele noi

**Files:**
- Create: `sql/migrations/auto_rls_trigger.sql`

- [ ] **Step 1: Creează migration file**

```sql
-- sql/migrations/auto_rls_trigger.sql
-- Date: 2026-06-06
-- Purpose: Event trigger — activează automat RLS pe orice tabel nou creat în schema public.

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
            EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', cmd.object_identity);
            RAISE LOG 'rls_auto_enable: RLS + FORCE RLS activat pe %', cmd.object_identity;
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

- [ ] **Step 2: Rulează în Supabase SQL Editor**

Rulează `sql/migrations/auto_rls_trigger.sql`.
Așteptat: `CREATE FUNCTION`, `CREATE EVENT TRIGGER` — fără erori.

- [ ] **Step 3: Test trigger**

```sql
-- Test: creează tabel dummy și verifică că RLS e activat automat
CREATE TABLE public._test_rls_auto (id serial primary key, val text);
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE tablename = '_test_rls_auto';
-- Așteptat: rowsecurity = true, forcerowsecurity = true

DROP TABLE public._test_rls_auto;
```

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/auto_rls_trigger.sql
git commit -m "security: add event trigger to auto-enable RLS on new tables"
```

---

### Task 3: Fix policy deconturi_federatie

**Files:**
- Create: `sql/migrations/fix_deconturi_federatie_policy.sql`

Problema: politica SELECT curentă are `USING (true)` = orice user autentificat vede toate deconturile federației.

- [ ] **Step 1: Verifică politica actuală**

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'deconturi_federatie';
```
Dacă `qual` conține `true` la SELECT, fix-ul e necesar.

- [ ] **Step 2: Creează migration file**

```sql
-- sql/migrations/fix_deconturi_federatie_policy.sql
-- Date: 2026-06-06
-- Purpose: Restricționează SELECT pe deconturi_federatie la roluri admin.

DROP POLICY IF EXISTS "deconturi_federatie_select" ON public.deconturi_federatie;

CREATE POLICY "deconturi_federatie_select"
    ON public.deconturi_federatie
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
        )
    );
```

- [ ] **Step 3: Rulează în Supabase SQL Editor**

Rulează fișierul. Așteptat: `DROP POLICY`, `CREATE POLICY` — fără erori.

- [ ] **Step 4: Test**

Loghează-te ca INSTRUCTOR sau SPORTIV. Navighează la orice pagină care ar putea afișa deconturi federație.
Așteptat: datele nu apar (query returnează 0 rânduri).
Loghează-te ca ADMIN_CLUB. Așteptat: deconturile apar normal.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/fix_deconturi_federatie_policy.sql
git commit -m "security: restrict deconturi_federatie SELECT to admin roles only"
```

---

### Task 4: useMFAGuard hook

**Files:**
- Modify: `types.ts` (adaugă `'setup-mfa'` la View)
- Create: `hooks/useMFAGuard.ts`
- Create: `components/SetupMFAPage.tsx`
- Modify: `components/AppRouter.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Adaugă 'setup-mfa' la tipul View în types.ts**

Găsește tipul `View` în `types.ts` (caută `type View =` sau `View = `). Adaugă `'setup-mfa'` la union type:

```typescript
// În types.ts, la definiția View, adaugă:
| 'setup-mfa'
```

- [ ] **Step 2: Creează hooks/useMFAGuard.ts**

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';

const ADMIN_ROLES = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE', 'ADMIN'];

export function useMFAGuard(activeRoleContext: any | null) {
    const { navigateTo } = useNavigation();
    const [mfaChecked, setMfaChecked] = useState(false);

    useEffect(() => {
        if (!activeRoleContext) return;

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;
        const isAdminRole = ADMIN_ROLES.includes(roleName);

        if (!isAdminRole) {
            setMfaChecked(true);
            return;
        }

        supabase?.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
            const currentLevel = data?.currentLevel;
            const nextLevel = data?.nextLevel;
            // nextLevel === 'aal2' înseamnă că userul ARE factor MFA înrolat
            // dar sesiunea curentă nu a trecut prin MFA challenge
            if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
                navigateTo('setup-mfa');
            } else if (!nextLevel || nextLevel === 'aal1') {
                // Nu are MFA configurat deloc — redirecționează la setup
                navigateTo('setup-mfa');
            }
            setMfaChecked(true);
        });
    }, [activeRoleContext?.id]);

    return { mfaChecked };
}
```

- [ ] **Step 3: Creează components/SetupMFAPage.tsx**

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { Button, Card, Alert } from './ui';

export function SetupMFAPage() {
    const { navigateTo } = useNavigation();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'enroll' | 'verify'>('enroll');

    useEffect(() => {
        enrollTOTP();
    }, []);

    async function enrollTOTP() {
        setLoading(true);
        setError(null);
        const { data, error: enrollError } = await supabase!.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'Portal PhiHau',
        });
        if (enrollError) {
            setError(enrollError.message);
        } else {
            setQrCode(data.totp.qr_code);
            setFactorId(data.id);
            setStep('verify');
        }
        setLoading(false);
    }

    async function verifyTOTP() {
        if (!factorId || code.length !== 6) return;
        setLoading(true);
        setError(null);

        const { data: challengeData, error: challengeError } = await supabase!.auth.mfa.challenge({ factorId });
        if (challengeError) {
            setError(challengeError.message);
            setLoading(false);
            return;
        }

        const { error: verifyError } = await supabase!.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code,
        });

        if (verifyError) {
            setError('Cod invalid. Verifică ora dispozitivului și încearcă din nou.');
        } else {
            navigateTo('dashboard');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md p-6 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Configurare autentificare în doi pași</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Contul tău de admin necesită MFA. Scanează codul QR cu Google Authenticator sau Authy.
                    </p>
                </div>

                {error && <Alert variant="error">{error}</Alert>}

                {step === 'verify' && qrCode && (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cod din aplicația de autentificare
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={code}
                                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                className="w-full border rounded px-3 py-2 text-center text-2xl tracking-widest"
                                onKeyDown={e => e.key === 'Enter' && verifyTOTP()}
                            />
                        </div>
                        <Button
                            onClick={verifyTOTP}
                            disabled={code.length !== 6 || loading}
                            className="w-full"
                        >
                            {loading ? 'Verificare...' : 'Activează MFA'}
                        </Button>
                    </div>
                )}

                {loading && step === 'enroll' && (
                    <p className="text-center text-gray-500">Se generează codul QR...</p>
                )}
            </Card>
        </div>
    );
}
```

- [ ] **Step 4: Înregistrează în AppRouter.tsx**

Găsește în `components/AppRouter.tsx` locul unde sunt înregistrate view-urile (switch statement sau if/else pe `activeView`). Adaugă:

```typescript
// Importează componenta (lângă celelalte imports)
import { SetupMFAPage } from './SetupMFAPage';

// În switch/if-else pentru activeView, adaugă:
case 'setup-mfa':
    return <SetupMFAPage />;
```

- [ ] **Step 5: Integrează useMFAGuard în App.tsx**

În `App.tsx`, după importuri, adaugă:
```typescript
import { useMFAGuard } from './hooks/useMFAGuard';
```

În interiorul funcției `App()`, după linia unde se obține `activeRoleContext`:
```typescript
useMFAGuard(activeRoleContext);
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```
Așteptat: 0 erori noi. Dacă `View` nu are `'setup-mfa'`, va apărea eroare — adaugă la union type.

- [ ] **Step 7: Test manual**

Nota: MFA se poate testa complet doar dacă TOTP este activat în Supabase Dashboard (Authentication → MFA → Enable TOTP). Fără activare în Dashboard, hook-ul nu va redirecta. Pasul de activare Dashboard este manual și nu poate fi automatizat.

Verificare cod: compilează, hook-ul e importat, view-ul e înregistrat în AppRouter.

- [ ] **Step 8: Commit**

```bash
git add types.ts hooks/useMFAGuard.ts components/SetupMFAPage.tsx components/AppRouter.tsx App.tsx
git commit -m "feat: add MFA guard hook and setup page for admin roles"
```

---

## FAZA 2 — Audit Log + CNP Encryption (Importante)

### Task 5: Tabel audit_log

**Files:**
- Create: `sql/migrations/create_audit_log.sql`

- [ ] **Step 1: Creează migration file**

```sql
-- sql/migrations/create_audit_log.sql
-- Date: 2026-06-06
-- Purpose: Tabel centralizat de audit pentru operații pe date sensibile.
-- GDPR: Retenție max 2 ani — implementează cron job de curățare sau pgcron.

CREATE TABLE IF NOT EXISTS public.audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role_context_id UUID,
    tabel           TEXT NOT NULL,
    operatie        TEXT NOT NULL CHECK (operatie IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT_SENSIBIL')),
    rand_id         UUID,
    date_vechi      JSONB,
    date_noi        JSONB,
    ip_address      INET,
    user_agent      TEXT
);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

-- Orice user autentificat poate insera (trigger-ul rulează SECURITY DEFINER)
CREATE POLICY "audit_log_insert"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Doar super admini pot citi
CREATE POLICY "audit_log_select_admin"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
        )
    );

-- Nimeni nu poate modifica sau șterge audit_log (nicio politică UPDATE/DELETE)

-- Indexuri pentru query performant
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
    ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabel
    ON public.audit_log(tabel);
```

- [ ] **Step 2: Rulează în Supabase SQL Editor**

Rulează `sql/migrations/create_audit_log.sql`.
Așteptat: `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY` (×2), `CREATE INDEX` (×3) — fără erori.

- [ ] **Step 3: Verificare**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'audit_log'
ORDER BY ordinal_position;
```
Așteptat: 10 coloane (id, created_at, user_id, role_context_id, tabel, operatie, rand_id, date_vechi, date_noi, ip_address, user_agent).

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/create_audit_log.sql
git commit -m "security: create audit_log table with RLS and indexes"
```

---

### Task 6: Audit triggers pe tabele sensibile

**Files:**
- Create: `sql/migrations/audit_triggers_sensibile.sql`

Depinde de: Task 5 (audit_log trebuie să existe).

- [ ] **Step 1: Creează migration file**

```sql
-- sql/migrations/audit_triggers_sensibile.sql
-- Date: 2026-06-06
-- Purpose: Trigger audit pe INSERT/UPDATE/DELETE pentru tabele cu date sensibile.
-- Tabele: sportivi, plati, facturi, utilizator_roluri_multicont

-- Funcție trigger reutilizabilă (SECURITY DEFINER = rulează ca postgres, nu ca userul curent)
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    role_ctx_id UUID;
BEGIN
    -- Extrage role context din header-ul injectat de supabaseClient
    BEGIN
        role_ctx_id := (
            current_setting('request.headers', true)::json->>'active-role-context-id'
        )::uuid;
    EXCEPTION WHEN OTHERS THEN
        role_ctx_id := NULL;
    END;

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
        role_ctx_id,
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN (NEW.id)::uuid ELSE NULL END,
            CASE WHEN TG_OP = 'DELETE' THEN (OLD.id)::uuid ELSE NULL END
        ),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger pe sportivi
DROP TRIGGER IF EXISTS audit_sportivi ON public.sportivi;
CREATE TRIGGER audit_sportivi
    AFTER INSERT OR UPDATE OR DELETE ON public.sportivi
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Trigger pe plati
DROP TRIGGER IF EXISTS audit_plati ON public.plati;
CREATE TRIGGER audit_plati
    AFTER INSERT OR UPDATE OR DELETE ON public.plati
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Trigger pe facturi
DROP TRIGGER IF EXISTS audit_facturi ON public.facturi;
CREATE TRIGGER audit_facturi
    AFTER INSERT OR UPDATE OR DELETE ON public.facturi
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Trigger pe utilizator_roluri_multicont (modificări de rol = critice)
DROP TRIGGER IF EXISTS audit_roluri ON public.utilizator_roluri_multicont;
CREATE TRIGGER audit_roluri
    AFTER INSERT OR UPDATE OR DELETE ON public.utilizator_roluri_multicont
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
```

- [ ] **Step 2: Rulează în Supabase SQL Editor**

Rulează `sql/migrations/audit_triggers_sensibile.sql`.
Așteptat: `CREATE FUNCTION`, `CREATE TRIGGER` ×4 — fără erori.

- [ ] **Step 3: Test trigger**

```sql
-- Verifică că trigger-ul înregistrează un UPDATE pe sportivi
-- (fă un update dummy și verifică audit_log)
UPDATE public.sportivi SET activ = activ WHERE id = (SELECT id FROM public.sportivi LIMIT 1);
SELECT tabel, operatie, rand_id, created_at
FROM public.audit_log
ORDER BY created_at DESC
LIMIT 5;
```
Așteptat: apare un rând cu `tabel = 'sportivi'`, `operatie = 'UPDATE'`.

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/audit_triggers_sensibile.sql
git commit -m "security: add audit triggers on sportivi, plati, facturi, utilizator_roluri"
```

---

### Task 7: pgcrypto + funcții encrypt/decrypt CNP

**Files:**
- Create: `sql/migrations/pgcrypto_setup.sql`

- [ ] **Step 1: Creează migration file**

```sql
-- sql/migrations/pgcrypto_setup.sql
-- Date: 2026-06-06
-- Purpose: Activare pgcrypto + funcții pentru encriptare/decriptare CNP.
-- IMPORTANT: Cheia de encriptare trebuie setată în Supabase Vault și configurată
--            via ALTER DATABASE înainte de a rula encrypt_existing_cnp.sql.

-- Activează extensia pgcrypto (dacă nu există deja)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Funcție encriptare CNP
-- Citește cheia din configurare PostgreSQL (setată din Vault)
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

-- Funcție decriptare CNP
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

-- Verificare: ambele funcții există
DO $$
BEGIN
    RAISE NOTICE 'pgcrypto_setup.sql: extensie și funcții create cu succes.';
    RAISE NOTICE 'URMĂTOR: configurează app.cnp_encryption_key în Supabase Vault';
    RAISE NOTICE 'URMĂTOR: rulează ALTER DATABASE postgres SET app.cnp_encryption_key = ''<cheie>'';';
    RAISE NOTICE 'URMĂTOR: rulează encrypt_existing_cnp.sql (IREVERSIBIL!)';
END $$;
```

- [ ] **Step 2: Rulează în Supabase SQL Editor**

Rulează `sql/migrations/pgcrypto_setup.sql`.
Așteptat: `CREATE EXTENSION`, `CREATE FUNCTION` ×2 — fără erori.

- [ ] **Step 3: Configurare cheie de encriptare (MANUAL — Dashboard)**

1. Supabase Dashboard → Database → Vault → New Secret
2. Nume: `cnp_encryption_key`, Valoare: generează cu `openssl rand -base64 32`
3. Salvează secretul
4. În SQL Editor, rulează:
```sql
-- Înlocuiește 'CHEIA_DIN_VAULT' cu valoarea reală din Vault
ALTER DATABASE postgres SET app.cnp_encryption_key = 'CHEIA_DIN_VAULT';
```

- [ ] **Step 4: Test funcții**

```sql
-- Test encrypt/decrypt round-trip
SELECT public.decrypt_cnp(public.encrypt_cnp('1234567890123')) = '1234567890123' AS test_ok;
-- Așteptat: test_ok = true
```

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/pgcrypto_setup.sql
git commit -m "security: add pgcrypto extension and encrypt_cnp/decrypt_cnp functions"
```

---

### Task 8: Encriptare CNP-uri existente (ONE-TIME — RISC RIDICAT)

**Files:**
- Create: `sql/migrations/encrypt_existing_cnp.sql`

> **AVERTISMENT:** Această migrație modifică date de producție IREVERSIBIL. Rulează NUMAI după:
> 1. Backup confirmat al bazei de date
> 2. Testare completă în staging cu date reale
> 3. Confirmare că `app.cnp_encryption_key` e setat și funcțiile encrypt/decrypt funcționează corect
> 4. Verificare că aplicația a fost actualizată să apeleze `decrypt_cnp()` la citire (dacă e necesar)

- [ ] **Step 1: Backup baza de date**

În Supabase Dashboard → Settings → Database → Download backup.
Confirmă că backup-ul s-a descărcat complet.

- [ ] **Step 2: Verificare pre-flight**

```sql
-- Câte CNP-uri sunt în format clar (13 cifre)?
SELECT COUNT(*) AS cnp_plain
FROM public.sportivi
WHERE cnp IS NOT NULL AND cnp ~ '^\d{13}$';

-- Câte sunt deja encriptate (base64)?
SELECT COUNT(*) AS cnp_encrypted
FROM public.sportivi
WHERE cnp IS NOT NULL AND cnp !~ '^\d{13}$';
```
Notează numerele.

- [ ] **Step 3: Creează migration file**

```sql
-- sql/migrations/encrypt_existing_cnp.sql
-- Date: 2026-06-06
-- Purpose: ONE-TIME — encriptează toate CNP-urile neencriptate din public.sportivi.
-- IREVERSIBIL fără backup!

DO $$
DECLARE
    cnt_before INTEGER;
    cnt_after INTEGER;
BEGIN
    -- Numără CNP-uri în format clar înainte
    SELECT COUNT(*) INTO cnt_before
    FROM public.sportivi
    WHERE cnp IS NOT NULL AND cnp ~ '^\d{13}$';

    RAISE NOTICE 'CNP-uri de encriptat: %', cnt_before;

    -- Encriptează
    UPDATE public.sportivi
    SET cnp = public.encrypt_cnp(cnp)
    WHERE cnp IS NOT NULL AND cnp ~ '^\d{13}$';

    -- Numără CNP-uri în format clar după (trebuie să fie 0)
    SELECT COUNT(*) INTO cnt_after
    FROM public.sportivi
    WHERE cnp IS NOT NULL AND cnp ~ '^\d{13}$';

    RAISE NOTICE 'CNP-uri rămase neencriptate: %', cnt_after;

    IF cnt_after > 0 THEN
        RAISE EXCEPTION 'Encriptare incompletă! % CNP-uri rămase neencriptate.', cnt_after;
    END IF;

    RAISE NOTICE 'encrypt_existing_cnp.sql: % CNP-uri encriptate cu succes.', cnt_before;
END;
$$;
```

- [ ] **Step 4: Rulează în Supabase SQL Editor (STAGING FIRST)**

Rulează mai întâi pe staging. Verifică output:
```
CNP-uri de encriptat: <N>
CNP-uri rămase neencriptate: 0
encrypt_existing_cnp.sql: <N> CNP-uri encriptate cu succes.
```

- [ ] **Step 5: Verificare post-run pe staging**

```sql
-- Verifică că CNP-urile sunt encriptate (nu mai sunt 13 cifre)
SELECT id, cnp FROM public.sportivi WHERE cnp IS NOT NULL LIMIT 5;
-- Așteptat: CNP apare ca text base64

-- Verifică că decriptarea funcționează
SELECT id, public.decrypt_cnp(cnp) AS cnp_plain
FROM public.sportivi
WHERE cnp IS NOT NULL
LIMIT 5;
-- Așteptat: CNP-urile reale (13 cifre)
```

- [ ] **Step 6: Rulează pe producție (după validare staging)**

Rulează `sql/migrations/encrypt_existing_cnp.sql` pe baza de producție.
Verifică output identic cu cel de pe staging.

- [ ] **Step 7: Commit**

```bash
git add sql/migrations/encrypt_existing_cnp.sql
git commit -m "security: add one-time CNP encryption migration script"
```

---

### Task 9: View sportivi_instructor cu CNP mascat

**Files:**
- Create: `sql/migrations/sportivi_instructor_view.sql`

Depinde de: Task 7 (decrypt_cnp trebuie să existe).

- [ ] **Step 1: Creează migration file**

```sql
-- sql/migrations/sportivi_instructor_view.sql
-- Date: 2026-06-06
-- Purpose: View pentru instructori cu CNP mascat (ultimele 4 caractere vizibile).
-- Utilizare: instructorii pot folosi acest view în loc de tabelul direct.

CREATE OR REPLACE VIEW public.sportivi_instructor AS
SELECT
    id,
    nume,
    prenume,
    -- CNP mascat: afișează doar ultimele 4 caractere
    CASE
        WHEN cnp IS NULL THEN NULL
        WHEN cnp ~ '^\d{13}$' THEN
            -- CNP neencriptat (fallback pentru date nemigrare)
            '**********' || right(cnp, 4)
        ELSE
            -- CNP encriptat: decriptează și maschează
            COALESCE('**********' || right(public.decrypt_cnp(cnp), 4), '****')
    END AS cnp,
    data_nasterii,
    club_id,
    grad_actual_id,
    activ,
    user_id,
    trebuie_schimbata_parola
FROM public.sportivi;

-- View-ul respectă RLS din tabela sportivi (security_invoker)
ALTER VIEW public.sportivi_instructor SET (security_invoker = true);

DO $$
BEGIN
    RAISE NOTICE 'View sportivi_instructor creat. Instructorii văd CNP mascat.';
END $$;
```

- [ ] **Step 2: Rulează în Supabase SQL Editor**

Rulează fișierul. Așteptat: `CREATE VIEW`, `ALTER VIEW` — fără erori.

- [ ] **Step 3: Test view**

```sql
SELECT id, cnp FROM public.sportivi_instructor LIMIT 5;
-- Așteptat: CNP apare ca '**********XXXX' unde XXXX sunt ultimele 4 caractere
```

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/sportivi_instructor_view.sql
git commit -m "security: add sportivi_instructor view with masked CNP"
```

---

### Task 10: Rate limiting pentru API handlers

**Files:**
- Create: `api/_rateLimit.ts`

Nota: Acest proiect este Vite SPA pe Vercel (nu Next.js), deci middleware.ts cu NextResponse nu funcționează. Rate limiting se implementează ca utility în API handlers.

- [ ] **Step 1: Creează api/_rateLimit.ts**

```typescript
// api/_rateLimit.ts
// Rate limiting in-memory pentru API handlers Vercel.
// Limitare: in-memory = se resetează la fiecare cold start (serverless).
// Pentru producție cu trafic mare: înlocuiește Map cu Upstash Redis.

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Curăță intrările expirate la fiecare 5 minute
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
    windowMs?: number;   // default: 60_000 (1 minut)
    maxRequests?: number; // default: 60
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

export function checkRateLimit(
    identifier: string,
    options: RateLimitOptions = {}
): RateLimitResult {
    const { windowMs = 60_000, maxRequests = 60 } = options;
    const now = Date.now();

    const entry = store.get(identifier);

    if (!entry || now > entry.resetAt) {
        store.set(identifier, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    entry.count++;
    const allowed = entry.count <= maxRequests;
    return { allowed, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt };
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (Array.isArray(forwarded)) return forwarded[0];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return 'unknown';
}
```

- [ ] **Step 2: Adaugă rate limiting în api/rag-search.ts**

Deschide `api/rag-search.ts`. La începutul funcției `handler`, după validarea metodei, adaugă:

```typescript
import { checkRateLimit, getClientIp } from './_rateLimit';

// În interiorul handler, după verificarea metodei:
const ip = getClientIp(req);
const rl = checkRateLimit(`rag-search:${ip}`, { maxRequests: 30, windowMs: 60_000 });
if (!rl.allowed) {
    return res.status(429).json({ error: 'Prea multe cereri. Încearcă din nou în câteva minute.' });
}
```

- [ ] **Step 3: Adaugă rate limiting în api/claude-proxy.ts**

```typescript
import { checkRateLimit, getClientIp } from './_rateLimit';

// În handler, după verificarea metodei:
const ip = getClientIp(req);
const rl = checkRateLimit(`claude-proxy:${ip}`, { maxRequests: 20, windowMs: 60_000 });
if (!rl.allowed) {
    return res.status(429).json({ error: 'Prea multe cereri. Încearcă din nou în câteva minute.' });
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Așteptat: 0 erori.

- [ ] **Step 5: Commit**

```bash
git add api/_rateLimit.ts api/rag-search.ts api/claude-proxy.ts
git commit -m "security: add in-memory rate limiting utility for API handlers"
```

---

## FAZA 3 — Documentație și Procese

### Task 11: Documentație key rotation + checklist lunar

**Files:**
- Create: `docs/security/key-rotation-log.md`
- Create: `docs/security/checklist-lunar.md`

- [ ] **Step 1: Creează docs/security/key-rotation-log.md**

```markdown
# Key Rotation Log — Portal PhiHau

## Proces rotire service_role key (la 90 de zile)

1. Supabase Dashboard → Settings → API → Regenerate `service_role`
2. Actualizează `SUPABASE_SERVICE_ROLE_KEY` în Vercel → Environment Variables
3. Redeploy: `vercel --prod` sau push pe main
4. Verifică că aplicația funcționează (test login + operații admin)
5. Notează data mai jos

## Proces rotire JWT secret (la 180 de zile sau după incident)

**Atenție:** Toate sesiunile active sunt invalidate. Userii trebuie să se relogheze.

1. Supabase Dashboard → Authentication → JWT Settings → Rotate JWT Secret
2. Notează data mai jos

## Log rotiri

| Data | Tip cheie | Efectuat de | Note |
|------|-----------|-------------|------|
| 2026-06-06 | service_role (prima configurare) | alin2u83 | Setup inițial securitate |
```

- [ ] **Step 2: Creează docs/security/checklist-lunar.md**

```markdown
# Checklist Securitate Lunar — Portal PhiHau

Execută prima zi a fiecărei luni. Durată estimată: 5-10 minute.

## Template checklist

```
## Checklist Securitate — [LUNA ANUL]

### RLS & Acces
- [ ] Supabase Dashboard → Security Advisor → zero ERRORS, zero WARNINGS noi
- [ ] Verifică că FORCE RLS e activ pe tabelele noi create în ultima lună:
      SELECT tablename, forcerowsecurity FROM pg_tables WHERE schemaname = 'public' AND forcerowsecurity = false;
      Rezultat așteptat: 0 rânduri.

### Audit
- [ ] Verifică audit_log pentru operații suspecte în ultima lună:
      SELECT user_id, tabel, operatie, COUNT(*) as ops
      FROM public.audit_log
      WHERE created_at > now() - interval '30 days'
      GROUP BY user_id, tabel, operatie
      ORDER BY ops DESC LIMIT 20;
- [ ] Există useri cu >500 operații UPDATE/DELETE? Investighează.

### Utilizatori
- [ ] Verifică useri inactivi >90 de zile (nu s-au logat):
      SELECT id, email, last_sign_in_at FROM auth.users
      WHERE last_sign_in_at < now() - interval '90 days' OR last_sign_in_at IS NULL;
- [ ] Dezactivează conturile inactive.
- [ ] Verifică că toți adminii au MFA activ:
      SELECT u.email, f.status
      FROM auth.users u
      LEFT JOIN auth.mfa_factors f ON f.user_id = u.id AND f.factor_type = 'totp'
      WHERE u.id IN (
          SELECT DISTINCT user_id FROM public.utilizator_roluri_multicont
          WHERE rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
      );
      Așteptat: toți cu status = 'verified'.

### Chei & Secrete
- [ ] Data ultimei rotiri service_role key < 90 de zile? (vezi key-rotation-log.md)
- [ ] Niciun secret în cod:
      git grep -i "service_role\|anon_key\|cnp_encryption" -- src/ components/ hooks/ api/
      Așteptat: 0 rezultate cu valori reale (doar referințe la process.env).

### Backup
- [ ] Confirmă că backup-ul automat Supabase rulează (Settings → Database → Backups).
```

## Istoric checklisturi efectuate

| Luna | Efectuat de | Issues găsite |
|------|-------------|---------------|
| Iunie 2026 | - | Setup inițial |
```

- [ ] **Step 3: Commit**

```bash
git add docs/security/key-rotation-log.md docs/security/checklist-lunar.md
git commit -m "docs: add security key rotation log and monthly checklist"
```

---

## Verificare finală

- [ ] **Rulează TypeScript check**

```bash
npx tsc --noEmit
```
Așteptat: 0 erori.

- [ ] **Verificare SQL complet**

```sql
-- Verifică FORCE RLS pe toate tabelele
SELECT COUNT(*) as total,
       SUM(CASE WHEN forcerowsecurity THEN 1 ELSE 0 END) as force_rls_count
FROM pg_tables
WHERE schemaname = 'public';
-- Așteptat: total = force_rls_count

-- Verifică că audit_log există și are politici
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'audit_log';
-- Așteptat: 2 politici (insert + select)

-- Verifică că funcțiile pgcrypto există
SELECT proname FROM pg_proc WHERE proname IN ('encrypt_cnp', 'decrypt_cnp');
-- Așteptat: 2 rânduri

-- Verifică triggers pe tabele sensibile
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_%';
-- Așteptat: 4 triggers (sportivi, plati, facturi, roluri)
```

- [ ] **Verificare aplicație**

Deschide aplicația. Testează: login, navigare la Sportivi, creare plată, logout.
Așteptat: toate funcționează normal.

- [ ] **Creare PR**

```bash
git push origin feat/db-security-hardening
gh pr create --title "security: DB hardening — FORCE RLS, audit log, CNP encryption, MFA guard" \
  --body "Implementare spec docs/superpowers/specs/2026-06-06-db-security-design.md

## Faza 1 (critice)
- FORCE RLS pe toate tabelele
- Event trigger auto-RLS pentru tabele noi  
- Fix policy SELECT pe deconturi_federatie
- useMFAGuard hook + SetupMFAPage pentru admini

## Faza 2 (importante)
- Tabel audit_log cu RLS (read-only pentru super admini)
- Triggers audit pe sportivi, plati, facturi, utilizator_roluri
- pgcrypto + funcții encrypt_cnp/decrypt_cnp
- Script one-time pentru encriptare CNP-uri existente
- View sportivi_instructor cu CNP mascat
- Rate limiting utility pentru API handlers

## Faza 3 (procese)
- docs/security/key-rotation-log.md
- docs/security/checklist-lunar.md

## Pași manuali necesari (nu pot fi automatizați)
- Activare TOTP MFA în Supabase Dashboard → Authentication → MFA
- Configurare Vault secret cnp_encryption_key
- ALTER DATABASE postgres SET app.cnp_encryption_key
- Rulare encrypt_existing_cnp.sql (NUMAI după backup + validare staging)"
```

---

## Acțiuni manuale Supabase Dashboard (nu pot fi automatizate)

| # | Acțiune | Unde | Prioritate |
|---|---------|------|-----------|
| M1 | Activează TOTP MFA | Authentication → Multi-Factor Authentication → Enable TOTP | CRITIC |
| M2 | Configurează rate limits Auth | Authentication → Rate Limits → Email/OTP: max 5/oră | RIDICAT |
| M3 | Adaugă secret `cnp_encryption_key` în Vault | Database → Vault → New Secret | RIDICAT |
| M4 | `ALTER DATABASE postgres SET app.cnp_encryption_key = '...'` | SQL Editor | RIDICAT |
| M5 | Verifică Security Advisor | Database → Security Advisor | MEDIU |
