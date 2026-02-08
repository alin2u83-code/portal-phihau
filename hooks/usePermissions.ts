import { useMemo } from 'react';
import { User, Rol, Permissions } from '../types';

// The default state when no user is logged in. All permissions are denied.
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
    canBeClubAdmin: false,
    canBeFederationAdmin: false,
    isMultiContextAdmin: false,
};

/**
 * A custom hook that calculates a user's permissions based on their assigned roles and their active context.
 * It distinguishes between a user's total capabilities and their permissions in the current session.
 *
 * @param user The full user object, including all their possible roles (`user.roluri`) and the active context.
 * @returns A `Permissions` object detailing what the user can and cannot do.
 */
export const usePermissions = (user: User | null): Permissions => {
    return useMemo((): Permissions => {
        if (!user) {
            return initialPermissions;
        }

        // --- 1. Determine User's Overall Capabilities ---
        // These flags are based on ALL roles the user possesses.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;

        const canBeClubAdmin = isAdminClub;
        const canBeFederationAdmin = isFederationAdmin;
        const isMultiContextAdmin = canBeClubAdmin && canBeFederationAdmin;

        // --- 2. Determine Permissions for the ACTIVE Context ---
        const activeRole = user.rol_activ_context || null;

        const isFederationLevel = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin';
        const canManageFinances = isFederationLevel || activeRole === 'Admin Club';
        const canGradeStudents = hasAdminAccess;

        // --- 3. Determine Data Visibility ---
        const visibleClubIds: 'all' | string[] = isFederationLevel ? 'all' : (user.club_id ? [user.club_id] : []);

        return {
            isSuperAdmin,
            isAdmin,
            isFederationAdmin,
            isAdminClub,
            isInstructor,
            isSportiv,
            hasAdminAccess,
            canBeClubAdmin,
            canBeFederationAdmin,
            isMultiContextAdmin,
            isFederationLevel,
            canManageFinances,
            canGradeStudents,
            visibleClubIds,
        };
    }, [user]);
};
