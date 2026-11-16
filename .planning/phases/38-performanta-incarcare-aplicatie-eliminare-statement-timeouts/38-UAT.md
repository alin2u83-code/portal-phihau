---
status: testing
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
source: [38-02-SUMMARY.md, 38-03-SUMMARY.md, 38-04-SUMMARY.md, 38-05-SUMMARY.md, 38-06-SUMMARY.md, 38-07-SUMMARY.md, 38-09-SUMMARY.md, 38-VERIFICATION.md]
started: 2026-11-16T14:00:00Z
updated: 2026-11-16T14:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Dupa codul MFA - dashboard fara "Eroare de Sistem"
expected: |
  5 reload-uri consecutive ca SUPER_ADMIN_FEDERATIE (dispozitiv de incredere).
  Niciun "Eroare de Sistem"; dashboard-ul se incarca de fiecare data.
awaiting: user response

## Tests

### 1. Login proaspat ADMIN_CLUB pe dispozitiv necunoscut (ecran MFA)
expected: Ecranul MFA apare sub ~2 s, fara dialog de eroare; pe ecranul MFA nu pleaca cereri de date (doar roluri/context, MFA, tema). Poarta datelor ramane inchisa pana la cod.
result: skipped
reason: utilizatorul amana 3c (MFA dispozitiv necunoscut); de facut ulterior

### 2. Dupa codul MFA - dashboard fara "Eroare de Sistem"
expected: Introduci codul, ajungi pe dashboard (scurt skeleton), datele apar, fara "Eroare de Sistem" si fara toast de eroare. Nu se cere un al doilea cod.
result: [pending]

### 3. SUPER_ADMIN - pornire repetata fara erori
expected: 5 reload-uri consecutive ca SUPER_ADMIN_FEDERATIE (dispozitiv de incredere): niciun "Eroare de Sistem", dashboard-ul se incarca de fiecare data.
result: pass
evidence: "Chrome MCP 16.11.2026, SUPER_ADMIN pe build local: 5/5 reload-uri, 0 'Eroare de Sistem', 0 skeleton ramas, 33-38 cereri REST, 0 >=8s, max 3394 ms; 0 x 57014/25P02 in DB de la 12:00 UTC. View pornit: Analiza Prezente (view persistat), nu dashboard-ul."


### 4. Simulare timeout pe program antrenamente (3d)
expected: DevTools > Network > Block request URL pe vedere_cluburi_program_antrenamente, reload ca ADMIN_CLUB: shell-ul se deschide, apare o singura notificare de date partiale, Sportivi si Grupe functioneaza.
result: [pending]

### 5. Ecran cu date esuate - card Reincearca
expected: Blochezi view_istoric_plati_detaliat, deschizi Sportivi: dupa cateva secunde (reincercari automate) apare cardul "Nu s-au putut incarca datele acestui ecran" cu buton Reincearca (nu skeleton infinit, nu lista goala). Dupa ce deblochezi si apesi Reincearca, ecranul se incarca.
result: [pending]

### 6. Profil sportiv - statistici prezenta complete
expected: Deschizi profilul unui sportiv activ de peste 6 luni: graficul pe 6 luni si procentul de prezenta corespund cu Raportul lunar de prezenta (nu sunt trunchiate la ~90 de zile).
result: pass
evidence: "Chrome 16.11.2026, profil TULBURE (DB: 64 prezente >100 zile, 15 recente). Istoric Antrenamente listeaza din 08.01.2026 => istoricul complet se incarca (WR-01 ok); Prezent 15 = DB (>=18.08). Statistici/grafic numara doar grupa curenta (+vacanta daca participa) => Iun-Aug 0/0 desi are prezente in alte grupe: logica veche AttendanceStats.tsx:20-23, NU fereastra Faza 38."
observation: "Statisticile ignora prezentele din grupele anterioare (comportament preexistent, de decis separat)."


### 7. INSTRUCTOR si SPORTIV - pornire si liste
expected: Login ca INSTRUCTOR, apoi ca SPORTIV: dashboard-ul se incarca, grupele/prezenta/sportivii se vad (nu liste goale), fara eroare.
result: pass
evidence: "Chrome 16.11.2026: rol SPORTIV pe build local - dashboard se incarca cu date (plati restante, istoric grade, viza medicala), 30 cereri REST, 0 >=8s, 0 erori. Aterizeaza initial pe 'Profil Sportiv' persistat din rolul anterior -> Acces Interzis (403) pana la 'Inapoi la Dashboard' (comportament de view persistat, nu esec de incarcare)."
not_verified: "INSTRUCTOR: nu exista cont/rol de testat in sesiune."


### 8. Telefon - pornire si scroll
expected: Pe telefon, ADMIN_CLUB: login, dashboard si Sportivi se incarca fara eroare; skeleton-urile dispar; navigarea intre ecrane merge.
result: [pending]

## Summary

total: 8
passed: 3
issues: 0
pending: 4
skipped: 1

## Gaps

[none yet]
