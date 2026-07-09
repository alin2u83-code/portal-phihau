---
phase: quick-260709-eiw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/Sportivi/ImportSportiviPage/index.tsx
  - components/Sportivi/ImportSportiviPage/Pas0Upload.tsx
  - components/Sportivi/ImportSportiviPage/WizardSteps.tsx
  - components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx
  - components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx
  - components/Sportivi/ImportSportiviPage/Pas2Raport.tsx
  - components/GestiuneExamene/index.tsx
autonomous: false
requirements: [EIW-RESTYLE-01]

must_haves:
  truths:
    - "Ecranul Import Sportivi (toti pasii wizard) foloseste paleta slate-800/60 + accent amber-400, nu blue/sky"
    - "Ecranul principal Sesiuni Examen foloseste carduri slate-800/60 cu border-slate-700/50 si hover:border-amber-400/40"
    - "Iconitele si accentele active din ambele ecrane sunt amber-400, consistent cu AdminMasterMap ItemCard"
    - "Logica de import (mapare, dedup, checkbox, upsert) si logica de examene raman 100% neschimbate"
    - "tsc --noEmit trece fara erori noi"
  artifacts:
    - path: "components/Sportivi/ImportSportiviPage/index.tsx"
      provides: "Container wizard import cu paleta amber/slate"
    - path: "components/GestiuneExamene/index.tsx"
      provides: "Ecran principal Sesiuni cu carduri stil AdminMasterMap"
  key_links:
    - from: "components/GestiuneExamene/index.tsx"
      to: "components/AdminMasterMap.tsx"
      via: "aceleasi clase Tailwind slate-800/60 + amber-400/40"
      pattern: "border-amber-400/40"
---

<objective>
Restyle vizual (doar clase Tailwind) al ecranului Import Sportivi (tot wizardul) si al ecranului principal Sesiuni din modulul Examene, astfel incat sa foloseasca aceeasi paleta slate/amber si acelasi stil de carduri ca Dashboard-ul admin club (`components/AdminMasterMap.tsx`, ItemCard liniile 39-70 + header AppRouter.tsx:147-155).

Purpose: Consistenta vizuala intre module — acelasi limbaj de culoare (fundal slate-800/60, border slate-700/50, hover amber-400/40, accente amber-400) pe toate ecranele principale.
Output: 7 fisiere cu clase Tailwind actualizate, zero modificari de logica/props/query-uri.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260709-eiw-restyle-import-sportivi-si-modulul-exame/260709-eiw-CONTEXT.md
@CLAUDE.md
@components/AdminMasterMap.tsx

# Referinta paleta tinta (ItemCard AdminMasterMap.tsx:48-53):
#   container card:  bg-slate-800/60 p-4 rounded-lg ... border border-slate-700/50 hover:border-amber-400/40 group
#   hover fundal:    hover:bg-slate-700/70
#   iconita accent:  text-amber-400
#   titlu card:      font-medium text-slate-200 text-sm
# Referinta header (AppRouter.tsx:150-151):
#   h1: text-2xl font-bold text-white
#   subtitlu: text-slate-400 text-sm
</context>

<constraints>
- DOAR clase Tailwind / structura vizuala se schimba. Zero modificari de: logica, props, semnaturi de functii, query-uri Supabase, state, handlere, comportament (import dedup strict/loose, checkbox selectie excludedNouIndices/excludedStrictIndices/selectedIndices, calcule examene, comisie cross-club).
- NU se modifica `components/ui.tsx` — componenta `Card` foloseste tokeni de tema (`var(--t-surface)`) partajati de toate modulele; restilizarea cardurilor Sesiune se face prin `className` de override pe instanta `<Card>` din GestiuneExamene, NU prin editarea componentei Card. Daca un pattern chiar cere atingerea ui.tsx, OPRESTE-TE si semnaleaza inainte de aplicare (per decizie CONTEXT).
- In Examene: DOAR `components/GestiuneExamene/index.tsx` (ecranul principal Sesiuni — header, butoane header, blocuri filtre, carduri sesiune, empty state). NU se ating: DetaliiSesiune, ImportExamenModal, ImportTutorial, SesiuneForm, ManagementInscrieri, Rapoarte.
- Nu se sparge functionalitate existenta (skill portal-debug): pastreaza toate `onClick`, `value`, `onChange`, `key`, `style={cardStyle}` (theme_config per club) exact cum sunt.
</constraints>

<threat_model>
Task pur vizual: zero modificari de logica, date, query-uri sau granite de incredere. Nu se introduc pachete noi, endpoint-uri sau input-uri noi. Nu exista suprafata STRIDE noua. Singurul risc este regresie vizuala/functionala — acoperit de checkpoint-ul de verificare vizuala.
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Restyle wizard Import Sportivi la paleta slate/amber</name>
  <files>components/Sportivi/ImportSportiviPage/index.tsx, components/Sportivi/ImportSportiviPage/Pas0Upload.tsx, components/Sportivi/ImportSportiviPage/WizardSteps.tsx, components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx, components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx, components/Sportivi/ImportSportiviPage/Pas2Raport.tsx</files>
  <action>
    Inlocuieste accentele blue/sky/indigo cu paleta amber/slate din AdminMasterMap ItemCard, DOAR la nivel de clase Tailwind. Pastreaza structura JSX, props, handlere si valorile semantice (rosu pentru erori/obligatoriu, emerald pentru succes/corect, red pentru greseli — acestea NU se schimba, sunt semnale de stare, nu accente de brand).

    Mapari de aplicat (accente de brand → amber):
    - `WizardSteps.tsx`: pastile pas activ/done `bg-blue-500`/`border-blue-400`/`text-blue-300` si bara de progres `bg-blue-500` → echivalente amber (`bg-amber-500`, `border-amber-400`, `text-amber-300`, bara `bg-amber-500`). Starea inactiva slate ramane.
    - `Pas0Upload.tsx`: badge-urile numerotate `bg-blue-500/20 border-blue-500/40 text-blue-400` → `bg-amber-500/20 border-amber-500/40 text-amber-400`; iconita accordion `text-blue-400` → `text-amber-400`; `code` cu `text-blue-300` din tabelul de coloane → `text-amber-300`. Blocul "Greseli frecvente" ramane pe amber (deja e amber) — nu-l atinge. Butoanele raman variantele existente ui.tsx.
    - `index.tsx`: cardurile "Club destinatie import" folosesc `border-blue-500/30`, `text-blue-300`, `focus:ring-blue-500` → varianta amber (`border-amber-500/30`, `text-amber-300`, `focus:ring-amber-500`); container ramane `bg-slate-800/60`.
    - `Pas05Configurare.tsx` (9 accente blue/sky/brand-secondary), `Pas1Revizuire.tsx` (8 accente), `Pas2Raport.tsx` (4 accente): inlocuieste fiecare accent de brand blue/sky/indigo/brand-secondary cu amber corespunzator (aceeasi nuanta/opacitate: `blue-400`→`amber-400`, `blue-500/20`→`amber-500/20`, `text-blue-300`→`text-amber-300`, etc.). NU schimba: `red-*` (erori/obligatoriu), `emerald-*`/`green-*` (succes/corect), `slate-*` (fundal/text neutru).

    Titlurile de sectiune raman pe pattern-ul `font-bold text-white` / subtitlu `text-slate-400 text-sm` (deja apropiate). Nu adauga librarii, nu schimba iconite functionale, nu atinge `downloadTemplate`/`onAnalyze`/`onFileChange`.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Toti pasii wizardului Import Sportivi afiseaza accente amber-400 pe fundal slate; zero clase blue/sky/indigo/brand-secondary de brand ramase (cu exceptia semnalelor de stare red/emerald/green); tsc fara erori noi; logica import intacta.</done>
</task>

<task type="auto">
  <name>Task 2: Restyle ecran principal Sesiuni Examen la stil carduri AdminMasterMap</name>
  <files>components/GestiuneExamene/index.tsx</files>
  <action>
    Aliniaza vizual DOAR ecranul principal "Gestiune Sesiuni Examen" (blocul `return` de la ~linia 248, NU ramura `selectedSesiune` cu DetaliiSesiune). Doar clase Tailwind — pastreaza toate handlere, `key`, `style={cardStyle}` (theme_config per club), variantele Button si logica de filtrare/`filteredSesiuni`.

    Modificari:
    - Header h1 (`text-2xl sm:text-3xl font-bold text-white`) ramane; adauga consistenta cu dashboard daca lipseste subtitlu — optional, la discretie, dar nu obligatoriu.
    - Cardurile de sesiune (`<Card key={s.id} className="sesiune-card flex flex-col group" style={cardStyle}>`): adauga in `className` override-uri care aduc stilul AdminMasterMap ItemCard peste tokenii de tema — `bg-slate-800/60 border border-slate-700/50 hover:border-amber-400/40 transition-colors rounded-lg`. NU edita componenta `Card` din ui.tsx; override doar prin className pe aceasta instanta. Pastreaza `style={cardStyle}` (permite culoarea de club sa suprascrie cand exista theme_config).
    - Titlul locatiei din card: `group-hover:text-brand-secondary` → `group-hover:text-amber-400` (accent hover consistent cu AdminMasterMap).
    - Blocurile de filtre (bloc perioada `bg-[var(--t-surface-2)]` si chip-urile "Rapid"): accentele de brand `brand-secondary` folosite ca accent de interactiune (`hover:border-brand-secondary hover:text-brand-secondary`, `focus:ring-brand-secondary`, `text-brand-secondary/80`) → echivalent amber (`hover:border-amber-400 hover:text-amber-400`, `focus:ring-amber-400`, `text-amber-400/80`). Tokenii neutri `var(--t-surface)`/`var(--t-border)`/`var(--t-text)` raman (sunt fundal/text de tema, nu accent de brand).
    - Badge status: `bg-green-600/30 text-green-300` (Finalizat) si `bg-sky-600/30 text-sky-300` (Programat) sunt semnale de stare — pastreaza-le neschimbate.
    - Butoanele header (Genereaza Factura, Ghid Import, Import Bulk, Adauga Sesiune) pastreaza variantele existente (`secondary`/`info`/`primary`) — nu le schimba.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Cardurile de sesiune afiseaza fundal slate-800/60 + border slate-700/50 cu hover amber-400/40 si accent hover amber pe titlu; filtrele folosesc accent amber; `style={cardStyle}` si toata logica de filtrare/CRUD intacte; ramurile DetaliiSesiune/modale neatinse; tsc fara erori noi.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Restyle vizual Import Sportivi (tot wizardul) + ecran principal Sesiuni Examen la paleta slate-800/60 + amber-400, stil carduri AdminMasterMap. Zero modificari de logica.</what-built>
  <how-to-verify>
    1. Porneste dev server (`npm run dev`) si logheaza-te cu contul de test (TEST_EMAIL din .env), rol Admin Club, club C.S. Phi Hau.
    2. Navigheaza la Sportivi → Import Sportivi. Verifica vizual: pasii wizard (pastilele de sus), badge-urile numerotate, accordion-urile, tabelele — accentele sa fie amber-400 pe fundal slate, nu albastru. Erori (rosu) si corect (verde) raman ca inainte.
    3. Testeaza functional ca NIMIC nu s-a stricat: incarca un fisier CSV/Excel de test, parcurge Configurare → Revizuire, verifica checkbox-urile de selectie (nou/actualizare/posibil duplicat) si expand rand functioneaza. NU trebuie sa executi upsert-ul daca nu vrei date de test.
    4. Navigheaza la Examene (Gestiune Sesiuni). Verifica: cardurile de sesiune au fundal slate-800/60, border subtil, iar la hover marginea devine amber; titlul locatiei devine amber la hover. Filtrele de perioada/status au accent amber. Badge-urile de status (Programat sky / Finalizat verde) raman neschimbate.
    5. Confirma ca butoanele "Vezi Detalii", editare, stergere, "Adauga Sesiune", "Import Bulk" functioneaza identic (deschid modalele/detaliul corect).
  </how-to-verify>
  <resume-signal>Scrie "approved" daca paleta e aliniata si nimic nu s-a stricat, sau descrie diferentele vizuale/functionale observate.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` trece fara erori noi.
- Grep de sanitate: zero clase de brand `blue-`/`sky-`/`indigo-`/`brand-secondary` folosite ca accent de interactiune ramase in cele 7 fisiere (exceptand semnalele de stare red/emerald/green si tokenii de tema `var(--t-*)`).
- Verificare vizuala manuala confirmata de user (checkpoint).
</verification>

<success_criteria>
- Import Sportivi (toti pasii) si ecranul principal Sesiuni Examen folosesc paleta slate-800/60 + amber-400 identica cu AdminMasterMap ItemCard.
- Zero regresii functionale: import dedup, checkbox selectie, filtrare examene, CRUD sesiuni — comportament identic.
- `components/ui.tsx` neatins.
- User confirma aprobarea vizuala.
</success_criteria>

<output>
Create `.planning/quick/260709-eiw-restyle-import-sportivi-si-modulul-exame/260709-eiw-SUMMARY.md` when done
</output>
