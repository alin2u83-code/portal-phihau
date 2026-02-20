import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, Role, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (currentUser: User) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch available roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('utilizator_roluri_multicont')
        .select('role_id, role_name')
        .eq('user_id', currentUser.id);

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          await fetchUserData(session.user);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('switch_user_role', {
        p_user_id: user.id,
        p_new_role: newRole,
      });

      if (error) throw error;

      // Refresh profile to get the new active_role
      await fetchUserData(user);
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, profile, roles, loading, switchRole, activeRole: profile?.active_role };
}
