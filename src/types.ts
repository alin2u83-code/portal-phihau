export enum UserRole {
  SPORTIV = 'SPORTIV',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN_CLUB = 'ADMIN_CLUB',
  SUPER_ADMIN_FEDERATIE = 'SUPER_ADMIN_FEDERATIE',
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  active_role: UserRole;
}

export interface Role {
  role_id: number;
  role_name: UserRole;
}
