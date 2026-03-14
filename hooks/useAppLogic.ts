import { useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { useNavigation } from '../contexts/NavigationContext';
import { useRoleManager } from '../hooks/useRoleManager';
import { useData } from '../contexts/DataContext';
import { View } from '../types';

export const useAppLogic = () => {
    const { showError } = useError();
    const dataProvider = useData();
    const { setActiveView } = useNavigation();
    
    const {
        session, currentUser, userRoles, activeRoleContext,
        loading, error, needsRoleSelection, clubs, grade,
        initializeAndFetchData
    } = dataProvider;

    const { switchRole, loading: isSwitchingRole } = useRoleManager(currentUser?.user_id || session?.user?.id);

    const activeRole = useMemo(() => activeRoleContext?.roluri?.nume || null, [activeRoleContext]);

    const canSwitchRoles = useMemo(() => {
        return !!(currentUser && userRoles && userRoles.length > 1);
    }, [currentUser, userRoles]);

    const handleLogout = useCallback(async () => {
        try {
            localStorage.removeItem('phi-hau-active-role-context-id');
            localStorage.removeItem('phi-hau-active-view');
            localStorage.removeItem('activeRole');
            if (supabase) await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/';
        }
    }, []);

    const handleSwitchRole = useCallback(async (targetContext: any) => {
        if (!targetContext?.id) {
            showError("Eroare la comutare", "Contextul selectat este invalid.");
            return;
        }
        await switchRole(targetContext.id);
    }, [switchRole, showError]);

    const handleSelectRole = useCallback(async (role: any) => {
        localStorage.setItem('activeRole', JSON.stringify(role));
        localStorage.setItem('phi-hau-active-role-context-id', JSON.stringify(role.id));
        if (role.club_id) {
            localStorage.setItem('phi-hau-global-club-filter', JSON.stringify(role.club_id));
        } else {
            localStorage.removeItem('phi-hau-global-club-filter');
        }
        window.location.reload();
    }, []);

    const effectiveNeedsRoleSelection = useMemo(() => {
        return needsRoleSelection || (session && !loading && !activeRole);
    }, [needsRoleSelection, session, loading, activeRole]);

    return {
        session,
        currentUser,
        userRoles,
        activeRoleContext,
        loading,
        error,
        activeRole,
        canSwitchRoles,
        isSwitchingRole,
        effectiveNeedsRoleSelection,
        clubs,
        grade,
        handleLogout,
        handleSwitchRole,
        handleSelectRole,
        initializeAndFetchData
    };
};
