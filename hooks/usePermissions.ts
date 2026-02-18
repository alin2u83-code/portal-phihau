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

        // --- Permisiuni bazate pe ROLUL ACTIV CURENT ---
        // `activeRole` este echivalentul lui `rol_activ_context`
        const isSuperAdmin = activeRole === 'SUPER_ADMIN_FEDERATIE';
        const isAdmin = activeRole === 'Admin';
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = activeRole === 'Admin Club';
        const isInstructor = activeRole === 'Instructor';
        const isSportiv = activeRole === 'Sportiv';

        // --- Flag-uri compozite și de business logic (bazate pe rolul activ) ---
        const hasAdminAccess = isFederationAdmin || isAdminClub;
        const isFederationLevel = isFederationAdmin;
        const canManageFinances = isFederationLevel || isAdminClub;
        const canGradeStudents = isFederationAdmin || isAdminClub || isInstructor;

        // --- Scopul Vizibilității Datelor (bazat pe rolul activ și contextul utilizatorului) ---
        // `currentUser.club_id` reflectă clubul din contextul activ.
        const visibleClubIds: 'all' | string[] = isFederationLevel 
            ? 'all' 
            : (user.club_id ? [user.club_id] : []);

        // --- Capabilități de Rol (bazate pe TOATE rolurile disponibile ale utilizatorului) ---
        // `user.roluri` conține toate rolurile pe care le poate asuma utilizatorul,
        // indiferent de cel activ.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));
        const canBeFederationAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE') || allUserRoles.has('Admin');
        const canBeClubAdmin = allUserRoles.has('Admin Club');
        const isMultiContextAdmin = canBeFederationAdmin && canBeClubAdmin;

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
