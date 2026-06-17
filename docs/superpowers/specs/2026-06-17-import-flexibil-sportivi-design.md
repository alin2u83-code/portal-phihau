# Import Flexibil Sportivi — Design Spec
**Data:** 2026-06-17  
**Status:** Aprobat de utilizator

---

## Ce problemă rezolvă

Importul actual ia toate datele din fișier și le aplică uniform. Utilizatorul nu poate alege:
- ce câmpuri să fie importate
- dacă să adauge sportivi noi, să actualizeze pe cei existenți, sau ambele
- câmp cu câmp, ce să se înlocuiască pentru un sportiv care există deja

---

## Flux nou — 4 pași

### Pas 0: Upload fișier (nemodificat)
User selectează fișier Excel sau CSV. Click "Analizează" → citește **doar headerele** (rapid, <1s) → merge la Pas 0.5.

### Pas 0.5 (NOU): Configurare import
Două secțiuni:

**MOD IMPORT** (checkboxes, pot fi bifate ambele):
- `☑ Adaugă sportivi noi` — default: ON
- `☐ Actualizează sportivi existenți` — default: OFF

**CÂMPURI DETECTATE DIN FIȘIER** (toggle per coloană găsită în fișier):
- Blocate mereu: `Nume Sportiv`, `Prenume Sportiv` (necesare pentru identificare)
- Opționale: toate celelalte coloane găsite
- Coloane nerecunoscute de sistem: afișate cu label italic + badge "ignorată"

Validare: dacă "Actualizează existenți" e bifat dar niciun câmp opțional nu e selectat → warning.

Click "Continuă analiza" → analiza completă cu setările alese → Pas 1.

### Pas 1: Revizuire (extins)

**Sportivi NOI** (nu există în DB): afișați ca înainte — badge verde `NOU`, rând simplu.

**Sportivi EXISTENȚI** (găsiți în DB): badge galben `EXISTĂ`, click pe rând extinde tabelul comparativ:

| Câmp | Valoare în DB | Valoare din fișier | Acțiune |
|------|---------------|-------------------|---------|
| Data nașterii | 2000-01-01 | 2000-01-01 | — (identic, gri) |
| CNP | — (gol) | 5001234567890 | ☑ Completează |
| Gen | Masculin | M | ☑ Actualizează |
| Adresă | Str. X nr. 1 | Str. Y nr. 2 | ☐ Păstrează DB |

Logică automată per câmp:
- Valori identice → fără checkbox, gri
- DB gol + fișier are valoare → pre-bifat automat (completare)
- Ambele au valori diferite → checkbox nebifat (user decide)

Toggle global per sportiv: "Selectează tot" / "Deselectează tot".

**Sportivi OMIȘI**: dacă modul e "Adaugă noi" only → sportivii existenți apar cu badge gri `OMIS` (nu se extind).

### Pas 2: Raport (nemodificat)

---

## Fișiere de creat/modificat

| Fișier | Modificare |
|--------|-----------|
| `components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx` | **NOU** — component Pas 0.5 |
| `components/Sportivi/ImportSportiviPage/index.tsx` | split analiză în 2 faze, adaugă step 0.5, pasează config |
| `components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx` | adaugă tabel comparativ per câmp pentru existenți |
| `components/Sportivi/ImportSportiviPage/types.ts` | adaugă `ImportConfig`, `FieldComparison` tipuri |

---

## Tipuri noi

```typescript
interface ImportConfig {
  addNew: boolean;
  updateExisting: boolean;
  selectedColumns: string[];  // coloane bifate de user
  allColumns: string[];       // toate coloanele detectate din fișier
}

interface FieldComparison {
  fieldKey: string;           // ex: 'cnp'
  label: string;              // ex: 'CNP'
  dbValue: string | null;
  fileValue: string | null;
  status: 'identical' | 'db_empty' | 'conflict';
  selected: boolean;          // user a bifat sau nu
}
```

---

## Câmpuri cunoscute de sistem (mapping)

Câmpuri pe care sistemul le înțelege și le poate compara DB vs fișier:
- Nume, Prenume, CNP, Data nașterii, Gen, Adresă, Localitate, Telefon, Cetățenie, Nr. legitimație

Câmpuri din fișier care nu sunt în această listă → afișate ca "ignorată" în Pas 0.5 (nu se importă).

---

## Compatibilitate cu codul existent

- Fișierele CSV template existente: funcționează identic (headerul "NUME SPORTIV" la rândul 0 → Pas 0.5 detectează automat câmpurile)
- Fișierele FRAM multi-sheet: detectare sheet "SPORTIVI" + header la rândul 7 (implementat deja)
- Logica de deduplicare (strict/loose) din Pas 1: păstrată intactă
- Pas 2 Raport: nemodificat

---

## Criterii de succes

1. User poate importa DOAR câmpuri selectate (ex: doar CNP, fără adresă)
2. User poate alege să adauge noi / actualizeze existenți / ambele
3. Pentru fiecare sportiv existent, vede DB vs fișier câmp cu câmp și bifează ce se scrie
4. Fișierele vechi (CSV template) funcționează identic ca înainte
5. Fișierul FRAM cu 5 sheet-uri se importă corect prin sheet "SPORTIVI"
