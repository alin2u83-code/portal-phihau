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

> **Înlocuită pentru acces (Faza 39):** granturile per competiție (`acces_competitie_extern`) nu mai dau acces; accesul extern trece prin contul de competiție per club, descris în secțiunea următoare.

Rol pentru reprezentanții de club care accesează **o singură competiție** printr-un link public, fără acces la portal.

- **Poate:** vedea datele generale ale competiției din grant, participanții **propriului club** în acea competiție, taxele clubului (doar citire) și înscrie sportivii clubului prin wizardul existent (inter-club dezactivat). Un `ADMIN_CLUB`/`INSTRUCTOR` cu context eligibil intră pe același link, cu rolul lui.
- **Nu poate:** vedea alte cluburi sau competiții, marca plăți, modifica competiții/probe/categorii, schimba `taxa_achitata` sau statusul unei înscrieri (decât spre retras), atribui roluri sau granturi. Nu are sidebar și nu vede alte module.
- **Fără club pe rândul de rol:** `utilizator_roluri_multicont.club_id` și `sportiv_id` sunt NULL. Clubul și competiția trăiesc în `acces_competitie_extern` (grant per user + competiție + club, `activ`). Triggerul `fn_automatizeaza_legatura_utilizator` nu leagă acest rol de un sportiv după email.
- **`este_doar_extern()`:** funcție SQL care întoarce true când utilizatorul are rolul extern și niciun alt rol. Folosită în politicile RLS și, pe frontend, de garda din `App.tsx` (pagina „Acces limitat" pe `/`). Un cont mixt (ex. ADMIN_CLUB + extern) nu este „doar extern" și rămâne neschimbat în portal.
- **Politici RLS:** permisive pe grant (`ext_p_*`, per tabel, prin `acces_extern_competitie` / `acces_extern_la_club`), restrictive de scope (`ext_r_*` pe SELECT și scriere), `ext_r_deny_all` pe restul tabelelor (default-deny) și `trg_extern_protejeaza_campuri` pe inscrieri/echipe. Politicile permisive pe grant nu depind de headerul `active-role-context-id`: un cont mixt vede reuniunea (rolul intern + grantul).
- **Nu apare** în listele de roluri atribuibile din UI și este scos din selecția de context a portalului când utilizatorul are și alte roluri.
- **Creare:** doar prin `POST /api/aproba-cerere-acces` (Bearer, doar `SUPER_ADMIN_FEDERATIE`). Autentificare: email + cod OTP de 8 cifre, fără parolă.
- **Limite cunoscute:** vezi `.planning/phases/36-*/36-VERIFICARE.md` (funcții RPC `SECURITY DEFINER` apelabile de orice `authenticated`, coloane `sportivi` citibile integral pentru clubul din grant).

## Cont de competiție per club (Faza 39)

- **Un cont per club** (`conturi_competitie_club`), cu rol `REPREZENTANT_COMPETITIE` și `club_id` NULL pe rândul de rol. Accesul acoperă competițiile cluburilor, nu o singură competiție.
- **Helperii `acces_extern_*`** (`acces_extern_la_club`, `acces_extern_la_competitie`, `acces_extern_la_sportiv`) se calculează din contul de club, nu din granturi per competiție.
- **Istoric doar cu participare:** istoricul sportivului e citibil doar în competițiile în care sportivul participă, doar citire pentru contul extern.
- **Autor declarat:** la intrarea în contul de club se declară autorul (instructor din lista clubului sau nume liber). E declarativ, neverificat, nu este probă. Se salvează în `sesiuni_actor_competitie` și apare în `audit_log` (`actor_nume`, `actor_din_lista`, `competitie_id`).
- **Cine vede jurnalul** (tab „Jurnal cont club" în detaliul competiției, RLS `audit_log_select_jurnal_club`): proprietarul toate rândurile; `ADMIN_CLUB` doar rândurile clubului său; `INSTRUCTOR` doar rândurile în care el este autorul declarat. Contul de club nu citește jurnalul.
- **Creare/schimbare email:** doar proprietarul aplicatiei (`proprietari_aplicatie`, `este_proprietar()`).
- **Management:** acordat doar de proprietar, per club, din cardul clubului (`acces_management_cont_club`, rol `ADMIN_CLUB` sau `INSTRUCTOR` ales la acordare). Retragerea șterge doar rândul de rol acordat. La schimbarea emailului managementul se mută pe noua identitate (la eșec: avertisment `management_nemutat`, se reacordă manual). Fără acordare, butonul „Management club" deschide zona de test cu date fictive.
- **Garda de autor (fail-closed, migrarea `20261111g`):** `audit_trigger_fn` cere sesiune de autor pentru orice scriere a unui cont de competiție, în afară de cazul în care header-ul `active-role-context-id` indică un rol `ADMIN_CLUB`/`INSTRUCTOR` al aceluiași utilizator pe clubul contului (`context_activ_este_management_club()`, fără grant pentru `authenticated`). Header lipsă, invalid sau străin înseamnă că sesiunea de autor e obligatorie. Cu management acordat, contextul `REPREZENTANT_COMPETITIE` cere în continuare autor; contextul de management scrie fără autor declarat.
- **Limită cunoscută a managementului:** un cont cu management acordat nu mai e „doar extern" (`este_doar_extern()` fals), deci restrictivele `ext_r_*` și restricția de inserare în `audit_log` nu se mai aplică nici în contextul `REPREZENTANT_COMPETITIE`. Verificat în test: cu rolul de management activ, contul citește și inserează în `audit_log` chiar cu header-ul REPREZENTANT. Decizie deschisă: restrictivele pot fi legate de contextul activ. Până atunci, acordarea managementului ridică limitele zonei externe pentru acel cont.
- **Mutarea managementului la schimbarea emailului:** dacă ștergerea rolului vechi eșuează după un retry, avertisment `rol_vechi_ramas`; rolul vechi (utilizator blocat) rămâne până la curățare manuală și `revoca_management_cont_club` nu îl șterge. `management_cont_club_stare()` întoarce `user_vechi` pentru granturile rămase pe un utilizator care nu mai e contul curent al clubului.
