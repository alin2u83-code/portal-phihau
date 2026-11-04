# Phase 36: Acces extern competitie prin link — Context

**Gathered:** 2026-11-04
**Status:** Ready for planning
**Sursa:** 2 runde AskUserQuestion cu utilizatorul (4.11.2026), fara discuss-phase complet.

<domain>
## Phase Boundary

Pagina separata, accesibila printr-un link per competitie, prin care reprezentantii cluburilor (conturi existente) intra cu email si cod OTP si vad EXCLUSIV zona de competitie. Cine nu are cont poate solicita unul. Fara acces la restul portalului.

In scope: link per competitie, login email+OTP, shell UI minimal doar competitie, butonul "Solicita cont" -> cerere la admin federatie, RLS izolat per club + competitie.
Out of scope: alte module vizibile, inregistrare publica fara aprobare, plati online.
</domain>

<decisions>
## Implementation Decisions

### Utilizatori si identificare
- **D-01:** Utilizatori = cluburi existente, cont limitat doar la participare competitii.
- **D-02:** Identificarea clubului = din conturile/rolurile existente (email cu rol ADMIN_CLUB/INSTRUCTOR la un club). Emailul fara rol nu intra.
- **D-03:** Link public per competitie (contine id/token competitie); utilizatorul ajunge direct in competitia respectiva.

### Autentificare
- **D-04:** Login email + cod OTP (aceeasi mecanica ca Faza 32), fara parola.
- **D-05:** Daca emailul nu are cont: buton "Solicita cont" -> formular (email, nume, club) -> cerere catre admin federatie; federatia aproba, apoi contul primeste acces limitat.

### Acces (ce vede si face)
- **D-06:** Inscrie sportivii clubului sau (wizard inscriere club existent), doar pentru competitia din link.
- **D-07:** Vede lista participantilor DOAR ai propriului club.
- **D-08:** Vede situatia platilor de competitie a clubului sau.
- **D-09:** Vede datele generale ale competitiei (denumire, locatie, deadline, probe).
- **D-10:** Nu vede NIMIC altceva: fara sidebar/meniu portal, fara alte module, fara alte competitii.

### Securitate
- **D-11:** Doar propriii sportivi, in competitia aleasa. RLS nou, izolat per club + competitie. Audit pe `pg_policies` LIVE, nu doar fisiere de migrare.
- **D-12:** Backend/RLS este poarta reala; ascunderea UI nu e securitate.

### Decizii dupa cercetare (4.11.2026, raspunsuri utilizator)
- **D-13:** INSTRUCTOR poate inscrie sportivi prin link (nu doar citire). Politicile RLS trebuie sa limiteze la sportivii permisi instructorului/clubului.
- **D-14:** Functiile cross-club (coechipier alt club, echipe inter-club) DEZACTIVATE in zona externa.
- **D-15:** Politicile RLS vechi 20260319 (posibila scriere cross-club a oricarui ADMIN_CLUB) se repara IN aceasta faza: Wave 0 = audit live pg_policies, apoi WITH CHECK pe club + competitie + status/deadline.
- **D-16:** Portalul principal pastreaza vizibilitatea actuala a participantilor intre cluburi pentru ADMIN_CLUB; restrictia se aplica doar rolului nou REPREZENTANT_COMPETITIE / sesiunii din link.
- **Recomandari cercetare adoptate:** rol nou REPREZENTANT_COMPETITIE + tabela acces_competitie_extern(user_id, competitie_id, club_id, activ); tabela noua cereri_acces_competitie (nu se reutilizeaza cereri_inregistrare); aprobare prin api/aproba-cerere-acces.ts (service role, doar SUPER_ADMIN_FEDERATIE); shell separat ales in index.tsx dupa pathname /competitie/ fara DataProvider; situatia platilor = vedere read-only din taxa_achitata, fara FinanciarView.

### Claude's Discretion
- Forma exacta a tokenului din link, modelul de rol (rol nou vs flag pe rol existent), tabela cererilor (reutilizare `cereri_inregistrare` daca se potriveste), structura rutei SPA (portalul nu are URL routing intern).
</decisions>

<canonical_refs>
## Canonical References

- `docs/roluri-permisiuni.md` — roluri, RLS, usePermissions
- `docs/baza-de-date.md` — schema DB
- `docs/ARHITECTURA_COMPETITII.md` — tipuri competitii, probe, reguli
- `components/Competitii/index.tsx` — modul competitii, auto-intrare adaugata 4.11.2026
- `components/Competitii/InscriereClubWizard/` — wizard inscriere club de reutilizat
- `.planning/STATE.md` — Phase 32 (OTP/auth) si Phase 25 (RLS)
- Memorie: feedback_email_fara_linkuri_actiune (emailul contine cod, nu link de actiune), feedback_audit_rls_verifica_live_nu_doar_migratii
</canonical_refs>

<specifics>
## Specific Ideas

- Linkul e dat de federatie/admin; emailul de login contine cod OTP, NU link de actiune.
- Utilizatorul extern nu trece prin selectia de rol/club complexa a portalului: clubul rezulta din rolul lui.
</specifics>

<deferred>
## Deferred Ideas

- Plata online a taxei de participare.
- Acces extern pentru cluburi fara cont in portal (neafiliate).
</deferred>
