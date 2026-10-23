---
status: complete
---
# Quick 261023-fx1 — Plati: conventie sume, incasare atomica, FacturaDetaliu
Sursa: 4 videouri feedback WhatsApp 21.10.2026 (Kim Long Dao, ADMIN_CLUB).

Conventie reala: suma = total facturat dupa reducere; suma_initiala = pret lista; suma_ramasa = rest (trigger).

Executat:
1. GestiuneFacturi: insert mereu Neachitat + stergere factura daca RPC incasare pica; auto-calcul formular nu suprascrie sumele tastate; tabele/modale pe rest/incasat corect; modal editare doar suma totala.
2. Migrari pe phi-hau-db: 20261023a (recalculare_stare_plata pe suma, ignora Anulat, backfill suma_ramasa), 20261023b (trigger plati_sync_suma_ramasa).
3. PlatiScadente: rest la incasare/notificare restanta.
4. FacturaDetaliu + utils/facturaDetaliu.ts pe noua conventie; teste 34 PASS.
5. 4 facturi Neachitat cu incasari reale -> Achitat.
Ramase: 83 Achitat fara incasari (decide clubul), rapoarte (RaportFinanciar) nevalidate, mesaj generare abonament, test vizual tableta, SMS confirmare plata (trigger compara 'achitat' lowercase).
