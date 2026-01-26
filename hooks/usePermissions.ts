import { useMemo } from 'react';
import { User } from '../types';

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

export const usePermissions = (user: User | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user || !user.roluri) {
            return initialPermissions;
        }

        const roles = new Set(user.roluri.map(r => r.nume));
        
        const isSuperAdmin = roles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = roles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;

        const isAdminClub = roles.has('Admin Club') && !isFederationAdmin;
        const isInstructor = roles.has('Instructor');
        const isSportiv = roles.has('Sportiv');
        
        const hasAdminAccess = isFederationAdmin || isAdminClub || (isInstructor && !isFederationAdmin);

        return {
            isSuperAdmin,
            isAdmin,
            isFederationAdmin,
            isAdminClub,
            isInstructor,
            isSportiv,
            hasAdminAccess,
        };
    }, [user]);

    return permissions;
};