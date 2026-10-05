# Taxe anuale FRQKD + FRAM — design revizuit

Status: cerinte clarificate cu utilizatorul (chat, 2026-10-05). Inlocuieste/extinde
`2026-09-12-taxa-anuala-federatie-design.md`. Nimic din acest document nu e implementat inca.

## Doua taxe separate

| | FRQKD | FRAM |
|---|---|---|
| Beneficiar | Federatia QwanKiDo Romania | Federatia mare de arte martiale (viza) |
| Perioada | sezon fiscal: sept–aug (`an_fiscal` = anul de start) | an calendaristic |
| Pret | fix pe sezon, setat de SUPER_ADMIN_FEDERATIE | fix pe an, setat de SUPER_ADMIN_FEDERATIE cel tarziu in februarie |
| Declansare | prima participare in perioada (examen, stagiu CVD, stagiu, competitie) | la fel |
| Factura | `plati.tip='FRQKD'` | `plati.tip='FRAM'` |

Ambele preturi se configureaza intr-un singur ecran (SUPER_ADMIN_FEDERATIE), un rand per (tip, an).
`taxa_anuala_config` se extinde cu coloana `tip` (`FRQKD`/`FRAM`), unic pe (tip, an_fiscal).

## Generare

- **Automat:** trigger-ele existente pe cele 4 tabele de inscriere (vezi spec 2026-09-12) apeleaza
  activarea pentru ambele taxe, o singura data per sportiv per tip per perioada (idempotent prin
  `vize_sportivi` unic pe (sportiv, an, tip)).
- **Manual:** ADMIN_CLUB poate genera pentru un sportiv sau in masa pentru toti sportivii activi.
- **Pret lipsa:** inscrierea NU esueaza. Se pastreaza o taxa "in asteptare" (fara suma); factura se
  creeaza cand federatia seteaza pretul (la setare se proceseaza toate cele in asteptare).
- **Scutiri:** ADMIN_CLUB marcheaza un sportiv scutit pe perioada (cu motiv). Nu se factureaza;
  apare ca scutit in decont.
- **Transfer / doua cluburi:** o singura taxa per perioada, la clubul unde s-a activat prima oara.
- **Restante:** doar avertisment, fara blocarea participarii.

## Fluxul banilor: sportiv → club → federatie

1. Sportivul plateste factura clubului (portofel normal, `plati` + `tranzactii`).
2. Clubul plateste federatiei **selectand explicit sportivii** pentru care plateste (bifare).
   Suma totala = suma facturilor sportivilor bifati; se alege metoda de plata
   (Cash / Transfer Bancar / Revolut) si, optional, dovada transferului.
3. Se creeaza o plata catre federatie (rand in `deconturi_federatie`, mai multe pe club pe perioada)
   legata de sportivii bifati prin `decont_sportivi`. Un sportiv poate fi in cel mult o plata
   catre federatie per tip si perioada.
4. **Club a platit pentru un sportiv care nu a platit clubului:** factura sportivului ramane
   Neachitat, iar clubul vede un **banner de anunt in zona de taxe** (Taxe anuale) cu sportivii care
   nu au platit clubului desi taxa a fost virata federatiei (decizia utilizatorului). Bannerul e singurul
   mecanism de informare; nu blocheaza plata catre federatie.

Rezulta ca `UNIQUE (club_id, an_fiscal)` de pe `deconturi_federatie` se inlocuieste cu mai multe
randuri per club/perioada (cate unul pe fiecare plata catre federatie), cu `tip_activitate`
(`FRQKD`/`FRAM`) si `an_fiscal`.

## Vizibilitate

- Sportiv / parinte: factura in portofel + notificare (WhatsApp sau email) la generare.
- Pe profil: istoric taxe pe sezon, FRQKD si FRAM.

## Rapoarte

1. Dashboard federatie pe cluburi (per perioada: sportivi, facturat, virat, restante).
2. Export Excel/CSV al platilor catre federatie (lista sportivilor acoperiti).
3. Restantieri taxa pe club (neachitat de sportiv catre club), cu actiune WhatsApp.
4. Istoric pe sportiv (taxe platite pe fiecare perioada).

## Date existente (curatare facute 2026-10-05)

- Cele 20 de facturi FRQKD 2025-2026 **Neachitate** au fost sterse, impreuna cu vizele si
  legaturile din `decont_sportivi`. Decontul 2025 al C.S. Phi Hau a ramas cu 17 participanti, 2720 lei.
- Decontul 2025 a fost marcat **Platit, Cash, confirmat de federatie** (decizia utilizatorului).
- Cele 17 facturi **Achitate** si toate incasarile (`tranzactii`) au fost pastrate la cererea utilizatorului.
- Backup-ul randurilor sterse: `public.backup_frqkd_neachitat_20261005` (61 randuri, JSON). Se poate
  sterge dupa confirmare.

## De decis la planificare

- Structura exacta a tabelului pentru taxe "in asteptare" (fara pret).
