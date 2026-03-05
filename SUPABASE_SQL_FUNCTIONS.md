# Required Supabase SQL Functions

The following SQL functions (RPC) are required for the application to function correctly. Ensure they are defined in your Supabase project.

## 1. `finalizeaza_examen(p_sesiune_id UUID)`
Finalizes an exam session, updates student grades, and generates a federation invoice.
- **Source**: `fix_finalize_exam_function.sql`

## 2. `process_exam_row_v3(p_data JSONB)`
Processes a single row from a bulk exam import, creating or updating students and their exam results.
- **Source**: `supabase/migrations/20260304_process_exam_row_v3_fix.sql`

## 3. `generate_sportiv_code(p_an INTEGER, p_nume TEXT, p_prenume TEXT)`
Generates a unique athlete code based on the year of registration and their name.

## 4. `transfer_sportiv(p_sportiv_id UUID, p_new_club_id UUID)`
Transfers an athlete from one club to another.

## 5. `get_raport_prezenta_detaliat()`
Generates a detailed attendance report.

## 6. `delete_exam_registration(p_registration_id UUID)`
Deletes an exam registration and handles associated cleanup.

## 7. `switch_primary_context(p_context_id UUID)`
Switches the user's primary role/club context.

## 8. `genereaza_antrenamente_din_orar(p_zile_in_avans INTEGER)`
Generates training sessions based on the weekly schedule.

## 9. `adauga_sportiv_complet(p_data JSONB)`
Adds a new athlete with all associated details (profile, roles, etc.) in a single transaction.

## 10. `set_primary_context(p_context_id UUID)`
Sets the initial primary context for a new user.

## 11. `get_my_club_ids()`
Returns a UUID array of all club IDs where the current user has the 'INSTRUCTOR' role.
- **Source**: `supabase/migrations/20260305_get_my_club_ids_and_rls.sql`
