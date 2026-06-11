# Raport Test Playwright — Sportivi — 2026-06-10

## Context
- **URL**: http://localhost:5173
- **Utilizator**: ALIN MIHAI LUNGU (Super Admin, context Federație)
- **Total sportivi în DB**: 592

## Rezumat
| Categorie | Total | ✅ OK | ❌ Erori | ⚠️ Warning |
|-----------|-------|-------|---------|-----------|
| Butoane principale testate | 4 | 3 | 1 | 0 |
| Modals testate | 5 | 4 | 1 | 0 |
| Filtre testate | 6 | 6 | 0 | 0 |
| Sortare testate | 3 | 3 | 0 | 0 |
| Paginare | 1 | 1 | 0 | 0 |
| Tab-uri profil | 3 | 3 | 0 | 0 |
| CRUD complet | 1 | 0 | 1 | 0 |

---

## ❌ Erori găsite

### [CRITICAL] Adăugare sportiv eșuează cu eroare JSON în dev mode

- **Element**: buton "Adaugă Practicant" din modal "Adaugă Sportiv"
- **Eroare exactă**:
  ```
  Failed to load resource: 404 (Not Found) @ http://localhost:5173/api/creare-cont
  Account Creation Error: SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
  ```
- **Cauza**: `handleSave` în `components/Sportivi/index.tsx:467` apelează `/api/creare-cont` (Vercel API function). În dev mode Vite, funcțiile Vercel nu rulează → 404 → codul încearcă `response.json()` pe body gol → crash.
- **Impact**: Imposibil să adaugi sportivi noi în dev local. Funcționează probabil pe Vercel deployed.
- **Reproductibil**: DA — orice adăugare sportiv cu email
- **Fișiere afectate**:
  - `hooks/useRoleAssignment.ts:52` — `response.json()` fără verificare `response.ok`
  - `components/Sportivi/index.tsx:467-474` — `handleSave` apelant
  - `components/Sportivi/SportivFormModal.tsx:118` — `handleSubmit` apelant
- **Stack trace**:
  ```
  SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
    at createAccountAndAssignRole (hooks/useRoleAssignment.ts:52:37)
    at async handleSave (components/Sportivi/index.tsx:467:24)
    at async handleSubmit (components/Sportivi/SportivFormModal.tsx:118:22)
  ```
- **Fix recomandat**: În `hooks/useRoleAssignment.ts:52`, verifică `response.ok` înainte de `response.json()`. Sau adaugă proxy în `vite.config.ts` pentru `/api/creare-cont` → handler local dev.

### [MEDIUM] Modal X button blocat de overlay în Playwright

- **Element**: butonul X din header modal "Adaugă Sportiv" și "Export & Editare Rapidă"
- **Eroare Playwright**: `div.absolute.inset-0.bg-black/50` intercepts pointer events
- **Workaround folosit**: `page.evaluate(() => btn.click())`
- **Notă**: Probabil nu afectează utilizatori reali (browser real vs Playwright headless). De verificat totuși z-index stacking.

---

## ⚠️ Observații (non-blocante)

- **Escape nu închide** modal "Generează Magic Link-uri" — lipsă handler `onKeyDown Escape`
- **HMR 500** la `components/Competitii/index.tsx` și `components/GestiuneExamene/ManagementInscrieri.tsx` — syntax errors în aceste fișiere la momentul testului (nu testate în acest run)
- **NavigatorLockAcquireTimeoutError** pe Supabase auth — lock stolen între navigări, non-blocant pentru UX

---

## ✅ Acțiuni testate cu succes

### Filtre
- ✅ Căutare text (Nume, prenume)
- ✅ Filtru STATUS (Activ / Toate Statusurile)
- ✅ Filtru GRAD (27 opțiuni de la Debutant la C.N. 7 Dang)
- ✅ Filtre combinate AND (căutare + grad)
- ✅ Reset filtre
- ✅ Badge counter pe butonul Filtre (arată numărul de filtre active)

### Sortare
- ✅ Sortare Nume ▲▼
- ✅ Sortare Grad ▲▼
- ✅ Sortare Status ▲▼

### Paginare
- ✅ Buton "Următor" → pagina 2
- ✅ Selector items/pagină (10/25/50/100/Toți)

### Profil sportiv
- ✅ Click card → deschide profil
- ✅ Tab "Profil & Activitate" (default)
- ✅ Tab "Contact & Info" — CNP, Data Nașterii, Gen, Înălțime, Email, Telefon, Adresă, Club
- ✅ Tab "Evoluție & Grade" — grafic timeline, Istoric Examene cu butoane "Deschide Examenul", tabel Istoric Examinări & Grade
- ✅ Modal "Editează Sportiv" — 3 tab-uri (Date Personale, Contact & Acces, Club & Status) cu date pre-populate
- ✅ ConfirmModal "Modificări nesalvate" la Închide cu date modificate

### Export
- ✅ "Export & Editare Rapidă" — deschidere, filtre proprii, checkbox select-all
- ✅ Export CSV selecție → fișier `export_sportivi.csv` descărcat + dialog "Succes"

### Import
- ✅ Pagina Import Sportivi — instrucțiuni 3 pași
- ✅ Download template CSV → `template_sportivi.csv`
- ✅ Accordion "Ce coloane acceptă fișierul?" — tabel coloane cu exemple
- ✅ Accordion "Greșeli frecvente de evitat" — exemple GREȘIT/CORECT

### Altele
- ✅ Modal "Generează Magic Link-uri" — deschidere, explicații vizibile
- ✅ Modal "Portofel" — sold curent, total datorat, istoric facturi
- ✅ Validare form "Adaugă Sportiv" — submit disabled când câmpuri obligatorii goale; badge count pe tab

---

## Date de test create și șterse

Niciun sportiv creat în DB — eroarea la `/api/creare-cont` a prevenit inserarea. ✅ Fără cleanup necesar.

---

## Recomandări prioritare

1. **P1** — Fix `hooks/useRoleAssignment.ts:52`: adaugă `response.ok` check înainte de `response.json()`
2. **P2** — Adaugă Vite dev proxy sau mock pentru `/api/creare-cont` ca să poți testa adăugare sportivi local
3. **P3** — Adaugă handler Escape pe modal "Generează Magic Link-uri"
4. **P4** — Investighează HMR 500 pe `Competitii/index.tsx` și `GestiuneExamene/ManagementInscrieri.tsx`
