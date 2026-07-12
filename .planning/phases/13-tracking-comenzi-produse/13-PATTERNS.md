# Phase 13: Sistem Tracking Comenzi Produse — Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 9 fișiere noi/modificate
**Analogs found:** 9 / 9

---

## File Classification

| Fișier Nou/Modificat | Rol | Data Flow | Analog Cel Mai Apropiat | Calitate Match |
|----------------------|-----|-----------|-------------------------|----------------|
| `sql/14-comenzi-produse-schema.sql` | migration | CRUD | `sql/migrations/13-catalog-global-produse.sql` | exact |
| `types.ts` (extindere) | model | — | `types.ts` liniile 790–888 (tipuri Produse Phase 12) | exact |
| `services/comenziService.ts` | service | CRUD + event-driven | `services/produseService.ts` | exact |
| `components/Produse/index.tsx` (extindere tab) | component | request-response | `components/Produse/index.tsx` (pattern tab-uri existing) | exact |
| `components/Produse/ComenziProduse/index.tsx` | component | CRUD | `components/Produse/RaportProduse.tsx` | role-match |
| `components/Produse/ComenziProduse/CerereModal.tsx` | component | request-response | `components/Produse/ProdusFormModal.tsx` | exact |
| `components/Produse/ComenziProduse/PredareModal.tsx` | component | request-response | `components/Produse/VanzareModal.tsx` | exact |
| `components/Produse/ComenziProduse/FederatieComandaView.tsx` | component | CRUD | `components/Produse/ComenziProduse/index.tsx` (analog self) | role-match |
| `components/SportivDashboard/index.tsx` (extindere tab Echipamente) | component | request-response | `components/SportivDashboard/index.tsx` liniile 89–101 | exact |
| `components/Produse/RaportProduse.tsx` (extindere) | component | transform | `components/Produse/RaportProduse.tsx` liniile 62–122 | exact |
| `utils/exportBonPredare.ts` | utility | file-I/O | `components/Produse/RaportProduse.tsx` liniile 124–160 (jsPDF pattern) | exact |

---

## Pattern Assignments

---

### `sql/14-comenzi-produse-schema.sql` (migration, CRUD)

**Analog:** `sql/migrations/13-catalog-global-produse.sql`

**Imports pattern — RLS functions disponibile în DB:**
```sql
-- Funcții RLS verificate în sql/migrations/fix_rls_security_audit.sql:
-- public.get_active_club_id() — returnează club_id din header active-role-context-id
-- public.is_super_admin()    — verifică dacă userul curent are rol SUPER_ADMIN_FEDERATIE
```

**Core pattern — structura CREATE TYPE + CREATE TABLE + RLS:**
```sql
-- ORDINE OBLIGATORIE: comenzi_produse ÎNAINTE de cereri_produse (FK dependency)
CREATE TYPE stare_comanda_produs AS ENUM ('DESCHISA', 'PLASATA', 'SOSITA', 'FINALIZATA', 'ANULATA');
CREATE TYPE tip_comanda_produs   AS ENUM ('club_furnizor', 'federatie_club', 'club_federatie');
CREATE TYPE stare_cerere_produs  AS ENUM ('SOLICITATA', 'CONFIRMATA', 'PLASATA', 'SOSITA', 'PREDATA', 'PLATITA', 'ANULATA');

-- 1. Header comandă (PRIMUL — referențiat de cereri_produse)
CREATE TABLE comenzi_produse (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES cluburi(id) ON DELETE CASCADE,
  tip_comanda tip_comanda_produs NOT NULL,
  stare       stare_comanda_produs NOT NULL DEFAULT 'DESCHISA',
  furnizor    TEXT,
  observatii  TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Cerere individuală sportiv
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
  batch_urmatoarea    BOOLEAN NOT NULL DEFAULT false,
  observatii          TEXT,
  created_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS pattern — copiat exact din pattern-ul existent:**
```sql
ALTER TABLE cereri_produse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cereri_produse_select" ON cereri_produse
  FOR SELECT USING (
    public.is_super_admin()
    OR club_id = public.get_active_club_id()
    OR sportiv_id IN (SELECT id FROM sportivi WHERE user_id = auth.uid())
  );

CREATE POLICY "cereri_produse_insert" ON cereri_produse
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR club_id = public.get_active_club_id()
  );

CREATE POLICY "cereri_produse_update" ON cereri_produse
  FOR UPDATE USING (
    public.is_super_admin()
    OR club_id = public.get_active_club_id()
  );
```

**Modificare tabelă existentă (cu guard IF NOT EXISTS):**
```sql
ALTER TABLE produse
  ADD COLUMN IF NOT EXISTS tip_produs TEXT NOT NULL DEFAULT 'per_sportiv'
  CHECK (tip_produs IN ('per_sportiv', 'per_club'));
```

---

### `types.ts` (extindere cu tipuri noi)

**Analog:** `types.ts` liniile 790–888 (tipuri Phase 12)

**Pattern tipuri DB + interfețe extinse** (liniile 790–888):
```typescript
// Pattern existent — copiat exact pentru tipurile noi:
export interface ProdusDB {
  id: string;
  club_id: string | null;
  categorie_id: string;
  denumire: string;
  // ...
}

// Adaugă după tipurile ProdusVanzare existente:
export type StareCerereProdusTip =
  | 'SOLICITATA' | 'CONFIRMATA' | 'PLASATA'
  | 'SOSITA' | 'PREDATA' | 'PLATITA' | 'ANULATA';

export type TipComandaProdusTip =
  | 'club_furnizor' | 'federatie_club' | 'club_federatie';

export type StareComandaProdusTip =
  | 'DESCHISA' | 'PLASATA' | 'SOSITA' | 'FINALIZATA' | 'ANULATA';

export interface CerereProdusBD {
  id: string;
  club_id: string;
  sportiv_id: string | null;
  comanda_id: string | null;
  varianta_id: string;
  cantitate: number;
  stare_cerere: StareCerereProdusTip;
  platit_dupa_predare: boolean;
  plata_id: string | null;
  batch_urmatoarea: boolean;
  observatii: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CerereProdusFull extends CerereProdusBD {
  varianta?: ProdusVariantaDB & { produs?: Pick<ProdusDB, 'denumire' | 'tip_produs'> };
  sportiv_nume?: string;
}

export interface ComandaProduseBD {
  id: string;
  club_id: string;
  tip_comanda: TipComandaProdusTip;
  stare: StareComandaProdusTip;
  furnizor: string | null;
  observatii: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComandaProduseItemBD {
  id: string;
  comanda_id: string;
  varianta_id: string;
  cantitate: number;
  created_at: string;
}

export interface ComandaProduseClubBD {
  id: string;
  comanda_id: string;
  club_id: string;
  cantitate: number;
  confirmat: boolean;
  confirmat_at: string | null;
  created_at: string;
}

export interface ComandaProduseiFull extends ComandaProduseBD {
  cereri: CerereProdusFull[];
  iteme: (ComandaProduseItemBD & {
    varianta?: ProdusVariantaDB & { produs?: Pick<ProdusDB, 'denumire'> };
  })[];
}
```

---

### `services/comenziService.ts` (service, CRUD + event-driven)

**Analog:** `services/produseService.ts`

**Imports pattern** (liniile 1–11 din produseService.ts):
```typescript
import { supabase } from '../supabaseClient';
import type {
  CerereProdusBD,
  CerereProdusFull,
  ComandaProduseBD,
  ComandaProduseiFull,
  ComandaProduseItemBD,
  StareCerereProdusTip,
  StareComandaProdusTip,
  TipComandaProdusTip,
} from '../types';
import { sendNotification, sendBulkNotifications } from '../utils/notifications';
```

**Core pattern CRUD** — copiat din `produseService.ts` liniile 13–60:
```typescript
// Fetch cereri per club (cu nested join)
export async function fetchCereriClub(clubId: string): Promise<CerereProdusFull[]> {
  const { data, error } = await supabase
    .from('cereri_produse')
    .select(`
      *,
      varianta:produse_variante(*, produs:produse(denumire, tip_produs)),
      sportiv:sportivi(nume_complet)
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchCereriClub: ${error.message}`);
  return (data ?? []) as CerereProdusFull[];
}

export async function fetchCereriSportiv(sportivId: string): Promise<CerereProdusFull[]> {
  const { data, error } = await supabase
    .from('cereri_produse')
    .select(`*, varianta:produse_variante(*, produs:produse(denumire, tip_produs))`)
    .eq('sportiv_id', sportivId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchCereriSportiv: ${error.message}`);
  return (data ?? []) as CerereProdusFull[];
}
```

**Pattern creare cerere + notificare** — extinde `createVanzare` + `sendNotification`:
```typescript
export async function createCerere(input: {
  club_id: string;
  sportiv_id: string;
  varianta_id: string;
  cantitate: number;
  observatii?: string;
  adminClubUserIds: string[];  // pentru notificare
}): Promise<CerereProdusBD> {
  const { data, error } = await supabase
    .from('cereri_produse')
    .insert({
      club_id: input.club_id,
      sportiv_id: input.sportiv_id,
      varianta_id: input.varianta_id,
      cantitate: input.cantitate,
      observatii: input.observatii ?? null,
      stare_cerere: 'SOLICITATA',
    })
    .select()
    .single();
  if (error) throw new Error(`createCerere: ${error.message}`);

  // Notifică adminii clubului — pattern din utils/notifications.ts linia 44-70
  await sendBulkNotifications(
    input.adminClubUserIds.map(uid => ({
      recipient_user_id: uid,
      title: 'Cerere echipament nouă',
      body: `Cerere nouă de echipament plasată.`,
      sender_sportiv_id: input.sportiv_id,
    }))
  );
  return data;
}
```

**Pattern marcare predare + factură automată** — copiat direct din `produseService.ts::createVanzare` liniile 215–258:
```typescript
export async function marcheazaPredare(cerereId: string, input: {
  sportiv_id: string;
  club_id: string;
  tip_plata_id: string;   // același tip "Echipamente" din ProduseManagement linia 91
  suma: number;
  denumire_varianta: string;
  sportiv_user_id: string | null;
}): Promise<void> {
  // Validare: cererea trebuie să fie în stare SOSITA înainte de PREDATA
  const { data: cerere } = await supabase
    .from('cereri_produse').select('stare_cerere').eq('id', cerereId).single();
  if (cerere?.stare_cerere !== 'SOSITA')
    throw new Error('Predarea necesită stare SOSITA.');

  // 1. INSERT în plati (identic cu createVanzare linia 216-230)
  const { data: plata, error: errPlata } = await supabase
    .from('plati')
    .insert({
      sportiv_id: input.sportiv_id,
      club_id: input.club_id,
      tip_plata_id: input.tip_plata_id,
      suma: input.suma,
      status: 'Neachitat',
      data: new Date().toISOString().slice(0, 10),
      descriere: `Echipament: ${input.denumire_varianta}`,
    })
    .select('id').single();
  if (errPlata) throw new Error(`marcheazaPredare plata: ${errPlata.message}`);

  // 2. UPDATE cerere → PREDATA + plata_id
  const { error: errU } = await supabase
    .from('cereri_produse')
    .update({ stare_cerere: 'PREDATA', plata_id: plata.id, updated_at: new Date().toISOString() })
    .eq('id', cerereId);
  if (errU) throw new Error(`marcheazaPredare update: ${errU.message}`);

  // 3. Notifică sportivul (guard: sportiv.user_id poate fi null — Pitfall 2)
  if (input.sportiv_user_id) {
    await sendNotification({
      recipient_user_id: input.sportiv_user_id,
      title: 'Echipament predat!',
      body: `${input.denumire_varianta} a fost predat. Plată de ${input.suma.toFixed(2)} RON înregistrată.`,
    });
  }
}
```

**Error handling pattern** — identic cu `produseService.ts`:
```typescript
// Toate funcțiile: throw new Error cu prefix funcție
if (error) throw new Error(`numeFunctie: ${error.message}`);
// Componenta consumatoare: try/catch → showError() sau setError(string)
```

---

### `components/Produse/index.tsx` (extindere tab `comenzi`)

**Analog:** `components/Produse/index.tsx` liniile 24–57 (pattern tab-uri)

**Tab type extension** (linia 24):
```typescript
// ÎNAINTE:
type ActiveTab = 'catalog' | 'intrari' | 'vanzari' | 'raport';

// DUPĂ:
type ActiveTab = 'catalog' | 'intrari' | 'vanzari' | 'comenzi' | 'raport';
```

**TAB_LABELS extension** (liniile 52–57):
```typescript
const TAB_LABELS: { id: ActiveTab; label: string }[] = [
  { id: 'catalog',  label: 'Catalog' },
  { id: 'intrari',  label: 'Intrări Marfă' },
  { id: 'vanzari',  label: 'Vânzări' },
  { id: 'comenzi',  label: 'Comenzi' },   // NOU — între Vânzări și Raport
  { id: 'raport',   label: 'Raport' },
];
```

**Pattern lazy fetch pe tab activ** (liniile 93–114) — fetch datele comenzilor DOAR când activeTab = 'comenzi':
```typescript
// Pattern existent în ProduseManagement — useEffect cu Promise.all
useEffect(() => {
  let cancelled = false;
  if (activeTab !== 'comenzi') return;  // lazy — nu fetch dacă tab-ul nu e activ
  setLoadingComenzi(true);
  Promise.all([fetchCereriClub(clubId), fetchComenziClub(clubId)])
    .then(([cereri, comenzi]) => {
      if (!cancelled) {
        setCereri(cereri);
        setComenzi(comenzi);
        setLoadingComenzi(false);
      }
    })
    .catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Eroare la încărcare comenzi.');
        setLoadingComenzi(false);
      }
    });
  return () => { cancelled = true; };
}, [activeTab, clubId]);
```

---

### `components/Produse/ComenziProduse/index.tsx` (component, CRUD)

**Analog:** `components/Produse/RaportProduse.tsx` (structura generală) + `components/Produse/index.tsx` (state management + modals)

**Imports pattern:**
```typescript
import React, { useState, useMemo } from 'react';
import { Card, Button, Badge } from '../../ui';
import type {
  CerereProdusFull,
  ComandaProduseiFull,
  Permissions,
  User,
} from '../../../types';
import { marcheazaStareCerere, grupeazaInComanda, fetchComenziClub } from '../../../services/comenziService';
```

**Core pattern — sumar agregat per produs** (copiat din `RaportProduse.tsx` liniile 63–87 — reduce pattern):
```typescript
// Sumar cantități per variantă dintr-o comandă
const sumarComanda = useMemo(() => {
  return comanda.cereri.reduce((acc, cerere) => {
    const key = cerere.varianta_id;
    if (!acc[key]) {
      acc[key] = {
        varianta_id: key,
        denumire: cerere.varianta?.produs?.denumire ?? '—',
        cantitate: 0,
        cereri: [],
      };
    }
    acc[key].cantitate += cerere.cantitate;
    acc[key].cereri.push(cerere);
    return acc;
  }, {} as Record<string, SumarVarianta>);
}, [comanda.cereri]);
```

---

### `components/Produse/ComenziProduse/CerereModal.tsx` (component, request-response)

**Analog:** `components/Produse/ProdusFormModal.tsx` liniile 1–55

**Imports pattern** (liniile 1–12 din ProdusFormModal.tsx):
```typescript
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../../ui';
import type { Produs, ProdusVariantaDB, CerereProdusBD } from '../../../types';
import { createCerere } from '../../../services/comenziService';
```

**Form structure pattern** — copiat din ProdusFormModal.tsx liniile 49–55:
```typescript
interface CerereModalProps {
  produse: Produs[];
  clubId: string;
  sportivId: string;
  sportivUserId: string | null;
  adminClubUserIds: string[];
  onSave: (cerere: CerereProdusBD) => void;
  onClose: () => void;
}
```

**Error handling în modal** — pattern din ProdusFormModal.tsx:
```typescript
const [saving, setSaving] = useState(false);
const [error, setError]   = useState<string | null>(null);

const handleSave = async () => {
  setSaving(true);
  setError(null);
  try {
    const result = await createCerere({ ... });
    onSave(result);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Eroare la salvare.');
  } finally {
    setSaving(false);
  }
};
```

---

### `components/Produse/ComenziProduse/PredareModal.tsx` (component, request-response)

**Analog:** `components/Produse/VanzareModal.tsx` (modal cu confirmare + acțiune service)

**Pattern confirmare + execuție:**
```typescript
// Structură identică cu VanzareModal: props + state saving/error + handleConfirm
interface PredareModalProps {
  cerere: CerereProdusFull;
  tipPlataEchipamenteId: string;  // din ProduseManagement linia 91
  onPredare: () => void;
  onClose: () => void;
}

const handleConfirm = async () => {
  setSaving(true);
  try {
    await marcheazaPredare(cerere.id, {
      sportiv_id: cerere.sportiv_id!,
      club_id: cerere.club_id,
      tip_plata_id: tipPlataEchipamenteId,
      suma: (cerere.varianta?.pret_vanzare ?? 0) * cerere.cantitate,
      denumire_varianta: cerere.varianta?.produs?.denumire ?? '—',
      sportiv_user_id: cerere.sportiv?.user_id ?? null,
    });
    onPredare();
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Eroare la predare.');
  } finally {
    setSaving(false);
  }
};
```

---

### `components/SportivDashboard/index.tsx` (extindere tab Echipamente)

**Analog:** `components/SportivDashboard/index.tsx` liniile 89–101 (fetch echipamente existent)

**Pattern fetch lazy** (liniile 89–101 — copiat exact ca model):
```typescript
// EXISTENT — fetch produse (model pentru fetch cereri):
useEffect(() => {
    if (!viewedUser?.id) return;
    setLoadingProduse(true);
    Promise.all([
        fetchProduse(),
        fetchVanzariSportiv(viewedUser.id),
    ]).then(([p, v]) => {
        setProduseCatalog(p.filter(p2 => p2.activ));
        setVanzariMele(v);
        setLoadingProduse(false);
    }).catch(() => setLoadingProduse(false));
}, [viewedUser.id]);

// NOU — adaugă fetch cereri sportiv (aceeași structură):
useEffect(() => {
    if (!viewedUser?.id) return;
    fetchCereriSportiv(viewedUser.id)
      .then(c => setCereriMele(c))
      .catch(() => {/* silent — tab secundar */});
}, [viewedUser.id]);
```

**Notificare admin când sportivul plasează cerere:**
```typescript
// Guards critice (Pitfall 2 din RESEARCH.md):
// 1. sportiv.user_id poate fi null — nu notifica dacă nu are cont
// 2. adminClubUserIds se extrag din utilizator_roluri_multicont WHERE rol_denumire='ADMIN_CLUB'
```

---

### `components/Produse/RaportProduse.tsx` (extindere cu date comenzi)

**Analog:** `components/Produse/RaportProduse.tsx` liniile 17–22 (props interface) + liniile 62–87 (reduce pattern)

**Props extension:**
```typescript
// ÎNAINTE:
interface RaportProduseProps {
  vanzari: ProdusVanzare[];
  clubNume?: string;
}

// DUPĂ:
interface RaportProduseProps {
  vanzari: ProdusVanzare[];
  cereri?: CerereProdusFull[];   // NOU — date comenzi pentru raport extins
  clubNume?: string;
}
```

**Secțiune metrici comenzi** — același pattern ca `StatItem` (liniile 26–41):
```typescript
// Metrici noi calculate cu reduce — identic cu pattern liniile 89-94:
const totalCereri  = cereri?.length ?? 0;
const totalPredate = cereri?.filter(c => c.stare_cerere === 'PREDATA' || c.stare_cerere === 'PLATITA').length ?? 0;
const valoareRestanta = cereri
  ?.filter(c => c.stare_cerere === 'PREDATA' && !c.platit_dupa_predare)
  .reduce((s, c) => s + (c.varianta?.pret_vanzare ?? 0) * c.cantitate, 0) ?? 0;
```

---

### `utils/exportBonPredare.ts` (utility, file-I/O)

**Analog:** `components/Produse/RaportProduse.tsx` liniile 124–160 (jsPDF export pattern)

**Imports + export PDF pattern** (liniile 124–160 din RaportProduse.tsx):
```typescript
import type { CerereProdusFull } from '../types';
// import dinamic — identic cu pattern-ul existent:
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function exportBonPredare(
  cerere: CerereProdusFull,
  clubNume: string
): Promise<void> {
  // Pattern copiat din RaportProduse.tsx liniile 126-160:
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

  // Header — identic cu exportul existent (font, culori, pozitii)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`Bon Predare Echipament`, 14, 14);
  doc.text(clubNume, 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sportiv: ${cerere.sportiv_nume ?? '—'}`, 14, 32);
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, 14, 38);

  // Tabel — pattern identic din autoTable (linia 127-148 RaportProduse.tsx)
  autoTable(doc, {
    startY: 48,
    head: [['Produs', 'Variantă', 'Cantitate', 'Preț (RON)']],
    body: [[
      cerere.varianta?.produs?.denumire ?? '—',
      `${cerere.varianta?.culoare ?? ''} ${cerere.varianta?.marime ?? ''}`.trim(),
      cerere.cantitate,
      ((cerere.varianta?.pret_vanzare ?? 0) * cerere.cantitate).toFixed(2),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(`bon-predare-${cerere.id.slice(0, 8)}.pdf`);
}
```

**Export Excel furnizor** — pattern copiat din `RaportProduse.tsx` liniile 97–122:
```typescript
export async function exportExcelFurnizor(
  comanda: ComandaProduseiFull,
  clubNume: string
): Promise<void> {
  // Pattern dinamic import identic cu RaportProduse.tsx linia 98:
  const { utils, writeFile } = await import('xlsx');
  const rows = comanda.iteme.map(item => ({
    'Produs':    item.varianta?.produs?.denumire ?? '—',
    'Variantă':  `${item.varianta?.culoare ?? ''} ${item.varianta?.marime ?? ''}`.trim(),
    'Cantitate': item.cantitate,
    'Club':      clubNume,
  }));
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Comenzi Furnizor');
  writeFile(wb, `comanda-furnizor-${comanda.id.slice(0, 8)}.xlsx`);
}
```

---

## Shared Patterns

### Notificări in-app
**Sursă:** `utils/notifications.ts` liniile 1–70 (întreg fișierul — 70 linii)
**Aplică la:** `services/comenziService.ts` (toate funcțiile care schimbă starea)

```typescript
// Guard OBLIGATORIU înainte de sendNotification (Pitfall 2 din RESEARCH.md):
if (sportiv.user_id) {
  await sendNotification({
    recipient_user_id: sportiv.user_id,
    title: '...',
    body: '...',
    sender_sportiv_id: cerere.sportiv_id ?? undefined,
  });
}

// Câmpul `type` se trimite în metadata? — NOU: sendNotification NU acceptă metadata,
// tabela notificari nu are coloana `type` separată.
// Soluție: trimite type în body/title sau fă INSERT direct în supabase cu metadata JSONB.
```

**Observație critică din RESEARCH.md Pitfall 1:** `sendNotification` din `utils/notifications.ts`
(linia 23–29) face INSERT fără câmpul `metadata`. Dacă se dorește `metadata.type` pentru filtrare
viitoare, se face INSERT direct în supabase în loc de `sendNotification`.

### Error Handling în servicii
**Sursă:** `services/produseService.ts` — toate funcțiile, pattern uniform
**Aplică la:** `services/comenziService.ts`

```typescript
// Pattern uniform: throw new Error cu prefix funcție — NU returnează { data, error }
if (error) throw new Error(`numeFunc: ${error.message}`);
// Componentele consumă cu try/catch → setError(string) sau showError()
```

### tipPlataEchipamente guard
**Sursă:** `components/Produse/index.tsx` liniile 89–91
**Aplică la:** `components/Produse/ComenziProduse/PredareModal.tsx`

```typescript
// Linia 91 ProduseManagement — pattern de extragere tip plată echipamente:
const tipPlataEchipamente: string =
  tipuriPlati.find(t => t.nume.toLowerCase().includes('echipament'))?.id ?? '';
// Dacă '' → aruncă eroare descriptivă (Pitfall 4 din RESEARCH.md)
```

### useData context
**Sursă:** `components/Produse/index.tsx` linia 64
**Aplică la:** Toate componentele noi din `ComenziProduse/`

```typescript
// Pattern standard proiect — nu se face prop drilling pentru date globale:
const { sportivi, tipuriPlati, clubs, activeRoleContext } = useData();
const clubId: string = (currentUser as any).activeRoleContext?.club_id ?? currentUser.club_id ?? '';
```

---

## No Analog Found

Nu există fișiere fără analog în codebase. Toate pattern-urile sunt acoperite de fișierele existente din Phase 12.

| Fișier | Rol | Notă |
|--------|-----|------|
| `components/Produse/ComenziProduse/FederatieComandaView.tsx` | component | Analog: ComenziProduse/index.tsx (auto-referință) — același CRUD pattern, permisiuni SUPER_ADMIN |

---

## Metadata

**Scope căutare analog:** `components/Produse/`, `services/`, `utils/`, `components/SportivDashboard/`, `types.ts`
**Fișiere scanate:** 8 fișiere citite direct
**Data extragere pattern-uri:** 2026-06-22
