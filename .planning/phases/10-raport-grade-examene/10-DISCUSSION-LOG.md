# Phase 10: Raport Grade & Examene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 10-raport-grade-examene
**Areas discussed:** Eligibilitate GRD-03, Navigare GRD-04, Amplasare UI, Chart tip GRD-01

---

## Eligibilitate GRD-03

| Option | Description | Selected |
|--------|-------------|----------|
| inscrieriExamene | Ultimul 'Admis' cu grad_sustinut_id = grad_actual; consistent cu getEligibleGrade | ✓ |
| istoricGrade | Cea mai recentă intrare cu grad_id = grad_actual_id; mai simplu dar diferit de utils/eligibility.ts | |

**User's choice:** inscrieriExamene (Recomandat)

| Option | Description | Selected |
|--------|-------------|----------|
| data_inscrierii fallback | Dacă nu există 'Admis', folosește data_inscrierii sportivului | ✓ |
| Nu afișa în listă | Sportivii fără istoric admitere omișă din lista eligibili | |

**User's choice:** data_inscrierii ca fallback (Recomandat)

| Option | Description | Selected |
|--------|-------------|----------|
| Sportiv + Grad curent + Timp la grad + Grad urmator | Sortat descrescător după timp | ✓ |
| Sportiv + Grad curent + Data eligibilității | Sortat cronologic | |

**User's choice:** Sportiv + Grad curent + Timp la grad + Grad următor (Recomandat)

---

## Navigare GRD-04

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown în tab GRD-04 | Select din toți sportivii; click din GRD-03 populează dropdown | ✓ |
| Numai click din GRD-03 | Click pe rând → modal/drawer cu istoricul | |

**User's choice:** Dropdown în tab GRD-04 (Recomandat)

| Option | Description | Selected |
|--------|-------------|----------|
| Tabel cronologic | Data \| Sesiune \| Grad Obținut \| Rezultat, sortat descrescător | ✓ |
| Carduri verticale timeline | Vizual mai atractiv, mai complex | |

**User's choice:** Tabel cronologic (Recomandat)

| Option | Description | Selected |
|--------|-------------|----------|
| inscrieriExamene — toate tent. | Arată TOATE examenele (Admis + Respins + Neprezentat) | ✓ |
| IstoricGrade — doar promovări | Arată doar momentele de avansare | |

**User's choice:** inscrieriExamene — toate tentativele (Recomandat)

---

## Amplasare UI

| Option | Description | Selected |
|--------|-------------|----------|
| Component nou + rută nouă | RaportGradeExamene.tsx + view 'raport-grade-examene' + Sidebar | ✓ |
| Tab-uri noi în RapoarteExamen.tsx | Analytics amestecate cu session management | |

**User's choice:** Component nou + rută nouă (Recomandat)

| Option | Description | Selected |
|--------|-------------|----------|
| Sub 'Rapoarte' | Aceeași secțiune Sidebar ca RaportFinanciar | ✓ |
| Sub 'Examene' | Lângă GestiuneExamene | |

**User's choice:** Sub 'Rapoarte' (Recomandat)

---

## Chart tip GRD-01

| Option | Description | Selected |
|--------|-------------|----------|
| BarChart vertical | Recharts BarChart, ordonat după Grad.ordine, arată 0-count | ✓ |
| PieChart | Nu poate afișa felii 0 — slab pentru GRD-01 | |

**User's choice:** BarChart vertical (Recomandat)

---

## Claude's Discretion

- Structura internă tab-uri în RaportGradeExamene (denumiri, iconuri, ordine)
- Culori BarChart și badge-uri Rezultat
- Empty state per tab
- Formatare "Timp La Grad" (ex: "14 luni", "1 an 2 luni")

## Deferred Ideas

- Expandare accordion per grad în GRD-01 — v2.0
- Filtrare GRD-02 pe interval de date — v2.0
- Export CSV/PDF pentru GRD-03 — v2.0
- Notificări email/WhatsApp din GRD-03 — v2.0
