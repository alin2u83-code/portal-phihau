import { useMemo } from 'react';
import { User, Rol } from '../types';

export interface Permissions {
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isFederationAdmin: boolean; // Super Admin or regular Admin
    isAdminClub: boolean;
    isInstructor: boolean;
    isSportiv: boolean;
    hasAdminAccess: boolean; // Helper for general admin panel access
}

const initialPermissions: Permissions = {
    isSuperAdmin: false,
    isAdmin: false,
    isFederationAdmin: false,
    isAdminClub: false,
    isInstructor: false,
    isSportiv: false,
    hasAdminAccess: false,
};

export const usePermissions = (user: User | null, activeRole: Rol['nume'] | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user || !activeRole) {
            return initialPermissions;
        }

        const isSuperAdmin = activeRole === 'SUPER_ADMIN_FEDERATIE';
        const isAdmin = activeRole === 'Admin';
        const isFederationAdmin = isSuperAdmin || isAdmin;

        const isAdminClub = activeRole === 'Admin Club' && !isFederationAdmin;
        const isInstructor = activeRole === 'Instructor';
        const isSportiv = activeRole === 'Sportiv';
        
        const hasAdminAccess = isSuperAdmin || isAdmin || isAdminClub || isInstructor;
        
        return {
            isSuperAdmin,
            isAdmin,
            isFederationAdmin,
            isAdminClub,
            isInstructor,
            isSportiv,
            hasAdminAccess,
        };
    }, [user, activeRole]);

    return permissions;
};