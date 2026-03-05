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

        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        const canManageFinances = isFederationAdmin || isAdminClub;
        const canGradeStudents = isFederationAdmin || isAdminClub || isInstructor;
        const isFederationLevel = isFederationAdmin;
        
        const visibleClubIds: 'all' | string[] = isFederationAdmin
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
            canBeClubAdmin: isFederationAdmin,
            canBeFederationAdmin: isSuperAdmin,
            isMultiContextAdmin: isFederationAdmin,
            hasClubFilter,
        };
    }, [activeRoleContext]);
};