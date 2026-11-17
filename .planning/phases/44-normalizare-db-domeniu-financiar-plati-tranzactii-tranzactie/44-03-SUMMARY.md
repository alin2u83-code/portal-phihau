# 44-03 SUMMARY — migrări A și B scrise + dry-run (18.11.2026)

Nimic aplicat live. DB neschimbată (verificat după fiecare dry-run: contoare, checksum, 0 tabel/trigger/funcție reziduale).

## Migrarea A — `20261118a_faza44_plati_club_id.sql` (NEAPLICATA)
Funcție `plati_completeaza_club_id()` (INVOKER, search_path fixat, EXECUTE revocat de la PUBLIC/anon/authenticated) + trigger BEFORE INSERT + 2 backfill-uri (sportivi, apoi familii.club_id) + rollback din snapshot proaspăt (pre_44_05_plati). Exceptie 3NF scrisă în antet.
Dry-run (rollback forțat, baza reală): club_id NULL 96 -> 0 (90 sportivi + 6 familii); checksum plati egal; 3 inserturi test OK (sportiv -> clubul lui; fără nimic -> NULL; doar familie -> familii.club_id); politici plati 7/7; ACL OK.

## Migrarea B — `20261118b_faza44_tranzactie_plata_reconciliere.sql` (NEAPLICATA)
begin/commit, trigger `tranzactie_plata_change_trigger` suspendat și reactivat, log propriu `backup_faza44.faza44_b_inserate`, rollback pe id-uri exacte.
Dry-run: **0 alocări inserate**. Toate cele 5 tranzacții C1 (920 RON) indică facturi șterse (orfane); regula din 20261014a le sare. Pe datele de azi B e no-op idempotent.

## Raport R0 (`44-RAPOARTE.md`)
C0 0, C1 5 (toate orfane), C2 110, C3 283, C4 2, flag M 1, O 0. Cele 2 C4 listate pe id.

## Ajustări de plan
- 44-03/44-05: „C1” = array-only cu cel puțin o factură existentă (orfanele C1o nu blochează precondiția „C1_dupa=0” din 44-06/08).

## Neverificat
- Migrările nu au rulat ca migrare reală (doar corpul, fără begin/commit, în dry-run); `apply_migration` și numele de fișier nu au fost testate.
- Comportamentul lui `trg_plata_sms`/`audit_plati` la inserturile de test (rulate ca rol postgres, fără RLS) — rollback-ate.
- Politicile RLS pe `plati` nu au fost exersate cu un apelant `authenticated` (WITH CHECK după trigger).
- Dacă cele 5 orfane sunt încasări reale pentru facturi șterse: întrebare pentru user.
