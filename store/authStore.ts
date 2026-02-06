import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { signInAndGetUserContext, checkSessionAndGetUserContext } from '../utils/auth';

interface AuthState {
  user: User | null;
  roles: string[];
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

// Roles that grant access to the admin area
const ADMIN_ROLES = ['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'INSTRUCTOR'];

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  roles: [],
  isAdmin: false,
  isLoading: true,

  login: async (email, password) => {
    const { user, roles, error } = await signInAndGetUserContext(email, password);
    if (error) throw error;

    if (user && roles) {
      const isAdmin = roles.some(role => ADMIN_ROLES.includes(role));
      set({ user, roles, isAdmin, isLoading: false });
    } else {
        set({ user: null, roles: [], isAdmin: false, isLoading: false });
        throw new Error("Datele de autentificare sunt invalide sau profilul nu a putut fi încărcat.");
    }
  },

  checkSession: async () => {
    set({ isLoading: true });
    const { user, roles, error } = await checkSessionAndGetUserContext();
    if (user && roles) {
        const isAdmin = roles.some(role => ADMIN_ROLES.includes(role));
        set({ user, roles, isAdmin, isLoading: false });
    } else {
        set({ user: null, roles: [], isAdmin: false, isLoading: false });
    }
  },
  
  logout: async () => {
    if (supabase) {
        await supabase.auth.signOut();
    }
    // Force clear all storage to prevent caching issues
    localStorage.clear();
    sessionStorage.clear();
    set({ user: null, roles: [], isAdmin: false, isLoading: false });
  },
}));
