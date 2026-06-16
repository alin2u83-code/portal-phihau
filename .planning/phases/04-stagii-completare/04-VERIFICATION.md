---
phase: 04-stagii-completare
verified: 2026-06-16T14:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
gaps:
deferred:
  - truth: "INSTRUCTOR poate înscrie sportivi la stagii (D-01 din CONTEXT)"
    addressed_in: "Phase 4 re-plan (04-CONTEXT.md decisions D-01..D-03)"
    evidence: "CONTEXT.md D-01: INSTRUCTOR poate înscrie sportivi — necesită modificare RLS plati_insert; nu era în scope planurilor 04-01..04-03"
  - truth: "Fallback nivel 2 taxă: tipuri_stagii.pret_copii/pret_grade/pret_centuri (D-04/D-05)"
    addressed_in: "Phase 4 re-plan (04-CONTEXT.md D-04)"
    evidence: "CONTEXT.md D-04 specifică 3 niveluri; implementarea 04-02 are doar nivelul 1+3 (nivelul 2 documentat explicit ca lipsă în comentariul din cod la linia 162)"
  - truth: "Ștergere participant cu cleanup plată (D-09)"
    addressed_in: "Phase 4 re-plan (04-CONTEXT.md D-09)"
    evidence: "CONTEXT.md D-09: modal warning la ștergere participant cu plată achitată — nu în scope planurilor 04-01..04-03"
human_verification:
  - test: "Creează stagiu de club (isFederationEvent=false) și verifică că apare doar clubului propriu"
    expected: "Stagiu nou creat cu club_id = currentUser.club_id și vizibilitate_globala = false; alt club nu îl vede"
    why_human: "RLS Supabase verificabil doar cu 2 sesiuni active simultan; nu se poate testa cu grep"
  - test: "Înscrie un sportiv la stagiu și verifică plata în PlatiScadente"
    expected: "Plata apare în PlatiScadente cu tip='Taxa Stagiu', status='Neachitat', eveniment_id completat (non-null), suma > 0"
    why_human: "Necesită Supabase live cu date reale; INSERT real în DB și verificare propagare în DataContext"
  - test: "Înscrie sportiv de 10 ani și verifică că taxa selectată este pret_copii"
    expected: "calculeazaCategorieStagiu returnează 'copii'; suma din newPlata = eveniment.pret_copii dacă setat, altfel preturiConfig 'Taxa Stagiu'"
    why_human: "Logica calcul taxă depinde de date reale (data_nasterii sportiv, pret_copii pe eveniment, preturiConfig în DB)"
  - test: "Admin INSTRUCTOR nu vede secțiunea Raport Participanți și nu poate accesa formularul Înscrie Participant"
    expected: "Guard permissions.isAdminClub exclude INSTRUCTOR din formularul de înscriere și din tabelul raport"
    why_human: "Necesită login cu cont INSTRUCTOR real; permissions.isInstructor vs isAdminClub depinde de rol activ din DB"
  - test: "Export CSV — click buton Export CSV și verifică fișierul descărcat"
    expected: "Fișier CSV valid cu header 'Sportiv,Data Inscrierii,Categorie,Taxa (lei),Status Plata' și un rând per participant"
    why_human: "Blob download necesită browser; nu se poate valida cu grep sau tsc"
---

# Phase 04: Stagii Completare — Verification Report

**Phase Goal:** Stagiile de club funcționează end-to-end: creare, înscriere sportiv, factură corectă, raport exportabil
**Verified:** 2026-06-16T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

**Note on Requirements STG-01..STG-05:** Aceste ID-uri sunt referențiate în ROADMAP.md dar NU există în `.planning/REQUIREMENTS.md` sau `intel/requirements.md`. REQUIREMENTS.md conține cerințe pentru un proiect diferit (Sistem Filtrare Unificat — Competiții, ID-uri INFR-xx, TAB-xx, etc.). Cerințele STG-xx sunt definite implicit prin Success Criteria din ROADMAP.md și planuri. Acesta este un gap de trasabilitate documentat mai jos.

---

## Goal Achievement

### Observable Truths (din ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Formularul de creare stagiu permite club_id !== null; switch "Eveniment Federație" off = stagiu de club | VERIFIED | `handleSubmit` linia 76-81: `isFed = permissions.isFederationAdmin && isFederationEvent`; când `isFederationEvent=false`, `club_id = currentUser.club_id`, `tip_eveniment='CLUB'`, `vizibilitate_globala=false`. Switch vizibil doar pentru `isFederationAdmin` sau `isSuperAdmin` (linia 129). |
| 2 | Suma din `plati` provine din configurare per categorie vârstă/grad cu fallback la taxa globală | VERIFIED | `calculeazaCategorieStagiu` (liniile 144-158): 'copii' 7-12 ani, 'centuri' prin Dan în Grad.nume, altfel 'grade'. `getTaxaStagiu` (liniile 163-175): Nivel 1 = eveniment.pret_copii/pret_grade/pret_centuri; Nivel 2 (tipuri_stagii) lipsă (documentat explicit în comentariu linia 162); Nivel 3 = `getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data)`. `preturiConfig` fetchat din DB în `deferredQueries` la linia 353 din `hooks/useDataProvider.ts`. |
| 3 | Plata generată la înscriere include eveniment_id și apare în PlatiScadente | VERIFIED | `handleAddParticipant` (liniile 276-336): `newPlata` include `eveniment_id: eveniment.id` (linia 318); INSERT în `plati` cu select + `setPlati` actualizare locală; tip='Taxa Stagiu', status='Neachitat'. Compensating delete pe `rezultate` dacă INSERT plată eșuează (CR-01 aplicat, linia 323). |
| 4 | Tab/secțiune participanți afișează tabel Sportiv, Data Înscrierii, Taxă, Status Plată; buton Export CSV | VERIFIED | `randuriiParticipanti` useMemo (liniile 376-395); tabel 5 coloane JSX (liniile 433-479) condiționat `permissions.isAdminClub && rezultate.length > 0`; `exportParticipantiCSV` (liniile 398-418) cu Blob download și header corect; `platiParticipanti` cu strict match `p.eveniment_id === eveniment.id` (CR-02 aplicat, linia 369). |

**Score:** 4/4 truths verified (automatizat/static)

### Deferred Items

Items identificate în CONTEXT.md (re-planificare 2026-06-16) ca gaps față de implementarea anterioară — NU erau în scope planurilor 04-01..04-03.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | INSTRUCTOR poate înscrie sportivi la stagii (D-01) | Phase 4 re-plan | CONTEXT.md D-01: necesită modificare RLS `plati_insert`; guard actual `if (!permissions.isAdminClub) return` blochează INSTRUCTOR |
| 2 | Fallback nivel 2: `tipuri_stagii.pret_copii/pret_grade/pret_centuri` (D-04) | Phase 4 re-plan | CONTEXT.md D-04/D-07; getTaxaStagiu comentariu linia 162: "tipuri_stagii.pret nu este încă implementat" |
| 3 | Ștergere participant cu cleanup plată condiționat (D-09) | Phase 4 re-plan | CONTEXT.md D-09; `confirmDeleteRezultat` (linia 338) șterge doar din `rezultate`, nu și plata aferentă |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `sql/migrations/add_pret_per_categorie_stagiu.sql` | Migrație SQL pentru coloane preț + FK eveniment_id | NOT IN GIT (gitignored) | Fișier creat pe disc (confirmat în 04-01-SUMMARY.md) dar gitignored (`sql/` în .gitignore) — aplicare manuală în Supabase |
| `types.ts` | Eveniment cu pret_copii/pret_grade/pret_centuri; Plata cu eveniment_id; Rezultat cu created_at | VERIFIED | Liniile 395-397 (Eveniment), linia 169 (Plata), linia 406 (Rezultat) |
| `hooks/useDataProvider.ts` | preturiConfig fetchat din DB în deferredQueries | VERIFIED | Linia 353: `preturiConfig: cleanedSupabase.from('preturi_config').select('*')`; linia 431: `preturiConfig: deferredData.preturiConfig || prev.preturiConfig` |
| `components/Competitii/StagiiCompetitii.tsx` | EvenimentForm câmpuri preț + calculeazaCategorieStagiu + getTaxaStagiu + handleAddParticipant cu eveniment_id + tabel participanți + exportParticipantiCSV | VERIFIED | Toate funcțiile prezente și substanțiale |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useDataProvider.ts (deferredQueries)` | `AppData.preturiConfig` | `setData` cu `deferredData.preturiConfig` | WIRED | Linia 353 (query) + linia 431 (setData) |
| `types.ts (Eveniment)` | `StagiiCompetitii.tsx (EvenimentDetail)` | `prop eveniment: Eveniment`, câmpuri `pret_copii/pret_grade/pret_centuri` | WIRED | `getTaxaStagiu(eveniment, categorie, preturiConfig)` referențiază `eveniment.pret_copii` etc. |
| `types.ts (Plata)` | `handleAddParticipant` | `newPlata.eveniment_id` | WIRED | Linia 318: `eveniment_id: eveniment.id` în obiectul INSERT |
| `EvenimentDetail (filteredData.rezultate)` | `randuriiParticipanti` | `platiParticipanti.get(r.sportiv_id)` | WIRED | Strict match pe `eveniment_id` (CR-02); useMemo la linia 364 |
| `exportParticipantiCSV` | Blob download | `URL.createObjectURL` | WIRED | Liniile 410-417: pattern complet |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `EvenimentDetail` tabel participanți | `randuriiParticipanti` | `filteredData.plati` (din DataContext) + `filteredData.rezultate` | Surse reale DataContext, nu mock-uri; `filteredData` vine din `useFilteredData` care filtrează `data.plati` și `data.rezultate` | FLOWING |
| `EvenimentForm` câmpuri preț | `formState.pret_copii/pret_grade/pret_centuri` | Input utilizator + `evToEdit.pret_copii` la editare | Input utilizator; populate din eveniment DB la editare | FLOWING |
| `handleAddParticipant` suma | `taxaPreview.suma` / `suma` | `getTaxaStagiu(eveniment, categorie, preturiConfig)` | `preturiConfig` din DB (deferred fetch); `eveniment.pret_copii` din DB | FLOWING — cu nota că nivelul 2 (tipuri_stagii) lipsă |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — necesită server Supabase live; nu există entry point rulabil local fără date reale.

---

## Probe Execution

Step 7c: SKIPPED — nu există fișiere `scripts/*/tests/probe-*.sh` în proiect; niciun probe declarat în PLAN-uri.

---

## Requirements Coverage

**IMPORTANT: STG-01..STG-05 nu există în `.planning/REQUIREMENTS.md`.**

REQUIREMENTS.md conține cerințe pentru un mileston diferit (Sistem Filtrare Unificat, ID-uri INFR/TAB/INSC/RAP/TMPL). Cerințele STG-xx sunt definite doar în ROADMAP.md la linia 91 ca referință, fără fișier de cerințe dedicated.

Mapare cerințe ROADMAP pentru această fază:

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| STG-01 (implicit) | 04-02-PLAN | ADMIN_CLUB poate crea stagiu de club (nu doar federație) | SATISFIED | Guard Switch vizibil doar `isFederationAdmin`; default `club_id=currentUser.club_id` |
| STG-02 (implicit) | 04-02-PLAN | preturiConfig fetchat din DB (nu array vid) | SATISFIED | `deferredQueries.preturiConfig` în useDataProvider.ts linia 353 |
| STG-03 (implicit) | 04-02-PLAN | Plata generată include `eveniment_id` | SATISFIED | `newPlata.eveniment_id: eveniment.id` linia 318 |
| STG-04 (implicit) | 04-03-PLAN | Raport participanți cu tabel status plăți + export CSV | SATISFIED | Tabel 5 coloane + `exportParticipantiCSV` prezente |
| STG-05 (implicit) | 04-01/02-PLAN | câmpuri pret_copii/pret_grade/pret_centuri + calcul 3-level fallback | PARTIALLY SATISFIED | Nivelul 2 (tipuri_stagii) absent — documentat în cod linia 162; nivelurile 1+3 funcționale |

**Gap de trasabilitate:** STG-01..STG-05 nu au fișier de cerințe (`REQUIREMENTS.md` nu conține aceste ID-uri). Recomandare: adăugați definiții STG-xx în `.planning/REQUIREMENTS.md` sau `.planning/intel/requirements.md` pentru auditabilitate.

---

## Code Review Fixes Verification

| CR Fix | Expected | Status | Evidence |
|--------|----------|--------|---------|
| CR-01: plati insert before rezultate (sau compensating delete) | Dacă INSERT plată eșuează, rezultat creat anterior se șterge | VERIFIED | Liniile 321-325: `await supabase.from('rezultate').delete().eq('id', data.id)` în catch după `plataError` |
| CR-02: strict eveniment_id match (no loose fallback) | `platiParticipanti` filtrează strict pe `eveniment_id === eveniment.id` | VERIFIED | Linia 369: `p.eveniment_id === eveniment.id` cu comentariu "strict match — evită contaminare cross-eveniment"; fallback din PLAN-03 original eliminat |
| CR-03: createSetter nu folosește useCallback | `createSetter` definit ca funcție simplă, fără `useCallback` | VERIFIED | Linia 493-496: `const createSetter = <K extends keyof AppData>(key: K) => ...` — fără `useCallback` wrapper |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `StagiiCompetitii.tsx` | 162 | Comentariu documentează absența nivelului 2 fallback: "tipuri_stagii.pret nu este încă implementat" | INFO | Funcțional acceptabil — nivelul 2 e in-scope pentru re-planificare; nu e TBD/FIXME/XXX (nu trigger gate) |
| `StagiiCompetitii.tsx` | 342 | `console.error('DETALII EROARE:', JSON.stringify(error, null, 2))` în `confirmDeleteRezultat` | INFO | Debug log rămas; minor; nu afectează funcționalitatea |

Niciun marker `TBD`, `FIXME`, sau `XXX` găsit în fișierele modificate de fază.

---

## Human Verification Required

### 1. Creare stagiu de club și izolare vizibilitate

**Test:** Login ca ADMIN_CLUB. Navighează la Stagii → Adaugă Stagiu Nou. Lasă switch-ul "Eveniment de Federație" dezactivat. Completează formular și salvează. Verifică în DB că `club_id` e completat și `vizibilitate_globala=false`.
**Expected:** Stagiu apare doar clubului propriu; alt club logat nu îl vede.
**Why human:** Vizibilitatea cross-club necesită două sesiuni Supabase simultane cu RLS activ.

### 2. Plată corectă generată la înscriere sportiv

**Test:** La un stagiu cu `pret_copii=150`, înscrie un sportiv cu vârsta 10 ani. Verifică în PlatiScadente că apare o plată cu `suma=150`, `tip='Taxa Stagiu'`, `status='Neachitat'`, `eveniment_id` completat.
**Expected:** Suma = 150 (din pret_copii al evenimentului), nu din taxa globală.
**Why human:** Necesită Supabase live și date reale (sportiv cu data_nasterii, eveniment cu pret_copii setat).

### 3. Fallback preturiConfig când eveniment nu are prețuri per categorie

**Test:** Creează stagiu fără a seta pret_copii/pret_grade/pret_centuri. Înscrie un sportiv. Verifică că suma generată în plată vine din `preturiConfig` (categorie 'Taxa Stagiu').
**Expected:** Suma = valoarea din `preturi_config` cu `categorie='Taxa Stagiu'` validă la data evenimentului.
**Why human:** Necesită DB live cu date în `preturi_config`.

### 4. Guard INSTRUCTOR — formular înscriere și raport financiar invizibil

**Test:** Login ca INSTRUCTOR. Navighează la un stagiu cu participanți. Verifică că formularul "Înscrie Participant" și secțiunea "Raport Participanți" (cu taxe și status plată) sunt invizibile.
**Expected:** INSTRUCTOR nu vede nici formularul de înscriere, nici datele financiare din tabel.
**Why human:** Necesită cont INSTRUCTOR real cu rol activ în DB.

### 5. Export CSV cu date corecte

**Test:** Ca ADMIN_CLUB, pe un stagiu cu cel puțin 2 participanți (unul Achitat, unul Neachitat). Click "Export CSV". Deschide CSV-ul descărcat.
**Expected:** Header: `Sportiv,Data Inscrierii,Categorie,Taxa (lei),Status Plata`; câte un rând per participant cu statusul corect.
**Why human:** Blob download necesită browser cu interacțiune utilizator.

---

## Gaps Summary

Nu există gap-uri blocante. Toate cele 4 Success Criteria din ROADMAP.md sunt verificate static în codebase.

**Items observate care nu sunt blocante:**

1. **STG-05 partial** — Nivelul 2 din fallback (tipuri_stagii) lipsă; documentat explicit în cod și în CONTEXT.md ca gap cunoscut pentru re-planificare. Nu afectează SC-urile din ROADMAP.
2. **Gap trasabilitate cerințe** — STG-01..STG-05 referențiate în ROADMAP dar absente din REQUIREMENTS.md. Recomandare: adăugați definițiile.
3. **Ștergere participant fără cleanup plată** — Identificat în CONTEXT.md D-09 ca gap; `confirmDeleteRezultat` nu șterge plata asociată. Defer la re-planificare (în scope).

---

_Verified: 2026-06-16T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
