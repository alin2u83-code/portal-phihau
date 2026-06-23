# Phase 14: Corelare Prezențe-Facturi — Research

**Researched:** 2026-06-23
**Domain:** Financial module (Plăți) + Attendance module (Prezență) correlation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Doar `ADMIN_CLUB` poate genera facturi manual, șterge facturi, și vedea raportul "Luni Lipsă"
- `SPORTIV` poate vedea prezențele din modalul propriei facturi (read-only)
- `INSTRUCTOR` nu are acces la aceste funcționalități
- Apare în AMBELE locuri unde se deschide modalul: PlatiScadente + profilul sportivului (tab Plăți)
- Format: număr total vizibil + click expandează lista datelor exacte (nu inline)
- Câmp afișat: "Prezențe în [luna factării]: N ▾" cu expandare pentru lista datelor
- Generarea auto există deja — NU se modifică
- Se adaugă generare manuală: calendar picker lună (trecut/viitor) per sportiv
- Se adaugă wizard detectare luni lipsă cu generare bulk pentru sportivi activi
- Nu se pot genera duplicate (dacă factura pentru luna X există, blocăm)
- Butonul de ștergere există deja — se adaugă restricție
- Activ DOAR pentru facturi cu status neplatit
- Pentru facturi platite: buton dezactivat + tooltip cu explicație
- NU se cere motiv la ștergere (simplitate)
- Calcul față de o dată de start configurabilă de admin per sportiv
- DOAR sportivi activi (nu inactivi/suspendați)
- Badge "X luni fără factură" pe profilul fiecărui sportiv activ afectat
- Raport centralizat în modulul Plăți (tab sau secțiune "Luni Lipsă") cu toți sportivii activi afectați
- NU se modifică types.ts, ui.tsx, DataContext, NavigationContext
- Calculul soldului și generarea auto de facturi rămân intacte
- Filtrare client-side pe date deja încărcate (fără query-uri Supabase noi unde posibil)
- PERMIS: Se pot adăuga query-uri noi în hooks pentru prezențe per lună și pentru luni lipsă

### Claude's Discretion
- Structura componentelor noi (inline vs. modal separat)
- Cum se face query-ul prezențe per lună (join prezente cu factura.luna)
- Exact unde se pune câmpul "data start facturare" per sportiv (câmp nou în sportivi sau în configurare club)
- Pattern de caching pentru prezente per lună (React Query)

### Deferred Ideas (OUT OF SCOPE)
- Motiv obligatoriu la ștergere
- Restricție ștergere per rol (nu doar neplatite)
- Notificări WhatsApp pentru luni lipsă
- Generare automată în bulk pentru toți sportivii unui club dintr-o dată
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLF-01 | Modalul de detalii factură (din PlatiScadente și din profilul sportivului) afișează "Prezențe în [luna]: N ▾" cu expandare liste date exacte | Rezolvat prin query prezenta_antrenament filtrat pe data între 1 și last-day din luna facturii; expus prin useQuery React Query |
| PLF-02 | ADMIN_CLUB poate genera factură lunară pentru orice lună (trecut sau viitor) fără duplicate | Rezolvat prin extinderea GestiuneFacturi cu input type="month" + verificare existentă (plati WHERE tip='Abonament' AND luna=X AND an=Y AND sportiv_id=Z) |
| PLF-03 | Wizard "Luni fără factură" detectează automat lunile lipsă per sportiv activ față de data_start_facturare și permite generare bulk | Rezolvat prin calcul client-side a SET luni între data_start_facturare și azi MINUS lunile cu factură existentă |
| PLF-04 | Butonul "Șterge factură" activ doar pentru neplatite; dezactivat cu tooltip pentru platite | Rezolvat prin condiție p.status !== 'Achitat' în PlatiScadente și FinanciarTab — tooltip HTML `title=` nativ |
| PLF-05 | Badge "X luni fără factură" pe profilul sportivului activ + tab "Luni Lipsă" în modulul Plăți | Badge în UserProfile.tsx header; tab nou 'luni_lipsa' în RaportFinanciar.tsx |
</phase_requirements>

---

## Summary

Faza 14 corelează două module existente — Prezență și Plăți — fără a le modifica structura internă. Cercetarea a confirmat că toate datele necesare există în baza de date curentă și că nu este necesară nicio migrație de schemă, cu o singură excepție: câmpul `data_start_facturare` nu există pe tabelul `sportivi` și trebuie adăugat ca `NULLABLE DATE`.

Modalul de detalii factură există în **două locații distincte**: `FinanciarTab.tsx` (profil sportiv, tab "Istoric Financiar") și **implicit în `PlatiScadente.tsx`** (unde nu există modal de detalii — doar edit inline). Această distincție este critică: PLF-01 se implementează diferit în cele două contexte.

Ștergerea facturilor funcționează diferit în cele două module: `PlatiScadente.tsx` are `ConfirmDeleteModal` apelat din buton `TrashIcon` fără restricție de status; `FinanciarTab.tsx` are `setPlataToDelete` apelat din buton "Șterge" fără restricție. Ambele trebuie să primească restricția PLF-04.

**Primary recommendation:** 3 planuri secvențiale — Plan 01 migrație DB (câmp `data_start_facturare`) + query hook prezențe, Plan 02 PLF-01 + PLF-04, Plan 03 PLF-02 + PLF-03 + PLF-05.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Afișare prezențe în modal factură (PLF-01) | Browser / Client | — | Date deja în React Query cache (plati) + query nou prezenta_antrenament per (sportiv_id, luna, an) |
| Generare factură manuală per lună (PLF-02) | Browser / Client → API/DB | — | Insert în `plati` via supabase client; logica de deduplicare e SQL uniqueness check |
| Calcul luni lipsă (PLF-03) | Browser / Client | — | Calcul pur JS/TS pe date cached (plati) + `data_start_facturare` din sportivi |
| Restricție ștergere pe status (PLF-04) | Browser / Client | — | Condiție UI pe `p.status`; securizare prin faptul că RLS nu permite delete pe altcuiva |
| Badge luni lipsă pe profil (PLF-05) | Browser / Client | — | Calcul client-side; badge renderizat în UserProfile.tsx header |
| Tab "Luni Lipsă" în Plăți (PLF-05) | Browser / Client | — | Tab nou în RaportFinanciar.tsx; date calculate din plati + sportivi din filteredData |
| Câmp data_start_facturare (infrastructură) | Database | — | ALTER TABLE sportivi ADD COLUMN; RLS permite admin write |

---

## Standard Stack

### Core (componente existente care se extind)

| Fișier | Rol în Faza 14 | Status |
|--------|----------------|--------|
| `components/Plati/PlatiScadente.tsx` | PLF-04: restricție ștergere; PLF-01: prezențe în modal nou de detalii | Existent — se modifică |
| `components/UserProfile/FinanciarTab.tsx` | PLF-01: secțiune prezențe în modal detalii factură; PLF-04: restricție ștergere | Existent — se modifică |
| `components/UserProfile.tsx` | PLF-05: badge "X luni fără factură" în header profil | Existent — se modifică |
| `components/Plati/RaportFinanciar.tsx` | PLF-05: tab nou `luni_lipsa` cu lista sportivilor | Existent — se modifică |
| `components/Plati/GestiuneFacturi.tsx` | PLF-02: generare manuală per lună cu month picker | Existent — se modifică |

### Componente noi de creat

| Fișier | Scop | PLF |
|--------|------|-----|
| `components/Plati/LuniLipsaWizard.tsx` | Wizard detectare + generare bulk luni lipsă | PLF-03 |
| `hooks/usePrezenteLuna.ts` | React Query hook: prezențe per (sportiv_id, luna, an) | PLF-01 |

### Infrastructură DB

| Element | Tip | Necesar pentru |
|---------|-----|----------------|
| `ALTER TABLE sportivi ADD COLUMN data_start_facturare DATE` | Migrație SQL | PLF-03, PLF-05 |
| Index pe `prezenta_antrenament(sportiv_id)` | Deja există (`idx_prezenta_sportiv_id`) | PLF-01 |

### Librării folosite (fără instalări noi)

| Librărie | Versiune existentă | Utilizare în faza 14 |
|----------|-------------------|----------------------|
| `@tanstack/react-query` | v5.90.21 | `useQuery` pentru prezente per lună |
| `supabase-js` | v2.98.0 | Query prezenta_antrenament + update sportivi |
| `date-fns` | v4.1.0 | Calcul interval luni (eachMonthOfInterval, startOfMonth, endOfMonth) |
| Tailwind CSS | v3.4.6 | Stilizare badge + wizard |

**Installation:** Nicio instalare nouă necesară. [VERIFIED: package.json codebase grep]

---

## Package Legitimacy Audit

> Faza 14 nu instalează pachete externe noi. Toate librările utilizate sunt deja prezente în `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
ADMIN_CLUB acțiune
        │
        ├─► PLF-01: Click pe factură în PlatiScadente / FinanciarTab
        │       │
        │       └─► usePrezenteLuna(sportiv_id, luna, an)
        │               │ React Query query
        │               └─► prezenta_antrenament JOIN program_antrenamente
        │                       WHERE sportiv_id = X
        │                       AND data BETWEEN [1 luna] AND [last_day luna]
        │                       AND status.este_prezent = true
        │                   → lista date prezente
        │                   → render "Prezențe în Iunie 2026: 8 ▾" expandabil
        │
        ├─► PLF-02: GestiuneFacturi — generare manuală
        │       │
        │       ├─► Input type="month" → (luna: 1-12, an: YYYY)
        │       ├─► Verificare: plati WHERE tip='Abonament' AND luna=X AND an=Y AND sportiv_id=Z
        │       │       → dacă există: showError "Factura există deja"
        │       └─► Insert în plati (refolosire logică din handleGenerateSubscriptions)
        │
        ├─► PLF-03: LuniLipsaWizard
        │       │
        │       ├─► sportivi activi cu data_start_facturare nenul
        │       ├─► pentru fiecare sportiv:
        │       │       luniFataDe = eachMonthOfInterval(data_start_facturare, azi)
        │       │       luniExistente = plati WHERE tip='Abonament' AND sportiv_id=X
        │       │       luniLipsa = luniFataDe \ luniExistente
        │       └─► generare bulk: insert plati pentru fiecare lună lipsă
        │
        ├─► PLF-04: Restricție ștergere
        │       │
        │       ├─► PlatiScadente: buton TrashIcon disabled dacă p.status === 'Achitat'
        │       │       → title="Facturile achitate nu pot fi șterse"
        │       └─► FinanciarTab: buton "Șterge" disabled dacă detalii.status === 'Achitat'
        │
        └─► PLF-05: Vizibilitate luni lipsă
                │
                ├─► UserProfile.tsx header: calcul luniLipsa per sportiv
                │       → Badge amber "X luni fără factură" dacă X > 0
                └─► RaportFinanciar.tsx tab 'luni_lipsa'
                        → tabel: Sportiv | data_start_facturare | Luni Lipsă | Acțiune
                        → click pe acțiune deschide LuniLipsaWizard pentru sportivul respectiv
```

### Recommended Project Structure

```
components/
├── Plati/
│   ├── PlatiScadente.tsx        # PLF-01 (modal detalii nou) + PLF-04 (restricție trash)
│   ├── GestiuneFacturi.tsx      # PLF-02 (generare manuală cu month picker)
│   ├── RaportFinanciar.tsx      # PLF-05 (tab 'luni_lipsa' nou)
│   └── LuniLipsaWizard.tsx      # NOU — PLF-03 (wizard detectare + bulk generate)
├── UserProfile/
│   └── FinanciarTab.tsx         # PLF-01 (prezențe în modal detalii) + PLF-04
components/
└── UserProfile.tsx              # PLF-05 (badge luni lipsă în header)
hooks/
└── usePrezenteLuna.ts           # NOU — React Query hook pentru prezențe per lună
sql/
└── migrations/
    └── add_data_start_facturare.sql  # NOU — ALTER TABLE sportivi
```

### Pattern 1: Query prezențe per lună (PLF-01)

**Ce face:** Returnează datele antrenamentelor la care sportivul a fost prezent în luna specificată.

**Logică DB:**
```typescript
// Source: hooks/useAttendanceData.ts + role_based_views.sql (vedere_prezenta_sportiv pattern)
// prezenta_antrenament JOIN program_antrenamente ON antrenament_id = pa.id
// WHERE sportiv_id = X AND data >= prima_zi_luna AND data <= ultima_zi_luna
// AND status.este_prezent = true (join cu statuse_prezenta)
```

**Hook nou `hooks/usePrezenteLuna.ts`:**
```typescript
// Source: pattern din hooks/usePlati.ts (useQuery cu queryKey + supabase from)
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export const usePrezenteLuna = (sportivId: string | null, luna: number, an: number, enabled = true) => {
    return useQuery({
        queryKey: ['prezente-luna', sportivId, luna, an],
        enabled: enabled && !!sportivId,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const primaZi = new Date(an, luna - 1, 1).toISOString().split('T')[0];
            const ultimaZi = new Date(an, luna, 0).toISOString().split('T')[0];
            
            // Join în memorie după pattern din useAttendanceData.ts
            const { data: prezenta, error } = await supabase
                .from('prezenta_antrenament')
                .select('antrenament_id, sportiv_id, status_id')
                .eq('sportiv_id', sportivId);
            if (error) throw error;
            
            const antrenamentIds = (prezenta || []).map(p => p.antrenament_id);
            if (antrenamentIds.length === 0) return [];
            
            const { data: antrenamente, error: errA } = await supabase
                .from('program_antrenamente')
                .select('id, data')
                .in('id', antrenamentIds)
                .gte('data', primaZi)
                .lte('data', ultimaZi);
            if (errA) throw errA;
            
            // statuse_prezenta: este_prezent = true
            const { data: statusePrez } = await supabase
                .from('statuse_prezenta')
                .select('id, este_prezent');
            const prezentIds = new Set(
                (statusePrez || []).filter(s => s.este_prezent).map(s => s.id)
            );
            
            const antrenamenteIdsInLuna = new Set((antrenamente || []).map(a => a.id));
            const dateByAntrenament = Object.fromEntries(
                (antrenamente || []).map(a => [a.id, a.data])
            );
            
            return (prezenta || [])
                .filter(p => 
                    antrenamenteIdsInLuna.has(p.antrenament_id) && 
                    prezentIds.has(p.status_id)
                )
                .map(p => dateByAntrenament[p.antrenament_id]);
        }
    });
};
```

### Pattern 2: Calcul luni lipsă (PLF-03, PLF-05)

**Logică JS/TS (client-side pe date deja în React Query):**
```typescript
// Source: date-fns v4 (deja instalat în package.json)
// eachMonthOfInterval, startOfMonth, endOfMonth, format
import { eachMonthOfInterval, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

function calculeazaLuniLipsa(
    sportiv: Sportiv,
    platiSportiv: Plata[]
): { luna: number; an: number }[] {
    if (!sportiv.data_start_facturare) return [];
    if (sportiv.status !== 'Activ') return [];
    
    const dataStart = parseISO(sportiv.data_start_facturare);
    const azi = new Date();
    
    // Toate lunile din interval
    const toateLunile = eachMonthOfInterval({ start: dataStart, end: azi });
    
    // Lunile cu factură de tip Abonament
    const luniCuFactura = new Set(
        (platiSportiv || [])
            .filter(p => p.tip === 'Abonament' && p.luna && p.an)
            .map(p => `${p.an}-${p.luna}`)
    );
    
    return toateLunile
        .filter(luna => {
            const key = `${luna.getFullYear()}-${luna.getMonth() + 1}`;
            return !luniCuFactura.has(key);
        })
        .map(luna => ({ luna: luna.getMonth() + 1, an: luna.getFullYear() }));
}
```

### Pattern 3: Generare factură manuală per lună (PLF-02)

**Refolosire din logica existentă `handleGenerateSubscriptions` în `PlatiScadente.tsx`:**
```typescript
// Source: PlatiScadente.tsx lines 73-291 (handleGenerateSubscriptions)
// Logica de calcul sumă per sportiv/familie + creditare sold este deja implementată.
// PLF-02 o refolosește cu parametri: sportivId specific + luna + an specifice

// Verificare duplicat (pattern existent din liniile 222-238):
const { data: existente } = await supabase
    .from('plati')
    .select('id')
    .eq('tip', 'Abonament')
    .eq('luna', lunaSelectata)
    .eq('an', anSelectat)
    .eq('sportiv_id', sportivId); // sau familie_id pentru familii
if (existente && existente.length > 0) {
    showError("Factură existentă", `Există deja o factură pentru ${lunaText}.`);
    return;
}
```

**Input type="month" pentru calendar picker:**
```typescript
// HTML native — fără librărie nouă
// value format: "YYYY-MM" (e.g., "2026-03")
// Extragere: value.split('-') → [an, luna]
<Input
    label="Luna de facturat"
    type="month"
    value={`${an}-${String(luna).padStart(2, '0')}`}
    onChange={e => {
        const [an, luna] = e.target.value.split('-');
        setLunaSelectata(parseInt(luna));
        setAnSelectat(parseInt(an));
    }}
/>
// Source: pattern `<Input type="date">` existent în GestiuneFacturi.tsx line 36
```

### Anti-Patterns to Avoid

- **Anti-pattern: Query prezente în render:** Nu apela `supabase.from('prezenta_antrenament')` direct în componenta care renderizează lista de facturi — folsește `usePrezenteLuna` cu React Query și `enabled: isExpanded` pentru lazy load la click.
- **Anti-pattern: Calcul luni lipsă per sportiv în loop sincronic:** Calculul `calculeazaLuniLipsa` pentru toți sportivii activi (potențial 200+) se face o singură dată cu `useMemo` în componenta LuniLipsaWizard, nu per-render.
- **Anti-pattern: Modificare calcul sold:** Generarea manuală a facturilor pentru luni trecute NU recalculează soldul — inserează factura cu status `Neachitat` sau `Achitat` în funcție de creditul existent (același pattern ca `handleGenerateSubscriptions`).
- **Anti-pattern: types.ts modification:** Câmpul `data_start_facturare` NU se adaugă în `types.ts` (locked). Se accesează ca `(sportiv as any).data_start_facturare` sau prin extinderea componentelor care fac fetch separat de la Supabase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calcul interval luni | Loop manual cu Date() | `date-fns eachMonthOfInterval` | Edge cases: an bisect, lună-an boundary, fusuri orare |
| Format dată în română | Custom formatter | `date.toLocaleString('ro-RO', ...)` | Deja utilizat în toată baza de cod (vezi PlatiScadente.tsx line 142) |
| Caching query prezențe | useState + useEffect | `useQuery` cu React Query | Invalidation automată, deduplicare requesturi, staleTime |
| Verificare duplicat factură | Client-side Set | Supabase WHERE query | Race condition dacă doi admini generează simultan |
| Tooltip pentru buton dezactivat | Custom component | `title=` HTML nativ pe wrapper `<span>` | `disabled` button nu declanșează `title` — wrap în `<span title="...">` |

**Key insight:** Logica de generare facturi (calcul sumă, creditare sold, inserare) există deja în `handleGenerateSubscriptions` din `PlatiScadente.tsx`. Faza 14 extrage această logică într-o funcție reutilizabilă `genereazaFacturaAbonamentPentruLuna(sportivId, luna, an)` care primește parametrii explicit.

---

## Runtime State Inventory

> SKIPPED — faza 14 este greenfield (componente noi + extensii), nu rename/refactor/migration.
> Excepție: câmpul `data_start_facturare` este NULL pentru toți sportivii existenți după migrație — adminul îl setează manual per sportiv. Nu există date de migrat.

---

## Common Pitfalls

### Pitfall 1: Buton disabled nu afișează title/tooltip

**What goes wrong:** `<Button disabled title="Facturile achitate nu pot fi șterse">` — HTML5 nu declanșează tooltip pe elemente `disabled`.

**Why it happens:** Browserele suprimă evenimentele mouse pe elemente disabled.

**How to avoid:** Wrap butonul în `<span title="Facturile achitate nu pot fi șterse">`:
```tsx
{p.status === 'Achitat' ? (
    <span title="Facturile achitate nu pot fi șterse" className="cursor-not-allowed">
        <Button size="sm" variant="danger" disabled className="pointer-events-none">
            <TrashIcon className="w-4 h-4"/>
        </Button>
    </span>
) : (
    <Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)}>
        <TrashIcon className="w-4 h-4"/>
    </Button>
)}
```

**Warning signs:** QA testează și butonul disabled nu arată nicio explicație.

---

### Pitfall 2: types.ts este locked — `data_start_facturare` nu se adaugă

**What goes wrong:** Adăugarea `data_start_facturare?: string | null` în interfața `Sportiv` din `types.ts` — interzis prin CONTEXT.md.

**Why it happens:** Tentație naturală de a tipa câmpul nou.

**How to avoid:** Două opțiuni permise:
1. Cast local: `(sportiv as any).data_start_facturare` în componentele care îl folosesc
2. Fetch separat per sportiv cu `supabase.from('sportivi').select('data_start_facturare').eq('id', sportivId)` în hook dedicat
Opțiunea 2 este mai curată și nu necesită cast.

**Warning signs:** Plan care include modificarea `types.ts`.

---

### Pitfall 3: Modalul de detalii factură există doar în FinanciarTab, nu și în PlatiScadente

**What goes wrong:** Presupunerea că `PlatiScadente.tsx` are un modal de detalii factură similar cu `FinanciarTab.tsx`.

**Why it happens:** Denumirea sugerează că ambele module au aceeași structură.

**How to avoid:** `PlatiScadente.tsx` NU are modal de detalii — are doar edit inline și delete. PLF-01 în contextul `PlatiScadente` înseamnă că se adaugă un modal nou de "Detalii factură + prezențe" sau că prezențele apar direct în rândul expandabil. Recomandat (Claude's Discretion): secțiune expandabilă inline per rând (fără modal separat) în PlatiScadente, pentru a nu rupe UX-ul existent.

**Warning signs:** Plan care referă un `DetaliiFacturaModal` în PlatiScadente care nu există.

---

### Pitfall 4: Familia vs. Sportiv individual — prezențele sunt per sportiv, factura poate fi per familie

**What goes wrong:** Dacă `plata.familie_id` este non-null, `plata.sportiv_id` este null. Nu știm pentru care sportiv din familie să afișăm prezențele.

**Why it happens:** Schema suportă facturi de familie (abonament family).

**How to avoid:** PLF-01 afișează prezențele DOAR pentru facturi cu `sportiv_id` non-null. Pentru facturi de familie (familie_id non-null, sportiv_id null), câmpul "Prezențe" se omite sau se afișează prezențele tuturor membrilor familiei (sumă). Recomandat: omitere pentru simplitate în MVP.

**Warning signs:** `usePrezenteLuna` apelat cu `sportivId = null`.

---

### Pitfall 5: Câmpul `luna` din `plati` este 1-indexed (1=ianuarie)

**What goes wrong:** `new Date().getMonth()` returnează 0-indexed (0=ianuarie). Comparație greșită între `plata.luna` și `new Date().getMonth()`.

**Why it happens:** JS Date este 0-indexed; câmpul DB `luna` este 1-indexed (conform `handleGenerateSubscriptions` line 155: `today.getMonth() + 1`).

**How to avoid:** Sempre `plata.luna === new Date().getMonth() + 1` sau `luna = date.getMonth() + 1` la inserare.

**Warning signs:** Luni lipsă detectate greșit (offset de 1 lună).

---

### Pitfall 6: `data_start_facturare` poate fi NULL pentru sportivi vechi

**What goes wrong:** `eachMonthOfInterval({ start: null, end: azi })` aruncă eroare.

**Why it happens:** Câmpul este NULLABLE — sportivii existenți la lansarea fazei 14 nu îl au setat.

**How to avoid:** Guard în calcul: `if (!sportiv.data_start_facturare) return []`. În wizard, filtrează sportivii la cei cu câmpul setat. Badge-ul PLF-05 apare DOAR dacă `data_start_facturare` este setat.

**Warning signs:** Crash în `eachMonthOfInterval` sau badge "0 luni fără factură" pentru toți sportivii (dacă data_start_facturare este null și se interpretează ca data_inscrierii).

---

## Code Examples

Verified patterns from codebase:

### Verificare existență factură per lună (PLF-02)
```typescript
// Source: PlatiScadente.tsx lines 222-238 (handleGenerateSubscriptions)
const { data: existente, error: eEx } = await supabase
    .from('plati')
    .select('sportiv_id, familie_id')
    .eq('tip', 'Abonament')
    .eq('luna', lunaCurenta)   // 1-indexed!
    .eq('an', anulCurent);
if (eEx) throw eEx;

const existenteSportiv = new Set(
    (existente || []).filter(e => e.sportiv_id).map(e => e.sportiv_id)
);
// Verificare: if (existenteSportiv.has(sportivId)) → showError
```

### Delete cu confirmare (PLF-04)
```typescript
// Source: PlatiScadente.tsx lines 354-389 (confirmDelete)
// Verificare existentă: inscrieri_examene cu plata_id
// Se adaugă guard nou ÎNAINTE de verificare inscrieri:
if (plata.status === 'Achitat') {
    showError("Ștergere imposibilă", "Facturile achitate nu pot fi șterse.");
    setPlataToDelete(null);
    return;
}
// ... restul logicii existente
```

### Badge în profil sportiv (PLF-05)
```typescript
// Source: Badge component — components/ui.tsx line 656
// Variante: 'green' | 'red' | 'amber' | 'blue' | 'slate'
import { Badge } from '../ui';
// Utilizare (dacă luniLipsa.length > 0):
<Badge variant="amber">{luniLipsa.length} luni fără factură</Badge>
```

### Inserare factură manuală cu luna+an explicit (PLF-02)
```typescript
// Source: PlatiScadente.tsx lines 180-189 (structura obiect insert plati)
const newPlata = {
    sportiv_id: sportivId,
    familie_id: null,
    luna: lunaSelectata,   // 1-12
    an: anSelectat,        // YYYY
    suma: sumaDeFacturat,
    data: `${anSelectat}-${String(lunaSelectata).padStart(2,'0')}-01`,
    status: 'Neachitat' as Plata['status'],
    descriere: `Abonament ${lunaText}`,
    tip: 'Abonament',
    observatii: 'Generat manual de admin',
    club_id: sportiv.club_id
};
```

### Migrație SQL `data_start_facturare` (Plan 01)
```sql
-- Source: pattern din sql/migrations/create_missing_tables.sql
ALTER TABLE public.sportivi
    ADD COLUMN IF NOT EXISTS data_start_facturare DATE;

-- Index util pentru filtrare luni lipsă
CREATE INDEX IF NOT EXISTS idx_sportivi_data_start_facturare
    ON public.sportivi (data_start_facturare)
    WHERE data_start_facturare IS NOT NULL;

-- RLS: câmpul urmează politica existentă pe tabelul sportivi
-- (nu necesită politici noi — ADMIN_CLUB poate UPDATE sportivi deja)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prezențe vizibile doar în modulul Prezență | Prezențe corelate cu factura lunară | Faza 14 | Admin vede prezențe direct în contextul financiar |
| Generare facturi doar pentru luna curentă | Generare pentru orice lună (trecut/viitor) | Faza 14 | Recuperare facturi neemise pentru lunile anterioare |
| Ștergere nerestricționată a facturilor | Ștergere blocată pentru facturi achitate | Faza 14 | Previne ștergeri accidentale cu impact pe sold |
| Fără vizibilitate centralizată luni lipsă | Tab "Luni Lipsă" + Badge pe profil | Faza 14 | Admin poate identifica rapid sportivii neacoperiti |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `statuse_prezenta.este_prezent` este câmpul boolean pentru a determina dacă sportivul a fost prezent | Standard Stack (usePrezenteLuna) | Query returnează toate înregistrările, inclusiv absențe — prezențele ar apărea mai multe decât real |
| A2 | `program_antrenamente.data` este câmpul DATE cu data antrenamentului (nu timestamp) | Code Examples | Filtru gte/lte pe string ISO ar putea eșua dacă e TIMESTAMPTZ |
| A3 | RLS pe tabelul `sportivi` permite ADMIN_CLUB să facă UPDATE pe câmpul `data_start_facturare` | Infrastructură DB | UPDATE eșuează cu 403 — necesită politică RLS suplimentară |
| A4 | `plata.luna` și `plata.an` sunt populate pentru TOATE facturile de tip 'Abonament' (inclusiv cele istorice) | Pitfall 5 | Luni lipsă calculate greșit — facturi vechi fără luna/an nu sunt recunoscute ca existente |

**Notă A1:** Confirmat parțial din `useAttendanceData.ts` line 15-18 care face fetch `statuse_prezenta.este_prezent` și `useAttendance.ts` care inserează `status_id`. [CITED: hooks/useAttendanceData.ts codebase]

**Notă A4:** Confirmat că câmpurile `luna` și `an` au fost adăugate la schema `Plata` (types.ts lines 171-172) și sunt populate de `handleGenerateSubscriptions` (PlatiScadente.tsx line 155). Facturile vechi (înainte de această funcționalitate) pot să nu aibă aceste câmpuri populate. [CITED: types.ts, PlatiScadente.tsx codebase]

---

## Open Questions (RESOLVED)

1. **`data_start_facturare` pe sportivi vs. pe un tabel separat de configurare per club**
   - RESOLVED: câmpul merge pe tabelul `sportivi` (NULL-able DATE). Valoarea default per club = deferred v2. NU necesită tabel separat pentru MVP.

2. **PLF-01 în PlatiScadente: expandare inline sau modal?**
   - RESOLVED: expandare inline accordion per rând (un `<tr>` aditional colapsabil desktop, accordion card mobile). Evită modal suplimentar și state management suplimentar.

3. **Facturile de familie (familie_id non-null) — prezențe agregate sau omise?**
   - RESOLVED: omise pentru MVP. Câmpul "Prezențe" nu apare pentru facturi cu `familie_id != null` (`sportiv_id = null`). Extensibil în v2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `date-fns` | PLF-03 calcul interval luni | ✓ | v4.1.0 | — |
| `@supabase/supabase-js` | Toate PLF | ✓ | v2.98.0 | — |
| `@tanstack/react-query` | usePrezenteLuna | ✓ | v5.90.21 | — |
| Supabase DB (remote) | Migrație SQL | ✓ | PostgreSQL (Supabase) | — |

**Missing dependencies with no fallback:** Niciuna.
**Missing dependencies with fallback:** Niciuna.

---

## Security Domain

> `security_enforcement: true` în config.json — secțiunea este obligatorie.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `permissions.isAdminClub` guard în UI + RLS Supabase pe tabelul `plati` (prezent și funcțional) |
| V5 Input Validation | yes | Verificare `luna` (1-12), `an` (YYYY), `sportivId` UUID valid înainte de insert |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Generare factură pentru sportiv din alt club | Tampering | RLS pe `plati` verifică `club_id = get_active_club_id()` — insert pentru alt club eșuează la DB level |
| Ștergere factură achitată prin bypass UI | Tampering | Guard în `confirmDelete` (server-side check la ștergere) — adăugare check status în handlerul existent |
| Generare duplicate prin click multiplu | DoS / Data Integrity | Verificare existentă (`plati WHERE luna=X AND an=Y AND sportiv_id=Z`) + `isGenerating` state lock |
| Acces la prezențele unui sportiv din alt club | Information Disclosure | RLS pe `prezenta_antrenament` (politica `has_access_to_club`) — confirmat în `fix_rls_all_tables.sql` |

**Nota importantă privind restricția ștergere (PLF-04):** Guard-ul de status (`p.status !== 'Achitat'`) trebuie adăugat și în `confirmDelete` (handler server-side) din `PlatiScadente.tsx`, nu doar în UI. Un utilizator cu acces direct la Supabase Dashboard ar putea ocoli UI-ul. Soluție: dublu check în `confirmDelete` — re-fetch status din DB înainte de delete. [ASSUMED — necesită confirmare dacă echipa acceptă această abordare de securitate defensive]

---

## Sources

### Primary (HIGH confidence)
- `components/Plati/PlatiScadente.tsx` — structura completă a modulului plăți, logica de generare auto, delete, UI [VERIFIED: codebase grep]
- `components/UserProfile/FinanciarTab.tsx` — modal detalii factură din profil sportiv [VERIFIED: codebase grep]
- `components/UserProfile.tsx` — tabs profil sportiv, locul badgeului PLF-05, structura header [VERIFIED: codebase grep]
- `components/Plati/RaportFinanciar.tsx` — tab-urile existente în raport financiar, structura pentru adăugare tab nou [VERIFIED: codebase grep]
- `hooks/useAttendanceData.ts` — pattern fetch prezenta_antrenament + join în memorie [VERIFIED: codebase grep]
- `sql/migrations/role_based_views.sql` — structura view-urilor rbv_prezenta_club, coloane disponibile [VERIFIED: codebase grep]
- `sql/fixes/FIX_VIEWS_AND_RLS.sql` — structura vedere_prezenta_sportiv cu coloanele `data`, `sportiv_id`, `antrenament_id` [VERIFIED: codebase grep]
- `types.ts` — interfețele Sportiv (fără data_start_facturare), Plata (cu luna, an), Antrenament (cu data) [VERIFIED: codebase grep]
- `components/ui.tsx` — componenta Badge (variante: green/red/amber/blue/slate), Tooltip absent [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- `sql/migrations/fix_prezenta_timeout_indexes_and_view.sql` — indexurile existente pe prezenta_antrenament [VERIFIED: codebase grep]
- `hooks/usePlati.ts` — pattern simplu useQuery pentru date din Supabase view [VERIFIED: codebase grep]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — toate componentele existente au fost verificate prin citire directă din codebase
- Architecture: HIGH — fluxul de date urmărește pattern-uri deja implementate în faze anterioare
- Pitfalls: HIGH — identificate prin analiza directă a codului existent
- DB Schema: MEDIUM — structura prezenta_antrenament confirmată din migrații SQL; câmpurile exacte (este_prezent) marcate [ASSUMED] în log

**Research date:** 2026-06-23
**Valid until:** 2026-07-23 (30 zile — stack stabil, fără dependențe externe noi)
