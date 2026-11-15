# Phase 42: Competitie — editare echipe/quyen, FRAM an calendaristic, arme dupa grad eligibil - Context

**Gathered:** 2026-11-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Trei capabilitati in modulul Competitii (zona cluburilor/reprezentantului + super admin):
1. **Setare FRAM pe competitie:** super adminul decide la deschiderea competitiei daca participa doar sportivi cu cotizatie FRAM platita pentru anul calendaristic al competitiei, sau si cei fara FRAM.
2. **Editare echipe + quyen** dupa inscriere: membri, arma, quyen-uri, categorie.
3. **Arme dupa grad eligibil:** se afiseaza doar armele la care sportivul e eligibil; nu e obligat sa participe la toate.

Nu intra: schimbarea gradului / adaugarea / activarea sportivilor de catre reprezentant (faza separata), butonul super admin "limitare la cei cu nr. stagii indeplinit" (viitor).

</domain>

<decisions>
## Implementation Decisions

### Regula FRAM (setare pe competitie)
- **D-01:** Setare pe competitie, editabila doar de super admin. Valoare implicita la competitie noua: **dezactivata** (comportament de azi: lipsa FRAM = doar avertisment).
- **D-02:** Setarea se face **la deschiderea competitiei** si **nu se mai modifica dupa aceea**: editabila doar in status `draft`, doar citire dupa `inscrieri_deschise`. Impus si in DB (nu doar UI).
- **D-03:** Consecinta: **nu exista retragere automata, previzualizare sau reevaluare** a celor deja inscrisi (regula e fixa inainte de prima inscriere).
- **D-04:** Cand regula e activa: sportivul fara FRAM platit pentru anul calendaristic al competitiei **nu se poate inscrie** — blocat in **UI + DB** (trigger/RLS care refuza INSERT; aceeasi lectie ca Faza 41: o regula doar in UI se ocoleste prin API).
- **D-05:** Super adminul poate inscrie un sportiv fara FRAM chiar daca regula e activa, **cu confirmare explicita**, logata in audit.
- **D-06:** FRAM = an calendaristic (nu sezon). "Platit" include si "scutit" (comportamentul `areTaxaAchitata` existent).

### Editare echipe si quyen
- **D-07:** Editeaza: **super admin oricand** (pana la `finalizata`); **reprezentantul clubului doar cat `competitie.status = 'inscrieri_deschise'`** (reutilizeaza statusul existent; la `inscrieri_inchise` nu mai poate).
- **D-08:** Ce se poate edita: **membrii echipei** (inlocuire/adaugare/scoatere, cu re-validare categorie + arma), **arma echipei** (candidatii se re-filtreaza), **quyen-urile alese** (individual, doua quyenuri), **categoria** (mutare intre categorii compatibile — azi doar super adminul prin RPC Faza 41; reprezentantul primeste dreptul in limita D-07).
- **D-09:** **Taxa ramane neschimbata** la editare (nu se recalculeaza facturi/taxe automat). Daca numarul de taxe s-ar schimba, se semnaleaza adminului ca "de rezolvat".
- **D-10:** Modificarile trebuie sa lase urma in audit cu autorul (modelul Faza 39: sesiune de autor pentru contul comun al clubului).

### Arme dupa grad eligibil
- **D-11:** Filtrul "doar armele eligibile dupa grad" se aplica pe: **Thao Quyen (individual)**, **Pasul Arme din wizard** (`PasArme.tsx`) si **Giao Dau** (armele permise la lupta). Song Luyen/echipe NU sunt in lista alesa (de clarificat la planificare daca arma echipei ramane cu logica din Faza 35).
- **D-12:** Gradul folosit = **gradul efectiv la data competitiei** (ca in Faza 35).
- **D-13:** Sportivul nu e obligat sa participe la toate armele eligibile.
- **D-14:** Inscrieri existente cu arma pe care sportivul nu mai e eligibil (ex. grad corectat): **raman + avertisment** in "de rezolvat" pentru club/admin; nimic nu se sterge automat.
- **D-15:** Pentru sportivul fara arma selectata se **atentioneaza** (banner/avertisment), nu se blocheaza. Interpretare: avertismentul "cine nu are stagiu de arma" apare doar in modul viitor "doar cu stagii" (buton super admin, DEFERRED); acum se avertizeaza cine nu are nicio arma aleasa.

### Claude's Discretion
- Forma exacta a avertismentelor, textele in romana si plasarea toggle-ului FRAM in `CompetitieForm`.
- Daca editarea echipei trece printr-un RPC dedicat (recomandat, ca la `categorii_aplica_operatie`) sau prin scrieri directe cu RLS+trigger.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decizii si faze anterioare
- `.planning/phases/42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d/42-DECISIONS.md` — deciziile initiale din 14.11.2026
- `.planning/phases/41-administrare-categorii-competitie-super-admin-modificare-anu/41-SECURITY.md` — lectii DB: reguli doar in UI se ocolesc, trigger BEFORE DELETE/INSERT, audit
- `.planning/phases/41-administrare-categorii-competitie-super-admin-modificare-anu/41-DECISIONS.md` — categorii (RPC `categorii_aplica_operatie`, "Fara categorie")
- `.planning/todos/pending/2026-11-04-arme-cvd-ramase.md` — Faza 35 arme (grad efectiv, `inlantuiri_grade`, limite cunoscute)
- `.planning/todos/pending/2026-11-12-reprezentant-schimba-grad-in-competitie.md` — DEFERRED (faza separata)
- `docs/ARHITECTURA_COMPETITII.md` — tipuri competitii, probe, reguli oficiale (arme, circulara)
- `docs/roluri-permisiuni.md` — roluri, RLS

No external specs beyond the above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/Competitii/constants.tsx:57-76` — `areVizaFRAM`, `WarningVizaFRAM` (azi doar avertisment); `utils/anFiscal.ts` (FRAM = an calendaristic).
- `InscriereClubWizard/Pas1.tsx:85`, `InscriereModal.tsx:321/380/721`, `InscrieriView.tsx:155/251`, `AdminPanel.tsx:63` — locurile unde se verifica azi FRAM.
- `index.tsx:231` (`canRegister`), `:248` (`canEditArme`), `:213` (`canEditGrad`) — pattern de permisiuni dupa `competitie.status`.
- `InscriereClubWizard/` (`Pas2Quyen`, `Pas2Arme`, `PasArme`, `Pas3Echipe`, `Pas4Sumar`, `retrage.ts`, `BannerDeRezolvat`) — wizard existent, de extins pentru editare.
- `ExternDataProvider.tsx:66` — `vize_club_competitie` (viza FRAM in zona externa; lista goala = avertisment).

### Established Patterns
- Faza 41: operatii atomice prin RPC `SECURITY DEFINER`, validari server-side, trigger-e de garda, audit (`audit_trigger_fn`), banner "de rezolvat".
- Faza 39: autor declarat pe contul comun al clubului (garda `20261111g`).

### Integration Points
- Tabel `competitii` (camp nou pentru regula FRAM, editabil doar `draft`), `inscrieri_competitie`, `echipe_competitie`, `competitie_sportiv_arme`, `viza`/taxe FRAM (`areTaxaAchitata`).

</code_context>

<specifics>
## Specific Ideas

- Regula FRAM e o decizie de deschidere a competitiei, nu un instrument de curatare ulterioara.
- Exemplu arme: la Roman 2026, 21/29 sportivi "Nicio arma disponibila" — mesajul trebuie sa explice de ce.

</specifics>

<deferred>
## Deferred Ideas

- Buton super admin: limitare la sportivii cu nr. de stagii indeplinit (arme) — viitor, explicit NU acum.
- Reprezentantul schimba gradul / adauga / activeaza sportivi din zona de competitie — faza separata (RLS nou pe `sportivi`/`istoric_grade`, GDPR minori, avocat-diavol).
- Song Luyen: confirmare daca filtrul pe grad se aplica si la arma echipei.

### Reviewed Todos (not folded)
- `2026-11-04-arme-cvd-ramase.md` — referinta pentru arme, nu se integreaza ca scop.
- `2026-11-12-reprezentant-schimba-grad-in-competitie.md` — faza separata (vezi mai sus).

</deferred>

---

*Phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d*
*Context gathered: 2026-11-15*
