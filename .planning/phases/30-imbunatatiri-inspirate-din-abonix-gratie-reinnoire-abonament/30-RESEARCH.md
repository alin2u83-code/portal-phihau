# Phase 30: Imbunatatiri inspirate din Abonix (gratie reinnoire, memento-uri, loialitate) - Research

**Researched:** 2026-09-18
**Domain:** Facturare recurenta (abonamente/taxe), notificari automate SMS, politici de reducere/loialitate — pe stack React 18 + TypeScript + Supabase (Postgres + RLS + Edge Functions + pg_cron)
**Confidence:** MEDIUM — arhitectura existenta e bine inteleasa (grep + citire directa a codului live din repo), dar schema exacta a 2 tabele critice (`politici_reducere`, `aplicare_reduceri`) NU exista in nicio migratie comisa si nu a putut fi verificata live in aceasta sesiune (fara acces la unelte MCP Supabase in acest research). Vezi `## Open Questions`.

## Summary

Cele 3 feature-uri cerute nu se pot copia 1:1 din Abonix, pentru ca modelul de date al Portal PhiHau e fundamental diferit: Abonix modeleaza un membru cu **o singura data de inceput/sfarsit abonament** (interval continuu), in timp ce PhiHau **factureaza lunar/calendaristic** (`plati.luna` + `plati.an`, generate per luna curenta pentru toti sportivii activi, fara camp `data_expirare` pe sportiv). Nu exista azi conceptul de "abonament expirat cu N zile in urma" ca stare explicita — el trebuie derivat din lunile lipsa (`utils/luniLipsa.ts` + `data_start_facturare`).

Vestea buna: infrastructura de notificari SMS este deja **mult mai matura decat sugereaza raportul Abonix** — exista deja `sms_config`, `sms_templates` (cu tip `expirare_abonament`, variabile `{{name}}`/`{{days}}`), `sms_queue`, un RPC `add_sms_to_queue`, un endpoint `/api/sms`, si o Edge Function `sms-schedule-reminders` + functia SQL `schedule_training_reminders()` care AR TREBUI sa programeze remindere de expirare abonament la 7 zile. Cercetarea a descoperit insa un **bug critic care o face complet inactiva**: filtrul foloseste `p.tip = 'abonament'` si `p.status = 'achitat'` (litere mici), dar toata aplicatia scrie `tip: 'Abonament'` si `status: 'Achitat'` (litere mari) — vezi `## Common Pitfalls`. Feature-ul 2 (memento-uri pe praguri) trebuie sa REPARE acest bug si sa extinda functia de la un singur prag fix (7 zile) la praguri configurabile (-7/-3/0/+3/+7), nu sa construiasca de la zero.

Pentru feature-ul 3 (loialitate), exista deja un TODO explicit in cod (`PlatiScadente.tsx:239-241,270-271` — "Bug 4 TODO") care asteapta exact acest tip de integrare: aplicarea `politici_reducere` prin `aplicare_reduceri` in fluxul `handleGenerateSubscriptions`. Feature-ul de loialitate poate/trebuie sa inchida acest TODO existent, nu doar sa adauge cod nou langa el.

Pentru feature-ul 1 (gratie la reinnoire), cel mai solid punct de integrare e conceptul deja existent `data_start_facturare` + `calculeazaLuniLipsa()` (Faza 14) — perioada de gratie decide daca, la reluarea platilor dupa o pauza, `data_start_facturare` ramane neschimbat (sportivul e restant retroactiv pe lunile lipsa) sau se reseteaza la data noii plati (lunile lipsa sunt iertate, se porneste curat).

**Primary recommendation:** Trateaza cele 3 feature-uri ca extensii ale sistemelor existente (SMS templates/queue pentru memento-uri, `politici_reducere`/`aplicare_reduceri` pentru loialitate, `data_start_facturare` pentru gratie), nu ca module noi de la zero. Primul task de executie, inainte de orice cod, trebuie sa fie inspectia live a schemei `politici_reducere` si `aplicare_reduceri` prin Supabase MCP (`list_tables`) — planificarea nu poate stabili coloanele exacte fara asta.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Config perioada de gratie per club (zile) | Database / Storage (tabel nou, pattern `sms_config`) | Frontend (formular admin) | Setare per club, citita de logica de generare factura — nu apartine unui singur ecran |
| Calcul "pastreaza sau reseteaza data_start_facturare" la reinnoire | Frontend Server / Client logic (util pur, ca `utils/luniLipsa.ts`) | Database (daca se decide trigger SQL in loc de client) | Restul logicii de facturare (generare, luni lipsa) e deja 100% client-side in acest cod; a introduce un singur calcul server-side ar fragmenta sursa de adevar |
| Memento-uri praguri configurabile (-7/-3/0/+3/+7) | Database / Storage (pg_cron + functie SQL, extinde `schedule_training_reminders`) | API / Backend (`/api/sms` doar pentru trimitere manuala/test) | Nu exista proces Node persistent (Vercel serverless) — orice job programat TREBUIE sa fie pg_cron + Edge Function, exact pattern-ul deja folosit |
| Sabloane notificare editabile UI | Database (`sms_templates`, deja exista) | Frontend (`SMSTemplates.tsx`, deja exista) | Extindere directa a componentei existente, nu tabel nou |
| Canal email | Neimplementat — lipseste orice infrastructura | — | Zero provider email in cod/env (`grep` fara rezultate pt Resend/SendGrid/Nodemailer/SMTP) — decizie noua daca se cere |
| Loialitate: numarare reinnoiri consecutive | Database (trigger pe `tranzactii`, pattern `trg_plata_confirmare_sms`) SAU Frontend (in `handleGenerateSubscriptions`, unde e deja asteptat Bug 4 TODO) | — | Ambele pattern-uri exista deja in cod; alegerea depinde de decizia din CONTEXT (vezi Open Questions) |
| Aplicare bonus/reducere pe factura | Frontend (`handleGenerateSubscriptions`, `politiciReducere` deja referentiat in comentarii) | Database (`aplicare_reduceri` ca tabel de mapare) | Continua exact punctul unde Bug 4 TODO a fost lasat neterminat |

## User Constraints

Nu exista `30-CONTEXT.md` in acest moment (`/gsd-discuss-phase` nu a rulat pentru aceasta faza) — nu exista decizii blocate ("Decisions"), zone de discretie explicite, sau idei amanate provenite din discutie. Toate deciziile de design ramase deschise sunt listate in `## Open Questions` si `## Assumptions Log` de mai jos; planner-ul si `/gsd-discuss-phase` (daca va rula) trebuie sa le rezolve inainte de blocare finala.

## Project Constraints (from CLAUDE.md)

- **Limba:** romana pentru domeniu (DB, UI, variabile), engleza pentru hooks/pattern-uri tehnice — respectat in tot codul existent SMS/Plati citat mai sus
- **Tipuri:** toate in `types.ts` la radacina — dar exceptia documentata `data_start_facturare` (LOCKED sa NU intre in `types.ts`, fetch izolat prin `useDataStartFacturare`) e un precedent — daca planner-ul adauga coloane noi similare (ex. `perioada_gratie_zile` pe `cluburi`), poate alege acelasi pattern de izolare sau poate extinde `types.ts` normal; ambele sunt acceptabile, dar trebuie sa fie o decizie explicita in plan, nu implicita
- **UI:** `components/ui.tsx` design system intern — Button/Input/Card/Select/EmptyState — NU Shadcn/MUI. Toate ecranele SMS si Plati citate folosesc deja acest set
- **Compatibilitate:** nu se sparge API-ul componentelor existente (`TipuriAbonamentManagement`, `ReduceriManagement`, `PlatiScadente`, `SMSTemplates` etc.)
- **Performance:** filtrare client-side pe date deja incarcate — fara query-uri Supabase noi in afara celor strict necesare noilor tabele/coloane
- **RLS + usePermissions:** orice tabel nou (ex. config gratie, praguri memento) trebuie sa foloseasca helper-ul `public.has_access_to_club(club_id)` — pattern-ul standard folosit consecvent in `sms_config`/`sms_templates`/`sms_queue` (vezi Code Examples)
- **Servicii intorc `{data, error}`, nu throw** — orice serviciu nou (ex. `politiciReducereService`, `perioadaGratieService`) trebuie sa respecte asta
- **Zero migratii DB** NU se aplica aici — Phase 27/28/29 au introdus deja migratii noi cand a fost nevoie; Phase 30 poate/trebuie sa introduca migratii (tabele config gratie/praguri notificare, eventual coloane pe `cluburi`)

## Standard Stack

Nu sunt necesare pachete npm noi pentru scope-ul MVP (gratie + memento SMS + loialitate). Tot ce trebuie e deja instalat:

| Librarie | Versiune (din package.json) | Scop in aceasta faza |
|---------|---------|---------|
| `@supabase/supabase-js` | 2.98.0 [VERIFIED: package.json] | Query-uri tabele noi + apel RPC-uri (`add_sms_to_queue` etc.) |
| `date-fns` | 4.1.0 [VERIFIED: package.json] | Calcul diferenta in zile pentru gratie/praguri (deja folosit in `utils/luniLipsa.ts`) |
| `react-hot-toast` (via `useError`) | 2.6.0 [VERIFIED: package.json] | Feedback UI la salvare config |

**Canal email — NU exista infrastructura.** Daca planner-ul/utilizatorul decide sa includa email (nu doar SMS) pentru memento-uri, e nevoie de un provider nou (ex. Resend, cel mai comun pe Vercel) — pachet nou, cost nou, `RESEND_API_KEY` nou. **Recomandare: MVP doar SMS**, email ca extensie ulterioara — motiv: zero infrastructura existenta, cost/complexitate suplimentara nejustificata cand `sms_templates`/`sms_queue` acopera deja exact acelasi tip de notificare.

### Alternative Considerate

| In loc de | S-ar putea folosi | Compromis |
|------------|-----------|-----------|
| Extindere `schedule_training_reminders()` cu praguri multiple | Functie SQL noua separata `schedule_expirare_reminders()` | Separarea e mai curata (single responsibility) dar dubleaza query-urile catre `plati`/`sportivi`; extinderea aceleiasi functii pastreaza un singur punct de citire "ce trimitem azi" |
| Tabel nou `reguli_notificare` (praguri + canal + on/off per club) | Coloane JSON pe `sms_config` (ex. `praguri_reminder: [-7,-3,0,3,7]`) | JSON e mai rapid de implementat dar mai greu de interogat/audita per prag; tabel dedicat urmeaza pattern-ul relational deja folosit peste tot in schema |
| Trigger SQL pe `tranzactii` pentru loialitate (`trg_plata_confirmare_sms` ca model) | Calcul client-side in `handleGenerateSubscriptions` (continua Bug 4 TODO) | Trigger-ul e mai robust (nu poate fi ocolit de un apel direct la `supabase.from('plati').insert`), dar clientul-side e consistent cu restul logicii de facturare care e 100% in `PlatiScadente.tsx` azi |

## Package Legitimacy Audit

Nu se instaleaza niciun pachet extern nou in scope-ul MVP identificat de aceasta cercetare (SMS + gratie + loialitate folosesc exclusiv `@supabase/supabase-js` si `date-fns`, deja prezente). **Sectiune omisa cu justificare** — daca planner-ul decide sa adauge canal email, trebuie sa ruleze integral Package Legitimacy Gate (slopcheck + `npm view <pkg-resend-sau-similar> version`) inainte de a recomanda orice pachet SDK email, si sa il marcheze `[ASSUMED]` pana la verificare.

## Architecture Patterns

### System Architecture Diagram (fluxul de memento-uri, extins din ce exista azi)

```
[pg_cron, zilnic 07:00]
      |
      v
[Edge Function: sms-schedule-reminders]
      |
      v
[SQL: schedule_training_reminders()]  <-- FIX cazul aici (tip/status case-sensitive)
      |  extins cu bucla pe praguri configurabile [-7,-3,0,3,7]
      v
[pentru fiecare (sportiv, prag) fara SMS deja trimis]
      |
      v
[RPC: add_sms_to_queue(club_id, sportiv_id, tip='expirare_abonament', {name, days})]
      |  citeste sms_templates (activ=true, tip='expirare_abonament')
      |  randeaza {{name}}/{{days}} -> mesaj text
      v
[INSERT sms_queue: status='pending', scheduled_at=now()]
      |
      v
[pg_cron, la 5 min] --> [Edge Function: sms-process-queue] --> [Android Gateway / SMSLink] --> [SMS catre sportiv]
      |
      v
[sms_queue.status = 'sent'/'failed'] --> vizibil in SMSLog.tsx (audit "cine-cand-ce")
```

### Recommended Project Structure

```
supabase/migrations/
├── 202609xx_grace_period_config.sql       # tabel/coloane gratie reinnoire per club
├── 202609xx_notification_thresholds.sql   # tabel praguri configurabile + fix case bug schedule_training_reminders
├── 202609xx_loyalty_renewals.sql          # (daca trigger SQL) numarare reinnoiri consecutive + aplicare bonus

utils/
├── perioadaGratie.ts        # calcul pur: (dataUltimaPlata, azi, pragZile) => 'pastreaza' | 'reseteaza'
├── loialitateReinnoiri.ts   # (optional daca client-side) calcul consecutive payments din tranzactii

services/
├── notificariAutomateService.ts   # CRUD praguri + citire istoric (daca UI separata de SMSTemplates)

components/Plati/
├── TipuriAbonament.tsx      # + camp "Perioada de gratie (zile)" per club (sau tab nou "Setari Reinnoire")
├── Reduceri.tsx / [ecran nou pt politici_reducere daca e alt tabel]

components/SMS/
├── SMSTemplates.tsx         # deja suporta tip=expirare_abonament — extins cu praguri multiple daca UI cere
├── [tab nou] SMSPraguri.tsx # UI bifabile -7/-3/0/+3/+7 + canal, daca se alege tabel dedicat
```

### Pattern 1: Config per-club intr-un tabel dedicat (nu coloane pe `cluburi`)

**What:** Toate setarile per-club din acest cod (SMS, teoretic si viitorul gratie/praguri) traiesc in tabele dedicate cu `club_id UNIQUE`, RLS prin `has_access_to_club(club_id)`, nu ca si coloane pe `cluburi`.
**When to use:** Orice config nou per club introdus in aceasta faza (gratie, praguri notificare).
**Example:**
```sql
-- Source: supabase/migrations/20260523_sms_system.sql (pattern existent, confirmat live prin cod aplicat)
CREATE TABLE IF NOT EXISTS public.sms_config (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE,
  ...
  UNIQUE(club_id)
);
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff - Full Access sms_config"
ON public.sms_config FOR ALL
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));
```

### Pattern 2: RPC SECURITY DEFINER pentru operatii cross-tabel declansate de trigger/cron

**What:** Cand o operatie trebuie sa citeasca `sportivi.telefon` (protejat de RLS) dintr-un context care nu are sesiune de user (cron, trigger), se foloseste o functie `SECURITY DEFINER` cu verificare explicita de acces.
**When to use:** Orice functie noua declansata de pg_cron (extinderea `schedule_training_reminders`).
**Example:**
```sql
-- Source: supabase/migrations/20260523_sms_system.sql (add_sms_to_queue, deja live)
CREATE OR REPLACE FUNCTION public.add_sms_to_queue(...)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_access_to_club(p_club_id) THEN
    RAISE EXCEPTION 'Access denied to club %', p_club_id;
  END IF;
  ...
END;
$$;
```
Notă: `has_access_to_club` verifica userul curent din sesiune — intr-un context de trigger/cron apelat de `service_role`, aceasta verificare poate sa nu se aplice identic (trebuie confirmat live cum se comporta `has_access_to_club` sub `service_role`; posibil sa returneze `true` implicit pentru `service_role`, consistent cu restul RLS-ului din proiect care are exceptie explicita pt super-admin).

### Pattern 3: Calcul pur in `utils/`, fara efecte secundare, testabil izolat

**What:** Logica de business complexa (ex. `calculeazaLuniLipsa`) traieste in functii pure in `utils/`, apelate din componente — nu inline in JSX/handlers.
**When to use:** Calculul gratiei (`pastreaza` vs `reseteaza` data_start_facturare) — urmeaza exact acest pattern.
**Example:**
```typescript
// Source: utils/luniLipsa.ts (pattern existent in repo, de urmat 1:1)
export function calculeazaLuniLipsa(
    dataStart: string | null | undefined,
    platiSportiv: Plata[]
): { luna: number; an: number }[] {
    if (!dataStart) return [];
    // ... calcul pur, fara supabase, testabil cu date mock
}
```

### Anti-Patterns to Avoid

- **Nu adauga `data_expirare` ca si camp nou pe `sportivi`** — ar crea o a doua sursa de adevar in paralel cu `plati.luna`/`plati.an` + `data_start_facturare`; toata logica existenta (Luni Lipsa, generare abonamente) se bazeaza pe modelul calendaristic, nu pe interval continuu tip Abonix.
- **Nu copia direct promotia Abonix "adauga X zile bonus gratuit"** — nu exista concept de "zile de abonament" in PhiHau (facturare e per luna calendaristica); echivalentul corect e "urmatoarea luna e gratuita" (suma facturata = 0), nu prelungirea unui interval de zile.
- **Nu presupune ca `schedule_training_reminders()` functioneaza azi pentru expirare abonament** — bug-ul de case-sensitivity (`## Common Pitfalls`) inseamna ca acea ramura nu a trimis niciodata un SMS real din momentul deploy-ului migratiei.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trimitere SMS efectiva | Integrare noua cu un provider SMS | `sms_queue` + `add_sms_to_queue()` + Edge Function `sms-process-queue` existente | Deja gestioneaza rate limiting, retry, multi-provider (android_gateway/smslink/twilio/vonage), audit log |
| Sabloane text editabile | Camp text hardcodat in cod | `sms_templates` (deja are UI `SMSTemplates.tsx` + variabile `{{name}}`/`{{days}}`) | Exact cerinta feature #2 ("sabloane editabile din UI, fara cod") e deja implementata pentru SMS |
| Job zilnic de scanare abonamente expirand | Un nou webhook/cron extern | `pg_cron` + Edge Function, pattern `sms-schedule-reminders` | Singura optiune viabila pe Vercel serverless (fara proces persistent); infrastructura deja exista, doar trebuie extinsa/reparata |
| Calcul "cate luni lipsesc" pentru un sportiv | Logica noua de iterare pe luni | `calculeazaLuniLipsa()` din `utils/luniLipsa.ts` | Deja testat implicit prin `LuniLipsaWizard.tsx` in productie |

**Key insight:** Fiecare din cele 3 feature-uri are deja un "schelet" incepător in cod (SMS templates pentru memento-uri, Bug 4 TODO pentru loialitate, `data_start_facturare`/luni lipsa pentru gratie). Riscul principal nu e lipsa de infrastructura, ci construirea unui al doilea sistem paralel care duplica/contrazice ce exista deja.

## Common Pitfalls

### Pitfall 1: Bug critic — `schedule_training_reminders()` nu trimite niciodata SMS de expirare abonament (case mismatch)

**What goes wrong:** Ramura "Expirare abonament (7 zile)" din functia SQL filtreaza `p.tip = 'abonament'` si `p.status = 'achitat'` (litere mici).
**Why it happens:** Toata aplicatia scrie efectiv `tip: 'Abonament'` si `status: 'Achitat'` (litere mari) — confirmat prin grep in `PlatiScadente.tsx`, `GestiuneFacturi.tsx`, `JurnalIncasari.tsx`, `FacturiPersonale.tsx`, `FamilyPaymentCard.tsx` (peste 10 locuri, toate capitalizate) si prin enum-ul TypeScript `status: 'Achitat' | 'Neachitat' | 'Achitat Parțial' | 'Anulat'` din `types.ts`. Postgres `WHERE tip = 'abonament'` e case-sensitive pe `TEXT` — nu se potriveste niciodata cu `'Abonament'`.
**How to avoid:** Orice extindere a acestei functii (pentru praguri multiple -7/-3/0/+3/+7) TREBUIE sa corecteze in acelasi task filtrele la `p.tip = 'Abonament'` si `p.status = 'Achitat'` — altfel feature-ul 2 mosteneste bug-ul si pare ca "functioneaza" (cod valid, deploy fara erori) dar nu trimite niciodata nimic.
**Warning signs:** Zero randuri noi in `sms_queue` cu `tip='expirare_abonament'` in productie, desi exista sportivi cu abonamente restante de saptamani — semnul clar ca filtrul nu prinde nimic.

### Pitfall 2: Modelul de "expirare" calculat de `schedule_training_reminders()` e o aproximare (30 de zile de la ultima factura platita), nu o data reala de expirare

**What goes wrong:** `p.data + INTERVAL '30 days' AS data_expirare` presupune ca fiecare "luna" de abonament tine exact 30 de zile de la data facturii, dar `handleGenerateSubscriptions` genereaza o factura per luna calendaristica (ianuarie, februarie...), nu per interval de 30 de zile de la ultima plata. Un sportiv facturat pe 1 ianuarie si pe 28 februarie (28 zile diferenta) va parea "expirat" cu 2 zile mai devreme decat unul facturat pe 1 ianuarie si 31 ianuarie.
**Why it happens:** E o presupunere mostenita din modelul Abonix (interval fix), suprapusa peste modelul calendaristic real al PhiHau, fara sa fi fost adaptata.
**How to avoid:** Pentru feature #2, foloseste direct `calculeazaLuniLipsa()`/logica de "luna curenta fara factura" ca sursa de adevar pentru "cine e aproape de expirare", nu un calcul de +30 zile de la ultima factura. Alternativ, daca se pastreaza aproximarea de 30 zile pentru simplitate, documenteaz-o explicit ca aproximare acceptata (nu ca bug ascuns).
**Warning signs:** Memento-uri trimise catre sportivi care de fapt au factura lunii curente deja generata si achitata (fals pozitiv), sau lipsa memento pentru cineva care tocmai a intrat in "luna lipsa" (fals negativ).

### Pitfall 3: `politici_reducere` si `aplicare_reduceri` nu au CREATE TABLE comis in repo — schema exacta necunoscuta

**What goes wrong:** Un plan care presupune coloane exacte pe aceste 2 tabele (in afara de cele date ca "deja confirmate" in scope-ul acestei cercetari: `id, club_id, nume_reducere, procentaj, valoare_fixa, activ` pe `politici_reducere`) risca sa scrie cod impotriva unei scheme gresite.
**Why it happens:** Consistent cu un pattern deja documentat in acest proiect (`feedback_audit_rls_verifica_live_nu_doar_migratii.md`, memoria din Faza 25): politici RLS si chiar tabele intregi au fost create direct pe DB live, fara migratie comisa in git.
**How to avoid:** Primul task de executie al feature-ului 3 (loialitate) trebuie sa fie `list_tables`/`execute_sql` prin Supabase MCP pentru a confirma live coloanele exacte pe `politici_reducere` si `aplicare_reduceri` (in special: cum se leaga `aplicare_reduceri` de un sportiv/familie — FK-uri exacte), inainte de a scrie orice cod care le foloseste.
**Warning signs:** Erori Supabase de tip "column does not exist" la primul test manual.

### Pitfall 4: `reduceri` (UI existent `Reduceri.tsx`) si `politici_reducere` (tabelul real folosit de logica de facturare) sunt tabele DIFERITE

**What goes wrong:** Un plan care extinde `ReduceriManagement`/tabelul `reduceri` crezand ca e acelasi lucru cu `politici_reducere` va construi UI pentru tabelul gresit — modificarile nu vor afecta deloc facturarea reala.
**Why it happens:** `types.ts` are `interface Reducere` (nume, tip, valoare, este_activa, categorie_aplicabila) mapat pe tabelul `reduceri`, folosit de `Reduceri.tsx`. Comentariile "Bug 4 TODO" din `PlatiScadente.tsx` vorbesc explicit despre `politici_reducere` + `aplicare_reduceri` — un tabel si un mecanism separat, nefolosit inca de niciun ecran UI cunoscut in acest repo.
**How to avoid:** Clarifica explicit in plan daca feature-ul de loialitate: (a) extinde `politici_reducere` (tabelul "real" din perspectiva `handleGenerateSubscriptions`) si construieste UI nou pentru el, sau (b) unifica cele doua tabele intr-unul singur. Nu presupune ca editarea `Reduceri.tsx` rezolva feature-ul 3.
**Warning signs:** Cod care insereaza in `reduceri` dar citeste din `politici_reducere` (sau invers) — silent no-op.

### Pitfall 5: `handleGenerateSubscriptions` e singurul loc care creeaza facturi automate lunare — orice logica de gratie/loialitate care nu se cupleaza aici va fi ocolita

**What goes wrong:** Daca gratia sau loialitatea se implementeaza doar ca o verificare separata (ex. un raport care "arata" cine ar trebui sa primeasca gratie/bonus), dar `handleGenerateSubscriptions` continua sa genereze facturi cu pretul plin, feature-ul devine cosmetic.
**Why it happens:** Toata logica de calcul suma facturata (`sumaDeFacturat = abonamentConfig.pret`, minus credit) traieste azi intr-un singur loc, in `PlatiScadente.tsx:242` si `:272`. Orice reducere/bonus trebuie sa modifice exact aceasta valoare, inainte de insert.
**How to avoid:** Planifica task-uri care modifica explicit `handleGenerateSubscriptions` (sau extrag logica intr-un serviciu apelat de acolo), nu doar ecrane de configurare separate.
**Warning signs:** Config de gratie/loialitate salvat cu succes in DB, dar facturile generate arata acelasi pret ca inainte.

## Code Examples

### RPC pattern pentru a programa un SMS (deja live, de reutilizat pentru praguri noi)

```sql
-- Source: supabase/migrations/20260523_sms_system.sql
PERFORM public.add_sms_to_queue(
  v_rec.club_id,
  v_rec.sportiv_id,
  'expirare_abonament',
  jsonb_build_object(
    'days', '7',   -- extinde la valoarea reala a pragului (-7/-3/0/+3/+7)
    'name', v_rec.sportiv_name
  )
);
```

### Pattern client-side pentru calcul suma facturata cu deducere (loc exact de integrare loialitate/gratie)

```typescript
// Source: components/Plati/PlatiScadente.tsx:267-283 (handleGenerateSubscriptions, cod live)
const abonamentConfig = gasesteTipDupaId(tipuriAbonament || [], sportiv.tip_abonament_id)
    || tipuriSezon.find(ab => ab.numar_membri === 1);
if (abonamentConfig) {
    const creditSportiv = indivBalancesFresh.get(sportiv.id) || 0;
    // <-- AICI se aplica politica de reducere/loialitate, inainte de:
    let sumaDeFacturat = abonamentConfig.pret;
    let status: Plata['status'] = 'Neachitat';
    if (creditSportiv >= sumaDeFacturat) { status = 'Achitat'; }
    else if (creditSportiv > 0) { sumaDeFacturat -= creditSportiv; }
    platiToInsert.push({ sportiv_id: sportiv.id, ..., suma: sumaDeFacturat, ... });
}
```

## State of the Art

| Vechi (asumat de raportul Abonix) | Actual (in acest repo) | Cand a aparut | Impact |
|--------------|------------------|------------------|--------|
| Notificari doar manuale, in-app (`sendBulkNotifications`) | Sistem SMS complet (config/templates/queue/log) exista deja, dar reminderul de expirare abonament e mort din cauza unui bug | commit-ul migratiei `20260523_sms_system.sql` | Feature #2 e o reparatie + extindere, nu o constructie noua |
| `reduceri` (tabel simplu, UI dedicat) | `politici_reducere` + `aplicare_reduceri` (tabele separate, fara UI, asteptate de un TODO in cod) | necunoscut — schema live, fara migratie comisa | Feature #3 trebuie sa decida explicit pe care tabel se construieste |

**Deprecated/outdated:** Nimic deprecated in mod formal — dar `reduceri`/`ReduceriManagement.tsx` risca sa devina un ecran "orfan" daca loialitatea se construieste exclusiv pe `politici_reducere`; planner-ul ar trebui sa decida daca unifica sau documenteaza explicit dualitatea.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Schema `politici_reducere` = `id, club_id, nume_reducere, procentaj, valoare_fixa, activ` (data ca "deja confirmata" in scope-ul primit, nu verificata direct de acest research prin interogare live DB) | Standard Stack, Common Pitfalls #3 | Coduri scrise pe coloane inexistente; planner trebuie sa insereze un task de verificare live inainte de implementare |
| A2 | `aplicare_reduceri` leaga o politica de un sportiv/familie/plata — structura exacta a FK-urilor necunoscuta | Common Pitfalls #3 | Design de UI/query gresit pentru mecanismul de mapare |
| A3 | Recomandarea "MVP doar SMS, fara email" — presupune ca utilizatorul accepta sa amane canalul email | Standard Stack | Daca utilizatorul insista pe email in aceasta faza, planul trebuie sa includa alegerea unui provider (Resend recomandat) + Package Legitimacy Gate complet, marind semnificativ scope-ul |
| A4 | Interpretarea "gratie la reinnoire" ca decizie pastreaza/reseteaza `data_start_facturare` (nu ca o noua coloana `data_expirare`/interval continuu tip Abonix) | Summary, Architecture Patterns | Daca utilizatorul de fapt vrea semantica Abonix (interval continuu cu start/end explicit per sportiv), arhitectura recomandata aici e gresita si necesita un model de date complet diferit — trebuie confirmat explicit in `/gsd-discuss-phase` |
| A5 | `has_access_to_club()` se comporta corect si sub `service_role` (apelat din Edge Function cron, fara sesiune de user) — nu verificat direct in aceasta sesiune | Architecture Patterns (Pattern 2) | Daca nu, functiile SQL noi apelate de cron ar putea esua silentios sau ar putea necesita un bypass explicit (`SECURITY DEFINER` fara verificare, ca `add_sms_to_queue` deja face partial) |
| A6 | Pg_cron jobs (`sms-process-queue` la 5 min, `sms-schedule-reminders` la 07:00) sunt DEJA active pe DB live — migratia le contine doar ca instructiuni comentate, "de rulat manual" | Common Pitfalls, Environment Availability | Daca jobs nu sunt de fapt programate live, feature-ul 2 nu va trimite NIMIC automat indiferent cat de bine e scris codul SQL — trebuie verificat live (`SELECT * FROM cron.job`) inainte de a considera feature-ul 2 "gata" |

**Daca acest tabel ramane populat (nu e gol):** planner-ul trebuie sa insereze task-uri explicite de verificare live (Supabase MCP) ca prim val de executie pentru fiecare din A1, A2, A6, inainte de a scrie cod care depinde de ele.

## Open Questions

1. **Ce inseamna concret "gratie la reinnoire" in modelul calendaristic al PhiHau?**
   - What we know: Abonix are interval continuu (start+durata=sfarsit); PhiHau factureaza pe luna calendaristica, fara camp de expirare explicit.
   - What's unclear: Daca "gratie" trebuie sa controleze `data_start_facturare` (pastreaza/reseteaza istoricul de "luni lipsa" la reluarea platilor) sau daca utilizatorul vrea de fapt introducerea unui concept nou de "data urmatoarei scadente" per sportiv (schimbare de arhitectura mult mai mare).
   - Recommendation: Confirma cu utilizatorul explicit inainte de plan — daca raspunsul e "da, vreau exact ca Abonix", faza are nevoie de research suplimentar pe un model de date nou, nu doar de extinderea celui existent.

2. **Loialitatea se calculeaza din `tranzactii` (plati efective, cash/transfer) sau din `plati` cu status Achitat (facturi platite)?**
   - What we know: Scope-ul mentioneaza explicit `tranzactii` ca "sursa de adevar pentru istoricul de reinnoire"; dar `plati.status='Achitat'` e ce se vede efectiv in UI ca "platit".
   - What's unclear: O plata partiala (status "Achitat Parțial") sau o plata stinsa din credit (fara rand nou in `tranzactii`, vezi `creditSportiv >= sumaDeFacturat` in cod) conteaza ca "reinnoire platita" pentru loialitate?
   - Recommendation: Defineste explicit in plan regula de numarare (ex. "N luni consecutive cu `plati.status='Achitat'`", indiferent de mecanismul de stingere).

3. **Praguri configurabile per club sau fixe global?**
   - What we know: Abonix are praguri bifabile in Setari, per organizatie (echivalent per club aici).
   - What's unclear: Daca fiecare club isi seteaza propriile praguri (-7/-3/0/+3/+7 e doar exemplul din Abonix) sau daca sunt fixe pentru toata federatia.
   - Recommendation: Urmeaza pattern-ul `sms_config`/`sms_templates` — per club, editabil de ADMIN_CLUB, cu valori implicite rezonabile.

4. **Cine confirma ca pg_cron jobs sunt live?**
   - What we know: Migratia contine doar instructiuni SQL comentate ("ruleaza manual"), nu un `cron.schedule()` executat automat la aplicarea migratiei.
   - What's unclear: Daca cineva a rulat efectiv acele comenzi pe DB live dupa deploy-ul migratiei SMS (23 mai 2026).
   - Recommendation: Primul task de executie trebuie sa interogheze `SELECT * FROM cron.job;` live prin Supabase MCP.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase pg_cron extension | Memento-uri automate (feature 2) | Necunoscut — nu verificat live in aceasta sesiune | — | Daca lipseste: trigger manual periodic din UI (buton "Trimite memento-uri azi", ca alternativa la automatizare completa) |
| Android SMS Gateway (telefon fizic conectat) | Trimitere efectiva SMS | Depinde de fiecare club — `sms_config.status` poate fi `unconfigured` pentru cluburi care nu au facut setup-ul din `docs/sms-system/ANDROID_GATEWAY_SETUP.md` | — | Fara fallback per club — cluburile fara gateway configurat nu pot primi memento-uri SMS pana nu il configureaza (feature-ul ramane disponibil, dar inert pentru ei) |
| Furnizor email (Resend/SendGrid/SMTP) | Canal email pentru memento-uri (daca inclus) | Nu exista — zero cod/env | — | Recomandare: scoate emailul din MVP-ul acestei faze |
| Supabase MCP (pentru verificare schema live `politici_reducere`/`aplicare_reduceri`) | Feature 3 (loialitate) | Disponibil la nivel de proiect (vezi instructiuni MCP), dar NU a fost folosit in aceasta sesiune de research | — | — |

**Missing dependencies with no fallback:**
- Furnizor email — daca cerinta ramane "email si/sau SMS", email-ul blocheaza pana la o decizie de provider.

**Missing dependencies with fallback:**
- pg_cron neconfirmat live — fallback manual (buton UI) posibil daca automatizarea completa nu poate fi confirmata/activata.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Nu direct | Neschimbat — feature-urile nu ating autentificarea |
| V3 Session Management | Nu | — |
| V4 Access Control | Da | RLS `has_access_to_club(club_id)` pe orice tabel nou (config gratie, praguri notificare) — pattern deja folosit consecvent pe `sms_*` |
| V5 Input Validation | Da | `perioada_gratie_zile >= 0`, praguri notificare = intregi, N reinnoiri consecutive pentru bonus > 0 — validare atat client-side cat si prin `CHECK` constraint SQL |
| V6 Cryptography | Nu | Nu se stocheaza secrete noi in aceasta faza (SMS credentials deja gestionate de `sms_config`, neschimbat) |

### Known Threat Patterns for acest stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Cross-club data leak pe tabel nou de config (gratie/praguri) | Information Disclosure | RLS obligatoriu cu `has_access_to_club(club_id)` de la insertul initial al tabelului — NU adaugat ulterior ca fix (precedent: Faza 15/16/25 au reparat exact acest gen de gap dupa fapt) |
| Injectare continut in template SMS prin `{{name}}` cu date controlate de user | Tampering (limitat) | `add_sms_to_queue` face doar `replace()` text simplu — fara executie/interpolare de cod, risc scazut; nu introduce alt mecanism de randare (ex. `eval`) |
| Abuz trimitere in masa (spam SMS) daca praguri multiple + bug in bucla de deduplicare | Denial of Service (cost financiar SMS) | Pastreaza verificarea `NOT EXISTS (SELECT 1 FROM sms_queue WHERE ... status NOT IN ('failed','cancelled'))` din functia existenta, extinsa per prag (nu doar per tip) — altfel un sportiv poate primi acelasi memento de mai multe ori pe zi daca cron-ul ruleaza de mai multe ori |
| Escaladare: un ADMIN_CLUB seteaza un prag de bonus loialitate absurd de mic pentru propriul club, generand reduceri necontrolate | Elevation of Privilege (business logic abuse) | In afara scope-ului tehnic al acestei cercetari — flag pentru discutie de business (posibil ca doar SUPER_ADMIN_FEDERATIE sa poata seta politici de loialitate, nu fiecare ADMIN_CLUB) |

## Sources

### Primary (HIGH confidence — citire directa cod live din repo)
- `abonix-raport.md` (repo root) — analiza sursa a feature-urilor cerute
- `components/Plati/PlatiScadente.tsx` — fluxul de generare facturi lunare (`handleGenerateSubscriptions`), Bug 4 TODO
- `components/Plati/TipuriAbonament.tsx`, `components/Plati/Reduceri.tsx` — ecrane existente relevante
- `components/SMS/SMSConfigurare.tsx`, `SMSTemplates.tsx`, `SMSLog.tsx`, `AdminSMS.tsx` — sistem SMS existent
- `api/sms.ts` — endpoint trimitere/status/test SMS
- `supabase/migrations/20260523_sms_system.sql` — schema completa SMS (config/templates/queue/rate_log/incoming) + functii `add_sms_to_queue`, `schedule_training_reminders`, trigger `trg_plata_confirmare_sms`
- `supabase/functions/sms-schedule-reminders/index.ts` — Edge Function care apeleaza `schedule_training_reminders`
- `docs/sms-system/ANDROID_GATEWAY_SETUP.md` — arhitectura completa pg_cron + Edge Functions + Android Gateway
- `utils/luniLipsa.ts`, `hooks/useDataStartFacturare.ts` — mecanismul "luni lipsa" / data_start_facturare (Faza 14)
- `types.ts` — enum-uri `Plata.status`, `Plata.tip`, `Reducere`, `TipAbonament`, `Club`
- `.planning/codebase/CONCERNS.md` — Bug 4 TODO documentat, plus alte riscuri de arhitectura relevante
- `docs/baza-de-date.md` — lista tabelelor principale confirmate

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — istoricul deciziilor de proiect si contextul Phase 30 asa cum a fost adaugat in roadmap

### Tertiary (LOW confidence — neverificat live in aceasta sesiune)
- Existenta si starea live a job-urilor pg_cron (`sms-process-queue`, `sms-schedule-reminders`) — migratia contine doar instructiuni, nu executie confirmata
- Schema exacta `politici_reducere` / `aplicare_reduceri` — nicio migratie comisa in git; datele din scope (id, club_id, nume_reducere, procentaj, valoare_fixa, activ pe `politici_reducere`) au fost furnizate ca "deja confirmate" in obiectivul primit, nu verificate independent aici

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero pachete noi necesare, totul verificat prin citire directa de cod si `package.json`
- Architecture: MEDIUM-HIGH — pattern-urile existente (SMS, luni lipsa, Bug 4 TODO) sunt solide si bine intelese; punctul slab e schema neconfirmata a `politici_reducere`/`aplicare_reduceri`
- Pitfalls: HIGH — bug-ul de case-sensitivity e confirmat direct prin comparatie text intre migratie si zeci de locuri din cod care scriu `'Abonament'`/`'Achitat'` capitalizat

**Research date:** 2026-09-18
**Valid until:** 2026-10-18 (30 zile — stack stabil, dar schema live a 2 tabele trebuie reverificata la inceputul executiei, nu doar la research)
