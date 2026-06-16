# Phase 4: Stagii Completare - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 04-stagii-completare
**Areas discussed:** Acces INSTRUCTOR, Fallback taxă — 2 vs 3 niveluri, Ștergere participant — ce se face cu plata

---

## Acces INSTRUCTOR

### INSTRUCTOR poate înscrie sportivi la stagiu?

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| Nu — doar ADMIN_CLUB | Stagiile au plată asociată — RLS simplu | |
| Da, cu generare plată | Necesită modificare RLS `plati_insert` pentru INSTRUCTOR | ✓ |
| Da, fără generare plată | INSTRUCTOR înscrie, adminul adaugă plata separat | |

**Alegerea utilizatorului:** Da, cu generare plată  
**Note:** Necesită modificare RLS — INSTRUCTOR trebuie adăugat în politica `plati_insert`.

---

### INSTRUCTOR poate vedea lista participanți + plăți?

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| Da — vede participanții dar nu valorile plăților | Sportiv / Data / Categorie — fără sume și status | ✓ |
| Da — vede totul inclusiv plăți | Același tabel complet ca ADMIN_CLUB | |
| Nu — nu vede deloc lista participanți | Secțiunea rămâne doar ADMIN_CLUB | |

**Alegerea utilizatorului:** Da — vede participanții dar nu valorile plăților  
**Note:** Date financiare (taxă, status Achitat/Neachitat) rămân vizibile exclusiv pentru ADMIN_CLUB.

---

### INSTRUCTOR poate șterge un participant?

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| Nu — doar ADMIN_CLUB poate șterge | Ștergerea implică logică de plată | ✓ |
| Da — INSTRUCTOR poate șterge | Plata rămâne sau se anulează per decizie ulterioară | |

**Alegerea utilizatorului:** Nu — doar ADMIN_CLUB poate șterge

---

## Fallback taxă — 2 vs 3 niveluri

### Lanțul de fallback pentru taxa la înscriere

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| 3 niveluri: eveniment → tip stagiu → global | Flexibil, necesită fetch tipuriStagii în EvenimentDetail | ✓ |
| 2 niveluri: eveniment → global | Simplu, deja implementat în faza anterioară | |

**Alegerea utilizatorului:** 3 niveluri  
**Note:** Faza anterioară a implementat doar 2 niveluri. Replanuieste pentru a adăuga nivelul intermediar (tipuri_stagii).

---

### Prețul din TipuriStagii — unic sau diferențiat per categorie?

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| Preț unic per tip stagiu | `tipuri_stagii.pret` = un preț indiferent de categorie | |
| Diferențiat per categorie la nivel tip stagiu | `pret_copii / pret_grade / pret_centuri` pe tipuri_stagii | ✓ |

**Alegerea utilizatorului:** Diferențiat per categorie  
**Note:** Necesită migrație SQL — adaugă 3 coloane pe `tipuri_stagii`.

---

### Cine setează prețurile per tip stagiu?

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| SUPER_ADMIN_FEDERATIE — prețuri naționale | Prin TipuriStagiiAdmin, cluburile override pe eveniment | ✓ |
| ADMIN_CLUB — fiecare club setează propria configurare | Necesită club_id pe tipuri_stagii | |

**Alegerea utilizatorului:** SUPER_ADMIN_FEDERATIE — prețuri la nivel național

---

## Ștergere participant — ce se face cu plata

### La ștergere participant, ce se face cu plata "Taxa Stagiu"?

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| Ștergere automată a plății (cu logic condiționată) | Neachitată → șterge. Achitată → warning modal | ✓ |
| Marcare "Anulat" | Plata rămâne cu status Anulat pentru audit | |
| Plata rămâne intactă | Adminul o șterge manual din PlatiScadente | |

**Alegerea utilizatorului:** Ștergere automată (cu tratare specială pentru plăți Achitate)

---

### Comportament când plata este deja Achitată

| Opțiune | Descriere | Selectat |
|---------|-----------|----------|
| Warning modal — adminul confirmă | "Plata de X lei achitată. Participantul se retrage, plata rămâne." | ✓ |
| Ștergere automată inclusiv plata Achitată | Riscuri contabile | |
| Blocat — nu poți șterge participant cu plată Achitată | Adminul trebuie să anuleze plata mai întâi | |

**Alegerea utilizatorului:** Warning modal — adminul confirmă sau anulează

---

## Claude's Discretion

- UX preview taxă real-time (useMemo pattern deja implementat — continuă)
- Ordinea coloanelor în tabelul INSTRUCTOR vs ADMIN_CLUB
- Mesaje toast pentru succes/eroare

## Deferred Ideas

- Persistență filtre în tab participanți — v2
- Notificare WhatsApp/SMS la înscriere stagiu — altă fază
- Aprobare INSTRUCTOR de ADMIN înainte de finalizare înscriere — workflow complex, out of scope
