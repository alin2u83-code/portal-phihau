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

        // Flag-urile de bază se determină pe baza TUTUROR rolurilor pe care le deține utilizatorul.
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin'); // 'Admin' poate fi un rol de super admin de rezervă
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');
        
        // hasAdminAccess este determinat de capacitățile totale ale utilizatorului.
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        
        // --- LOGICĂ NOUĂ ---
        // Capabilități bazate pe TOATE rolurile, nu doar pe contextul activ
        const canBeClubAdmin = isAdminClub;
        const canBeFederationAdmin = isFederationAdmin;
        const isMultiContextAdmin = canBeClubAdmin && canBeFederationAdmin;
        // --- SFÂRȘIT LOGICĂ NOUĂ ---

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