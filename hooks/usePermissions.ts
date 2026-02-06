import { useMemo } from 'react';
import { User, Permissions, Rol } from '../types';

export const usePermissions = (user: User | null): Permissions => {
    return useMemo(() => {
        if (!user) {
            // Default permissions for a non-logged-in user or when user is null
            return {
                isSuperAdmin: false,
                isAdmin: false,
                isFederationAdmin: false,
                isAdminClub: false,
                isInstructor: false,
                isSportiv: true, // Default to most restrictive
                hasAdminAccess: false,
                isFederationLevel: false,
                canManageFinances: false,
                canGradeStudents: false,
                visibleClubIds: [],
            };
        }

        const roles = new Set(user.roluri.map(r => r.nume));

        const isSuperAdmin = roles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = roles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = roles.has('Admin Club');
        const isInstructor = roles.has('Instructor');
        const isSportiv = roles.has('Sportiv');

        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        const isFederationLevel = isFederationAdmin;

        const canManageFinances = isFederationAdmin || isAdminClub;
        const canGradeStudents = isFederationAdmin || isAdminClub || isInstructor;
        
        const visibleClubIds: 'all' | string[] = isFederationAdmin ? 'all' : (user.club_id ? [user.club_id] : []);

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
    }, [user]);
};
