import { useMemo } from 'react';
import { User, Rol, Permissions } from '../types';

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
    visibleClubIds: [],
};

export const usePermissions = (user: User | null, activeRoleContext: any | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user) {
            return initialPermissions;
        }
        
        const activeRole = activeRoleContext?.rol_denumire;
        const normalizedActiveRole = activeRole?.toUpperCase().replace(/ /g, '_');

        // Base role flags are determined by *all* roles the user possesses.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');
        
        const hasAdminAccess = isSuperAdmin || isAdmin || isAdminClub || isInstructor;
        
        // Business logic flags are derived from the NORMALIZED active session's context.
        const isFederationLevel = normalizedActiveRole === 'SUPER_ADMIN_FEDERATIE' || normalizedActiveRole === 'ADMIN';
        const canManageFinances = normalizedActiveRole === 'SUPER_ADMIN_FEDERATIE' || normalizedActiveRole === 'ADMIN' || normalizedActiveRole === 'ADMIN_CLUB';
        const canGradeStudents = hasAdminAccess;

        // Visible clubs logic now depends on the active context.
        const visibleClubIds: 'all' | string[] = isFederationLevel ? 'all' : (activeRoleContext?.club_id ? [activeRoleContext.club_id] : []);
        
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
            visibleClubIds,
        };
    }, [user, activeRoleContext]);

    return permissions;
};
