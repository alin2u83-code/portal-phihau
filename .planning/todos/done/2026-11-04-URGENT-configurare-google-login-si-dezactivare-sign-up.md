---
created: 2026-11-04T12:40:00.000Z
updated: 2026-11-04T12:40:00.000Z
title: URGENT - configureaza Google login (Google Cloud + Supabase) si dezactiveaza sign-up
area: auth
priority: urgent
files:
  - components/LoginPage.tsx
  - hooks/useDataProvider.ts
  - services/emailMfaService.ts
---

## De ce e urgent

Butonul "Continua cu Google" e deja pe productie (commit-uri b398762..218c753, deploy portal-phihau.vercel.app), dar providerul Google NU e configurat: butonul da eroare "Autentificarea cu Google nu este disponibila momentan". In plus, cat timp sign-up-ul e permis in Supabase, un cont Google necunoscut se creeaza in `auth.users` si abia apoi aplicatia il delogheaza (verificare client-side in `useDataProvider.ts`, doar daca nu are rand in `utilizator_roluri_multicont`). Protectia reala e sign-up dezactivat.

## De facut (dupa preferinta: Google ramane optiune alaturi de parola + cod email)

1. **Dezactiveaza sign-up** (acum, independent de Google): Supabase dashboard -> proiect phi-hau-db -> Authentication -> Sign In / Providers (sau Settings) -> dezactiveaza "Allow new users to sign up". Verifica ca `creare-cont` / invitatiile din portal merg in continuare (folosesc service role, nu ar trebui afectate; testeaza o creare de cont).
2. **Google Cloud Console**: creeaza proiect/OAuth consent screen (External, nume "Portal PhiHau", email suport), apoi Credentials -> OAuth client ID -> Web application.
   - Authorized redirect URI: `https://wuhidifzsutwgdfkwhmd.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins: `https://portal-phihau.vercel.app`
3. **Supabase** -> Authentication -> Providers -> Google: activeaza, lipeste Client ID + Client Secret. Authentication -> URL Configuration: Site URL `https://portal-phihau.vercel.app`, adauga la Redirect URLs `https://portal-phihau.vercel.app/**` (si `http://localhost:5173/**` doar daca vrei test local).
4. **Test pe deploy**:
   - cont existent cu acelasi email Gmail -> trebuie sa intre in contul existent (Supabase leaga identitatea dupa email verificat), fara cod pentru sportiv/instructor; adminul primeste in continuare cod MFA email.
   - cont Google fara cont in portal -> mesaj "Acest cont Google nu are cont in portal" + delogare, fara rand nou ramas util in `auth.users` (cu sign-up dezactivat nici nu se creeaza).
   - bifa "Dispozitiv personal" debifata + Google -> sesiune pana la inchiderea browserului.
   - emailul "autentificare de pe un dispozitiv nou" se trimite si dupa login Google (detectat prin `last_sign_in_at` < 2 min).
5. Daca ceva nu merge: eroarea apare in `LoginPage.tsx` (`googleEroare`); verifica Supabase Auth logs.

## Stare restul functionalitatii (nu mai e de facut)

Dispozitiv de incredere 30 zile glisante, bifa personala, lista dispozitive, alerta email dispozitiv nou: livrate si testate pe deploy 4.11.2026. Vezi memorie project_login_persistent_20261104.

## Netestat

Bifa debifata (sesiune pana la inchiderea browserului), delogare la inactivitate dupa 1h pe dispozitiv de incredere, mobil, Google.

## REZOLVAT 4.11.2026
Sign-up dezactivat (disable_signup=true), client OAuth Web "Portal PhiHau" creat in Google Cloud (proiect natural-choir-494419-e8), provider Google activat in Supabase, Site URL + Redirect URLs setate. Testat de user pe portal-phihau.vercel.app: functioneaza. Netestat explicit: cont Google fara cont in portal, bifa debifata, email dispozitiv nou dupa Google, mobil.
