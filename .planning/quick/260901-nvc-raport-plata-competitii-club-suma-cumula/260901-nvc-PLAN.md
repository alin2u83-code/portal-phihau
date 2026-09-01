---
phase: quick/260901-nvc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - utils/taxeCompetitie.ts
  - components/Competitii/RaportInscrieri.tsx
autonomous: false
requirements: [QUICK-260901-nvc]

must_haves:
  truths:
    - "Un admin de club deschide tab-ul Raport la o competiție și vede totalul cumulativ de plată pentru TOATE înscrierile salvate în DB ale clubului său la acea competiție"
    - "Fiecare linie afișează: nume sportiv sau nume echipă, categoria de competiție (categorie.denumire), proba, status plată (achitat/neachitat) și suma per linie"
    - "Taxa unei echipe apare o singură dată în total, nu multiplicată cu numărul de membri ai echipei"
    - "Footerul tabelului afișează totalul general; când filtrele sunt active rămâne vizibil și totalul competiției fără filtre"
    - "Sumele provin din rândurile salvate în inscrieri_competitie/echipe_competitie, nu din state-ul sesiunii curente de wizard"
    - "Un admin de club nu vede în raport rânduri financiare ale altor cluburi"
  artifacts:
    - path: "utils/taxeCompetitie.ts"
      provides: "construiesteRanduriPlata() — funcție pură care agregă rânduri + totaluri de plată per competiție"
      contains: "construiesteRanduriPlata"
    - path: "components/Competitii/RaportInscrieri.tsx"
      provides: "Secțiunea Situație plată: sumar (total/achitat/restant) + tabel detaliat + footer total"
      contains: "construiesteRanduriPlata"
  key_links:
    - from: "components/Competitii/RaportInscrieri.tsx"
      to: "utils/taxeCompetitie.ts"
      via: "import { construiesteRanduriPlata }"
      pattern: "construiesteRanduriPlata"
    - from: "utils/taxeCompetitie.ts construiesteRanduriPlata"
      to: "calculeazaTaxaIndividuala / calculeazaTaxaEchipa"
      via: "apel intern per rând"
      pattern: "calculeazaTaxa(Individuala|Echipa)"
    - from: "rânduri de plată"
      to: "câmpul taxa_achitata din inscrieri_competitie / echipe_competitie"
      via: "citire directă din props deja fetch-uite de components/Competitii/index.tsx"
      pattern: "taxa_achitata"
---

<objective>
Tab-ul „Raport" din modulul Competiții afișează în prezent doar o listă de sportivi cu probele lor, fără nicio informație financiară. Acest plan adaugă un **raport de plată cumulativ real per competiție**, pentru clubul curent: total de plată calculat pe toate înscrierile SALVATE în DB (nu pe state-ul sesiunii de wizard), cu rânduri detaliate (participant, categorie, probă, status plată, sumă) și total general în footer.

Purpose: Un admin de club trebuie să știe, la orice moment și din tab-ul pe care îl folosește deja, cât datorează clubul lui la competiția selectată — cumulativ, nu doar cât a adăugat în ultima sesiune de înscriere.

Output:
- `utils/taxeCompetitie.ts` — funcție pură nouă `construiesteRanduriPlata()` + tipurile aferente
- `components/Competitii/RaportInscrieri.tsx` — secțiune „Situație plată" (sumar + tabel + footer total)

**NU se modifică:** `components/Competitii/InscriereClubWizard/Pas4Sumar.tsx` (totalul lui de sesiune este corect ca sumar al pasului 4), `components/Competitii/FinanciarView.tsx` (rămâne view-ul federației, cu editare taxa_achitata), `components/Competitii/index.tsx` (props RaportInscrieri rămân neschimbate → zero break de API).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@utils/taxeCompetitie.ts
@components/Competitii/RaportInscrieri.tsx
@components/Competitii/FinanciarView.tsx
</context>

<research_findings>

Cercetare deja făcută — NU re-investiga de la zero, folosește direct:

**1. Datele sunt deja în props — zero query-uri Supabase noi.**
`components/Competitii/index.tsx:94-95` (și duplicatul de refresh 110-111) face deja fetch-ul complet pentru competiția selectată:
- `inscrieri_competitie` cu `sportiv:sportivi(id, nume, prenume, grad_actual_id, data_nasterii, club_id, cluburi(id, nume))`
- `echipe_competitie` cu `club:cluburi(id, nume), echipa_sportivi(sportiv_id, rol, sportiv:sportivi(...))`

Ambele sunt pasate ca props la `RaportInscrieri` (`index.tsx:507-521`): `inscrieri`, `echipe`, `categorii`, `probe`, `competitie`, `isAdmin`, `myClubId`. **Tot ce este necesar există deja client-side.** Constrângerea de proiect „filtrare client-side pe date deja încărcate — fără query-uri noi Supabase" este respectată automat.

**2. Pattern-ul corect de total cumulativ există în `FinanciarView.tsx:41-89`.**
Agregă `totalCalculat`/`totalAchitat` din rândurile reale din DB, folosind `calculeazaTaxaIndividuala(competitie, cat)` și `calculeazaTaxaEchipa(cat, competitie)` (`utils/taxeCompetitie.ts:3-23`), sărind rândurile retrase. Este federation-facing (grupat pe toate cluburile). Planul extrage această logică într-o funcție pură refolosibilă, consumată de `RaportInscrieri`.

**3. Câmpurile există deja pe tipuri — zero migrație DB.**
`types.ts:724-757`: `InscriereCompetitie.taxa_achitata: boolean`, `EchipaCompetitie.taxa_achitata: boolean`, `denumire_echipa`, `status`. `types.ts:682-704`: `CategorieCompetitie.denumire`, `proba_id`, `arma`, `varsta_max` (folosite de calculul taxei). `types.ts:674-680`: `ProbaCompetitie.denumire`, `tip_proba` (tehnica/giao_dau/cvd).

**4. „Grupa" din cerere = categoria de competiție**, clarificat de utilizator. `categorie.denumire` acoperă cerința. **Fără join nou cu tabelul `grupe`** (grupa de antrenament).

**5. Bug-ul de referință (context, nu scope).** `Pas4Sumar.tsx:127-137` calculează `totalIndividual`/`totalEchipe`/`totalGeneral` din `randuriIndividuale`/`randuriEchipe`, adică din `selectedSportivi`/`echipeFormate` = state-ul sesiunii curente de wizard. Nu este cumulativ. **Nu îl atingem** — este sumarul pasului 4, corect în contextul lui. Livrăm raportul separat, cumulativ.

**6. Capcana principală de implementare: dublarea taxei de echipă.**
`RaportInscrieri.tsx:76-94` iterează `echipa_sportivi` și creează câte o participare PER MEMBRU. Dacă noua logică financiară ar refolosi acea structură, taxa de echipă ar fi numărată de 2-5 ori (o dată per membru). **Rândurile financiare trebuie construite separat: un rând per `inscriere`, un rând per `echipa` — NU per membru de echipă.**

**7. Fără test runner unitar.** `package.json` are `lint: tsc --noEmit` și `test: playwright test` (E2E). Verificarea automată = `npx tsc --noEmit` + gate-uri grep structurale; confirmarea vizuală se face în checkpoint-ul uman.
</research_findings>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Funcție pură construiesteRanduriPlata în utils/taxeCompetitie.ts</name>
  <files>utils/taxeCompetitie.ts</files>
  <behavior>
    Comportament așteptat al funcției (verificat prin inspecție + checkpoint uman, nu există test runner unitar):
    - 3 înscrieri individuale a 80 lei + 1 echipă de 4 membri a 150 lei → `totalCalculat === 390`, `randuri.length === 4` (NU 7 rânduri, NU 840 lei — taxa de echipă se numără O SINGURĂ DATĂ)
    - o înscriere cu `status === 'retras'` → exclusă din `randuri` și din totaluri
    - o echipă cu `status === 'retrasa'` → exclusă din `randuri` și din totaluri
    - un rând cu `taxa_achitata === true` → contribuie și la `totalAchitat`; `totalRestant === totalCalculat - totalAchitat`
    - categorie lipsă pentru o echipă → fallback la `competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120` (identic cu FinanciarView.tsx:72)
    - listă goală de înscrieri și echipe → `randuri === []`, toate totalurile `0`
  </behavior>
  <action>
Adaugă la finalul fișierului `utils/taxeCompetitie.ts` (păstrează neatinse `calculeazaTaxaIndividuala` și `calculeazaTaxaEchipa` — sunt folosite de FinanciarView).

Extinde importul de tipuri din `../types` cu `ProbaCompetitie`, `InscriereCompetitie`, `EchipaCompetitie`.

Exportă două interfețe:
- `RandPlataCompetitie` cu câmpurile: `id: string`, `tip: 'individual' | 'echipa'`, `numeParticipant: string`, `clubId: string`, `clubNume: string`, `categorieDenumire: string`, `probaDenumire: string`, `tipProba: string`, `taxa: number`, `taxaAchitata: boolean`.
- `SituatiePlataCompetitie` cu câmpurile: `randuri: RandPlataCompetitie[]`, `totalCalculat: number`, `totalAchitat: number`, `totalRestant: number`, `nrIndividuale: number`, `nrEchipe: number`.

Exportă funcția pură `construiesteRanduriPlata(competitie: Competitie, categorii: CategorieCompetitie[], probe: ProbaCompetitie[], inscrieri: InscriereCompetitie[], echipe: EchipaCompetitie[]): SituatiePlataCompetitie`.

Reguli de implementare (obligatorii):
1. Funcție PURĂ: fără `import React`, fără `supabase`, fără efecte secundare, fără mutarea argumentelor. Modulul `utils/taxeCompetitie.ts` nu trebuie să capete dependențe de rețea sau de UI.
2. Individuale: iterează `inscrieri` sărind rândurile cu `i.status?.toLowerCase() === 'retras'`. Pentru fiecare, `cat = categorii.find(c => c.id === ins.categorie_id)`, `taxa = calculeazaTaxaIndividuala(competitie, cat)`. `numeParticipant = sp ? \`${sp.nume} ${sp.prenume}\` : ins.sportiv_id` unde `sp = ins.sportiv as any`. `clubId = ins.club_id`, `clubNume = sp?.cluburi?.nume ?? ''`. `taxaAchitata = ins.taxa_achitata ?? false`. `id = ins.id`.
3. Echipe: iterează `echipe` sărind rândurile cu `e.status?.toLowerCase() === 'retrasa'`. **EXACT UN RÂND PER ECHIPĂ** — nu itera `echipa_sportivi` / `sportivi` și nu genera rânduri per membru (vezi research_findings punctul 6: ar multiplica taxa cu numărul de membri). `taxa = cat ? calculeazaTaxaEchipa(cat, competitie) : (competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120)`. `numeParticipant = ec.denumire_echipa ?? 'Echipă'`. `clubId = ec.club_id`, `clubNume = (ec as any).club?.nume ?? ''`. `taxaAchitata = ec.taxa_achitata ?? false`. `id = ec.id`.
4. Probă (comun ambelor ramuri): `proba = probe.find(p => p.id === cat?.proba_id)`; `probaDenumire = proba?.denumire ?? cat?.denumire ?? 'Probă'`; `tipProba = proba?.tip_proba ?? ''`. `categorieDenumire = cat?.denumire ?? 'Categorie'`.
5. Totaluri: acumulează `totalCalculat += taxa` pentru fiecare rând inclus; `totalAchitat += taxa` doar când `taxaAchitata === true`; la final `totalRestant = totalCalculat - totalAchitat`. `nrIndividuale`/`nrEchipe` = numărul de rânduri din fiecare tip.
6. Sortare finală a `randuri`: după `probaDenumire`, apoi `categorieDenumire`, apoi `numeParticipant`, toate cu `localeCompare(..., 'ro-RO')`.
7. Comentariu scurt în română deasupra funcției care explică de ce echipa produce un singur rând (protejează regula la modificări viitoare).

Nu modifica `FinanciarView.tsx` în acest task — adoptarea helperului acolo este în afara scopului acestui plan (risc de regresie pe view-ul federației).
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit && grep -v '^\s*//' utils/taxeCompetitie.ts | grep -c 'export function construiesteRanduriPlata' | grep -qx 1 && grep -v '^\s*//' utils/taxeCompetitie.ts | grep -c 'echipa_sportivi' | grep -qx 0 && grep -v '^\s*//' utils/taxeCompetitie.ts | grep -Ec 'supabase|import React' | grep -qx 0 && echo GATE_OK</automated>
  </verify>
  <done>`npx tsc --noEmit` trece fără erori. `utils/taxeCompetitie.ts` exportă `construiesteRanduriPlata`, `RandPlataCompetitie`, `SituatiePlataCompetitie`. Zero referințe la `echipa_sportivi`, `supabase` sau `React` în fișier (taxa de echipă numărată o singură dată, funcție pură). `calculeazaTaxaIndividuala` și `calculeazaTaxaEchipa` rămân exportate neschimbate.</done>
</task>

<task type="auto">
  <name>Task 2: Secțiunea „Situație plată" în tab-ul Raport</name>
  <files>components/Competitii/RaportInscrieri.tsx</files>
  <action>
Modifică `components/Competitii/RaportInscrieri.tsx`. Props și semnătura componentei rămân **identice** (`RaportInscrieriProps` neschimbat) — `components/Competitii/index.tsx` nu se atinge.

1. Import: `import { construiesteRanduriPlata } from '../../utils/taxeCompetitie';` plus `import type { SituatiePlataCompetitie } from '../../utils/taxeCompetitie';`.

2. Scoping de club (securitate — T-nvc-01): păstrează filtrarea existentă `(isAdmin || i.club_id === myClubId)` / `(isAdmin || e.club_id === myClubId)` din `filteredIns`/`filteredEc` (liniile 47-56). Adaugă suplimentar două liste scopate pe club DAR fără filtrele de categorie, pentru totalul cumulativ real al competiției:
   - `insClub = inscrieri.filter(i => isAdmin || i.club_id === myClubId)`
   - `ecClub = echipe.filter(e => isAdmin || e.club_id === myClubId)`
   (excluderea rândurilor retrase o face helperul; nu o duplica aici)

3. Două memo-uri:
   - `const plataFiltrata = useMemo(() => construiesteRanduriPlata(competitie, categorii, probe, filteredIns, filteredEc), [competitie, categorii, probe, filteredIns, filteredEc]);` — rândurile afișate în tabel, respectă bara de filtre.
   - `const plataTotala = useMemo(() => construiesteRanduriPlata(competitie, categorii, probe, insClub, ecClub), [competitie, categorii, probe, insClub, ecClub]);` — totalul cumulativ al competiției pentru club, indiferent de filtre.
   Notă de implementare: `filteredIns`/`filteredEc`/`insClub`/`ecClub` sunt calculate în corpul componentei la fiecare render (array-uri noi). Pentru a evita recalcul inutil, mută cele patru filtrări în `useMemo` cu dependențele lor (`inscrieri`, `echipe`, `isAdmin`, `myClubId`, `categoriiVizibile`) și folosește acele memo-uri ca dependențe — constrângerea de proiect privind re-renderele nedorite.

4. Guard de listă goală: schimbă early-return-ul de la linia 101 din `if (raport.length === 0)` în `if (raport.length === 0 && plataFiltrata.randuri.length === 0)`, ca o competiție cu doar echipe (fără membri joinați) să nu ascundă raportul financiar.

5. Randează, ÎNTRE `CompetitieFilterBar` și blocul existent de listă per sportiv, o secțiune nouă „Situație plată":
   - Antet: titlu `Situație plată` + trei valori pe un rând (wrap pe mobil): `Total: {plataFiltrata.totalCalculat} lei` (text alb, bold), `Achitat: {plataFiltrata.totalAchitat} lei` (verde), `Restant: {plataFiltrata.totalRestant} lei` (roșu).
   - Când `nrFiltreActive > 0`, sub antet un rând mic gri: `Total competiție (fără filtre): {plataTotala.totalCalculat} lei` — astfel suma cumulativă completă rămâne vizibilă chiar și cu filtre aplicate.
   - Sub-linie contor: `{plataFiltrata.nrIndividuale} individuale · {plataFiltrata.nrEchipe} echipe`.
   - Tabel `<table>` învelit în `<div className="-mx-4 sm:mx-0 overflow-x-auto">` cu `min-w-[560px]` (pattern-ul de tabel responsive din `index.tsx:535-536`). Coloane, în ordine: `Participant` | `Club` (randată DOAR când `isAdmin`) | `Categorie` | `Probă` | `Status plată` | `Sumă` (aliniată la dreapta).
   - Fiecare rând: badge `IND`/`ECH` înaintea numelui, cu clasele din `FinanciarView.tsx:242-248` (`bg-brand-primary/20 text-brand-primary` pentru individual, `bg-green-900/30 text-green-300` pentru echipă); `categorieDenumire`; `probaDenumire` urmat de `tipProba` ca text mic gri când `tipProba` e nevid; pill de status `Achitat` (verde) / `Neachitat` (roșu); `{taxa} lei`.
   - Footer `<tfoot>`: un rând `TOTAL` cu `colSpan` corect (variabil în funcție de prezența coloanei Club) și `{plataFiltrata.totalCalculat} lei` bold în ultima celulă.
   - Stilizare: exclusiv Tailwind + tokenii de temă existenți (`var(--t-border)`, `var(--t-table-header-bg)`, `var(--t-table-header-text)`, `var(--t-table-row-hover)`), conform pattern-ului deja folosit în fișier și în `FinanciarView.tsx`. Fără CSS nou, fără librării noi.

6. Read-only: **nu** adăuga butoane de comutare `taxa_achitata` și **niciun** apel `supabase` în acest fișier. Editarea statusului de plată rămâne exclusiv în `FinanciarView.tsx` (tab admin federație). `RaportInscrieri` rămâne pur de citire.

7. Titlul secțiunii existente de listă per sportiv rămâne `Raport Înscrieri`; butonul `Imprimă` existent acoperă și noua secțiune (aceeași pagină de print).
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit && grep -v '^\s*//' components/Competitii/RaportInscrieri.tsx | grep -c 'construiesteRanduriPlata' | grep -qx 3 && grep -v '^\s*//' components/Competitii/RaportInscrieri.tsx | grep -Ec 'supabase|taxa_achitata:' | grep -qx 0 && grep -v '^\s*//' components/Competitii/RaportInscrieri.tsx | grep -qc 'plataTotala' && git diff --name-only | grep -Ec 'Pas4Sumar.tsx|FinanciarView.tsx|Competitii/index.tsx' | grep -qx 0 && echo GATE_OK</automated>
  </verify>
  <done>`npx tsc --noEmit` trece. `RaportInscrieri.tsx` importă și apelează `construiesteRanduriPlata` de două ori (import + 2 apeluri = 3 apariții), expune `plataTotala`, nu conține niciun apel `supabase` și nicio mutație `taxa_achitata`. `Pas4Sumar.tsx`, `FinanciarView.tsx` și `Competitii/index.tsx` sunt neatinse în diff. `npm run dev` pornește fără erori de compilare.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verificare vizuală raport plată în browser</name>
  <files>(niciunul — checkpoint de verificare, fără modificări de cod)</files>
  <action>Pornește `npm run dev`, prezintă utilizatorului pașii din `how-to-verify` de mai jos și OPREȘTE execuția până la semnalul de reluare. Nu modifica niciun fișier în acest task.</action>
  <what-built>
Tab-ul „Raport" din Competiții afișează acum, deasupra listei de sportivi, o secțiune „Situație plată" cu: total / achitat / restant pentru clubul curent la competiția selectată, tabel detaliat (participant, club dacă ești super admin, categorie, probă, status plată, sumă) și rând TOTAL în footer. Sumele sunt calculate din înscrierile și echipele salvate în DB, nu din state-ul wizardului de înscriere.
  </what-built>
  <how-to-verify>
1. `npm run dev`, autentifică-te ca ADMIN_CLUB la un club cu înscrieri reale (ex. competiția CN QKD Juniori1/Seniori/Veterani sau „Cupa").
2. Competiții → deschide competiția → tab **Raport**.
3. Confirmă că apare secțiunea „Situație plată" cu Total / Achitat / Restant și tabelul detaliat.
4. **Verificare cheie (dublare taxă echipă):** dacă clubul are cel puțin o echipă înscrisă, confirmă că echipa apare pe UN SINGUR rând (badge ECH, cu denumirea echipei), nu câte un rând per membru, și că taxa ei apare o singură dată în total.
5. Compară `Total` cu tab-ul admin **Financiar** (dacă ai acces de super admin): totalul clubului tău trebuie să fie identic cu `totalCalculat` afișat acolo pentru același club.
6. Aplică un filtru din bara de filtre (ex. gen sau probă): tabelul și `Total` se restrâng, iar rândul „Total competiție (fără filtre)" apare și rămâne la suma completă.
7. Verifică pe mobil (DevTools ~390px lățime): tabelul are scroll orizontal, nu sparge layoutul.
8. Ca ADMIN_CLUB, confirmă că NU apar rânduri ale altor cluburi.
9. Apasă „Imprimă" — noua secțiune apare în previzualizarea de print.
  </how-to-verify>
  <verify>
    <human-check>Utilizatorul confirmă pașii 1-9 din how-to-verify direct în browser.</human-check>
  </verify>
  <done>Utilizatorul a răspuns „approved" după parcurgerea pașilor de verificare, sau problemele raportate au fost remediate și re-verificate.</done>
  <resume-signal>Scrie „approved" sau descrie ce nu se potrivește (sume greșite, echipă dublată, layout rupt, rânduri din alt club).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| club admin → date financiare multi-club | Un ADMIN_CLUB nu trebuie să vadă sumele altor cluburi; datele ajung în componentă prin props fetch-uite pentru întreaga competiție |
| UI read-only → DB | Tab-ul Raport nu trebuie să poată modifica statusul de plată |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-nvc-01 | Information Disclosure | RaportInscrieri.tsx — agregare rânduri | mitigate | Rândurile financiare se construiesc DOAR din `inscrieri`/`echipe` pre-filtrate cu `(isAdmin \|\| club_id === myClubId)`; ambele memo-uri (`plataFiltrata`, `plataTotala`) pornesc din liste scopate pe club. Verificat în Task 3 pas 8. Strat secundar: RLS pe `inscrieri_competitie`/`echipe_competitie`. |
| T-nvc-02 | Tampering | RaportInscrieri.tsx | mitigate | Componenta rămâne strict read-only: gate automat în Task 2 impune zero apeluri `supabase` și zero mutații `taxa_achitata` în fișier. Editarea rămâne în FinanciarView (tab admin federație). |
| T-nvc-03 | Repudiation / date incorecte | utils/taxeCompetitie.ts | mitigate | Regula „un rând per echipă" (nu per membru) prevenită prin gate grep `echipa_sportivi == 0` în Task 1 + verificare umană pas 4/5 (reconciliere cu FinanciarView). |
| T-nvc-SC | Tampering | npm/pip/cargo installs | n/a | Zero pachete noi instalate — constrângere de proiect („fără librării externe noi"). Niciun install în acest plan. |
</threat_model>

<verification>
- `npx tsc --noEmit` trece fără erori noi (nu există alt linter în proiect).
- Zero migrații SQL, zero query-uri Supabase noi, zero dependențe npm noi.
- `git diff --name-only` conține exact `utils/taxeCompetitie.ts` și `components/Competitii/RaportInscrieri.tsx`.
- `Pas4Sumar.tsx`, `FinanciarView.tsx`, `components/Competitii/index.tsx` neatinse.
- Checkpoint uman aprobat (Task 3), inclusiv reconcilierea totalului cu tab-ul Financiar.
</verification>

<success_criteria>
- Tab-ul Raport afișează total de plată **cumulativ** pe toate înscrierile salvate în DB ale clubului la competiția selectată.
- Rânduri detaliate cu: nume sportiv / nume echipă, categorie (categorie.denumire), probă (+ tip probă), status plată, sumă per linie.
- Total general vizibil în footerul tabelului; totalul necumulat rămâne vizibil când filtrele sunt active.
- Taxa unei echipe contribuie o singură dată la total.
- Raport strict per competiția selectată și strict per clubul curent (super adminul vede toate cluburile, cu coloana Club).
- API-ul componentei neschimbat — `components/Competitii/index.tsx` nu necesită modificări.
</success_criteria>

<output>
Create `.planning/quick/260901-nvc-raport-plata-competitii-club-suma-cumula/260901-nvc-SUMMARY.md` when done
</output>
