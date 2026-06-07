# Key Rotation Log — Portal PhiHau

## Proces rotire service_role key (la 90 de zile)

1. Supabase Dashboard → Settings → API → Regenerate `service_role`
2. Actualizează `SUPABASE_SERVICE_ROLE_KEY` în Vercel → Environment Variables
3. Redeploy: push pe main (trigger CI/CD Vercel)
4. Verifică că aplicația funcționează (test login + operații admin)
5. Notează data mai jos

## Proces rotire JWT secret (la 180 de zile sau după incident)

**Atenție:** Toate sesiunile active sunt invalidate. Userii trebuie să se relogheze.

1. Supabase Dashboard → Authentication → JWT Settings → Rotate JWT Secret
2. Notează data mai jos

## Proces rotire cnp_encryption_key (NUMAI după incident — ireversibil fără migrare date)

**Atenție:** Dacă schimbi cheia, toate CNP-urile encriptate trebuie re-encriptate cu noua cheie ÎNAINTE de a schimba cheia în configurare. Fără această migrare, datele sunt irecuperabile.

1. Generează cheie nouă: `openssl rand -base64 32`
2. Rulează script de re-encriptare (consultă echipa înainte)
3. Actualizează `app.cnp_encryption_key` în Supabase Vault
4. Actualizează `ALTER DATABASE postgres SET app.cnp_encryption_key = '...'`
5. Testează că `decrypt_cnp` funcționează pe câteva rânduri
6. Notează data mai jos

## Log rotiri

| Data | Tip cheie | Efectuat de | Note |
|------|-----------|-------------|------|
| 2026-06-06 | service_role (configurare inițială) | alin2u83 | Setup securitate v1 |
| _(+90 zile: 2026-09-04)_ | service_role | — | — |
| _(+180 zile: 2026-12-03)_ | JWT secret | — | — |
