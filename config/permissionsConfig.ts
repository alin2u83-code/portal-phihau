import { Rol } from '../types';

/**
 * Interfață pentru permisiunile pe tabelă
 */
export interface TablePermissions {
    canRead: boolean;
    canWrite: boolean; // Insert/Update
    canDelete: boolean;
}

export type PermissionMap = Record<string, TablePermissions>;

// State-uri predefinite pentru reutilizare
export const DEFAULT_PERMISSIONS: TablePermissions = { canRead: false, canWrite: false, canDelete: false };
export const FULL_ACCESS: TablePermissions = { canRead: true, canWrite: true, canDelete: true };
export const READ_ONLY: TablePermissions = { canRead: true, canWrite: false, canDelete: false };

/**
 * Matricea de permisiuni bazată pe rolurile Qwan Ki Do
 */
export const ROLE_PERMISSIONS: Record<string, PermissionMap> = {
    'SUPER_ADMIN_FEDERATIE': { '*': FULL_ACCESS },
    'ADMIN': { '*': FULL_ACCESS },
    'ADMIN_CLUB': {
        'sportivi': FULL_ACCESS,
        'plati': FULL_ACCESS,
        'program_antrenamente': FULL_ACCESS,
        'prezenta_antrenament': FULL_ACCESS,
        'grupe': FULL_ACCESS,
        'familii': FULL_ACCESS,
        'sesiuni_examene': FULL_ACCESS,
        'inscrieri_examene': FULL_ACCESS,
        'evenimente': FULL_ACCESS,
        'notificari': FULL_ACCESS,
        'cluburi': READ_ONLY
    },
    'INSTRUCTOR': {
        'sportivi': { canRead: true, canWrite: true, canDelete: false },
        'prezenta_antrenament': { canRead: true, canWrite: true, canDelete: false },
        'program_antrenamente': READ_ONLY,
        'plati': READ_ONLY,
        'grupe': READ_ONLY,
        'familii': READ_ONLY,
        'sesiuni_examene': READ_ONLY,
        'inscrieri_examene': { canRead: true, canWrite: true, canDelete: false },
        'evenimente': READ_ONLY,
        'notificari': READ_ONLY
    },
    'SPORTIV': {
        'sportivi': { canRead: true, canWrite: true, canDelete: false },
        'plati': READ_ONLY,
        'program_antrenamente': READ_ONLY,
        'prezenta_antrenament': READ_ONLY,
        'grupe': READ_ONLY,
        'familii': READ_ONLY,
        'sesiuni_examene': READ_ONLY,
        'inscrieri_examene': READ_ONLY,
        'evenimente': READ_ONLY,
        'notificari': READ_ONLY
    }
};

/**
 * Calculează permisiunile agregate pentru o listă de roluri.
 * Dacă un utilizator are mai multe roluri, se aplică regula "Cea mai mare permisiune".
 */
export const getPermissionsForRoles = (roles: string[] | string | undefined, tableName: string): TablePermissions => {
    if (!roles) return DEFAULT_PERMISSIONS;

    // Convertim input-ul în array (pentru a suporta atât single role cât și multi-role)
    const roleList = Array.isArray(roles) ? roles : [roles];

    return roleList.reduce((acc, role) => {
        // Normalizare nume rol (ex: "Admin Club" -> "ADMIN_CLUB")
        const normalizedRole = role.trim().toUpperCase().replace(/\s+/g, '_');
        const roleConfig = ROLE_PERMISSIONS[normalizedRole];

        if (!roleConfig) return acc;

        // Dacă rolul are acces total via wildcard '*'
        const tablePerms = roleConfig['*'] || roleConfig[tableName] || DEFAULT_PERMISSIONS;

        return {
            canRead: acc.canRead || tablePerms.canRead,
            canWrite: acc.canWrite || tablePerms.canWrite,
            canDelete: acc.canDelete || tablePerms.canDelete
        };
    }, { ...DEFAULT_PERMISSIONS });
};