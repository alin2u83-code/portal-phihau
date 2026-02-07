export const FEDERATIE_ID = '00000000-0000-0000-0000-000000000000';
export const FEDERATIE_NAME = 'Secretariatul General';

// Role IDs for permission checks
export const SUPER_ADMIN_ROLE_ID = '379f605c-dd61-4f6f-9d9a-c7001c830474';
export const ADMIN_CLUB_ROLE_ID = '18f77e02-f38e-4bb9-99e4-f508aebfd10e';

// Standardized normalized role names
export const ROLES = {
  ADMIN_CLUB: 'Admin Club',
  INSTRUCTOR: 'Instructor',
  SUPER_ADMIN_FEDERATIE: 'SUPER_ADMIN_FEDERATIE',
  ADMIN: 'Admin',
  SPORTIV: 'Sportiv',
} as const;
