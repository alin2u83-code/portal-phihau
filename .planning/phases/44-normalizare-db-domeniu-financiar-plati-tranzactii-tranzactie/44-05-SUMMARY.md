# 44-05 SUMMARY — migrări A și B aplicate live (18.11.2026)

Poartă blocking-human: user a ales **aplica-A-si-B** (18.11.2026). Detalii și numere în 44-DECIZII.md "## 44-05".

## Făcut
- Snapshot-uri `backup_faza44.pre_44_05_plati|tranzactie_plata|tranzactii` (count + md5 egale cu live).
- A aplicată: 96 plăți fără club completate (90 sportivi + 6 familii), 0 rămase NULL; trigger `plati_completeaza_club_id_trg` activ; checksum plati neschimbat.
- B aplicată: 0 rânduri inserate (C1 efectiv 0), triggere toate `O`, 0 supra-alocări.
- `MIGRARE_B: APLICATA LIVE; C1_dupa=0` scris în 44-DECIZII.md (deblochează 44-06/08).
- Test live `tests/plati_club_id_faza44.ts`: **8/8 PASS**, plati 978 -> 978, 0 reziduuri.

## Rezultat test (sub RLS reală)
- 1 insert fără club_id -> clubul sportivului; 2 club explicit păstrat; 3 fără sportiv/familie/club reușește cu NULL (flag `--dupa-not-null` o cere 23502 în 44-09); 4 ADMIN@A completat cu clubul lui; 5 ADMIN@B pe sportiv din A refuzat (42501); 6 INSTRUCTOR@A refuzat (42501, "new row violates row-level security policy").

## Constatări pentru următoarele planuri
- **INSTRUCTOR nu poate insera în `plati`** sub RLS (42501), deci inserturile directe din UI ale instructorului pică independent de club. De clarificat dacă e intenționat (vezi și rbv_plati_update din Faza 31).
- Cazul 3 reușește azi cu club NULL: NOT NULL (44-09) cere ca niciun apelant (ex. PlatiScadente cu familie fără membri activi) să nu mai trimită plăți fără club.

## Ratchet ACL (`tests/acl_definer_faza37.ts`): 28/30, 2 FAIL PREEXISTENTE
- `get_my_grupa_id()` expusă authenticated: vine din migrarea `20261117a_grupe_sportiv_select_propria_grupa.sql` (17.11), nu din Faza 44. Al doilea FAIL (self-check sensibilitate) e legat de aceeași stare a ratchet-ului.
- Funcția mea `plati_completeaza_club_id` NU apare în noi (EXECUTE revocat). De rezolvat separat (adăugat în baseline sau revocat), nu atins aici.

## Neverificat
- Test în UI. Idempotența B la a doua rulare nu a fost exersată. A doua verificare ACL nu a fost reparată.
