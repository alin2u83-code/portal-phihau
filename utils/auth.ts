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

        // Step 1: Fetch all role contexts for the authenticated user
        const { data: roleContexts, error: contextsError } = await supabase
            .from('utilizator_roluri_multicont')
            .select(`
                rol_denumire,
                sportiv_id,
                club_id,
                is_primary,
                club:cluburi(nume),
                sportiv:sportivi!inner(nume, prenume)
            `)
            .eq('user_id', authUser.id);
        
        if (contextsError) {
            return { user: null, roles: null, error: contextsError };
        }

        if (!roleContexts || roleContexts.length === 0) {
            const { data: bareProfile, error: bareProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('user_id', authUser.id).maybeSingle();
            if (bareProfile && !bareProfileError) {
                // User has a profile but no roles assigned in the multi-context table.
                return { user: { ...bareProfile, roluri: [] } as User, roles: [], error: null };
            }
            // If no profile at all, return a fallback to avoid crashing, error will be handled upstream.
            return { user: fallbackUser(authUser.email || 'unknown@user.com'), roles: [], error: null };
        }

        // Step 2: Determine the primary context and its sportiv_id
        let primaryContext = roleContexts.find(r => r.is_primary);
        if (!primaryContext) {
            const roleOrder: Rol['nume'][] = ['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'Instructor', 'Sportiv'];
            roleContexts.sort((a, b) => roleOrder.indexOf(a.rol_denumire) - roleOrder.indexOf(b.rol_denumire));
            primaryContext = roleContexts[0];
        }
        
        let primarySportivId = primaryContext?.sportiv_id;
        let userProfileData: any;

        if (!primarySportivId) {
            // FALLBACK: Role context exists but has a null sportiv_id. Try to find profile by user_id.
            const { data: fallbackProfile, error: fallbackError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('user_id', authUser.id).maybeSingle();
            if (fallbackError || !fallbackProfile) {
                 return { user: null, roles: null, error: new Error("Contul are roluri definite, dar niciun profil de sportiv asociat. Contactați administratorul.") };
            }
            userProfileData = fallbackProfile;
        } else {
            // STANDARD PATH: Fetch the full primary profile using sportiv_id from the primary context
            const { data, error: profileError } = await supabase
                .from('sportivi')
                .select('*, cluburi(*)')
                .eq('id', primarySportivId)
                .single();
            if (profileError) { return { user: null, roles: null, error: profileError }; }
            userProfileData = data;
        }
        
        // Step 3: Combine data. Get all unique roles from all contexts.
        const { data: allRolesNomenclator, error: allRolesError } = await supabase.from('roluri').select('id, nume');
        if(allRolesError) { console.warn("Eroare la preluarea nomenclatorului de roluri:", allRolesError.message); }

        const mappedRoles = (roleContexts || []).map((mcr: any) => {
            const roleFromNomenclator = (allRolesNomenclator || []).find(r => r.nume === mcr.rol_denumire);
            return roleFromNomenclator ? { id: roleFromNomenclator.id, nume: roleFromNomenclator.nume as Rol['nume'] } : null;
        }).filter((r): r is Rol => r !== null);
        
        const uniqueRoles = Array.from(new Map(mappedRoles.map(item => [item.id, item])).values());
        
        const formattedProfile = {
            ...userProfileData,
            roluri: uniqueRoles,
        };

        return { user: formattedProfile as User, roles: roleContexts, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;
