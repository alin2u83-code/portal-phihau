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
                isSportiv: false, // Master admin is not a regular sportiv in terms of UI
                hasAdminAccess: true,
                isFederationLevel: true,
                canManageFinances: true,
                canGradeStudents: true,
                visibleClubIds: 'all',
            };
        }

        // Base role flags
        const isSuperAdmin = activeRole === 'SUPER_ADMIN_FEDERATIE';
        const isAdmin = activeRole === 'Admin';
        const isFederationAdmin = isSuperAdmin || isAdmin;

        const isAdminClub = activeRole === 'Admin Club' && !isFederationAdmin;
        const isInstructor = activeRole === 'Instructor';
        const isSportiv = activeRole === 'Sportiv';
        
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