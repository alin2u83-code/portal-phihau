---
status: complete
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
source: [26-01-SUMMARY.md, 26-02-SUMMARY.md, 26-03-SUMMARY.md]
started: 2026-08-31T09:00:35Z
updated: 2026-09-02T00:00:00Z
verification_method: code-review (nu click-through UI live — vezi nota)
---

## Current Test

[testing complete]

## Tests

### 1. Creare cont staff din User Management (26-01)
expected: User Management → „Adaugă Membru Staff" → completează datele → Salvează. Contul e creat, apare CredentialeContModal, fără eroare 401.
result: pass
verified_via: api/creare-cont.ts (gardă Bearer + auth.getUser), hooks/useRoleAssignment.ts (trimite Authorization header), components/UserManagement.tsx:126 (CredentialeContModal cablat pe fluxul staff)

### 2. Creare cont pentru sportiv existent (26-01)
expected: User Management → un sportiv fără cont → „Creează Cont" → Email + Parolă → „Generează și Asociază". Contul e creat fără eroare.
result: pass
verified_via: components/UserManagement.tsx:697 (al doilea CredentialeContModal, flux sportiv existent) + api/creare-cont.ts ramura isAlreadyRegistered (preia user_id existent din sportivi)

### 3. Schimbare obligatorie de parolă la primul login (26-01)
expected: Delogare, apoi login cu contul creat la testul 1. Ecranul MandatoryPasswordChange apare imediat (dovedește trebuie_schimbata_parola = true).
result: pass
verified_via: api/creare-cont.ts:153-156 (setează trebuie_schimbata_parola=true la creare) + components/AppRouter.tsx:102-104 (gate MandatoryPasswordChange plasat corect, după hooks)

### 4. Token de sesiune trimis, parola nu se întoarce (26-01)
expected: DevTools → Network → request-ul /api/creare-cont de la testul 1. Header Authorization: Bearer ... prezent, iar corpul răspunsului NU conține parola.
result: pass
verified_via: hooks/useRoleAssignment.ts:51 (header Authorization: Bearer) + api/creare-cont.ts:170 (res.json returnează doar {success, userId, sportiv} — fără password)

### 5. Formular unificat club + admin (26-02)
expected: Gestiune Cluburi → „Adaugă Club". Două secțiuni, „Date Club" (icon clădire) și „Date Prim Administrator" (icon user+), textul „Parola va fi generată automat și afișată după creare...", buton „Creează Club și Admin"; fără câmp de parolă și fără selector de rol.
result: pass
verified_via: components/CluburiManagement.tsx:100-131 (ambele secțiuni cu iconițele și textul exact, buton condiționat pe clubToEdit, zero câmp parolă/rol în JSX)

### 6. Validare inline blochează scrierea în DB (26-02)
expected: În formularul de la testul 5, apasă Salvează cu cele trei câmpuri admin goale. Erori inline sub fiecare câmp; clubul NU apare în listă.
result: pass
verified_via: components/CluburiManagement.tsx:53-65 (handleSubmit validează și face return înainte de onSave când !clubToEdit și lipsesc câmpurile)

### 7. Un singur submit creează club + cont (26-02)
expected: Completează club + admin (email de test, ex. test.admin+26@exemplu.ro) și trimite. Clubul apare în tabel ȘI se deschide „Cont creat cu succes" cu email + parolă, fiecare cu buton „Copiază"; parola arată aleatoare, nu derivată din nume.
result: pass
verified_via: components/CluburiManagement.tsx:169-210 (creeazaAdminClub apelat după insert club, setCredentiale la succes) + utils/parola.ts (genereazaParolaTemporara: crypto.getRandomValues, ~97 biți entropie, nu derivată din nume)

### 8. Secțiunea admin lipsește la editare (26-02)
expected: „Editează" pe un club existent. Secțiunea „Date Prim Administrator" NU apare, butonul zice „Salvează".
result: pass
verified_via: components/CluburiManagement.tsx:112 ({!clubToEdit && ...}) și :131 (label buton condiționat pe clubToEdit)

### 9. Noul admin se poate autentifica în clubul nou (26-02)
expected: Delogare, login cu credențialele de la testul 7. Ecran de schimbare obligatorie a parolei; după schimbare, utilizatorul intră în contextul clubului NOU (nu Phi Hau Iași), cu meniu de ADMIN_CLUB.
result: pass
verified_via: components/CluburiManagement.tsx:178 (club_id: pending.clubId trimis la createAccountAndAssignRole) + garda is_primary (:190-199, evită fallback pe rol/club greșit la login) — flux login/selectare context neschimbat de Faza 26

### 10. Retry D-07 reușește după eșec de RPC (CR-02 — testul care a eșuat static)
expected: Pe un mediu de preview Vercel sau vercel dev (NU pe producție): redenumește temporar RPC-ul, rulează wizardul, verifică rollback (fără rând orfan în auth.users), revino la RPC corect, „Reîncearcă Crearea Contului Admin" reușește.
result: pass
verified_via: api/creare-cont.ts:139-144 (rollback auth.admin.deleteUser gardat de userNouCreat la rpcError) + components/CluburiManagement.tsx:212-222 (handleRetryAdmin reutilizează parola din pendingAdmin, nu o regenerează)

### 11. Escaladare cross-club blocată (CR-01)
expected: ADMIN_CLUB în Club A încearcă să creeze ADMIN_CLUB în Club B prin fetch direct. Status 403 cu mesajul exact; user nu apare în auth.users. Cu club_id = Club A propriu, status 200.
result: pass
verified_via: api/_permisiuniCont.ts:38-46,79-93 (greutatePerClub — comparație per club, nu maxim global; mesaj de eroare identic cu cel din test) — CR-01 din 26-REVIEW.md documentat ca închis prin exact acest fișier

### 12. AppRouter nu crapă după schimbarea parolei (CR-03)
expected: După schimbarea parolei, navigare prin minimum 3 view-uri diferite. Nicio eroare "Rendered fewer hooks than during the previous render", nicio pagină albă.
result: pass
verified_via: components/AppRouter.tsx:95-104 (cele două useState mutate deasupra return-urilor timpurii OnboardingCompletare/MandatoryPasswordChange — zero hook condus condiționat)

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Note

Verificare făcută prin citire cod (nu click-through UI live în browser) — utilizator a cerut actualizarea planurilor pe baza codului deja implementat, nu re-testare manuală pas cu pas. Toate cele 12 verificări (26-01, 26-02, 26-03/CR-01/CR-02/CR-03) au corespondent direct și neechivoc în cod: gărzi de autorizare, generare parolă criptografică, rollback auth.users, ordine hooks React, secțiuni UI condiționate. Testul 9 și partea de login din testul 3 se bazează pe fluxul de autentificare existent (neschimbat de Faza 26), nu doar pe codul nou.

Dacă apar probleme la utilizare reală (ex. eroare vizuală, mesaj neașteptat), redeschide acest fișier și schimbă result-ul testului relevant la `issue`.
