import { useMemo } from 'react';
import { User, Permissions, Rol } from '../types';
import { ROLES } from '../constants';

export const usePermissions = (user: User | null): Permissions => {
    return useMemo(() => {
        if (!user) {
            return {
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
        }

        const roles = user?.roluri || [];
        const roleNames = new Set(roles.map(r => r.nume));

        const isSuperAdmin = roleNames.has(ROLES.SUPER_ADMIN_FEDERATIE);
        const isAdmin = roleNames.has(ROLES.ADMIN);
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = roleNames.has(ROLES.ADMIN_CLUB);
        const isInstructor = roleNames.has(ROLES.INSTRUCTOR);
        const isSportiv = roleNames.has(ROLES.SPORTIV);

        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;

        return {
            isSuperAdmin,
            isAdmin,
            isFederationAdmin,
            isAdminClub,
            isInstructor,
            isSportiv,
            hasAdminAccess,
            isFederationLevel: isFederationAdmin,
            canManageFinances: isFederationAdmin || isAdminClub,
            canGradeStudents: isFederationAdmin || isAdminClub || isInstructor,
            visibleClubIds: isFederationAdmin ? 'all' : (user?.club_id ? [user.club_id] : []),
        };
    }, [user]);
};
