# Audit Template Categorii — CN Copii & Juniori Onești 21-22.03.2026

> **Sursă PDF:** `CN Copii si Juniori - ONESTI -21-22.03.2026 - circulara.pdf`  
> **Sursă Template DB:** `supabase/migrations/20260529_categorii_template.sql`  
> **Categori totale PDF:** 121 (nr. 1–121)

---

## REZUMAT

| Zonă | Status |
|------|--------|
| THAO QUYEN Individual (76 cat.) | ✅ IDENTICE — nicio acțiune |
| SINCRON (9 cat. template) | ❌ 6 CONFLICT + 3 UPDATE sportivi |
| SONG LUYEN (9 cat. template) | ❌ 9 CONFLICT |
| **TOTAL de șters** | **18 înregistrări** |
| **TOTAL de adăugat** | **42 înregistrări noi** |
| **TOTAL de actualizat** | **3 înregistrări** |

---

## SECȚIUNEA A — DE ȘTERS DIN TEMPLATE (conflict cu PDF)

### A1. SINCRON — 6 înregistrări de șters

| # | Denumire în template | Motiv conflict |
|---|---------------------|----------------|
| 1 | `7-10 ani / Feminin / Sincron` | PDF n-are sincron 7-8 ani; 9-10 ani split pe grad; echipă=3 sportivi (nu 2) |
| 2 | `7-10 ani / Masculin / Sincron` | idem |
| 3 | `7-10 ani / Mixt / Sincron` | idem |
| 4 | `11-12 ani / Feminin / Sincron` | PDF split: 3-4 Cap Roșu ȘI CV–CV4 Cap Alb; echipă=3 sportivi |
| 5 | `11-12 ani / Masculin / Sincron` | idem |
| 6 | `11-12 ani / Mixt / Sincron` | idem |

### A2. SINCRON — 3 înregistrări de actualizat (sportivi_per_echipa 2→3)

| # | Denumire în template | Ce se schimbă |
|---|---------------------|----------------|
| 7 | `13-15 ani / Feminin / Sincron` | `sportivi_per_echipa_min=3, max=3` (PDF: echipă din 3 sportivi) |
| 8 | `13-15 ani / Masculin / Sincron` | idem |
| 9 | `13-15 ani / Mixt / Sincron` | idem |

### A3. SONG LUYEN — 9 înregistrări de șters

| # | Denumire în template | Motiv conflict |
|---|---------------------|----------------|
| 10 | `7-10 ani / Feminin / Song Luyen` | PDF separă 7-8 ani și 9-10 ani; fiecare cu subdivizii de grad |
| 11 | `7-10 ani / Masculin / Song Luyen` | idem |
| 12 | `7-10 ani / Mixt / Song Luyen` | idem |
| 13 | `11-12 ani / Feminin / Song Luyen` | PDF split: 1-2CR / 3-4CR / CV-CV4CA (3 grupe grad) |
| 14 | `11-12 ani / Masculin / Song Luyen` | idem |
| 15 | `11-12 ani / Mixt / Song Luyen` | idem |
| 16 | `13-15 ani / Feminin / Song Luyen` | PDF split: 1 Cap Albastru și 2-4 Cap Albastru (2 grupe) |
| 17 | `13-15 ani / Masculin / Song Luyen` | idem |
| 18 | `13-15 ani / Mixt / Song Luyen` | idem |

---

## SECȚIUNEA B — DE ADĂUGAT ÎN TEMPLATE (noi, din PDF)

### B1. SINCRON — 12 categorii noi (echipă 3 sportivi)

| NR PDF | Denumire nouă | Vârstă | Gen | Grad |
|--------|--------------|--------|-----|------|
| 71 | `9-10 ani / Feminin / Sincron / 3-4 Cap Rosu` | 9-10 | F | grad_ord 8-9 |
| 72 | `9-10 ani / Masculin / Sincron / 3-4 Cap Rosu` | 9-10 | M | grad_ord 8-9 |
| 73 | `9-10 ani / Mixt / Sincron / 3-4 Cap Rosu` | 9-10 | Mixt | grad_ord 8-9 |
| 74 | `9-10 ani / Feminin / Sincron / CV - CV 2 Cap Alb` | 9-10 | F | grad_ord 10-12 |
| 75 | `9-10 ani / Masculin / Sincron / CV - CV 2 Cap Alb` | 9-10 | M | grad_ord 10-12 |
| 76 | `9-10 ani / Mixt / Sincron / CV - CV 2 Cap Alb` | 9-10 | Mixt | grad_ord 10-12 |
| 77 | `11-12 ani / Feminin / Sincron / 3-4 Cap Rosu` | 11-12 | F | grad_ord 8-9 |
| 78 | `11-12 ani / Masculin / Sincron / 3-4 Cap Rosu` | 11-12 | M | grad_ord 8-9 |
| 79 | `11-12 ani / Mixt / Sincron / 3-4 Cap Rosu` | 11-12 | Mixt | grad_ord 8-9 |
| 80 | `11-12 ani / Feminin / Sincron / CV - CV 4 Cap Alb` | 11-12 | F | grad_ord 10-14 |
| 81 | `11-12 ani / Masculin / Sincron / CV - CV 4 Cap Alb` | 11-12 | M | grad_ord 10-14 |
| 82 | `11-12 ani / Mixt / Sincron / CV - CV 4 Cap Alb` | 11-12 | Mixt | grad_ord 10-14 |

### B2. SONG LUYEN 7-8 ani — 6 categorii noi

| NR PDF | Denumire nouă | Gen | Grad |
|--------|--------------|-----|------|
| 13 | `7-8 ani / Feminin / Song Luyen / 1-2 Cap Rosu` | F | grad_ord 6-7 |
| 14 | `7-8 ani / Masculin / Song Luyen / 1-2 Cap Rosu` | M | grad_ord 6-7 |
| 15 | `7-8 ani / Mixt / Song Luyen / 1-2 Cap Rosu` | Mixt | grad_ord 6-7 |
| 16 | `7-8 ani / Feminin / Song Luyen / 3-4 Cap Rosu` | F | grad_ord 8-9 |
| 17 | `7-8 ani / Masculin / Song Luyen / 3-4 Cap Rosu` | M | grad_ord 8-9 |
| 18 | `7-8 ani / Mixt / Song Luyen / 3-4 Cap Rosu` | Mixt | grad_ord 8-9 |

### B3. SONG LUYEN 9-10 ani — 9 categorii noi

| NR PDF | Denumire nouă | Gen | Grad |
|--------|--------------|-----|------|
| 83 | `9-10 ani / Feminin / Song Luyen / 1-2 Cap Rosu` | F | grad_ord 6-7 |
| 84 | `9-10 ani / Masculin / Song Luyen / 1-2 Cap Rosu` | M | grad_ord 6-7 |
| 85 | `9-10 ani / Mixt / Song Luyen / 1-2 Cap Rosu` | Mixt | grad_ord 6-7 |
| 86 | `9-10 ani / Feminin / Song Luyen / 3-4 Cap Rosu` | F | grad_ord 8-9 |
| 87 | `9-10 ani / Masculin / Song Luyen / 3-4 Cap Rosu` | M | grad_ord 8-9 |
| 88 | `9-10 ani / Mixt / Song Luyen / 3-4 Cap Rosu` | Mixt | grad_ord 8-9 |
| 89 | `9-10 ani / Feminin / Song Luyen / CV - CV 2 Cap Alb` | F | grad_ord 10-12 |
| 90 | `9-10 ani / Masculin / Song Luyen / CV - CV 2 Cap Alb` | M | grad_ord 10-12 |
| 91 | `9-10 ani / Mixt / Song Luyen / CV - CV 2 Cap Alb` | Mixt | grad_ord 10-12 |

### B4. SONG LUYEN 11-12 ani — 9 categorii noi

| NR PDF | Denumire nouă | Gen | Grad |
|--------|--------------|-----|------|
| 92 | `11-12 ani / Feminin / Song Luyen / 1-2 Cap Rosu` | F | grad_ord 6-7 |
| 93 | `11-12 ani / Masculin / Song Luyen / 1-2 Cap Rosu` | M | grad_ord 6-7 |
| 94 | `11-12 ani / Mixt / Song Luyen / 1-2 Cap Rosu` | Mixt | grad_ord 6-7 |
| 95 | `11-12 ani / Feminin / Song Luyen / 3-4 Cap Rosu` | F | grad_ord 8-9 |
| 96 | `11-12 ani / Masculin / Song Luyen / 3-4 Cap Rosu` | M | grad_ord 8-9 |
| 97 | `11-12 ani / Mixt / Song Luyen / 3-4 Cap Rosu` | Mixt | grad_ord 8-9 |
| 98 | `11-12 ani / Feminin / Song Luyen / CV - CV 4 Cap Alb` | F | grad_ord 10-14 |
| 99 | `11-12 ani / Masculin / Song Luyen / CV - CV 4 Cap Alb` | M | grad_ord 10-14 |
| 100 | `11-12 ani / Mixt / Song Luyen / CV - CV 4 Cap Alb` | Mixt | grad_ord 10-14 |

### B5. SONG LUYEN 13-15 ani — 6 categorii noi

| NR PDF | Denumire nouă | Gen | Grad |
|--------|--------------|-----|------|
| 116 | `13-15 ani / Feminin / Song Luyen / 1 Cap Albastru` | F | grad_ord 15-15 |
| 117 | `13-15 ani / Masculin / Song Luyen / 1 Cap Albastru` | M | grad_ord 15-15 |
| 118 | `13-15 ani / Mixt / Song Luyen / 1 Cap Albastru` | Mixt | grad_ord 15-15 |
| 119 | `13-15 ani / Feminin / Song Luyen / 2-4 Cap Albastru` | F | grad_ord 16-18 |
| 120 | `13-15 ani / Masculin / Song Luyen / 2-4 Cap Albastru` | M | grad_ord 16-18 |
| 121 | `13-15 ani / Mixt / Song Luyen / 2-4 Cap Albastru` | Mixt | grad_ord 16-18 |

---

## SECȚIUNEA C — OK, NICIO MODIFICARE

### C1. THAO QUYEN INDIVIDUAL — 76 categorii ✅ IDENTICE

Toate categoriile 1–112 din PDF există deja în template cu denumire, vârstă, gen și grade corecte.

Confirmate:
- 7-8 ani (12 cat.) ✅
- 9-10 ani (22 cat.) ✅  
- 11-12 ani (30 cat.) ✅
- 13-15 ani/Juniori II (12 cat.) ✅

---

## NOTE IMPORTANTE

1. **grad_ordine în template** folosește scara: Cap Roșu 1-4 = ordine 6-9; Centura Violet = 10; CV Cap Alb 1-4 = 11-14; Cap Albastru 1-4 = 15-18
2. **Sincron** PDF: 3 sportivi/echipă (template eronat cu 2); `tip_participare='echipa'`, nu `'pereche'`
3. **Song Luyen** PDF: 2 sportivi/echipă — rămâne `'pereche'`
4. Categoriile GIAO DAU, THAO LO, CVD din template **nu apar în acest PDF** — nu se modifică
