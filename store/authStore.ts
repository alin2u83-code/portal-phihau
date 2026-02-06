import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../supabaseClient';
import { User } from '../types';

// Define the administrative roles
const ADMIN_ROLES = ['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'INSTRUCTOR'];

interface AuthState {
  user: User | null;
  roles: string[];
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

// Initial state for logout/reset
const initialState = {
    user: null,
    roles: [],
    isAdmin: false,
    isLoading: true,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email, password) => {
        if (!supabase) throw new Error("Client Supabase neconfigurat.");
        set({ isLoading: true });
        
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          set({ ...initialState, isLoading: false });
          throw signInError;
        }
        
        // After sign-in, onAuthStateChange will trigger, which calls checkSession.
        // checkSession will fetch context and set the final state.
      },

      checkSession: async () => {
        if (!supabase) {
            set({ ...initialState, isLoading: false });
            return;
        }

        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          set({ ...initialState, isLoading: false });
          return;
        }

        const { data: accessData, error: accessError } = await supabase
            .from('v_user_access')
            .select('*')
            .single();

        if (accessError || !accessData) {
            set({ ...initialState, isLoading: false });
            return;
        }

        const userProfile: User = {
            ...accessData,
            cluburi: accessData.club_id ? { id: accessData.club_id, nume: accessData.club_nume } : null,
            roluri: (accessData.roles_list || []).map((r_name: string) => ({ id: '', nume: r_name as any })),
        };
        delete (userProfile as any).club_nume;
        delete (userProfile as any).roles_list;

        const roles = accessData.roles_list || [];
        const isAdmin = roles.some((role: string) => ADMIN_ROLES.includes(role));
        set({ user: userProfile, roles, isAdmin, isLoading: false });
      },
      
      logout: async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        // Explicitly clear all storage for a clean slate
        localStorage.clear();
        sessionStorage.clear(); 
        // Reset state to initial values
        set({ ...initialState, isLoading: false });
      },
    }),
    {
      name: 'phihau-auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
