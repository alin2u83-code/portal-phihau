---
quick_id: 261105-gax
description: Faza 36 follow-up (familie, inchidere inscrieri, plafon cereri, login neutru)
mode: inline (gsd-executor cu worktree esueaza in acest mediu; executorul nu are DDL)
---

# Plan

Decizii utilizator 5.11.2026: inchiderea = oricare dintre status/termen (competitie_deschisa_inscrieri);
dupa inchidere doar federatia modifica/sterge (inclusiv retragerea); randurile vechi inter-club raman neatinse.

1. Migrare `supabase/migrations/20261106e_faza36_followup.sql` (aplicata live prin MCP, `git add -f`):
   - `prezenta_familie_sel` pe `prezenta_antrenament` (parinte SPORTIV vede prezentele fratilor).
   - Gate de inchidere la UPDATE/DELETE pe inscrieri_competitie / echipe_competitie / echipa_sportivi (restrictive, `is_super_admin` exceptat).
   - Trigger: UPDATE nu poate muta `sportiv_id` pe un sportiv din alt club (inscrieri + echipa_sportivi).
   - `trimite_cerere_acces`: plafon per club (10) + global (200) cu advisory lock; `deja_trimisa` -> `ok`.
   - RPC `sterge_cereri_in_asteptare(p_competitie)` doar pentru federatie.
2. UI: `CereriAccesAdmin.tsx` buton "Sterge cererile in asteptare"; `LoginOtp.tsx` mesaj neutru.
3. Teste: extinse in tests/rls_acces_extern_faza36.ts, acces_extern_fundatie_faza36.ts, acces_extern_aprobare_faza36.ts.
4. Review separat pe diff. FARA push.
