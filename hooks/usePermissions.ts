import { useMemo } from 'react';
import { Permissions } from '../types';

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
    hasClubFilter: false,
};

export const usePermissions = (activeRoleContext: any | null): Permissions => {
    return useMemo((): Permissions => {
        if (!activeRoleContext) {
            return initialPermissions;
        }

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;

        // --- Permissions based on the CURRENT ACTIVE role/context ---
        const isSuperAdmin = roleName === 'SUPER_ADMIN_FEDERATIE';
        const isAdmin = roleName === 'ADMIN';
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = roleName === 'ADMIN_CLUB';
        const isInstructor = roleName === 'INSTRUCTOR';
        const isSportiv = roleName === 'SPORTIV';

        // If the active role is SUPER_ADMIN_FEDERATIE, grant all administrative permissions
        if (isSuperAdmin) {
            return {
                isSuperAdmin: true,
                isAdmin: true, // Super Admin implies Admin
                isFederationAdmin: true,
                isAdminClub: true, // Super Admin implies Admin Club
                isInstructor: true, // Super Admin implies Instructor
                isSportiv: false, // Super Admin is not a regular sportiv in this context
                hasAdminAccess: true,
                isFederationLevel: true,
                canManageFinances: true,
                canGradeStudents: true,
                visibleClubIds: 'all',
                canBeClubAdmin: true,
                canBeFederationAdmin: true,
                isMultiContextAdmin: true,
                hasClubFilter: false,
            };
        }

        const hasAdminAccess = isFederationAdmin || isAdminClub;
        const canManageFinances = hasAdminAccess;
        const canGradeStudents = hasAdminAccess || isInstructor;

        // --- Context-dependent flags ---
        const isFederationLevel = isFederationAdmin;
        
        const visibleClubIds: 'all' | string[] = isSuperAdmin
            ? 'all'
            : (activeRoleContext.club_id ? [activeRoleContext.club_id] : []);

        const hasClubFilter = visibleClubIds !== 'all';
        
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
            canBeClubAdmin: false, // These are context-specific now, might need adjustment if used globally
            canBeFederationAdmin: false,
            isMultiContextAdmin: false,
            hasClubFilter,
        };
    }, [activeRoleContext]);
};