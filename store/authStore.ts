import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { User } from '../types';
import { getAuthenticatedUser } from '../utils/auth';

interface AuthContext {
  is_admin: boolean;
  roles: string[];
  primaryClubId: string | null;
}

interface AuthState {
  session: Session | null;
  authContext: AuthContext | null;
  userProfile: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (requiredRole: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  authContext: null,
  userProfile: null,
  isLoading: true,

  hasAccess: (requiredRole: string) => {
    const { authContext } = get();
    if (!authContext) return false;
    if (authContext.is_admin) return true;
    return authContext.roles.includes(requiredRole);
  },

  checkSession: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session) {
        // Fetch both context and full profile
        const { data: context, error: contextError } = await supabase.rpc('get_user_auth_context');
        if (contextError) throw contextError;
        
        const { user: profile, error: profileError } = await getAuthenticatedUser(supabase);
        if (profileError) throw profileError;

        set({ authContext: context, userProfile: profile });
      } else {
        set({ authContext: null, userProfile: null });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      set({ session: null, authContext: null, userProfile: null });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // The onAuthStateChange listener in App.tsx will trigger checkSession
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, authContext: null, userProfile: null });
    // Force clear all storage to prevent caching issues
    localStorage.clear();
    sessionStorage.clear();
    // Redirect happens via useEffect in App.tsx watching session state
  },
}));
