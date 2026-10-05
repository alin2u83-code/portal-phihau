# Phase 33: Taxe anuale FRQKD + FRAM - Context

**Gathered:** 2026-10-05
**Status:** Ready for planning
**Source:** PRD Express Path (docs/superpowers/specs/2026-10-05-taxe-anuale-frqkd-fram-design.md) + clarificari utilizator in chat 2026-10-05

<domain>
## Phase Boundary

Sistem de taxe anuale catre federatii, sportiv -> club -> federatie, cu DOUA taxe separate:
FRQKD (sezon fiscal sept-aug) si FRAM (an calendaristic). Include configurare pret, generare
(automata/manuala/in masa), scutiri, plata club->federatie cu bifare sportivi, banner restantieri,
notificari si rapoarte. NU include blocarea participarii (doar avertisment).

Baza live (phi-hau-db, verificata 2026-10-05): exista deja din spec 2026-09-12 `taxa_anuala_config`
(1 rand: an_fiscal 2026, suma 170), `vize_sportivi`, `decont_sportivi`, `deconturi_federatie`
(cu club_id, an_fiscal, tip_activitate, status_plata, metoda_plata, UNIQUE(club_id, an_fiscal)),
trigger-ele + `activeaza_taxa_anuala`. Planner-ul TREBUIE sa verifice schema/functia live prin
`pg_get_functiondef` / information_schema inainte sa scrie migrari (functii pot fi doar pe live).
Decontul FRQKD 2025 al C.S. Phi Hau: 17 sportivi, 2720 lei, deja Platit/Cash/confirmat (nu se atinge).
Backup temporar: `public.backup_frqkd_neachitat_20261005` (nu face parte din fază).

</domain>

<decisions>
## Implementation Decisions

### Doua taxe separate
- FRQKD: `plati.tip='FRQKD'`, perioada = sezon fiscal (`an_fiscal` = anul de start; luna>=9 -> anul curent, altfel anul-1), pret fix pe sezon.
- FRAM: `plati.tip='FRAM'`, perioada = an calendaristic, pret fix pe an, setat de SUPER_ADMIN_FEDERATIE cel tarziu in februarie.
- Ambele preturi intr-un singur ecran de configurare (SUPER_ADMIN_FEDERATIE). `taxa_anuala_config` se extinde cu `tip` ('FRQKD'/'FRAM'), unic pe (tip, an_fiscal). RLS: scriere doar SUPER_ADMIN_FEDERATIE, SELECT pentru autentificati.
- Idempotenta: `vize_sportivi` unic pe (sportiv_id, an, tip) — extindere cu coloana tip; nu se strica randurile FRQKD existente.

### Generare
- Automat: trigger-ele existente pe `inscrieri_examene`, `stagii_cvd_participare`, `participare_stagiu` (practicant_id), `inscrieri_competitie` apeleaza activarea pentru AMBELE taxe, o data per sportiv/tip/perioada.
- Manual: ADMIN_CLUB genereaza pentru un sportiv sau in masa pentru toti sportivii activi.
- Pret lipsa: inscrierea NU esueaza (inlocuieste RAISE EXCEPTION din spec 09-12). Se pastreaza o taxa "in asteptare" (fara suma); factura se creeaza cand federatia seteaza pretul. Structura exacta a tabelului pentru taxe in asteptare = Claude's Discretion.
- Scutiri: ADMIN_CLUB marcheaza sportiv scutit pe perioada, cu motiv; nu se factureaza; apare ca scutit in decont/rapoarte.
- Transfer / doua cluburi: o singura taxa per perioada, la clubul unde s-a activat prima oara.
- Restante: doar avertisment, FARA blocare participare.

### Fluxul banilor: sportiv -> club -> federatie
1. Sportivul plateste clubului (portofel normal: `plati` + `tranzactii`, RPC `proceseaza_plata_factura` — deja cu verificare club, migrare 20261005).
2. Clubul plateste federatiei selectand explicit (bifare) sportivii; suma totala = suma facturilor bifate; se alege metoda (Cash / Transfer Bancar / Revolut); dovada transfer optionala.
3. Se creeaza o plata catre federatie = rand in `deconturi_federatie` (MAI MULTE pe club/perioada/tip), legata de sportivii bifati prin `decont_sportivi`. Un sportiv e in cel mult o plata catre federatie per tip si perioada. => `UNIQUE (club_id, an_fiscal)` se inlocuieste (cu `tip_activitate` + permitere mai multor randuri) ; `confirmata_federatie` se sincronizeaza cu `status_plata='Platit'`.
4. Club platit pentru sportiv care n-a platit clubului: factura sportivului ramane Neachitat; clubul vede un BANNER de anunt in zona de taxe (Taxe anuale) cu acei sportivi. Bannerul e SINGURUL mecanism de informare; nu blocheaza plata catre federatie.

### Vizibilitate
- Sportiv/parinte: factura in portofel + notificare (WhatsApp sau email) la generare. Emailurile aplicatiei contin info directa, NU link de actiune (regula proiect).
- Profil sportiv: istoric taxe pe perioada, FRQKD si FRAM.

### Rapoarte
1. Dashboard federatie pe cluburi (per perioada: sportivi, facturat, virat, restante).
2. Export Excel/CSV al platilor catre federatie (lista sportivilor acoperiti).
3. Restantieri taxa pe club (neachitat de sportiv catre club), cu actiune WhatsApp.
4. Istoric pe sportiv.

### Constrangeri proiect
- React 18 + TS + Tailwind, `components/ui.tsx`, fara librarii noi; tipuri in `types.ts`; servicii returneaza `{data,error}`.
- Orice migrare noua: fisier in `supabase/migrations/` (cu `git add -f`) SI aplicata pe live; interogheaza live inainte (functii/politici pot lipsi din repo).
- RLS: roluri SUPER_ADMIN_FEDERATIE > ADMIN_CLUB > INSTRUCTOR > SPORTIV; foloseste `has_access_to_club()`; nu duplica logica; functii SECURITY DEFINER cu verificare club.
- Datele existente FRQKD 2025 (17 facturi achitate, 17 vize, decont Platit/Cash) raman intacte.

### Claude's Discretion
- Structura tabelului pentru taxe in asteptare; modelul exact de date pentru scutiri; denumiri coloane noi.
- Impartirea in planuri/valuri; UI exact pentru bifare + banner (in `TaxeAnuale.tsx` / `FederationInvoices.tsx`).
- Canal exact notificari (WhatsApp existent vs email) — reutilizeaza mecanismul existent din notificari restantieri.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specificatii
- `docs/superpowers/specs/2026-10-05-taxe-anuale-frqkd-fram-design.md` — design revizuit (sursa principala)
- `docs/superpowers/specs/2026-09-12-taxa-anuala-federatie-design.md` — schema/trigger-e FRQKD initiale (parte suprascrisa de spec nou)

### Cod existent
- `components/TaxeAnuale.tsx` — tab-uri taxe anuale, Dashboard
- `components/FederationInvoices.tsx` — deconturi catre federatie, PaymentConfirmationModal
- `components/AppRouter.tsx` (~linia 251) — rutare FederationInvoices
- `hooks/useDataProvider.ts` — fetch vize_sportivi / decont_sportivi / deconturi_federatie
- `types.ts` — Plata, DecontFederatie, DecontSportiv, VizaSportiv
- `sql/migrations/add_decont_sportivi.sql`, `supabase/migrations/20260416_create_vize_sportivi.sql`
- `components/Competitii/index.tsx`, `AdminPanel.tsx` — avertisment "viza FRAM" existent la competitii
- `components/Plati/` — hub plati-hub (Faza 31), PlatiScadente, GestiuneFacturi

### Memorie/proiect
- `docs/baza-de-date.md`, `docs/roluri-permisiuni.md`, `docs/conventii-cod.md`

</canonical_refs>

<specifics>
## Specific Ideas

- Pret FRQKD 2026 deja seed 170; cele 37 facturi istorice FRQKD 2025-2026 erau 170 lei fiecare.
- Mesaje de eroare/UI in romana.

</specifics>

<deferred>
## Deferred Ideas

- Blocarea participarii pentru neplata (utilizatorul a ales doar avertisment).
- Taxe diferentiate pe grad/varsta (utilizatorul a ales pret fix).

</deferred>

---

*Phase: 33-taxe-anuale-frqkd-fram*
*Context gathered: 2026-10-05 via PRD Express Path*
