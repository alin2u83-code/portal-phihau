import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Rol } from '../types';

export const useRoleManager = (userId: string | undefined) => {
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const fetchRoles = useCallback(async () => {
        if (!userId || !supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('utilizator_roluri_multicont')
                .select(`
                    id,
                    rol_id,
                    sportiv_id,
                    club_id,
                    is_primary,
                    club:cluburi(nume),
                    sportiv:sportiv_id(nume, prenume),
                    roluri(nume)
                `);

            if (error) {
                showError("Eroare la încărcarea rolurilor", error.message);
            } else {
                setRoles(data || []);
            }
        } catch (err: any) {
            showError("Eroare neașteptată", err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, showError]);

    useEffect(() => {
        if (userId) {
            fetchRoles();
        }
    }, [userId, fetchRoles]);

    const switchRole = useCallback(async (roleId: string) => {
        if (!supabase) return;
        
        try {
            // Save to localStorage as requested
            localStorage.setItem('phi_hau_selected_role_id', roleId);
            
            const selectedRole = roles.find(r => r.id === roleId);
            if (selectedRole?.sportiv_id) {
                // Redirect to SportivDashboard by setting the active view in localStorage
                localStorage.setItem('phi-hau-active-view', 'my-portal');
            }

            // Update DB primary context using the existing RPC
            const { error } = await supabase.rpc('switch_primary_context', { p_target_context_id: roleId });
            
            if (error) {
                console.error("Eroare RPC switch_primary_context:", error.message);
                // Even if RPC fails, we do the hard refresh as requested
            }

            // Hard refresh of the application context
            window.location.reload();
        } catch (err: any) {
            showError("Eroare la schimbarea rolului", err.message);
        }
    }, [roles, showError]);

    return { roles, loading, switchRole, refreshRoles: fetchRoles };
};
