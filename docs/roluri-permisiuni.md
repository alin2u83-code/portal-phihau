# Roluri și Permisiuni

## Roluri existente

| Rol | Domeniu | Financiar | Vede toate cluburile |
|-----|---------|-----------|---------------------|
| `SUPER_ADMIN_FEDERATIE` | Tot | Da (federație) | Da |
| `ADMIN_CLUB` | Tot clubul | Da (club) | Nu (doar clubul său) |
| `INSTRUCTOR` | Sportivi, prezență, examene, încasări | Da (încasări) | Nu |
| `SPORTIV` | Date proprii, prezențe, plăți proprii | Nu | Nu |

Un utilizator poate avea **mai multe roluri** (ex: instructor la club A, admin la club B). La autentificare alege contextul activ din `RoleSelectionPage`.

## Cum funcționează permisiunile în cod

### `usePermissions(activeRoleContext)`
Hook central — returnează obiect `Permissions`:
```ts
{
  isSuperAdmin, isAdminClub, isInstructor, isSportiv,
  hasAdminAccess, isFederationLevel,
  canManageFinances, canGradeStudents,
  visibleClubIds: 'all' | string[],
  ...
}
```
Folosit în toată aplicația pentru a controla vizibilitatea componentelor.

### Context activ de rol
`activeRoleContext` = intrarea din `user_roles` activă (conține rol + club_id). Stocat în localStorage ca `phi-hau-active-role-context-id` și trimis ca header Supabase la fiecare request.

### RLS (Row Level Security)
Toate tabelele Supabase au politici RLS care verifică:
1. `auth.uid()` — userul autentificat
2. `active-role-context-id` header — contextul de rol activ (via funcție SQL helper)
3. Club ID-ul asociat rolului activ

Funcții SQL helper cheie (în `sql/rls/`):
- `get_active_role_context_id()` — citește header-ul din request
- `get_user_club_id()` — club-ul asociat contextului activ
- `has_role_in_active_context(rol)` — verifică rolul

## Roluri planificate (neimplementate)

| Rol | Ce face |
|-----|---------|
| `PARINTE` | Vede datele copilului, plătește abonament online, anunță absență |
| `ASISTENT_PREZENTA` | Marchează prezența zilei, fără acces la istoric/financiar |
| `ARBITRU` | Vede la competiții: nume + categorie (fără CNP/financiar) |

## Meniu și vizibilitate

`components/menuConfig.ts` — configurează itemele de meniu per rol. `Sidebar.tsx` filtrează după `permissions`. `AppRouter.tsx` mapează `View` → componentă cu guard opțional.

## GDPR și date sensibile

- **CNP**: stocat în DB, mascat în UI — vizibil explicit doar `PARINTE` (copil propriu) + `ADMIN_CLUB`
- **Foto minor**: vizibilă doar staff (INSTRUCTOR+)
- **Date medicale**: doar data expirării vizei medicale
- **ARBITRU**: vede la competiții exclusiv nume + categorie

## REPREZENTANT_COMPETITIE (Faza 36)

Rol pentru reprezentanții de club care accesează **o singură competiție** printr-un link public, fără acces la portal.

- **Poate:** vedea datele generale ale competiției din grant, participanții **propriului club** în acea competiție, taxele clubului (doar citire) și înscrie sportivii clubului prin wizardul existent (inter-club dezactivat). Un `ADMIN_CLUB`/`INSTRUCTOR` cu context eligibil intră pe același link, cu rolul lui.
- **Nu poate:** vedea alte cluburi sau competiții, marca plăți, modifica competiții/probe/categorii, schimba `taxa_achitata` sau statusul unei înscrieri (decât spre retras), atribui roluri sau granturi. Nu are sidebar și nu vede alte module.
- **Fără club pe rândul de rol:** `utilizator_roluri_multicont.club_id` și `sportiv_id` sunt NULL. Clubul și competiția trăiesc în `acces_competitie_extern` (grant per user + competiție + club, `activ`). Triggerul `fn_automatizeaza_legatura_utilizator` nu leagă acest rol de un sportiv după email.
- **`este_doar_extern()`:** funcție SQL care întoarce true când utilizatorul are rolul extern și niciun alt rol. Folosită în politicile RLS și, pe frontend, de garda din `App.tsx` (pagina „Acces limitat" pe `/`). Un cont mixt (ex. ADMIN_CLUB + extern) nu este „doar extern" și rămâne neschimbat în portal.
- **Politici RLS:** permisive pe grant (`ext_p_*`, per tabel, prin `acces_extern_competitie` / `acces_extern_la_club`), restrictive de scope (`ext_r_*` pe SELECT și scriere), `ext_r_deny_all` pe restul tabelelor (default-deny) și `trg_extern_protejeaza_campuri` pe inscrieri/echipe. Politicile permisive pe grant nu depind de headerul `active-role-context-id`: un cont mixt vede reuniunea (rolul intern + grantul).
- **Nu apare** în listele de roluri atribuibile din UI și este scos din selecția de context a portalului când utilizatorul are și alte roluri.
- **Creare:** doar prin `POST /api/aproba-cerere-acces` (Bearer, doar `SUPER_ADMIN_FEDERATIE`). Autentificare: email + cod OTP de 8 cifre, fără parolă.
- **Limite cunoscute:** vezi `.planning/phases/36-*/36-VERIFICARE.md` (funcții RPC `SECURITY DEFINER` apelabile de orice `authenticated`, coloane `sportivi` citibile integral pentru clubul din grant).
