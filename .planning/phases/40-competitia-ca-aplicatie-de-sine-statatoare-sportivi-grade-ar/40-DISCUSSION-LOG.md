# Phase 40 - Discussion Log

> Audit trail only. Decizii in 40-CONTEXT.md.

**Date:** 2026-11-12
**Areas discussed:** Unde schimba gradul, Undo si stocare motiv, Ecran federatie + achitat, Regula de timp si echivalare

- Loc UI: pe randul sportivului din Pas Inscriere (ales) vs ecran separat.
- Cine: doar REPREZENTANT (ales) vs + instructor extern.
- Blocare timp: mesaj clar fara exceptie (ales) vs depasire cu motiv.
- Motiv: doar la undo dupa deadline (ales) vs mereu.
- Stocare: utilizatorul a cerut verificarea sistemului taxe/examene; gasit grade_preturi_config + inscrieri_examene; ales tabel propriu cu taxa snapshot (nu atinge examene) vs creare inscriere examen.
- Undo cand Management a adaugat grad: refuz cu mesaj (ales).
- Ecran federatie: tab nou langa JurnalActori (ales).
- Deadline: NOT NULL + <= data_inceput + backfill (ales).
- Grad fara pret: permis, taxa necunoscuta (ales).
- Raspunsuri anterioare U1-U7 in 40-DECIZII-UTILIZATOR.md.

## Claude's Discretion
Sursa "ultima modificare", varsta la data_inceput, nume tabel/RPC, forma controlului.

## Deferred Ideas
Arme, sportiv nou, retrogradare, NotificationBell, factura automata.
