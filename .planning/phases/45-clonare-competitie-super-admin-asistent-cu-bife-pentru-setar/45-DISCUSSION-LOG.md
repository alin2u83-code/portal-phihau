# Phase 45: Clonare competitie - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-18
**Phase:** 45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar
**Areas discussed:** Anulate si structura initiala; Taxe; Clonare intre tipuri; Pornire si iesire din asistent

---

## Anulate si structura initiala

| Intrebare | Optiuni | Ales |
|---|---|---|
| Anulatele (9) intra in clona? | Nu, raman in afara (rec.) / Da, cu status activ / Bifa separata | **Da, cu status activ** |
| Structura initiala la fuzionari/impartiri | Surse originale fara rezultate (rec.) / Surse + marcaj de verificat | **Surse originale fara rezultate** |
| Fallback daca reconstruirea nu e fidela | Varianta activa + avertisment (rec.) / Opreste clonarea / Omite categoria | **Varianta activa + avertisment** |

**Notes:** Date live 18.11: sursa finalizata are 68 active, 9 anulate, 2 fuzionate, 5 impartite; impartitele au `categorii_fuzionate_din` = id-uri ale categoriilor noi. Alegerea "anulate incluse" contrazice recomandarea.

## Taxe

| Intrebare | Optiuni | Ales |
|---|---|---|
| Taxe la clonare | Copiate ca atare (rec.) / Copiate dar cerute in asistent / Resetate | **Copiate ca atare** |

## Clonare intre tipuri

| Intrebare | Optiuni | Ales |
|---|---|---|
| Probe/categorii incompatibile | Se omit cu lista (rec.) / Se blocheaza / Se copiaza tot cu avertisment | **Se copiaza tot cu avertisment** |
| Ce inseamna "compatibil" | Dupa tipul probei (rec.) / Regula simpla in asistent | **Dupa tipul probei** |

## Pornire si iesire din asistent

| Intrebare | Optiuni | Ales |
|---|---|---|
| Unde porneste | Buton pe randul competitiei (rec.) / Buton sus in lista / Ambele | **Buton pe randul competitiei** |
| Pasi asistent | 1 ecran (rec.) / 2 pasi / 3 pasi | **1 ecran** |
| Dupa creare | Se deschide noua competitie in draft (rec.) / Ramai in lista cu toast | **Se deschide noua competitie in draft** |
| Sursa clonarii | In observatii (rec.) / In audit_log / Ambele | **In observatii** |

## Claude's Discretion

Structura interna a RPC, format `p_setari jsonb`, layout responsive al Modalului.

## Deferred Ideas

- Clonare de inscrieri/echipe (respinsa).
- Template per tip cu sincronizare (respins in favoarea clonarii).
