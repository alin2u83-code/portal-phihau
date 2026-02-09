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
        // Acestea definesc ce poate face utilizatorul în sesiunea curentă.
        const isSuperAdmin = activeRole === 'SUPER_ADMIN_FEDERATIE';
        const isAdmin = activeRole === 'Admin';
        const isFederationAdmin = isSuperAdmin || isAdmin;
        const isAdminClub = activeRole === 'Admin Club';
        const isInstructor = activeRole === 'Instructor';
        const isSportiv = activeRole === 'Sportiv';

        // --- Flag-uri compozite și de business logic (bazate pe rolul activ) ---
        const hasAdminAccess = isFederationAdmin || isAdminClub || isInstructor;
        const isFederationLevel = isFederationAdmin;
        const canManageFinances = isFederationLevel || isAdminClub;
        const canGradeStudents = hasAdminAccess;

        // --- Scopul Vizibilității Datelor (bazat pe rolul activ și contextul utilizatorului) ---
        // Dacă rolul activ este la nivel de federație, poate vedea toate cluburile.
        // Altfel, este restricționat la ID-ul de club din contextul său activ.
        const visibleClubIds: 'all' | string[] = isFederationLevel 
            ? 'all' 
            : (user.club_id ? [user.club_id] : []);

        // --- Capabilități de Rol (bazate pe TOATE rolurile disponibile ale utilizatorului) ---
        // Acestea sunt utile pentru UI, de ex. pentru a afișa opțiuni de comutare a rolului.
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
