import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../supabaseClient';
import { User } from '../types';

// Define the administrative roles as per the new requirement
const ADMIN_ROLES = ['SUPER_ADMIN_FEDERATIE', 'ADMIN_CLUB'];

interface AuthState {
  userDetails: User | null;
  roles: string[];
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

// Initial state for logout/reset
const initialState = {
    userDetails: null,
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
        
        // Handle login with either email or username
        const loginIdentifier = email.includes('@') ? { email } : { data: { user_name: email } };

        const { error: signInError } = await supabase.auth.signInWithPassword({
          ...loginIdentifier,
          password,
        });
        
        if (signInError) {
          set({ ...initialState, isLoading: false });
          throw signInError;
        }
        
        // After sign-in, onAuthStateChange will trigger, which calls initialize.
      },

      initialize: async () => {
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
        
        // Call the 'get_user_context' RPC function as requested.
        const { data: userContext, error: rpcError } = await supabase.rpc('get_user_context');

        if (rpcError || !userContext) {
            console.error("Error fetching user context:", rpcError?.message);
            await get().logout(); 
            return;
        }

        const userProfile: User = {
            ...userContext,
            cluburi: userContext.club_id ? { id: userContext.club_id, nume: userContext.club_nume } : null,
            roluri: (userContext.roles_list || []).map((r_name: string) => ({ id: '', nume: r_name as any })),
        };
        // Clean up properties that are not part of the User/Sportiv type
        delete (userProfile as any).club_nume;
        delete (userProfile as any).roles_list;

        const roles = userContext.roles_list || [];
        const isAdmin = roles.some((role: string) => ADMIN_ROLES.includes(role));
        
        set({ userDetails: userProfile, roles, isAdmin, isLoading: false });
      },
      
      logout: async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        localStorage.clear();
        sessionStorage.clear(); 
        set({ ...initialState, isLoading: false });
      },
    }),
    {
      name: 'phihau-auth-storage',
      storage: createJSONStorage(() => localStorage), 
    }
  )
);