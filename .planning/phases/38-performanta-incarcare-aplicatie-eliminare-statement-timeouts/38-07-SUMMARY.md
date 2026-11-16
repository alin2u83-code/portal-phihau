---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 07
status: incomplete
completed: 2026-11-16
---

# Phase 38 Plan 07: Verificare pe build+preview — PARTIAL

Detalii si tabele: `38-07-MASURATORI.md`.

- Gate-uri automate: PASS (3 teste, tsc 0 erori, build, verificari statice).
- Browser: 0 "Eroare de Sistem" la 10 reload-uri (SUPER_ADMIN, ADMIN_CLUB Phi Hau); plati-hub (D-01) PASS; raport-prezenta (D-03) PASS; 57014 la pornire normala 0.
- Gap: SUPER_ADMIN 1 cerere 9444 ms (sesiuni_examene), singulara, fara 57014.
- Login proaspat pe dispozitiv necunoscut: cereri de date + 25P02 + 57014 pe ecranul MFA => D-02 FAIL; cauze gasite in cod de review si reparate in 95b21b19 (neverificat in browser).
- DE FACUT DE UTILIZATOR: 3c (MFA dispozitiv necunoscut, repetat cu build-ul nou) si 3d (blocare request vedere_cluburi_program_antrenamente + reload).
