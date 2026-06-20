# Context: Phase 12 — Modul Produse/Echipamente

## Goal

ADMIN_CLUB poate gestiona un catalog de produse/echipamente sportive per club (Vo-phuc, esarfe, mănuși, tibiere, etc.), cu variante pe mărime/culoare, stoc cu intrări de marfă, vânzări integrate către sportivi (generează factură în modulul Plăți) și raport financiar cu profit brut. Sportivii văd catalogul public + istoricul propriu de achiziții.

## Requirements

### PRD-01: Catalog produse per club
- ADMIN_CLUB creează/editează/șterge produse pentru clubul său
- Fiecare produs are: denumire, categorie, descriere opțională
- Categorii predefinite: Vo-phuc, Centuri/Esarfe, Mănuși, Tibiere, Platose, Veste, Embleme, Alte echipamente
- SUPER_ADMIN_FEDERATIE poate adăuga categorii globale noi
- Vizibil în sidebar sub secțiunea "Echipamente" — access: ADMIN_CLUB

### PRD-02: Variante produs (mărime + culoare + preț)
- Un produs poate avea N variante
- Fiecare variantă: culoare (text liber), mărime (XS/S/M/L/XL/XXL sau text liber), pret_intrare, pret_vanzare, stoc_curent, stoc_minim
- Prețurile diferă per variantă (esarfă albă S ≠ esarfă violet XL)
- Badge roșu "Stoc redus" când stoc_curent < stoc_minim (vizual admin)

### PRD-03: Intrări marfă (jurnal stoc)
- Admin înregistrează intrare marfă: furnizor (text liber), număr factură, data facturii
- Pe fiecare intrare: N linii (variantă + cantitate + preț intrare la momentul respectiv)
- La salvare: stoc_curent al variantei crește cu cantitatea intrată

### PRD-04: Vânzări integrate
- **Modul dedicat Vânzări**: admin selectează sportiv + produse + cantități → generează Plata în modulul existent
- **Din profilul sportivului**: tab nou "Echipamente" — același flux vânzare
- Stocul scade la vânzare
- Vânzarea creează o înregistrare în `produse_vanzari` + `produse_vanzari_detalii` + o `Plata` cu tip_plata "Echipamente"

### PRD-05: Vizibilitate sportiv
- Tab "Echipamente" în SportivDashboard (vizibil pentru rol SPORTIV)
- Sportivul vede: catalog produse disponibile cu prețuri de vânzare + istoricul achizițiilor proprii (dată, produse, sumă)

### PRD-06: Raport vânzări/financiar
- Tab "Raport" în modulul Produse (ADMIN_CLUB)
- Filtrare pe perioadă (PeriodFilterBar existent)
- Tabel: produs, cantitate vândută, venit total (sum pret_vanzare), cost total (sum pret_intrare la momentul vânzării), profit brut
- Export Excel (xlsx) + Export PDF (jsPDF + autotable)

## Decisions

| ID | Decizie |
|----|---------|
| D-01 | Catalog per club — `produse.club_id` FK → `clubs.id` |
| D-02 | Variante separate table `produse_variante` cu `produs_id` FK |
| D-03 | Categorii în tabel `produse_categorii` — seeded cu 8 predefined, extensibil de SUPER_ADMIN |
| D-04 | Intrări marfă: `produse_intrari` (header) + `produse_intrari_detalii` (linii) |
| D-05 | Vânzări: `produse_vanzari` (header, sportiv_id, plata_id) + `produse_vanzari_detalii` (linii) |
| D-06 | Vânzarea creează Plata cu `tip = 'Echipamente'` — integrare cu modulul Plăți existent |
| D-07 | stoc_curent calculat prin trigger sau actualizat manual în service la intrare/vânzare |
| D-08 | View-uri: `'produse'` (admin catalog) și `'vanzari-produse'` (modul vânzări dedicat) |
| D-09 | Prețurile de raport: `pret_intrare` stocat pe linia de vânzare (snapshot) — nu depinde de varianta curentă |
| D-10 | Badge stoc redus: vizual în catalog admin — fără email/notificări externe |

## Constraints

- Zero dependențe noi npm (xlsx și jsPDF deja în package.json)
- UI exclusiv din `components/ui.tsx` — nu Shadcn/MUI
- Nu se sparge modulul Plăți existent
- RLS pe toate tabelele noi: `club_id = auth.uid() club context`
- Sportivii văd doar prețuri de vânzare (NU pret_intrare)

## Phase Decomposition

| Plan | Titlu | Fișiere principale |
|------|-------|-------------------|
| 12-01 | DB Schema + RLS + Types | `sql/12-produse-schema.sql`, `types.ts` |
| 12-02 | Service + Admin Catalog UI | `services/produseService.ts`, `components/Produse/index.tsx`, `ProdusFormModal.tsx`, LazyComponents, AppRouter, menuConfig |
| 12-03 | Intrări Marfă + Stoc | `components/Produse/IntrareMarfaModal.tsx` + tab în Produse |
| 12-04 | Vânzări (modul dedicat + profil sportiv) | `VanzareModal.tsx`, `SportivDashboard` tab Echipamente |
| 12-05 | Raport + View Sportiv | Tab Raport în Produse + catalog/istoric sportiv |
