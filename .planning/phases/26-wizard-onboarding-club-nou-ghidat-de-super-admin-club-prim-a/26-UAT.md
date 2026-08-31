---
status: testing
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
source: [26-01-SUMMARY.md, 26-02-SUMMARY.md, 26-03-SUMMARY.md]
started: 2026-08-31T09:00:35Z
updated: 2026-08-31T09:00:35Z
---

## Current Test

number: 1
name: Creare cont staff din User Management (26-01)
expected: |
  User Management → „Adaugă Membru Staff" → completează datele → Salvează.
  Contul e creat, apare CredentialeContModal, fără eroare 401.
awaiting: user response

## Tests

### 1. Creare cont staff din User Management (26-01)
expected: User Management → „Adaugă Membru Staff" → completează datele → Salvează. Contul e creat, apare CredentialeContModal, fără eroare 401.
result: [pending]

### 2. Creare cont pentru sportiv existent (26-01)
expected: User Management → un sportiv fără cont → „Creează Cont" → Email + Parolă → „Generează și Asociază". Contul e creat fără eroare.
result: [pending]

### 3. Schimbare obligatorie de parolă la primul login (26-01)
expected: Delogare, apoi login cu contul creat la testul 1. Ecranul MandatoryPasswordChange apare imediat (dovedește trebuie_schimbata_parola = true).
result: [pending]

### 4. Token de sesiune trimis, parola nu se întoarce (26-01)
expected: DevTools → Network → request-ul /api/creare-cont de la testul 1. Header Authorization: Bearer ... prezent, iar corpul răspunsului NU conține parola.
result: [pending]

### 5. Formular unificat club + admin (26-02)
expected: Gestiune Cluburi → „Adaugă Club". Două secțiuni, „Date Club" (icon clădire) și „Date Prim Administrator" (icon user+), textul „Parola va fi generată automat și afișată după creare...", buton „Creează Club și Admin"; fără câmp de parolă și fără selector de rol.
result: [pending]

### 6. Validare inline blochează scrierea în DB (26-02)
expected: În formularul de la testul 5, apasă Salvează cu cele trei câmpuri admin goale. Erori inline sub fiecare câmp; clubul NU apare în listă.
result: [pending]

### 7. Un singur submit creează club + cont (26-02)
expected: Completează club + admin (email de test, ex. test.admin+26@exemplu.ro) și trimite. Clubul apare în tabel ȘI se deschide „Cont creat cu succes" cu email + parolă, fiecare cu buton „Copiază"; parola arată aleatoare, nu derivată din nume.
result: [pending]

### 8. Secțiunea admin lipsește la editare (26-02)
expected: „Editează" pe un club existent. Secțiunea „Date Prim Administrator" NU apare, butonul zice „Salvează".
result: [pending]

### 9. Noul admin se poate autentifica în clubul nou (26-02)
expected: Delogare, login cu credențialele de la testul 7. Ecran de schimbare obligatorie a parolei; după schimbare, utilizatorul intră în contextul clubului NOU (nu Phi Hau Iași), cu meniu de ADMIN_CLUB.
result: [pending]

### 10. Retry D-07 reușește după eșec de RPC (CR-02 — testul care a eșuat static)
expected: Pe un mediu de preview Vercel sau vercel dev (NU pe producție): redenumește temporar în api/creare-cont.ts apelul RPC în refactor_create_user_account_INEXISTENT, rulează wizard-ul de la testul 7 cu un email nou. Clubul rămâne creat, modalul rămâne deschis cu banner roșu + buton „Reîncearcă Crearea Contului Admin"; în Supabase → Authentication → Users NU există niciun rând pentru emailul folosit (rollback-ul a rulat). Revino la numele corect al RPC-ului, redeploy, apasă „Reîncearcă Crearea Contului Admin". Contul se creează cu succes, apare ecranul de credențiale, iar în listă există un singur club cu acel nume.
result: [pending]

### 11. Escaladare cross-club blocată (CR-01)
expected: Autentifică-te cu un utilizator care are ADMIN_CLUB în Club A și orice rol inferior (SPORTIV/INSTRUCTOR) în Club B; din DevTools Console rulează fetch('/api/creare-cont', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <access_token>' }, body: JSON.stringify({ email: 'escalare.test@exemplu.ro', password: 'Parola-Test-123456', userData: { nume: 'Test', prenume: 'Escalare', club_id: '<ID_CLUB_B>' }, roles: ['ADMIN_CLUB'] }) }).then(r => r.json().then(j => console.log(r.status, j))). Status 403 cu mesajul „Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră în acest club."; în Supabase → Authentication → Users NU apare escalare.test@exemplu.ro. Repetă cu club_id = ID Club A. Status 200, contul se creează (fluxul legitim nu e blocat).
result: [pending]

### 12. AppRouter nu crapă după schimbarea parolei (CR-03)
expected: Repetă testul 3 sau 9 și, după schimbarea parolei, navighează prin minimum 3 view-uri diferite din meniu. Nicio eroare Rendered fewer hooks than during the previous render în consolă, nicio pagină albă.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps

[none yet]

## Note

Testele 1-9 sunt verificările amânate explicit de `26-01-SUMMARY.md` și `26-02-SUMMARY.md` sub `workflow.human_verify_mode: "end-of-phase"`. Testele 10-12 verifică fix-urile aduse de planul 26-03 pentru CR-01, CR-02 și CR-03. Testul 10 modifică temporar codul și NU se rulează pe producție.
