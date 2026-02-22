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

        // Fetch all roles first to map rol_id
        const { data: allRolesNomenclator, error: allRolesError } = await supabase.from('roluri').select('id, nume');
        if(allRolesError) { console.warn("Eroare la preluarea nomenclatorului de roluri:", allRolesError.message); }

        // Step 1: Try to fetch the primary role context using maybeSingle()
        const { data: primaryContextData, error: primaryError } = await supabase
            .from('utilizator_roluri_multicont')
            .select(`
                id,
                rol_id,
                sportiv_id,
                club_id,
                is_primary,
                club:cluburi(nume),
                sportiv:sportiv_id(nume, prenume)
            `)
            .eq('is_primary', true)
            .maybeSingle();

        // If multiple rows returned, we must let the user choose
        if (primaryError && (primaryError.code === 'PGRST116' || primaryError.message.includes('multiple rows'))) {
            const { data: allContexts } = await supabase
                .from('utilizator_roluri_multicont')
                .select(`
                    id,
                    rol_id,
                    sportiv_id,
                    club_id,
                    is_primary,
                    club:cluburi(nume),
                    sportiv:sportiv_id(nume, prenume)
                `);
            
            const mappedRoles = allContexts?.map(rc => {
                const roleInfo = (allRolesNomenclator || []).find(r => r.id === rc.rol_id);
                return { ...rc, roluri: roleInfo ? { nume: roleInfo.nume } : null };
            }) || [];

            return { user: null, roles: mappedRoles, error: null };
        }

        if (primaryError) {
            return { user: null, roles: null, error: primaryError };
        }

        // If no primary context found, fetch all and let user choose
        if (!primaryContextData) {
            const { data: allContexts, error: allContextsError } = await supabase
                .from('utilizator_roluri_multicont')
                .select(`
                    id,
                    rol_id,
                    sportiv_id,
                    club_id,
                    is_primary,
                    club:cluburi(nume),
                    sportiv:sportiv_id(nume, prenume)
                `);
            
            if (allContextsError) return { user: null, roles: null, error: allContextsError };

            const mappedRoles = allContexts?.map(rc => {
                const roleInfo = (allRolesNomenclator || []).find(r => r.id === rc.rol_id);
                return { ...rc, roluri: roleInfo ? { nume: roleInfo.nume } : null };
            }) || [];

            if (mappedRoles.length === 0) {
                // Check if user has a bare profile
                const { data: bareProfile } = await supabase.from('sportivi').select('*, cluburi(*)').maybeSingle();
                if (bareProfile) {
                    return { user: { ...bareProfile, roluri: [] } as User, roles: [], error: null };
                }
                return { user: null, roles: null, error: new Error('Eroare: Contul de utilizator nu este legat de un profil de sportiv.') };
            }

            return { user: null, roles: mappedRoles, error: null };
        }

        // We have a primary context
        const primaryContext = {
            ...primaryContextData,
            roluri: (allRolesNomenclator || []).find(r => r.id === primaryContextData.rol_id) ? { nume: (allRolesNomenclator || []).find(r => r.id === primaryContextData.rol_id)?.nume } : null
        };

        // Fetch user profile for this context
        const { data: userProfileData, error: profileError } = await supabase
            .from('sportivi')
            .select('*, cluburi(*)')
            .eq('id', primaryContext.sportiv_id)
            .maybeSingle();

        if (profileError) return { user: null, roles: null, error: profileError };
        if (!userProfileData) return { user: null, roles: [primaryContext], error: new Error("Profilul asociat rolului primar nu a putut fi găsit.") };

        // Get all roles for the user to include in the profile object
        const { data: allContexts } = await supabase.from('utilizator_roluri_multicont').select('rol_id');
        const mappedRoles = (allContexts || []).map(rc => {
            const roleInfo = (allRolesNomenclator || []).find(r => r.id === rc.rol_id);
            return roleInfo ? { id: roleInfo.id, nume: roleInfo.nume as Rol['nume'] } : null;
        }).filter((r): r is Rol => r !== null);
        
        const uniqueRoles = Array.from(new Map(mappedRoles.map(item => [item.id, item])).values());

        const formattedProfile = {
            ...userProfileData,
            roluri: uniqueRoles,
        };

        return { user: formattedProfile as User, roles: [primaryContext], error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;
