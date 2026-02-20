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
    canBeClubAdmin: false,
    canBeFederationAdmin: false,
    isMultiContextAdmin: false,
};

export const usePermissions = (user: User | null, activeRole: Rol['nume'] | null): Permissions => {
    return useMemo((): Permissions => {
        if (!user || !activeRole) {
            return initialPermissions;
        }

        // --- Permissions based on the CURRENT ACTIVE role/context ---
        const isSuperAdmin = activeRole === 'SUPER_ADMIN_FEDERATIE';
        const isAdmin = activeRole === 'ADMIN';
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = activeRole === 'ADMIN_CLUB';
        const isInstructor = activeRole === 'INSTRUCTOR';
        const isSportiv = activeRole === 'SPORTIV';

        // --- Capabilities based on ALL available roles for the user ---
        const hasAdminAccess = (user.roluri || []).some(
            r => r.nume === 'ADMIN_CLUB' || r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN'
        );

        const canManageFinances = hasAdminAccess;

        const canGradeStudents = (user.roluri || []).some(
            r => r.nume === 'ADMIN_CLUB' || r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN' || r.nume === 'INSTRUCTOR'
        );

        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));
        const canBeFederationAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE') || allUserRoles.has('ADMIN');
        const canBeClubAdmin = allUserRoles.has('ADMIN_CLUB');
        const isMultiContextAdmin = canBeFederationAdmin && canBeClubAdmin;

        // --- Context-dependent flags ---
        const isFederationLevel = isFederationAdmin; // This is about the *current view*, so it's based on activeRole.
        
        const visibleClubIds: 'all' | string[] = isFederationLevel 
            ? 'all' 
            : (user.club_id ? [user.club_id] : []);
        
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
            canBeClubAdmin,
            canBeFederationAdmin,
            isMultiContextAdmin,
        };
    }, [user, activeRole]);
};