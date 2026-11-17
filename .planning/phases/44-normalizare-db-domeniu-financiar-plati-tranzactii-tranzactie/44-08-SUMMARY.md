# 44-08 SUMMARY — ultimii writeri de plata_ids eliminați (18.11.2026)

Precondiție: `MIGRARE_B: APLICATA LIVE; C1_dupa=0` în 44-DECIZII.md. `tranzactii.plata_ids` e nullable fără default (verificat live), deci poate fi omis la insert.

## Făcut
- `UserProfile.tsx`: `handleSaveTranzactieEdit` taie `plata_ids`/`alocari` înainte de update și selectează cu embed; `handleMutaPlata` face `update tranzactie_plata set plata_id` (nu mai scrie coloana); `confirmDeletePlata` fără blocul de rescriere a array-urilor (legătura dispare prin ON DELETE CASCADE), starea locală aliniată.
- **Cazul trigger în handleMutaPlata:** sursa live `on_tranzactie_plata_change` recalculează la UPDATE atât `NEW.plata_id` cât și `OLD.plata_id` -> **update-urile manuale de status scoase** (nu se mai luptă cu triggerul, nu se mai dublează SMS); după mutare se reîncarcă cele 2 facturi și se afișează statusul nou din DB.
- `JurnalIncasari.tsx`: inserul plății în avans fără `plata_ids`, tip fără `plata_ids`/`alocari`, rând normalizat în state; două fetch-uri trecute pe embed + normalizare.
- `facturaService.ts` `stergeFacturaAbonament`: garda pe `tranzactie_plata.plata_id` (același mesaj de refuz); JSDoc actualizat. `facturaService.test.ts` adaptat (alocare în `tranzactie_plata`), **NEÎNCERCAT**: scrie rânduri efemere pe live, se rulează în 44-10 cu OK.
- Fetch-uri trecute pe `SELECT_TRANZACTIE_CU_ALOCARI` + normalizare: FacturaDetaliu, GestiuneFacturi, JurnalIncasari (x2), RaportFinanciar, PlatiScadente.

## Verificat
- `tsc --noEmit`: 0 erori (baseline 0).
- grep: 0 `from('tranzactii').select('*')` în components/hooks/services (fără teste); 0 `.contains('plata_ids'`, 0 insert/update cu cheia `plata_ids`; rămân doar citiri/state locale ale câmpului derivat.
## Neverificat
- Fluxurile din UI (editare/mutare/ștergere în UserProfile, avans familie, ștergere factură cu încasări): human-check la sfârșitul fazei.
- `facturaService.test.ts` (neîncercat).
- JurnalIncasari ~519-524 (ștergere încasare) încă setează `status='Neachitat'` pe `plata_ids`, acum derivat din alocări (include și tranzacțiile vechi cu coloana goală); comportament preexistent, nemodificat (vezi review 44-06).
- Fără push: codul trebuie în producție înaintea drop-ului din 44-10 (decide userul).

## Revizie după review (18.11.2026, aprobată de user: ambele Required)
1. `UserProfile.handleMutaPlata`: refuz dacă încasarea are deja alocare pe factura nouă (nu există UNIQUE pe (tranzactie_id, plata_id)); UPDATE cu `.select('tranzactie_id')`, eroare dacă 0 rânduri (alocare lipsă sau ascunsă de RLS) în loc de "Plată mutată" fals.
2. `JurnalIncasari.handleDeleteTranzactie`: scos `update plati set status='Neachitat'` manual; DELETE pe tranzactii șterge alocările (CASCADE, 44-VERIFICARE:37), triggerul recalculează, codul reîncarcă facturile.
tsc 0 erori. Neverificat în UI. Neaplicate (opționale): garda la ștergerea facturii Achitat Parțial, avertisment la surplus, verificarea manuală OLD+NEW a triggerului pe DB live.
