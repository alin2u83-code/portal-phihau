import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

export function RoleSwitcher() {
  const { roles, activeRole, switchRole, loading } = useAuth();

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value as UserRole;
    if (newRole !== activeRole) {
      switchRole(newRole);
    }
  };

  if (roles.length <= 1) {
    return null; // Don't show switcher if there's only one or zero roles
  }

  return (
    <div className="p-4 bg-gray-800">
      <label htmlFor="role-switcher" className="block text-xs font-medium text-gray-400 mb-2">
        Schimbă Rolul
      </label>
      <select
        id="role-switcher"
        value={activeRole || ''}
        onChange={handleRoleChange}
        disabled={loading}
        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 disabled:opacity-50"
      >
        {roles.map((role) => (
          <option key={role.role_id} value={role.role_name}>
            {role.role_name.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
