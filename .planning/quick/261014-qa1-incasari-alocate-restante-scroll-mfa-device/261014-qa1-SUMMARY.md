---
status: complete
---
# Quick 261014-qa1: feedback WhatsApp 10.08 — incasari, restante, scroll/paginare, MFA

Sursa: lista de 5 puncte de la utilizator (WhatsApp). Plus: fereastra "Adauga Sportivi" mai mare. Toate pe `main`, push facut.

| Punct | Rezultat | Commit |
|---|---|---|
| Modal Adauga Sportivi | max 1400px, 90vh, full-screen mobil; liste fara max-h fix (`Grupe/AdaugaSportiviModal.tsx`) | 7758f76 |
| 1. Suma incasari != facturi achitate | Cauza: RPC `proceseaza_plata_factura` scria doar `tranzactii.plata_ids`, nu `tranzactie_plata`. RPC corectat + backfill alocari + club_id; migrare `20261014a` aplicata pe phi-hau-db | f5b80ed |
| 4. Sold -> buton Restante | `components/Sportivi/RestanteSportiv.tsx` (`RestanteButton`, `useRestantePerSportiv`); lista Sportivi desktop+mobil + tab Financiar profil; soldul scos din UI; link spre `FacturaDetaliu` | 00a2bb8 |
| 2. Scroll + nr. itemi | `hooks/useMemorieSesiune.ts`; Sportivi pastreaza page/pageSize/"Toti" intre meniuri; `ResponsiveTable` pastreaza pagina; restaurarea scroll nu se mai opreste la `touchstart` (acum `touchmove`) | ac12702 |
| 3a. Autocomplete login | `autocomplete` username/current-password/new-password/one-time-code in LoginPage | bcdbe2a |
| 3b. Dispozitiv de incredere 7 zile | Migrare `20261014b` (tabela `mfa_dispozitive_incredere`, RPC inregistreaza/verifica/revoca); checkbox in SetupMFAPage; guard `useMFAGuard`; revocare la reset/schimbare parola | 0e6259f |
| Portofel scos din meniuri admin/instructor | NEVERIFICAT explicit (commit-uri anterioare 767b951/b2cb64d l-au eliminat) | - |

## Reziduuri / de decis
- Date: C.S. Phi Hau diferenta 670 RON incasari vs alocari (2 incasari pe facturi sterse 190+220, 1 incasare 360 cu doar 100 alocat). Kim Long Dao ~58 facturi "Achitat" fara nicio incasare (dupa curatarea din sept.).
- SMS pentru MFA: DOAR plan. 0/14 admini au telefon in DB; recomandare varianta B (cod propriu prin provider SMS platit, email ramane alternativa). Necesita: furnizor + chei Vercel + telefoane admini.
- "Ine-ma minte" din LoginPage e inca decorativ (checkbox fara efect).
- Schimbarea parolei din AccountSettings nu revoca inca dispozitivele de incredere.
- Scroll/paginare NETESTAT pe mobil/tableta (test Playwright blocat de MFA cont admin test). Utilizatorul trebuie sa verifice pe telefon.
- Verificat: tsc --noEmit curat; RPC dispozitiv testat in DB cu rollback. Netestat vizual in browser.
