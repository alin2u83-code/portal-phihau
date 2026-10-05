---
phase: 33-taxe-anuale-frqkd-fram-doua-taxe-separate-pret-config-super-
plan: 09
subsystem: ui
tags: [react, taxe-anuale, roluri, usePermissions, bannere, faza-33]
requires: ["33-04", "33-05", "33-06", "33-07", "33-08", "33-10"]
provides:
  - "Shell TaxeAnuale.tsx pe roluri (context activ) cu bannere pret lipsa si virat-neachitat"
affects: [components/Plati/hub/TabConfigurare.tsx]
tech-stack:
  added: []
  patterns: ["tab-uri pe rol din usePermissions(activeRoleContext)"]
key-files:
  created: []
  modified: [components/Plati/TaxeAnuale.tsx]
key-decisions:
  - "ADMIN_CLUB = isAdminClub && !isFederationAdmin, ca federatia sa aiba intotdeauna prioritate"
requirements-completed: [TA-01, TA-02, TA-05, TA-09]
duration: ~15 min
completed: 2026-10-05
---

# Phase 33 Plan 09: Shell TaxeAnuale pe roluri Summary

Shell-ul `TaxeAnuale.tsx` rescris (1169 -> 152 linii): tab-uri pe rol din contextul activ, bannere de pret lipsa si virat-neachitat, ecranul vechi bazat pe `taxe_anuale_config` eliminat; props API neschimbat.

## Ce s-a facut

- Roluri din `usePermissions(activeRoleContext)` (nu din `currentUser.roluri`): federatie -> «Prețuri taxe» + «Raport cluburi»; ADMIN_CLUB -> «Situație taxe» + «Restanțieri» + buton «Plăți către federație» (`setActiveView('deconturi-federatie')`). Tab implicit = primul din lista rolului.
- Banner pret lipsa: rosu pentru federatie (cu buton «Configurează prețul» -> tab «Prețuri taxe»), amber pentru club; textul spune ca taxele raman «în așteptare» si se factureaza automat. Calculat cu `pretTaxa(config, tip, getPerioadaTaxa(tip))` pentru FRQKD (sezon) si FRAM (an). Textul vechi «va eșua» a disparut.
- `BannerViratNeachitat` pentru ADMIN_CLUB cu `clubId`, intre antet si tab-uri.
- ADMIN_CLUB fara `club_id` in context -> EmptyState «Selectează un context de club pentru a gestiona taxele.»
- Eliminat: TaxaCard, tab-uri vechi, modal «Status Vize», modal «Adaugă Configurare Taxă», generarea 'Taxa Anuala', stergerea din `taxe_anuale_config`. Tabela veche si `useDataProvider` neatinse; `TabConfigurare.tsx` si `LazyComponents.tsx` nemodificate.

## Task Commits

1. Task 1 (shell): `7d2807a` feat(33-09)
2. Task 2 (poarta de verificare): fara modificari de cod; rezultatele sunt mai jos.

## Poarta de verificare a fazei

| Verificare | Rezultat |
|---|---|
| `npx tsc --noEmit` | trece (fara erori) |
| `npx tsx utils/taxeAnuale.test.ts` | 11 trecute, 0 esuate |
| `npx tsx utils/exportPlatiFederatie.test.ts` | 5 trecute, 0 esuate |
| `npx tsx utils/notificariRestantieri.test.ts` | 21 PASS, 0 FAIL |
| `npm run build` | reuseste (built in 1m 38s) |
| `npx tsx tests/rls_taxe_anuale_faza33.ts` | exit 0, 42/42 verificari, incl. «decontul real FRQKD 2025 (CLUB_B) neschimbat» si cleanup complet |
| `npx tsx tests/flux_taxe_anuale_faza33.ts` | exit 0, 30/30 verificari, incl. decontul real FRQKD 2025 neschimbat si cleanup complet |
| 3 suite SQL `test_taxe_anuale_faza33_{activare,generare_scutiri,plata_federatie}.sql` | rulate de orchestrator pe DB-ul live (T1-T8, G1-S8, P1-P8, toate trecute); fisierele exista si sunt urmarite de git |
| Baseline Q10 (decont FRQKD 2025, 17 sportivi, 2720 lei, Platit/Cash) | neschimbat, confirmat de verificarile 40 (RLS) si 28 (flux) ale testelor live; nicio interogare directa separata, fara MCP DB |
| Acceptance grep pe TaxeAnuale.tsx (`taxe_anuale_config`, `'Taxa Anuala'`, `TaxaCard`, `TabTaxaFederatieFRQKD`, `va eșua`, `currentUser.roluri`) | 0 aparitii; 152 linii (< 300) |

## Deviations from Plan

- Pasul 3 din Task 2 (re-rularea suitelor SQL prin MCP) nu a fost executat de acest agent (fara tool MCP DB); conform instructiunii orchestratorului, suitele au fost rulate de orchestrator si au trecut.
- Pasul 5 (interogare finala baseline) acoperit prin testele live, care compara decontul real inainte/dupa; nu s-a rulat un SELECT separat.
- Altfel: planul a fost executat asa cum a fost scris.

## Verificare umana (end-of-phase) — de parcurs de utilizator, NEFACUTA

Nu am avut acces la un browser/Playwright in acest agent; pasii de mai jos NU au fost executati.

- [ ] 1. Login SUPER_ADMIN_FEDERATIE -> Plăți & Facturi > Configurare > Taxe anuale: tab-urile «Prețuri taxe» si «Raport cluburi»; ambele tipuri (FRQKD, FRAM) se configureaza in acelasi ecran; reminderul FRAM apare daca anul curent nu are pret.
- [ ] 2. Seteaza un pret FRAM pentru anul curent (daca lipseste) -> mesajul «N taxe în așteptare au fost facturate automat»; in «Raport cluburi» FRAM anul curent apar facturile.
- [ ] 3. Login ADMIN_CLUB (C.S. Phi Hau) -> Taxe anuale: «Situație taxe» pe FRQKD 2026-2027 si FRAM 2026, cu stari corecte; «Generează pentru toți sportivii activi» pe o perioada aleasa afiseaza sumarul si butonul «Notifică pe WhatsApp»; linkul wa.me se deschide cu mesajul fara niciun link de actiune in text.
- [ ] 4. Scuteste un sportiv cu motiv -> apare «Scutit» cu motivul; anularea scutirii il refactureaza.
- [ ] 5. «Plăți către federație»: bifeaza 2 sportivi (unul neachitat la club) -> totalul = suma facturilor; alege Cash; salveaza -> plata apare in istoric; incearca sa-l mai bifezi pe acelasi -> nu mai apare in lista.
- [ ] 6. Inapoi in Taxe anuale: bannerul arata sportivul virat dar neachitat catre club.
- [ ] 7. Export CSV si Excel din «Plăți către federație» (Excel are foaia «Scutiți»); deschide fisierele si verifica sportivii.
- [ ] 8. Profilul unui sportiv > Istoric Financiar: sectiunea «Taxe anuale federație» cu FRQKD si FRAM.
- [ ] 9. Competitii: un sportiv fara FRAM achitat pe anul competitiei are avertismentul «⚠ FRAM» dar poate fi inscris.
- [ ] 10. Decontul FRQKD 2025 al C.S. Phi Hau apare in istoric (Platit, Cash, 17 sportivi) neschimbat.

## Known Stubs

None.

## Threat Flags

None. Mitigari: T-33-51 (roluri din `usePermissions(activeRoleContext)`), T-33-52 (cod vechi 'Taxa Anuala' eliminat, verificat prin grep), T-33-53 (teste re-rulate).

## Self-Check: PASSED

- `components/Plati/TaxeAnuale.tsx` exista; commit `7d2807a` exista pe `main`.
