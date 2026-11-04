# Phase 36: Acces extern competitie prin link - Research

**Researched:** 2026-11-04
**Domain:** SPA public entry point + email-OTP login (Supabase Auth) + club-scoped RLS for competition tables
**Confidence:** MEDIUM (code paths HIGH; LIVE RLS state NOT verified, see "Live RLS audit not possible in this session")

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Utilizatori = cluburi existente, cont limitat doar la participare competitii.
- **D-02:** Identificarea clubului = din conturile/rolurile existente (email cu rol ADMIN_CLUB/INSTRUCTOR la un club). Emailul fara rol nu intra.
- **D-03:** Link public per competitie (contine id/token competitie); utilizatorul ajunge direct in competitia respectiva.
- **D-04:** Login email + cod OTP (aceeasi mecanica ca Faza 32), fara parola.
- **D-05:** Daca emailul nu are cont: buton "Solicita cont" -> formular (email, nume, club) -> cerere catre admin federatie; federatia aproba, apoi contul primeste acces limitat.
- **D-06:** Inscrie sportivii clubului sau (wizard inscriere club existent), doar pentru competitia din link.
- **D-07:** Vede lista participantilor DOAR ai propriului club.
- **D-08:** Vede situatia platilor de competitie a clubului sau.
- **D-09:** Vede datele generale ale competitiei (denumire, locatie, deadline, probe).
- **D-10:** Nu vede NIMIC altceva: fara sidebar/meniu portal, fara alte module, fara alte competitii.
- **D-11:** Doar propriii sportivi, in competitia aleasa. RLS nou, izolat per club + competitie. Audit pe `pg_policies` LIVE, nu doar fisiere de migrare.
- **D-12:** Backend/RLS este poarta reala; ascunderea UI nu e securitate.

### Claude's Discretion
Forma exacta a tokenului din link, modelul de rol (rol nou vs flag pe rol existent), tabela cererilor (reutilizare `cereri_inregistrare` daca se potriveste), structura rutei SPA (portalul nu are URL routing intern).

### Deferred Ideas (OUT OF SCOPE)
- Plata online a taxei de participare.
- Acces extern pentru cluburi fara cont in portal (neafiliate).
</user_constraints>

## Project Constraints (from CLAUDE.md)
- No new external libraries; UI only from `components/ui.tsx` (no Shadcn/MUI); types only in root `types.ts`.
- Romanian for domain (DB/UI), English for technical patterns. Services return `{data,error}`, do not throw.
- RLS is the real gate; UI hiding is UX only. Migrations in `supabase/` need `git add -f` (gitignored).
- Competitii module is in a monolith: avoid unneeded re-renders; filtering client-side on already loaded data.
- GSD: edits go through `/gsd-execute-phase`. After non-trivial code, run a separate code review on the diff.
- Memory rules: email carries CODE not action link; RLS audits must query live `pg_policies`; GSD worktree executor fails here, execute inline.

## Summary

The portal is NOT fully URL-less: `App.tsx:182-189` already uses react-router `Routes` for unauthenticated users (`/login`, `/reset-password`, `/inscriere/:clubSlug`), and `vercel.json` rewrites every path to `index.html`. So `/competitie/:id` is a normal new route. The problem is that for logged-in users `App.tsx` ignores the URL and renders `AppLayout`, and `DataProvider` (mounted in `index.tsx:51`, OUTSIDE `BrowserRouter`) loads the whole club dataset on any session (`useDataProvider.ts:99-111, 330-379`: sportivi, plati, grupe, istoricGrade, tranzactii, deconturi, vize...). Nothing in `useSportivi`/`usePlati` has an `enabled` guard (`hooks/usePlati.ts:6-14`). Therefore the shell MUST be a separate React tree selected in `index.tsx` by `window.location.pathname`, not a conditional inside `App`.

Auth reuse is easy: Phase 32 OTP is plain `supabase.auth.signInWithOtp({email, options:{shouldCreateUser:false}})` + `verifyOtp({type:'email'})` with 8-digit codes (`services/emailMfaService.ts:6-33`, UI template `components/SetupMFAPage.tsx`). Sign-up is disabled at project level, so an email without an auth account errors at send time (use that to show "Solicita cont"). Email template already sends `{{ .Token }}` (`docs/email-template-cod.html`).

Security: RLS cannot distinguish "link session" from "normal session" of the same user (header `active-role-context-id` is client-chosen among the user's own rows, `get_active_club_id()` in `20260319_security_audit_fixes.sql:463-497`). Therefore: (a) existing ADMIN_CLUB/INSTRUCTOR entering via the link get UI-only restriction (they already have full portal access via normal login: no escalation); (b) accounts created through "Solicita cont" get a NEW restricted role + a per-competition grant row, and THAT is where new RLS matters. Current competition SELECT policies are wide open to any authenticated user (`20260507_competitii_inscrieri_select_public.sql:5-10`, `20260507_sportivi_vizibili_competitii.sql`), which would leak all clubs' registrations and enrolled athletes' PII (name, birth date) to any new account. That must be closed for the new role without breaking existing ADMIN_CLUB behavior.

**Primary recommendation:** Separate provider-free React tree for `/competitie/:id` (own mini-DataContext), email-OTP login reusing `signInWithOtp/verifyOtp`, new role `REPREZENTANT_COMPETITIE` + table `acces_competitie_extern(user_id, competitie_id, club_id)` + new table `cereri_acces_competitie` (do NOT reuse `cereri_inregistrare`), federation approval through a service-role `api/` endpoint, and RESTRICTIVE-style RLS keyed on the grant table.

## Live RLS audit not possible in this session (IMPORTANT)
The Supabase MCP (`execute_sql`) and `ToolSearch` are not available to this agent; PostgREST does not expose `pg_policies` (verified: `PGRST205`), no `psql`/`supabase` CLI installed. Policy state below is from migration files ONLY and is therefore `[ASSUMED]` for live. Memory shows ~20 phantom live policies were found in Faza 25. **Wave 0 of the plan must run the audit SQL in "Code Examples" via the Supabase MCP and record the result before any policy is written.** Note effective RLS = union (OR) of all permissive policies; several overlapping generations exist (see Pitfall 1).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public link `/competitie/:id` routing | Browser (react-router, index.tsx root switch) | CDN (vercel rewrite already catches all paths) | No server routing needed |
| Pre-login competition teaser | Database (SECURITY DEFINER RPC granted to anon) | Browser | `competitii` SELECT is `authenticated` only; anon needs minimal fields |
| OTP login | Auth Provider (GoTrue) | Browser | `signInWithOtp/verifyOtp` already used |
| Eligibility (role ADMIN_CLUB/INSTRUCTOR or extern grant) | Database/RLS + RPC | Browser (UX gate) | UI check is only UX (D-12) |
| "Solicita cont" request | Database (anon INSERT table) | API (rate-limit) | Mirrors `cereri_inregistrare` anon-insert pattern |
| Approve request -> create account/role/grant | API/Backend (Vercel fn, service role) | Database | Needs `auth.admin`; pattern in `api/creare-cont.ts` |
| Club-only participant list / fees view | Database (RLS) | Browser (filter by club for UX) | Today client filters by `myClubId` (`index.tsx:225-233`) while RLS lets everyone read all |
| Restricted shell UI | Browser | — | New component tree, no Sidebar/AppLayout |

## Standard Stack

No new packages. Everything uses installed `react-router-dom 6.23.1`, `@supabase/supabase-js 2.98`, `@tanstack/react-query 5`, Vercel `api/*.ts` functions, `nodemailer` not needed (Supabase Auth sends the OTP).

### Package Legitimacy Audit
N/A: phase installs no external packages (CLAUDE.md forbids new libs).

## Architecture Patterns

### System Architecture Diagram
```
 link /competitie/<uuid>
        |
   index.tsx: pathname startsWith('/competitie/') ?
     |-- no  -> existing tree (DataProvider > NavigationProvider > Theme > Router > App)
     |-- yes -> ExternRoot: ErrorProvider > QueryClient > RefreshProvider > BrowserRouter
                  > ExternDataProvider(lean) > CompetitieExternaPage
                            |
        anon: rpc get_competitie_publica(id)  --> header card (D-09)
                            |
        step 1 email --signInWithOtp(shouldCreateUser:false)--> GoTrue --> email 8-digit code
              | error "Signups not allowed" / user not found
              +--> form "Solicita cont" --INSERT (anon)--> cereri_acces_competitie
                                                              |
                                      SUPER_ADMIN_FEDERATIE UI list --> api/aproba-cerere-acces
                                      (service role: createUser, roluri row, grant row, OTP-ready)
        step 2 code --verifyOtp(type:'email')--> session
        step 3 eligibility: rows in utilizator_roluri_multicont
              ADMIN_CLUB/INSTRUCTOR@club  OR  REPREZENTANT_COMPETITIE + grant(competitie_id)
              none -> signOut + "Solicita acces"
              >1 club -> small club picker; set localStorage phi-hau-active-role-context-id
        step 4 shell: header + tabs [Inscriere][Participanti club][Plati][Detalii]
              reads/writes ONLY: probe_competitie, categorii_competitie, inscrieri_competitie,
              echipe_competitie, echipa_sportivi, cereri_coechipier, solicitari_echipe_incomplete,
              inlantuiri(_grade), sportivi(own club), vize_sportivi(own club), grade
```

### Recommended Project Structure
```
components/CompetitieExterna/
  index.tsx              # page: teaser + login state machine + shell (lazy-loaded)
  LoginOtp.tsx           # email -> code, copies SetupMFAPage UX
  SolicitaContForm.tsx   # email, nume, club select (anon list of cluburi like InscrierePublicPage)
  ExternDataProvider.tsx # supplies DataContext with a lean value
services/accesExternService.ts   # sendCode/verifyCode/getEligibleContexts/submitCerere
api/aproba-cerere-acces.ts       # service-role approval (SUPER_ADMIN only)
components/Competitii/index.tsx  # export CompetitieDetail + add `mode?: 'extern'` prop
supabase/migrations/2026110xa_acces_extern_competitie.sql  (git add -f)
```

### Q1. Reusable auth (answer)
- `services/emailMfaService.ts:6-12` `trimiteCodMfaEmail(email)` = `signInWithOtp({email, options:{shouldCreateUser:false}})` + `inregistreazaEmailAuth('cod_mfa', ok)` (monitoring counter; reuse tip `cod_mfa`, the `auth_email_events.tip` CHECK in `20260928_auth_email_events_monitorizare.sql` rejects other values).
- `emailMfaService.ts:14-28` `verificaCodMfaEmail` = `verifyOtp({type:'email'})` then upserts `mfa_email_verificari` (12h). For the shell write a thin variant: plain `verifyOtp`, and best-effort upsert (ignore its error; an extern-role user may not satisfy that table's policy). For ADMIN_CLUB the upsert is desirable (keeps main portal MFA window consistent).
- UI to copy: `components/SetupMFAPage.tsx` (8 digit input, paste-from-clipboard button, resend after 30s). Not reusable as-is: it calls `useNavigation()` and reads current session email.
- Gaps to handle: `notificaIncercareLogin` (new-device admin alert) only fires on password login (`hooks/useAuth.ts:25`), so OTP-link login bypasses that alert; `useExpirareInactivitate` (60 min logout for privileged roles, `App.tsx:37`) is not mounted in the shell: mount the same hook with a logout callback.
- Dependency/risk: OTP delivery depends on Phase 32 SMTP. STATE.md: plan 32-08 still blocked on spatiul.ro SMTP; default Supabase channel is 2 emails/hour (`docs/auth-configurare-supabase.md:83`). Many club reps hitting one link on the same day will exhaust that. Treat SMTP live + rate limit raised as a release prerequisite.
- Email enumeration: `shouldCreateUser:false` returns an error for unknown emails, so the page reveals whether an account exists. Acceptable for this use (D-05 explicitly needs the branch) but mention to user; mitigation is IP rate limiting on the request insert.

### Q2. SPA / shell (answer)
- `index.tsx:51-67` provider order: ErrorProvider > QueryClient > RefreshProvider > DataProvider > NavigationProvider > ThemeProvider > BrowserRouter > App. DataProvider and ThemeProvider (`contexts/ThemeContext.tsx:17` uses `useData`) sit outside the router.
- Recommended: in `index.tsx` branch on `window.location.pathname.startsWith('/competitie/')` and render `ExternRoot` (no DataProvider, no NavigationProvider, no ThemeProvider; `:root` CSS vars have defaults, `index.css:8,31`). Keep `RefreshProvider` (`useRegisterRefresh` is used by CompetitieDetail, `index.tsx:121`) and `ErrorProvider` (`useError`).
- Route parsing: `/competitie/:id`. Validate UUID regex before any query. Link = plain UUID (D-03 discretion): no secret token column needed because every data read is gated by login + RLS; the teaser RPC returns only D-09 fields and refuses `draft` status. A guessable-token scheme would add no security.
- Existing precedent for guard against post-login drift: `App.tsx` ignores URL when logged in, so a user who opens `/` after the shell with `phi-hau-active-role-context-id` = extern-role row would load the main app with all permissions false and RLS errors (`useDataProvider.ts:384-386`). Add a guard in App: if active role name is `REPREZENTANT_COMPETITIE`, show "Acces limitat" + link back to the competition URL + logout, and skip `fetchAppData`.
- Do NOT use `activeView` for this: `NavigationContext` persists `phi-hau-active-view` and history; `popstate` is hijacked in `App.tsx:96-116`. The shell is its own tree and has its own trivial tab state.
- Header issue: `supabaseClient.ts:15-23` sends `active-role-context-id` only from localStorage. With the header absent `get_active_club_id()` falls back to the primary role's club. The shell must write the chosen context id to `phi-hau-active-role-context-id` after eligibility (otherwise club-scoped sportivi SELECT, `20260507_sportivi_vizibili_competitii.sql`, may return nothing for the wizard). Side effect: it changes the active context of the main portal for the same browser (document it; acceptable).

### Q3. Roles / permissions / requests (answer)
- `hooks/usePermissions.ts:36-55` derives everything from role name; unknown name => all false, `visibleClubIds = [club_id]`. `api/_permisiuniCont.ts:ROLE_WEIGHTS` gives unknown roles weight 0, so a new role cannot create accounts (fail closed). `MFA_REQUIRED_ROLES` (`hooks/useMFAGuard.ts:11`) excludes it; correct (OTP already is the factor).
- Decision: **new role `REPREZENTANT_COMPETITIE`** (row in `roluri`, assignment in `utilizator_roluri_multicont` with `club_id`) + **grant table** `acces_competitie_extern(user_id, competitie_id, club_id, creat_de, creat_la, activ)`. Rejected: giving INSTRUCTOR to external people (full instructor portal access incl. plati update, violates D-10/D-11); rejected: flag on existing role (every existing policy keyed on `rol_denumire IN (...)` would ignore it, and session-scoped restriction is unenforceable by RLS because the header is client-chosen).
- Existing ADMIN_CLUB/INSTRUCTOR via link: eligibility = rows in `utilizator_roluri_multicont` with `rol_denumire IN ('ADMIN_CLUB','INSTRUCTOR')` and `club_id IS NOT NULL`; restriction is UI-only, say so explicitly in the plan (they could always use the main portal).
- Current UI parity: wizard/registration is shown only for `isClubAdmin` (`Competitii/index.tsx:457,483`); INSTRUCTOR sees read-only. D-06 says users "inscrie sportivii": open question below.
- `cereri_inregistrare` does NOT fit: `club_id NOT NULL`, athlete fields (nume, prenume, data_nasterii, sex), purpose is athlete onboarding, SELECT/UPDATE via `has_access_to_club(club_id)` so club admins would read federation-level account requests (`20260410_cereri_inregistrare.sql:17-95`). Create `cereri_acces_competitie(id, competitie_id, email, nume, club_id, mesaj, status in_asteptare/aprobata/respinsa, motiv_respingere, created_at, procesat_la, procesat_de)`; copy the anon-INSERT pattern (`GRANT INSERT ... TO anon`, `WITH CHECK` with length limits, no anon SELECT), SELECT/UPDATE only `public.is_super_admin()`. Partial unique index on `(lower(email), competitie_id) WHERE status='in_asteptare'` to stop spam duplicates. Club chosen from `cluburi` list (anon can already read it, `InscrierePublicPage.tsx:55-58`); "club neafiliat" is deferred.
- Approval: new `api/aproba-cerere-acces.ts` following `api/_autentificareApelant.ts` (Bearer -> `callerRoles`), require SUPER_ADMIN_FEDERATIE, then with service role: create auth user if missing (`email_confirm:true`; sign-up stays disabled), insert role row + grant row, mark request. Reuse `checkRateLimit` from `api/_rateLimit.ts`. Federation UI: small list in the existing competition admin area (tab like `CereriInterclubAdmin`, `Competitii/index.tsx:631`).

### Q4. Tables / RLS (answer; migration-file state, live unverified)
Tables touched by the reused wizard (`grep from(...)` over `components/Competitii`): `inscrieri_competitie`, `echipe_competitie`, `echipa_sportivi`, `categorii_competitie`, `probe_competitie`, `cereri_coechipier`, `solicitari_echipe_incomplete`, `inlantuiri`, `inlantuiri_grade`, `competitii`, plus `sportivi`, `vize_sportivi`, `grade`, `tipuri_competitie`, CVD arms (`hooks/useArmeCvd.ts`, migration `20261105a_arme_cvd.sql`: not audited, check its policies in Wave 0).

Competition fees: there is NO plati/facturi row for competitions. Fee is computed client-side by `utils/taxeCompetitie.ts` (`calculeazaTaxaIndividuala/Echipa`) from `competitii.taxa_individual/taxa_echipa/config_taxe`, and paid status is the boolean `taxa_achitata` on `inscrieri_competitie` / `echipe_competitie` (`20260319_competitii_schema.sql:85,102`; toggled only in admin `FinanciarView.tsx:104-122`). So D-08 = a read-only club-scoped view built from the club's own registrations: **no new tables, no plati RLS exposure**. Do not mount `FinanciarView` (shows all clubs, writes `taxa_achitata`); build `PlatiClubExtern` from `inscrieri`/`echipe` + the same calc util.

Policy state from files (all `[ASSUMED]` live):
| Table | Files say | Effect for a new restricted user |
|---|---|---|
| `competitii`, `probe_competitie`, `categorii_competitie` | SELECT any authenticated (`20260319_competitii_schema.sql:143,174,187`; `sql/migrations/fix_rls_all_tables.sql:297`). Write: any user holding ADMIN_CLUB anywhere, NOT club-scoped (`:146-167`) | Sees ALL competitions (violates D-10 at API level); tolerable for read of public-ish data but restrict for new role |
| `inscrieri_competitie` | SELECT `auth.uid() IS NOT NULL` (`20260507_competitii_inscrieri_select_public.sql:6-7`) plus `rbv_ic_staff/own` (`sql/migrations/role_based_views.sql:1366-1372`). INSERT/UPDATE: v1 policy lets any user with ADMIN_CLUB anywhere write for ANY club (`20260319...:213-250`); rbv set uses `has_access_to_club(club_id)` | Reads all clubs' registrations (violates D-07). Cross-club write is a latent existing bug if v1 policies are still live |
| `echipe_competitie` | same open SELECT (`:11-12`) | same |
| `echipa_sportivi` | SELECT/ALL via parent `echipe_competitie` club or any ADMIN_CLUB (`20260319...:305-340`) | Cross-club write via any ADMIN_CLUB role |
| `sportivi` | `Select_Sportivi_Unified`: own-context club OR any sportiv with an inscriere/echipa row (`20260507_sportivi_vizibili_competitii.sql`) | Any new account sees name/birth data of every enrolled athlete of every club (GDPR minors) |
| `cereri_inregistrare` | anon INSERT, staff select by club | Not reused |

What must change (new migration, additive where possible):
1. Helper `public.acces_extern_competitie(p_competitie_id uuid, p_club_id uuid) RETURNS boolean` STABLE SECURITY DEFINER, `SET search_path=public`, checks `acces_competitie_extern` for `auth.uid()` and `activ`. SECURITY DEFINER avoids policy recursion and FORCE-RLS trap (memory: `feedback_rls_force_security_definer_recursion`; this project auto-sets FORCE RLS on new tables, so add `NO FORCE ROW LEVEL SECURITY` like `20260928_auth_email_events_monitorizare.sql` and `ALTER FUNCTION ... STABLE` per `20261015a_optimizare_rls_statement_timeout.sql` for perf).
2. Narrow the open SELECT on `inscrieri_competitie`/`echipe_competitie`/`echipa_sportivi` so the extern role is excluded and everyone else is unchanged: replace `auth.uid() IS NOT NULL` with `NOT public.este_doar_extern() OR ...`, OR (simpler and safer) keep existing policies but make them exclude users whose ONLY roles are `REPREZENTANT_COMPETITIE`, via `public.are_rol_non_extern()` (EXISTS role row with `rol_denumire <> 'REPREZENTANT_COMPETITIE'`). Then add extern policies: SELECT/INSERT/UPDATE/DELETE where `acces_extern_competitie(competitie_id, club_id)`. Decide with user whether existing ADMIN_CLUB should also lose cross-club participant visibility in the main portal; D-07 applies to the shell, and that visibility is an existing feature (migration comment says deliberately public). Default: do not change main-portal behavior.
3. `sportivi`: extern role policy = `club_id = <grant.club_id>` (own club only); do not rely on "has inscriere" clause for extern. Recommend the shell reads sportivi through column-limited view/RPC (id, nume, prenume, data_nasterii, gen, grad_actual_id, status, club_id) rather than `rbv_sportivi_complet` (has cnp, telefon, adresa, email: `hooks/useSportivi.ts:20`). The base table policy still exposes all columns to the role; if that is unacceptable, deny base-table SELECT to extern and serve everything via SECURITY DEFINER RPC `sportivi_club_competitie(p_competitie_id)`. Recommended because D-11 is about PII isolation.
4. `competitii`/`probe`/`categorii`: add extern SELECT limited to granted competition; exclude extern role from the generic `authenticated` SELECT as in step 2.
5. Teaser RPC `get_competitie_publica(p_id)` SECURITY DEFINER, `GRANT EXECUTE TO anon, authenticated`, returns `denumire, locatie, data_inceput, data_sfarsit, deadline_inscrieri, status` only, and null for `draft`.
6. All other tables already default-deny the new role because their policies enumerate role names or club contexts; BUT anything keyed only on `club_id = active context club` (like sportivi above, possibly plati/grupe/tranzactii from Faza 25's "risc rezidual" list: tranzactii, grade, istoric_grade, eveniment, reduceri, cluburi) will grant the extern role club-wide access because the role row carries `club_id`. Wave 0 must test as the extern user (see Validation notes) rather than reason from files. Alternative that removes this class of risk: store the extern grant ONLY in `acces_competitie_extern` and give the role row `club_id = NULL`; then every club-context policy returns nothing. Recommended; the shell reads the club from the grant row. Trade-off: header `active-role-context-id` row has NULL club, `get_active_club_id()` returns NULL, and the extern RLS must key on the grant table (already planned).
7. INSERT/UPDATE tamper check: `WITH CHECK` must bind `club_id` to the grant's `club_id` AND `competitie_id` to the grant, and for `inscrieri_competitie` also verify `sportiv.club_id = club_id` (extern must not enroll another club's athlete), with a status gate `competitii.status='inscrieri_deschise'` and `deadline_inscrieri` not passed (today only the UI checks `canRegister`, `Competitii/index.tsx:165`).
8. Side-effect triggers on insert run SECURITY DEFINER (`trg_taxa_anuala_inscrieri_competitie`, `sql/migrations/taxa_anuala_federatie_trigger_260912.sql:159`; creates federation decont rows). Expected, but note enrollment by extern users creates federation fee accruals exactly like ADMIN_CLUB today.

### Q5. Reusable components (answer)
- `CompetitieDetail` is NOT exported (`Competitii/index.tsx:57`); `CompetitiiManagement` (list + auto-enter single open competition, `:700-736`) is. Export `CompetitieDetail` and add a prop `mode?: 'extern'`.
- Inside CompetitieDetail it uses `useData()` for `filteredData.sportivi, grade, currentUser, vizeSportivi, activeRoleContext` (`:59`). `CategoriiTemplateManager.tsx:5` and `StagiiCompetitii.tsx:12` also use `useData`, but are not needed. Provide `DataContext.Provider` with a minimal object cast to the context type (export `DataContext` from `contexts/DataContext.tsx`; currently only `DataProvider`/`useData` are exported): `{ filteredData:{sportivi}, grade, vizeSportivi, currentUser:{club_id, cluburi:{nume}}, activeRoleContext:{club_id,...} }`. Good: only 5 fields.
- `myClubId = activeRoleContext?.club_id ?? currentUser?.club_id` (`:162`): the minimal provider must supply the grant club.
- Permissions prop: build a `Permissions` object with `isAdminClub:true`, everything else false (`isClubAdmin` unlocks wizard `:87,457,483`, `canEditArme :171`). For extern in `mode='extern'` also force: tabs only `inscrieri` (wizard + own-club list), `raport` optional (it takes `myClubId`; admin flag false so club-scoped, check), `categorii` (read-only; D-09 probe/categorii info), a new `Plati` tab; hidden: `admin`, `financiar`, `template`, `cereri_interclub`, `rezultate_legacy`, "Deschide/Inchide Inscrierile" button (`:203-218`), back button to list (go nowhere; "other competitions" invisible, D-10), `onViewSportiv` (opens profile = other module; pass undefined).
- Data fetch in CompetitieDetail (`:98-105`) selects ALL inscrieri/echipe of the competition with joined sportiv + club name, then filters by club in memory. For extern mode add `.eq('club_id', myClubId)` for inscrieri/echipe (defense in depth; RLS is the gate). Caveat: `Pas3Echipe`/`Pas2Quyen` (`supabase.from` at lines 52-55) read partner/cereri data possibly cross-club (team formation, `cereri_coechipier`, `solicitari_echipe_incomplete`, `20260604_cereri_coechipier.sql`). Cross-club coechipier requests are a deliberate feature; decide whether extern users keep it (needs read of other clubs' pending requests => leak vs D-07). Recommend: keep team registration within own club only for the shell and mark cross-club partner as unavailable in `mode='extern'`. Confirm with user (open question 2).
- Wizard props (`InscriereClubWizard/index.tsx`): `sportivi, grade, inscrieri, echipe, clubId, numeClub, vizeSportivi, arme, canEdit, onViewSportiv, onBack, onSaved, onEchipeRefresh, onOpenInscriereModal`. No `useData` inside wizard/steps. Reusable as-is. `vizeSportivi` only for `areVizaFRAM` warning (`constants.tsx:28`): in shell load `vize_sportivi` with `.eq('club_id', clubId)` (column exists, `types.ts VizaSportiv`) with the existing select `SELECT_VIZE_CU_PLATA` embeds `plati(status,suma)`: that joins plati; for extern fetch only `sportiv_id,an,tip,status_viza,scutit,plata_id` and compute paid status via a SECURITY DEFINER RPC or skip the warning in extern mode (it is warning-only, `constants.tsx:26`).

### Q6. Data leakage (answer)
Covered in Summary: `DataProvider` must not mount in the extern tree. Also prevent the reverse: the extern tree must not import `useData()` consumers other than via the minimal provider (a bare `useData()` outside a provider throws, `DataContext.tsx:18-20`, which fails loud instead of leaking: good). In the extern tree load only: `grade` (small static table, cache key `cache_grade`), sportivi of club, vize of club, tipuri_competitie labels (`useTipuriCompetitie`). Realtime subscriptions in `useDataProvider.ts:128-184` are not started because provider isn't mounted. localStorage caches (`phi-hau-selected-sportiv-id`, `cache_clubs`) written by a previous main-portal session on the same browser remain readable; not a new exposure.

### Anti-Patterns to Avoid
- Conditional `if (externRoute) return <Shell/>` inside `App.tsx`: DataProvider already ran and fetched the club's data.
- Reusing `cereri_inregistrare` for account requests.
- Relying on `.eq('club_id', myClubId)` in the client as the isolation (D-12).
- Giving the extern role a `club_id` on its role row while any club-context-only policy exists (class of leak in Q4 step 6).
- Adding `CREATE POLICY` without first dumping live policies (phantom/duplicate policies OR together; a restrictive new policy has no effect if a permissive `USING (true)` survives).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email code login | custom code table/mailer | `signInWithOtp` + `verifyOtp` (`emailMfaService.ts`) | Already live, rate limited, SMTP configured |
| Account creation on approval | direct insert to auth schema | `supabaseAdmin.auth.admin.createUser` pattern from `api/creare-cont.ts` + `_autentificareApelant.ts` | Handles caller authz, tested guard `_permisiuniCont` |
| Anti-spam on public insert | captcha lib | `api/_rateLimit.ts` + partial unique index + honeypot field | No new deps |
| Registration UI | new enrollment form | `InscriereClubWizard` as-is | Complex (quyen, arme, echipe, inlantuiri) |
| Fee calculation | new calc | `utils/taxeCompetitie.ts` | Single source |

## Common Pitfalls

### Pitfall 1: Layered/overlapping policy generations
**What goes wrong:** Files contain at least 4 generations for `inscrieri_competitie` (`20260319`, `20260507`, `role_based_views.sql` rbv_*, plus live-only phantoms). Permissive policies OR together.
**How to avoid:** Dump live `pg_policies` first; `DROP POLICY` the broad ones for the tables you tighten, re-create the union you intend; re-test as ADMIN_CLUB of club A that club B data behavior is as decided.

### Pitfall 2: Active-context header absent after shell login
**What goes wrong:** wizard shows zero sportivi because club-scoped SELECT keys off header/primary role.
**How to avoid:** set `phi-hau-active-role-context-id` (or use the grant-table-keyed RPC for sportivi, which removes the dependency).

### Pitfall 3: `sportivi` PII via competition-enrollment clause
Any new authenticated user can read enrolled athletes of all clubs (name, birth date). Ensure extern role is excluded from that clause (Q4.3).

### Pitfall 4: OTP rate/SMTP
Default 2 mails/hour if SMTP 32-08 not finished; `signInWithOtp` has also a per-address cooldown (~60s) so keep the resend gate (30s in SetupMFAPage is shorter than GoTrue's default 60s; use 60s). `[ASSUMED]` default 60s cooldown, verify in Supabase Auth settings.

### Pitfall 5: Role added to `roluri` breaks lists that enumerate roles
`getRoleDisplayName`/`RoleSelectionPage`, `ROLE_WEIGHTS`, `useDataProvider` role branching, admin user management screens, `vedere_utilizator_roluri_completa` (used in `Competitii`), `audit-mfa-coverage.ts`. New role should be filtered out of staff/user lists (`GestiuneStaff`) or shown labeled; add display name case.

### Pitfall 6: Strict-mode / prod-only mount bugs
Memory `feedback_strictmode_masks_prod_bug_scroll`: verify the new root switch in `vite build && vite preview`, not only dev.

### Pitfall 7: Back button / history hijack
Shell must not mount `App`'s popstate interceptor (good, separate tree), but still ensure the browser Back leaves the page naturally.

## Code Examples

### Audit SQL to run in Wave 0 (Supabase MCP execute_sql, read-only)
```sql
select tablename, policyname, cmd, roles, permissive, qual, with_check
from pg_policies
where schemaname='public' and tablename in
 ('competitii','probe_competitie','categorii_competitie','inscrieri_competitie','echipe_competitie',
  'echipa_sportivi','cereri_coechipier','solicitari_echipe_incomplete','inlantuiri','inlantuiri_grade',
  'sportivi','vize_sportivi','grade','cluburi','utilizator_roluri_multicont','roluri','tipuri_competitie',
  'arme_cvd','mfa_email_verificari')
order by tablename, cmd, policyname;
select relname, relrowsecurity, relforcerowsecurity from pg_class
 where relnamespace='public'::regnamespace and relname in ('inscrieri_competitie','echipe_competitie','sportivi');
select column_name from information_schema.columns where table_name='utilizator_roluri_multicont'; -- rol_denumire derived? check triggers/constraints
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.utilizator_roluri_multicont'::regclass;
```
Also list policies on any table referencing `club_id = get_active_club_id()` only (candidates for leak if the role row carries a club).

### Root switch (index.tsx)
```tsx
// Source: existing index.tsx structure, adapted
const isExtern = window.location.pathname.startsWith('/competitie/');
root.render(isExtern
  ? <React.StrictMode><ErrorProvider><QueryClientProvider client={queryClient}><RefreshProvider>
      <BrowserRouter><Suspense fallback={null}><CompetitieExternaPage/></Suspense></BrowserRouter>
    </RefreshProvider></QueryClientProvider></ErrorProvider></React.StrictMode>
  : /* existing tree */);
```

### OTP service (new, mirrors emailMfaService.ts:6-33)
```ts
export async function trimiteCodAcces(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  inregistreazaEmailAuth('cod_mfa', !error);
  return { error };
}
export async function verificaCodAcces(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  return { user: data?.user ?? null, error };
}
```

### Extern policy sketch
```sql
create or replace function public.acces_extern_competitie(p_competitie uuid, p_club uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acces_competitie_extern
                 where user_id = auth.uid() and competitie_id = p_competitie and club_id = p_club and activ);
$$;
create policy ic_extern_select on public.inscrieri_competitie for select to authenticated
  using (public.acces_extern_competitie(competitie_id, club_id));
create policy ic_extern_insert on public.inscrieri_competitie for insert to authenticated
  with check (public.acces_extern_competitie(competitie_id, club_id)
    and exists (select 1 from public.competitii c where c.id = competitie_id and c.status='inscrieri_deschise'
                and (c.deadline_inscrieri is null or c.deadline_inscrieri >= current_date))
    and exists (select 1 from public.sportivi s where s.id = sportiv_id and s.club_id = inscrieri_competitie.club_id));
-- plus update/delete same predicate; same for echipe_competitie / echipa_sportivi (via parent)
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Magic link email | 8-digit OTP via `{{ .Token }}` template (Faza 32) | Matches memory rule: no action links in email |
| Role-name-only RLS lists | Grant table + SECURITY DEFINER helper | Per-competition scoping |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live policies match the union of migration files (not verified; MCP unavailable) | Q4 | HIGH: leaks or missed policies; mandatory Wave 0 audit |
| A2 | `utilizator_roluri_multicont.rol_denumire` is free text (no CHECK/enum) so a new role value inserts cleanly | Q3 | Medium: may need constraint change; audit query included |
| A3 | GoTrue OTP resend cooldown ~60s and OTP expiry default 1h | Pitfall 4 | Low |
| A4 | `signInWithOtp` with `shouldCreateUser:false` on unknown email returns an error rather than silent success | Q1/diagram | Medium: if silent, "Solicita cont" branch cannot be triggered by error; fallback: always show a visible "Nu ai cont? Solicita acces" link under the email field. Test on live |
| A5 | Anon can read `cluburi(id,nume,slug)` (InscrierePublicPage does) | Q3 | Low |
| A6 | `vize_sportivi.club_id` is populated for all rows | Q5 | Low (warning only) |
| A7 | Federation admin UI placement (tab in competition admin) | Q3 | Low |

## Open Questions

1. **INSTRUCTOR via link: read-only or may enroll?** UI today: only ADMIN_CLUB enrolls (`Competitii/index.tsx:87,457`); DB `has_access_to_club` allows INSTRUCTOR to insert. Recommend parity (INSTRUCTOR read-only lists + fees). User to confirm.
2. **Cross-club coechipier / inter-club teams in shell?** They read other clubs' data (D-07). Recommend disabled in extern mode.
3. **Should the main portal keep cross-club participant visibility** for ADMIN_CLUB (current deliberate behavior, `20260507_competitii_inscrieri_select_public.sql`)? Recommend yes (out of scope).
4. **Can one approved extern account span several competitions?** Grant table supports N rows; request form is per competition link.
5. **Latent cross-club write on competition tables** (v1 INSERT/UPDATE/DELETE policies use any-ADMIN_CLUB) if still live: fix in this phase or log as todo? Recommend fix for the tables touched (cheap, same migration) subject to Wave 0 findings.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP (execute_sql on pg_policies) | D-11 live audit | Not for this agent; planner/executor session should have it | n/a | Run audit SQL in Supabase dashboard SQL editor |
| Node/npm, vite, playwright | build/tests | yes (repo) | package.json | — |
| SMTP custom (plan 32-08) | OTP volume | Unknown/blocked per STATE.md | — | Default Supabase 2 mails/h: insufficient |
| supabase CLI / psql | — | no | — | MCP / dashboard |

## Validation notes
`workflow.nyquist_validation=false` in `.planning/config.json`, so no formal Validation Architecture. Test pattern in repo: `tests/rls_izolare_cross_club_faza25.ts`, `tests/rls_taxe_anuale_faza33.ts` (service role + signed-in test users, run via `npx tsx`). Write `tests/rls_acces_extern_faza36.ts`: as extern user A (grant club X, comp C1) assert: can select/insert own-club inscrieri in C1; 0 rows for other clubs, other competitions; cannot insert for other club/sportiv; cannot read `plati`, `tranzactii`, `sportivi` of other clubs, `cluburi` beyond allowed, `cereri_inregistrare`; teaser RPC works as anon and returns null for draft. Plus Playwright smoke: open `/competitie/<id>` logged out -> teaser + login form, no Sidebar. Memory note: Chrome MCP hidden-tab false negatives (`feedback_test_tab_ascuns_mcp`).

## Security Domain

| ASVS | Applies | Control |
|------|---------|---------|
| V2 Authentication | yes | Supabase email OTP; sign-up disabled; rate limit; inactivity timeout hook |
| V3 Session | yes | JWT/session settings from Faza 32; shell logout button; `useExpirareInactivitate` |
| V4 Access Control | yes (core) | Grant table + SECURITY DEFINER helper + RLS; UI hiding not security |
| V5 Input validation | yes | UUID regex on route param; length/format CHECKs on request table; email normalization lower() |
| V6 Cryptography | no | none hand-rolled |

| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| Cross-club read of registrations/athletes | Info disclosure | extern-excluded SELECT + grant-keyed policies; PII-minimal RPC |
| Cross-club enroll / tamper club_id, competitie_id | Tampering/Elevation | WITH CHECK binds grant + sportiv.club_id; status/deadline gate in DB |
| Account-request spam / enumeration | DoS/Info | partial unique index, rate limit, honeypot; accept enumeration trade-off |
| Self-approval | Elevation | request table SELECT/UPDATE only `is_super_admin()`; approval only via service-role endpoint with caller check |
| Extern role reaching main portal data | Elevation | NULL club on role row; App guard; verify via the RLS test script |
| Phantom permissive policies | Elevation | live `pg_policies` dump before/after |

## Sources
### Primary (HIGH, repo code read this session)
App.tsx, index.tsx, hooks/useDataProvider.ts, useAppLogic.ts, useUserRoles.ts, usePermissions.ts, useMFAGuard.ts, useAuth.ts, supabaseClient.ts, services/emailMfaService.ts, components/SetupMFAPage.tsx, LoginPage.tsx, InscrierePublicPage.tsx, components/Competitii/index.tsx + InscriereClubWizard/*, api/_autentificareApelant.ts, _permisiuniCont.ts, _rateLimit.ts, docs/auth-configurare-supabase.md, docs/email-template-cod.html, supabase/migrations (20260319_competitii_schema, 20260319_security_audit_fixes, 20260410_cereri_inregistrare, 20260507_*, 20260928_*), sql/migrations/role_based_views.sql, fix_rls_all_tables.sql, .planning/phases/32 (CONTEXT, RESEARCH), STATE.md.
### Secondary / Tertiary
GoTrue behavior of `shouldCreateUser:false`, OTP cooldown/expiry: from training knowledge, not verified this session (A3, A4). Live DB: not queried (PostgREST confirmed no `pg_policies`).

## Metadata
**Confidence:** Stack HIGH; architecture (route/shell/provider) HIGH; auth reuse HIGH; RLS MEDIUM-LOW until Wave 0 live audit; fee model HIGH.
**Research date:** 2026-11-04. **Valid until:** ~2026-11-18 (competition schema and RLS change frequently; recheck git log for `supabase/migrations`).
