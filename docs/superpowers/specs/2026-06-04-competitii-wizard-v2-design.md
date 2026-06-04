# Competiții Wizard v2 — Design Spec

**Data:** 2026-06-04
**Stare:** Aprobat de utilizator
**Scope:** 5 funcționalități în InscriereClubWizard

---

## Context

Wizard-ul de înscriere competiții (`components/Competitii/InscriereClubWizard/`) are 5 probleme identificate:
1. Inconsistență afișare nume sportiv
2. Filtre Pas1 prea simple (lipsesc vârstă și gen)
3. Song Luyen/Sincron restricționat incorect la `selectedSportivi`
4. Nu există mecanism pentru echipe incomplete inter-club
5. UI neoptimizat pentru mobil/tabletă

---

## Feature 1 — Afișare nume consistentă

**Problemă:** `Pas2Quyen` în `ProbaIndividualaView.tsx` afișează `{sportiv.prenume} {sportiv.nume}` (ordine inversă față de `formatNume()`). Alte locuri din wizard pot avea aceeași inconsistență.

**Fix:** Înlocuire cu `formatNume(sportiv)` din `utils/formatareSportiv.ts` în **toate** locurile din wizard unde apare combinație `prenume + nume` manuală.

**Fișiere afectate:**
- `ProbaIndividualaView.tsx` — Pas2 header sportiv
- Scan complet wizard pentru orice `sportiv.prenume` + `sportiv.nume` manual

---

## Feature 2 — Filtre Pas1 Thao Quyen

**Problemă:** Filtrele actuale = search + grade pills. Lipsesc filtre vârstă și gen.

**Design nou:**

```
[ 🔍 Caută după nume... ] [ Grad ▾ ] [ Vârstă ▾ ] [ Gen ▾ ] [ ✕ Reset ]
```

Fiecare buton deschide **dropdown cu multi-select** (checkboxuri). Când are selecții active: `Grad (2)`. Filtrele se combină cu AND. Reset șterge toate simultan.

**Populare dinamică:**
- **Grad** — gradele distincte prezente în `sportiviEligibili`
- **Vârstă** — categoriile probei (`categorii.filter(c => c.proba_id === probaId)`) → extrage intervalele de vârstă unice (`varsta_min`, `varsta_max`) și le afișează ca `U12 (10–11 ani)`. Un sportiv trece filtrul dacă vârsta lui la `dataCompetitie` se încadrează în cel puțin unul din intervalele selectate. Funcție helper nouă: `getCategoriiVarsta(categorii, probaId): VarstaInterval[]`.
- **Gen** — valorile distincte `sex` prezente în `sportiviEligibili`

**Logica filtrare:**
```typescript
const sportiviVizibili = useMemo(() => {
  let lista = sportiviEligibili;
  if (gradFilter.size) lista = lista.filter(e => gradFilter.has(e.grad?.id ?? ''));
  if (varstaFilter.size) lista = lista.filter(e => varstaFilter.has(getCategorieVarsta(e, categorii, dataCompetitie)));
  if (genFilter.size) lista = lista.filter(e => genFilter.has(e.sportiv.sex ?? ''));
  if (cautare.trim()) lista = lista.filter(e => formatNume(e.sportiv).toLowerCase().includes(cautare.toLowerCase()));
  return lista;
}, [sportiviEligibili, gradFilter, varstaFilter, genFilter, cautare]);
```

**Fișiere afectate:** `ProbaIndividualaView.tsx` — secțiunea `Pas1Sportivi`

---

## Feature 3 — Song Luyen / Sincron: toți sportivii activi

**Problemă:** `ProbaEchipeView.tsx` (linia ~488) și `Pas3Echipe.tsx` (~470) filtrează:
```typescript
sportivi.filter(s => selectedSportivi.has(s.id))
```
Sportivii care nu au participat la Thao Quyen sunt invizibili la echipe.

**Fix:** Scoate filtrul `selectedSportivi` din `ProbaEchipeView` și `Pas3Echipe`. Se folosesc **toți** sportivii din prop-ul `sportivi` (deja filtrat la club + activ de parent-ul `index.tsx` care îl primește de la `FisaCompetitie`).

Eligibilitatea per categorie este verificată deja prin `verificaEligibilitate()` — rămâne neschimbat.

**Fișiere afectate:**
- `ProbaEchipeView.tsx` — linia ~488: șterge `.filter(s => selectedSportivi.has(s.id))`
- `Pas3Echipe.tsx` — linia ~470: același fix

---

## Feature 4 — Cereri coechipier inter-club

### DB — tabel nou `cereri_coechipier`

```sql
CREATE TABLE cereri_coechipier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitie_id UUID NOT NULL REFERENCES competitii(id),
  categorie_id UUID NOT NULL REFERENCES categorii_competitie(id),
  club_solicitant_id UUID NOT NULL REFERENCES cluburi(id),
  nr_locuri_solicitate INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'aprobat', 'respins', 'anulat')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  rezolvat_de UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id)
);
```

RLS: `ADMIN_CLUB` poate INSERT/UPDATE (anulare) pentru clubul propriu. `SUPER_ADMIN_FEDERATIE` vede tot.

### UI Club Admin — ProbaEchipeView

Per fiecare categorie cu locuri incomplete, afișează buton sub lista de sloturi:

**Stări buton:**
- `pending_none` → buton "🤝 Solicită completare din alt club"
- `pending_sent` → card albastru "📨 Cerere trimisă · Super admin decide" + buton Anulează
- `aprobat` → card verde "✓ Completare aprobată · sportiv asignat de super admin"
- `respins` → card roșu "✕ Cerere respinsă" + posibilitate re-trimitere

Constrângerile eligibilității (gen, vârstă, grad minim) sunt derivate automat din `categorie` — clubul nu completează nimic.

### UI Super Admin — FisaCompetitie

Tab nou "Cereri inter-club" cu badge număr cereri pending.

Per cerere:
- Club solicitant + categoria
- Constrângeri auto-derivate din categorie
- Buton "Asignează sportiv" → modal cu search sportivi eligibili din alte cluburi
- Buton "Respinge"

**Notificări:**
- In-app: badge pe iconița competiții + item în lista notificări existente
- Email: trimitere automată la adresa din `auth.users.email` a utilizatorilor cu rol `SUPER_ADMIN_FEDERATIE` pentru federația competiției, via Supabase Database Webhook sau trigger `pg_net`

### Flux complet

```
Club admin → Solicită completare (per categorie)
  → INSERT cereri_coechipier (status='pending')
  → Notificare in-app + email → Super admin
    → Super admin: Asignează sportiv (alege din sportivi eligibili alte cluburi)
      → UPDATE cereri_coechipier (status='aprobat')
      → INSERT echipa_sportivi (sportivul asignat în echipă)
      → Notificare club solicitant
    SAU Super admin: Respinge
      → UPDATE cereri_coechipier (status='respins')
      → Notificare club solicitant
```

---

## Feature 5 — UI Mobil/Tabletă

**Breakpoints:** `sm` = 640px, `md` = 768px, `lg` = 1024px (Tailwind standard)

### Hub Cards (InscriereClubCards)
- Desktop: grid 2-3 col
- Tabletă (md): grid 2 col
- Mobil (sm): grid 1 col, cards full-width

### Pas1 Filtre
- Design dropdown aprobat (vezi mockup `filters-v2.html`)
- Dropdown-urile se închid la click în afara lor (overlay transparent)
- Touch-friendly: min 44px height per item dropdown

### Pas2 Quyen
- Cards sportivi: `w-full` pe mobil, 2 col pe tabletă+
- Buton "Auto-selectează tot" rămâne fixed bottom pe mobil

### ProbaEchipeView (echipe)
- Sloturi echipă: list view pe mobil (nu grid)
- Butoane add/remove: 44px min touch target
- Drag-and-drop dezactivat pe `touch` devices — înlocuit cu tap to add/remove

### Pas4 Sumar
- Tabel → stacked cards pe mobil
- Fiecare sportiv = card cu grad + quyen + categorie

---

## Fișiere de creat/modificat

| Fișier | Tip |
|--------|-----|
| `supabase/migrations/20260604_cereri_coechipier.sql` | NOU |
| `components/Competitii/InscriereClubWizard/ProbaIndividualaView.tsx` | MODIFICAT (F1, F2, F5) |
| `components/Competitii/InscriereClubWizard/ProbaEchipeView.tsx` | MODIFICAT (F3, F4, F5) |
| `components/Competitii/InscriereClubWizard/Pas3Echipe.tsx` | MODIFICAT (F3) |
| `components/Competitii/InscriereClubWizard/index.tsx` | MODIFICAT (F4 state) |
| `components/Competitii/FisaCompetitie.tsx` | MODIFICAT (F4 tab super admin) |
| `components/Competitii/InscriereClubWizard/CereriInterclub.tsx` | NOU (F4 super admin view) |
| `components/Competitii/InscriereClubWizard/InscriereClubCards.tsx` | MODIFICAT (F5) |
| `components/Competitii/InscriereClubWizard/Pas4Sumar.tsx` | MODIFICAT (F5) |
| `types.ts` | MODIFICAT (tip CerereCoechipier) |

---

## Verificare end-to-end

1. **F1:** În Pas2, nameurile sportivilor apar `Nume Prenume` (nu `Prenume Nume`)
2. **F2:** Filtre dropdown funcționează; combinație grad+vârstă+gen filtrează corect; Reset curăță tot
3. **F3:** La Song Luyen, un sportiv care nu a fost bifat la Thao Quyen apare în lista disponibilă
4. **F4:** Club admin trimite cerere → apare în tab super admin → super admin asignează → sportivul apare în echipă
5. **F5:** La 375px lățime, toate componentele sunt utilizabile fără scroll orizontal
