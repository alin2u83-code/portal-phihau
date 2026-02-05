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

export const usePermissions = (user: User | null, activeRole: Rol['nume'] | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user || !activeRole) {
            return initialPermissions;
        }

        // Base role flags are determined by *all* roles the user possesses.
        // This is useful for knowing the user's total capabilities.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin'); // 'Admin' can be a fallback super admin role
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');
        
        // hasAdminAccess is now determined by the user's total capabilities,
        // not just their active context. This allows the UI to show relevant
        // admin/switching options even when in a non-admin context.
        const hasAdminAccess = isSuperAdmin || isAdmin || isAdminClub || isInstructor;
        
        // Business logic flags are derived from the active session's context for security.
        const isFederationLevel = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin';
        const canManageFinances = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin' || activeRole === 'Admin Club';
        const canGradeStudents = hasAdminAccess; // Grading might be allowed for all admin types

        // Visible clubs logic also depends on the active context.
        const visibleClubIds: 'all' | string[] = isFederationLevel ? 'all' : (user.club_id ? [user.club_id] : []);
        
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
    }, [user, activeRole]);

    return permissions;
};
