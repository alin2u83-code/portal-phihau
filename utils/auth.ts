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
 * Fetches the complete user profile, including all role contexts, in a single query.
 * @param supabase The Supabase client instance.
 * @returns An object containing the user profile, an array of role contexts, or an error.
 */
export const fetchUserWithPermissions = async (supabase: SupabaseClient): Promise<{ user: User | null; roles: any[] | null; error: any | null }> => {
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
            .select(`
                *,
                cluburi(*),
                contexts:utilizator_roluri_multicont (
                    rol_denumire,
                    sportiv_id,
                    club_id,
                    is_primary,
                    club:cluburi(nume),
                    sportiv:sportivi!inner(nume, prenume)
                )
            `)
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

        const { contexts, ...profile } = userProfileData;
        const roleContexts = contexts || [];

        const { data: allRolesNomenclator, error: allRolesError } = await supabase.from('roluri').select('id, nume');
        if(allRolesError) {
            console.warn("Eroare la preluarea nomenclatorului de roluri:", allRolesError.message);
        }

        const mappedRoles = (roleContexts || []).map((mcr: any) => {
            const roleFromNomenclator = (allRolesNomenclator || []).find(r => r.nume === mcr.rol_denumire);
            return roleFromNomenclator ? { id: roleFromNomenclator.id, nume: roleFromNomenclator.nume as Rol['nume'] } : null;
        }).filter((r): r is Rol => r !== null);

        const uniqueRoles = Array.from(new Map(mappedRoles.map(item => [item.id, item])).values());

        const formattedProfile = {
            ...profile,
            roluri: uniqueRoles,
        };
        
        return { user: formattedProfile as User, roles: roleContexts, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;
