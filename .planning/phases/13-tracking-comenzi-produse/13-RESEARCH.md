# Phase 13: Sistem Tracking Comenzi Produse — Research

**Researched:** 2026-06-22
**Domain:** Order tracking state machine, multi-flux command flow, Supabase RLS, in-app notifications
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Mașină de stări comenzi:** `SOLICITATĂ → CONFIRMATĂ → PLASATĂ → SOSITĂ → PREDATĂ + PLĂTITĂ (oricând, sau după predare = datorie) + ANULATĂ`
- **PLĂTITĂ** este stare separată, nu boolean
- **Inițiatori:** Sportiv din dashboard personal; ADMIN_CLUB/INSTRUCTOR în numele sportivului; SUPER_ADMIN_FEDERATIE pentru comenzi top-down
- **Tipuri comenzi:** `club_furnizor` | `federatie_club` | `club_federatie`
- **Câmp `tip_produs`** adăugat în catalogul global (Phase 12): `per_sportiv` | `per_club`
- **Agregare:** Cererile sportivilor se grupează în comandă club (header + iteme); admin poate adăuga la comanda activă sau amâna
- **Vizualizare:** Sumar agregat (cantitate totală per produs) + detaliu expandabil cu sportivii aferenți
- **Flux B (top-down):** SUPER_ADMIN creează comandă per club; clubul primește notificare + confirmă recepție
- **Flux C (bottom-up):** Club → Federație → furnizor centralizat → cluburi → sportivi dacă `per_sportiv`
- **Plată integrată:** La predare se generează factură automată în portofelul sportivului (ca un abonament). Integrare cu Plăți existent — nu se modifică, se extinde.
- **Notificări in-app (4 tipuri):** Club ← sportiv plasează cerere; Sportiv ← club confirmă comanda; Sportiv ← marfă sosită; Sportiv ← plată neachitată reminder
- **Export:** PDF bon predare per sportiv + Excel produse+cantități pentru furnizor + raport lunar extins în tab Raport din ProduseManagement
- **Catalogul global (commit 1310a50, Phase 12):** folosit ca sursă; se adaugă `tip_produs`

### Schema DB propusă (locked)
```
cereri_produse          — cererea unui sportiv (produs + variantă + cantitate + stare)
comenzi_produse         — header comandă (tip: club_furnizor | federatie_club | club_federatie)
comenzi_produse_iteme   — produse + cantități din comandă
comenzi_produse_cluburi — destinatarii unei comenzi federație (per club)
```

### Claude's Discretion

- Structura exactă a tabelelor DB (număr de tabele, foreign keys)
- Logica de batch-uri (dacă multiple comenzi active pot coexista)
- UI exact al dashboard-ului comenzi (tab nou sau secțiune în ProduseManagement)
- Sistemul de notificări (badge simplu sau tabel notificări)
- Numărul și ordinea planurilor de implementare

### Deferred Ideas (OUT OF SCOPE)

- Notificări WhatsApp / SMS
- Semnătură digitală pe bonul de predare
- Returnări / schimburi de produse
- Integrare plată online Netopia
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-01 | Stări comenzi SOLICITATĂ→CONFIRMATĂ→PLASATĂ→SOSITĂ→PREDATĂ + PLĂTITĂ + ANULATĂ; ADMIN_CLUB avansează manual | Schema `cereri_produse.stare_cerere` enum + RLS pentru update stare per rol |
| CMD-02 | Sportivul plasează cerere din dashboard (tab Echipamente); adminul vede badge notificare + lista cererilor noi | Extindere SportivDashboard tab Echipamente + NotificationContext existent |
| CMD-03 | Admin vede sumar comenzi agregate per produs + detaliu expandabil; poate adăuga la comanda activă sau amâna | UI tab nou în ProduseManagement sau view separat `comenzi-produse` |
| CMD-04 | Flux federație→cluburi (top-down): SUPER_ADMIN creează comandă cu cantități per club; club confirmă recepție | Tabel `comenzi_produse_cluburi` + notificare club |
| CMD-05 | Flux club→federație: club trimite cerere; federația agregă; distribuie la cluburi → la sportivi dacă `per_sportiv` | Tip comandă `club_federatie` + `federatie_club` re-distribuit |
| CMD-06 | La predare: factură automată în portofelul sportivului; sportivii cu plată restantă primesc notificare reminder | Pattern `createVanzare` → creare `plati` row; notif via `utils/notifications.ts` |
| CMD-07 | Export: PDF bon predare per sportiv + Excel produse+cantități pentru furnizor | jsPDF + jspdf-autotable (deja instalat); xlsx (deja instalat) |
| CMD-08 | Raport lunar extins în tab Raport din ProduseManagement (extinde RaportProduse.tsx) | Extindere componentă existentă RaportProduse.tsx |
| CMD-09 | Câmp `tip_produs` pe catalogul global (per_sportiv / per_club) | ALTER TABLE produse ADD COLUMN tip_produs + UI în ProdusFormModal.tsx |
</phase_requirements>

---

## Summary

Phase 13 construiește sistemul de tracking al comenzilor de echipamente pe infrastructura Phase 12 deja completă. Modulul Produse are tabele `produse`, `produse_variante`, `produse_intrari`, `produse_vanzari` și un catalog global federație (club_id IS NULL). Ce lipsește complet este fluxul „cerere → comandă → predare → plată".

Infrastructura de care depinde Phase 13 este 100% verificată și funcțională: sistemul de notificări in-app (`NotificationContext` + tabel `notificari` + `sendNotification`/`sendBulkNotifications` în `utils/notifications.ts`), generarea de facturi în portofelul sportivului (pattern documentat în `produseService.ts::createVanzare` — inserează direct în tabela `plati`), export Excel (`xlsx` instalat), export PDF (`jsPDF + jspdf-autotable` instalate), și tabul Echipamente al sportivului (`SportivDashboard/index.tsx` tab-ul `echipamente` existent).

Singura infrastructură nouă necesară este: 4 tabele DB noi, câmpul `tip_produs` pe `produse`, și componenta UI de management comenzi (cel mai probabil un tab nou `comenzi` în `ProduseManagement` plus integrarea în `SportivDashboard`).

**Recomandare primară:** Implementați în 5 planuri: (1) DB schema + types, (2) cereri sportiv + notificare club, (3) management comenzi admin + agregare, (4) fluxuri federație (B și C), (5) predare + factură + export PDF/Excel + raport extins.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Plasare cerere produs de sportiv | Frontend Client | API/Supabase | Sportivul completează un form simplu; date salvate direct via Supabase client cu RLS |
| Agregare cereri → comandă club | Frontend Client | Database | Logica de grupare este client-side pe date deja încărcate; INSERT `comenzi_produse` via Supabase |
| Avansare mașină de stări | Frontend Client | Database | Admin face UPDATE pe stare_cerere; RLS validează rolul |
| Generare factură automată la predare | Frontend Client (service) | Database | Pattern existent `createVanzare` — INSERT în `plati` + INSERT în `produse_vanzari` |
| Notificări in-app | Database (Realtime) | Frontend Client | INSERT în `notificari`; NotificationContext ascultă cu Supabase Realtime channel |
| Export PDF bon predare | Frontend Client | — | jsPDF construit in-browser; nu necesită server |
| Export Excel furnizor | Frontend Client | — | `xlsx` (SheetJS) construit in-browser |
| Raport lunar extins | Frontend Client | — | Extindere RaportProduse.tsx — calcule pe date deja cached |
| Flux federație top-down (B) | Frontend Client | Database | SUPER_ADMIN face INSERT `comenzi_produse` tip `federatie_club` + `comenzi_produse_cluburi` |
| Distribuire per-club → per-sportiv | Frontend Client | Database | Admin club confirmă recepție + distribuie |

---

## Standard Stack

### Core (toate deja instalate — zero pachete noi)

| Library | Versiune din package.json | Scop în Phase 13 | De ce standard |
|---------|--------------------------|------------------|----------------|
| `@supabase/supabase-js` | 2.98.0 | CRUD cereri/comenzi + Realtime notifications | Singurul client DB al proiectului |
| `jsPDF` | 4.2.1 | PDF bon predare per sportiv | Deja folosit în export raport financiar |
| `jspdf-autotable` | 5.0.7 | Tabel în PDF bon predare | Plugin standard pentru jsPDF |
| `xlsx` | 0.18.5 | Excel produse+cantități furnizor | Deja folosit în Phase 12-05 |
| `date-fns` | 4.1.0 | Formatare date pe bon PDF + raport | Standard proiect |
| `react-hot-toast` | 2.6.0 | Feedback acțiuni CRUD comenzi | Standard proiect pentru toasts |

### Supporting

| Library | Versiune | Scop | Când se folosește |
|---------|---------|------|-------------------|
| `Recharts` | 2.15.4 | Eventual grafic în raport extins | Dacă raportul lunar adaugă grafic pe luni |
| `lucide-react` | 0.400.0 | Icoane (Package, Truck, CheckCircle) | UI tab-uri comenzi |

**Niciun pachet nou nu trebuie instalat.** Phase 13 se bazează exclusiv pe stack-ul existent.

### Package Legitimacy Audit

Nu se instalează pachete noi. Secțiunea nu este aplicabilă.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### Diagramă flux date — Phase 13

```
SPORTIV (dashboard tab Echipamente)
  │ plasează cerere (produs, variantă, cantitate)
  ▼
cereri_produse [stare=SOLICITATĂ]
  │ INSERT notificari → recipient=admin_user_id
  ▼
ADMIN_CLUB (ProduseManagement tab Comenzi)
  │ vede badge + lista cereri noi
  │ acțiune "Grupează în comandă"
  ▼
comenzi_produse [tip=club_furnizor] + comenzi_produse_iteme
  │ admin avansează stări: CONFIRMATĂ → PLASATĂ → SOSITĂ
  │ la SOSITĂ: notificare sportiv "marfă sosită"
  │ la PREDATĂ: INSERT plati (status=Neachitat) + notificare sportiv
  ▼
plati (portofelul sportivului, ca orice altă factură)
  │ dacă rămâne Neachitat: notificare reminder
  ▼
[opțional] PLĂTITĂ — sportivul achită la casă sau admin marchează

SUPER_ADMIN (flux B/C)
  │ Flux B: creează comenzi_produse [tip=federatie_club] + comenzi_produse_cluburi per club
  │         → notificare admin club → club confirmă recepție
  │         → dacă per_sportiv: admin distribuie la sportivi → cereri_produse per sportiv
  │
  └ Flux C: club creează comenzi_produse [tip=club_federatie]
            → SUPER_ADMIN agregă → comandă centrală la furnizor
            → sosire → distribuire pe cluburi
```

### Structura recomandată fișiere noi

```
components/
  Produse/
    index.tsx                    # EXISTENT — se adaugă tab 'comenzi'
    RaportProduse.tsx            # EXISTENT — se extinde cu date comenzi
    ProdusFormModal.tsx          # EXISTENT — se adaugă câmp tip_produs
    ComenziProduse/              # NOU — componenta management comenzi
      index.tsx                  # Tab Comenzi admin
      CerereModal.tsx            # Form cerere sportiv sau admin în numele sportivului
      ComandaCard.tsx            # Card comandă cu sumar + detalii expandabile
      PredareModal.tsx           # Modal predare produs → generează factură
  SportivDashboard/
    index.tsx                    # EXISTENT — tab Echipamente extins cu plasare cerere
services/
  comenziService.ts              # NOU — CRUD cereri_produse, comenzi_produse
sql/
  14-comenzi-produse-schema.sql  # NOU — 4 tabele + tip_produs + RLS
types.ts                         # EXISTENT — se adaugă tipuri noi
```

### Pattern 1: Mașina de stări comenzi — enum PostgreSQL

**Ce este:** Stările cererii sunt reprezentate ca enum PostgreSQL, nu text liber.

**De ce:** Validare la nivel DB, imposibil să ajungi într-o stare invalidă.

**Exemplu:**

```sql
-- Source: pattern existent în proiect (status Plata = 'Achitat'|'Neachitat'|'Achitat Parțial')
CREATE TYPE stare_cerere_produs AS ENUM (
  'SOLICITATA',
  'CONFIRMATA',
  'PLASATA',
  'SOSITA',
  'PREDATA',
  'PLATITA',
  'ANULATA'
);

CREATE TABLE cereri_produse (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES cluburi(id) ON DELETE CASCADE,
  sportiv_id      UUID REFERENCES sportivi(id) ON DELETE SET NULL,
  comanda_id      UUID REFERENCES comenzi_produse(id) ON DELETE SET NULL, -- null = neataşat
  varianta_id     UUID NOT NULL REFERENCES produse_variante(id),
  cantitate       INTEGER NOT NULL DEFAULT 1 CHECK (cantitate > 0),
  stare_cerere    stare_cerere_produs NOT NULL DEFAULT 'SOLICITATA',
  platit_dupa_predare BOOLEAN NOT NULL DEFAULT false,
  observatii      TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Pattern 2: Generare factură la predare — extindere pattern existent

**Ce este:** La predare, se face același INSERT în `plati` pe care îl face și `createVanzare`, plus un INSERT în `produse_vanzari` pentru tracking.

**Pattern verificat în `services/produseService.ts::createVanzare`:**

```typescript
// [VERIFIED: codebase grep] — pattern identic din createVanzare (produseService.ts linia 215-230)
// La predare, apelezi:
const { data: plata } = await supabase
  .from('plati')
  .insert({
    sportiv_id: cerere.sportiv_id,
    club_id: cerere.club_id,
    tip_plata_id: tipPlataEchipamente, // același tip găsit în ProduseManagement
    suma: variantaPret * cerere.cantitate,
    status: 'Neachitat',           // sportivul achită separat
    data: todayIso(),
    descriere: `Echipament: ${denumireVarianta}`,
  })
  .select('id')
  .single();
// Actualizezi cererea cu plata_id și stare='PREDATA'
```

### Pattern 3: Notificări in-app — infrastructura existentă

**Ce este:** Se folosește `sendNotification` din `utils/notifications.ts` — un INSERT în tabela `notificari`. NotificationContext ascultă cu Supabase Realtime și afișează badge-ul în header.

**Pattern verificat în `utils/notifications.ts`:**

```typescript
// [VERIFIED: codebase grep] — utils/notifications.ts linia 22-38
import { sendNotification } from '../../utils/notifications';

// La plasare cerere de sportiv → notifică adminul clubului:
await sendNotification({
  recipient_user_id: adminClubUserId,  // user_id din utilizator_roluri_multicont
  title: 'Cerere nouă echipament',
  body: `${numeSportiv} a solicitat: ${denumireProdus}`,
  type: 'cerere_produs',
});

// La marfă sosită → notifică sportivul:
await sendNotification({
  recipient_user_id: sportivUserId,
  title: 'Echipamentul tău a sosit!',
  body: `${denumireProdus} este disponibil la club pentru ridicare.`,
  type: 'marfa_sosita',
});
```

**Câmpul `type` (metadata):** Tabela `notificari` are câmpul `metadata` (verificat în `NotificationBell.tsx` linia 102). Se poate adăuga `type` în metadata pentru a distinge notificările de comenzi.

### Pattern 4: Export PDF bon predare — pattern existent din Phase 9

**Ce este:** `jsPDF + jspdf-autotable` pentru PDF-uri. Pattern identic cu exportul din `utils/exportFinanciar.ts`.

```typescript
// [VERIFIED: codebase grep] — utils/exportFinanciar.ts folosește jsPDF+autotable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportBonPredare(cerere: CerereProdusFull, clubNume: string) {
  const doc = new jsPDF();
  doc.text(`Bon Predare Echipament — ${clubNume}`, 14, 20);
  doc.text(`Sportiv: ${cerere.sportiv_nume}`, 14, 30);
  doc.text(`Data predării: ${format(new Date(), 'dd.MM.yyyy')}`, 14, 38);
  autoTable(doc, {
    startY: 50,
    head: [['Produs', 'Variantă', 'Cantitate', 'Preț']],
    body: [[cerere.denumire_produs, cerere.varianta_label, cerere.cantitate, cerere.pret_vanzare]],
  });
  doc.save(`bon-predare-${cerere.sportiv_id}.pdf`);
}
```

### Pattern 5: Export Excel furnizor — pattern existent Phase 12-05

```typescript
// [VERIFIED: codebase grep] — xlsx folosit în RaportProduse.tsx
import * as XLSX from 'xlsx';

export function exportExcelFurnizor(comanda: ComandaFull) {
  const rows = comanda.iteme.map(item => ({
    'Produs': item.denumire_produs,
    'Variantă': item.varianta_label,
    'Cantitate': item.cantitate_totala,
    'Club': comanda.club_denumire,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comenzi');
  XLSX.writeFile(wb, `comanda-${comanda.id}.xlsx`);
}
```

### Pattern 6: Agregare cereri în comandă

**Ce este:** Admin vede toate cererile nesortate (stare=SOLICITATA sau fără comanda_id). Buton „Creează Comandă" → INSERT în `comenzi_produse` + UPDATE `cereri_produse.comanda_id`.

**Recomandare Claude:** O singură comandă activă per club la un moment dat (tip `club_furnizor`). Cererile noi pot fi adăugate la comanda activă (dacă stare_comanda ≤ PLASATA) sau apar ca „în așteptare pentru batch următor".

### Anti-Patterns de evitat

- **Modificarea `produse_vanzari` pentru a stoca comenzi:** Tabelele vânzărilor au semantică diferită (vânzare directă cu plată imediată sau la zi). Comenzile sunt un flux separat — nu reutiliza aceste tabele.
- **Duplicarea logicii de notificare:** Sistemul de notificări existe în `NotificationContext` + `utils/notifications.ts`. Nu reimplementa.
- **State management global pentru comenzi:** Nu adăuga în DataContext — comenzile sunt date locale ale modulului ProduseManagement. Folosește useState local + fetching direct cu useEffect, ca în `ProduseManagement/index.tsx` existent.
- **Generare PDF/Excel server-side:** Nu crea API handler Vercel — ambele librării funcționează in-browser și asta face codul mai simplu.
- **Câmp `stare_comanda` redundant cu stările cererii:** Starea comenzii (`comenzi_produse.stare`) se derivă sau se avansează independent față de starea cererilor individuale. Evitați să mențineți aceeași informație în două locuri.

---

## Don't Hand-Roll

| Problemă | Nu construi | Folosește | De ce |
|----------|-------------|-----------|-------|
| Notificări in-app cu badge | Sistem propriu de polling | `utils/notifications.ts` + `NotificationContext` | Supabase Realtime + badge animat deja implementat |
| Generare PDF | Renderer HTML→PDF custom | `jsPDF + jspdf-autotable` (instalate) | Edge cases complexe la print; livrabile deja testate în Phase 9 |
| Export Excel | CSV manual | `xlsx` SheetJS (instalat) | Format .xlsx nativ, compatibil Excel fără configurație extra |
| Generare factură sportiv | Logică proprie | Pattern `createVanzare` din `produseService.ts` | Inserează în `plati` + declanșează tot portofelul existent |
| Formatare date | Calcule manuale | `date-fns` format/formatDistance | Edge cases timezone, locale română |
| Validare stare tranzitivă | Verificare manuală în UI | Enum PostgreSQL + CHECK constraint în DB | Imposibil să trimiți stare invalidă chiar dacă ocolești UI |

**Insight cheie:** Phase 12 a construit deja cel mai greu: serviciul de generare facturi (row în `plati`), catalogul global, și exportul Excel/PDF. Phase 13 refolosește toate aceste piese.

---

## DB Schema — Ce există vs. Ce e de adăugat

### Tabele existente (Phase 12) — se folosesc as-is

| Tabelă | Conținut | Utilizare în Phase 13 |
|--------|----------|----------------------|
| `produse` | Catalog produse (club sau global) | Sursă pentru cereri |
| `produse_variante` | Variante cu prețuri | FK din `cereri_produse.varianta_id` |
| `produse_vanzari` + `produse_vanzari_detalii` | Vânzări directe | Se crează un row la predare (ca acum) |
| `plati` | Facturi sportivi | Se inserează la predare (`status=Neachitat`) |
| `notificari` | Notificări in-app | Se inserează din `comenziService.ts` |
| `produse_categorii` | Categorii | Nu se modifică |
| `produse_intrari` | Intrări marfă | Nu se atinge |
| `produse_preturi_club` | Override prețuri per club | Folosit la afișare preț în cerere |

### Modificări la tabele existente (minimale)

```sql
-- [ASSUMED] câmpul tip_produs nu există încă — de verificat înainte de aplicare
ALTER TABLE produse ADD COLUMN IF NOT EXISTS
  tip_produs TEXT NOT NULL DEFAULT 'per_sportiv'
  CHECK (tip_produs IN ('per_sportiv', 'per_club'));
```

**De ce `per_sportiv` ca default:** Majority produselor (echipament individual) se distribuie per sportiv.

### Tabele noi (Phase 13)

```sql
-- 1. Cereri individuale ale sportivilor
CREATE TYPE stare_cerere_produs AS ENUM (
  'SOLICITATA', 'CONFIRMATA', 'PLASATA', 'SOSITA', 'PREDATA', 'PLATITA', 'ANULATA'
);

CREATE TABLE cereri_produse (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID NOT NULL REFERENCES cluburi(id) ON DELETE CASCADE,
  sportiv_id          UUID REFERENCES sportivi(id) ON DELETE SET NULL,
  comanda_id          UUID REFERENCES comenzi_produse(id) ON DELETE SET NULL,
  varianta_id         UUID NOT NULL REFERENCES produse_variante(id),
  cantitate           INTEGER NOT NULL DEFAULT 1 CHECK (cantitate > 0),
  stare_cerere        stare_cerere_produs NOT NULL DEFAULT 'SOLICITATA',
  platit_dupa_predare BOOLEAN NOT NULL DEFAULT false,
  plata_id            UUID REFERENCES plati(id) ON DELETE SET NULL,
  observatii          TEXT,
  batch_urmatoarea    BOOLEAN NOT NULL DEFAULT false, -- admin marchează "amână"
  created_by          UUID,  -- user_id auth
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Header comandă (batch de cereri sau comandă directă federație)
CREATE TYPE tip_comanda_produs AS ENUM (
  'club_furnizor',    -- Flux A: club agregă cereri → furnizor
  'federatie_club',   -- Flux B: federație → cluburi
  'club_federatie'    -- Flux C: club → federație → furnizor centralizat
);

CREATE TYPE stare_comanda_produs AS ENUM (
  'DESCHISA', 'PLASATA', 'SOSITA', 'FINALIZATA', 'ANULATA'
);

CREATE TABLE comenzi_produse (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES cluburi(id) ON DELETE CASCADE,
  tip_comanda     tip_comanda_produs NOT NULL,
  stare           stare_comanda_produs NOT NULL DEFAULT 'DESCHISA',
  furnizor        TEXT,
  observatii      TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Iteme dintr-o comandă (sumar agregat per variantă)
CREATE TABLE comenzi_produse_iteme (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id      UUID NOT NULL REFERENCES comenzi_produse(id) ON DELETE CASCADE,
  varianta_id     UUID NOT NULL REFERENCES produse_variante(id),
  cantitate       INTEGER NOT NULL CHECK (cantitate > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Destinatari per-club pentru comenzile federației (Flux B și C)
CREATE TABLE comenzi_produse_cluburi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id      UUID NOT NULL REFERENCES comenzi_produse(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL REFERENCES cluburi(id) ON DELETE CASCADE,
  cantitate       INTEGER NOT NULL CHECK (cantitate > 0),
  confirmat       BOOLEAN NOT NULL DEFAULT false,
  confirmat_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comanda_id, club_id)
);
```

### RLS recomandat pentru tabelele noi

**Pattern verificat:** Proiectul folosește funcțiile `public.get_active_club_id()` și `public.is_super_admin()` (verificate în `sql/migrations/13-catalog-global-produse.sql` și `fix_rls_security_audit.sql`).

```sql
-- cereri_produse: club vede propriile cereri, sportiv vede propriile cereri, SUPER_ADMIN vede tot
CREATE POLICY "cereri_produse_select" ON cereri_produse
  FOR SELECT USING (
    public.is_super_admin()
    OR club_id = public.get_active_club_id()
    OR sportiv_id IN (
      SELECT id FROM sportivi WHERE user_id = auth.uid()
    )
  );

-- INSERT: SPORTIV poate crea cerere pentru sine; ADMIN poate crea pentru orice sportiv din club
CREATE POLICY "cereri_produse_insert" ON cereri_produse
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR club_id = public.get_active_club_id()
    OR sportiv_id IN (SELECT id FROM sportivi WHERE user_id = auth.uid() AND club_id = cereri_produse.club_id)
  );

-- UPDATE: ADMIN_CLUB poate avansa stări; sportivul poate anula propria cerere în stare SOLICITATA
CREATE POLICY "cereri_produse_update" ON cereri_produse
  FOR UPDATE USING (
    public.is_super_admin()
    OR club_id = public.get_active_club_id()
  );
```

---

## Common Pitfalls

### Pitfall 1: Tabela `notificari` — câmpuri necesare

**Ce merge prost:** Codul trimite `type` ca câmp top-level dar tabela îl acceptă doar în `metadata` (JSONB).

**De ce se întâmplă:** `NotificationContext.tsx` modelează `Notification` cu câmpuri `title`, `body`, `is_read`, `metadata` — nu are `type` ca coloană separată.

**Cum se evită:** Trimite `type` în câmpul `metadata` al INSERT-ului:
```typescript
await supabase.from('notificari').insert({
  recipient_user_id: userId,
  title: '...',
  body: '...',
  metadata: { type: 'cerere_produs', cerere_id: cerereId }
});
```

### Pitfall 2: Sportivul nu are `user_id` mereu

**Ce merge prost:** `sendNotification({ recipient_user_id: sportiv.user_id })` aruncă eroare dacă sportivul nu are cont creat.

**De ce se întâmplă:** Sportivii pot fi introduși manual de admin fără cont creat. `user_id` poate fi `null`.

**Cum se evită:** Verificare înainte de notificare:
```typescript
if (sportiv.user_id) {
  await sendNotification({ recipient_user_id: sportiv.user_id, ... });
}
```

### Pitfall 3: `cereri_produse` fără FK la `comenzi_produse` — ordinea CREATE TABLE

**Ce merge prost:** `cereri_produse.comanda_id` referențiază `comenzi_produse.id` dar `comenzi_produse` nu există încă când se rulează migrația.

**Cum se evită:** Definește `comenzi_produse` ÎNAINTE de `cereri_produse` în SQL, sau folosește `ALTER TABLE` post-facto pentru FK.

### Pitfall 4: `tip_plata_id` pentru echipamente poate lipsi

**Ce merge prost:** `createVanzare` necesită `tip_plata_id` = ID-ul tipului de plată "Echipamente". Dacă tipul nu există în `tipuri_plati`, INSERT-ul `plati` eșuează cu FK constraint.

**De ce:** ProduseManagement.tsx îl caută astfel: `tipuriPlati.find(t => t.nume.toLowerCase().includes('echipament'))`. Dacă nu găsit, `tipPlataEchipamente = ''` → FK invalid.

**Cum se evită:** Aceeași logică în `comenziService.ts` la generarea facturii la predare. Dacă tipul lipsește, aruncă eroare descriptivă. Opțional: seed `tipuri_plati` cu `'Echipamente'` dacă nu există.

### Pitfall 5: Re-rendere nedorite prin state sprawl în ProduseManagement

**Ce merge prost:** Adăugarea unui tab nou `comenzi` cu `useState` pentru cereri, comenzi, etc. în `ProduseManagement/index.tsx` poate cauza re-fetch al tuturor datelor la schimb de tab.

**Cum se evită:** Fetch-ul datelor de comenzi să fie lazy (doar când `activeTab === 'comenzi'`), ca pattern-ul existent cu `useEffect` pe `activeTab`.

### Pitfall 6: Vizualizare sumar agregat vs. detalii — structura join-ului

**Ce merge prost:** JOIN `cereri_produse + produse_variante + produse` pentru sumar poate returna prea multe rânduri și face UI-ul lent.

**Cum se evită:** Fetch cu un singur query `comenzi_produse` cu nested `cereri:cereri_produse(*, varianta:produse_variante(*, produs:produse(denumire)))`. Calculul „cantitate totală per produs" se face client-side cu `reduce()`.

---

## Sistem Notificări — Infrastructura Existentă (verificat)

### Ce există [VERIFIED: codebase grep]

- Tabela `notificari` cu câmpuri: `id`, `recipient_user_id`, `title`, `body`, `is_read`, `created_at`, `sent_by`, `metadata` (JSONB), `sender_sportiv_id`
- `NotificationContext.tsx` — provider cu Supabase Realtime channel per user (`user-notifications-{userId}`)
- `NotificationBell.tsx` — badge cu animație în Header, dropdown cu ultimele notificări
- `utils/notifications.ts::sendNotification` + `sendBulkNotifications` — helper simplu INSERT în `notificari`
- `useNotifications()` hook — expune `notifications`, `unreadCount`, `markAsRead`

### Ce lipsește pentru Phase 13

- Tipuri de notificări pentru comenzi: se adaugă via `metadata.type` (fără modificare schema)
- Funcție helper specializată în `comenziService.ts` care apelează `sendNotification` cu payload corectat

### Arhitectura notificărilor pentru comenzi

| Eveniment | Emitor | Destinatar | Title |
|-----------|--------|-----------|-------|
| Sportiv plasează cerere | sportiv (sau admin) | admin club | „Cerere echipament nouă" |
| Admin confirmă comanda | admin | sportiv | „Comanda ta a fost confirmată" |
| Marfă sosită la club | admin | sportiv | „Echipamentul a sosit!" |
| Plată restantă (reminder) | admin | sportiv | „Plată restantă — echipament" |

---

## Integrare cu Modulul Plăți — Pattern verificat

### Cum funcționează generarea facturii [VERIFIED: codebase grep produseService.ts]

Codul din `createVanzare` (linia 215–230 din `services/produseService.ts`) face exact ceea ce avem nevoie:

1. INSERT în tabela `plati` cu `status: 'Neachitat'`, `tip_plata_id`, `suma`, `sportiv_id`, `club_id`
2. INSERT în `produse_vanzari` cu referința `plata_id` la rândul creat
3. Scade stocul din `produse_variante`

**Pentru Phase 13 (predare comandă):** Pattern identic, dar sursa e `cereri_produse`, nu un VanzareModal. Service `comenziService.ts` va expune funcția `marheazaPredare(cerereId)` care:
- Calculează suma din `varianta.pret_vanzare * cerere.cantitate`
- INSERT în `plati` (status: Neachitat — sportivul achită când vine)
- Opțional INSERT în `produse_vanzari` (pentru raportul de vânzări + profit)
- UPDATE `cereri_produse.stare_cerere = 'PREDATA'`, `plata_id = newPlataId`

**Observație importantă:** La predare pentru comenzi, stocul NU se scade automat (pentru Flux B/C stocul clubului poate să nu fie relevant). Dacă se dorește scădere stoc, se adaugă explicit în `marheazaPredare`.

---

## Catalog Global (commit 1310a50) — Ce există

### Structura [VERIFIED: codebase grep sql/migrations/13-catalog-global-produse.sql + types.ts]

- `produse.club_id` este **nullable** (NULL = catalog global federație)
- `produse_preturi_club` — override prețuri per variantă per club
- RLS pe `produse` selectează: `is_super_admin() OR club_id IS NULL OR club_id = get_active_club_id()`

### Câmpul `tip_produs` — Nu există încă [ASSUMED]

Bazat pe `types.ts` (linia 790-799) și inspectarea SQL, câmpul `tip_produs` nu apare în schema curentă a tabelei `produse`. Va trebui adăugat prin `ALTER TABLE`.

**Câmpul ce trebuie adăugat:**
```sql
ALTER TABLE produse
ADD COLUMN IF NOT EXISTS tip_produs TEXT NOT NULL DEFAULT 'per_sportiv'
CHECK (tip_produs IN ('per_sportiv', 'per_club'));
```

**UI (ProdusFormModal.tsx):** Adăugare selector `tip_produs` cu 2 opțiuni, vizibil doar pentru SUPER_ADMIN (produsele globale) sau ADMIN_CLUB (produsele club-ului).

---

## SportivDashboard — Tab Echipamente — Ce există [VERIFIED: codebase grep]

Tabul `echipamente` există deja în `SportivDashboard/index.tsx` (linia 236-300). Afișează:
- "Achizițiile mele" — lista `vanzariMele` (din `fetchVanzariSportiv`)
- "Produse disponibile" — catalogul cu prețuri și variante

### Ce se adaugă în Phase 13

- Secțiune „Comenzile mele" — lista `cereriMele` (stare + produs + dată)
- Buton „Solicită produs" → deschide `CerereModal` (sau inline form simplu)
- State: `cereriMele: CerereProdusFull[]` + `fetchCereriSportiv(sportivId)`

**Nu se modifică structura de tabs** — se adaugă sub secțiunile existente în tabul `echipamente`.

---

## UI Extension Pattern — ProduseManagement

### Tab-uri existente [VERIFIED: codebase grep components/Produse/index.tsx]

```typescript
type ActiveTab = 'catalog' | 'intrari' | 'vanzari' | 'raport';
const TAB_LABELS = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'intrari', label: 'Intrări Marfă' },
  { id: 'vanzari', label: 'Vânzări' },
  { id: 'raport', label: 'Raport' },
];
```

### Recomandare: Tab nou `comenzi`

Se adaugă `'comenzi'` la `ActiveTab` și `TAB_LABELS`. Conținutul tabului este componenta `ComenziProduse/index.tsx`.

**Alternativa unui view separat** (`comenzi-produse` în AppRouter) este mai complexă și implică schimbări în `menuConfig.ts` + `AppRouter.tsx` + `View` type. Tab-ul din ProduseManagement este mai simplu și consistent cu pattern-ul existent (Catalog → Intrări → Vânzări → Comenzi → Raport).

---

## Raport Lunar Extins — Ce există [VERIFIED: codebase grep RaportProduse.tsx]

`RaportProduse.tsx` primește `vanzari: ProdusVanzare[]` și calculează per `denumire_snapshot`. Afișează: cantitate vândută, venit, cost, profit, margin. Are filtrare pe perioadă și export Excel + PDF.

### Ce se adaugă

- Prop suplimentar: `cereri?: CerereProdusFull[]`
- Secțiune nouă: „Comenzi" — tabel cu cereri pe perioadă grupate pe produs + stare
- Metrici noi: total cereri, total predate, total plătite, valoare comenzi restante
- Același export Excel extins cu sheet-ul „Comenzi"

---

## View Type și Routing

### View type curent [VERIFIED: types.ts linia 536]

`View` union string include deja `'produse'` și `'vanzari-produse'`.

**Nu se adaugă view nou** — comenzile rămân sub `'produse'` ca tab. Dacă se decide altfel (view separat), se adaugă `'comenzi-produse'` la union + handler în AppRouter + intrare în menuConfig.

**Recomandare Claude:** Tab în ProduseManagement (nu view separat) — mai puțin overhead, consistent cu modulul.

---

## Structura Planurilor Recomandate

| Plan | Conținut | Fișiere Cheie |
|------|----------|---------------|
| 13-01 | DB Schema: 4 tabele noi + `tip_produs` + RLS + types.ts | `sql/14-comenzi-produse-schema.sql`, `types.ts` |
| 13-02 | Service + Cerere Sportiv: `comenziService.ts` + tab Echipamente SportivDashboard extins cu form cerere + notificare admin | `services/comenziService.ts`, `components/SportivDashboard/index.tsx` |
| 13-03 | Management Comenzi Admin: tab `comenzi` în ProduseManagement + ComenziProduse/, agregare, butoane stări, PredareModal + factură automată | `components/Produse/index.tsx`, `components/Produse/ComenziProduse/` |
| 13-04 | Fluxuri Federație (B și C): SUPER_ADMIN view comenzi, `comenzi_produse_cluburi`, confirmare recepție club | `components/Produse/ComenziProduse/FederatieComandaView.tsx` |
| 13-05 | Export + Raport: PDF bon predare, Excel furnizor, RaportProduse extins cu date comenzi | `components/Produse/RaportProduse.tsx`, `utils/exportBonPredare.ts` |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `jsPDF` | Export PDF bon predare | ✓ | 4.2.1 (package.json) | — |
| `jspdf-autotable` | Tabele în PDF | ✓ | 5.0.7 (package.json) | — |
| `xlsx` | Export Excel furnizor | ✓ | 0.18.5 (package.json) | — |
| `date-fns` | Formatare date PDF/Excel | ✓ | 4.1.0 (package.json) | — |
| `NotificationContext` | Notificări in-app | ✓ | — existent în codebase | — |
| `sendNotification` | Trigger notificări | ✓ | — utils/notifications.ts | — |
| Supabase Realtime | Live badge notificări | ✓ | @supabase/supabase-js 2.98.0 | Polling fallback (acceptabil) |
| `get_active_club_id()` | RLS SQL function | ✓ | — verificat în sql/migrations/ | — |
| `is_super_admin()` | RLS SQL function | ✓ | — verificat în sql/migrations/ | — |

**Missing dependencies with no fallback:** niciuna.

---

## Assumptions Log

| # | Claim | Section | Risk dacă greșit |
|---|-------|---------|-----------------|
| A1 | Câmpul `tip_produs` nu există în tabela `produse` — va trebui `ALTER TABLE` | Schema DB | Dacă există deja, ALTER TABLE va da eroare; de prefixat cu `IF NOT EXISTS` |
| A2 | Tabela `notificari` are coloana `metadata` (JSONB) — câmpul `type` se stochează acolo | Notificări | Dacă tabela nu are `metadata`, `sendNotification` va ignora `type` silently |
| A3 | `get_active_club_id()` și `is_super_admin()` sunt definite în DB (nu le-am văzut CREATE FUNCTION) | RLS | Dacă nu există, toate politicile RLS vor eșua; de verificat în Supabase Dashboard |
| A4 | Stocul pentru produsele din comenzi (Flux B/C) nu se scade automat — doar la vânzare directă | Predare+Factură | Dacă business logic vrea scădere stoc și la comenzi, pattern se extinde |
| A5 | `tip_plata_id` pentru „Echipamente" există în `tipuri_plati` — seed-uit în Phase 12 | Factură automată | Dacă tipul lipsește, INSERT în `plati` eșuează cu FK constraint |

**Toate claim-urile `[ASSUMED]` au risc scăzut** — sunt ușor verificabile la runtime și pot fi gestionate cu `IF NOT EXISTS` și guard checks.

---

## Security Domain

### ASVS Categories aplicabile (security_enforcement: true, nivel 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | da | Supabase Auth — JWT existent |
| V3 Session Management | da | `active-role-context-id` header + RLS |
| V4 Access Control | da | RLS pe cereri/comenzi per club + rol |
| V5 Input Validation | da | CHECK constraints pe enum stări + cantitate > 0 |
| V6 Cryptography | nu | Nu se stochează date sensibile |

### Threat Patterns pentru Phase 13

| Pattern | STRIDE | Mitigare standard |
|---------|--------|------------------|
| Sportiv modifică cererea altui sportiv | Tampering | RLS: UPDATE policy verifică `sportiv_id = sportiv al utilizatorului curent` |
| Admin club modifică comenzile altui club | Tampering | RLS: `club_id = get_active_club_id()` pe toate tabelele |
| SUPER_ADMIN creează comenzi false per club | Spoofing | `is_super_admin()` în RLS — verificat prin `utilizator_roluri_multicont` |
| Stare avansată scos din ordine (ex: PREDATA fără SOSITA) | Tampering | CHECK constraint sau validare în service înainte de UPDATE |
| Notificare trimisă la utilizator greșit | Information Disclosure | `recipient_user_id` verificat cu `auth.uid()` în RLS pe `notificari` |
| Factură generată fără produs predat real | Elevation of Privilege | `marheazaPredare` validează că stare curentă = SOSITA înainte de INSERT în `plati` |

---

## State of the Art

| Abordare veche | Abordare actuală | Impact |
|----------------|------------------|--------|
| Tracking comenzi în Google Sheets extern | Sistem integrat cu facturare automată | Date sincronizate, audit trail |
| Notificări prin WhatsApp manual | In-app notifications cu Supabase Realtime | Instantaneu, fără provider extern |
| Export PDF manual sau din Excel | jsPDF in-browser | Zero infra server, mai rapid |

---

## Open Questions

1. **Stocul se scade la predarea din comandă?**
   - Ce știm: `createVanzare` scade stocul la vânzare directă
   - Ce e neclar: Dacă la „predare din comandă" se dorește același comportament (produsul a ajuns la furnizor → a ajuns la club → stocul clubului ar trebui actualizat?)
   - Recomandare: Da, scade stocul la predare dacă produsul este `per_sportiv`. Pentru `per_club`, stocul se gestionează separat prin IntrareMarfaModal.

2. **Multiple comenzi active simultan per club?**
   - Ce știm: Claude's Discretion — decizia e la planificator
   - Ce e neclar: Un club poate să aibă simultan o comandă `club_furnizor` deschisă și una `club_federatie`?
   - Recomandare: Da, maxim una per tip. Un club poate avea `club_furnizor` deschisă + `club_federatie` deschisă simultan, dar nu două de același tip.

3. **Cine primește notificarea de cerere nouă când adminul nu are `user_id` distinct?**
   - Ce știm: Adminul are `user_id` în `utilizator_roluri_multicont`
   - Recomandare: Căutare în `utilizator_roluri_multicont WHERE club_id = cerere.club_id AND rol_denumire IN ('ADMIN_CLUB')` → trimite la toți adminii clubului.

---

## Sources

### Primary (HIGH confidence)
- Codebase verificat via grep — `services/produseService.ts` — pattern createVanzare
- Codebase verificat via grep — `contexts/NotificationContext.tsx` — infrastructură notificări
- Codebase verificat via grep — `utils/notifications.ts` — sendNotification helper
- Codebase verificat via grep — `components/Produse/index.tsx` — structura tab-urilor existente
- Codebase verificat via grep — `components/SportivDashboard/index.tsx` — tab echipamente existent
- Codebase verificat via grep — `components/Produse/RaportProduse.tsx` — raportul existent
- Codebase verificat via grep — `types.ts` — toate tipurile Produse (linia 780-888)
- Codebase verificat via grep — `sql/migrations/13-catalog-global-produse.sql` — catalog global + RLS functions

### Secondary (MEDIUM confidence)
- `sql/migrations/fix_rls_security_audit.sql` — confirmă pattern RLS `get_active_club_id()` + `is_super_admin()`
- `sql/migrations/fix_rls_all_tables.sql` — confirmă strategia RLS globală a proiectului

### Tertiary (LOW confidence)
- Existența câmpului `metadata` în `notificari` — dedus din `NotificationBell.tsx` linia 102 (`n.metadata?.sender_name`); nu s-a citit schema SQL a tabelei `notificari`

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — niciun pachet nou, toate librăriile verificate în package.json
- DB Schema: HIGH pentru tabelele existente; MEDIUM pentru schema propusă (pattern verificat, dar numerotarea foreign keys e la discreția planificatorului)
- Architecture Patterns: HIGH — patternuri extrase direct din codebase
- Notificări: HIGH — infrastructura verificată integral
- Pitfalls: HIGH — derivate din lectura codului existent
- Fluxuri federație: MEDIUM — logica business e clară, implementarea UI e la discreția planificatorului

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stack stabil, fără dependențe externe noi)
