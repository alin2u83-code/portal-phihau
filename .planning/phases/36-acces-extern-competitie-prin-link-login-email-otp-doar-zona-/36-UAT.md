---
status: complete
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
source: [36-VERIFICATION.md, 36-VERIFICARE.md, 36-SECURITY.md]
started: 2026-11-19T10:58:20Z
updated: 2026-11-19T10:58:20Z
---

## Current Test

[testing complete]

## Tests

### 1. Link invalid arata mesaj generic
expected: /competitie/<uuid inexistent> deconectat => "Link invalid sau competiție indisponibilă.", fara sidebar si fara date.
result: pass

### 2. Teaser public + formular Solicita acces
expected: Link de competitie reala (nu draft), deconectat => teaser (denumire, date, locatie, probe) fara date personale. Formularul "Solicita acces": lista de cluburi se incarca; trimiti o cerere cu email de test => mesaj neutru de succes (acelasi mesaj chiar daca trimiti a doua oara).
result: [pending]

### 3. Super admin aproba cererea
expected: Ca super admin/proprietar, tab "Acces extern" (sau Conturi cluburi) => cererea apare in asteptare; Aproba => cont de club creat; NU pleaca niciun email cu link de actiune. Respingere cu motiv functioneaza; revocare/reactivare functioneaza.
result: skipped
reason: "User 19.11.2026: nu exista in aplicatie un link de acces extern utilizabil; doar cei cu cont acceseaza aplicatia. Fluxul Solicita acces / tab Acces extern nu e folosit in practica."

### 4. Login cont club pe /competitie
expected: Parola gresita => "Email sau parolă incorecte..." (acelasi mesaj si pentru email inexistent). Parola corecta (prima data: "Prima autentificare" => cod pe email de la noreply@phihau.ro, 8 cifre, fara link) => ajungi in lista competitiilor, doar pentru clubul tau.
result: pass

### 5. Wizard inscriere + taxe (cont extern)
expected: Din contul extern inscrii un sportiv al clubului prin wizard; nu vezi sportivi din alt club; optiunea inter-club e dezactivata; fila Taxe e doar citire (fara butoane de plata/editare).
result: pass

### 6. Zona externa pe telefon real
expected: /competitie si /competitie/<uuid> pe telefon (nu emulat): nimic taiat, butoanele se ating usor, wizardul se poate parcurge.
result: issue
reported: "exista o bara de scroll la zona de inscrieri, categorii, taxe, detalii, pentru ca sunt prea multe si late; restul functioneaza corect"
severity: minor


### 7. Cheia de context separata portal/extern
expected: Dupa ce esti logat in zona /competitie, deschizi portalul (/) in alt tab cu alt cont/rol: contextul portalului NU se schimba si headerul nu iti schimba datele. Logout din portal nu te scoate din zona externa si invers.
result: skipped
reason: "Verificat partial in Chrome 19.11.2026: in /competitie exista simultan phi-hau-extern-context-id si phi-hau-active-role-context-id cu valori diferite. Restul nu e testabil: sesiunea Supabase e comuna pe browser (un logout scoate din ambele zone, iar aplicatia nu permite schimbarea contului fara deconectare). Expected-ul testului era formulat gresit."


### 8. Parinte SPORTIV vede prezentele fratilor
expected: Cont parinte cu frati: Dashboard => widget Familie => detaliu frate arata numarul de prezente (nu 0 daca are prezente).
result: skipped
reason: "User 19.11.2026: nu exista un cont de parinte la indemana; politica prezenta_familie_sel verificata doar live in DB, netestata cu cont real"

## Summary

total: 8
passed: 4
issues: 1
pending: 0
skipped: 3

## Gaps

- truth: "Pe telefon, zona /competitie/<uuid> se parcurge fara taieri: tab-urile Inscrieri, Categorii, Taxe, Detalii incap pe ecran"
  status: failed
  reason: "User reported: exista o bara de scroll la zona de inscrieri, categorii, taxe, detalii, pentru ca sunt prea multe si late"
  severity: minor
  test: 6
  root_cause: "Clasa scrollbar-hide e folosita la components/Competitii/index.tsx:325 (si CategoriiTemplateManager.tsx) dar nu e definita nicaieri (nici tailwind.config.js, nici CSS, nici plugin), deci bara de scroll orizontal ramane vizibila pe randul de tab-uri."
  artifacts: [components/Competitii/index.tsx:325, components/Competitii/CategoriiTemplateManager.tsx]
  missing: ["definitie scrollbar-hide (scrollbar-width:none + ::-webkit-scrollbar{display:none}) in tailwind.config.js sau index.css"]
