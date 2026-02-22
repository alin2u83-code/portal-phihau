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
        // The query relies on RLS to scope results to the current user (user_id = auth.uid()).
        const { data: roleContexts, error: contextsError } = await supabase
            .from('utilizator_roluri_multicont')
            .select(`
                id,
                rol_denumire,
                sportiv_id,
                club_id,
                is_primary,
                club:cluburi(nume),
                sportiv:sportiv_id(nume, prenume)
            `);
        
        if (contextsError) {
            return { user: null, roles: null, error: contextsError };
        }

        if (!roleContexts || roleContexts.length === 0) {
            // This fallback also relies on RLS (`user_id = auth.uid()`) to fetch the user's own profile.
            const { data: bareProfile, error: bareProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').maybeSingle();
            
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

        // Step 2: Determine the primary context with explicit priority logic.
        // This ensures that users with administrative roles default to the correct interface.
        let primaryContext;

        const superAdminContext = roleContexts.find(r => r.rol_denumire === 'SUPER_ADMIN_FEDERATIE');
        const adminClubContext = roleContexts.find(r => r.rol_denumire === 'ADMIN_CLUB');
        const explicitPrimaryContext = roleContexts.find(r => r.is_primary);

        if (superAdminContext) {
            primaryContext = superAdminContext;
        } else if (adminClubContext) {
            primaryContext = adminClubContext;
        } else if (explicitPrimaryContext) {
            primaryContext = explicitPrimaryContext;
        } else if (roleContexts.length > 0) {
            // LOGICĂ DE FALLBACK: Dacă niciun rol nu este marcat ca `is_primary` (inclusiv cazul în care câmpul este null),
            // se alege automat rolul cu cele mai înalte privilegii dintr-o ierarhie predefinită,
            // asigurând o experiență de utilizare consistentă și prevenind blocajele la autentificare.
            const roleHierarchy: string[] = ['SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SPORTIV'];
            const sortedContexts = [...roleContexts].sort((a, b) => 
                roleHierarchy.indexOf(a.rol_denumire) - roleHierarchy.indexOf(b.rol_denumire)
            );
            primaryContext = sortedContexts[0];
        }
        
        // Step 3: Robustly fetch the user profile data.
        let primarySportivId = primaryContext?.sportiv_id;
        let userProfileData: any;

        if (!primarySportivId) {
            // This case handles data corruption where a role context has no sportiv_id.
            // We must load the user's own profile as the only option, relying on RLS.
            const { data: ownProfile, error: ownProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').maybeSingle();

            if (ownProfileError) {
                return { user: null, roles: null, error: ownProfileError };
            }
            if (!ownProfile) {
                return { user: fallbackUser(authUser.email || 'unknown@user.com'), roles: roleContexts, error: new Error("Contul are roluri definite, dar niciun profil de sportiv nu este direct asociat (user_id).") };
            }
            userProfileData = ownProfile;
        } else {
            // Standard Path: Attempt to load the profile corresponding to the primary role.
            const { data: primaryProfile, error: primaryProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('id', primarySportivId).maybeSingle();

            if (primaryProfileError) {
                // A non-RLS error occurred (e.g., network). This is fatal.
                return { user: null, roles: null, error: primaryProfileError };
            }

            if (primaryProfile) {
                // Success! The active user can see the primary context's profile.
                userProfileData = primaryProfile;
            } else {
                // Fallback: The primary context profile was not visible (likely RLS).
                // Load the user's "own" profile instead to prevent a crash, relying on RLS.
                console.warn(`[Auth] Primary context profile (ID: ${primarySportivId}) was not fetchable. Falling back to user's own profile.`);
                const { data: ownProfile, error: ownProfileError } = await supabase.from('sportivi').select('*, cluburi(*)').maybeSingle();
                
                if (ownProfileError) {
                    return { user: null, roles: null, error: ownProfileError };
                }
                if (!ownProfile) {
                    // Critical failure: User has roles but no accessible profile at all.
                    return { user: fallbackUser(authUser.email || 'unknown@user.com'), roles: roleContexts, error: new Error("Nu s-a putut încărca niciun profil valid (nici cel primar, nici cel propriu).") };
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
        };

        return { user: formattedProfile as User, roles: roleContexts, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;
