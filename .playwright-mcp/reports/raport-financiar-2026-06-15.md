# Raport Test Playwright — Financiar & Plăți — 2026-06-15

## Rezumat
| Categorie | Total | ✅ OK | ❌ Erori | ⚠️ Warning |
|-----------|-------|-------|---------|-----------|
| Submeniuri testate | 6 | 4 | 2 | - |
| Tab-uri Raport Financiar | 6 | 4 | 1 | 1 |
| Filtre testate | 3 | 3 | - | - |
| Modals testate | 2 | 2 | - | - |
| Validare formulare | 3 | 2 | - | 1 |
| Erori console JS | 37 | - | 37 | - |

## Erori găsite

### [CRITICAL] RaportFinanciar.tsx — 36 chei React duplicate
- **Fișier**: `components/Plati/RaportFinanciar.tsx:48`
- **Eroare**: `Warning: Encountered two children with the same key` — UUID-uri duplicate: `303a725e`, `44a844e3` (x2), `321c0689`, `d0954e05` (x2) + altele
- **Cauza**: Query Supabase returnează înregistrări duplicate — probabil JOIN cu alt tabel produce rânduri duplicate
- **Impact**: Rânduri din tabel pot fi duplicate sau omise silențios. Date financiare afișate incorect.
- **Reproducibil**: DA — apare la fiecare navigare la Raport Financiar
- **Fix**: Deduplicare pe `id` în frontend sau fix query backend (GROUP BY / DISTINCT)

### [CRITICAL] Configurare Prețuri — 403 Acces Interzis pentru ADMIN_CLUB
- **Element**: Meniu sidebar "Configurare Prețuri" → pagina `configurare-preturi`
- **Eroare**: "Acces Interzis (403) — Nu aveți permisiunile necesare"
- **Cauza**: RLS Supabase sau `usePermissions` blochează accesul, dar meniul apare în sidebar
- **Impact**: ADMIN_CLUB vede meniu care duce la pagină blocată — UX confuz + posibil bug permisiuni
- **Reproducibil**: DA
- **Fix**: Fie ascunde meniu din sidebar când nu are permisiune, fie acordă permisiunea corectă

### [WARNING] Tab Lunar — luna default greșită
- **Element**: Raport Financiar → tab Lunar
- **Problema**: Default pe 2026-07 (iulie) când azi e 15 iunie 2026 — off by one
- **Impact**: Admin vede date pentru luna viitoare în loc de luna curentă
- **Fix**: `new Date().toISOString().slice(0, 7)` sau echivalent — nu `+1`

### [WARNING] Grafic Încasări Lunare — luna curentă lipsește
- **Element**: Raport Financiar → tab Grafice → "Încasări Lunare"
- **Problema**: Grafic arată Iun '25 → Mai '26, lipsește Iun '26 (luna curentă). Sumar spune "3.160 RON luna curentă" dar bara grafic nu apare.
- **Impact**: Vizualizare trunchiată — ultima lună mereu absentă
- **Fix**: Intervalul de 12 luni trebuie să includă luna curentă, nu s-o excludă

### [WARNING] Modal Edit plată — câmpuri incomplete
- **Element**: Facturi & Plăți → buton editare (creion) pe orice rând
- **Problema**: Modalul "Editează Plată" expune doar Descriere + Sumă. Lipsesc: Status, Data plată, Metodă plată
- **Impact**: Admin nu poate corecta status plată sau data din edit — e nevoit să folosească "Încasează Rapid" separat
- **Recomandare**: Adaugă Status și Data plată în modalul de editare

### [INFO] Validare "Adaugă Sumă în Avans" în engleză
- **Element**: Jurnal Încasări → "Adaugă Sumă în Avans" → submit fără familie selectată
- **Eroare**: Browser native: "Please select an item in the list." (engleză)
- **Fix**: Adaugă `onInvalid` + `setCustomValidity` în română sau validare custom înainte de submit

### [INFO] Facturi & Plăți — fără paginare server-side
- **Element**: Facturi & Plăți → tabel principal
- **Problema**: Toate înregistrările (~250+) render dintr-o dată în DOM — sute de rânduri, inclusiv din 2008
- **Impact**: Performanță slabă, scroll lung, date istorice irelevante amestecate cu cele curente
- **Recomandare**: Paginare server-side sau virtualizare rânduri + filtru implicit "ultimele 12 luni"

### [INFO] Plătitor "N/A" în baza de date
- **Element**: Facturi & Plăți + Raport Financiar
- **Problema**: Rânduri cu `Plătitor = "N/A"` — date orfane sau înregistrări fără sportiv asociat
- **Recomandare**: Audit DB + constrângere FK sau fallback vizual mai clar

### [INFO] Super Admin — modulul Financiar & Plăți absent
- **Element**: Sidebar în context SUPER_ADMIN_FEDERAȚIE
- **Observație**: Niciun meniu financiar pentru Super Admin — poate corect by design (federația nu gestionează finanțele cluburilor)
- **Acțiune**: Confirmare că e intenționat

## Verificare Responsive
Nerealizată în această sesiune — prioritizate bug-urile funcționale.

## Date de test create și șterse
Niciuna — testare read-only, fără date create.

## Acțiuni testate cu succes
- ✅ Facturi & Plăți — se încarcă, filtre (Status, Tip, Căutare) funcționează AND
- ✅ Facturi & Plăți — Resetează Filtre funcționează
- ✅ Facturi & Plăți — Modal "Procesează Plată Factură" (Încasează Rapid) se deschide corect
- ✅ Facturi & Plăți — Modal "Editează Plată" se deschide corect
- ✅ Jurnal Încasări — pagina se încarcă cu formularele corecte
- ✅ Raport Financiar — tab Încasări: date reale, export CSV/PDF vizibil
- ✅ Raport Financiar — tab Abonamente: statistici corecte per lună
- ✅ Raport Financiar — tab Familii: sold per familie + restanțe detaliate
- ✅ Taxe Anuale — FRAM 2026 + FRQKD 2025-2026 configurate și vizibile
- ✅ Config. Abonamente — validare română "Denumirea abonamentului este obligatorie."

## Prioritizare fix-uri
1. 🔴 CRITICAL: `RaportFinanciar.tsx:48` duplicate keys — fix query/deduplicare
2. 🔴 CRITICAL: `Configurare Prețuri` 403 pentru ADMIN_CLUB — fix permisiune sau ascunde meniu
3. 🟡 Tab Lunar default month off-by-one
4. 🟡 Grafic Încasări Lunare — luna curentă lipsă
5. 🟠 Edit plată — adaugă Status + Data în modal
6. ⚪ Validare EN→RO în Jurnal Încasări
7. ⚪ Paginare server-side Facturi & Plăți
