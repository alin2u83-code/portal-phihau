---
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
plan: 06
subsystem: auth
tags: [supabase-dashboard, smtp, otp, gates, checklist]

requires:
  - phase: 43-01
    provides: runbook Supabase fara inactivity timeout
  - phase: 43-05
    provides: Playwright pe build de productie
provides:
  - setari Auth din Dashboard confirmate/corectate (sabloane cu cod, OTP 8, sesiuni, rate limit, SMTP custom)
  - porti automate ale fazei verzi pe codul final
  - checklist uman end-of-phase (8 puncte)
affects: [44-10]

key-decisions:
  - "SMTP custom pe core7.spatiul.ro:465 (nu mail.phihau.ro): mail.phihau.ro e proxiat Cloudflare, SMTP nu trece (504 context deadline exceeded)."
  - "Sabloanele Change email address si Invite user trecute pe cod {{ .Token }}, ca sa nu existe niciun email Auth cu link de actiune."

requirements-completed: [DEC-MGMT, DEC-COD, DEC-EXT, Q1, Q2, Q3]

completed: 2026-11-18
---

# Faza 43 Plan 06: Setari Dashboard, porti finale, checklist uman

## Setari Dashboard

Proiect `phi-hau-db` (`wuhidifzsutwgdfkwhmd`), verificate in Chrome 18.11.2026.

dashboard: recovery_token=da; magic_token=da; otp_len=8; otp_exp=3600; inactivitate=indisponibil (plan Free, implicit "never"); timebox=indisponibil (plan Free, implicit "never"); rate_email=30/ora; smtp=custom; test_email=cod_fara_link

| Setare | Valoare |
|---|---|
| Sablon Magic link / OTP, Confirm sign up, Reset password, Reauthentication | `{{ .Token }}`, fara `{{ .ConfirmationURL }}` |
| Sablon Change email address, Invite user | corectate azi de la implicit (link) la `{{ .Token }}`; netestate cu email real |
| Email OTP length | 8 |
| Email OTP expiration | 3600 s |
| Sessions: time-box, inactivity timeout | "never"; campurile sunt blocate pe planul Free |
| Rate limit sending emails | 30/ora (dupa activarea SMTP custom; inainte 2/ora) |
| Minimum password length / cerinte | 12, litere mari+mici+cifre |
| SMTP custom | activ: sender `noreply@phihau.ro` ("App FRQKD"), host `core7.spatiul.ro`, port 465, user `noreply@phihau.ro` |

Test email real (18.11.2026): cerere de cod pentru contul admin prin Dashboard (Send magic link). Email primit in Gmail de la `noreply@phihau.ro`, subiect "Codul tau de verificare Qwan Ki Do", cod de 8 cifre, fara link. Prima incercare, cu host `mail.phihau.ro`, a dat `504 context deadline exceeded` (3 incercari 12:16 UTC); dupa schimbarea hostului in `core7.spatiul.ro`, trimitere reusita la 12:21 UTC.

SMTP este custom, deci nota "LANSARE BLOCATA pe 32-08" nu se aplica. Planul 32-08 (checkpoint SMTP) este practic rezolvat pe partea de Supabase; vezi "Riscuri reziduale" pentru ce ramane.

## Porti finale

| Poarta | Rezultat |
|---|---|
| `npm run lint` (tsc --noEmit) | exit 0 |
| `node --import tsx utils/accesExtern.test.ts` | PASS, exit 0 |
| `node --import tsx utils/parola.test.ts` | 15 PASS, 0 FAIL |
| `npx tsx tests/auth_extern_parola_faza43.ts` (live) | 10/10 PASS, reziduuri 0 |
| `npx playwright test tests/ui_acces_extern_faza43.spec.ts` (build productie) | 4 passed, cleanup useri stersi=2, erori=0 |
| grep absenta `useExpirareInactivitate`, `utils/inactivitate`, `LoginOtp`, `trimiteCodAcces`, `verificaCodAcces`, `clasificaEroareOtp` | nicio aparitie |
| `hooks/useMFAGuard.ts`, `supabaseClient.ts` neatinse (`git diff HEAD`, `git log 95bea0ec..HEAD`) | diff gol, 0 commit-uri |

Testele live si Playwright creeaza conturi efemere `zztest_*@example.test` si le sterg la final.

## A2 conturi de club

Interogare doar citire (numaratori, fara emailuri):

```sql
select count(*) as total_conturi,
       count(*) filter (where coalesce(u.encrypted_password,'') = '') as fara_parola,
       count(*) filter (where coalesce(u.encrypted_password,'') <> '') as cu_parola
from public.conturi_competitie_club c
join auth.users u on u.id = c.user_id;
```

Rezultat: total 1, fara parola 0, cu parola 1. Singurul cont de club existent intra direct cu parola; "Prima autentificare" nu e folosita inca de niciun cont real.

## Riscuri reziduale

- T-43-01: sesiune lasata deschisa (fara delogare la inactivitate, decizie Q1).
- T-43-11: parola partajata fara blocare per cont.
- T-43-12: OTP ramane activ in backend.
- T-43-17: poarta MFA este client-side.
- T-43-19: INSTRUCTOR trimis in portal.
- Sabloanele Change email si Invite user nu au fost trimise real; Invite cu cod necesita un ecran de introducere cod in aplicatie (nefolosit azi).
- Parola SMTP din Supabase nu poate fi citita inapoi; la rotirea ei se actualizeaza si in Vercel (`SMTP_PASS`), unde variabilele `SMTP_*` sunt "Secret" si nu pot fi vazute dupa creare.
- Hostul SMTP real este `core7.spatiul.ro`; `mail.phihau.ro` ramane inutilizabil pentru SMTP cat timp inregistrarea DNS e proxiata Cloudflare.

## Checklist verificare umana end-of-phase

Dupa deploy; Chrome cu tab vizibil (`document.hidden === false`); ideal pe productie sau `vite build + preview`, nu doar dev.

1. [ ] Dispozitiv nou cere cod (DEC-MGMT, 3c Faza 38): profil Chrome nou / incognito, fara cheia `phi-hau-mfa-dispozitiv`; login ADMIN_CLUB cu parola -> ecran de cod pe email -> codul soseste -> intra cu bifa "Dispozitiv personal" bifata.
2. [ ] Dispozitiv de incredere nu cere cod: acelasi browser, logout + login -> intra direct.
3. [ ] Fara delogare la inactivitate (Q1): ADMIN_CLUB pe dispozitiv fara token de incredere, in consola `localStorage.setItem('phi-hau-ultima-activitate', String(Date.now() - 61*60*1000))`, asteapta 2 minute -> ramai logat, niciun toast de delogare.
4. [ ] Sesiune temporara (Q1): login cu bifa debifata, inchide complet browserul si redeschide -> sesiunea a disparut.
5. [ ] Extern prima autentificare (DEC-EXT, DEC-COD): pe /competitie, cu emailul unui cont de club real fara parola -> "Prima autentificare sau ai uitat parola?" -> email cu doar cod de 8 cifre, fara link -> cod + parola noua -> intra; logout + login cu parola -> intra fara cod. (SMTP custom e activ, se poate testa acum.)
6. [ ] Extern parola gresita -> mesaj generic; "Ai uitat parola" pe email inexistent -> acelasi ecran neutru.
7. [ ] Q2: cont cu ADMIN_CLUB intr-un browser fara MFA valid -> in /competitie contextul ADMIN_CLUB nu apare (doar REPREZENTANT sau ecranul "Mergi la portal"); "Mergi la portal" -> portalul cere codul; dupa cod cu bifa, revenire in /competitie -> contextul ADMIN_CLUB apare.
8. [ ] Mobil (telefon real): formularul LoginParola si pasul de cod sunt utilizabile (butonul "Lipeste codul", tastatura numerica la cod).

Netestat in sesiunea aceasta: punctele 1-8 de mai sus (toate cer om/browser separat), mobil, calea de esec a RPC-ului de revocare.
