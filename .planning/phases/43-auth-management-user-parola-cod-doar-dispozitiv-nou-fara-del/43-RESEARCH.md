# Phase 43: Auth - management user+parola+cod doar dispozitiv nou, fara delogare la inactivitate; acces extern email+parola+reset in loc de OTP - Research

**Researched:** 2026-11-16
**Domain:** Supabase Auth (parola + cod email), dispozitiv de incredere, zona externa de competitie (React SPA + Vercel handlers)
**Confidence:** MEDIUM-HIGH (cod citit direct; setarile din Dashboard Supabase NU au fost verificabile din sesiune)

<user_constraints>
## User Constraints (din 43-DECISIONS.md, 14.11.2026; nu exista CONTEXT.md)

### Locked Decisions
- Management: user+parola+cod email DOAR pe dispozitiv nou (dispozitiv de incredere existent, login persistent 4.11.2026); fara delogare pe inactivitate.
- Acces extern (Faza 36/39, reprezentanti club): email+parola + "Am uitat parola"; INLOCUIESTE OTP; primul login seteaza parola.
- Atentie: regula "emailuri = info/cod, nu link actiune" => reset parola prin cod email. SMTP (32-08) inca blocat.

### Claude's Discretion
- (nespecificat) Design-ul tehnic al fluxului de reset prin cod pentru extern, comportamentul zonei externe pentru conturi cu roluri privilegiate, curatarea codului de inactivitate.

### Deferred Ideas (OUT OF SCOPE)
- (nespecificat)

Cerinte de faza (REQUIREMENTS.md): niciuna (faza fara ID-uri).
</user_constraints>

## Project Constraints (din CLAUDE.md)
- React 18 + TS + Tailwind; **fara librarii externe noi**; UI doar din `components/ui.tsx` (nu Shadcn/MUI).
- Limba: romana pentru domeniu/UI/comentarii, engleza pentru hooks/patternuri; tipuri doar in `types.ts`; servicii `{ data, error }` fara throw.
- Supabase client unic `supabaseClient.ts` (injecteaza `active-role-context-id`); RLS = poarta reala, UI = doar UX.
- Memorie proiect: emailuri = cod/info, NU link de actiune (feedback_email_fara_linkuri_actiune); migrari `supabase/` => `git add -f`; verifica live `pg_policies`; Chrome MCP tab ascuns da teste false; bug de montare poate aparea doar pe `vite build + preview` (nu StrictMode dev).
- Workflow: GSD; dupa cod non-trivial se ruleaza review separat; nu se aplica fix-uri din review fara OK.
- Config GSD: `nyquist_validation: false` (fara sectiune Validation Architecture formala; sectiunea "Abordare de testare" mai jos o inlocuieste), `security_enforcement: true`, `code_review: true`.

## Summary

Cea mai mare parte din ce cere decizia pentru **management exista deja** [VERIFIED: cod]. Login-ul management e deja email/username + parola (`components/LoginPage.tsx` + `hooks/useAuth.ts`), "Am uitat parola" prin **cod pe email** (`resetPasswordForEmail` + `verifyOtp type:'recovery'` + `updateUser`, deja in LoginPage), iar codul MFA pe email pentru ADMIN_CLUB/SUPER_ADMIN_FEDERATIE se cere doar cand dispozitivul nu e de incredere si fereastra de 12h a expirat (`useMFAGuard` + `emailMfaService.stareMfa` + `SetupMFAPage`). Dispozitivul de incredere dureaza 30 zile glisante, max 5, cu bifa "dispozitiv personal" (implicit bifata). **Singurul gap real pe management**: delogarea la 60 min de inactivitate (`hooks/useExpirareInactivitate.ts`, montata in `App.tsx`) inca ruleaza pe dispozitivele fara token de incredere valid (bifa debifata, token expirat/revocat, localStorage curatat). Decizia o elimina => stergere cod + curatare, plus verificarea ca nicio setare Supabase (timebox/inactivity timeout din planul 32-08) nu reintroduce delogarea.

Pe **acces extern** gapul e real: `LoginOtp.tsx` + `accesExternService.trimiteCodAcces/verificaCodAcces` (signInWithOtp/verifyOtp type 'email') trebuie inlocuite cu email+parola. Conturile de club (`conturi_competitie_club`) sunt create de `api/_contCompetitieClub.ts` cu `auth.admin.createUser({ email, email_confirm: true })` **fara parola**, deci nu exista nimic de migrat in date: "primul login seteaza parola" = acelasi flux ca "Am uitat parola" (cod pe email -> cod + parola noua). Recomandare: un singur flux de reset prin cod, extras din LoginPage intr-un serviciu + componenta reutilizabile, folosit si de LoginPage (comportament neschimbat) si de noul `LoginParola` din zona externa.

Riscuri principale: (1) **SMTP 32-08 blocat** => toate codurile (prima setare parola, reset, cod dispozitiv nou) trec prin mailerul implicit Supabase cu limita foarte mica de emailuri/ora; la lansare cu mai multi reprezentanti simultan (ex. 35 cluburi) limita se depaseste; (2) fluxul "dispozitiv nou pe login proaspat" (3c din Faza 38) e **netestat in browser** si e exact calea pe care se bazeaza Faza 43; (3) parola statica pe un cont de club **partajat** e mai slaba decat OTP-ul per sesiune, iar backend-ul Supabase permite in continuare `signInWithOtp` pentru orice user existent: inlocuirea e la nivel de UI/UX, nu elimina canalul OTP.

**Primary recommendation:** (a) sterge complet delogarea la inactivitate (hook + util + test + toast) si fixeaza 32-08 sa nu seteze inactivity timeout/timebox sub 30 zile; (b) extrage resetul prin cod din LoginPage intr-un serviciu comun si construieste `LoginParola` (email+parola, "Prima autentificare / Am uitat parola") care inlocuieste `LoginOtp` in `CompetitieExterna/index.tsx`; (c) nu adauga nicio dependenta; (d) pune SMTP 32-08 ca prerechizit explicit de lansare si testeaza live calea "dispozitiv nou".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Autentificare email+parola | Supabase Auth (GoTrue) | Browser (formular) | `signInWithPassword` e nativ; parola nu atinge handlerii Vercel |
| Cod email pentru reset/prima parola | Supabase Auth (email Recovery) | Browser (introducere cod + parola noua) | Sablon cu `{{ .Token }}`, fara link; verificare `verifyOtp type:'recovery'` |
| Politica parola (min 12 + mare/mica/cifra, HIBP) | Browser (`utils/parola.ts`, `checkLeakedPassword`) | Supabase Dashboard (politica proiect, 32-08) | Regula unica deja existenta; Dashboard e bariera reala |
| Cod MFA doar pe dispozitiv nou | Browser (gate `useMFAGuard`) | DB (`mfa_email_verificari`, `mfa_dispozitive_incredere`, RPC `verifica_dispozitiv_incredere`) | Gate-ul e client-side; RPC-urile doar valideaza tokenul de dispozitiv |
| Fara delogare la inactivitate | Browser (stergere hook) | Supabase Dashboard (sesiuni) | Hook-ul e singurul mecanism client; Dashboard nu trebuie sa-l recreeze |
| Creare cont extern fara parola | API Vercel (`api/_contCompetitieClub.ts`, service role) | DB (`conturi_competitie_club`) | Neschimbat; contul ramane fara parola pana la primul login |
| Izolare extern per club/competitie | DB (RLS `ext_p_*`/`ext_r_*`) | UI zona externa | Neschimbat; parola/OTP nu afecteaza RLS |

## Standard Stack

### Core (tot existent, nicio dependenta noua)
| Library | Versiune | Scop | De ce |
|---------|---------|------|-------|
| @supabase/supabase-js | 2.98.0 [VERIFIED: CLAUDE.md/package.json] | `signInWithPassword`, `resetPasswordForEmail`, `verifyOtp({type:'recovery'})`, `updateUser({password})` | Deja folosite in LoginPage/ResetPasswordPage |
| React 18 + `components/ui.tsx` | 18.3.1 | `Card`, `Input`, `Button` pentru `LoginParola` | Constrangere proiect |
| utils/parola.ts, utils/checkLeakedPassword.ts | intern | validare parola + HIBP | Reutilizare, regula unica (Faza 32 D-07) |
| @playwright/test | ^1.60.0 [VERIFIED: package.json] | UI spec pe build | Infrastructura existenta (`playwright.config.ts`, preview :4173) |

### Alternatives Considered
| In loc de | Alternativa | Tradeoff |
|-----------|-------------|----------|
| Reset prin cod Supabase (`recovery` OTP) | Endpoint propriu Vercel care genereaza cod + trimite email nodemailer | Dubleaza ce face GoTrue, necesita tabel de coduri + rate limit propriu; respins (SMTP Vercel e tot blocat, 535) |
| Parola setata de owner (temporara) | Primul login seteaza parola (decizie) | Temporara ar functiona fara SMTP dar contrazice decizia; ramane doar ca fallback de discutat |

**Installation:** nimic de instalat.

## Package Legitimacy Audit

Nu se instaleaza niciun pachet extern in aceasta faza (constrangere CLAUDE.md "fara librarii noi"). Protocolul slopcheck nu se aplica.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Ce exista deja vs ce lipseste

| Cerinta | Stare | Dovada |
|---------|-------|--------|
| Management: user/email + parola | EXISTA | `components/LoginPage.tsx` (username -> email via `sportivi.username`), `hooks/useAuth.ts` |
| Management: reset parola prin cod | EXISTA | `LoginPage.tsx` `handleForgotPassword`/`handleVerificaCod` (cod 8 cifre + parola noua, apoi `revocaDispozitiveIncredere` + `signOut`) |
| Management: cod email doar pe dispozitiv nou | EXISTA (de validat live) | `useMFAGuard.ts` -> `stareMfa()` (fereastra 12h `mfa_email_verificari` SAU token dispozitiv valid) -> altfel `setup-mfa`; `SetupMFAPage.tsx` trimite cod, bifa "dispozitiv personal" inregistreaza token 30 zile |
| Dispozitiv de incredere 30 zile glisante | EXISTA | `supabase/migrations/20261104a_dispozitive_incredere_30_zile.sql`; `verifica_dispozitiv_incredere` reinnoieste expirarea si fereastra MFA |
| Fara delogare la inactivitate | **LIPSESTE** | `hooks/useExpirareInactivitate.ts` (60 min, ADMIN_CLUB/SUPER_ADMIN, dezactivat doar daca dispozitivul e de incredere), apelat in `App.tsx:44`, toast "Ai fost delogat automat dupa 60 de minute" `App.tsx:46-50` |
| Extern: email+parola | **LIPSESTE** | `components/CompetitieExterna/LoginOtp.tsx` (OTP 8 cifre) + `services/accesExternService.ts` `trimiteCodAcces`/`verificaCodAcces` + `utils/accesExtern.ts` `clasificaEroareOtp` |
| Extern: "Am uitat parola" / prima setare parola | **LIPSESTE** in zona externa; logica exista in LoginPage | vezi mai sus |
| Migrare conturi extern OTP-only | NU E NEVOIE de migrare de date | `api/_contCompetitieClub.ts` `createUser({email, email_confirm:true})` fara parola; fiecare cont seteaza parola la primul login prin cod |

## Architecture Patterns

### Diagrama de flux

```
MANAGEMENT (portal /)                                  EXTERN (/competitie[/id])
 LoginPage: email|username + parola                     LoginParola (nou): email + parola [+ bifa dispozitiv personal]
   |  signInWithPassword                                  |  signInWithPassword  -- eroare generica "Email sau parola incorecte"
   v                                                      |        |
 sesiune -> useAppLogic (roluri) -> useMFAGuard           |        +-> "Prima autentificare / Am uitat parola"
   |  rol privilegiat? (ADMIN_CLUB/SUPER_ADMIN)           |              resetPasswordForEmail(email)  --> email cu COD (8 cifre)
   |   da: stareMfa(userId)                               |              ecran: cod + parola noua (valideazaParola + HIBP)
   |     valid (12h sau token dispozitiv) -> intra        |              verifyOtp(type:'recovery') -> sesiune
   |     invalid -> setup-mfa: cod email (signInWithOtp)  |              updateUser({password}) ; revocaDispozitiveIncredere()
   |        verifyOtp -> upsert 12h -> (bifa) token 30z   |              NU signOut: continua cu finalizeaza(user)
   |   nu: intra                                          v
   v                                                  finalizeaza(user) -> incarcaContexteEligibile -> lista competitii
 FARA timer de inactivitate (hook sters)                  (rol ADMIN_CLUB/INSTRUCTOR in zona -> vezi Open Question 2)
```

### Structura recomandata
```
services/accesExternService.ts   # inlocuieste trimiteCodAcces/verificaCodAcces cu loginParolaAcces()
services/authService.ts          # + trimiteCodResetParola(email), reseteazaParolaCuCod(email,cod,parola) (extrase din LoginPage)
components/CompetitieExterna/LoginParola.tsx   # inlocuieste LoginOtp.tsx (sters)
components/ResetParolaCod.tsx (optional)       # UI partajat LoginPage + extern; daca nu, doar serviciul comun
utils/accesExtern.ts             # clasificaEroareOtp -> clasificaEroareAuth (limita / credentiale / alta)
```

### Pattern 1: serviciu comun reset prin cod (extras din LoginPage)
**What:** doua functii pure-ish `{ error }` fara throw; LoginPage ramane cu `signOut()` dupa succes, extern pastreaza sesiunea.
```typescript
// Sursa: logica existenta in components/LoginPage.tsx (handleForgotPassword/handleVerificaCod), extrasa
export async function trimiteCodResetParola(email: string): Promise<{ error: any }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    inregistreazaEmailAuth('reset_parola', !error);
    return { error };
}
export async function reseteazaParolaCuCod(email: string, cod: string, parolaNoua: string): Promise<{ user: any | null; error: any }> {
    const v = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: cod.trim(), type: 'recovery' });
    if (v.error || !v.data.user) return { user: null, error: v.error ?? new Error('Cod invalid') };
    const u = await supabase.auth.updateUser({ password: parolaNoua });
    if (u.error) return { user: null, error: u.error };
    await revocaDispozitiveIncredere(); // parola schimbata => dispozitivele de incredere nu mai sunt valide
    return { user: v.data.user, error: null };
}
```
Validarea (`valideazaParola` + `checkLeakedPassword`) ramane la apelant, ca acum.

### Pattern 2: login extern cu parola
`supabase.auth.signInWithPassword` -> la succes `seteazaRamaneConectat(bifa)` (ca LoginPage) -> `onAutentificat(user)` (=`finalizeaza`). Mesaj unic la orice esec de credentiale (nu dezvaluie existenta emailului). Mesaj de ajutor fix sub formular: "Prima autentificare sau ai uitat parola? Primesti un cod pe email."

### Anti-patterns
- **Nu** apela `signInWithOtp`/`verifyOtp type:'email'` in zona externa (inlocuit); `emailMfaService` pastreaza OTP doar pentru MFA management.
- **Nu** face `signOut` dupa reset in zona externa (utilizatorul tocmai si-a stabilit parola; intra direct).
- **Nu** apela upsert `mfa_email_verificari` la login extern cu parola (parola nu dovedeste MFA); vezi Open Question 2.
- **Nu** reintroduce un timer de inactivitate "mai blând" sub alt nume; nici `sessions_inactivity_timeout`/`timebox` Supabase sub 30 zile.
- **Nu** atinge sesiunea de actor din zona externa (4h, `autorModificariService`/`EcranActiv`): e logica de atribuire autor, nu delogare auth.

## Don't Hand-Roll

| Problema | Nu construi | Foloseste | De ce |
|----------|-------------|-----------|-------|
| Cod de reset parola | tabel propriu de coduri + endpoint | `resetPasswordForEmail` + `verifyOtp recovery` | GoTrue gestioneaza expirare, o-singura-folosinta, rate limit |
| Validare/hash parola | orice stocare proprie | `signInWithPassword`/`updateUser` | Hash-ul e in GoTrue |
| Politica parola | regex nou | `valideazaParola` + `checkLeakedPassword` | Regula unica Faza 32 (D-07) |
| Dispozitiv de incredere | alt mecanism de "remember me" | `emailMfaService` + RPC `*_dispozitiv_incredere` | Deja live, 30 zile glisante |
| Detectie "primul login" | flag nou in DB | acelasi flux ca reset | Evita migrare + stare suplimentara |

## Runtime State Inventory (migrare OTP -> parola, extern)

| Categorie | Gasit | Actiune |
|-----------|-------|---------|
| Date stocate | Conturile `conturi_competitie_club` + rolul `REPREZENTANT_COMPETITIE` exista, fara parola in `auth.users`. Tabela legacy `acces_competitie_extern` ramane neatinsa (nu e consultata de helperi). | Nicio migrare de date. La executie: o interogare de control `select count(*) ... from auth.users u join conturi_competitie_club c on c.user_id=u.id where coalesce(u.encrypted_password,'')=''` pentru a confirma [ASSUMED: toate sunt fara parola] |
| Config servicii live | Sabloane email Supabase (Recovery, Magic Link) trebuie sa afiseze `{{ .Token }}` (model in `docs/email-template-cod.html`); lungime OTP 8 si expirare in Dashboard | Verificare manuala in Dashboard [ASSUMED: setate in Faza 32/36; neverificabil din sesiune] |
| Stare inregistrata in OS | None - verificat: nu exista task/cron pentru auth | - |
| Secrete/env | None - fara chei noi; `SUPABASE_SERVICE_ROLE_KEY` folosit doar in teste/handler existente | - |
| Artefacte build | Teste existente care apeleaza OTP la nivel de API (`generateLink magiclink` + `verifyOtp email`) raman valide (OTP ramane activ in backend) | Doar teste noi pentru parola |

## Common Pitfalls

### Pitfall 1: SMTP implicit Supabase (limita foarte mica) - lansare blocata
**What goes wrong:** primul login al fiecarui reprezentant + reset + cod dispozitiv nou = emailuri Auth; cu mailerul implicit limita (2-4/ora la nivel de proiect conform `32-RESEARCH.md`) se depaseste imediat la un val de cluburi (35).
**How to avoid:** 32-08 (SMTP spatiul.ro) ca prerechizit de lansare in plan; in cod mapeaza 429/`over_email_send_rate_limit` la mesaj clar ("Prea multe cereri de cod, incearca mai tarziu") - exista deja `clasificaEroareOtp` ('limita'), redenumeste/reutilizeaza.
**Warning signs:** "email rate limit exceeded", cod care nu soseste. Beneficiu: parola reduce volumul (cod doar la prima setare/reset, nu la fiecare login).

### Pitfall 2: Timebox/inactivity timeout Supabase reintroduc delogarea
**What goes wrong:** `docs/auth-configurare-supabase.md` + plan 32-08 prevad time-box 30 zile si **inactivity timeout 168h (7 zile)** (doar plan Pro [CITED: supabase.com/docs/guides/auth/sessions]). 7 zile inactivitate delogheaza un admin care lipseste o saptamana.
**How to avoid:** actualizeaza runbook/32-08 la "fara inactivity timeout; time-box >= 30 zile sau dezactivat"; la verificare citeste valorile actuale din Dashboard. Refresh token-urile nu expira implicit [CITED: supabase.com/docs/guides/auth/sessions].
**Warning signs:** delogari fara motiv dupa zile; `refresh_token_not_found`.

### Pitfall 3: Calea "dispozitiv nou" (3c Faza 38) e netestata
**What goes wrong:** fixurile `useMFAGuard` fail-closed (95b21b19) nu au fost verificate pe login proaspat; Faza 43 se sprijina pe ea.
**How to avoid:** checkpoint uman explicit in plan: login pe tab/browser fara token `phi-hau-mfa-dispozitiv` -> ecran cod -> intra -> logout/login -> NU mai cere cod. Verifica `document.hidden` (memoria test_tab_ascuns).

### Pitfall 4: Dispozitiv personal debifat + fara inactivitate
**What goes wrong:** pe calculator partajat, bifa debifata => sesiune pana la inchiderea browserului (cookie `phi-hau-sesiune-vie`), acum fara plasa de 60 min.
**How to avoid:** pastreaza mecanismul "sesiune temporara" si textul bifei; decizia utilizatorului confirmata la Open Question 1.

### Pitfall 5: Enumerare de email si mesaje de eroare
**What goes wrong:** `signInWithPassword` da acelasi raspuns pentru user inexistent si fara parola; dar user banat (`schimbaEmailContClub` pune `ban_duration`) da alt mesaj.
**How to avoid:** mesaj unic generic pentru toate esecurile non-429 la login; `resetPasswordForEmail` raspunde succes pentru email inexistent (comportament folosit deja de LoginPage cu mesaj neutru) [ASSUMED: de confirmat in test]. Imbunatateste riscul deschis din Faza 36 ("enumerare email prin OTP 422").

### Pitfall 6: Sesiune de recovery in zona externa
**What goes wrong:** `verifyOtp type:'recovery'` emite `PASSWORD_RECOVERY`; `CompetitieExterna/index.tsx` asculta doar `SIGNED_OUT`, deci OK, dar daca `updateUser` esueaza (parola identica cu cea veche, 422) utilizatorul ramane cu sesiune recovery fara parola.
**How to avoid:** la eroare `updateUser` => `signOut()` local si mesaj; mapeaza "same_password".

### Pitfall 7: Resetare parola revoca dispozitivele de incredere
**What goes wrong:** dupa reset, un admin pierde tokenul de dispozitiv (`revocaDispozitiveIncredere`) si primeste cod la urmatorul login - comportament dorit (securitate), dar trebuie comunicat.

### Pitfall 8: Parola pe cont de club partajat
**What goes wrong:** parola statica impartita intre persoanele clubului, fara blocare per cont (Supabase limiteaza per IP) si fara MFA. Mitigari: min 12 + HIBP, mesaj de eroare generic, reset invalideaza sesiunile? (`signOut scope global` doar la cererea utilizatorului). Risc acceptat de decizie; de mentionat in SUMMARY.

## Code Examples

### Stergerea delogarii la inactivitate (App.tsx)
Elimina: importul `useExpirareInactivitate`, `CHEIE_MOTIV_DELOGARE`, apelul `useExpirareInactivitate(activeRoleContext, handleLogout)` si `useEffect`-ul cu toast (App.tsx liniile ~44-50). Sterge `hooks/useExpirareInactivitate.ts`, `utils/inactivitate.ts`, `utils/inactivitate.test.ts`. `MFA_REQUIRED_ROLES` ramane exportat din `useMFAGuard` (folosit si in alta parte; verifica cu grep inainte de a-l muta). Optional: un `localStorage.removeItem('phi-hau-ultima-activitate')` la pornire pentru curatenie. Actualizeaza `docs/auth-configurare-supabase.md` (linii ~133-139, ~190) si 32-08-PLAN (verificarea 8 "Inactivitate", porti `inactivitate.test.ts`).

### Login extern cu parola
```typescript
// services/accesExternService.ts (inlocuieste trimiteCodAcces/verificaCodAcces)
export async function loginParolaAcces(email: string, parola: string): Promise<{ user: any | null; tip: 'ok' | 'credentiale' | 'limita' | 'alta' }> {
    if (!supabase) return { user: null, tip: 'alta' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: parola });
    if (error) return { user: null, tip: clasificaEroareAuth(error) };
    return { user: data.user, tip: 'ok' };
}
```

## State of the Art

| Vechi | Curent | Impact |
|-------|--------|--------|
| Extern: OTP la fiecare login | Parola + cod doar la setare/reset | mai putine emailuri, fara dependenta de SMTP la fiecare intrare |
| Delogare 60 min admin (Faza 32-04) | Fara delogare; securitate prin dispozitiv de incredere 30z + sesiune temporara | trebuie curatat codul si documentatia |

**Depasit:** `LoginOtp.tsx`, `trimiteCodAcces`, `verificaCodAcces`, `clasificaEroareOtp` ('fara_cont' nu mai are sens), `DURATA_MFA_ORE` din accesExternService, `useExpirareInactivitate`, `utils/inactivitate*`.

## Assumptions Log

| # | Claim | Sectiune | Risc daca gresit |
|---|-------|----------|------------------|
| A1 | "Fara delogare pe inactivitate" se aplica si cand bifa "dispozitiv personal" e debifata (calculator partajat) | Pitfall 4, Open Q1 | Daca utilizatorul vrea plasa pe dispozitive nepersonale, se pastreaza hook-ul doar pentru acel caz |
| A2 | Toate conturile extern existente sunt fara parola (create doar cu `email_confirm:true`) | Runtime State | Cont cu parola setata de test ar sari peste setare; inofensiv |
| A3 | Sabloanele Supabase Recovery si Magic Link afiseaza `{{ .Token }}` (cod), OTP 8 cifre | Runtime State | Daca sablonul Recovery are link, resetul din extern nu merge; verificare in Dashboard |
| A4 | `resetPasswordForEmail` raspunde succes si pentru email inexistent (fara enumerare) | Pitfall 5 | Daca returneaza eroare, UI-ul trebuie sa-o ascunda |
| A5 | Planul Supabase (Free/Pro) si setarile curente de sesiuni/JWT sunt nesetate sau compatibile (nu am putut citi Dashboard) | Pitfall 2 | Delogari neasteptate daca timebox/inactivity sunt deja setate |
| A6 | Limita emailuri implicita Supabase 2-4/ora (din 32-RESEARCH.md, data sept 2026) | Pitfall 1 | Limita reala poate fi alta; verifica Dashboard -> Rate Limits |

## Open Questions

1. **Fara inactivitate si pe dispozitive nepersonale?**
   - Stim: decizia spune "fara delogare pe inactivitate"; plasa actuala pentru calculatoare partajate e tocmai timer-ul de 60 min.
   - Neclar: daca "fara" include bifa debifata.
   - Recomandare: aplica literal (sterge timer-ul), pastreaza "sesiune temporara pana la inchiderea browserului" pentru bifa debifata; confirma cu utilizatorul in discutie scurta.

2. **Conturi extern cu rol ADMIN_CLUB/INSTRUCTOR (si eventual SUPER_ADMIN) care intra in zona prin parola:**
   - Stim: `verificaCodAcces` extindea fereastra MFA 12h (OTP dovedea posesia emailului). Cu parola, zona (`CompetitieExterna`) nu monteaza `useMFAGuard`; JWT-ul ADMIN_CLUB e totusi un JWT admin complet (RLS). Gate-ul MFA e oricum doar UI (tabela `mfa_email_verificari` accepta upsert de catre propriul user).
   - Recomandare: la `finalizeaza`, daca exista context cu rol din `MFA_REQUIRED_ROLES` si `stareMfa(user.id) !== 'valid'`, ascunde acele contexte (ramane doar REPREZENTANT) sau trimite la portalul `/` care cere cod; cea mai mica varianta: filtreaza contextele privilegiate pana cand MFA e valid si afiseaza "Intra din portal pentru cod". Decide la planificare.

3. **Fallback fara SMTP?** Daca 32-08 nu e gata la lansare, o parola temporara setata de owner (ca in Faza 32-06) ar functiona dar contrazice "primul login seteaza parola". Recomandare: nu-l implementa; marcheaza 32-08 ca blocker de lansare, nu de executie.

4. **Bifa "dispozitiv personal" in zona externa:** recomand sa existe (acelasi `seteazaRamaneConectat`), implicit bifata ca in LoginPage.

## Environment Availability

| Dependinta | Necesara pentru | Disponibila | Versiune | Fallback |
|------------|-----------------|-------------|----------|----------|
| Node/npm + `npm run lint` (tsc) | build/teste | da [VERIFIED: package.json] | - | - |
| Playwright | UI spec pe build | da (^1.60.0) | - | - |
| Supabase live (service role in `.env`) | teste cu `admin.generateLink recovery` | da (folosit in teste Faza 36/39) | - | - |
| Dashboard Supabase (sabloane, sesiuni, rate limits) | verificari A3/A5/A6 | doar uman | - | checkpoint uman |
| SMTP custom (32-08) | email real la reprezentanti | NU (blocat; 535 la Hostinger, spatiul.ro necreat/neconfigurat) | - | mailer implicit Supabase, limita mica |

**Missing with no fallback:** nimic care sa blocheze cod/teste; lansarea reala cu multi reprezentanti depinde de 32-08.
**Missing with fallback:** SMTP -> teste cu `generateLink` (fara email real), lansare limitata.

## Abordare de testare (nyquist_validation = false, sectiune informativa)

| Comportament | Tip | Comanda |
|--------------|-----|---------|
| `valideazaParola`, clasificare erori auth | unit (tsx, colocat) | `node --import tsx utils/accesExtern.test.ts`, `node --import tsx utils/parola.test.ts` |
| Reset prin cod pe cont extern fara parola | script live (`tests/auth_extern_parola_faza43.ts`): `admin.createUser(email_confirm)` -> `generateLink type:'recovery'` -> `email_otp` -> `verifyOtp recovery` -> `updateUser` -> `signInWithPassword` OK, parola gresita -> eroare, cod refolosit -> eroare; cleanup `ZZ_TEST_FAZA43_*` | `node --import tsx tests/auth_extern_parola_faza43.ts` |
| UI zona externa: login parola, esec generic, link "Prima autentificare" | Playwright pe build (model `tests/ui_acces_extern_faza36.spec.ts`) | `npx playwright test tests/ui_acces_extern_faza43.spec.ts` |
| Fara timer de inactivitate | grep: `useExpirareInactivitate` absent din `App.tsx`; `tsc --noEmit` | `npm run lint` |
| Dispozitiv nou cere cod / dispozitiv de incredere nu | **manual** (Chrome, tab nou fara token) - include 3c Faza 38 | checkpoint uman |
| Regresie RLS extern | existente | `tests/rls_acces_extern_faza36.ts`, `tests/cont_club_faza39.ts` |

Rulari pe `vite build + preview` (nu doar dev), conform memoriei feedback_strictmode. Fara PII in output.

## Security Domain

### Applicable ASVS Categories (nivel 1)
| Categorie | Se aplica | Control |
|-----------|-----------|---------|
| V2 Authentication | da | Supabase GoTrue (parola, cod recovery 1 folosinta); min 12 + HIBP; mesaje generice |
| V3 Session Management | da | sesiune Supabase persistenta, token dispozitiv hash SHA-256 server-side; fara timer client |
| V4 Access Control | da | RLS neschimbat; zona externa limitata de RLS, nu de UI |
| V5 Input Validation | da | email regex + `valideazaParola`; cod numeric 8 cifre |
| V6 Cryptography | da | nimic propriu; hash/token de dispozitiv existent |

### Amenintari
| Pattern | STRIDE | Mitigare |
|---------|--------|----------|
| Enumerare email la login/reset | Info disclosure | mesaj unic; reset neutru |
| Brute-force pe parola cont club partajat | Spoofing | rate limit Supabase per IP, parola >= 12 + HIBP; fara blocare per cont (risc rezidual acceptat) |
| OTP-ul ramane un canal de login in backend | Spoofing | accept (email = radacina de incredere); nu se poate dezactiva per-user; documenteaza |
| MFA gate doar client-side (tabela `mfa_email_verificari` scriibila de user) | Tampering | preexistent, in afara scopului; mentioneaza pentru faza de hardening |
| Flood de emailuri (reset/cod) | DoS | cooldown 60s UI + 429 mapat; limita Supabase |
| Cont schimbat de email (ban vechi) | - | neschimbat (`schimbaEmailContClub`); userul nou fara parola isi seteaza prin cod |

## Plan sugerat (valuri)
- **Val 1 (independente):** (a) sterge inactivitatea (App.tsx, hook, util, test, toast, docs/32-08); (b) extrage `trimiteCodResetParola`/`reseteazaParolaCuCod` + `clasificaEroareAuth` si refactor LoginPage fara schimbare de comportament.
- **Val 2:** `LoginParola` + `accesExternService.loginParolaAcces` + inlocuire `LoginOtp` in `CompetitieExterna/index.tsx` (+ text in `fara_acces`/`SolicitaContForm`/comentarii `_aprobaCerereAcces.ts` care mentioneaza OTP) + decizia MFA pentru contexte privilegiate (Open Q2) + bifa dispozitiv personal.
- **Val 3:** teste (script live + Playwright), docs (`docs/auth-configurare-supabase.md`, 36-VERIFICARE), checkpoint uman: Dashboard (sabloane `{{ .Token }}`, sesiuni fara inactivity timeout, rate limits), test dispozitiv nou (3c), first-login pe cont extern real cand SMTP e gata.

## Sources

### Primary (HIGH)
- Cod citit: `LoginPage.tsx`, `SetupMFAPage.tsx`, `useMFAGuard.ts`, `useExpirareInactivitate.ts`, `emailMfaService.ts`, `accesExternService.ts`, `LoginOtp.tsx`, `CompetitieExterna/index.tsx`, `api/_contCompetitieClub.ts`, `api/_aprobaCerereAcces.ts`, `supabaseClient.ts`, migrari `20261104a`, `20261111c`, `sql/migrations/mfa_email_verificari_260907.sql`
- https://supabase.com/docs/guides/auth/sessions - time-box/inactivity doar Pro; refresh token nu expira implicit

### Secondary (MEDIUM)
- `.planning/phases/32-*/32-RESEARCH.md`, `docs/auth-configurare-supabase.md`, memorii proiect (login persistent, Faza 36, Faza 38)

### Tertiary (LOW)
- Comportamentul exact GoTrue pentru recover pe email inexistent (A4) - din cunostinte, de confirmat in test

## Metadata
**Confidence:** Standard stack HIGH (nimic nou); Arhitectura HIGH (cod citit); Pitfalls MEDIUM (setari Dashboard neverificate).
**Research date:** 2026-11-16 | **Valid until:** 2026-12-16
