# Phase 42: Competitie (FRAM, editare echipe/quyen, arme dupa grad) - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 11 (new/modified, inferred from CONTEXT D-01..D-15)
**Analogs found:** 10 / 11
Note: line numbers verified only for excerpts quoted; other refs are file-level.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/20261115b_competitii_regula_fram.sql` (coloana + trigger imutabil dupa draft + trigger INSERT blocant FRAM + audit) | migration/trigger | CRUD guard | `supabase/migrations/20261115a_categorii_securitate_hardening.sql` | exact |
| `supabase/migrations/20261115c_echipe_editare_rpc.sql` (RPC editare echipa/quyen/categorie) | migration/RPC | request-response, atomic | `supabase/migrations/20261114a_categorii_aplica_operatie.sql` | exact |
| `components/Competitii/CompetitieForm.tsx` (toggle FRAM, disabled daca status != draft) | component | form CRUD | itself (`status` field l.32,53,96,187) | exact |
| `components/Competitii/constants.tsx` (`areVizaFRAM`, `WarningVizaFRAM` -> variante blocante) | utility/component | transform | itself l.57-76 | exact |
| `components/Competitii/InscriereClubWizard/Pas1.tsx`, `InscriereModal.tsx`, `InscrieriView.tsx`, `AdminPanel.tsx` (blocare UI cand regula activa + confirmare super admin) | component | request-response | same files, call sites of `areVizaFRAM` | exact |
| `components/Competitii/index.tsx` (`canEditEchipe` langa `canEditArme` l.248) | component/permissions | derived | `canEditArme` / `canRegister` | exact |
| `components/Competitii/InscriereClubWizard/*` (mod editare Pas2Quyen/Pas3Echipe/PasArme) | component | CRUD | wizard existent (`PasArme.tsx`, `retrage.ts`) | role-match |
| `utils/armeCvd.ts` (+ `armeEligibileLaGrad` pura, avertismente) | utility | transform | `armePermiseGiaoDau`, `armeStale` in same file | exact |
| `utils/armeCvd.test.ts` / `utils/fram*.test.ts` | test | - | `utils/categoriiAdmin.test.ts` (tsx, assert harness) | exact |
| `services/armeCvdService.ts` / nou `services/echipeEditareService.ts` | service | request-response | `salveazaArmeCompetitie` | role-match |
| `components/Competitii/InscriereClubWizard/BannerDeRezolvat.tsx` (avertismente arma neeligibila / fara arma) | component | derived | itself | exact |

## Pattern Assignments

### Migrare: regula FRAM + trigger-e garda (analog `20261115a_categorii_securitate_hardening.sql`)

Trigger BEFORE INSERT SECURITY DEFINER, fail-closed, REVOKE, audit (l.60-108):
```sql
CREATE OR REPLACE FUNCTION public.trg_participant_categorie_activa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ ... IF ... THEN RAISE EXCEPTION '...' USING ERRCODE = '23514'; END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.trg_participant_categorie_activa() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_inscrieri_categorie_activa
  BEFORE INSERT OR UPDATE OF categorie_id ON public.inscrieri_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_categorie_activa();
CREATE TRIGGER audit_categorii_competitie AFTER INSERT OR UPDATE OR DELETE ON public.categorii_competitie
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
```
Aplica la: (a) trigger `BEFORE UPDATE OF <camp_fram> ON competitii` care refuza daca `OLD.status <> 'draft'` (D-02); (b) trigger BEFORE INSERT pe `inscrieri_competitie` (si echipe, pentru membri) care refuza lipsa FRAM cand regula activa (D-04), cu exceptie `is_super_admin()` + confirmare/audit (D-05). Audit: adauga `audit_trigger_fn` pe `competitii` daca lipseste. Atentie: `areTaxaAchitata` e logica client; trebuie replicata in SQL (FRAM = an calendaristic, achitat SAU scutit, D-06) - fara analog SQL gasit, planner citeste `utils/anFiscal.ts` + `areTaxaAchitata`.
Migrarile se aplica doar dupa OK explicit; `supabase/` e in .gitignore => `git add -f`. Verifica live pg_policies/pg_proc (memorie: audit RLS pe DB live).

### Migrare: RPC editare echipe (analog `20261114a_categorii_aplica_operatie.sql`)

Antet si garda (l.43-96):
```sql
SECURITY DEFINER
SET search_path = public, pg_catalog
...
IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
...RAISE EXCEPTION 'Competiția este finalizată; ...' USING ERRCODE = '22023';
```
Diferenta D-07: garda = `is_super_admin()` (oricand pana la `finalizata`) SAU reprezentant/admin club al clubului echipei cu `competitii.status = 'inscrieri_deschise'`. Pentru autor (D-10): vezi garda `20261111g*` (audit_trigger_fn fail-closed, sesiune de autor pe contul comun; `tests/autor_modificari_faza39.ts`). Compatibilitate categorie: reutilizeaza validarea "aceeasi proba, tip participare, arma" din l.125/218. REVOKE FROM PUBLIC/anon, GRANT EXECUTE TO authenticated.

### `components/Competitii/index.tsx` (permisiuni)

Pattern (l.231, 248):
```ts
const canRegister = competitie.status === 'inscrieri_deschise';
const canEditArme = competitie.status === 'inscrieri_deschise' && (permissions.isAdminClub || permissions.isSuperAdmin || permissions.isFederationAdmin) && externRol !== 'INSTRUCTOR';
```
`canEditEchipe`: super admin => `status !== 'finalizata'`; altfel `inscrieri_deschise` + rol club/REPREZENTANT_COMPETITIE (`externRol`, vezi `canEditGradExtern` l.~246). UI e doar UX; garda reala in RPC.

### `constants.tsx` FRAM (l.57-76)

```ts
export function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return areTaxaAchitata(vizeSportivi, sportivId, 'FRAM', an);
}
export const WarningVizaFRAM: React.FC<{ show: boolean; inline?: boolean }> = ...
```
Adauga un parametru/prop `blocat` (regula activa) care schimba textul din "Avertisment — nu blocat" in "Nu se poate inscrie"; actualizeaza call-sites: Pas1.tsx:85, InscriereModal.tsx:321/380/721, InscrieriView.tsx:155/251, AdminPanel.tsx:63-66. Textul actual afirma explicit ca inscrierea nu e blocata - trebuie conditionat. Zona externa: `ExternDataProvider.tsx:66` (`vize_club_competitie`, lista goala = avertisment).

### `utils/armeCvd.ts` (arme eligibile dupa grad, D-11/D-12)

Analog pur (l.66-74):
```ts
export function armePermiseGiaoDau(arme: Arma[]): Arma[] {
  const permise = ARME_GIAO_DAU_CVD.map(norm);
  return arme.filter(a => permise.includes(norm(a.denumire)));
}
export function armeStale(alese: string[], disponibile: string[]): string[] {
  return alese.filter(id => !disponibile.includes(id));
}
```
Sursa drepturilor pe grad: `incarcaDrepturiArme()` (services/armeCvdService.ts:41-55, `Map<grade_id, Set<arma_id>>` din `inlantuiri_grade` tip `thao_lo_individual`), expusa de `hooks/useArmeCvd.ts` ca `drepturi`. Grad efectiv: `gradEfectivLaData` din `utils/eligibilitateCompetitie` (importat in PasArme.tsx:6). `armeStale` = baza pentru D-14 (raman + avertisment). Giao Dau: compune `armePermiseGiaoDau` cu filtrul pe grad. Fara arma aleasa (D-15): avertisment, nu blocaj.

### Test (analog `utils/categoriiAdmin.test.ts` l.1-26)
Harness fara vitest: `test(nume, fn)`, `assert`, `egal`; rulare `npx tsx utils/<x>.test.ts`; exit non-zero la esec. Tests DB: `tests/*_faza39.ts`, `tests/grade_competitie_faza40.ts`.

### Service (analog `salveazaArmeCompetitie`, armeCvdService.ts:117-133) si `retrage.ts`
Convenție: `Rez<T>` = `{data, error}` fara throw, try/catch cu `msg(e)`. Pentru RPC: `supabase.rpc('nume', {...})` -> `{ ok, mesaj }` ca `RezultatRetragere` in `retrage.ts` (verifica numarul de randuri efectiv, RLS poate bloca fara eroare).

### Wizard editare (PasArme.tsx l.1-40)
Pattern: `draft` state + `esuatiRef` pentru editari esuate, `canEdit` prop, `onInscrieriRefresh`, `ConfirmModal`, `useError().showError`. Pentru editare echipa reutilizeaza `Pas2Quyen`/`Pas3Echipe` cu `canEdit` din `canEditEchipe`; refresh dupa salvare cu pattern `onEchipeRefresh/fetchDataSilent` (memorie Faza competitii-inscriere).

## Shared Patterns
- **Regula doar in UI se ocoleste** (Faza 41): fiecare regula noua (FRAM, editare dupa status) = trigger/RPC in DB + UI ca UX. Sursa: 41-SECURITY.md.
- **Erori**: servicii `{data,error}` fara throw; UI `useError().showError`; mesaje romana.
- **Audit**: `audit_trigger_fn` + autor (Faza 39, garda 20261111g).
- **Taxe neschimbate** (D-09): editarea nu recalculeaza; semnaleaza "de rezolvat" via `BannerDeRezolvat`.

## No Analog Found
| File | Reason |
|---|---|
| Logica SQL a "FRAM platit pentru an calendaristic" | `areTaxaAchitata` exista doar in TS; planner trebuie sa afle structura datelor taxe/viza (plati nu are coloane competitie; taxe derivate) |

## Metadata
**Search scope:** components/Competitii, hooks, utils, services, supabase/migrations (cele mai recente)
**Files scanned:** ~15 read/grep
