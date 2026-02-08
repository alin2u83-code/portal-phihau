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

        // Step 1: Fetch all role contexts for the authenticated user.
        // The join to `sportivi` is now an outer join (no `!inner`) to prevent RLS from blocking the entire query.
        const { data: roleContexts, error: contextsError } = await supabase
            .from('utilizator_roluri_multicont')
            .select(`
                rol_denumire,
                sportiv_id,
                club_id,
                is_primary,
                club:cluburi(nume),
                sportiv:sportivi(nume, prenume)
            `)
            .eq('user_id', authUser.id);
        
        if (contextsError) {
            return { user: null, roles: null, error: contextsError };
        }

        if (!roleContexts || roleContexts.length === 0) {
            const { data: bareProfile, error: bareProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('user_id', authUser.id).maybeSingle();
            
            if (bareProfileError) {
                return { user: null, roles: null, error: bareProfileError };
            }

            if (bareProfile) {
                return { user: { ...bareProfile, roluri: [] } as User, roles: [], error: null };
            }
            
            // CRITICAL ERROR: The user is authenticated, but no sportivi record is linked to them.
            const customError = new Error('Contul de utilizator nu este legat de un profil de sportiv. Contactați administratorul Phi Hau.');
            return { user: null, roles: null, error: customError };
        }

        // Step 2: Determine the primary context.
        let primaryContext = roleContexts.find(r => r.is_primary);
        if (!primaryContext) {
            const roleOrder: Rol['nume'][] = ['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'Instructor', 'Sportiv'];
            const sortedRoles = [...roleContexts].sort((a, b) => roleOrder.indexOf(a.rol_denumire) - roleOrder.indexOf(b.rol_denumire));
            primaryContext = sortedRoles[0];
        }
        
        // Step 3: Robustly fetch the user profile data.
        let primarySportivId = primaryContext?.sportiv_id;
        let userProfileData: any;

        if (!primarySportivId) {
            // This case handles a role context with a null sportiv_id.
            const primaryRoleName = primaryContext?.rol_denumire;
        
            // Check if the user is an admin type who can operate without a specific sportiv profile.
            if (primaryRoleName === 'SUPER_ADMIN_FEDERATIE' || primaryRoleName === 'Admin Club' || primaryRoleName === 'Admin') {
                console.warn(`[Auth] Admin user ${authUser.email} is operating without a sportiv_id. Using a fallback profile.`);
                // Create a minimal, temporary user profile object for these admin roles.
                userProfileData = {
                    id: 'ADMIN_FALLBACK_PROFILE', // This is a placeholder, not a real DB ID.
                    user_id: authUser.id,
                    nume: primaryContext.sportiv?.nume || 'Admin',
                    prenume: primaryContext.sportiv?.prenume || 'System',
                    email: authUser.email,
                    club_id: primaryContext.club_id,
                    cluburi: primaryContext.club,
                    data_nasterii: '1900-01-01',
                    status: 'Activ',
                    data_inscrierii: new Date().toISOString().split('T')[0],
                    cnp: null,
                    grupa_id: null,
                    familie_id: null,
                    tip_abonament_id: null,
                    participa_vacanta: false,
                    trebuie_schimbata_parola: false,
                };
            } else {
                // For other roles (like 'Sportiv'), a linked sportiv profile is mandatory.
                const { data: ownProfile, error: ownProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('user_id', authUser.id).maybeSingle();
                
                if (ownProfileError) {
                    return { user: null, roles: null, error: ownProfileError };
                }
                
                if (!ownProfile) {
                    // If still no profile is found, it's a critical error for a non-admin user.
                    const customError = new Error('Contul nu este legat de un profil de sportiv.');
                    return { user: null, roles: null, error: customError };
                }
                
                userProfileData = ownProfile;
            }
        } else {
            // Standard Path: Attempt to load the profile corresponding to the primary role.
            const { data: primaryProfile, error: primaryProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('id', primarySportivId).maybeSingle();

            if (primaryProfileError) {
                return { user: null, roles: null, error: primaryProfileError };
            }

            if (primaryProfile) {
                userProfileData = primaryProfile;
            } else {
                // Fallback: The primary context profile was not visible (likely RLS).
                console.warn(`[Auth] Primary context profile (ID: ${primarySportivId}) was not fetchable. Falling back to user's own profile.`);
                const { data: ownProfile, error: ownProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('user_id', authUser.id).maybeSingle();
                
                if (ownProfileError) {
                    return { user: null, roles: null, error: ownProfileError };
                }
                if (!ownProfile) {
                    const customError = new Error("Nu s-a putut încărca niciun profil valid (nici cel primar, nici cel propriu).");
                    return { user: fallbackUser(authUser.email || 'unknown@user.com'), roles: roleContexts, error: customError };
                }
                userProfileData = ownProfile;
            }
        }
        
        // Step 4: Combine data. Get all unique roles from all contexts.
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
            rol_activ_context: primaryContext.rol_denumire,
            // Ensure the user object's club_id reflects the active context
            club_id: primaryContext.club_id
        };

        return { user: formattedProfile as User, roles: roleContexts, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;