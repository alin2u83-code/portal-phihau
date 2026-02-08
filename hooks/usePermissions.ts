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
 * @param user The full user object, including all their possible roles (`user.roluri`).
 * @param activeRole The name of the role the user is currently operating under (from `rol_activ_context`).
 * @returns A `Permissions` object detailing what the user can and cannot do.
 */
export const usePermissions = (user: User | null, activeRole: Rol['nume'] | null): Permissions => {
    return useMemo((): Permissions => {
        if (!user) {
            return initialPermissions;
        }

        // --- 1. Determine User's Overall Capabilities ---
        // These flags are based on ALL roles the user possesses. They don't change when the user switches context.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin; // A user with any federation-level capability.
        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');

        // A general flag indicating if the user has any role higher than a standard 'Sportiv'.
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;

        // Flags for UI rendering, e.g., showing the context switcher.
        const canBeClubAdmin = isAdminClub;
        const canBeFederationAdmin = isFederationAdmin;
        const isMultiContextAdmin = canBeClubAdmin && canBeFederationAdmin;

        // --- 2. Determine Permissions for the ACTIVE Context ---
        // These flags are based on the `activeRole` and determine what the user can do in the CURRENT session.

        // `isFederationLevel` is true if the active context is one of the federation-level roles.
        const isFederationLevel = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin';

        // `canManageFinances` is granted to roles that handle money: federation admins and club admins.
        const canManageFinances = isFederationLevel || activeRole === 'Admin Club';
        
        // `canGradeStudents` is a capability of any staff member (Instructor or higher).
        // This is based on overall capability, as an Instructor is still seen as capable of grading
        // even if they temporarily switch to their 'Sportiv' view.
        const canGradeStudents = hasAdminAccess;

        // --- 3. Determine Data Visibility (implements getVisibleClubs) ---
        // This returns 'all' for federation-level context, allowing them to see data from all clubs.
        // For any other context (Admin Club, Instructor, Sportiv), it returns the user's specific club ID.
        const visibleClubIds: 'all' | string[] = isFederationLevel ? 'all' : (user.club_id ? [user.club_id] : []);

        return {
            // Overall capabilities
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
            // Context-specific permissions
            isFederationLevel,
            canManageFinances,
            canGradeStudents,
            visibleClubIds,
        };
    }, [user, activeRole]);
};
