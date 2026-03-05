import { useMemo } from 'react';
import { Permissions } from '../types';

const initialPermissions: Permissions & { checkMismatch: (id: string | undefined) => boolean } = {
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
    checkMismatch: () => false,
};

export const usePermissions = (activeRoleContext: any | null) => {
    return useMemo(() => {
        if (!activeRoleContext) {
            return initialPermissions;
        }

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;

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

        // Logica mutată aici pentru a elimina fișierul separat
        const checkMismatch = (targetId: string | undefined) => {
            if (isFederationAdmin) return false; // Adminii de federație pot vedea orice
            if (!activeRoleContext.club_id || !targetId) return false;
            return activeRoleContext.club_id !== targetId;
        };
        
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
            checkMismatch, // Exportăm funcția
        };
    }, [activeRoleContext]);
};
