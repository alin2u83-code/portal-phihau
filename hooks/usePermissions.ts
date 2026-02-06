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
};

export const usePermissions = (user: User | null): Permissions => {
    const permissions = useMemo((): Permissions => {
        if (!user || !user.roluri) {
            return initialPermissions;
        }
        
        const userRoles = user.roluri || [];

        const isSuperAdmin = userRoles.some(r => r.nume === ROLES.SUPER_ADMIN_FEDERATIE);
        const isAdmin = userRoles.some(r => r.nume === ROLES.ADMIN);
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = userRoles.some(r => r.nume === ROLES.ADMIN_CLUB);
        const isInstructor = userRoles.some(r => r.nume === ROLES.INSTRUCTOR);
        const isSportiv = userRoles.some(r => r.nume === ROLES.SPORTIV);
        
        // Un flag general pentru a determina dacă utilizatorul are orice fel de acces administrativ
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        
        // Flag-urile de business logic sunt derivate din contextul ACTIV al sesiunii
        const activeRole = user.rol_activ_context;
        const normalizedActiveRole = activeRole?.toUpperCase().replace(/ /g, '_');

        const isFederationLevel = normalizedActiveRole === ROLES.SUPER_ADMIN_FEDERATIE || normalizedActiveRole === ROLES.ADMIN;
        const canManageFinances = isFederationLevel || normalizedActiveRole === ROLES.ADMIN_CLUB;
        const canGradeStudents = hasAdminAccess; // Oricine cu acces admin poate gestiona examene

        // Determină ce cluburi sunt vizibile în contextul curent
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
    }, [user]);

    return permissions;
};