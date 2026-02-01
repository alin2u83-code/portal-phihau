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
        
        // MASTER ACCESS OVERRIDE
        if (user.email === 'alin2u83@gmail.com') {
            return {
                isSuperAdmin: true,
                isAdmin: true,
                isFederationAdmin: true,
                isAdminClub: true,
                isInstructor: true,
                isSportiv: true, // Master admin is also a sportiv
                hasAdminAccess: true,
                isFederationLevel: true,
                canManageFinances: true,
                canGradeStudents: true,
                visibleClubIds: 'all',
            };
        }

        // Base role flags are now based on *all* roles, not just the active one.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;

        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');
        
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        
        // New business logic flags
        const isFederationLevel = isFederationAdmin;
        const canManageFinances = hasAdminAccess;
        const canGradeStudents = hasAdminAccess;

        // Visible clubs logic
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
