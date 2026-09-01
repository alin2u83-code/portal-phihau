# Dashboard Newsfeed + Acces Platit Module Premium

Data: 2026-09-01
Status: aprobat pt implementare

## Context

Doua subproiecte independente, ambele pornesc de la pagina de start a
aplicatiei pt ADMIN_CLUB / INSTRUCTOR:

1. **Newsfeed dashboard** — vizibilitate rapida a ce urmeaza (examene,
   stagii, competitii) + anunturi federatie. Gratuit, vizibil tuturor.
2. **Acces platit module premium** — module in afara de
   Sportivi/Examene/Stagii/Competitii (ex: Prezenta, Abonamente/Plati)
   trec pe model trial 30 zile + abonament recurent Netopia, cu
   notificari SMS+email la expirare.

Cele doua sunt independente si pot fi implementate/livrate separat.

## A. Dashboard Newsfeed

### Stare actuala

- Nu exista dashboard home pt ADMIN_CLUB/INSTRUCTOR cu feed
  evenimente. `components/UnifiedDashboard.tsx` = grid static de
  carduri module, filtrate pe rol, fara continut de tip "ce urmeaza".
- `components/EvenimenteWidget.tsx` — pattern existent de agregare
  evenimente viitoare, dar scope sportiv (nu club-wide).

### Date model (tabel nou)

```sql
anunturi_federatie (
  id uuid pk,
  titlu text,
  continut text,
  club_id_target uuid null,  -- null = toate cluburile
  creat_de uuid fk auth.users,
  created_at timestamptz,
  expira_la timestamptz null -- optional auto-hide
)
```

RLS: SELECT vizibil pt orice club daca `club_id_target is null OR
club_id_target = <club curent>`. INSERT/UPDATE/DELETE doar
SUPER_ADMIN_FEDERATIE.

### Componente

- `NewsfeedWidget.tsx` (nou) — agregare club-wide, generalizare
  pattern `EvenimenteWidget.tsx`: query pe `sesiuni_examene`, `stagii`,
  `competitii` filtrate `data >= today` + club curent (din
  `active-role-context-id`), sortate ascendent, cu chip countdown
  ("peste N zile") + link direct la modulul respectiv.
- `AnunturiFederatie` CRUD (nou, doar SUPER_ADMIN_FEDERATIE) —
  form+listare simpla, `ui.tsx` Modal/Input existente.
- Integrare in `UnifiedDashboard.tsx`, deasupra/langa grid-ul de
  carduri existent.

### Data flow

Hook nou `useNewsfeed(clubId)` (React Query, staleTime 5min ca restul
aplicatiei) — `Promise.allSettled` pe cele 3 query-uri evenimente +
query anunturi active, merge+sort client-side. Un query esuat nu
blocheaza restul feed-ului.

### Erori

Empty state "Niciun eveniment programat" cand nu exista nimic viitor.
Fiecare sub-query independent — esec partial nu goleste widgetul.

### Testare

Manual: login admin/instructor, verifica feed arata examen/stagiu/
competitie reale cu countdown corect; creare anunt federatie → apare
pe dashboard club tinta; club fara evenimente → empty state corect.

## B. Acces Platit Module Premium

### Stare actuala

- `hooks/usePermissions.ts` — doar booleans derivate din rol
  (`isAdminClub`, `isInstructor` etc), fara concept de modul/feature
  flag sau nivel de plan.
- Nicio infrastructura de billing club-ca-si-client-platforma (doar
  billing club→sportivii lui, diferit).
- SMS: infra existenta (`api/sms.ts`,
  `supabase/functions/_shared/sms-provider.ts`, multi-provider).
- Email: inexistent — se adauga Resend.
- Netopia: doar documentatie plan (`docs/ARHITECTURA_SISTEM_
  INREGISTRARE_ONLINE.md`), zero cod.

### Date model (tabele noi)

```sql
club_abonament_platforma (
  id uuid pk,
  club_id uuid fk unique,
  status text check in ('trial','activ','expirat','anulat'),
  trial_start timestamptz,
  trial_end timestamptz,       -- trial_start + 30 zile
  plan text null,
  pret_lunar numeric null,     -- placeholder, configurabil ulterior de federatie
  netopia_subscription_id text null,
  netopia_customer_token text null,
  netopia_status text null,
  ultima_plata_la timestamptz null,
  ultima_notificare_prag int null, -- 7/3/1/0, dedupe cron
  updated_at timestamptz
)

module_premium_definitie (
  cod text pk,        -- 'prezenta', 'abonamente', ...
  denumire text,
  activ boolean default true
)
```

Seed: cele 7 cluburi existente primesc rand cu `trial_start = now()`,
`trial_end = now()+30 zile`, `status='trial'`. Cluburi noi primesc
rand identic la creare cont club.

### Gating

- Hook nou `usePremiumAccess(clubId)` (React Query) →
  `{ hasAccess, status, zileRamase }` citind
  `club_abonament_platforma`.
- Enforce in `AppRouter.tsx`: view-urile premium verifica
  `hasAccess` inainte de a randa componenta reala; altfel
  `PaywallScreen` (nume modul, zile ramase / "expirat", CTA
  "Activeaza acces").
- RLS oglindit pe tabelele module premium (`prezenta`,
  `abonamente_sportivi` etc): policy verifica
  `club_abonament_platforma.status IN ('trial','activ')` pt clubul
  respectiv. Strat hard de securitate — nu doar UI (pattern existent
  in `docs/roluri-permisiuni.md`).
- Sportivi/Examene/Stagii/Competitii — nicio policy noua, raman
  gratuite necondiționat.

### Netopia — abonament recurent

- `api/netopia-create-subscription.ts` — tokenize card, initiaza
  abonament recurent.
- `api/netopia-webhook.ts` — primeste confirmari/reinnoiri/esecuri,
  actualizeaza `club_abonament_platforma`.
- Plata reusita → `status='activ'`, extinde perioada.
- Esec taiere recurenta → grace scurt (interval exact stabilit in
  plan) apoi `status='expirat'` daca nu se rezolva.
- Munca noua integral — fara cod client existent de reutilizat.

### Notificari (7/3/1 zile + expirat)

- Supabase edge function cron zilnic — scaneaza
  `club_abonament_platforma` unde `trial_end`/urmatoarea taiere cade
  in {7,3,1,0} zile.
- Trimite SMS (reuse `sms-provider.ts`) catre telefon
  admin/instructor club + email via Resend
  (`RESEND_API_KEY`, endpoint nou `api/send-email.ts` sau edge
  function).
- Dedupe: `ultima_notificare_prag` per club, cron nu retrimite acelasi
  prag.

### Erori

Webhook Netopia: logat, retry conform semantica Netopia proprie.
SMS/email: esec logat, non-blocant (nu opreste cron pt restul
cluburilor).

### Testare

Manual: club test cu `trial_end=maine` → verifica SMS+email trimise
o singura data; club expirat → verifica `PaywallScreen` + RLS
blocheaza query direct pe modul premium; round-trip plata Netopia
sandbox daca exista credentiale sandbox.

## Decizii confirmate cu utilizatorul

- Platitor: clubul (ADMIN_CLUB), nu federatia centralizat.
- Expirare: blocare completa acces (nu read-only).
- Scope premium: tot in afara de Sportivi/Examene/Stagii/Competitii
  (module viitoare intra implicit premium via
  `module_premium_definitie`).
- Trial: 30 zile, start retroactiv azi (2026-09-01) pt cele 7 cluburi
  existente; la creare cont pt cluburi noi.
- Noutati: anunturi manuale federatie + feed automat activitate,
  ambele.
- Remindere: 7/3/1 zile inainte de expirare, SMS+email.
- Pret: neconfigurat, camp placeholder configurabil de federatie.
- Plata: Netopia, abonament recurent automat (card salvat).
- Email: Resend.
