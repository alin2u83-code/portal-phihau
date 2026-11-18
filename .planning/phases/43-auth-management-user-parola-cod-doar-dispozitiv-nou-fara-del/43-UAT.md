---
status: testing
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
source: [43-01-SUMMARY.md, 43-02-SUMMARY.md, 43-03-SUMMARY.md, 43-04-SUMMARY.md, 43-05-SUMMARY.md, 43-06-SUMMARY.md]
started: 2026-11-18T12:45:00Z
updated: 2026-11-18T12:45:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 7
name: Cont ADMIN_CLUB fara MFA valid in /competitie
expected: |
  Intr-un browser fara MFA valid, in /competitie contextul ADMIN_CLUB nu apare (doar REPREZENTANT sau ecranul "Mergi la portal"). "Mergi la portal" -> portalul cere codul. Dupa cod cu bifa, revenirea in /competitie arata contextul ADMIN_CLUB.
awaiting: user response

## Tests

### 1. Dispozitiv nou cere cod
expected: Profil Chrome nou/incognito, login ADMIN_CLUB cu parola -> ecran de cod pe email -> codul soseste (8 cifre, fara link) -> intri cu bifa "Dispozitiv personal" bifata.
result: pass

### 2. Dispozitiv de incredere nu cere cod
expected: Pe acelasi browser, logout apoi login cu parola -> intri direct, fara ecran de cod.
result: pass

### 3. Fara delogare la inactivitate
expected: ADMIN_CLUB pe un dispozitiv fara token de incredere (bifa debifata la login). In consola: `localStorage.setItem('phi-hau-ultima-activitate', String(Date.now() - 61*60*1000))`, apoi astepti 2 minute -> ramai logat, niciun toast de delogare.
result: pass

### 4. Sesiune temporara
expected: Login cu bifa "Dispozitiv personal" debifata, inchizi complet browserul si il redeschizi -> sesiunea a disparut, ti se cere login.
result: blocked
blocked_by: release-build
reason: "Testat pe productie (portal-phihau.vercel.app), unde codul Fazei 43 nu e impins (main local +43 fata de origin/main). Neconcludent; se reia pe build local sau dupa deploy."

### 5. Zona externa: prima autentificare cu cod
expected: Pe /competitie, cu emailul unui cont de club real fara parola -> "Prima autentificare sau ai uitat parola?" -> email cu doar cod de 8 cifre, fara link -> cod + parola noua -> intri in lista de competitii. Logout, apoi login cu parola -> intri fara cod.
result: pass
note: "Initial testat pe productie (cod vechi LoginOtp, neconcludent). Reluat pe build local (localhost:4173, build din codul final): utilizatorul a introdus codul de resetare, a setat parola noua si a intrat. Partea 'logout + login cu parola fara cod' raportata ca 'acum merge sa intru'; nu a fost verificata separat cu logout explicit."

### 6. Zona externa: mesaje neutre
expected: Parola gresita -> mesaj generic. "Ai uitat parola" pe un email inexistent -> acelasi ecran neutru ca pentru un email existent.
result: pass
note: "Verificat de Claude in Chrome pe localhost:4173, cu valori inventate. Parola gresita: acelasi mesaj 'Email sau parola incorecte...' pentru email real si pentru nuexista12345@example.test. 'Prima autentificare' pe email inexistent: ecran 'Seteaza parola' cu 'Daca adresa ... are cont, vei primi un cod', fara a dezvalui existenta contului. Nu s-a comparat vizual cu ecranul unui email existent (ar fi trimis email real)."

### 7. Cont ADMIN_CLUB fara MFA valid in /competitie
expected: Intr-un browser fara MFA valid, in /competitie contextul ADMIN_CLUB nu apare (doar REPREZENTANT sau ecranul "Mergi la portal"). "Mergi la portal" -> portalul cere codul. Dupa cod cu bifa, revenirea in /competitie arata contextul ADMIN_CLUB.
result: pass
note: "Verificat in Chrome pe build local (localhost:4173), cont ADMIN_CLUB. MFA expirat temporar in DB (mfa_email_verificari, apoi suprascris de noua verificare): (1) in /competitie ADMIN_CLUB nu apare, ecran 'Mergi la portal' + 'Deconectare'; (2) 'Mergi la portal' -> setup-mfa cere cod pe email; (3) dupa cod (introdus de utilizator, bifa dispozitiv debifata) -> /competitie arata 'C.S. Phi Hau - Administrator club' + 'Management club'; verificare MFA noua valabila ~12h. Defectul raportat in timpul testului (nu se putea iesi din ecranul de setare parola) a fost corectat: buton 'Inapoi la autentificare' in LoginParola si buton 'Iesire' in MandatoryPasswordChange; vizual verificat doar pasul 'trimite' din LoginParola."

### 8. Mobil
expected: Pe telefon real, formularul de login extern si pasul de cod sunt utilizabile: butonul "Lipeste codul" merge, tastatura la cod este numerica.
result: [pending]

## Summary

total: 8
passed: 6
issues: 0
pending: 1
skipped: 0
blocked: 1

## Gaps

- truth: "Ecranul de schimbare a parolei poate fi parasit printr-un buton (iesire/logout), fara a ramane blocat"
  status: resolved
  reason: "User reported: nu pot iesi din zona de schimbare parola, trebuie refacut pasul acesta sa pot iesi dintr-un buton"
  severity: major
  test: 7
  resolution: "components/CompetitieExterna/LoginParola.tsx: 'Inapoi la autentificare' devine buton secondary vizibil (era text gri mic); components/MandatoryPasswordChange.tsx: buton 'Iesire' (signOut + redirect). Necomis, netestat pe pasul 'cod' si pe MandatoryPasswordChange in browser."

[testul 4 este blocked (release-build, neconcludent pe productie); de reluat pe build local]
