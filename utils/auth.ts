import { supabase } from './supabaseClient';
import { AuthError, User as AuthUser } from '@supabase/supabase-js';
import { User } from '../types';

async function fetchUserContext(authUser: AuthUser): Promise<{ user: User, roles: string[], error: null } | { user: null, roles: null, error: Error }> {
    if (!supabase) return { user: null, roles: null, error: new Error("Client Supabase neconfigurat.") };
    
    // Fetch user profile from 'sportivi' table
    const { data: profile, error: profileError } = await supabase
        .from('sportivi')
        .select('*, cluburi(*)')
        .eq('user_id', authUser.id)
        .single();
    
    if (profileError) return { user: null, roles: null, error: new Error(`Profilul de sportiv nu a putut fi încărcat: ${profileError.message}`) };
    if (!profile) return { user: null, roles: null, error: new Error("Profilul de sportiv nu a fost găsit pentru acest cont.") };

    // Fetch all roles from 'utilizator_roluri_multicont'
    const { data: rolesData, error: rolesError } = await supabase
        .from('utilizator_roluri_multicont')
        .select('rol_denumire')
        .eq('user_id', authUser.id);

    if (rolesError) return { user: null, roles: null, error: new Error(`Rolurile nu au putut fi încărcate: ${rolesError.message}`) };
    
    const roles: string[] = rolesData ? rolesData.map(r => r.rol_denumire) : [];
    
    // Add roles to the profile object to fit the User type
    const finalProfile: User = {
        ...profile,
        roluri: roles.map(r_name => ({ id: '', nume: r_name as any }))
    };

    return { user: finalProfile, roles, error: null };
}

// FIX: Changed parameter name from 'pass' to 'password' to match its usage.
export const signInAndGetUserContext = async (email: string, password: string): Promise<{ user: User; roles: string[]; error: null } | { user: null; roles: null; error: AuthError | Error }> => {
    if (!supabase) return { user: null, roles: null, error: new Error("Client Supabase neconfigurat.") };
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { user: null, roles: null, error: signInError };
    if (!signInData.user) return { user: null, roles: null, error: new Error("Autentificare eșuată, utilizatorul nu a fost găsit.") };

    return fetchUserContext(signInData.user);
};

export const checkSessionAndGetUserContext = async (): Promise<{ user: User; roles: string[]; error: null } | { user: null; roles: null; error: Error }> => {
    if (!supabase) return { user: null, roles: null, error: new Error("Client Supabase neconfigurat.") };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { user: null, roles: null, error: new Error("Nicio sesiune activă.") };
    
    return fetchUserContext(session.user);
};
