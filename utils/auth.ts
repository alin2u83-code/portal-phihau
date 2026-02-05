import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Club, Rol } from '../types';

const fallbackUser = (email: string): User => ({
    id: 'GUEST_USER_ID',
    user_id: 'GUEST_AUTH_ID',
    nume: 'Profil',
    prenume: 'Incomplet',
    email: email,
    roluri: [],
    cluburi: { id: '00000000-0000-0000-0000-000000000000', nume: 'Nesetat' } as Club,
    data_nasterii: '1900-01-01',
    cnp: null,
    data_inscrierii: new Date().toISOString().split('T')[0],
    status: 'Inactiv',
    grupa_id: null,
    club_id: null,
    familie_id: null,
    tip_abonament_id: null,
    participa_vacanta: false,
    trebuie_schimbata_parola: false,
});

/**
 * Fetches the complete user profile using the `auth_profile_view`.
 * Includes a safety net for admin users without a `sportivi` record.
 * @param supabase The Supabase client instance.
 * @returns An object containing the user profile, an array of role contexts, or an error.
 */
export const fetchUserWithPermissions = async (supabase: SupabaseClient): Promise<{ user: User | null; roles: any[] | null; error: any | null }> => {
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
            return { user: null, roles: null, error: authError };
        }

        // Using 'auth_profile_view' as the single source of truth, per user request.
        const { data: contexts, error: viewError } = await supabase
            .from('auth_profile_view')
            .select('*')
            .eq('auth_user_id', authUser.id);
        
        if (viewError) {
            return { user: null, roles: null, error: { message: `Eroare la interogarea 'auth_profile_view': ${viewError.message}. Asigurați-vă că vederea există și este accesibilă.` } };
        }

        const roles = contexts || [];
        if (roles.length === 0) {
            return { user: null, roles: [], error: { message: "Contul dumneavoastră nu este asociat cu niciun profil sau rol. Vă rugăm contactați un administrator." } };
        }

        const primaryContext = roles.find(r => r.is_primary) || roles[0];
        
        let profile: User;
        
        // Case 1: The user has a full profile in the 'sportivi' table, linked by sportiv_id.
        if (primaryContext.sportiv_id && primaryContext.nume) {
            profile = {
                id: primaryContext.sportiv_id,
                user_id: primaryContext.auth_user_id,
                nume: primaryContext.nume,
                prenume: primaryContext.prenume,
                email: primaryContext.email,
                username: primaryContext.username,
                data_nasterii: primaryContext.data_nasterii,
                cnp: primaryContext.cnp,
                inaltime: primaryContext.inaltime,
                data_inscrierii: primaryContext.data_inscrierii,
                status: primaryContext.status,
                grupa_id: primaryContext.grupa_id,
                club_id: primaryContext.club_id,
                grad_actual_id: primaryContext.grad_actual_id,
                familie_id: primaryContext.familie_id,
                tip_abonament_id: primaryContext.tip_abonament_id,
                participa_vacanta: primaryContext.participa_vacanta,
                puncte_forte: primaryContext.puncte_forte,
                puncte_slabe: primaryContext.puncte_slabe,
                obiective: primaryContext.obiective,
                trebuie_schimbata_parola: primaryContext.trebuie_schimbata_parola,
                cluburi: { id: primaryContext.club_id, nume: primaryContext.club_nume },
                roluri: [], // Will be populated next
            };
        } 
        // Case 2 (Safety Net): User has admin roles but no 'sportivi' record.
        else if (roles.some(r => r.rol_denumire !== 'Sportiv')) {
            profile = {
                id: authUser.id, // Fallback to auth user id for uniqueness
                user_id: authUser.id,
                nume: authUser.email?.split('@')[0] || 'Admin',
                prenume: 'Utilizator',
                email: authUser.email,
                roluri: [],
                club_id: primaryContext.club_id,
                cluburi: { id: primaryContext.club_id, nume: primaryContext.club_nume },
                // Fill other required Sportiv fields with defaults
                data_nasterii: '1900-01-01', status: 'Activ', cnp: null, data_inscrierii: new Date().toISOString().split('T')[0], grupa_id: null, familie_id: null, tip_abonament_id: null, participa_vacanta: false, trebuie_schimbata_parola: false,
            };
        } else {
            return { user: null, roles: [], error: { message: "Profil de sportiv negăsit. Vă rugăm contactați un administrator." } };
        }

        // Populate `roluri` from all contexts. Assumes view has `rol_id` and `rol_denumire`.
        // FIX: Cast the result of the map/reduce operation to Rol[] to satisfy TypeScript's type checker.
        // The type inference was failing, resulting in `unknown[]` which is not assignable to `profile.roluri`.
        const uniqueRoles = [...new Map(roles.map(item => [item.rol_denumire, { id: item.rol_id, nume: item.rol_denumire }])).values()] as Rol[];
        profile.roluri = uniqueRoles;

        return { user: profile, roles: roles, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;