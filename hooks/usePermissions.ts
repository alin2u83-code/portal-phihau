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
        if (!user) {
            return initialPermissions;
        }
        
        // Contextul activ curent, derivat din JWT/baza de date
        const activeRole = user.rol_activ_context;
        const normalizedActiveRole = activeRole?.toUpperCase().replace(/ /g, '_');

        // Flag-urile de bază sunt determinate de TOATE rolurile pe care le deține utilizatorul,
        // permițând verificări de capacitate generală (ex: "este acest utilizator un instructor undeva?")
        const allUserRoles = new Set((user.roluri || []).map(r => r.nume));

        const isSuperAdmin = allUserRoles.has('SUPER_ADMIN_FEDERATIE');
        const isAdmin = allUserRoles.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = allUserRoles.has('Admin Club');
        const isInstructor = allUserRoles.has('Instructor');
        const isSportiv = allUserRoles.has('Sportiv');
        
        // Un flag general pentru a determina dacă utilizatorul are orice fel de acces administrativ
        const hasAdminAccess = isSuperAdmin || isAdmin || isAdminClub || isInstructor;
        
        // Flag-urile de business logic sunt derivate din contextul ACTIV al sesiunii
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