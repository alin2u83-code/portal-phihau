# Phase 25: Audit izolare cross-club Prezenta, Grupe si Abonamente - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28
**Phase:** 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha
**Areas discussed:** Audit vs fix, sesiune_activitate risc rezidual, Empty state club nou

---

## Audit vs fix

| Option | Description | Selected |
|--------|-------------|----------|
| Audit + fix live in aceeasi faza | Ca la Faza 15/16: gaseste gap-uri, scrie migratie, aplica live, verifica | ✓ |
| Doar raport de audit, fix separat | Document cu gap-uri, fix-uri devin faza(e) separata(e) | |

**User's choice:** Audit + fix live in aceeasi faza.
**Notes:** Pastreaza pattern-ul deja validat din Faza 15/16 (inspectie live -> migratie -> apply_migration MCP -> verificare).

---

## sesiune_activitate risc rezidual

| Option | Description | Selected |
|--------|-------------|----------|
| Da, adauga club_id + backfill acum | Rezolva riscul rezidual din Faza 15 acum | ✓ |
| Nu, ramane out of scope | Se trateaza separat alta data | |

**User's choice:** Da, adauga club_id + backfill acum.
**Notes:** Direct relevant pt alte cluburi sa foloseasca Prezenta — fara club_id real, tabela ramane vizibila doar super_admin, ceea ce ar rupe functionalitatea pt ADMIN_CLUB/INSTRUCTOR la cluburi noi.

---

## Empty state club nou

| Option | Description | Selected |
|--------|-------------|----------|
| Mesaj + buton CTA | Text explicativ + buton direct spre actiunea de adaugare | ✓ |
| Doar mesaj simplu, fara CTA | Text gol, fara buton | |

**User's choice:** Mesaj + buton CTA.
**Notes:** Aplica la toate ecranele principale ale celor 3 module (Grupe, Prezenta/rapoarte, TipuriAbonament).

---

## Claude's Discretion

- Lista exacta de tabele DB auditate per modul — confirmate pe schema live, nu presupuse.
- Cautarea "hardcodarilor" de single-club in cod — sarcina tehnica de audit.
- Design exact al componentei empty-state (noua reutilizabila vs inline) — decizie de planner.

## Deferred Ideas

- Wizard onboarding club nou — Faza 26 (deja in roadmap, depinde de Faza 25).
- Copiere template (tipuri abonament / grupe schelet) la club nou — respins la discutia de milestone anterioara.
- Signup public pt cluburi noi — respins, ramane SUPER_ADMIN-only.
