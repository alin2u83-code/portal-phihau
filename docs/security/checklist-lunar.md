# Checklist Securitate Lunar — Portal PhiHau

Execută prima zi a fiecărei luni. Durată estimată: 5-10 minute.

---

## Template checklist (copiază pentru fiecare lună)

```
## Checklist Securitate — [LUNA ANUL]

### RLS & Acces
- [ ] Supabase Dashboard → Security Advisor → zero ERRORS, zero WARNINGS noi
- [ ] Verifică FORCE RLS pe tabele noi (rulează în SQL Editor):
      SELECT tablename, forcerowsecurity FROM pg_tables
      WHERE schemaname = 'public' AND forcerowsecurity = false;
      Așteptat: 0 rânduri.

### Audit
- [ ] Verifică audit_log pentru operații suspecte în ultima lună:
      SELECT user_id, tabel, operatie, COUNT(*) as ops
      FROM public.audit_log
      WHERE created_at > now() - interval '30 days'
      GROUP BY user_id, tabel, operatie
      ORDER BY ops DESC LIMIT 20;
- [ ] Există useri cu >500 operații UPDATE/DELETE? Investighează.

### Utilizatori
- [ ] Verifică useri inactivi >90 zile:
      SELECT id, email, last_sign_in_at FROM auth.users
      WHERE last_sign_in_at < now() - interval '90 days'
         OR last_sign_in_at IS NULL
      ORDER BY last_sign_in_at ASC NULLS FIRST;
- [ ] Dezactivează conturile inactive (Supabase Dashboard → Authentication → Users).
- [ ] Verifică că toți adminii au MFA activ:
      SELECT u.email, f.status as mfa_status
      FROM auth.users u
      LEFT JOIN auth.mfa_factors f ON f.user_id = u.id AND f.factor_type = 'totp'
      WHERE u.id IN (
          SELECT DISTINCT user_id FROM public.utilizator_roluri_multicont
          WHERE rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
      )
      ORDER BY f.status NULLS FIRST;
      Așteptat: toți cu status = 'verified'.

### Chei & Secrete
- [ ] Data ultimei rotiri service_role key < 90 de zile? (vezi key-rotation-log.md)
- [ ] Niciun secret în cod:
      Rulează în terminal: git grep -i "service_role\|anon_key" -- src/ components/ hooks/ api/
      Așteptat: 0 rezultate cu valori reale (doar referințe la process.env / import.meta.env).

### Backup
- [ ] Confirmă că backup-ul automat Supabase rulează:
      Dashboard → Settings → Database → Backups → verifică că e activ și există backup recent.

### Note luna [LUNA ANUL]:
_adaugă observații_
```

---

## Istoric checklisturi efectuate

| Luna | Efectuat de | Issues găsite | Acțiuni luate |
|------|-------------|---------------|---------------|
| Iunie 2026 | — | Setup inițial securitate v1 | Implementare force_rls, audit_log, MFA guard, rate limiting |
