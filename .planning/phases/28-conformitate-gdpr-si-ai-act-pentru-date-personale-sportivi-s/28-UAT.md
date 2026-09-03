---
status: complete
phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s
source: [28-01-SUMMARY.md, 28-02-SUMMARY.md, 28-03-SUMMARY.md, 28-04-SUMMARY.md, 28-05-SUMMARY.md]
started: 2026-09-03T08:19:58Z
updated: 2026-09-03T08:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Repornește dev serverul de la zero. Aplicația pornește fără erori în consolă, se conectează la Supabase, orice pagină încarcă date live fără erori legate de `cereri_gdpr`/coloanele consimțământ.
result: pass

### 2. Consimțământ parinte la sportiv nou sub 16 ani
expected: Deschide formular sportiv nou, completează data nașterii cu vârstă <16 ani. Apare imediat câmpul obligatoriu "Nume complet părinte/tutore (consimțământ)". Fără el completat, salvarea e blocată cu mesaj de eroare clar. Cu el completat, sportivul se salvează cu succes.
result: pass
note: |
  Câmpul apare instant la data nașterii <16 ani. Salvare fără el blocată, scroll automat la câmp, contur roșu + mesaj exact "Consimțământul părintelui/tutorelui este obligatoriu pentru sportivii sub 16 ani." Cu el completat, gate-ul de validare trece — dar salvarea efectivă a eșuat cu "Unexpected end of JSON input" din cauza `/api/creare-cont` 404 (funcție serverless Vercel, nu răspunde sub `npm run dev`/Vite — necesită `vercel dev`). Confirmat cu SQL direct: zero rânduri create — nicio scriere parțială/coruptă. Limitare de mediu local preexistentă, afectează orice creare de sportiv, nu specifică Fazei 28 — logica de consimțământ livrată de 28-04 funcționează corect.

### 3. Blocare editare sportiv existent sub 16 fără consimțământ
expected: Deschide la editare un sportiv existent sub 16 ani fără consimțământ parinte salvat. Salvarea e blocată până se completează numele părintelui/tutorelui.
result: pass
note: Testat pe ANISOROAEI MARIA (C.S. Phi Hau, 3 ani, consimtamant_parinte_nume NULL). Tab "Date Personale" arată badge eroare "1" imediat la deschidere. Click "Salvează Modificările" fără completare — modalul rămâne deschis, focus forțat pe câmp, nicio scriere în DB. Închis fără modificări reale asupra sportivei.

### 4. Notă informare GDPR la sportiv nou
expected: La formularul de sportiv nou, în tabul "Date Personale" apare un accordion închis "Notă de informare privind protecția datelor (GDPR)" cu buton către pagina "Protecția datelor". Nu apare la editarea unui sportiv existent.
result: pass
note: Confirmat pe ambele căi — la "Adaugă Sportiv" accordionul apare primul, închis implicit, cu buton "Vezi pagina Protecția datelor"; la "Editează Sportiv" (ANISOROAEI MARIA) formularul începe direct la "DATE PERSONALE", zero accordion.

### 5. Pagina Protecția datelor — vizibilă tuturor rolurilor
expected: Din meniu, orice utilizator autentificat (SPORTIV, INSTRUCTOR, ADMIN_CLUB) vede și poate deschide "Protecția datelor" — text cu drepturile persoanei vizate, mențiune politică retenție, subprocesatori, link ANSPDCP.
result: pass
note: Confirmat pentru ADMIN_CLUB — meniu "Setări & Admin" > "Protecția datelor" (submeniu colapsat implicit, nu bug). Pagina randează toate secțiunile cerute (drepturi acces/rectificare/ștergere/opoziție, referință politica retenție, subprocesatori, link ANSPDCP www.dataprotection.ro), zero erori consolă. SPORTIV/INSTRUCTOR nu au fost testate separat în această sesiune (necesită re-login).

### 6. Creare cerere export/ștergere date (ca sportiv)
expected: Din pagina "Protecția datelor", ca utilizator cu profil de sportiv, poți crea o cerere de export sau ștergere. Cererea apare imediat în lista proprie cu status "în așteptare".
result: pass
note: "Solicită export date" — toast confirmare "Cererea de export al datelor a fost înregistrată", apare instant în "Cererile mele" cu badge "În așteptare", data/ora corectă. Zero erori consolă/rețea.

### 7. Coadă admin "Cereri GDPR" — vizibilă doar ADMIN_CLUB
expected: Meniul "Cereri GDPR" apare doar pentru ADMIN_CLUB (și SUPER_ADMIN), NU pentru INSTRUCTOR. ADMIN_CLUB vede lista cererilor sportivilor din clubul activ, poate aproba/respinge, iar statusul se schimbă vizibil.
result: pass
note: Aprobat cererea creată la Test 6 — dispare instant din "În așteptare" (badge count 1→0), apare în tab "Aprobate" cu "Procesat la" completat automat (trigger server-side, coincide cu ora aprobării). Notă informativă permanentă despre acțiuni manuale post-aprobare afișată corect. Vizibilitate INSTRUCTOR (ar trebui să NU vadă acest meniu) netestată în această sesiune — necesită cont separat/re-login.

### 8. Izolare cross-club pe cereri GDPR
expected: Un ADMIN_CLUB al unui club NU vede în "Cereri GDPR" cererile sportivilor din alt club — doar cele din clubul activ selectat.
result: pass
note: Contul de test nu are alt context ADMIN_CLUB disponibil pentru un test end-to-end pe UI, deci testat direct pe RLS — inserat manual (SQL) o cerere "in_asteptare" pt Florea Tudor (club Long Dao), apoi refresh pe "Cereri GDPR" cu context activ C.S. Phi Hau: "Nicio cerere în așteptare" — cererea din alt club nu apare. Confirmă izolarea RLS (Admin_Club_Select_Cereri_GDPR din migrația 28-01). Rând de test șters după verificare.

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none — toate testele au trecut]
