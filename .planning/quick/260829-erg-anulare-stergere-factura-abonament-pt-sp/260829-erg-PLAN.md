---
phase: quick/260829-erg
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: false
requirements: [ANL-01, ANL-02, ANL-03, ANL-04, ANL-05, ANL-06]
files_modified:
  - supabase/migrations/20260829_add_status_anulat_plati.sql
  - types.ts
  - utils/paymentStatus.ts
  - services/facturaService.ts
  - hooks/usePrezenteLunare.ts
  - components/Plati/FacturiFaraPrezenta.tsx
  - components/Plati/PlatiScadente.tsx
  - components/UserProfile/FinanciarTab.tsx
  - components/UserProfile.tsx
  - components/LazyComponents.tsx
  - components/AppRouter.tsx
  - components/Header.tsx
  - components/menuConfig.ts
  - components/AdminMasterMap.tsx
  - components/Plati/AgingReport.tsx
  - components/Plati/RaportFinanciar.tsx
  - components/Plati/FamilyPaymentCard.tsx
  - components/Plati/FacturiPersonale.tsx
  - components/Sportivi/RaportCompletSportiv.tsx

must_haves:
  truths:
    - "Adminul deschide raportul 'Facturi fără Prezență' din meniul Plăți, alege lună+an (inclusiv luni istorice) și vede sportivii clubului curent cu factură de Abonament pe acea lună și 0 prezențe înregistrate."
    - "Adminul poate anula (soft) o astfel de factură — rândul rămâne în tabelul plati cu status 'Anulat'."
    - "O factură 'Anulat' nu mai apare în niciun total 'de încasat' (aging, raport financiar, restanțe familie, restanțe sportiv, sold portofel)."
    - "Adminul poate reactiva o factură anulată — revine la status 'Neachitat' (anularea e reversibilă)."
    - "Adminul poate șterge definitiv factura printr-o acțiune separată de anulare, cu modal de confirmare distinct și text explicit ireversibil."
    - "Facturile cu status 'Achitat' sau 'Achitat Parțial' NU pot fi nici anulate, nici șterse — acțiunile sunt blocate în UI și în serviciu."
    - "În lista de facturi din Plăți (PlatiScadente) fiecare factură de Abonament cu 0 prezențe în luna facturii are un indicator vizibil + acțiunile Anulează / Șterge definitiv."
    - "În profilul sportivului (tab Financiar) există același indicator '0 prezențe' + aceleași acțiuni pe facturile de Abonament."
  artifacts:
    - path: "supabase/migrations/20260829_add_status_anulat_plati.sql"
      provides: "CHECK constraint pe plati.status extins cu 'Anulat'"
      contains: "Anulat"
    - path: "hooks/usePrezenteLunare.ts"
      provides: "Set de chei sportivId-an-luna cu >=1 prezență, o singură interogare pe interval"
      exports: ["usePrezenteLunare", "cheiePrezenta"]
    - path: "components/Plati/FacturiFaraPrezenta.tsx"
      provides: "Raport dedicat lună+an cu acțiuni anulare/ștergere"
      min_lines: 150
    - path: "services/facturaService.ts"
      provides: "anuleazaFacturaAbonament, reactiveazaFacturaAbonament, stergeFacturaAbonament"
      exports: ["anuleazaFacturaAbonament", "reactiveazaFacturaAbonament", "stergeFacturaAbonament"]
    - path: "utils/paymentStatus.ts"
      provides: "status 'Anulat' în badge config + helperi esteAnulata / esteDeIncasat"
      exports: ["esteAnulata", "esteDeIncasat"]
  key_links:
    - from: "components/Plati/FacturiFaraPrezenta.tsx"
      to: "services/facturaService.ts"
      via: "import anuleazaFacturaAbonament / stergeFacturaAbonament"
      pattern: "anuleazaFacturaAbonament|stergeFacturaAbonament"
    - from: "components/Plati/FacturiFaraPrezenta.tsx"
      to: "hooks/usePrezenteLunare.ts"
      via: "usePrezenteLunare([{luna, an}])"
      pattern: "usePrezenteLunare"
    - from: "components/AppRouter.tsx"
      to: "components/Plati/FacturiFaraPrezenta.tsx"
      via: "case 'facturi-fara-prezenta' + Lazy.FacturiFaraPrezenta"
      pattern: "facturi-fara-prezenta"
    - from: "components/Plati/AgingReport.tsx"
      to: "utils/paymentStatus.ts"
      via: "esteDeIncasat în locul predicatului status !== 'Achitat'"
      pattern: "esteDeIncasat"
---

<objective>
Adaugă posibilitatea de a **anula (soft)** sau **șterge definitiv (hard)** o factură de Abonament pentru sportivii care nu au nicio prezență în luna facturată.

Purpose: azi, generarea lunară de abonamente creează facturi și pentru sportivii care nu au venit deloc la antrenament în luna respectivă. Adminul nu are niciun mecanism de corecție în afară de ștergerea brută (ireversibilă, fără urmă). Introducem un status nou `'Anulat'` — factura rămâne în DB pentru audit, iese din toate totalurile de încasat, și e reversibilă — plus o ștergere definitivă separată, cu confirmare distinctă.

Output:
- migrație SQL aplicată live care extinde CHECK-ul pe `plati.status`
- status `'Anulat'` propagat în tipuri, badge-uri și în toate agregările financiare
- 3 funcții noi în `services/facturaService.ts`
- hook nou `usePrezenteLunare` (o singură interogare pe interval, fără N+1)
- 3 suprafețe UI: raport nou dedicat, listă facturi din Plăți, tab Financiar din profilul sportivului
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@docs/baza-de-date.md
@types.ts
@utils/paymentStatus.ts
@services/facturaService.ts
@hooks/usePrezenteLuna.ts
@components/Plati/LuniLipsaWizard.tsx
@components/Plati/PlatiScadente.tsx
@components/Plati/GestiuneFacturi.tsx
@components/UserProfile/FinanciarTab.tsx
</context>

<discovery_findings>
Rezultatele explorării codebase-ului — folosește-le, NU le redescoperi:

**Unde e deja implementat afișajul prezențelor per factură (Faza 14, PLF-01):**
- `components/Plati/PlatiScadente.tsx:27-70` — `PrezenteFacturaRow`, rând expandabil, folosește `usePrezenteLuna`, montat lazy la click (linia 770).
- `components/UserProfile/FinanciarTab.tsx:38-84` — `PrezenteModalSection`, același pattern, montat în modalul de detalii factură (linia ~405).
- `hooks/usePrezenteLuna.ts` — hook per-sportiv-per-lună existent, sursă `vedere_prezenta_sportiv`, filtrează `status.toLowerCase() === 'prezent'`. **NU îl modifica** — rămâne folosit de cele două componente de mai sus.

**Care componentă listează facturi individuale de Abonament (întrebarea din spec):**
- `components/Plati/PlatiScadente.tsx` — DA, este lista principală de facturi (tabel desktop la liniile 696-785, carduri mobile de la 788). Are deja indicator prezențe. **Aceasta e ținta pentru suprafața UI #2.**
- `components/Plati/GestiuneFacturi.tsx` — listează facturi, dar e ecranul "Gestiune Facturi Manuale" (creare manuală). Primește doar propagarea badge-ului `'Anulat'` prin `getDisplayStatus`/`STATUS_DISPLAY_CONFIG` (deja folosite la liniile 496-505 și 546-550) — **nu primește acțiuni noi**, ca să nu dublăm două fluxuri de anulare.

**Convenția migrațiilor:** `supabase/migrations/YYYYMMDD_descriere.sql`. Ultima: `20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`. Folderul `sql/migrations/` e legacy fără numerotare — NU scrie acolo.

**Wiring pentru o vedere nouă (ancore exacte, model `gestiune-facturi`):**
- `types.ts:580` — union `View`
- `components/LazyComponents.tsx:34` — export lazy
- `components/AppRouter.tsx:221-222` — `case 'gestiune-facturi'` (model de props + `renderProtected(..., canManageFinances)`)
- `components/Header.tsx:38` — titlu vedere
- `components/menuConfig.ts:70` și `:157` — două secțiuni de rol
- `components/AdminMasterMap.tsx:97` și `:205` — hartă + `ItemCard`

**Sursa datelor pentru facturi:** `hooks/usePlati.ts` face `supabase.from('rbv_plati_club').select('*')` **fără paginare** → limita implicită PostgREST de 1000 rânduri. `filteredData.plati` poate fi trunchiat pentru cluburi cu istoric lung, deci raportul nou NU se poate baza pe el pentru luni istorice (vezi Task 4).

**Gotcha cunoscut (din memoria proiectului):** `.in('sportiv_id', [...])` cu sute de ID-uri produce URL supradimensionat și query care atârnă prin PostgREST. Hook-ul nou NU trebuie să folosească `.in()` cu lista de sportivi — RLS scopează deja pe club.

**Utilitar paginare existent:** `hooks/useDataProvider.ts:373` — `fetchAllPages(buildQuery)`, buclă pe `.range(from, to)`. Este local funcției, nu exportat.

**Modal de confirmare:** `components/ConfirmDeleteModal.tsx` acceptă `title`, `customMessage`, `confirmButtonText`, `confirmButtonVariant`, `icon` — suficient pentru a diferenția vizual anularea de ștergerea definitivă, fără componente noi în `ui.tsx`.
</discovery_findings>

<tasks>

<task type="auto">
  <name>Task 1: Migrație SQL — extinde CHECK-ul pe plati.status cu 'Anulat'</name>
  <files>supabase/migrations/20260829_add_status_anulat_plati.sql</files>
  <action>
Creează migrația care permite valoarea `Anulat` pe coloana `status` din tabelul `plati`.

Numele constrângerii CHECK existente NU este cunoscut și nu apare în niciun fișier din repo — poate fi auto-generat de Postgres (`plati_status_check`) sau poate lipsi complet. Scrie migrația defensiv, într-un bloc `DO $$ ... $$`:
1. Caută în `pg_constraint` toate constrângerile de tip `'c'` de pe `public.plati` a căror definiție (`pg_get_constraintdef`) conține atât `status` cât și `Achitat`.
2. Pentru fiecare, execută `ALTER TABLE public.plati DROP CONSTRAINT` cu numele găsit, prin `EXECUTE format(...)`.
3. După buclă, adaugă o constrângere nouă numită explicit `plati_status_check` cu lista completă de valori permise: `Achitat`, `Neachitat`, `Achitat Parțial`, `Anulat`. Atenție la diacritice — valoarea existentă în DB este exact `Achitat Parțial` cu `ț`.
4. Constrângerea nouă trebuie să accepte și `NULL` (folosește forma `status IS NULL OR status IN (...)`) dacă în DB există rânduri cu status NULL — verifică întâi cu un `SELECT count(*) FROM plati WHERE status IS NULL` și adaptează.

Adaugă în capul fișierului un comentariu-antet cu: data, scopul (anulare soft facturi abonament fără prezență), și mențiunea că migrația este idempotentă (poate fi rulată de mai multe ori).

NU adăuga politici RLS noi. Politicile `rbv_plati_update` și `rbv_plati_delete` reparate în Faza 25 acoperă deja UPDATE și DELETE scopate pe club — confirmă acest lucru printr-o interogare pe `pg_policies` pentru tabelul `plati` și notează rezultatul în SUMMARY (dacă UPDATE-ul pe status NU e permis pentru ADMIN_CLUB, oprește-te și raportează — nu inventa o politică nouă fără confirmare).

**Aplică migrația live** folosind tool-ul Supabase MCP `apply_migration` (proiectul acestui repo). Istoricul proiectului conține de două ori pattern-ul "migrație scrisă, NEaplicată live" (vezi STATE.md — `Needs SQL apply`) — nu îl repeta. Dacă tool-ul MCP nu e disponibil sau eșuează, NU continua cu restul planului: raportează blocajul.
  </action>
  <verify>
    <automated>Interoghează live prin Supabase MCP: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.plati'::regclass AND contype = 'c';` — rezultatul trebuie să conțină exact o constrângere pe `status` a cărei definiție include `'Anulat'`. Apoi rulează un test round-trip pe o factură reală de test: UPDATE la 'Anulat' reușește, UPDATE la o valoare inventată ('Xyz') eșuează cu eroare de constraint, apoi revino la statusul inițial.</automated>
  </verify>
  <done>Fișierul migrației există în `supabase/migrations/`, este aplicat live, `pg_constraint` confirmă `'Anulat'` în definiție, iar UPDATE-ul de test la 'Anulat' trece și cel la o valoare invalidă este respins.</done>
</task>

<task type="auto">
  <name>Task 2: Propagă statusul 'Anulat' în tipuri, badge-uri și în TOATE agregările financiare</name>
  <files>types.ts, utils/paymentStatus.ts, components/Plati/AgingReport.tsx, components/Plati/RaportFinanciar.tsx, components/Plati/FamilyPaymentCard.tsx, components/Plati/FacturiPersonale.tsx, components/Plati/PlatiScadente.tsx, components/UserProfile/FinanciarTab.tsx, components/Sportivi/RaportCompletSportiv.tsx, components/AdminMasterMap.tsx</files>
  <action>
**A. `types.ts` — extinde cele trei union-uri de status** (toate trei sunt `'Achitat' | 'Neachitat' | 'Achitat Parțial'` azi):
- linia 163, `Plata.status`
- linia 186, `VizualizarePlata.status`
- linia 199, `IstoricPlataDetaliat.status`
Adaugă `| 'Anulat'` la fiecare. Nu schimba nimic altceva în `types.ts` în acest task.

**B. `utils/paymentStatus.ts` — badge + helperi canonici:**
- Adaugă `'Anulat'` în union-ul `PaymentDisplayStatus`.
- Adaugă intrarea `'Anulat'` în `STATUS_DISPLAY_CONFIG`, cu stil vizual clar "stins": fundal slate translucid, text slate-500, border slate-600 și `line-through` în `cls`; `dotCls` slate-600; `label: 'Anulat'`.
- În `getDisplayStatus`, adaugă `if (plata.status === 'Anulat') return 'Anulat';` **înaintea** oricărui calcul de scadență — altfel o factură anulată ar fi afișată ca "Scadent"/"Restant!".
- În `getDaysOverdue`, returnează `0` pentru status `'Anulat'`.
- Exportă doi helperi noi, care devin sursa unică de adevăr pentru restul aplicației:
  - `esteAnulata(p: Pick<Plata, 'status'>): boolean` — `p.status === 'Anulat'`
  - `esteDeIncasat(p: Pick<Plata, 'status'>): boolean` — adevărat doar dacă statusul NU e `'Achitat'` ȘI NU e `'Anulat'`
  Documentează în JSDoc de ce există `esteDeIncasat`: predicatul vechi `status !== 'Achitat'` include din greșeală facturile anulate în sumele de încasat.

**C. Înlocuiește predicatul `status !== 'Achitat'` cu `esteDeIncasat(...)` la TOATE locurile unde el produce bani sau contorizează restanțe.** Lista exhaustivă găsită prin grep (verifică numerele de linie înainte de editare, s-au putut deplasa):
- `components/Plati/AgingReport.tsx:86`
- `components/Plati/RaportFinanciar.tsx:179, 199, 219, 268, 910, 942, 945`
- `components/Plati/FamilyPaymentCard.tsx:38, 39, 69`
- `components/Plati/FacturiPersonale.tsx:133`
- `components/Sportivi/RaportCompletSportiv.tsx:122`
- `components/UserProfile/FinanciarTab.tsx:134, 139` (filtrul "neachitate" și contorul `nrNeachitate`)
- `components/AdminMasterMap.tsx:121`
Import: `import { esteDeIncasat } from '<cale relativă>/utils/paymentStatus';`

**D. Locurile unde `status !== 'Achitat'` controlează un BUTON, nu bani** — acolo condiția devine `esteDeIncasat(p)` din alt motiv: nu vrei buton "Încasează" pe o factură anulată.
- `components/Plati/GestiuneFacturi.tsx:513` și `:561` (butoane Încasează desktop + mobil)
- `components/Plati/PlatiScadente.tsx:746` și `:856` (butoane Încasează desktop + mobil)
Notă: `components/Plati/TaxeAnuale.tsx:182` folosește `if (p.status !== 'Achitat') return false;` — acesta e un filtru de tip "doar achitate", semantica lui rămâne corectă. **NU îl modifica.**

**E. Soldul portofelului (`balances`, `components/Plati/PlatiScadente.tsx:98-122`)** — nu refactoriza logica. Adaugă strict un guard de skip la începutul callback-ului `(plati || []).forEach(p => { ... })` de la linia 113: dacă `esteAnulata(p)` → `return` imediat, fără să scadă `p.suma` din niciun balance. Restul funcției rămâne bit-identic. Comentariu în cod care explică de ce: o factură anulată nu mai reprezintă o datorie, deci nu are voie să reducă soldul.

**F. Selecția în masă pentru încasare, `components/Plati/PlatiScadente.tsx`** — facturile anulate nu pot fi selectate pentru încasare. În `handleSelectRow` (și în orice "selectează tot"), ignoră plățile pentru care `esteAnulata(p)` este adevărat, iar în rândul de tabel dezactivează checkbox-ul (`disabled`) pentru ele.

**G. Dropdown-ul de editare status, `components/Plati/GestiuneFacturi.tsx`** — state-ul `editStatus` are tipul `Plata['status']`, deci se lărgește automat. Verifică `<Select>`-ul de status din modalul de editare: dacă lista de opțiuni e hardcodată, adaugă opțiunea `Anulat` ca să nu apară dropdown gol pentru o factură deja anulată.
  </action>
  <verify>
    <automated>npm run lint</automated>
  </verify>
  <done>`npm run lint` (tsc --noEmit) trece fără erori. `grep -rn "status !== 'Achitat'" --include=*.tsx components/` întoarce **numai** ocurențe din fișiere neatinse intenționat (TaxeAnuale.tsx). `grep -rn "esteDeIncasat" --include=*.tsx components/ | wc -l` întoarce cel puțin 18 ocurențe. `grep -n "Anulat" utils/paymentStatus.ts | grep -v '^\s*//' | wc -l` >= 4.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Serviciu (anulare/reactivare/ștergere) + hook usePrezenteLunare</name>
  <files>services/facturaService.ts, hooks/usePrezenteLunare.ts, services/facturaService.test.ts</files>
  <behavior>
    - `anuleazaFacturaAbonament` pe o factură cu status 'Neachitat' → returnează `{ data: Plata cu status 'Anulat', error: null }`
    - `anuleazaFacturaAbonament` pe o factură cu status 'Achitat' → returnează `{ data: null, error: { message: conține 'achitat' } }`, fără UPDATE
    - `anuleazaFacturaAbonament` pe o factură cu status 'Achitat Parțial' → refuzată, mesaj despre încasări existente
    - `anuleazaFacturaAbonament` pe o factură deja 'Anulat' → idempotent, returnează factura curentă fără eroare
    - `reactiveazaFacturaAbonament` pe o factură 'Anulat' → status revine la 'Neachitat'
    - `reactiveazaFacturaAbonament` pe o factură care nu e 'Anulat' → eroare, fără UPDATE
    - `stergeFacturaAbonament` pe factură 'Neachitat' fără referințe → DELETE reușit
    - `stergeFacturaAbonament` pe factură 'Achitat' → refuzată
    - `stergeFacturaAbonament` pe factură referențiată în `inscrieri_examene` → refuzată cu mesaj explicit
    - `stergeFacturaAbonament` pe factură inclusă în `tranzactii.plata_ids` → refuzată cu mesaj explicit
    - `cheiePrezenta(sportivId, luna, an)` → string stabil de forma `sportivId-an-luna` (lună nepadded)
  </behavior>
  <action>
**A. `services/facturaService.ts` — trei funcții noi**, în stilul existent din acest fișier: JSDoc în română, validare de input înainte de orice `await`, întotdeauna `Promise<{ data, error }>`, niciodată `throw`, `console.error` cu prefix `[numeFunctie]`.

`anuleazaFacturaAbonament(plataId: string): Promise<{ data: Plata | null; error: any }>`
- Validează că `plataId` e string nevid.
- Re-citește statusul real din DB (`select('id, status, tip').eq('id', plataId).maybeSingle()`) **înainte** de UPDATE. Motiv: același guard server-side ca la ștergere în `PlatiScadente.tsx:409-421` (comentat acolo ca `PLF-04 guard`, threat T-14-04) — statusul din state-ul clientului poate fi învechit dacă alt admin a încasat între timp.
- Dacă rândul nu există → eroare "Factura nu a fost găsită."
- Dacă `status === 'Achitat'` → refuză: "Factura este achitată. Storneaz-o sau mută încasarea înainte de anulare."
- Dacă `status === 'Achitat Parțial'` → refuză: "Factura are încasări parțiale. Anulează întâi încasările."
- Dacă `status === 'Anulat'` → returnează factura curentă cu `error: null` (idempotent, evită eroare la dublu-click).
- Altfel `update({ status: 'Anulat' })` + `.select().maybeSingle()`.
- NU modifica `suma`, `suma_initiala`, `observatii` sau alte coloane — anularea trebuie să fie perfect reversibilă.

`reactiveazaFacturaAbonament(plataId: string): Promise<{ data: Plata | null; error: any }>`
- Simetric: re-citește statusul; dacă nu e `'Anulat'` → eroare "Doar facturile anulate pot fi reactivate."; altfel `update({ status: 'Neachitat' })`.
- Notă în JSDoc: revenim la `'Neachitat'` pentru că anularea e permisă doar din `'Neachitat'` — deci nu se pierde informație.

`stergeFacturaAbonament(plataId: string): Promise<{ data: null; error: any }>`
- Replică **exact** lanțul de guard-uri deja implementat în `components/Plati/GestiuneFacturi.tsx:340-385` (nu îl reinventa, citește-l):
  1. re-citește `status` din DB; dacă `'Achitat'` → refuză;
  2. `select('id').eq('plata_id', plataId).limit(1)` pe `inscrieri_examene`; dacă există → refuză cu mesajul existent despre înscrieri la examene;
  3. **guard nou**, absent azi: verifică `tranzactii` care conțin `plataId` în array-ul `plata_ids` — folosește filtrul PostgREST `contains` pe coloana array (`.contains('plata_ids', [plataId])`), `limit(1)`; dacă există → refuză cu "Factura are încasări înregistrate în tranzacții. Nu poate fi ștearsă definitiv.";
  4. abia apoi `delete().eq('id', plataId)`.

**B. `hooks/usePrezenteLunare.ts` — hook nou, o singură interogare, fără N+1**

Export `cheiePrezenta(sportivId: string, luna: number, an: number): string` → `` `${sportivId}-${an}-${luna}` `` (lună 1-indexată, fără padding). Folosit identic la construcție și la lookup.

Export `usePrezenteLunare(luni: { luna: number; an: number }[], enabled = true)` — React Query, returnează `data: Set<string>` cu cheile sportivilor care au **cel puțin o prezență** în luna respectivă.

Implementare:
- Normalizează și dedublează `luni`; dacă lista e goală → query dezactivat, `data` = Set gol.
- Calculează `primaZi` = prima zi a celei mai vechi luni, `ultimaZi` = ultima zi a celei mai noi luni (pattern din `hooks/usePrezenteLuna.ts:37-38`: `new Date(an, luna, 0)` dă ultima zi a lunii).
- Guard de siguranță: dacă intervalul depășește 36 de luni, restrânge la ultimele 36 și loghează un `console.warn` — evită o interogare istorică nelimitată.
- **O singură** interogare pe `vedere_prezenta_sportiv`, `select('sportiv_id, data, status')`, `.gte('data', primaZi).lte('data', ultimaZi)`. **NU folosi `.in('sportiv_id', ...)`** — vezi gotcha din `<discovery_findings>` (URL supradimensionat, query care atârnă). RLS scopează deja rezultatul pe clubul din contextul activ.
- Paginează cu o buclă pe `.range(from, from + 999)` până când pagina întoarsă are sub 1000 de rânduri — altfel limita implicită PostgREST trunchiază tăcut prezențele și sportivi prezenți ar apărea fals ca "0 prezențe". Ordonează după `id` sau `data` ca paginarea să fie stabilă. Modelul de buclă: `hooks/useDataProvider.ts:373`.
- Filtrează rândurile cu `String(row.status ?? '').toLowerCase() === 'prezent'` (identic cu `usePrezenteLuna.ts:52`).
- Construiește Set-ul: pentru fiecare rând rămas, derivă luna/anul din `row.data` (`'YYYY-MM-DD'`) și adaugă `cheiePrezenta(row.sportiv_id, luna, an)`.
- `queryKey`: `['prezente-lunare', primaZi, ultimaZi]`. `staleTime`: 5 minute (consistent cu `usePrezenteLuna`).
- JSDoc care explică: acest hook răspunde la întrebarea "care sportivi AU prezență", deci absența cheii din Set = 0 prezențe.

**NU modifica `hooks/usePrezenteLuna.ts`** — rămâne folosit de `PrezenteFacturaRow` și `PrezenteModalSection`.

**C. Teste** — `services/facturaService.test.ts`. Proiectul nu are runner de teste configurat (`package.json` are doar `lint`). Verifică întâi: dacă nu există `vitest`/`jest` în devDependencies, **nu instala nimic** (constrângerea "fără librării externe noi"); în locul testelor unitare, scrie fișierul ca script `tsx` executabil (`npx tsx services/facturaService.test.ts`) care rulează scenariile din `<behavior>` pe DB-ul real folosind o factură de test creată și ștearsă la final, și scrie PASS/FAIL pe stdout cu exit code diferit de zero la eșec. Documentează în capul fișierului cum se rulează.
  </action>
  <verify>
    <automated>npm run lint && npx tsx services/facturaService.test.ts</automated>
  </verify>
  <done>`npm run lint` trece. Scriptul de test rulează toate scenariile din `<behavior>` și iese cu cod 0. `grep -c "export async function" services/facturaService.ts` >= 5. `hooks/usePrezenteLunare.ts` exportă `usePrezenteLunare` și `cheiePrezenta` și nu conține `.in(`.</done>
</task>

<task type="auto">
  <name>Task 4: Raport nou "Facturi fără Prezență" + wiring vedere</name>
  <files>components/Plati/FacturiFaraPrezenta.tsx, types.ts, components/LazyComponents.tsx, components/AppRouter.tsx, components/Header.tsx, components/menuConfig.ts, components/AdminMasterMap.tsx</files>
  <action>
**A. Componenta `components/Plati/FacturiFaraPrezenta.tsx`**

Props: `{ onBack: () => void; onViewSportiv?: (sportiv: Sportiv) => void; }` — model `GestiuneFacturi`/`PlatiScadente`.

Sursa datelor — decizie importantă, respect-o: **NU** citi facturile din `filteredData.plati`. `hooks/usePlati.ts` face `from('rbv_plati_club').select('*')` fără paginare, deci lovește limita implicită PostgREST de 1000 rânduri; pentru cluburi cu istoric lung, lunile vechi lipsesc din cache și raportul ar afișa tăcut date incomplete — inacceptabil pentru un ecran care declanșează ștergeri financiare. În schimb, interoghează direct, filtrat server-side pe luna aleasă:
`supabase.from('rbv_plati_club').select('*').eq('tip', 'Abonament').eq('luna', lunaSelectata).eq('an', anSelectat)`.
Aceasta e o singură interogare, câteva sute de rânduri maxim, și acoperă corect orice lună istorică. RLS + `rbv_plati_club` scopează deja pe clubul din contextul activ — **nu adăuga filtrare custom pe `club_id`**.

Împachetează interogarea într-un `useQuery` local (React Query, deja în proiect), `queryKey: ['facturi-abonament-luna', lunaSelectata, anSelectat, activeRoleContext?.id]`.

Prezențele: `usePrezenteLunare([{ luna: lunaSelectata, an: anSelectat }])` din Task 3.

Filtrare (client-side, pe cele două rezultate de mai sus):
- păstrează doar facturile cu `sportiv_id` non-null și `familie_id` null — facturile de familie acoperă mai mulți sportivi, deci "0 prezențe" nu are sens pentru ele (același raționament ca `PlatiScadente.tsx:707`, `showPrezente`); afișează separat, sub listă, un mesaj discret cu numărul de facturi de familie excluse din analiză, ca adminul să știe că nu sunt uitate;
- păstrează doar facturile pentru care cheia `cheiePrezenta(p.sportiv_id, luna, an)` **NU** există în Set-ul de prezențe;
- sortează alfabetic după numele sportivului (`localeCompare` cu locale `'ro-RO'`, ca la `GestiuneFacturi.tsx:77`).

Numele sportivului: folosește `formatNume` din `utils/formatareSportiv` cu sportivul din `filteredData.sportivi`; fallback pe `sportiv_nume`/`sportiv_prenume` de pe `Plata` (coloane deja prezente pe `rbv_plati_club`, vezi `types.ts:173-174`) când sportivul nu e în cache.

UI (doar componente existente din `components/ui.tsx` — `Card`, `Button`, `Select`, `Modal`, `EmptyState`; **nu adăuga nimic în `ui.tsx`**):
- Buton `onBack` + titlu, ca la `GestiuneFacturi.tsx:584-585`.
- Bara de selecție: `Select` pentru lună (1-12, nume în română) + `Select` pentru an. Anii disponibili: derivă lista dinamic din anii reali prezenți în `filteredData.plati` (pattern confirmat în quick task 260709-fth), plus anul curent; nu hardcoda un interval.
- Card sumar: numărul de facturi fără prezență și suma lor totală în RON.
- Lista: un rând/card per factură cu nume sportiv (clickabil → `onViewSportiv`), descriere, sumă, badge de status (folosește `getDisplayStatus` + `STATUS_DISPLAY_CONFIG`, ca să apară corect și cele deja anulate), și acțiuni.
- Acțiuni per rând, **trei butoane vizual distincte**:
  1. `Anulează` — `variant="secondary"`, iconiță de blocare/x; apelează `anuleazaFacturaAbonament`; se afișează doar dacă `esteDeIncasat(p)`.
  2. `Reactivează` — `variant="secondary"`; apelează `reactiveazaFacturaAbonament`; se afișează doar dacă `esteAnulata(p)`.
  3. `Șterge definitiv` — `variant="danger"`, `TrashIcon`; **acțiune separată de anulare, niciodată același buton**.
- Confirmare pentru anulare: `ConfirmDeleteModal` cu `title="Anulează factura"`, `confirmButtonText="Anulează factura"`, `confirmButtonVariant="secondary"`, `customMessage` care spune explicit că factura rămâne în evidență, iese din sumele de încasat și poate fi reactivată.
- Confirmare pentru ștergere definitivă: **al doilea** `ConfirmDeleteModal`, cu state separat, `title="Ștergere definitivă"`, `confirmButtonText="Șterge definitiv"`, `confirmButtonVariant="danger"`, `customMessage` care spune explicit că rândul dispare din baza de date, că acțiunea este **ireversibilă** și că alternativa recomandată este anularea.
- După fiecare acțiune reușită: `showSuccess` din `useError()`, apoi invalidează `queryKey`-ul local **și** cache-ul global de plăți (`queryClient.invalidateQueries({ queryKey: ['plati'] })` — cheia din `hooks/usePlati.ts:7`), ca lista din Plăți să nu rămână învechită. La eroare: `showError` cu `error.message`.
- Blochează dublu-click: un state `idInLucru: string | null` care dezactivează butoanele rândului cât timp rulează operația (pattern `isGenerating` din `LuniLipsaWizard.tsx:94-95`).
- Stări goale: `EmptyState` din `ui.tsx` (adăugat în Faza 25-02) — un mesaj pentru "nicio factură de abonament în luna aleasă" și altul, pozitiv, pentru "toți sportivii facturați au avut prezențe".
- Stare de încărcare: `Skeleton` din `ui.tsx`, ca în `FinanciarTab.tsx`.

Textele UI în română, cu diacritice corecte. Fișierul trebuie salvat UTF-8 fără mojibake (vezi bug-ul istoric de diacritice din quick task 260709-m7m).

**B. Wiring vederii** — nume de vedere: `'facturi-fara-prezenta'`, titlu afișat: `Facturi fără Prezență`.
- `types.ts:580` — adaugă `'facturi-fara-prezenta'` în union-ul `View`.
- `components/LazyComponents.tsx` (lângă linia 34) — `export const FacturiFaraPrezenta = lazy(() => import('./Plati/FacturiFaraPrezenta').then(m => ({ default: m.FacturiFaraPrezenta })));`
- `components/AppRouter.tsx` (lângă `case 'gestiune-facturi'`, linia 221) — `case 'facturi-fara-prezenta':` care returnează `renderProtected(<Lazy.FacturiFaraPrezenta onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} />, canManageFinances)`. Același guard de permisiune ca celelalte ecrane financiare.
- `components/Header.tsx:38` — adaugă `'facturi-fara-prezenta': 'Facturi fără Prezență',`
- `components/menuConfig.ts` — adaugă `{ label: 'Facturi fără Prezență', view: 'facturi-fara-prezenta' }` în **ambele** secțiuni unde apare deja `Gestiune Facturi` (liniile ~70 și ~157).
- `components/AdminMasterMap.tsx` — adaugă intrarea în maparea de titluri (linia ~97) și un `ItemCard` lângă cel de `gestiune-facturi` (linia ~205), cu o iconiță existentă din `components/icons`.
  </action>
  <verify>
    <automated>npm run lint && npm run build</automated>
  </verify>
  <done>`npm run lint` și `npm run build` trec. `grep -rn "facturi-fara-prezenta" --include=*.ts --include=*.tsx . | grep -v node_modules | grep -v worktrees | wc -l` >= 7 (types, LazyComponents, AppRouter, Header, menuConfig ×2, AdminMasterMap ×2). Componenta nu conține `filteredData.plati` ca sursă a listei de facturi și conține două instanțe distincte de `ConfirmDeleteModal`.</done>
</task>

<task type="auto">
  <name>Task 5: Indicator "0 prezențe" + acțiuni în lista de facturi din Plăți</name>
  <files>components/Plati/PlatiScadente.tsx</files>
  <action>
Extinde lista existentă de facturi (tabel desktop liniile ~696-785 și cardurile mobile de la ~788) — **nu** rescrie componenta, adaugă incremental.

**A. Set-ul de prezențe pentru lunile vizibile, o singură interogare:**
- Construiește un `useMemo` `luniVizibile` peste `platiCuDetalii`: pentru fiecare plată cu `tip === 'Abonament'`, `sportiv_id` non-null și `familie_id` null, derivă `{ luna, an }` folosind **exact** fallback-ul deja existent la liniile 708-709 (`p.luna ?? luna din p.data`, `p.an ?? anul din p.data`). Dedublează perechile.
- `const prezenteSet = usePrezenteLunare(luniVizibile)` — un singur hook la nivel de componentă. **Nu** apela `usePrezenteLuna` per rând: ar produce N interogări.
- Derivă per rând `faraPrezenta = showPrezente && luna && an && !prezenteSet.data?.has(cheiePrezenta(p.sportiv_id, luna, an))`. Cât timp query-ul e în `isLoading`, tratează `faraPrezenta` ca `false` (nu afișa un indicator fals-pozitiv pe date neîncărcate).

**B. Indicator vizual:** lângă badge-ul existent de prezențe (butonul de expandare, liniile 722-731), când `faraPrezenta` este adevărat, afișează un badge distinct de avertizare — fundal ambru translucid, `ExclamationTriangleIcon` din `components/icons`, text `0 prezențe`, cu `title` explicativ. Badge-ul se afișează și pe cardurile mobile.

**C. Acțiuni noi în celula de acțiuni (liniile ~744-764) și în cardul mobil corespondent:**
- `Anulează` — vizibil doar când `p.tip === 'Abonament'` și `esteDeIncasat(p)`; `variant="secondary"`; deschide modalul de confirmare a anulării.
- `Reactivează` — vizibil doar când `esteAnulata(p)`; `variant="secondary"`.
- Butonul `Șterge` existent rămâne neschimbat ca poziție și comportament, dar textul modalului lui trebuie să devină explicit ireversibil (vezi punctul D).
Refolosește `anuleazaFacturaAbonament` / `reactiveazaFacturaAbonament` din `services/facturaService.ts` — **nu** scrie UPDATE-uri inline pe `supabase.from('plati')` în componentă.

**D. Modale de confirmare distincte:** adaugă un state nou `plataToAnula` (separat de `plataToDelete` existent) și un al doilea `ConfirmDeleteModal` cu `title="Anulează factura"`, `confirmButtonVariant="secondary"` și `customMessage` care explică efectul reversibil. Modalul existent de ștergere primește `title="Ștergere definitivă"`, `confirmButtonText="Șterge definitiv"` și un `customMessage` care spune că acțiunea e ireversibilă și sugerează anularea ca alternativă. Cele două confirmări trebuie să fie clar diferite vizual și textual.

**E. Actualizare de stare după acțiune:** la succes, actualizează `setPlati` local (`prev.map(...)` pentru anulare/reactivare, `prev.filter(...)` pentru ștergere), la fel cum face codul existent al ștergerii; afișează `showSuccess`. Blochează dublu-click cu un state de tip `idInLucru`.

**F. Rândurile anulate** rămân vizibile în listă (nu le filtra), dar: badge-ul de status afișează deja `Anulat` prin `getDisplayStatus` (Task 2), checkbox-ul de selecție este `disabled` (Task 2, punct F), iar butonul `Încasează` nu apare (Task 2, punct D). Verifică vizual că toate trei se comportă așa.

`components/Plati/GestiuneFacturi.tsx` **nu** primește acțiuni noi în acest task — doar moștenește badge-ul `Anulat` din Task 2, ca să nu existe două fluxuri paralele de anulare.
  </action>
  <verify>
    <automated>npm run lint && npm run build</automated>
  </verify>
  <done>`npm run lint` și `npm run build` trec. `grep -c "usePrezenteLunare" components/Plati/PlatiScadente.tsx` == 1 apel de hook (nu per rând). `grep -c "ConfirmDeleteModal" components/Plati/PlatiScadente.tsx` >= 2. `grep -c "anuleazaFacturaAbonament\|reactiveazaFacturaAbonament" components/Plati/PlatiScadente.tsx` >= 2. Fișierul nu conține `from('plati').update` inline.</done>
</task>

<task type="auto">
  <name>Task 6: Indicator + acțiuni în tab-ul Financiar din profilul sportivului</name>
  <files>components/UserProfile/FinanciarTab.tsx, components/UserProfile.tsx</files>
  <action>
**A. `components/UserProfile.tsx`** — adaugă handlerii de anulare/reactivare/ștergere-definitivă și pasează-i mai jos:
- State nou `plataToAnula: Plata | null` (separat de `plataToDelete` existent, linia 141) + `isAnuland`.
- `handleAnuleazaPlata(plataId)` / `handleReactiveazaPlata(plataId)` — apelează serviciile din `services/facturaService.ts`, iar la succes actualizează `setPlati` cu `prev.map(...)` și afișează `showSuccess`; la eroare `showError`.
- Al doilea `ConfirmDeleteModal` (lângă cel existent de la linia 896) pentru anulare, cu `title="Anulează factura"`, `confirmButtonVariant="secondary"` și mesaj despre reversibilitate. Modalul de ștergere existent primește `title="Ștergere definitivă"`, `confirmButtonText="Șterge definitiv"` și mesaj explicit ireversibil.
- Pasează spre `FinanciarTab` (linia ~852) props noi: `setPlataToAnula` și `onReactivare`.

**B. `components/UserProfile/FinanciarTab.tsx`:**
- Extinde `FinanciarTabProps` cu `setPlataToAnula: (plata: Plata | null) => void;` și `onReactivare: (plata: Plata) => void;`.
- Un singur `usePrezenteLunare(...)` la nivelul componentei, peste lunile facturilor de Abonament din `istoricFacturi` (derivă `{luna, an}` din `detalii.data_emitere`, întrucât `VizualizarePlata` nu poartă coloanele `luna`/`an`; pentru fiecare intrare caută plata corespunzătoare în `plati` după `plata_id` și preferă `plata.luna`/`plata.an` când există). **Nu** apela `usePrezenteLuna` per card — ar produce N interogări; `PrezenteModalSection` existent rămâne neschimbat, e lazy și rulează doar la deschiderea modalului de detalii.
- În cardul fiecărei facturi (bucla de la linia 241), pentru facturile de Abonament fără familie și fără prezență în lună, afișează același badge de avertizare ca în Task 5 (ambru, `ExclamationTriangleIcon`, text `0 prezențe`), pe linia descrierii.
- În rândul de acțiuni al cardului (liniile 313-331), lângă `Editează` și `Șterge`, adaugă `Anulează` (vizibil când `esteDeIncasat`) și `Reactivează` (vizibil când `esteAnulata`). Butonul `Șterge` existent își păstrează poziția.
- `StatusBadge` local (liniile 86-95) tratează doar `Achitat` și `Achitat Parțial`, restul cade pe stilul implicit — adaugă o ramură pentru `Anulat` cu stil stins + `line-through`, consistent cu `STATUS_DISPLAY_CONFIG`. La fel pentru `ProgressBar` (liniile 98-111): pentru status `Anulat` folosește o culoare neutră slate, nu roșu.
- Filtrele `toate | neachitate | achitate` (linia 133): `neachitate` folosește deja `esteDeIncasat` după Task 2, deci facturile anulate nu mai apar acolo — corect. Verifică faptul că apar în `toate`.
  </action>
  <verify>
    <automated>npm run lint && npm run build</automated>
  </verify>
  <done>`npm run lint` și `npm run build` trec. `grep -c "usePrezenteLunare" components/UserProfile/FinanciarTab.tsx` == 1. `grep -c "setPlataToAnula" components/UserProfile.tsx components/UserProfile/FinanciarTab.tsx` >= 3. `grep -c "Anulat" components/UserProfile/FinanciarTab.tsx` >= 2.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Flux complet de anulare / reactivare / ștergere definitivă a facturilor de Abonament pentru sportivii fără prezență:
- migrație SQL aplicată live (status `Anulat` acceptat pe `plati`)
- status propagat în tipuri, badge-uri și în toate agregările financiare (aging, raport financiar, restanțe familie/sportiv, sold portofel)
- 3 funcții noi de serviciu cu guard-uri server-side (achitat / parțial / referințe în examene / referințe în tranzacții)
- hook `usePrezenteLunare` — o singură interogare paginată per ecran
- 3 suprafețe UI: raport nou `Facturi fără Prezență`, lista de facturi din Plăți, tab Financiar din profilul sportivului
  </what-built>
  <how-to-verify>
Rulează `npm run dev` și loghează-te ca ADMIN_CLUB pe un club cu date reale.

1. **Raportul nou:** meniu Plăți → `Facturi fără Prezență`. Alege o lună **istorică** în care știi că există abonamente generate. Verifică: se afișează doar sportivii cu factură de Abonament pe acea lună și 0 prezențe; suma totală din cardul sumar corespunde listei; facturile de familie sunt menționate separat ca excluse.
2. **Cross-check manual:** ia un sportiv din listă, deschide-i profilul → tab Prezență / Grupe și confirmă că într-adevăr nu are nicio prezență în luna aia. Apoi ia un sportiv care NU apare în listă și confirmă că are prezențe.
3. **Anulare:** apasă `Anulează` pe un rând. Confirmă în modal (textul trebuie să spună că e reversibilă). Verifică: statusul devine `Anulat`, badge-ul e stins/tăiat.
4. **Excludere din totaluri:** du-te la Plăți → Raport Financiar și la Aging Report. Suma de încasat trebuie să scadă exact cu suma facturii anulate. Verifică și soldul din profilul sportivului (tab Financiar / portofel) — nu mai trebuie să apară acea datorie.
5. **Reversibilitate:** revino în raport, apasă `Reactivează`. Statusul revine la `Neachitat` și suma reapare în totaluri.
6. **Guard-uri:** încearcă `Anulează` pe o factură `Achitat` și pe una `Achitat Parțial` — butonul nu trebuie să fie disponibil; dacă forțezi prin altă cale, mesajul de eroare trebuie să fie explicit.
7. **Ștergere definitivă:** pe o factură de test (creează una din Gestiune Facturi dacă e nevoie), apasă `Șterge definitiv`. Modalul trebuie să fie **vizibil diferit** de cel de anulare (buton roșu, text "ireversibil"). Confirmă și verifică că rândul dispare complet.
8. **Suprafața #2:** meniu Plăți → lista de facturi. Găsește o factură de Abonament pe o lună fără prezențe: trebuie să vezi badge-ul ambru `0 prezențe` + butonul `Anulează`. Anulează de aici; verifică că rândul rămâne vizibil, tăiat, cu checkbox-ul de selecție dezactivat și fără buton `Încasează`.
9. **Suprafața #3:** profil sportiv → tab Financiar. Aceleași indicator + acțiuni pe cardul facturii. Verifică și că filtrul `neachitate` nu mai include factura anulată, dar `toate` o include.
10. **Mobil:** micșorează fereastra sub 768px și repetă pașii 8-9 pe cardurile mobile.
11. **Diacritice:** verifică că toate textele noi apar corect (`fără`, `Prezență`, `Șterge`, `Parțial`) — fără mojibake.
  </how-to-verify>
  <resume-signal>Scrie "aprobat" sau descrie problemele găsite (indică pasul).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → PostgREST (`plati` UPDATE/DELETE) | Adminul de club trimite `plataId`; RLS `rbv_plati_update` / `rbv_plati_delete` (reparate în Faza 25) sunt singura barieră reală de scoping pe club |
| browser → PostgREST (`vedere_prezenta_sportiv` SELECT) | Interogare fără filtru de club în cod — depinde exclusiv de RLS pe tabelele subiacente |
| state client → decizie financiară | Statusul afișat în UI poate fi învechit față de DB (alt admin încasează în paralel) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ERG-01 | Tampering | `anuleazaFacturaAbonament` / `stergeFacturaAbonament` | mitigate | Re-citire obligatorie a statusului din DB înainte de UPDATE/DELETE (Task 3, punct A) — nu se ia decizia pe statusul din state-ul clientului; același pattern ca guard-ul PLF-04 existent (`PlatiScadente.tsx:409-421`) |
| T-ERG-02 | Elevation of Privilege | UPDATE `plati.status` cross-club | accept | RLS `rbv_plati_update` scopat pe club, verificat și reparat în Faza 25 (25-01). Task 1 cere confirmarea prin `pg_policies` înainte de a merge mai departe; nu se adaugă filtrare custom pe `club_id` în cod (ar masca o eventuală regresie RLS) |
| T-ERG-03 | Denial of Service | `usePrezenteLunare` | mitigate | Interzis `.in('sportiv_id', [...])` (gotcha URL supradimensionat, incident cunoscut pe `vedere_istoric_grade_sportiv`); interval limitat la 36 de luni; paginare `.range()` explicită |
| T-ERG-04 | Information Disclosure | `vedere_prezenta_sportiv` fără filtru de club | accept | View-ul e scopat prin RLS pe `prezenta_antrenament` / `program_antrenamente` (deja documentat ca T-14-02 în `hooks/usePrezenteLuna.ts`); pentru SUPER_ADMIN vizibilitatea multi-club este intenționată |
| T-ERG-05 | Repudiation | ștergere definitivă factură | mitigate | Anularea soft e acțiunea implicită și e reversibilă; ștergerea hard e o acțiune vizual separată, cu al doilea modal, buton roșu și text ireversibil; `audit_log` existent (trigger CRUD, quick 260704-x9p) captează DELETE-ul pe `plati` |
| T-ERG-06 | Tampering | pierdere de bani prin ștergerea unei facturi cu încasări | mitigate | Guard nou în `stergeFacturaAbonament`: refuz dacă `plataId` apare în `tranzactii.plata_ids` (Task 3, punct A3) — guard care lipsește azi din `GestiuneFacturi.handleDelete` |
| T-ERG-07 | Tampering | facturi anulate rămân în sumele de încasat | mitigate | Helper canonic `esteDeIncasat` aplicat exhaustiv la cele 16 situri de agregare enumerate în Task 2, punct C + guard de skip în `balances` (punct E) |
| T-ERG-08 | Denial of Service | dublu-click → UPDATE/DELETE repetat | mitigate | State `idInLucru` care dezactivează butoanele rândului (pattern `isGenerating` din `LuniLipsaWizard.tsx`); `anuleazaFacturaAbonament` este idempotent pe status `Anulat` |
| T-ERG-09 | Information Disclosure | raport incomplet din cauza limitei PostgREST de 1000 rânduri | mitigate | Raportul interoghează `rbv_plati_club` filtrat server-side pe lună/an în loc să folosească `filteredData.plati` (trunchiat); `usePrezenteLunare` paginează explicit |
</threat_model>

<verification>
1. `npm run lint` (tsc --noEmit) trece fără erori după fiecare task.
2. `npm run build` trece după task-urile 4, 5, 6.
3. `pg_constraint` pe `public.plati` conține `'Anulat'` în definiția CHECK-ului de status (verificat live, nu doar în fișierul de migrație — vezi lecția din `feedback_audit_rls_verifica_live_nu_doar_migratii`).
4. Scriptul de test al serviciului iese cu cod 0.
5. `grep -rn "status !== 'Achitat'" --include=*.tsx components/` nu mai întoarce niciun sit de agregare financiară.
6. Niciun apel `usePrezenteLuna` nou per rând de listă; fiecare ecran folosește un singur `usePrezenteLunare`.
7. Checkpoint uman aprobat.
</verification>

<success_criteria>
- Adminul poate, din oricare dintre cele 3 suprafețe UI, să identifice o factură de Abonament pe o lună fără prezențe și să o anuleze sau să o șteargă definitiv, cu confirmări distincte.
- O factură anulată: rămâne în DB, e vizibilă cu badge stins, nu apare în niciun total de încasat, nu poate fi selectată pentru încasare, și poate fi reactivată.
- Facturile achitate sau parțial achitate nu pot fi anulate sau șterse, nici din UI, nici prin apel direct al serviciului.
- Migrația SQL este aplicată live și verificată prin interogare pe `pg_constraint`.
- Zero interogări N+1 introduse: fiecare ecran face o singură interogare de prezențe.
</success_criteria>

<out_of_scope>
Confirmat cu utilizatorul, **nu** atinge:
- generarea automată lunară de abonamente și `components/Plati/LuniLipsaWizard.tsx` (doar sursă de inspirație pentru pattern)
- refactorizarea logicii soldului de portofel — se adaugă strict guard-ul de skip pentru status `Anulat` (Task 2, punct E), restul rămâne bit-identic
- componente noi în `components/ui.tsx` — se consumă doar cele existente
- structura `DataContext` / `useDataProvider` — se adaugă doar hook-uri noi, fără refactorizare
- `hooks/usePrezenteLuna.ts` — rămâne neschimbat, folosit mai departe de `PrezenteFacturaRow` și `PrezenteModalSection`
- `components/Plati/TaxeAnuale.tsx:182` — predicat cu semantică "doar achitate", corect așa cum e
- acțiuni de anulare în `components/Plati/GestiuneFacturi.tsx` — primește doar propagarea badge-ului, ca să nu existe două fluxuri paralele
- worktree-ul `.claude/worktrees/agent-a89583b7127bd7e78/` — altă sesiune

**Risc rezidual de raportat în SUMMARY (nu de reparat aici):** `hooks/usePlati.ts` face `from('rbv_plati_club').select('*')` fără paginare — cache-ul global de plăți se trunchiază tăcut la 1000 de rânduri pentru cluburi cu istoric lung. Raportul nou ocolește problema prin interogare filtrată server-side, dar restul ecranelor financiare rămân expuse. Merită un todo separat.
</out_of_scope>

<output>
Creează `.planning/quick/260829-erg-anulare-stergere-factura-abonament-pt-sp/260829-erg-SUMMARY.md` la final.
</output>
