import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Rol } from '../types';
import { ShieldCheckIcon, UsersIcon, UserCircleIcon } from '../components/icons';

export const getRoleDisplayName = (role: any): string => {
    switch(role.roluri?.nume) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'ADMIN': return 'Admin General';
        case 'ADMIN_CLUB': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'INSTRUCTOR': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'SPORTIV': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.roluri?.nume;
    }
};

export const getRoleIcon = (roleName: Rol['nume']): React.ElementType => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'ADMIN':
        case 'ADMIN_CLUB':
            return ShieldCheckIcon;
        case 'INSTRUCTOR':
            return UsersIcon;
        case 'SPORTIV':
            return UserCircleIcon;
        default:
            return UsersIcon;
    }
};

export const useUserRoles = (userId: string | undefined) => {
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [activeRoleContext, setActiveRoleContext] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

    const fetchUserRoles = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data: roles, error: rolesError } = await supabase
                .from('utilizator_roluri_multicont')
                .select(`id, rol_id, sportiv_id, club_id, is_primary, rol_denumire, roluri:rol_id(nume), club:club_id(nume), sportiv:sportiv_id(*)`)
                .eq('user_id', userId);

            if (rolesError) throw rolesError;

            if (!roles || roles.length === 0) {
                setNeedsRoleSelection(true);
                setUserRoles([]);
                setActiveRoleContext(null);
            } else {
                const savedRoleId = localStorage.getItem('phi-hau-active-role-context-id')?.replace(/"/g, '');
                let activeCtx = (roles.find(r => r.id === savedRoleId) || roles.find(r => r.is_primary) || roles[0]) as any;
                
                if (!activeCtx) {
                    setNeedsRoleSelection(true);
                } else {
                    setActiveRoleContext(activeCtx);
                }
                setUserRoles(roles);
            }
        } catch (err: any) {
            console.error("Error fetching user roles:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserRoles();
    }, [fetchUserRoles]);

    return {
        userRoles,
        activeRoleContext,
        loading,
        error,
        needsRoleSelection,
        refreshRoles: fetchUserRoles,
        setActiveRoleContext,
        getRoleDisplayName,
        getRoleIcon
    };
};
