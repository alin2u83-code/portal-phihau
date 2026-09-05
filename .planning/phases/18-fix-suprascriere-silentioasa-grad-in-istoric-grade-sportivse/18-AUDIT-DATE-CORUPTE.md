# Faza 18 — Audit D-10: Randuri istoric_grade corupte si sportivi cu grad divergent

**Data rularii:** 2026-09-06 (dupa aplicarea migratiei `consolidare_trigger_grad_actual_260906` — vezi `18-01-SUMMARY.md`)
**Executat prin:** `mcp__supabase__execute_sql`, proiect `wuhidifzsutwgdfkwhmd`
**Interdictie respectata (D-10):** zero `UPDATE`/`DELETE`/`INSERT` pe date reale in acest audit — doar `SELECT`.

## Sectiunea C — randuri `istoric_grade` cu data suspecta

Query rulat:

```sql
SELECT
    ig.id AS istoric_id,
    s.nume, s.prenume, s.id AS sportiv_id,
    g.nume AS grad_nume, g.ordine,
    ig.data_obtinere,
    ig.observatii,
    ig.sesiune_examen_id,
    se.data AS data_sesiune_examen
FROM public.istoric_grade ig
JOIN public.sportivi s ON s.id = ig.sportiv_id
JOIN public.grade g ON g.id = ig.grad_id
LEFT JOIN public.sesiuni_examene se ON se.id = ig.sesiune_examen_id
WHERE
    ig.observatii ILIKE '%Schimbare automată grad%'
    OR ig.observatii ILIKE '%Update Profil%'
    OR (
        ig.sesiune_examen_id IS NOT NULL
        AND se.data IS NOT NULL
        AND ig.data_obtinere <> se.data
    )
ORDER BY ig.data_obtinere DESC;
```

**Total randuri gasite: 178**
- 170 cu `observatii = 'Schimbare automată grad (Update Profil)'` (semnatura exacta a trigger-ului eliminat `fn_sync_grad_to_history` — bug-ul confirmat in 18-RESEARCH.md)
- 34 cu `sesiune_examen_id` completat dar `data_obtinere` diferita de data reala a sesiunii de examen asociate (overlap partial cu categoria de mai sus)

Primele 50 randuri (din 178, ordonate descrescator dupa data):

| istoric_id | sportiv | grad | ordine | data_obtinere | observatii | sesiune_examen_id | data_sesiune_examen |
|---|---|---|---|---|---|---|---|
| 96fd5049... | DAVID LAVINIA ELENA | 1 Câp Roșu | 6 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| dffdf35b... | MARDARE ALIN PETRICA | 2 Câp Albastru | 16 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| c285ee65... | POPESCU MATEI IONUT | 4 Câp Galben | 5 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 7fa8674a... | GRIGOROAIA ANDREI MIHNEA | 3 Câp Roșu | 8 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| a0967c61... | STANCESCU CONSTANTIN ALEXANDRU | 1 Câp Roșu | 6 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 08f4945f... | BUCUR TEODOR MATEI | 1 Câp Roșu | 6 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 7d98c3d4... | POPA MIHAI LUCIAN | 4 Câp Albastru | 18 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 80a3cb8e... | VASILACHE MATEI | 1 Câp Galben | 2 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 8ecc4bfd... | DIACONESCU CALIN CONSTANTIN | 1 Câp Galben | 2 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 41c99c97... | VALEANU ANDREEA STEFANIA | C.V. 1 Câp Alb | 11 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| f05f55f7... | HERLEA DENIS ALESSANDRO | 1 Câp Roșu | 6 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 5929c4ae... | IACOB VLADUT | Centura Violet | 10 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 812f220d... | PAMFILE LUCA EMANUEL | 1 Câp Galben | 2 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 6668fc3b... | DIACONU VLAD ANDREI | Centura Violet | 10 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| 04a865f1... | NEGOITA IUSTIN GABRIEL | 1 Câp Galben | 2 | 2026-07-12 | Schimbare automată grad (Update Profil) | — | — |
| f28cb9a3... | POPOVICI DIANA ANASTASIA | C.V. 2 Câp Alb | 12 | 2026-07-10 | Schimbare automată grad (Update Profil) | — | — |
| d8d1095b... | BUDAES EMMA | 2 Câp Roșu | 7 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| 5826a7bb... | VALEANU IONUT GABRIEL | Centura Violet | 10 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| bd2c67a7... | BLAJ DUMITRU ROBERT | 2 Câp Albastru | 16 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| 776088a8... | NAZARET ANEXANDRU DOREL | 1 Câp Galben | 2 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| a977a40a... | VALEANU ANDREEA STEFANIA | Centura Violet | 10 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| fc09a098... | IASILCOVSCHI FLORIN ALECSANDRU | 2 Câp Roșu | 7 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| 64c45730... | CHITIMUS RARES ANDREI | Centura Violet | 10 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| 4a4d8ea2... | ZAMFIR TUDOR RAZVAN | Centura Violet | 10 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| 05806a9a... | FARCAS DANIEL CRISTIAN | 2 Câp Roșu | 7 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| b354e5da... | CRETU RARES GABRIEL | Centura Violet | 10 | 2026-07-09 | Schimbare automată grad (Update Profil) | — | — |
| 385ce616... | HOGAȘ RAUL ȘTEFAN | Debutant | 1 | 2026-07-08 | Schimbare automată grad (Update Profil) | — | — |
| ff1bc766... | HOGAȘ ILINCA OTEEA | Debutant | 1 | 2026-07-08 | Schimbare automată grad (Update Profil) | — | — |
| 66089fc8... | MOROȘANU IASMINA | Debutant | 1 | 2026-07-08 | Schimbare automată grad (Update Profil) | — | — |
| 913100bc... | COSTEA ȘTEFAN ANDREI | Debutant | 1 | 2026-07-08 | Schimbare automată grad (Update Profil) | — | — |
| d24633eb... | CĂLUȘERIU CARMEN IONELA | 3 Câp Albastru | 17 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| 9dfd42da... | POPOVICI ANDREI-COSMIN | 2 Câp Roșu | 7 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| 3d4a966c... | GRAUR CLAUDIA GEORGIANA | 2 Câp Albastru | 16 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| 5d8ceb99... | GRIGORAȘ ECATERINA | 2 Câp Roșu | 7 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| f0312e8d... | MAYER CARL OCTAV | Centura Violet | 10 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| dc651be5... | AMARIEI ALEXANDRU LUCIAN | C.V. 1 Câp Alb | 11 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| eeee88a5... | ANECHIFORESEI GABRIELA | 1 Câp Albastru | 15 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| 12e1b1ea... | TODICĂ ANDREI | 1 Câp Albastru | 15 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| 27123f71... | LĂMĂȘANU ANASTASIA | C.V. 1 Câp Alb | 11 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| 1cc0307d... | SOLCANU IOANA ELIZA | 3 Câp Roșu | 8 | 2026-06-16 | Schimbare automată grad (Update Profil) | — | — |
| b5f6fb21... | AMORARITI ALEXANDRU | C.V. 1 Câp Alb | 11 | 2026-06-10 | Schimbare automată grad (Update Profil) | 7e402aa2... | 2026-06-10 |
| eeba908b... | ȘTEICĂ VICTOR GABRIEL | 3 Câp Roșu | 8 | 2026-06-10 | Schimbare automată grad (Update Profil) | 7e402aa2... | 2026-06-10 |
| 8181f268... | MANDIA MARIA | 4 Câp Roșu | 9 | 2026-06-10 | Schimbare automată grad (Update Profil) | 7e402aa2... | 2026-06-10 |
| 3c74e7bc... | BALMUS VERONICA | 4 Câp Roșu | 9 | 2026-06-10 | Schimbare automată grad (Update Profil) | 7e402aa2... | 2026-06-10 |
| 518c4ec2... | RĂILEANU ADINA CASIANA | 1 Câp Galben | 2 | 2026-06-10 | Schimbare automată grad (Update Profil) | — | — |
| e6ce140c... | DANAILA HORATIU | 1 Câp Roșu | 6 | 2026-06-10 | Schimbare automată grad (Update Profil) | 7e402aa2... | 2026-06-10 |
| 663b298a... | Giurgi Alexandru | C.N. 3 Dang | 22 | 2026-06-06 | Schimbare automată grad (Update Profil) | — | — |
| 1b8b8359... | Ureche Ana Maria | 2 Câp Albastru | 16 | 2026-05-14 | Schimbare automată grad (Update Profil) | — | — |
| 7a3808d5... | URECHE ANDREEA MARA | C.V. 1 Câp Alb | 11 | 2026-05-14 | Schimbare automată grad (Update Profil) | — | — |
| 30fec50a... | POPOVICI ANDREI-COSMIN | 1 Câp Roșu | 6 | 2026-05-11 | Schimbare automată grad (Update Profil) | — | — |

*(128 randuri suplimentare nu sunt listate aici — vezi query-ul de mai sus pentru lista completa.)*

**Observatie:** cele 4 randuri cu `sesiune_examen_id` completat (AMORARITI, ȘTEICĂ, MANDIA, BALMUS, DANAILA — 5 randuri, aceeasi sesiune `7e402aa2...` din 2026-06-10) au `data_obtinere` care COINCIDE cu `data_sesiune_examen` — in aceste cazuri specifice race-ul a "castigat" cu data corecta (coincidenta: sesiunea a avut loc chiar in ziua rularii update-ului), deci nu sunt corupte efectiv, dar poarta aceeasi semnatura `observatii` suspecta. Restul (majoritatea) au `sesiune_examen_id` NULL — inseamna ca randul corect cu data reala a fost complet inlocuit/pierdut (race-ul a fost castigat de scrierea gresita).

## Sectiunea D — sportivi cu `grad_actual_id` divergent de MAX(ordine) din istoric

Query rulat:

```sql
SELECT s.id AS sportiv_id, s.nume, s.prenume, s.club_id,
       gc.nume AS grad_actual_in_db, gc.ordine AS ordine_db,
       gm.nume AS grad_max_din_istoric, gm.ordine AS ordine_max
FROM public.sportivi s
LEFT JOIN public.grade gc ON gc.id = s.grad_actual_id
LEFT JOIN LATERAL (
    SELECT g.id, g.nume, g.ordine
    FROM public.istoric_grade ig JOIN public.grade g ON g.id = ig.grad_id
    WHERE ig.sportiv_id = s.id
    ORDER BY g.ordine DESC LIMIT 1
) gm ON TRUE
WHERE gm.id IS NOT NULL
  AND s.grad_actual_id IS DISTINCT FROM gm.id
ORDER BY s.club_id, s.nume;
```

**Total sportivi divergenti: 95** (camp DERIVAT, nu date istorice — se raporteaza, NU se corecteaza automat, spiritul D-10)

Primele 50 (din 95), club `cbb0b228-...` predominant:

| sportiv | grad_actual (DB) | ordine_db | grad_max (istoric) | ordine_max |
|---|---|---|---|---|
| HRESTIC CRISTINA-ROSEMARIE | 3 Câp Roșu | 8 | 4 Câp Roșu | 9 |
| ANCHIDIN VLAD GAVRIL | 1 Câp Roșu | 6 | 2 Câp Roșu | 7 |
| ANDREI DENIS ANDREI | *(null)* | — | 1 Câp Galben | 2 |
| AVEL LUCA | *(null)* | — | 1 Câp Galben | 2 |
| AVEL CASIANA PETRA | 2 Câp Roșu | 7 | 3 Câp Roșu | 8 |
| BALAN MARIUS | *(null)* | — | 1 Câp Roșu | 6 |
| BARGAOANU GEORGE NICOLAE | 1 Câp Roșu | 6 | 2 Câp Roșu | 7 |
| BOLEA ROBERT ANDREI | *(null)* | — | 1 Câp Galben | 2 |
| BONTAS DIANA ELENA | *(null)* | — | 1 Câp Roșu | 6 |
| BOSTAN CLAUDIU STEFAN | C.V. 1 Câp Alb | 11 | C.V. 2 Câp Alb | 12 |
| BOTEZ TEODORA LAURA | 2 Câp Roșu | 7 | 3 Câp Roșu | 8 |
| BOTEZ ALEX ANDREI | *(null)* | — | Centura Violet | 10 |
| BOTEZ ALEXANDRA | *(null)* | — | 1 Câp Roșu | 6 |
| BUCUR TEODOR MATEI | 1 Câp Roșu | 6 | Centura Violet | 10 |
| BULIGA DAVID ANDREI | 1 Câp Roșu | 6 | 2 Câp Roșu | 7 |
| BURTEA ANDREI RARES | C.V. 1 Câp Alb | 11 | 2 Câp Albastru | 16 |
| BUTINCU ALEXANDRA MARIA | *(null)* | — | C.V. 1 Câp Alb | 11 |
| BUTNARESCU ANDREEA | *(null)* | — | 2 Câp Roșu | 7 |
| CALEU STEFANIA ELENA | *(null)* | — | 1 Câp Galben | 2 |
| CANDEA STEFAN | 2 Câp Roșu | 7 | 3 Câp Roșu | 8 |
| CARP COSMIN CONSTANTIN | 4 Câp Roșu | 9 | Centura Violet | 10 |
| CHIRIAC MARIA ALEXANDRA | *(null)* | — | 2 Câp Roșu | 7 |
| CIMPANU AIDA MARIA | 1 Câp Roșu | 6 | Centura Violet | 10 |
| CODREANU OVIDIU | 3 Câp Roșu | 8 | 4 Câp Roșu | 9 |
| CRETU RARES GABRIEL | Centura Violet | 10 | C.V. 3 Câp Alb | 13 |
| CRETU BIANCA DUMITRELA | 4 Câp Roșu | 9 | Centura Violet | 10 |
| CRUDU MĂLINA | 4 Câp Roșu | 9 | Centura Violet | 10 |
| DIACONESCU CALIN CONSTANTIN | 1 Câp Roșu | 6 | 2 Câp Roșu | 7 |
| DIACONU VLAD ANDREI | Centura Violet | 10 | C.V. 2 Câp Alb | 12 |
| DUŢU GALAXIAN ILIUŢĂ | 4 Câp Roșu | 9 | Centura Violet | 10 |
| ENACHE IOANA ANDREEA | 2 Câp Roșu | 7 | 3 Câp Roșu | 8 |
| FARTADE RARES STEFAN | 3 Câp Roșu | 8 | 4 Câp Roșu | 9 |
| HARLEA FRANCESCA STEFANIA | *(null)* | — | 1 Câp Galben | 2 |
| HEISU DENIS | *(null)* | — | 2 Câp Roșu | 7 |
| HEISU ALISSA | 1 Câp Roșu | 6 | 2 Câp Roșu | 7 |
| HERLEA DENISE VALENTINA | 4 Câp Roșu | 9 | Centura Violet | 10 |
| HERLEA DENIS ALESSANDRO | 1 Câp Roșu | 6 | Centura Violet | 10 |
| IACOB VLADUT | Centura Violet | 10 | C.V. 1 Câp Alb | 11 |
| IANAU IONUT DORIN | *(null)* | — | 2 Câp Roșu | 7 |
| IASILCOVSCHI FLORIN ALECSANDRU | Centura Violet | 10 | C.V. 1 Câp Alb | 11 |
| ISTOC MARIA CARINA | *(null)* | — | 1 Câp Galben | 2 |
| JITARU DENIS ANDREI | *(null)* | — | 1 Câp Roșu | 6 |
| MANOLACHE ALEX STEFAN | Centura Violet | 10 | C.V. 2 Câp Alb | 12 |
| MARES EUSEBIU STEFAN | 2 Câp Galben | 3 | 3 Câp Galben | 4 |
| MARIAN BIANCA DENISA | *(null)* | — | Centura Violet | 10 |
| MICLAUS ANAMARIA | 2 Câp Roșu | 7 | 3 Câp Roșu | 8 |
| MIGHIU ANDREEA ALEXANDRA | 3 Câp Roșu | 8 | 4 Câp Roșu | 9 |
| MIHAILA ALEX STEFAN | 2 Câp Roșu | 7 | 3 Câp Roșu | 8 |
| MILLER ROBERT MARIAN | *(null)* | — | 1 Câp Galben | 2 |
| MOCANU CRISTINEL MIHAI | *(null)* | — | 1 Câp Roșu | 6 |

*(45 randuri suplimentare nu sunt listate aici — vezi query-ul de mai sus pentru lista completa.)*

**Observatie:** un numar mare dintre sportivii divergenti au `grad_actual_in_db = NULL` in ciuda faptului ca au istoric de grad — acesta e un simptom separat, pre-existent migratiei (probabil de la un cod path care a resetat `grad_actual_id` la NULL fara a insera corect in `istoric_grade`, sau de la o secventa `RapoarteExamen.tsx` linia 526 `grad_actual_id: null` observata in research). Odata cu urmatoarea scriere reala in `istoric_grade` pentru acesti sportivi, trigger-ul canonic ii va repara automat.

## Recomandare

1. **Sectiunea C (randuri cu data suspecta):** corectia se face manual, per rand, prin editarea intrarii din `components/UserProfile.tsx` (ecranul de istoric grade al sportivului, actiunea `handleEditGrade` — editeaza `data_obtinere` la data reala a examenului). Editarea prin UI declanseaza acum trigger-ul canonic corect (UPDATE pe `istoric_grade`), care recalculeaza `grad_actual_id` fara a mai risca race condition (D-03/D-04 elimina cauza).

2. **Sectiunea D (95 sportivi divergenti):** un `UPDATE` bulk de resincronizare e posibil, dar NU a fost executat in aceasta faza (D-10). SQL-ul propus, comentat, pentru daca utilizatorul il cere explicit:

```sql
-- NEEXECUTAT — doar pentru referinta, la cererea explicita a utilizatorului.
-- Resincronizeaza grad_actual_id + metoda_selectie_grad pentru toti sportivii
-- al caror grad_actual_id difera de MAX(ordine) din istoric.
--
-- UPDATE public.sportivi s
-- SET grad_actual_id = gm.id,
--     metoda_selectie_grad = 'automat'
-- FROM (
--     SELECT DISTINCT ON (ig.sportiv_id) ig.sportiv_id, g.id, g.ordine
--     FROM public.istoric_grade ig
--     JOIN public.grade g ON g.id = ig.grad_id
--     ORDER BY ig.sportiv_id, g.ordine DESC, ig.data_obtinere DESC, ig.id DESC
-- ) gm
-- WHERE s.id = gm.sportiv_id
--   AND s.grad_actual_id IS DISTINCT FROM gm.id;
```

Alternativa mai putin invaziva: nu rula nimic — trigger-ul canonic va repara automat fiecare sportiv la urmatoarea lui scriere reala in `istoric_grade` (examen nou, corectie manuala). Divergenta ramane vizibila doar pana atunci pe ecranele care citesc direct `sportivi.grad_actual_id`.
