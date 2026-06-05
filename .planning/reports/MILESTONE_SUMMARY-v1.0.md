# Milestone Summary: Restructurare Modul Grupe & Stagii
**Version:** v1.0
**Generated:** 2026-06-05
**Status:** 75% complet (Phase 3 — Calendar nefinalizată)

---

## 1. Overview

**Ce s-a construit:** Două axe paralele în portalul PhiHau pentru gestionarea antrenamentelor și stagiilor.

**Core Value:** Adminul/instructorul poate gestiona complet antrenamentele unei grupe (drill-down, orar inline, lista sportivi) și poate înscrie sportivi la stagii cu generare automată de facturi corecte — totul dintr-un flux coerent.

**Progres:**
| Phase | Obiectiv | Status |
|-------|----------|--------|
| 1 — DB & Types | Schema + TypeScript | ✅ Complet (2026-06-04) |
| 2 — Navigare Grupe | Drill-down + tab-uri | ✅ Complet (2026-06-04) |
| 3 — Calendar Antrenamente | Calendar lunar + CRUD | ⏸ Neînceput |
| 4 — Stagii Completare | Stagii club + facturi + raport | ✅ Complet (2026-06-05) |

---

## 2. Ce s-a livrat (per fază)

### Phase 1: DB & Types (1 plan, ~30 min)

**Fișiere create/modificate:**
- `sql/migrations/add_status_motiv_antrenamente.sql` — ADD COLUMN status (planificat/anulat/efectuat) + motiv_anulare TEXT nullable pe `program_antrenamente`
- `sql/migrations/add_pret_tipuri_stagii.sql` — ADD COLUMN pret NUMERIC(10,2) nullable pe `tipuri_stagii`
- `types.ts` — interfața `Antrenament` extinsă cu `status?` + `motiv_anulare?`; interfață nouă `TipStagiu` cu `pret?: number | null`

**Commit:** `7cc6dbb`

### Phase 2: Navigare Grupe Drill-Down (2 planuri, ~20 min total)

**Fișiere create/modificate:**
- `components/Grupe/GrupaDetailView.tsx` — componentă nouă (288 linii) cu 3 tab-uri:
  - **Tab Antrenamente** — placeholder (calendar vine în Phase 3)
  - **Tab Orar** — editare orar săptămânal inline (logică din OrarEditorModal, fără regresii); cache invalidation dublă (localStorage + React Query)
  - **Tab Sportivi** — lista read-only + buton Adaugă Sportivi delegat la parent
- `components/Grupe/GrupaCard.tsx` — buton `[Detalii]` primar + `[Gestionează]` secundar; props curățate
- `components/Grupe/index.tsx` — state `grupaSelectedForDetail` + render condiționat drill-down vs grilă

**Commits:** `6ad7862`, `d81d918`, `28a9cb1`, `0dc956a`

**Decizie cheie:** `OrarEditorModal` rămâne montat (backward-compat); GrupaDetailView nu îl înlocuiește — coexistă.

### Phase 3: Calendar & CRUD Antrenamente

⏸ **Neînceput.** Tab Antrenamente din GrupaDetailView e placeholder. Calendarul lunar cu dot-uri colorate, modal anulare cu motiv și buton adaugă one-off sunt planificate dar neimplementate.

### Phase 4: Stagii Completare (3 planuri, ~38 min total)

**Plan 04-01 — Schema DB + TypeScript:**
- Migrație: `pret_copii`, `pret_grade`, `pret_centuri` (NUMERIC nullable) pe `public.evenimente`
- Migrație: `eveniment_id UUID FK` pe `public.plati` (ON DELETE SET NULL)
- `types.ts`: `Eveniment` + `Plata` + `Rezultat` extinse
- **Commit:** `9ff764c`

**Plan 04-02 — Logică prețuri + calcul taxă:**
- `hooks/useDataProvider.ts` — fix: `preturiConfig` acum fetch-uit din DB (bug critic STG-02 rezolvat)
- `StagiiCompetitii.tsx` — `EvenimentForm`: câmpuri preț per categorie (copii/grade/centuri)
- Funcții noi: `calculeazaCategorieStagiu()` + `getTaxaStagiu()` cu 3 niveluri fallback
- `handleAddParticipant` cu guard permisiuni + `eveniment_id` în INSERT plată + preview taxă calculat live
- **Commits:** `3c23d26`, `8f154a6`, `9d98460`

**Plan 04-03 — Raport participanți + Export CSV:**
- `platiParticipanti` useMemo (Map sportiv→plată, O(1) lookup) cu fallback pentru plăți premerge fix
- `randuriiParticipanti` useMemo: sportiv + data + categorie + taxă + status plată
- Tabel 5 coloane colorat (verde=Achitat, roșu=Neachitat, amber=Parțial)
- Export CSV prin Blob + URL.createObjectURL — fără librarii externe
- Guard `permissions.isAdminClub` pe toată secțiunea raport
- **Commit:** `46be7a0`

---

## 3. Decizii arhitecturale

| Decizie | Motivație |
|---------|-----------|
| GrupaDetailView componentă separată | Evită supraîncărcarea GrupaCard; drill-down clar |
| Tab Orar inline (nu Modal) | UX mai fluid — nu blochează navigarea |
| `clearCache` ÎNAINTE de `invalidateQueries` | Pitfall 3 documentat — ordinea inversă cauzează stale data |
| Preț per tip stagiu pe `tipuri_stagii.pret` | Coloana simplă, nu tabel separat — suficient pentru MVP |
| Fallback chain 3 niveluri pentru taxă | pret_per_categorie → tipuri_stagii.pret → preturiConfig global |
| ON DELETE SET NULL pe plati.eveniment_id | Ștergerea evenimentului nu corupe plățile existente |
| CSV fără PapaParse | 5 coloane fixe — overhead librărie nejustificat |
| permissions calculat local în EvenimentDetail | `useData()` nu expune `permissions` — `usePermissions(activeRoleContext)` invocat local |

---

## 4. Cerințe livrate vs planificate

| Cerință | Status |
|---------|--------|
| DB-01: status pe program_antrenamente | ✅ Livrat (Phase 1) |
| DB-02: motiv_anulare pe program_antrenamente | ✅ Livrat (Phase 1) |
| DB-03: pret pe tipuri_stagii | ✅ Livrat (Phase 1) |
| NAV-01: buton Detalii pe GrupaCard | ✅ Livrat (Phase 2) |
| NAV-02: GrupaDetailView cu tab bar | ✅ Livrat (Phase 2) |
| NAV-03: Tab Orar + Tab Sportivi funcționale | ✅ Livrat (Phase 2) |
| CAL-01..04: Calendar lunar + CRUD antrenamente | ❌ Neimplementat (Phase 3 neînceput) |
| STG-01: Stagiu de club (club_id !== null) | ✅ Livrat (Phase 4) |
| STG-02: Taxă per tip stagiu cu fallback | ✅ Livrat (Phase 4) |
| STG-03: Plată apare în PlatiScadente | ✅ Livrat (Phase 4) |
| STG-04: Raport participanți + Export CSV | ✅ Livrat (Phase 4) |
| STG-05: eveniment_id în plată | ✅ Livrat (Phase 4) |

**10/14 cerințe livrate (71%).** Cele 4 nelivrate sunt CAL-01..04 (Phase 3).

---

## 5. Tech Debt & Stubs Known

| Item | Locație | Severitate |
|------|---------|-----------|
| Tab Antrenamente placeholder | `GrupaDetailView.tsx:25-37` | Intenționat — Phase 3 |
| Fallback join plăți fără eveniment_id | `StagiiCompetitii.tsx:~355` | Risc scăzut, documentat (T-04-07) |
| SQL migrations gitignored | `sql/migrations/*.sql` | Comportament intenționat proiect |
| preturiConfig bug fix (STG-02) | rezolvat în 04-02 | — |

**Din CONCERNS.md (probleme codebase generale, nu din acest milestone):**
- `Competitii/index.tsx` 3965 linii god-component
- 3 debug routes fără role guards în AppRouter (`backdoor-check`, `backdoor-test`, `debug-page`)
- `innerHTML` fără sanitizare în `FacturaChitantaModal.tsx:74`
- Zero React.memo în codebase, zero teste

---

## 6. Cum să continui (Getting Started)

### Dacă ești nou pe proiect

```
1. Citește CLAUDE.md (regulile proiectului)
2. Citește .planning/codebase/ARCHITECTURE.md (cum funcționează)
3. Citește .planning/codebase/STRUCTURE.md (unde e codul)
```

### Pentru Phase 3 (Calendar Antrenamente — NEXT)

Punct de start: `components/Grupe/GrupaDetailView.tsx` — `TabAntrenamente` la linia ~25.

Ce trebuie construit:
1. Calendar lunar cu dot-uri colorate per zi (verde=planificat, roșu=anulat)
2. Click pe zi → expandează lista antrenamentelor cu statusuri + acțiuni
3. Modal "Anulare" cu câmp motiv (required) → update `program_antrenamente.status='anulat'`
4. Buton "Adaugă Antrenament" → formular one-off (dată + ore + `is_recurent=false`)

Date: `program_antrenamente` tabel, coloanele `status` + `motiv_anulare` există deja (Phase 1).

### Fișiere cheie modificate în acest milestone

```
types.ts                                    — Antrenament, TipStagiu, Eveniment, Plata, Rezultat
components/Grupe/GrupaDetailView.tsx        — nou — drill-down cu 3 tab-uri
components/Grupe/GrupaCard.tsx              — buton Detalii
components/Grupe/index.tsx                  — state + render condiționat
components/Competitii/StagiiCompetitii.tsx  — prețuri, calcul taxă, raport, export CSV
hooks/useDataProvider.ts                    — fix preturiConfig fetch
```

---

## 7. Deferred Items

| Item | Motiv deferare |
|------|---------------|
| WhatsApp la anulare antrenament | Complexitate nejustificată v1 |
| Calendar săptămânal (week view) | Lista zilnică suficientă pentru MVP |
| Stagii cu probe CVD extins | `stagii_cvd_participare` logică separată |

---

*Generat de /gsd-milestone-summary — portal-phihau v1.0 — 2026-06-05*
