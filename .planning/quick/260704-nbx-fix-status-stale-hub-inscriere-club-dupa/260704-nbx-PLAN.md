---
phase: quick-260704-nbx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/Competitii/index.tsx
  - components/Competitii/InscriereClubWizard/types.ts
  - components/Competitii/InscriereClubWizard/index.tsx
  - components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
autonomous: false
requirements: [QUICK-260704-NBX]

must_haves:
  truths:
    - "După retragerea echipei ('🚫 Nu participăm') hub-ul Înscriere club arată contorul corect (ex. 0/12) fără apăsarea butonului Refresh al competiției"
    - "După reset ('← Participăm') urmat de 'Înapoi la probe', hub-ul reflectă starea reală din DB"
    - "Fluxul de salvare a echipei rămâne neschimbat (hub se actualizează ca înainte)"
    - "Wizard-ul NU se închide și NU se remontează la retragere/reset (step-ul se păstrează)"
  artifacts:
    - path: "components/Competitii/InscriereClubWizard/Pas3Echipe.tsx"
      provides: "Apel refresh silențios la retragere/reset echipă"
      contains: "onEchipeRefresh"
    - path: "components/Competitii/InscriereClubWizard/types.ts"
      provides: "Prop onEchipeRefresh pe InscriereClubWizardProps"
      contains: "onEchipeRefresh"
  key_links:
    - from: "components/Competitii/index.tsx"
      to: "fetchDataSilent"
      via: "onEchipeRefresh prop pe InscriereClubWizard"
      pattern: "onEchipeRefresh=\\{fetchDataSilent\\}"
    - from: "components/Competitii/InscriereClubWizard/Pas3Echipe.tsx"
      to: "onEchipeRefresh"
      via: "apel după update status='retrasa'"
      pattern: "onEchipeRefresh\\?\\.\\(\\)"
---

<objective>
Fix status stale în hub-ul "Înscriere club" (Competiții) după retragerea unei echipe.

Repro (verificat Playwright 2026-07-04): hub → card Sincron (perechi) → categorie cu echipă salvată (hub arată "1/12") → "Echipe — configurare" → "🚫 Nu participăm la această categorie" (retrage echipa) → "← Participăm" → "Înapoi la probe" → hub arată în continuare "1/12" în loc de "0/12". Doar butonul Refresh al competiției corectează.

Cauză (verificată în cod): contorul hub-ului pentru probe echipă/pereche (`song_luyen`/`sincron`) în `InscriereClubCards.calculeazaStatusCard` citește prop-ul `echipe` de nivel competiție (linia ~183: `echipe.find(...)` cu filtru `status !== 'retrasa'`). La SALVAREA echipei prin modal, `InscriereModal.onSaved()` declanșează în parent `fetchDataSilent()` — refresh silențios care reîmprospătează prop-ul `echipe` FĂRĂ a închide/remonta wizard-ul → hub corect. La RETRAGERE, `Pas3Echipe.handleNuParticipaEchipa` scrie direct în DB `status='retrasa'` + stare locală, dar NU declanșează niciodată `fetchDataSilent()` → prop-ul `echipe` rămâne stale → hub arată "1/12". Callback-ul `onSaved` NU poate fi refolosit fiindcă el apelează `setWizardOpen(false)` (închide wizard-ul).

Fix: firul mecanismului existent de refresh silențios (`fetchDataSilent`) până în Pas3 printr-un nou callback `onEchipeRefresh`, apelat la retragere și la reset — simetric cu salvarea. Fără query-uri Supabase noi.

Purpose: Elimină afișarea stale a contorului "X/Y completate" fără a schimba fluxul de salvare sau structura wizard-ului.
Output: 4 fișiere modificate (prop threading + apel refresh).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

# Sursă bug + mecanism refresh existent
@components/Competitii/index.tsx
@components/Competitii/InscriereClubWizard/index.tsx
@components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
@components/Competitii/InscriereClubWizard/InscriereClubCards.tsx
@components/Competitii/InscriereClubWizard/types.ts

# Interfețe cheie (deja verificate)
# - components/Competitii/index.tsx:89-117 — fetchData (cu loading, remontează) vs fetchDataSilent (fără loading, NU remontează wizard-ul)
# - components/Competitii/index.tsx:451-469 — <InscriereClubWizard> primește onSaved={() => { setWizardOpen(false); fetchData(); }} (ATENȚIE: onSaved închide wizard-ul — NU se refolosește)
# - components/Competitii/index.tsx:635-655 — <InscriereModal onSaved> apelează fetchDataSilent() (refresh care corectează hub-ul la salvare)
# - InscriereClubCards.tsx:157-210 — ramura probe echipă/pereche citește prop-ul `echipe` (nu echipeFormate) pentru contor
# - Pas3Echipe.tsx:75-99 — handleNuParticipaEchipa: update DB status='retrasa' + echipeRetraseLocal + onToggleSkipCategorie; LIPSEȘTE refresh parent
# - Pas3Echipe.tsx:300-309 — buton "← Participăm" apelează doar onToggleSkipCategorie(cat.id)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fir callback refresh silențios până în Pas3 și apelează-l la retragere/reset echipă</name>
  <files>components/Competitii/index.tsx, components/Competitii/InscriereClubWizard/types.ts, components/Competitii/InscriereClubWizard/index.tsx, components/Competitii/InscriereClubWizard/Pas3Echipe.tsx</files>
  <action>
Refolosește mecanismul existent de refresh silențios (`fetchDataSilent`) — NU crea query-uri Supabase noi și NU refolosi `onSaved` (acela închide wizard-ul prin `setWizardOpen(false)`).

1. `components/Competitii/InscriereClubWizard/types.ts` — adaugă în interfața `InscriereClubWizardProps` (după `onOpenInscriereModal`, ~linia 83) un prop opțional nou: `onEchipeRefresh?: () => void;` cu comentariu scurt (refresh silențios prop `echipe` fără remontarea wizard-ului). NU șterge/reordona proprietățile existente — nu sparge API-ul componentei.

2. `components/Competitii/index.tsx` — la elementul `<InscriereClubWizard ...>` (~linia 451-469), adaugă prop-ul `onEchipeRefresh={fetchDataSilent}`. `fetchDataSilent` există deja (linia ~106) și reîmprospătează `echipe`/`inscrieri`/`categorii`/`probe` fără `setLoading(true)`, deci fără remontarea wizard-ului (vezi comentariul de la linia 105). Nu atinge `onSaved` existent.

3. `components/Competitii/InscriereClubWizard/index.tsx` — destructurează `onEchipeRefresh` din props (în lista de la ~linia 15-19). În ramura `step === 3` care randează `<Pas3FormareEchipe ...>` (~linia 284-306), pasează mai departe `onEchipeRefresh={onEchipeRefresh}`.

4. `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx`:
   - Adaugă în `interface Pas3Props` (~linia 13-27) prop opțional `onEchipeRefresh?: () => void;` și destructurează-l în semnătura componentei (~linia 29-34).
   - În `handleNuParticipaEchipa` (~linia 75-99), DUPĂ update-ul DB reușit `status='retrasa'` și `setEchipeRetraseLocal(...)` (după linia 95, în ramura `if (echipaId)`), apelează `onEchipeRefresh?.();` astfel încât prop-ul `echipe` de nivel competiție să fie reîmprospătat (echipa retrasă dispare din contorul hub-ului). Plasează apelul înainte de `onToggleSkipCategorie?.(catId)` sau imediat după — ambele sunt acceptabile; important e să ruleze doar când retragerea DB a reușit (nu în ramura de eroare care face `return`).
   - La butonul "← Participăm" (~linia 300-309), extinde handler-ul `onClick` astfel încât pe lângă `onToggleSkipCategorie(cat.id)` să apeleze și `onEchipeRefresh?.()`, ca hub-ul să reflecte starea reală din DB după reset (simetric cu retragerea). Folosește o funcție inline (ex. `() => { onToggleSkipCategorie(cat.id); onEchipeRefresh?.(); }`).

Convenții: TypeScript strict dezactivat, tipuri flexibile OK; fără librării noi; design system `ui.tsx` neschimbat; prop opțional (`?`) ca să nu spargă alți consumatori ai wizard-ului.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
`npx tsc --noEmit` trece fără erori noi. `onEchipeRefresh` apare în types.ts, este cablat la `fetchDataSilent` în Competitii/index.tsx, propagat prin wizard/index.tsx la Pas3, și apelat în `handleNuParticipaEchipa` (după retragerea DB reușită) și în handler-ul butonului "← Participăm". `onSaved` rămâne neatins.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Contorul hub-ului "Înscriere club" se actualizează acum la retragerea/reset-ul echipei prin refresh silențios (`fetchDataSilent`), fără închiderea wizard-ului și fără butonul Refresh al competiției.
  </what-built>
  <how-to-verify>
Reproducerea exactă a bug-ului (identică cu raportul Playwright 2026-07-04):
1. Deschide o competiție → tab Înscrieri → "+ Înscrie Sportivi din Club" (hub Înscriere club).
2. Card Sincron (perechi) → deschide o categorie și salvează o echipă (perechi) → revino la hub; confirmă că arată "1/12 completate".
3. Deschide din nou cardul Sincron → "Echipe — configurare" → apasă "🚫 Nu participăm la această categorie" (retrage echipa).
4. Apasă "← Participăm" (reset stare).
5. Apasă "Înapoi la probe".
6. VERIFICĂ: hub-ul arată acum "0/12 completate" IMEDIAT, fără a apăsa butonul Refresh al competiției.
7. Verificare non-regresie: reia pașii, salvează din nou o echipă și confirmă că hub-ul trece corect la "1/12" (fluxul de salvare neschimbat) și că wizard-ul NU s-a închis/resetat la retragere.
  </how-to-verify>
  <resume-signal>Scrie "approved" dacă hub-ul arată corect "0/12" după retragere/reset fără Refresh, altfel descrie ce contor apare.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` fără erori noi de tipuri.
- Repro manual: contorul hub trece la valoarea corectă după retragere/reset fără butonul Refresh al competiției.
- Non-regresie: salvarea echipei actualizează hub-ul ca înainte; wizard-ul nu se remontează la retragere/reset.
</verification>

<success_criteria>
- Retragerea unei echipe din "Echipe — configurare" declanșează refresh silențios al prop-ului `echipe`, iar hub-ul reflectă imediat starea reală (ex. "0/12").
- Reset-ul ("← Participăm") reflectă corect starea din DB în hub.
- Zero query-uri Supabase noi (refolosire `fetchDataSilent`).
- API-ul componentelor rămâne compatibil (prop nou opțional).
</success_criteria>

<output>
Create `.planning/quick/260704-nbx-fix-status-stale-hub-inscriere-club-dupa/260704-nbx-SUMMARY.md` when done
</output>
