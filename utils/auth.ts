import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Club, Rol } from '../types';

/**
 * Fetches the complete user profile using the `auth_profile_view`.
 * This view should be the single source of truth for all user contexts.
 * The function also constructs a comprehensive User profile object based on the primary context.
 * @param supabase The Supabase client instance.
 * @returns An object containing the user profile, an array of all role contexts, or an error.
 */
export const fetchUserWithPermissions = async (supabase: SupabaseClient): Promise<{ user: User | null; roles: any[] | null; error: any | null }> => {
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
            return { user: null, roles: null, error: authError };
        }

        // Use 'auth_profile_view' as the single source of truth.
        const { data: contexts, error: viewError } = await supabase
            .from('auth_profile_view')
            .select('*')
            .eq('auth_user_id', authUser.id);
        
        if (viewError) {
            console.warn("DEBUG [auth.ts]: A apărut o eroare la interogarea 'auth_profile_view', posibil din cauza RLS/recursivitate. Se construiește un profil de fallback.", viewError.message);
            
            // Create a minimal fallback profile to prevent app crash
            const fallbackProfile: User = {
                id: authUser.id,
                user_id: authUser.id,
                nume: authUser.email?.split('@')[0] || 'Utilizator',
                prenume: 'Eroare',
                email: authUser.email,
                rol_activ_context: 'Sportiv', // Safest default
                roluri: [{ id: 'fallback-role-id', nume: 'Sportiv' }],
                club_id: null,
                cluburi: null,
                data_nasterii: '1900-01-01',
                status: 'Activ',
                cnp: null,
                data_inscrierii: new Date().toISOString().split('T')[0],
                grupa_id: null,
                familie_id: null,
                tip_abonament_id: null,
                participa_vacanta: false,
                trebuie_schimbata_parola: false,
            };

            return { 
                user: fallbackProfile, 
                roles: [], // No contexts available
                error: { message: "Nu am putut încărca complet profilul. Unele funcționalități pot fi limitate." } 
            };
        }

        const roles = contexts || [];
        console.log("DEBUG [auth.ts]: Data primită de la auth_profile_view:", contexts);

        if (roles.length === 0) {
            // FALLBACK FOR MASTER ADMIN IF RLS HIDES THEIR PROFILE
            if (authUser && authUser.email === 'alin2u83@gmail.com') {
                console.warn("DEBUG [auth.ts]: Fallback de urgență activat pentru alin2u83@gmail.com. Se forțează contextul 'Admin Club'.");
                const forcedClubId = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // Phi Hau Iași ID
                const adminClubRoleId = '18f77e02-f38e-4bb9-99e4-f508aebfd10e'; // Admin Club Role ID

                const mockAdminClubRole = { id: adminClubRoleId, nume: 'Admin Club' as const };
                
                const profile: User = {
                    id: authUser.id,
                    user_id: authUser.id,
                    nume: 'ADMIN',
                    prenume: 'MASTER',
                    email: authUser.email,
                    rol_activ_context: 'Admin Club',
                    roluri: [mockAdminClubRole],
                    club_id: forcedClubId,
                    cluburi: { id: forcedClubId, nume: 'Phi Hau Iași' },
                    data_nasterii: '1900-01-01', 
                    status: 'Activ', 
                    cnp: null, 
                    data_inscrierii: new Date().toISOString().split('T')[0], 
                    grupa_id: null, 
                    familie_id: null, 
                    tip_abonament_id: null, 
                    participa_vacanta: false, 
                    trebuie_schimbata_parola: false,
                };

                const mockContext = {
                    auth_user_id: authUser.id,
                    sportiv_id: authUser.id,
                    rol_denumire: 'Admin Club',
                    rol_id: adminClubRoleId,
                    club_id: forcedClubId,
                    club_nume: 'Phi Hau Iași',
                    is_primary: true,
                    nume: 'ADMIN',
                    prenume: 'MASTER',
                    email: authUser.email,
                };
                
                return { user: profile, roles: [mockContext], error: null };
            }
            
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
                rol_activ_context: primaryContext.rol_denumire, // Adăugat pentru a centraliza rolul activ
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
                rol_activ_context: primaryContext.rol_denumire, // Adăugat pentru a centraliza rolul activ
                roluri: [],
                club_id: primaryContext.club_id,
                cluburi: { id: primaryContext.club_id, nume: primaryContext.club_nume },
                // Fill other required Sportiv fields with defaults
                data_nasterii: '1900-01-01', status: 'Activ', cnp: null, data_inscrierii: new Date().toISOString().split('T')[0], grupa_id: null, familie_id: null, tip_abonament_id: null, participa_vacanta: false, trebuie_schimbata_parola: false,
            };
        } else {
            return { user: null, roles: [], error: { message: "Profil de sportiv negăsit. Vă rugăm contactați un administrator." } };
        }

        // Populate `roluri` from all contexts in a type-safe way.
        const validRoleNames: Array<Rol['nume']> = ['Sportiv', 'Instructor', 'Admin', 'SUPER_ADMIN_FEDERATIE', 'Admin Club'];
        const uniqueRolesMap = new Map<Rol['nume'], Rol>();
        
        roles.forEach(item => {
            if (validRoleNames.includes(item.rol_denumire) && !uniqueRolesMap.has(item.rol_denumire)) {
                uniqueRolesMap.set(item.rol_denumire, { id: item.rol_id, nume: item.rol_denumire });
            }
        });

        profile.roluri = Array.from(uniqueRolesMap.values());

        return { user: profile, roles: roles, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în fetchUserWithPermissions:", err.message);
        return { user: null, roles: null, error: err };
    }
};

export const getAuthenticatedUser = fetchUserWithPermissions;
