import { Rol } from '../types';

export interface TablePermissions {
    canRead: boolean;
    canWrite: boolean; // Insert/Update
    canDelete: boolean;
}

export type PermissionMap = Record<string, TablePermissions>;

export const DEFAULT_PERMISSIONS: TablePermissions = {
    canRead: false,
    canWrite: false,
    canDelete: false
};

export const FULL_ACCESS: TablePermissions = {
    canRead: true,
    canWrite: true,
    canDelete: true
};

export const READ_ONLY: TablePermissions = {
    canRead: true,
    canWrite: false,
    canDelete: false
};

// Configurație generată pe baza politicilor RLS
export const ROLE_PERMISSIONS: Record<string, PermissionMap> = {
    'SUPER_ADMIN_FEDERATIE': {
        '*': FULL_ACCESS
    },
    'ADMIN': {
        '*': FULL_ACCESS
    },
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
        'cluburi': READ_ONLY // De obicei adminii de club nu șterg clubul
    },
    'INSTRUCTOR': {
        'sportivi': {
            canRead: true,
            canWrite: true, // Poate edita date (conform politicilor de UPDATE)
            canDelete: false // Dezactivat explicit conform cerinței
        },
        'prezenta_antrenament': {
            canRead: true,
            canWrite: true, // Activat explicit conform cerinței
            canDelete: false // De obicei nu șterg, doar fac update la status
        },
        'program_antrenamente': READ_ONLY, // Văd orarul
        'plati': READ_ONLY, // Văd dacă sportivii au plătit
        'grupe': READ_ONLY,
        'familii': READ_ONLY,
        'sesiuni_examene': READ_ONLY,
        'inscrieri_examene': {
            canRead: true,
            canWrite: true, // Pot înscrie/nota sportivi
            canDelete: false
        },
        'evenimente': READ_ONLY,
        'notificari': READ_ONLY
    },
    'SPORTIV': {
        'sportivi': {
            canRead: true, // Propriul profil
            canWrite: true, // Update limitat (avatar, etc)
            canDelete: false
        },
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

export const getPermissionsForRole = (roleName: string | undefined, tableName: string): TablePermissions => {
    if (!roleName) return DEFAULT_PERMISSIONS;
    
    // Normalizare nume rol
    const normalizedRole = roleName === 'Admin Club' ? 'ADMIN_CLUB' : roleName.toUpperCase();
    
    const roleConfig = ROLE_PERMISSIONS[normalizedRole];
    if (!roleConfig) return DEFAULT_PERMISSIONS;

    // Super Admin are acces la toate (*)
    if (roleConfig['*']) return roleConfig['*'];

    return roleConfig[tableName] || DEFAULT_PERMISSIONS;
};
