# 25-03 Audit Frontend: Derivare Club in Grupe / Prezenta / Plati

Audit exhaustiv al locurilor din codul frontend (foldere `components/Grupe`, `components/Prezenta`, `components/Plati`) care deriva clubul curent, pentru a confirma daca folosesc `activeRoleContext.club_id` (contextul activ, sursa de adevar trimisa si ca header `active-role-context-id` catre Supabase — vezi `supabaseClient.ts:10-12`) sau `currentUser.club_id` (clubul primar din profil, poate fi diferit pentru un user cu roluri la mai multe cluburi).

## Rezultate cautari

### 1. `grep -rn "currentUser\.club_id\|currentUser?\.club_id" components/Grupe components/Prezenta components/Plati`

```
components/Grupe/GrupaFormModal.tsx:100:                club_id: grupaToEdit?.club_id || (isFederationAdmin ? '' : currentUser.club_id || ''),
components/Grupe/GrupaFormModal.tsx:110:        const clubId = formState.club_id || currentUser.club_id;
components/Grupe/GrupaFormModal.tsx:113:    }, [localLocatii, formState.club_id, currentUser.club_id]);
components/Grupe/GrupaFormModal.tsx:180:                            clubId={formState.club_id || currentUser.club_id || null}
components/Prezenta/index.tsx:209:            const clubId = isFederationLevel ? null : (activeRoleContext?.club_id ?? currentUser?.club_id ?? null);
components/Prezenta/index.tsx:221:    }, [showError, activeRoleContext, currentUser?.club_id]);
components/Prezenta/index.tsx:288:                        clubId={currentUser.club_id}
components/Prezenta/index.tsx:359:                return <GeneratorProgramMasiv onBack={navigateBack} clubId={currentUser.club_id} onNavigateToGrupe={() => switchTab('grupe')} />;
components/Prezenta/index.tsx:459:                    clubId={activeRoleContext?.club_id ?? currentUser?.club_id ?? null}
components/Prezenta/PrezentaRapida.tsx:170:    const clubId: string | null = (activeRoleContext?.club_id ?? currentUser?.club_id) || null;
components/Plati/Familii.tsx:64:        const result = await handleCreateFamily(newFamilyName.trim(), [selectedSportiv1, selectedSportiv2], currentUser.club_id);
components/Plati/GestiuneFacturi.tsx:206:                club_id: sportivSelectat.club_id || currentUser.club_id,
components/Plati/JurnalIncasari.tsx:330:                let clubId = sportivPtClub?.club_id || currentUser?.club_id;
components/Plati/JurnalIncasari.tsx:404:                let clubId = sportiv?.club_id || currentUser?.club_id;
components/Plati/PlatiScadente.tsx:134:            const clubId = currentUser?.club_id;
components/Plati/TaxeAnuale.tsx:587:            club_id: currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE') ? null : currentUser.club_id
components/Plati/TipuriAbonament.tsx:41:    const effectiveClubId = activeRoleContext?.club_id || activeRoleContext?.club?.id || currentUser?.club_id;
```

### 2. `grep -rn "club_id" components/Grupe components/Prezenta | grep -v "activeRoleContext"`

Rezultatul complet (44 linii) confirma ca marea majoritate a aparitiilor `club_id` in afara celor deja acoperite la (1) sunt derivari **dintr-un record deja incarcat** (`grupa.club_id`, `antrenament.club_id`, `sportiv.club_id`), nu din profilul userului — vezi verdicte `OK-IRELEVANT` mai jos. Fisiere/linii relevante suplimentare fata de (1): `AdaugaSportiviModal.tsx:50,64`, `GenerareAntrenamenteModal.tsx:183`, `GeneratorProgramMasiv.tsx:27,54,81,147`, `GrupaDetailView.tsx:173,444`, `GrupeSecundareModal.tsx:107,113,133,143`, `Grupe/index.tsx:44,96,116,153`, `OrarEditorModal.tsx:43`, `OrarModificareModal.tsx:25,129,163,242`, `ProgramAntrenamenteManagement.tsx:53,58,67`, `Prezenta/index.tsx:52,213`, `ListaPrezentaAntrenament.tsx:174,182,218,272,274,309,614,734,818,827`, `OrarEditor.tsx:23`, `RaportLunarPrezenta.tsx:80,146,150`, `RaportPrezenta.tsx:55`.

### 3. `grep -rniE "FEDERATIE_ID|CLUB_ID *=|'[0-9a-f]{8}-...'" components/Grupe components/Prezenta components/Plati`

```
components/Plati/PlatiScadente.tsx:10:import { FEDERATIE_ID, FEDERATIE_NAME } from '../../constants';
components/Plati/PlatiScadente.tsx:644:                        renderOption={(c: Club) => c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}
```
(restul rezultatelor cautarii regex sunt suprapuneri cu `club_id` din cautarea 2, fara UUID-uri hardcodate reale gasite)

### 4. `grep -rn "activeRoleContext" components/Grupe components/Prezenta components/Plati`

```
components/Grupe/index.tsx:37,40,41,42
components/Grupe/ProgramAntrenamenteManagement.tsx:17,47
components/Prezenta/index.tsx:174,176,207,209,221,459
components/Prezenta/PrezentaRapida.tsx:169,170
components/Prezenta/RaportIntervalExamen.tsx:160,161
components/Prezenta/RaportLunarPrezenta.tsx:91,92,97
components/Plati/GestiuneFacturi.tsx:45,46
components/Plati/PerioadaVacanta.tsx:377,379,381
components/Plati/RaportFinanciar.tsx:54,275
components/Plati/TipuriAbonament.tsx:16,20,40,41
```

## Verdicte per loc

| Fisier:linie | Cod | Verdict | Motiv |
|---|---|---|---|
| `Grupe/GrupaFormModal.tsx:100` | `club_id: ... currentUser.club_id \|\| ''` | **FIX** | Clubul implicit al grupei noi vine din profil, nu din contextul activ. Confirmat de planner. |
| `Grupe/GrupaFormModal.tsx:110,113` | `const clubId = formState.club_id \|\| currentUser.club_id` | **FIX** | Filtrarea locatiilor disponibile foloseste clubul din profil ca fallback cand `formState.club_id` e gol (cazul grupei noi la non-federatie). Confirmat de planner. |
| `Grupe/GrupaFormModal.tsx:180` | `clubId={formState.club_id \|\| currentUser.club_id \|\| null}` | **FIX** | Aceeasi sursa ca mai sus, propagata catre `AddLocatieInline` (scriere `nom_locatii.club_id` la crearea unei locatii noi din modal). Se repara odata cu introducerea `activeClubId`. |
| `Prezenta/index.tsx:209,221` | `clubId = isFederationLevel ? null : (activeRoleContext?.club_id ?? currentUser?.club_id ?? null)` | **OK-FALLBACK** | Contextul activ are prioritate, `currentUser.club_id` e doar fallback. Acesta e pattern-ul de referinta mentionat in plan. |
| `Prezenta/index.tsx:288` | `clubId={currentUser.club_id}` (prop catre `DashboardPrezentaAzi`) | **FIX** | Deriva direct din profil, ignora total contextul activ calculat cateva linii mai sus. Confirmat de planner. |
| `Prezenta/index.tsx:359` | `clubId={currentUser.club_id}` (prop catre `GeneratorProgramMasiv`) | **FIX** | Idem — `GeneratorProgramMasiv` foloseste `clubId` doar pentru citire/scriere (`GeneratorProgramMasiv.tsx:54,147`), deci propagarea gresita ajunge direct in query si insert. Confirmat de planner. |
| `Prezenta/index.tsx:459` | `clubId={activeRoleContext?.club_id ?? currentUser?.club_id ?? null}` (prop catre `SediintaAziModal`) | **OK-FALLBACK** | Deja foloseste contextul activ cu prioritate; se aliniaza la valoarea unica derivata in Task 2, fara schimbare de comportament. |
| `Prezenta/PrezentaRapida.tsx:170` | `(activeRoleContext?.club_id ?? currentUser?.club_id) \|\| null` | **OK-FALLBACK** | Pattern corect, mentionat explicit ca referinta in plan. |
| `Plati/PlatiScadente.tsx:134` | `const clubId = currentUser?.club_id;` (in `handleGenerateSubscriptions`) | **FIX** | Generarea in masa de abonamente scrie in clubul din profil, desi `activeRoleContext` e usor de adaugat (pattern identic cu `Grupe/index.tsx:37`). Confirmat de planner. |
| `Plati/TipuriAbonament.tsx:41` | `activeRoleContext?.club_id \|\| activeRoleContext?.club?.id \|\| currentUser?.club_id` | **OK-FALLBACK** | Contextul activ prioritar. Fisier detinut de planul 25-02 — nu se atinge aici, doar confirmat corect. |
| `Plati/Familii.tsx:64` | `handleCreateFamily(..., currentUser.club_id)` | **FIX (in afara scope-ului acestui plan)** | Scrie `club_id` la crearea unei familii direct din profil; componenta nu primeste deloc `activeRoleContext` ca prop azi. Fisier neinclus in lista `files_modified` a acestui plan — vezi sectiunea Follow-up. |
| `Plati/GestiuneFacturi.tsx:206` | `club_id: sportivSelectat.club_id \|\| currentUser.club_id` | **FIX (in afara scope-ului acestui plan), risc redus** | Sursa primara e `sportivSelectat.club_id` (clubul real al sportivului selectat pe factura), corect scopat; `currentUser.club_id` intervine doar daca sportivul nu are club_id (caz de date incomplete). `activeRoleContext` e deja disponibil in componenta (linia 45) dar nefolosit aici. Risc mic, dar tot un FIX de facut ca fallback corect. Fisier neinclus in scope-ul acestui plan. |
| `Plati/JurnalIncasari.tsx:330,404` | `let clubId = sportivPtClub?.club_id \|\| currentUser?.club_id` | **FIX (in afara scope-ului acestui plan), risc redus** | Acelasi tipar ca `GestiuneFacturi.tsx`: sursa primara e clubul sportivului, fallback pe profil. Componenta primeste doar `currentUser`+`permissions` ca props, nu `activeRoleContext` — necesita prop nou (schimbare de semnatura, in afara acestui plan). |
| `Plati/TaxeAnuale.tsx:587` | `club_id: ... : currentUser.club_id` (creare taxa anuala noua) | **FIX (in afara scope-ului acestui plan)** | Scrie direct din profil, fara acces la `activeRoleContext` in componenta. Fisier neinclus in scope-ul acestui plan. |
| `Plati/PlatiScadente.tsx:644` | `c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume` | **OK-IRELEVANT** | Doar eticheta afisata intr-un `renderOption` al unui selector — nu influenteaza ce club se citeste/scrie. |
| Toate liniile din sectiunea "club_id" fara `currentUser`/`activeRoleContext` (ex. `grupa.club_id`, `antrenament.club_id`, `sportiv.club_id` in `AdaugaSportiviModal.tsx`, `GrupeSecundareModal.tsx`, `GeneratorProgramMasiv.tsx`, `GrupaDetailView.tsx`, `OrarEditorModal.tsx`, `OrarModificareModal.tsx`, `ProgramAntrenamenteManagement.tsx`, `ListaPrezentaAntrenament.tsx`, `OrarEditor.tsx`, `RaportLunarPrezenta.tsx`, `RaportPrezenta.tsx`, `Grupe/index.tsx:44,96,116,153`) | `s.club_id === grupa.club_id`, `club_id: grupa.club_id`, etc. | **OK-IRELEVANT** | Deriva clubul dintr-un record deja incarcat si deja scopat corect la nivel de fetch (grupa/antrenament/sportiv selectat), nu din profilul userului curent. Editarea unei grupe existente trebuie sa pastreze clubul acelei grupe, indiferent de contextul activ al userului care editeaza — comportament corect. |
| `Grupe/index.tsx:37,40,41,42` | `activeRoleContext?.club_id` | **OK-FALLBACK / Confirmat corect** | Pattern de referinta explicit mentionat in plan pentru derivarea `grupeClubId`. |
| `ProgramAntrenamenteManagement.tsx:17,47` | `activeRoleContext` | **Confirmat corect** | Foloseste `activeRoleName` din `activeRoleContext` pentru nivel federatie; nu deriva `club_id` direct din profil. |
| `RaportIntervalExamen.tsx:160-161`, `RaportLunarPrezenta.tsx:91-97` | `activeRoleContext` + `permissions.isFederationLevel` | **Confirmat corect** | `clubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null)` — fara fallback pe `currentUser`, cel mai strict pattern. |
| `PerioadaVacanta.tsx:377-381` | `const clubId = activeRoleContext?.club_id;` | **Confirmat corect** | Fara fallback pe profil deloc. |
| `RaportFinanciar.tsx:54,275` | `activeRoleContext?.club_id` (doar pentru afisare nume club in header raport) | **OK-IRELEVANT** | Text afisat, nu influenteaza query. |

## De reparat in Task 2

Locurile confirmate de planner, in scope-ul explicit al Task 2 (fisierele din `files_modified` ale acestui plan):

- `components/Prezenta/index.tsx:288`
- `components/Prezenta/index.tsx:359`
- `components/Plati/PlatiScadente.tsx:134`
- `components/Grupe/GrupaFormModal.tsx:100`
- `components/Grupe/GrupaFormModal.tsx:110`
- `components/Grupe/GrupaFormModal.tsx:180`

## Confirmat corect

- `components/Prezenta/index.tsx:209-221` — pattern canonic de derivare (federatie -> null, altfel context activ, fallback profil).
- `components/Prezenta/index.tsx:459` — `SediintaAziModal`, deja foloseste contextul activ cu prioritate (aliniat in Task 2 la aceeasi valoare unica).
- `components/Prezenta/PrezentaRapida.tsx:170`
- `components/Plati/TipuriAbonament.tsx:41` (fisier detinut de planul 25-02)
- `components/Grupe/index.tsx:37-42` (pattern de referinta, fisier NU se modifica in acest plan)
- `components/Grupe/ProgramAntrenamenteManagement.tsx:17,47`
- `components/Prezenta/RaportIntervalExamen.tsx:160-161`
- `components/Prezenta/RaportLunarPrezenta.tsx:91-97`
- `components/Plati/PerioadaVacanta.tsx:377-381`
- `components/Plati/RaportFinanciar.tsx:54,275` (afisare, irelevant pentru scoping)
- `components/Plati/PlatiScadente.tsx:644` (afisare, irelevant pentru scoping)
- Toate derivarile `club_id` din recorduri deja incarcate (`grupa.club_id`, `antrenament.club_id`, `sportiv.club_id`) in `AdaugaSportiviModal.tsx`, `GrupeSecundareModal.tsx`, `GeneratorProgramMasiv.tsx`, `GrupaDetailView.tsx`, `OrarEditorModal.tsx`, `OrarModificareModal.tsx`, `ProgramAntrenamenteManagement.tsx`, `ListaPrezentaAntrenament.tsx`, `OrarEditor.tsx`, `RaportLunarPrezenta.tsx`, `RaportPrezenta.tsx`, `Grupe/index.tsx:44,96,116,153`, `GenerareAntrenamenteModal.tsx:183`.

## Follow-up in afara scope-ului acestui plan (FIX real, dar fisier neinclus in acest plan)

Aceste locuri deriva `club_id` din `currentUser.club_id` la scriere si componenta lor nu primeste azi `activeRoleContext` ca prop/context — repararea lor cere adaugarea unui prop nou (schimbare de semnatura similara cu `activeClubId` din `GrupaFormModal`), in afara fisierelor `files_modified` ale acestui plan (25-03). Recomandat ca quick task sau parte din Faza 26:

- `components/Plati/Familii.tsx:64` — creare familie noua, `club_id` din profil.
- `components/Plati/TaxeAnuale.tsx:587` — creare configurare taxa anuala noua, `club_id` din profil (fara fallback pe sportiv).
- `components/Plati/GestiuneFacturi.tsx:206` — risc redus (sursa primara e clubul sportivului selectat), dar fallback-ul pe eroare de date foloseste profilul, nu contextul activ deja disponibil in componenta (linia 45).
- `components/Plati/JurnalIncasari.tsx:330` si `:404` — risc redus (sursa primara e clubul sportivului), fallback pe profil; componenta nu are deloc acces la `activeRoleContext`.

Aceste 5 locuri NU sunt reparate in Task 2 al acestui plan — sunt documentate aici ca sa nu fie re-descoperite de la zero in Faza 26 (wizard onboarding club nou).
