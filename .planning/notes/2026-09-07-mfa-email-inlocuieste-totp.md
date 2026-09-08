---
date: "2026-09-07 09:09"
promoted: false
---

Task implementat si pushuit (commit ac6a08c, main): inlocuire MFA TOTP cu cod de verificare pe email, pentru ADMIN_CLUB/SUPER_ADMIN_FEDERATIE.

Motiv: contul de test nu avea aplicatie de autentificare (Google Authenticator etc) instalata, iar userul a cerut o varianta fara instalare de programe noi.

Ce s-a schimbat:
- hooks/useMFAGuard.ts — verifica randul din tabelul mfa_email_verificari (user_id, verificat_pana) in loc de supabase.auth.mfa.getAuthenticatorAssuranceLevel() (AAL2). Supabase Auth nu suporta email ca factor MFA nativ, de-aia flux custom.
- services/emailMfaService.ts (nou) — trimiteCodMfaEmail (supabase.auth.signInWithOtp), verificaCodMfaEmail (supabase.auth.verifyOtp + upsert validitate 12h), esteMfaEmailValid.
- components/SetupMFAPage.tsx — rescris fara pasii QR/TOTP; trimite cod automat la incarcare, input de 8 cifre (Supabase genereaza cod pe 8 cifre pentru email OTP, nu 6), buton retrimite (throttle 30s).
- sql/migrations/mfa_email_verificari_260907.sql (nou, aplicat live pe proiectul Supabase wuhidifzsutwgdfkwhmd) — tabel + RLS (select/insert/update doar user_id = auth.uid()).
- Config manuala in Supabase Dashboard (Authentication > Email Templates > Magic Link or OTP): body schimbat sa foloseasca {{ .Token }} in loc de doar {{ .ConfirmationURL }} — fara asta Supabase trimite doar link, niciodata cod. Nu exista tool API/MCP pentru asta, s-a facut manual prin Chrome.

Limitari cunoscute, netratate inca:
- Foloseste serviciul de email built-in Supabase (rate limits, nepotrivit volum productie) — pentru scara reala trebuie SMTP custom (Resend/SendGrid) din Auth > SMTP Settings.
- Nu-i "MFA" in sensul strict AAL2 Supabase — e un flag propriu (mfa_email_verificari), verificabil/actualizabil doar de userul insusi prin RLS, nu printr-un al doilea factor criptografic separat de parola.
- Factorul TOTP vechi ramas neinrolat/nesters pe conturile care il aveau (nefolosit acum, dar nu curatat).
