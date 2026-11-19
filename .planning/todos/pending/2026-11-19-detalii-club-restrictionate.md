# Detalii club vizibile doar pentru super admin si admin club (quick 261119-ihl)

Cerinta (19.11.2026): cif + setarile clubului doar pentru super admin si admin club; restul vad doar nume + oras (plus tema/logo/slug pentru UI).
Plan: `.planning/quick/261119-ihl-cluburi-detalii-restrictionate/261119-ihl-PLAN.md`

## Finalizat
- [x] Val 1 — tabel `cluburi_detalii` 1:1, RLS (`poate_gestiona_taxe_club`), trigger club nou, RPC `factura_automata_activa` — migrare 20261119a, aplicat live; dry-run cu rollback + review separat
- [x] Val 1b — index unic partial pe `cluburi_detalii(cif)` — 20261119b, aplicat live
- [x] Val 2 — frontend pe `cluburi_detalii` (ClubSettings, CluburiManagement, TipuriAbonament, PlatiScadente, Sportivi/index.tsx, useDataProvider, types.ts, services/cluburiDetaliiService.ts); review separat + 3 fixuri (CIF duplicat, CIF nesters la eroare de incarcare, fara fallback tacit la gratie); tsc ok; deploy READY
- [x] Val 3 — DROP COLUMN cif/perioada_gratie_zile/factura_automata_inscriere din `cluburi`, view `rbv_cluburi_detaliu` recreat (security_invoker) — 20261119c, aplicat live; 0 diferente detalii vs cluburi inainte; review separat fara bug-uri
- [x] Val 3b — revoke grant-uri largi (TRUNCATE/TRIGGER/REFERENCES, scriere anon, view) — 20261119d, aplicat live; dry-run cu rollback
- [x] Bug existent reparat pe parcurs: PlatiScadente folosea mereu 30 zile gratie (acum citeste valoarea reala)
- [x] Fix `scrollbar-hide` (tab-uri competitie pe mobil) — index.css, pushat 53f5fd4a
- [x] UAT faza 36 inchis: 4 pass, 1 issue (scrollbar, reparat), 3 skipped — 36-UAT.md

## De facut
- [ ] Test in browser pe roluri reale (nimic din Val 2/3 nu a fost vazut in browser): super admin = Cluburi (lista CIF, editare, club nou cu CIF), admin club = Setari club (CIF se incarca si se salveaza) + Taxe (perioada gratie, factura automata), instructor = inscriere sportiv cu factura automata activa
- [ ] Test trigger `trg_cluburi_detalii_la_club_nou` pe un club nou real (netestat)
- [ ] Verifica daca INSTRUCTOR poate genera facturi in PlatiScadente; daca da, pragul lui de gratie e mereu 30 (nu vede `cluburi_detalii`) => RPC da/nu ca la factura_automata_activa
- [ ] Pagina publica de inscriere (InscrierePublicPage): `anon` citeste 0 randuri din `cluburi` (RLS, preexistent) — verifica daca lista de cluburi trebuie sa fie vizibila fara login
- [ ] Minor: TipuriAbonament arata 30 zile / factura automata oprita daca citirea esueaza (nu strica date)
- [ ] Minor: CluburiManagement — CIF-ul introdus se pierde fara retry daca insertul clubului esueaza
- [ ] Confirmare pe telefon real: tab-urile competitiei fara bara de scroll (36-UAT test 6, deploy 53f5fd4a) si cardul de facturi din Incasari (d9d0f277)
- [ ] Browsere cu bundle vechi (tab deschis/PWA) pot da eroare la incarcarea clubului pana la reincarcare
