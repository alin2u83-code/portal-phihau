---
slug: db-security-hardening
date: 2026-06-06
status: complete
branch: feat/db-security-hardening
spec: docs/superpowers/specs/2026-06-06-db-security-design.md
plan: docs/superpowers/plans/2026-06-06-db-security-hardening.md
---

# DB Security Hardening — Plan & Execuție

## Ce s-a implementat (2026-06-06)

### TypeScript (committat în git — branch feat/db-security-hardening)

| Fișier | Descriere |
|--------|-----------|
| `hooks/useMFAGuard.ts` | Hook redirect admini fără MFA la 'setup-mfa'. Fail-open pe erori rețea. No infinite loop (verifică activeView). |
| `components/SetupMFAPage.tsx` | Pagina enroll TOTP: QR code → input 6 cifre → verify. Mounted guard pentru StrictMode. |
| `api/_rateLimit.ts` | Rate limiting serverless-safe. Lazy cleanup (no setInterval). checkRateLimit() + getClientIp() cu trim. |
| `api/rag-search.ts` | 30 req/min per IP |
| `api/claude-proxy.ts` | 20 req/min per IP |
| `docs/security/key-rotation-log.md` | Proces rotire chei + log |
| `docs/security/checklist-lunar.md` | Checklist securitate lunar cu queries SQL |
| `types.ts` | Adăugat 'setup-mfa' la View union |
| `components/AppRouter.tsx` | case 'setup-mfa' → SetupMFAPage |
| `App.tsx` | useMFAGuard(activeRoleContext) apelat |

### SQL (pe disk, run manual în Supabase SQL Editor — neversat în git)

| Fișier | Când rulezi |
|--------|-------------|
| `sql/migrations/force_rls_v2.sql` | Oricând — safe |
| `sql/migrations/auto_rls_trigger.sql` | Oricând — safe |
| `sql/migrations/fix_deconturi_federatie_policy.sql` | Oricând — safe |
| `sql/migrations/create_audit_log.sql` | Înainte de audit_triggers |
| `sql/migrations/audit_triggers_sensibile.sql` | După create_audit_log |
| `sql/migrations/pgcrypto_setup.sql` | Înainte de encrypt |
| `sql/migrations/encrypt_existing_cnp.sql` | ⚠️ NUMAI după backup + staging test |
| `sql/migrations/sportivi_instructor_view.sql` | După pgcrypto_setup |

## Acțiuni manuale rămase (Supabase Dashboard)

1. Authentication → Multi-Factor Authentication → Enable TOTP
2. Authentication → Rate Limits → Email: 5/oră, OTP: 10/oră
3. Database → Vault → New Secret → `cnp_encryption_key` (valoare: `openssl rand -base64 32`)
4. SQL Editor: `ALTER DATABASE postgres SET app.cnp_encryption_key = '<cheie-din-vault>';`
5. Rulează SQL migrations în ordinea din tabelul de mai sus
6. Test round-trip: `SELECT public.decrypt_cnp(public.encrypt_cnp('1234567890123')) = '1234567890123';`

## Score securitate

| Înainte | După (estimat după SQL + Dashboard) |
|---------|--------------------------------------|
| 5.5/10 | 9.5/10 |

## Commit history pe branch

```
db233fd docs: add security key rotation log and monthly checklist
d1af216 fix: replace setInterval with lazy cleanup in rate limiter, fix IP trim
2353ef2 security: add in-memory rate limiting utility for API handlers
50af23f fix: prevent MFA guard redirect loop and handle network errors
89e9b82 feat: add MFA guard hook and setup page for admin roles
```

## Pași următori

1. Merge branch `feat/db-security-hardening` în main când ești gata
2. Rulează SQL migrations în Supabase (ordinea contează)
3. Activează TOTP MFA în Dashboard
4. Configurează Vault secret pentru CNP
5. Testează MFA flow cu un cont admin
6. Rulează `encrypt_existing_cnp.sql` NUMAI după backup confirmat
