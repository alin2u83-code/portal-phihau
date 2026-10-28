---
status: incomplete
---
# Quick 261028-po1 — feedback WhatsApp Max (Falticeni) 28.10.2026

Executat inline (fara planner/executor subagenti — worktree-urile esueaza in acest mediu).

## Facut (push main, d5e83c8, d3e9d97, 7071efd)
1. Grupe > Sportivi: dezactivare sportiv da toast cu "Anuleaza" (6s) — cauza "ii face inactivi" = bifa verde, 1 atingere, fara confirmare. Niciun trigger DB nu seteaza Inactiv.
2. ErrorProvider.showSuccess = toast auto-inchis 3.5s (erorile raman modal). Afecteaza toate succesele.
3. Deduplicare: admin club vede doar sportivii clubului sau (filtru doar UI; RLS pe sportivi tot permite citire cross-club); buton Fuzioneaza blocat pe perechi cross-club pt non-federatie. RPC merge_sportivi pastreaza guard has_access_to_club.
4. Date: DOCHIA STEFAN (cn2025) mutat club Kim Long Dao -> Falticeni (0 dependente). Fuzionarea o face userul din UI.
5. Factura automata la inscriere: cluburi.factura_automata_inscriere (default false, migrare 20261028a aplicata live), card in Plati > Tipuri Abonament, services/facturaService.genereazaFacturaLaInscriere, hook in Sportivi/index.tsx (ambele cai de creare). Pret = tip_abonament_id sportiv, altfel Individual (numar_membri=1) din sezonul activ; sportivi din familie omisi; fara reduceri/loialitate/credit.

## Verificat
- tsc OK; simulare DB pe C.S. Phi Hau (rollback): suma=200, suma_ramasa=200, Neachitat. UI netestat (MFA pe emailul userului blocheaza login automat).

## Ramas
- Falticeni are 0 tipuri_abonament: userul trebuie sa defineasca "Individual" sezon 2026-2027 inainte de a activa bifa, altfel eroare "Factura automata omisa".
- Test manual UI de catre Max/Falticeni.
- RLS sportivi cross-club (citire) de strans separat.
