# Phase 42: Discussion Log

> **Audit trail only.** Decisions are captured in 42-CONTEXT.md.

**Date:** 2026-11-15
**Areas discussed:** Regula FRAM, Editare echipe/quyen, Arme dupa grad, Reprezentant grad+sportivi

## Regula FRAM
- Unde se impune: UI + DB (ales) | doar UI
- Deja inscrisi fara FRAM: user a ales initial "retragere automata"; apoi a clarificat: toggle-ul se seteaza la deschiderea competitiei si nu se mai modifica → fara retragere (confirmat: blocat dupa deschidere).
- Super admin fara FRAM: da, cu confirmare | default toggle: dezactivat.

## Editare echipe/quyen
- Termen reprezentant: status inscrieri_deschise. Editabil: membri, arma, quyen, categorie. Taxa ramane neschimbata.

## Arme
- Ecrane: Thao Quyen, Pasul Arme, Giao Dau (nu Song Luyen). Inscrieri vechi neeligibile: raman + avertisment. Fara arma: avertisment (cine nu are arma/stagiu de arma; modul "doar cu stagii" e viitor).

## Reprezentant: grad + sportivi
- Faza separata (alegere confirmata).

## Claude's Discretion
- Forma avertismentelor/textelor; RPC dedicat vs scrieri directe pentru editare echipe.

## Deferred Ideas
- Buton limitare dupa stagii; reprezentant schimba grad (faza separata).
