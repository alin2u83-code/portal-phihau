---
phase: quick-260908-tgu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/icons.tsx
  - components/Prezenta/PrezentaRapida.tsx
  - components/Prezenta/GestioneazaGrupaModal.tsx
autonomous: false
requirements: [QUICK-260908-TGU-01]

must_haves:
  truths:
    - "Instructorul/adminul vede un buton meniu 3 puncte langa numele fiecarei grupe din Prezenta Rapida (doar cand sectiunea are grupa_id real)"
    - "Click pe butonul 3 puncte deschide modalul GestioneazaGrupaModal fara navigare (activeView neschimbat)"
    - "La deschidere, sportivii care au deja grupa_id = grupa curenta apar bifati"
    - "Salvarea scrie grupa_id = grupa curenta pentru bifarile noi si grupa_id = null pentru debifari"
    - "Dupa salvare, lista de sportivi a sectiunii de prezenta reflecta noii membri fara reload manual"
    - "Rolul SPORTIV nu vede butonul 3 puncte"
    - "Butonul 'Alt sportiv' (AddExternalAthleteModal) functioneaza exact ca inainte"
  artifacts:
    - path: "components/Prezenta/GestioneazaGrupaModal.tsx"
      provides: "Modal lista bifabila sportivi club cu salvare batch grupa_id"
      min_lines: 90
      exports: ["GestioneazaGrupaModal"]
    - path: "components/Prezenta/PrezentaRapida.tsx"
      provides: "Buton 3 puncte in header sectiune + grupaId in TrainingSection"
      contains: "grupaId"
    - path: "components/icons.tsx"
      provides: "Icon 3 puncte vertical"
      contains: "EllipsisVerticalIcon"
  key_links:
    - from: "components/Prezenta/PrezentaRapida.tsx"
      to: "components/Prezenta/GestioneazaGrupaModal.tsx"
      via: "import + randare conditionata pe managingSection"
      pattern: "GestioneazaGrupaModal"
    - from: "components/Prezenta/GestioneazaGrupaModal.tsx"
      to: "tabela sportivi"
      via: "supabase update batch grupa_id"
      pattern: "from\\('sportivi'\\)\\.update"
    - from: "components/Prezenta/GestioneazaGrupaModal.tsx"
      to: "React Query cache"
      via: "invalidateQueries pe sportivi si grupe"
      pattern: "invalidateQueries"
    - from: "components/Prezenta/GestioneazaGrupaModal.tsx"
      to: "services/grupeIstoricService.ts"
      via: "mutaInGrupa / scoateDinGrupa"
      pattern: "mutaInGrupa|scoateDinGrupa"
---

<objective>
Adauga in **Prezenta Rapida** un buton meniu 3 puncte langa numele fiecarei grupe care deschide un modal inline (`GestioneazaGrupaModal`) cu lista bifabila a tuturor sportivilor activi ai clubului. Bifarea adauga sportivul in grupa (`sportivi.grupa_id = <grupa>`), debifarea il scoate (`grupa_id = null`). Salvarea face UPDATE batch si reimprospateaza lista de prezenta.

Purpose: instructorul poate corecta componenta unei grupe direct din ecranul de prezenta, fara sa navigheze in modulul Sportivi si sa piarda contextul sedintei de azi.
Output: 1 fisier nou (`GestioneazaGrupaModal.tsx`), 2 fisiere modificate (`PrezentaRapida.tsx`, `icons.tsx`). Zero dependinte noi, zero migratii DB.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Fisiere de lucru:
@components/Prezenta/PrezentaRapida.tsx
@components/icons.tsx

Referinta de pattern (NU se modifica, doar se citeste daca e nevoie):
@services/grupeIstoricService.ts
</context>

<interface_contract>
Contracte deja verificate in codebase — NU explora, foloseste-le direct:

**`components/ui.tsx`**
- `Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: ReactNode; persistent?: boolean }>` — randeaza prin portal in document.body, are deja header cu titlu + X, inchidere pe Escape si pe click backdrop, corp scrollabil `max-h-[90vh]`.
- `Button` — variante folosite in fisier: `primary`, `secondary`, `success`; accepta `isLoading`, `disabled`, `className`.

**`components/ErrorProvider.tsx`** — `useError()` returneaza `{ showError(title, error), showSuccess(title, message) }`.

**`contexts/DataContext.tsx`** — `useData()` returneaza (relevante aici): `filteredData.sportivi: Sportiv[]`, `grade`, `activeRoleContext`, `currentUser`. NU returneaza `permissions` — se apeleaza separat `usePermissions(activeRoleContext)`.

**`hooks/usePermissions.ts`** — `usePermissions(activeRoleContext)` returneaza `{ isSuperAdmin, isAdmin, isFederationAdmin, isAdminClub, isInstructor, isSportiv, hasAdminAccess, isFederationLevel, canManageFinances, canGradeStudents, visibleClubIds, hasClubFilter, checkMismatch }`.

**`types.ts` — `Sportiv`** (campuri folosite): `id`, `nume`, `prenume`, `status: 'Activ' | 'Inactiv'`, `grupa_id?: string | null`, `club_id?: string | null`, `grad_actual_id?: string | null`.
`filteredData.sportivi` contine deja `grupa_id` si `club_id` (confirmat in `hooks/useSportivi.ts` selectString) si este nepaginat pentru clubul activ (`pagination = undefined` in `useDataProvider.ts:102-107`).

**`services/grupeIstoricService.ts`**
- `mutaInGrupa(sportiviIds: string[], grupaId: string, grupaDenumire: string, clubId: string, userId: string | null, motiv?: string): Promise<void>`
- `scoateDinGrupa(sportiviIds: string[], userId: string | null): Promise<void>`

**React Query keys** — `['sportivi', filters, pagination, sort, contextId, loadAll]` si `['grupe', contextId, clubId]`. Invalidarea cu prefixul `['sportivi']` / `['grupe']` prinde toate variantele.

**Import React Query:** `import { useQueryClient } from '@tanstack/react-query';`
</interface_contract>

<tasks>

<task type="auto">
  <name>Task 1: Expune grupa_id in sectiuni si adauga butonul 3 puncte in header</name>
  <files>components/icons.tsx, components/Prezenta/PrezentaRapida.tsx</files>
  <action>
Pregateste infrastructura si trigger-ul UI. Modalul propriu-zis vine in Task 2.

**A. `components/icons.tsx`**
Adauga `MoreVertical` in lista de importuri din `lucide-react` (blocul de import de la liniile 2-12) si exporta la finalul fisierului, dupa `export const CopyIcon = Copy;`: `export const EllipsisVerticalIcon = MoreVertical;`. Respecta conventia de denumire heroicons-style deja folosita in fisier.

**B. `components/Prezenta/PrezentaRapida.tsx` — date**
1. In interfata `TrainingSection` adauga campul `grupaId: string | null;` imediat dupa `grup: string;`.
2. In `fetchTrainings`, in select-ul de la linia ~199, schimba `grupe(denumire, sportivi!grupa_id(...))` in `grupe(id, denumire, sportivi!grupa_id(...))`. Restul select-ului ramane identic — in prezent se aduce doar denumirea text a grupei, iar fara `id` modalul nu stie pe ce grupa sa scrie.
3. In maparea `built` (obiectul returnat la liniile ~244-266) adauga `grupaId: (t.grupe as any)?.id ?? null,` langa `grup:`.
4. Nu atinge logica de deduplicare (cheia ramane pe `denumire`), nu atinge `initialPresent`, `extraAthletes` sau `hasSavedData`.

**C. `components/Prezenta/PrezentaRapida.tsx` — permisiuni si stare**
5. Importa `usePermissions` din `'../../hooks/usePermissions'` si `EllipsisVerticalIcon` din `'../icons'`.
6. In corpul componentei, dupa `const { grade, activeRoleContext, currentUser, filteredData } = useData();`, adauga `const permissions = usePermissions(activeRoleContext);` si `const poateGestionaGrupa = permissions.isAdminClub || permissions.isInstructor;` (cerinta blocata: vizibil pentru INSTRUCTOR + ADMIN_CLUB; SUPER_ADMIN_FEDERATIE si SPORTIV nu il vad).
7. Adauga starea `const [managingSection, setManagingSection] = useState<TrainingSection | null>(null);` langa celelalte `useState`.
8. Adauga handler-ul `handleOpenGestionare(section: TrainingSection)`: daca `unsavedSectionIds.has(section.id)` este true, apeleaza `setWarningDialog({ sectionId: section.id, sectionName: section.grup, onContinue: () => { setWarningDialog(null); setManagingSection(section); } })` — refolosim `UnsavedWarningDialog` existent, pentru ca salvarea grupei declanseaza un refetch care ar sterge bifele de prezenta nesalvate. Altfel, `setManagingSection(section)` direct.

**D. `components/Prezenta/PrezentaRapida.tsx` — header restructurat (liniile ~512-552)**
Headerul curent este un singur `<button>` care contine tot. Un `<button>` nu poate contine alt `<button>` (DOM invalid + warning React), deci restructureaza-l astfel, pastrand IDENTIC continutul vizual si clasele existente:
- Elementul exterior devine `<div>` cu clasele actuale ale butonului (`w-full flex items-center justify-between px-4 py-3 transition-colors` + conditionalul `isExpanded ? 'bg-slate-800/20' : 'hover:bg-slate-800/30'`).
- Zona stanga: un `<div className="flex items-center gap-2 min-w-0">` care contine (1) un `<button onClick={() => handleToggleExpand(section.id)} className="min-w-0 text-left">` cu blocul existent titlu + badge-uri (`isUnsaved` dot, `CheckCircleIcon`) + paragraful cu orele, si (2) butonul 3 puncte.
- Zona dreapta: un `<button onClick={() => handleToggleExpand(section.id)} className="flex items-center gap-3 shrink-0 ml-3">` cu blocul existent counter prezenti/total + bara de progres + chevron rotativ.
- Butonul 3 puncte se randeaza doar cand `poateGestionaGrupa && section.grupaId` (fara `grupaId` nu exista tinta de scriere): `onClick={() => handleOpenGestionare(section)}`, `title="Gestioneaza sportivii din grupa"`, `aria-label` identic, `className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"`, continut `<EllipsisVerticalIcon className="w-4 h-4" />`.
- Butoanele de toggle sunt frati, nu imbricate — nu e nevoie de `stopPropagation`.

NU modifica: `AddExternalAthleteModal` si butonul "Alt sportiv" (liniile ~93-163 si ~570-575), `handleSave`, `toggleAthlete`, `markAll`, sortarea.
  </action>
  <verify>
    <automated>npm run lint</automated>
    <automated>grep -v '^\s*//' components/Prezenta/PrezentaRapida.tsx | grep -c "grupe(id, denumire" | grep -q '^1$' && echo OK-SELECT</automated>
    <automated>grep -v '^\s*//' components/Prezenta/PrezentaRapida.tsx | grep -c "poateGestionaGrupa" | grep -qv '^0$' && echo OK-PERM</automated>
    <automated>grep -v '^\s*//' components/icons.tsx | grep -q "EllipsisVerticalIcon = MoreVertical" && echo OK-ICON</automated>
  </verify>
  <done>`npm run lint` (tsc --noEmit) trece fara erori noi; `TrainingSection` are `grupaId`; query-ul aduce `grupe(id, denumire, ...)`; butonul 3 puncte apare in header doar pentru ADMIN_CLUB/INSTRUCTOR si doar cand `section.grupaId` e non-null; nu exista `<button>` imbricat in headerul sectiunii.</done>
</task>

<task type="auto">
  <name>Task 2: Creeaza GestioneazaGrupaModal si conecteaza-l la Prezenta Rapida</name>
  <files>components/Prezenta/GestioneazaGrupaModal.tsx, components/Prezenta/PrezentaRapida.tsx</files>
  <action>
**A. Fisier nou `components/Prezenta/GestioneazaGrupaModal.tsx`**

Exporta `export const GestioneazaGrupaModal: React.FC<Props>` cu props:
`{ grupaId: string; grupaDenumire: string; clubId: string | null; onClose: () => void; onSaved: () => void }`.

Hook-uri interne (modalul isi ia singur datele, exact ca `AddExternalAthleteModal`): `const { filteredData, grade, currentUser } = useData();`, `const { showError, showSuccess } = useError();`, `const queryClient = useQueryClient();`.

Stare: `search: string`, `selectedIds: Set<string>`, `saving: boolean`.

**Membri initiali (sursa de adevar pentru diff):** calculeaza o singura data la montare, intr-un `useRef`, setul de id-uri cu `s.grupa_id === grupaId` din `filteredData.sportivi`. Initializeaza `selectedIds` din acelasi set (lazy initializer `useState(() => new Set(...))`). NU recalcula setul initial din `filteredData` dupa montare — invalidarea cache-ului la salvare l-ar muta sub picioare si diff-ul ar iesi gresit.

**Lista de candidati** (`useMemo`): din `filteredData.sportivi`, filtreaza `s.status === 'Activ'`; daca `clubId` este non-null filtreaza si `s.club_id === clubId` (aparare in frontend impotriva scrierii cross-club, dublata de RLS); aplica filtrul de cautare pe `` `${s.nume} ${s.prenume}` `` lowercase, trim; sorteaza cu `localeCompare(..., 'ro-RO')` dupa nume apoi prenume. Fara `.slice()` — lista completa, cu scroll.

**UI** — foloseste `Modal` din `'../ui'` cu `isOpen` mereu `true` (randarea e controlata de parinte), `onClose={onClose}`, `title={`Gestioneaza grupa ${grupaDenumire}`}`. In corp:
1. Text explicativ scurt: bifat = in grupa, debifat = scos din grupa.
2. Input de cautare cu `SearchIcon` — replica stilul din `AddExternalAthleteModal` (`pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg ... focus:border-amber-500`), `autoFocus`.
3. Contor live: `{selectedIds.size} selectati din {candidati.length} sportivi activi`.
4. Lista scrollabila (`max-h-[50vh] overflow-y-auto`), fiecare rand un `<button type="button">` care comuta id-ul in `selectedIds`; in stanga o caseta patrata `w-5 h-5 rounded-md border-2` — bifata: `bg-amber-500 border-amber-500` cu bifa alba (SVG inline sau `CheckIcon` din `'../icons'`); nebifata: `border-slate-600 bg-transparent`. Foloseste amber, nu emerald, ca sa nu se confunde cu bifele de prezenta.
5. Pe fiecare rand: nume + prenume in centru; in dreapta numele gradului (din `grade` mapat pe `grad_actual_id`); iar daca `s.grupa_id && s.grupa_id !== grupaId`, un indiciu mic `text-[10px] text-amber-500/70` cu denumirea grupei curente sau textul "alta grupa" — utilizatorul trebuie sa vada ca bifarea il scoate dintr-o alta grupa.
6. Empty state: daca lista e goala, paragraf italic "Niciun sportiv activ gasit."
7. Footer: `Button variant="secondary"` "Anuleaza" (`onClose`) si `Button variant="primary"` "Salveaza" cu `isLoading={saving}`.

**`handleSave`:**
- `deAdaugat = [...selectedIds].filter(id => !initiali.has(id))`, `deEliminat = [...initiali].filter(id => !selectedIds.has(id))`.
- Daca ambele sunt goale: `onClose()` si return (fara request).
- `setSaving(true)`; daca `deAdaugat.length > 0`: `await supabase.from('sportivi').update({ grupa_id: grupaId }).in('id', deAdaugat)`; pe eroare `showError('Eroare', error.message)`, `setSaving(false)` si return — modalul RAMANE deschis cu selectia intacta.
- Daca `deEliminat.length > 0`: acelasi pattern cu `.update({ grupa_id: null }).in('id', deEliminat)`, aceeasi tratare de eroare.
- Istoric apartenenta (consistent cu `components/Sportivi/index.tsx:382-388` si `components/Grupe/index.tsx:205,246` — orice schimbare de `grupa_id` din aplicatie scrie in `sportiv_grupa_istoric`): daca `deAdaugat.length && clubId` -> `await mutaInGrupa(deAdaugat, grupaId, grupaDenumire, clubId, currentUser?.user_id || null)`; daca `deEliminat.length` -> `await scoateDinGrupa(deEliminat, currentUser?.user_id || null)`.
- `queryClient.invalidateQueries({ queryKey: ['sportivi'] })` si `queryClient.invalidateQueries({ queryKey: ['grupe'] })`.
- `showSuccess('Succes', ...)` cu numarul de adaugati si eliminati si denumirea grupei.
- `onSaved()` apoi `onClose()`; `setSaving(false)` pe toate iesirile.

**B. `components/Prezenta/PrezentaRapida.tsx` — wiring**
1. Importa `GestioneazaGrupaModal` din `'./GestioneazaGrupaModal'`.
2. Adauga handler-ul: `const handleGrupaSalvata = useCallback(async (sectionId: string) => { await fetchTrainings(); setExpandedIds(prev => new Set(prev).add(sectionId)); }, [fetchTrainings]);` — `fetchTrainings` reseteaza `expandedIds` la prima sectiune, deci re-expandam explicit sectiunea gestionata dupa ce refetch-ul s-a incheiat.
3. Randeaza modalul langa `AddExternalAthleteModal` (in jurul liniei ~648), conditionat pe `managingSection?.grupaId`: props `grupaId={managingSection.grupaId}`, `grupaDenumire={managingSection.grup}`, `clubId={clubId}`, `onClose={() => setManagingSection(null)}`, `onSaved={() => handleGrupaSalvata(managingSection.id)}`.
4. Nu schimba nimic in `AddExternalAthleteModal`, in dialogul `UnsavedWarningDialog` sau in fluxul de salvare a prezentei.

Nota asteptata: invalidarea `['sportivi']` schimba `filteredData.sportivi`, ceea ce schimba `sportivById` si deci identitatea `fetchTrainings`, declansand inca un refetch prin `useEffect`-ul existent de la linia ~280. Este benign si dorit (date proaspete) — nu adauga cod de suprimare.
  </action>
  <verify>
    <automated>npm run lint</automated>
    <automated>grep -v '^\s*//' components/Prezenta/GestioneazaGrupaModal.tsx | grep -q "grupa_id: grupaId" && grep -v '^\s*//' components/Prezenta/GestioneazaGrupaModal.tsx | grep -q "grupa_id: null" && echo OK-UPDATE</automated>
    <automated>grep -v '^\s*//' components/Prezenta/GestioneazaGrupaModal.tsx | grep -q "invalidateQueries" && grep -v '^\s*//' components/Prezenta/GestioneazaGrupaModal.tsx | grep -qE "mutaInGrupa|scoateDinGrupa" && echo OK-CACHE-ISTORIC</automated>
    <automated>grep -v '^\s*//' components/Prezenta/PrezentaRapida.tsx | grep -c "GestioneazaGrupaModal" | grep -qE '^[2-9]$' && echo OK-WIRING</automated>
    <automated>grep -v '^\s*//' components/Prezenta/PrezentaRapida.tsx | grep -q "AddExternalAthleteModal" && echo OK-SCOPE-INTACT</automated>
  </verify>
  <done>`npm run lint` trece; `GestioneazaGrupaModal.tsx` exista si exporta componenta; salvarea face doua UPDATE-uri batch conditionale (`grupa_id = grupaId` / `grupa_id = null`), scrie istoricul prin `grupeIstoricService` si invalideaza `['sportivi']` + `['grupe']`; modalul e randat din `PrezentaRapida` conditionat pe `managingSection?.grupaId`; eroarea de retea lasa modalul deschis cu selectia intacta.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Buton meniu 3 puncte langa numele fiecarei grupe in Prezenta Rapida (vizibil doar pentru ADMIN_CLUB si INSTRUCTOR), care deschide `GestioneazaGrupaModal` — lista bifabila cu toti sportivii activi ai clubului, cu membrii grupei deja bifati. Salvarea scrie `sportivi.grupa_id` in batch, scrie istoricul de apartenenta si reimprospateaza sectiunea de prezenta.
  </what-built>
  <how-to-verify>
1. Ruleaza `npm run dev` si intra in aplicatie cu un cont **ADMIN_CLUB** sau **INSTRUCTOR**, pe un club care are cel putin un antrenament programat azi.
2. Deschide modulul **Prezenta** (tab-ul cu Prezenta Rapida). Confirma ca langa numele fiecarei grupe apare butonul 3 puncte, iar restul headerului (titlu, ore, contor, chevron) arata si se comporta ca inainte — click pe titlu sau pe contor tot expandeaza/colapseaza sectiunea.
3. Deschide consola browserului: NU trebuie sa apara warning-ul `validateDOMNesting: <button> cannot appear as a descendant of <button>`.
4. Click pe butonul 3 puncte. Se deschide modalul "Gestioneaza grupa {nume grupa}" — **fara** navigare in alt ecran. Verifica: sportivii care sunt deja in grupa apar bifati; contorul "X selectati din Y" e corect; cautarea filtreaza lista.
5. **Bifeaza** un sportiv care nu e in grupa (observa indiciul de "alta grupa" daca provine din alta grupa) si **debifeaza** un sportiv existent. Apasa **Salveaza**.
6. Confirma: apare toast-ul de succes, modalul se inchide, iar lista de sportivi a sectiunii de prezenta se actualizeaza singura — sportivul adaugat apare in lista, cel eliminat dispare. Fara refresh manual de pagina.
7. Navigheaza in modulul **Sportivi** si confirma ca cei doi sportivi au acum grupa corecta (respectiv "fara grupa").
8. Intoarce-te in Prezenta Rapida, bifeaza cativa sportivi in lista de prezenta (fara sa salvezi), apoi apasa butonul 3 puncte: trebuie sa apara dialogul "Modificari nesalvate" inainte de a deschide modalul.
9. Verifica ca butonul "Alt sportiv" functioneaza in continuare la fel (adauga temporar un sportiv la sedinta, fara sa ii schimbe grupa).
10. Logheaza-te cu un cont **SPORTIV** (sau schimba contextul de rol) si confirma ca butonul 3 puncte NU apare.
  </how-to-verify>
  <resume-signal>Scrie "approved" sau descrie ce nu functioneaza</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> Supabase PostgREST | Clientul trimite direct UPDATE pe `sportivi.grupa_id`; id-urile de sportivi si de grupa vin din state-ul frontend, controlabil de utilizator |
| rol activ -> RLS | `active-role-context-id` injectat de `supabaseClient.ts` decide ce randuri poate scrie utilizatorul |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-TGU-01 | Tampering | `supabase.from('sportivi').update({ grupa_id })` in `GestioneazaGrupaModal` | mitigate | RLS pe tabela `sportivi` ramane poarta reala; in frontend candidatii sunt filtrati pe `s.club_id === clubId` cand `clubId` e non-null, deci nu se trimit niciodata id-uri din alte cluburi |
| T-TGU-02 | Elevation of Privilege | Butonul 3 puncte in headerul `TrainingSection` | mitigate | Randare conditionata pe `usePermissions(activeRoleContext)` -> `isAdminClub \|\| isInstructor`; ascunderea e doar UX, RLS ramane gardul efectiv (pattern documentat in CLAUDE.md: doua straturi) |
| T-TGU-03 | Repudiation | Schimbare de apartenenta la grupa fara urma auditabila | mitigate | `mutaInGrupa` / `scoateDinGrupa` scriu in `sportiv_grupa_istoric` cu `created_by = currentUser.user_id`, identic cu fluxurile existente din Sportivi si Grupe |
| T-TGU-04 | Information Disclosure | Lista completa a sportivilor clubului expusa in modal | accept | `filteredData.sportivi` este deja scopat pe clubul activ de `useDataProvider` si deja expus in `AddExternalAthleteModal` in acelasi ecran — nicio suprafata noua de date |
| T-TGU-SC | Tampering | npm/pip/cargo installs | accept | Zero pachete noi — nu se ruleaza niciun install; constrangerea de proiect interzice librarii externe noi |
</threat_model>

<verification>
1. `npm run lint` (tsc --noEmit) trece fara erori noi.
2. Consola browserului: zero warning `validateDOMNesting` pe headerul sectiunilor.
3. Un UPDATE reusit se reflecta in DB (verificabil din modulul Sportivi) si in UI-ul de prezenta fara refresh manual.
4. `AddExternalAthleteModal` si `components/Sportivi/index.tsx` raman functional neschimbate.
</verification>

<success_criteria>
- Din Prezenta Rapida, click pe meniul 3 puncte langa o grupa deschide modalul cu lista sportivilor clubului, cu cei din grupa curenta bifati.
- Bifare/debifare + Salveaza -> `UPDATE sportivi.grupa_id` (grupa curenta sau `null`) executat in batch, plus scriere in `sportiv_grupa_istoric`.
- Lista sectiunii de prezenta se actualizeaza automat dupa salvare (refetch local + invalidare React Query pe `sportivi` si `grupe`).
- Butonul e vizibil doar pentru INSTRUCTOR si ADMIN_CLUB, si doar pentru sectiuni cu `grupaId` non-null.
- Zero dependinte noi, zero migratii DB, zero regresii pe butonul "Alt sportiv" si pe fluxul de salvare a prezentei.
</success_criteria>

<output>
Create `.planning/quick/260908-tgu-prezenta-rapida-buton-meniu-3-puncte-lan/260908-tgu-SUMMARY.md` when done
</output>
