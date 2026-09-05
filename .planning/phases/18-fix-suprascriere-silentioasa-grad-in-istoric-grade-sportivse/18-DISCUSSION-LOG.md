# Phase 18: Fix suprascriere silentioasa grad in istoric_grade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse
**Areas discussed:** Regula grad actual, Dual-write frontend, Backfill date corupte

---

## Regula grad actual

Gasit live pe DB: 4 trigger-uri diferite pe `istoric_grade`/`sportivi` calculeaza `grad_actual_id` in 3 moduri diferite (latest by data_obtinere x3, sau doar-daca-ordine-mai-mare x1).

| Option | Description | Selected |
|--------|-------------|----------|
| Cel mai mare grad obtinut vreodata (monoton) | grad_actual = MAX(ordine) din tot istoricul, nu scade automat niciodata | ✓ |
| Cel mai recent cronologic | data_obtinere cea mai noua castiga, permite retrogradare accidentala | |
| Hybrid (recent, dar ignora ordine mai mic) | data cea mai noua doar dintre cele >= ordine curent | |

**User's choice:** Cel mai mare grad obtinut vreodata (monoton, nu scade niciodata)
**Notes:** Retrogradarea legitima (corectie eroare) se face prin DELETE pe randul gresit din istoric, nu prin logica de "latest date". Trigger-ul canonic trebuie sa recalculeze MAX si la DELETE.

---

## Dual-write frontend

5 locuri in frontend scriu direct `sportivi.grad_actual_id`, ocolind `istoric_grade` — asta declanseaza `tr_sync_grad_history` care insereaza istoric cu `CURRENT_DATE` in loc de data reala a examenului.

| Option | Description | Selected |
|--------|-------------|----------|
| Elimina complet update-urile directe | Doar INSERT in istoric_grade cu data reala; grad_actual_id devine strict derivat | ✓ |
| Pastreaza update-urile, dar repara sa scrie si istoric_grade cu data corecta inainte | Mai putina schimbare de cod, dar pastreaza 2 cai de scriere | |

**User's choice:** Elimina complet — doar INSERT in istoric_grade, niciodata UPDATE direct pe sportivi.grad_actual_id
**Notes:** Locuri identificate: ManagementInscrieri.tsx (3x), useExamManager.ts, RapoarteExamen.tsx, posibil ImportExamenModal.tsx. Guard-ul de "doar daca superior" se muta din frontend in trigger-ul DB canonic.

---

## Backfill date corupte

Istoric_grade are probabil randuri cu `observatii = 'Schimbare automată grad (Update Profil)'` si `data_obtinere` = data update-ului (nu data reala a examenului), cauzate de trigger-ul `tr_sync_grad_history` inainte de fix.

| Option | Description | Selected |
|--------|-------------|----------|
| Doar preventie, nu atinge date istorice | Fix merge doar inainte, curatarea ramane todo separat | |
| Identifica si raporteaza (fara sa modifice) | Query de audit, decizia de corectie manuala ramane la user | ✓ |

**User's choice:** Identifica si raporteaza randurile suspecte (fara sa le modifice), decizia de corectie manuala ramane la tine
**Notes:** Planul trebuie sa produca un raport (query SELECT), nu un UPDATE automat pe date istorice existente.

---

## Claude's Discretion

- Denumirea exacta a noului trigger/functie canonica
- Daca `metoda_selectie_grad` se pastreaza in noul design (verifica utilizare in UI inainte de a decide)
- Ordinea exacta DROP/CREATE la migrare (evita fereastra fara trigger activ)

## Deferred Ideas

None — discutia a ramas in scope-ul fazei.
