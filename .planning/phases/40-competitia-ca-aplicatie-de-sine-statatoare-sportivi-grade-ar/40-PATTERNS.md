# Phase 40: Grade din competitie - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 6 (names of new files are discretionary)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/20261112a_schimbari_grad_competitie.sql` (tabel + RLS + grants) | migration | CRUD | `20261111c_cont_competitie_club.sql` (lines 12-31) | exact |
| `supabase/migrations/20261112b_rpc_schimba_grad_competitie.sql` (RPC SECURITY DEFINER: promovare/echivalare/undo + marcheaza achitat) | migration/function | request-response | `20261111c` (helperi, lines 42-110) + `20261111g` (lines 5-24) | role-match |
| `supabase/migrations/20261112c_deadline_inscrieri_not_null.sql` (backfill + NOT NULL + CHECK) | migration | batch | `20261111g` (DO block + rollback comment) | partial |
| `components/Competitii/index.tsx` (canEditGrad L213, onGradSchimbat L544, tab nou ~L333/L749) | component | request-response | itself + `CereriAccesAdmin.tsx:109-122` | exact |
| `components/Competitii/SchimbariGrad.tsx` (tab federatie) | component | CRUD read + RPC | `components/Competitii/JurnalActori.tsx` | exact |
| `types.ts` (tip nou) | config | - | existing interfaces (`timp_asteptare` L278) | exact |

## Pattern Assignments

### Migrari: tabel nou (analog `20261111c_cont_competitie_club.sql`)
- Tabela noua FARA `FORCE ROW LEVEL SECURITY` (helperii definer trebuie sa o citeasca), lines 12, 29-31:
```sql
REVOKE ALL ON public.conturi_competitie_club FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.conturi_competitie_club TO authenticated;
GRANT ALL ON public.conturi_competitie_club TO service_role;
```
- Pentru tabelul de schimbari: GRANT SELECT doar; fara INSERT/UPDATE/DELETE direct (scrie doar RPC). SELECT policy: federatie + club propriu (`acces_extern_la_club(club_id)`), cu `ext_r_*` RESTRICTIVE ca in 20261111c. Citeste live `pg_policies` inainte (memorie: audit RLS pe DB live).
- Migrari noi: `git add -f` (folder in .gitignore). Termina cu `NOTIFY pgrst, 'reload schema';` si comentariu `-- Rollback:` (ca 20261111g L39-41).

### Migrari: RPC SECURITY DEFINER (analog `20261111c` L42-110, `20261111g` L5-24)
```sql
CREATE OR REPLACE FUNCTION public.xxx(...)
RETURNS ... LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$ ... $$;
REVOKE ALL ON FUNCTION public.xxx(...) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.xxx(...) TO authenticated;   -- ACL Faza 37: explicit, nu PUBLIC
```
Verificari in RPC (D-10): `cont_club_curent()` = sportiv.club_id; `acces_extern_la_competitie(p_competitie)`; `acces_extern_sportiv_competitie(p_sportiv, p_competitie)`; rol REPREZENTANT din `utilizator_roluri_multicont` (model header ctx in `context_activ_este_management_club`, `20261111g` L10-21: `current_setting('request.headers', true)::json ->> 'active-role-context-id'`, fail-closed pe exceptie); sesiune de autor (garda din `audit_trigger_fn`, trigger `audit_istoric_grade` scrie actorul - INSERT/DELETE in `istoric_grade` din RPC trece prin garda, deci RPC trebuie apelat cu sesiune de autor valida). Taxa din `grade_preturi_config` (is_activ). Undo = DELETE randul creat, refuz daca nu mai e ultimul (max data_obtinere/ordine); `trg_sync_grad_actual_from_istoric` (`20260329_normalize_grade_sources.sql:44-110`) reface `grad_actual_id`.

### Migrare deadline (D-14)
Foloseste DO-block cu verificare de pre-conditie + RAISE EXCEPTION (pattern `20261111g` L26-35). Ordine: UPDATE backfill `deadline_inscrieri = data_inceput` unde NULL sau > data_inceput, apoi `ALTER ... SET NOT NULL`, `ADD CONSTRAINT ... CHECK (deadline_inscrieri <= data_inceput)`. Formularul `CompetitieForm.tsx` trebuie sa ceara deadline.

### `components/Competitii/index.tsx`
L213 actual: `const canEditGrad = !extern && (permissions.canGradeStudents || isAdmin || isClubAdmin || permissions.isInstructor);`
L544 actual:
```tsx
onGradSchimbat={canEditGrad ? (id, gradId) => setSportivi?.(prev => prev.map(s => s.id === id ? { ...s, grad_actual_id: gradId } : s)) : undefined}
```
Extern: `canEditGradExtern = extern && externRol === 'REPREZENTANT_COMPETITIE' && !istoricExtern` (L127-130); handler apeleaza RPC, apoi refresh (`fetchDataSilent`/`onEchipeRefresh`), nu doar setSportivi. Ceilalti (instructor extern) = fara handler (D-09). Tab nou: cloneaza butonul L333-334 si randarea L749-751 (`activeTab === 'schimbari_grad' && !extern && (permissions.isSuperAdmin || isFederationAdmin)`); adauga in union `TabCompetitie` (L65) si in lista `saved` (L81).

### Apel RPC + erori + toast (analog `CereriAccesAdmin.tsx:109-122`)
```tsx
setBusy(true);
try {
  const { data, error } = await supabase.rpc('sterge_cereri_in_asteptare', { p_competitie: competitieId });
  if (error) throw error;
  showSuccess('Acces extern', `...`);
  await incarca();
} catch (err) { showError('Acces extern', err); } finally { setBusy(false); }
```
Mesajele de blocare (D-07 "mai trebuie X luni", undo refuzat) vin ca `RAISE EXCEPTION` in RPC si afisate prin `showError`.

### `SchimbariGrad.tsx` (analog `JurnalActori.tsx`)
Imports (L1-5): `React`, `useQuery` din `@tanstack/react-query`, `supabase` din `../../supabaseClient`, `useData`, `{ Button, Card, Badge, EmptyState } from '../ui'`. Props `{ competitieId }`.
Query (L47-62): `useQuery({ queryKey: [...], queryFn: async () => { const { data, error } = await supabase.from(...).select(...).eq('competitie_id', competitieId).order('created_at', {ascending:false}).limit(300); if (error) throw error; return data ?? []; } })`; fara filtrare pe rol in client (RLS decide). Stari: loading `<p>`, eroare `<Card>` cu `Button` "Reincearca" + `refetch`, gol `<EmptyState title=.../>`. Nume club: `clubs?.find(c => c.id === id)?.nume`. Format data `fmtDataOra` (L50-51). Tabel `overflow-x-auto rounded-xl border border-slate-700`, `bg-slate-800 text-slate-400 text-xs uppercase`; badge text `<Badge variant="amber">`. D-15: card pe mobil, tabel de la `md:` (JurnalActori e doar tabel, deci card mobil e nou). Filtre club/competitie: refolosesti `CompetitieFilterBar.tsx` doar daca se potriveste; altfel selecturi simple din `ui.tsx`. Butonul "Marcheaza achitat" = RPC (pattern de mai sus), cu `busy` per rand. Adauga si `istoric_grade` ramane in `TABELE_JURNAL`/`ETICHETA_TABEL` (exista).

## Shared Patterns
- Erori UI: `useError()` -> `showError(titlu, err)` / `showSuccess`; servicii nu arunca (convenție), dar componentele din Competitii folosesc try/catch ca mai sus.
- Securitate: RLS + RPC definer (`SET search_path = public, pg_catalog`, REVOKE/GRANT explicit); FE doar UX.
- UI: doar `components/ui.tsx`, Tailwind, text in romana cu diacritice.
- Refresh dupa mutatie: `fetchDataSilent` / `onEchipeRefresh` + invalidate query key tab federatie.

## No Analog Found
| File | Reason |
|---|---|
| Parsare `grade.timp_asteptare` ("N luni") in SQL | Niciun parser existent; scrie `substring(timp_asteptare from '\d+')::int` in RPC (de verificat valorile reale in DB; grade negre 12-96) |
| Card mobil pentru tabel | JurnalActori e doar tabel |
| Teste RPC cross-club | Nu am gasit test SQL analog; verifica tests/ si scripturile Playwright din Faza 36/39 |

## Metadata
**Analog search scope:** supabase/migrations (20261111*), components/Competitii
**Files scanned:** ~6 read, grep pe restul
**Date:** 2026-11-12
