import { useMemo } from 'react';
import { User, Permissions } from '../types';
import { ROLES } from '../constants';

const initialPermissions: Permissions = {
    isSuperAdmin: false,
    isAdmin: false,
    isFederationAdmin: false,
    isAdminClub: false,
    isInstructor: false,
    isSportiv: false,
    hasAdminAccess: false,
    isFederationLevel: false,
    canManageFinances: false,
    canGradeStudents: false,
    canManageClubs: false,
    visibleClubIds: [],
};

export const usePermissions = (currentUser: User | null): Permissions => {
    return useMemo((): Permissions => {
        if (!currentUser) {
            return initialPermissions;
        }

        // 1. Read active role directly from currentUser
        const activeRole = currentUser.rol_activ_context || null;

        // 2. Determine all roles user possesses
        const allUserRoles = new Set((currentUser.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has(ROLES.SUPER_ADMIN_FEDERATIE);
        const isAdmin = allUserRoles.has(ROLES.ADMIN);
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has(ROLES.ADMIN_CLUB);
        const isInstructor = allUserRoles.has(ROLES.INSTRUCTOR);
        const isSportiv = allUserRoles.has(ROLES.SPORTIV);
        
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;

        // 3. Define context-specific constants based on activeRole
        const isFederationLevel = activeRole === ROLES.SUPER_ADMIN_FEDERATIE || activeRole === ROLES.ADMIN;
        const canManageFinances = isFederationLevel || activeRole === ROLES.ADMIN_CLUB;
        const canGradeStudents = hasAdminAccess; // Any admin-like role can grade
        const canManageClubs = isFederationLevel; // Admin Club cannot manage clubs

        // 4. Implement getVisibleClubs() logic
        const visibleClubIds: 'all' | string[] = isFederationLevel 
            ? 'all' 
            : (currentUser.club_id ? [currentUser.club_id] : []);
        
        return {
            isSuperAdmin,
            isAdmin,
            isFederationAdmin,
            isAdminClub,
            isInstructor,
            isSportiv,
            hasAdminAccess,
            isFederationLevel,
            canManageFinances,
            canGradeStudents,
            canManageClubs,
            visibleClubIds,
        };
    }, [currentUser]);
};
