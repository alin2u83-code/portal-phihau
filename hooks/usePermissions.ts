import { useMemo } from 'react';
import { User } from '../types';
import { FEDERATIE_ID } from '../constants';

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
        
        // Federation/Super Admin status is now tied to the special club ID
        const isUserInFederation = user.club_id === FEDERATIE_ID;

        const isSuperAdmin = roles.has('Super Admin') && isUserInFederation;
        const isAdmin = roles.has('Admin') && isUserInFederation;
        const isFederationAdmin = isSuperAdmin || isAdmin;

        const isAdminClub = roles.has('Admin Club') && !isUserInFederation;
        const isInstructor = roles.has('Instructor') && !isUserInFederation;
        const isSportiv = roles.has('Sportiv');
        
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;

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
