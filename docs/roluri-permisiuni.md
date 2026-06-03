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
