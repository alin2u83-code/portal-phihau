import { SupabaseClient } from '@supabase/supabase-js';
import { User, Club } from '../types';

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
 * Gets the authenticated user and their profile from Supabase.
 * Handles cases where the profile might be missing due to RLS or other issues.
 * @param supabase The Supabase client instance.
 * @returns An object containing the user profile or an error.
 */
export const getAuthenticatedUser = async (supabase: SupabaseClient): Promise<{ user: User | null; error: any | null }> => {
    try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error("Supabase auth error:", authError.message);
            return { user: null, error: authError };
        }
        
        if (!authUser) {
            return { user: null, error: null };
        }

        const { data: userProfileData, error: profileError } = await supabase
            .from('sportivi')
            .select('*, cluburi(*), sportivi_roluri(roluri(id, nume))')
            .eq('user_id', authUser.id)
            .single();

        if (profileError) {
            console.error(
                `Eroare Supabase la preluarea profilului (cod: ${profileError.code}):`,
                profileError.message,
                `Detalii: ${profileError.details}`
            );

            if (profileError.code === 'PGRST116') { // "query returned no rows"
                console.warn("Profilul nu a fost găsit. Posibilă problemă RLS sau profil șters. Se returnează un profil de rezervă.");
                return { user: fallbackUser(authUser.email || 'unknown@user.com'), error: null };
            }

            return { user: null, error: profileError };
        }
        
        if (!userProfileData) {
            console.warn("Niciun profil de utilizator găsit pentru utilizatorul autentificat. Se returnează un profil de rezervă.");
            return { user: fallbackUser(authUser.email || 'unknown@user.com'), error: null };
        }
        
        const formattedProfile = {
            ...userProfileData,
            roluri: (userProfileData.sportivi_roluri || []).map((item: any) => item.roluri).filter(Boolean)
        };
        delete formattedProfile.sportivi_roluri;
        
        return { user: formattedProfile as User, error: null };

    } catch (err: any) {
        console.error("A apărut o eroare neașteptată în getAuthenticatedUser:", err.message);
        return { user: null, error: err };
    }
};
