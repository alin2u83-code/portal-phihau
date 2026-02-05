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
        
        // Access rights for the current session are determined by the *active* role context.
        // This ensures client-side logic matches server-side RLS policies.
        const hasAdminAccess = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin' || activeRole === 'Admin Club' || activeRole === 'Instructor';
        
        // Business logic flags are derived from the active session's access rights.
        const isFederationLevel = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin';
        const canManageFinances = hasAdminAccess;
        const canGradeStudents = hasAdminAccess;

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
