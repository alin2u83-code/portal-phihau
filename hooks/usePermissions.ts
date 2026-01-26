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

export const usePermissions = (user: User | null, overrideRole?: Rol['nume'] | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user && !overrideRole) {
            return initialPermissions;
        }

        const rolesSet = new Set<Rol['nume']>();

        if (overrideRole) {
            rolesSet.add(overrideRole);
             // Special case for dev: if simulating a club admin, also add instructor rights for full view.
            if (overrideRole === 'Admin Club') {
                rolesSet.add('Instructor');
            }
        } else if (user) {
            (user.roluri || []).forEach(r => rolesSet.add(r.nume));
            if (user.rol) rolesSet.add(user.rol as Rol['nume']);
        }
        
        const isSuperAdmin = rolesSet.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = rolesSet.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;

        const isAdminClub = rolesSet.has('Admin Club') && !isFederationAdmin;
        const isInstructor = rolesSet.has('Instructor');
        const isSportiv = rolesSet.has('Sportiv');
        
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
    }, [user, overrideRole]);

    return permissions;
};
