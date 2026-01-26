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

export const usePermissions = (user: User | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user) {
            return initialPermissions;
        }

        const simpleRole = user.rol;
        const complexRoles = new Set((user.roluri || []).map(r => r.nume));
        
        const isSuperAdmin = complexRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = complexRoles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;

        // isStaff este true dacă rolul simplu este 'ADMIN_CLUB' sau rolurile complexe includ 'Instructor' sau 'Admin'.
        const isStaff = simpleRole === 'ADMIN_CLUB' || complexRoles.has('Instructor') || isAdmin;
        
        // hasAdminAccess, care controlează meniul admin, include acum toți super-adminii și staff-ul.
        const hasAdminAccess = isSuperAdmin || isStaff || complexRoles.has('Admin Club');

        // isAdminClub este actualizat pentru a verifica ambele sisteme de roluri.
        const isAdminClub = (simpleRole === 'ADMIN_CLUB' || complexRoles.has('Admin Club')) && !isFederationAdmin;
        const isInstructor = complexRoles.has('Instructor');
        const isSportiv = complexRoles.has('Sportiv');
        
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