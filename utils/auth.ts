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
 */
export const fetchUserWithPermissions = async (supabase: SupabaseClient): Promise<{ user: User | null; roles: any[] | null; error: any | null }> => {
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error("Supabase auth error:", authError.message);
            return { user: null, roles: null, error: authError };
        }
        
        if (!authUser) {
            console.log('No authenticated user found.');
            return { user: null, roles: null, error: null };
        }

        // Fetch all roles first to map rol_id (Nomenclator)
        const { data: allRolesNomenclator, error: allRolesError } = await supabase.from('roluri').select('id, nume');
        if(allRolesError) { console.warn("Eroare la preluarea nomenclatorului de roluri:", allRolesError.message); }

        const activeRoleContextId = localStorage.getItem('phi-hau-active-role-context-id');

        let initialContextData: any = null;
        let contextError: any = null;

        // Pasul 1: Încercăm contextul activ din localStorage SAU contextul Primary
        // Adăugat filtrarea .eq('user_id', authUser.id) pentru siguranță RLS
        if (activeRoleContextId) {
            const { data, error } = await supabase
                .from('vedere_utilizator_roluri_completa')
                .select(`
                    id, rol_id, sportiv_id, club_id, is_primary,
                    club:cluburi(nume),
                    sportiv:sportiv_id(nume, prenume)
                `)
                .eq('id', activeRoleContextId)
                .eq('user_id', authUser.id)
                .maybeSingle();
            initialContextData = data;
            contextError = error;
        }

        if (!initialContextData) {
            const { data, error } = await supabase
                .from('vedere_utilizator_roluri_completa')
                .select(`
                    id, rol_id, sportiv_id, club_id, is_primary,
                    club:cluburi(nume),
                    sportiv:sportiv_id(nume, prenume)
                `)
                .eq('is_primary', true)
                .eq('user_id', authUser.id)
                .maybeSingle();
            initialContextData = data;
            contextError = error;
        }

        // Tratare cazuri multiple sau erori
        if (contextError || !initialContextData) {
            const { data: allContexts, error: fetchAllError } = await supabase
                .from('vedere_utilizator_roluri_completa')
                .select(`
                    id, rol_id, sportiv_id, club_id, is_primary,
                    club:cluburi(nume),
                    sportiv:sportiv_id(nume, prenume)
                `)
                .eq('user_id', authUser.id);
            
            if (fetchAllError) return { user: null, roles: null, error: fetchAllError };

            const mappedRoles = allContexts?.map(rc => {
                const roleInfo = (allRolesNomenclator || []).find(r => r.id === rc.rol_id);
                return { ...rc, roluri: roleInfo ? { nume: roleInfo.nume } : null };
            }) || [];

            if (mappedRoles.length === 0) {
                const { data: bareProfile } = await supabase.from('sportivi').select('*, cluburi(*)').eq('user_id', authUser.id).maybeSingle();
                if (bareProfile) {
                    return { user: { ...bareProfile, roluri: [] } as User, roles: [], error: null };
                }
                return { user: null, roles: null, error: new Error('Eroare: Contul nu este legat de un profil de sportiv.') };
            }

            return { user: null, roles: mappedRoles, error: null };
        }

        // Mapăm rolul pentru contextul activ găsit
        const roleInfoActive = (allRolesNomenclator || []).find(r => r.id === initialContextData.rol_id);
        const activeContext = {
            ...initialContextData,
            roluri: roleInfoActive ? { nume: roleInfoActive.nume } : null
        };

        // Fetch user profile pentru acest context
        const { data: userProfileData, error: profileError } = await supabase
            .from('sportivi')
            .select('*, cluburi(*)')
            .eq('id', activeContext.sportiv_id)
            .maybeSingle();

        if (profileError) return { user: null, roles: null, error: profileError };
        if (!userProfileData) return { user: null, roles: [activeContext], error: new Error("Profilul nu a putut fi găsit.") };

        // Colectăm toate rolurile unice ale utilizatorului pentru obiectul User
        const { data: userContexts } = await supabase
            .from('vedere_utilizator_roluri_completa')
            .select('rol_id')
            .eq('user_id', authUser.id);

        const mappedRolesForUser = (userContexts || []).map(rc => {
            const roleInfo = (allRolesNomenclator || []).find(r => r.id === rc.rol_id);
            return roleInfo ? { id: roleInfo.id, nume: roleInfo.nume as Rol['nume'] } : null;
        }).filter((r): r is Rol => r !== null);
        
        // Eliminare duplicate roluri
        const uniqueRoles = Array.from(new Map(mappedRolesForUser.map(item => [item.id, item])).values());

        const formattedProfile = {
            ...userProfileData,
            roluri: uniqueRoles,
        };

        return { user: formattedProfile as User, roles: [activeContext], error: null };

    } catch (err: any) {
        console.error("Eroare neașteptată:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;