# Phase 3: Calendar & CRUD Antrenamente - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 3-calendar-crud-antrenamente
**Areas discussed:** Layout calendar lunar, Expand zi la click, Adaugă antrenament one-off, Anulare vs Ștergere

---

## Layout calendar lunar

| Option | Description | Selected |
|--------|-------------|----------|
| Grid 7 coloane | 7 coloane (L-D), div-uri Tailwind, dot-uri pe zile cu antrenamente | ✓ |
| Listă zile cu antrenamente | Doar zilele cu antrenamente, listate vertical | |
| Tu decideți | Claude alege detaliile | |

**User's choice:** Grid 7 coloane

| Option | Description | Selected |
|--------|-------------|----------|
| Prev/Next lună | Săgeți nav lună + header "Lună An" | ✓ |
| Prev/Next + Jump to today | Săgeți + buton "Azi" | |

**User's choice:** Prev/Next lună

| Option | Description | Selected |
|--------|-------------|----------|
| Verde / Roșu / Gri | Verde=planificat, roșu=anulat, gri=efectuat | |
| Doar Verde / Roșu | Verde=planificat+efectuat, roșu=anulat | ✓ |
| Un singur dot per zi | Dot cu culoarea status-ului dominant | |

**User's choice:** Doar Verde / Roșu

| Option | Description | Selected |
|--------|-------------|----------|
| Border indigo + text bold | Ziua curentă cu border indigo și număr bold | ✓ |
| Background highlight | Background indigo/slate distinct | |

**User's choice:** Border indigo + text bold

**Notes:** Simplificare conștientă — 2 culori sunt suficiente. Efectuat și Planificat = același verde.

---

## Expand zi la click

| Option | Description | Selected |
|--------|-------------|----------|
| Panel dedesubt | Panel fix sub grilă cu lista antrenamentelor | ✓ |
| Slide-down inline sub rând | Rândul din grid se expandează | |
| Modal cu detalii zi | Pop-up modal | |

**User's choice:** Panel dedesubt

| Option | Description | Selected |
|--------|-------------|----------|
| Mesaj + buton Adaugă | "Niciun antrenament" + buton primar | ✓ |
| Panel ascuns | Click pe zi goală = direct formular | |

**User's choice:** Mesaj + buton Adaugă

| Option | Description | Selected |
|--------|-------------|----------|
| Ora + Status + Acțiuni | Compact pe un rând per antrenament | ✓ |
| Card detaliat | Card extins cu toate detaliile | |

**User's choice:** Ora + Status + Acțiuni

---

## Adaugă antrenament one-off

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dedicat | Buton Adaugă → modal cu câmpuri | ✓ |
| Form inline în panel | Câmpuri input direct în panel zi | |
| Click pe zi goală = direct form | Clickul deschide modal/form direct | |

**User's choice:** Modal dedicat

| Option | Description | Selected |
|--------|-------------|----------|
| Data + Ora start + Ora sfârșit | Minim necesar, is_recurent=false hardcodat | ✓ |
| Data + Ora start + Ora sfârșit + Tip | Adaugă câmp tip antrenament | |

**User's choice:** Data + Ora start + Ora sfârșit

| Option | Description | Selected |
|--------|-------------|----------|
| Header tab Antrenamente | Colț dreapta sus, mereu vizibil | ✓ |
| Doar în panel zi | Vizibil doar când o zi e selectată | |

**User's choice:** Header tab Antrenamente

---

## Anulare vs Ștergere

| Option | Description | Selected |
|--------|-------------|----------|
| Modal cu motiv (required) | Textarea required → UPDATE status='anulat' | |
| Modal cu motiv optional | Textarea optional → UPDATE status='anulat' | ✓ (free-text) |
| Confirm direct fără motiv | Confirm simplu fără textarea | |

**User's choice:** Modal cu motiv OPȚIONAL (deviație de la ROADMAP care specifica "required")
**Notes:** Motiv devine opțional — mai flexibil pentru utilizator.

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete + confirm | ConfirmButton → DELETE fizic din DB | ✓ |
| Soft delete | status='anulat' cu motiv='Șters' | |

**User's choice:** Hard delete + ConfirmButton (Phase 8)

| Option | Description | Selected |
|--------|-------------|----------|
| Anulat = final (ireversibil) | Fără buton Reactivează | |
| Buton Reactivează | UPDATE status='planificat', motiv_anulare=null | ✓ |

**User's choice:** Da — buton Reactivează pe antrenamentele anulate

---

## Claude's Discretion

- Detalii implementare `useCalendarView` — reutilizare directă sau query React Query local în TabAntrenamente (D-13)
- Număr maxim de dots vizibile per zi în grilă
- Layout responsiv mobil al gridului calendaristic

## Deferred Ideas

- Jump-to-today buton — considerat, respins pentru MVP
- Tip antrenament în formular — v2
- Calendar săptămânal (week view) — deja în STATE.md deferred
- WhatsApp la anulare — deja în STATE.md deferred
