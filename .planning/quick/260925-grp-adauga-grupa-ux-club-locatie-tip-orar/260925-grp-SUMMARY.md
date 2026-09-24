---
quick_id: 260925-grp
status: complete
date: 2026-09-25
---

# Summary: UX modal Adaugă Grupă + meniu Activitate Sală

## Ce s-a facut

1. **Club auto-atribuit**: fix bug `isFederationAdmin` in `GrupaFormModal.tsx` (verifica acum contextul de rol activ via prop `isFederationLevel`, nu toate rolurile globale ale userului). `components/Grupe/index.tsx` trimite acum `activeClubId` + `isFederationLevel` catre modal.
2. **Locatie implicita**: preselectare automata cand clubul are o singura locatie disponibila; cu mai multe, ramane alegere manuala.
3. **Tip Grupa default Per Sezon**: la grupa noua, campul porneste pe "Per Sezon" cu sezonul activ deja completat (nu doar la comutare manuala a dropdown-ului).
4. **Program Saptamanal — UX non-tehnic**: `ProgramEditor.tsx` rescris — chip-uri multi-select pe zile (poti bifa Marti+Joi si adauga acelasi interval orar pe amandoua dintr-un singur click), buton cu text explicit ("Adauga in program (N zile)"), plus avertisment `window.confirm` la Salveaza daca lista de program ramane goala (user uitase sa apese butonul de adaugare).
5. **"Activitate Sala" ascuns pt Super Admin Federatie**: eliminat blocul din `menuConfig.ts` -> `adminMenu`; ramane vizibil doar pt ADMIN_CLUB (`adminClubMenu`) si INSTRUCTOR (`instructorMenu`).

## Fisiere modificate

- `components/Grupe/GrupaFormModal.tsx`
- `components/Grupe/ProgramEditor.tsx`
- `components/Grupe/index.tsx`
- `components/menuConfig.ts`

## Verificare

- `npx tsc --noEmit` — curat, zero erori.
- Testat live cu Playwright (context ADMIN_CLUB C.S. Phi Hau): modal Adauga Grupa fara dropdown Club, Tip Grupa Per Sezon + Sezon 2026-2027 (activ) preselectat, bifat Marti+Joi -> "Adauga in program (2 zile)" -> ambele randuri adaugate corect intr-un click.
- Testat context Super Admin Federatie: sidebar confirmat fara sectiunea "Activitate Sala".
- O eroare 500 pe `vedere_prezenta_detaliata` observata in consola in timpul testului — widget dashboard sportiv, nelegata de aceste modificari, in afara scope-ului.

## Status

Verificat vizual complet. Complete.
