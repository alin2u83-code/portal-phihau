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
 * Gets the authenticated user, their profile, and all their available roles/contexts from Supabase.
 * @param supabase The Supabase client instance.
 * @returns An object containing the user profile, an array of role contexts, or an error.
 */
export const getAuthenticatedUserWithRoles = async (supabase: SupabaseClient): Promise<{ user: User | null; roles: any[] | null; error: any | null }> => {
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error("Supabase auth error:", authError.message);
            return { user: null, roles: null, error: authError };
        }
        
        if (!authUser) {
            return { user: null, roles: null, error: null };
        }

        const { data: userProfileData, error: profileError } = await supabase
            .from('sportivi')
            .select('*, cluburi(*)')
            .eq('user_id', authUser.id)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') {
                return { user: fallbackUser(authUser.email || 'unknown@user.com'), roles: [], error: null };
            }
            return { user: null, roles: null, error: profileError };
        }
        
        if (!userProfileData) {
            return { user: fallbackUser(authUser.email || 'unknown@user.com'), roles: [], error: null };
        }
        
        const { data: rolesData, error: rolesError } = await supabase
            .from('utilizator_roluri_multicont')
            .select(`
                rol_denumire,
                sportiv_id,
                club_id,
                club:cluburi(nume),
                sportiv:sportivi(nume, prenume)
            `)
            .eq('user_id', authUser.id);
        
        if (rolesError) {
            console.error("Eroare la preluarea rolurilor din utilizator_roluri_multicont:", rolesError.message);
            return { user: userProfileData as User, roles: [], error: rolesError };
        }

        const { data: allRolesNomenclator, error: allRolesError } = await supabase.from('roluri').select('id, nume');
        if(allRolesError) {
            console.error("Eroare la preluarea nomenclatorului de roluri:", allRolesError.message);
        }

        const mappedRoles = (rolesData || []).map(mcr => {
            const roleFromNomenclator = (allRolesNomenclator || []).find(r => r.nume === mcr.rol_denumire);
            return roleFromNomenclator ? { id: roleFromNomenclator.id, nume: roleFromNomenclator.nume as Rol['nume'] } : null;
        }).filter((r): r is Rol => r !== null);


        const formattedProfile = {
            ...userProfileData,
            roluri: mappedRoles,
        };
        
        return { user: formattedProfile as User, roles: rolesData || [], error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în getAuthenticatedUserWithRoles:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = getAuthenticatedUserWithRoles;
