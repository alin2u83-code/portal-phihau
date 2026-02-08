import { useMemo } from 'react';
import { User, Rol, Permissions } from '../types';
import { ROLES } from '../constants';

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
    const permissions = useMemo((): Permissions => {
        if (!user) {
            return initialPermissions;
        }
        
        // Normalizează rolul activ pentru verificări dependente de context
        const normalizedActiveRole = activeRole?.toUpperCase().replace(/ /g, '_');

        // Flag-urile de bază se determină pe baza TUTUROR rolurilor pe care le deține utilizatorul, acum normalizate.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume.toUpperCase().replace(/ /g, '_')));

        const isSuperAdmin = allUserRoles.has(ROLES.SUPER_ADMIN_FEDERATIE);
        const isAdmin = allUserRoles.has(ROLES.ADMIN);
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has(ROLES.ADMIN_CLUB);
        const isInstructor = allUserRoles.has(ROLES.INSTRUCTOR);
        const isSportiv = allUserRoles.has(ROLES.SPORTIV);
        
        // hasAdminAccess este determinat de capacitățile totale ale utilizatorului.
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        
        const canBeClubAdmin = isAdminClub;
        const canBeFederationAdmin = isFederationAdmin;
        const isMultiContextAdmin = canBeClubAdmin && canBeFederationAdmin;

        // Flag-urile de business logic sunt derivate din contextul de sesiune activ NORMALIZAT.
        const isFederationLevel = normalizedActiveRole === ROLES.SUPER_ADMIN_FEDERATIE || normalizedActiveRole === ROLES.ADMIN;
        const canManageFinances = isFederationLevel || normalizedActiveRole === ROLES.ADMIN_CLUB;
        const canGradeStudents = hasAdminAccess;

        // Logica pentru cluburile vizibile depinde, de asemenea, de contextul activ.
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
            // Proprietăți noi
            canBeClubAdmin,
            canBeFederationAdmin,
            isMultiContextAdmin,
        };
    }, [user, activeRole]);

    return permissions;
};