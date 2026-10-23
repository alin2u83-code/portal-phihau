---
status: complete
---
# Quick 261023-fx1 — GestiuneFacturi sume + incasare atomica
Sursa: 4 videouri feedback WhatsApp 21.10.2026 (Kim Long Dao, ADMIN_CLUB).
- A: factura manuala salveaza suma_initiala = total dupa reducere; pretul de lista in reducereDetalii (altfel reducerea aparea ca "Incasat").
- B: insert mereu Neachitat; la esec RPC proceseaza_incasare_normalizata factura se sterge (nu mai ramane Achitat cu incasat 0).
- D: auto-calcul formular nu mai suprascrie sumele tastate la refetch (ref sumeEditateManual).
Neacoperit: C (mesaj generare abonament), E (marcaj facturi inconsistente), curatare rânduri vechi in DB. tsc --noEmit OK; netestat vizual.
