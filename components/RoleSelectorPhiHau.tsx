import React from 'react';
import { supabase } from '../supabaseClient';
import { RolContext } from '../types';
import IconErrorBoundary from './IconErrorBoundary';

// Importare sigură a pictogramelor
const GiMartialArts = React.lazy(() => import('react-icons/gi').then(module => ({ default: module.GiMartialArts })));
const GiPerson = React.lazy(() => import('react-icons/gi').then(module => ({ default: module.GiPerson })));

interface RoleSelectorPhiHauProps {
  roles: RolContext[];
  onRoleSelect: (roleId: string) => Promise<void>;
  currentRoleId: string | null;
}

const RoleIcon = ({ roleName }: { roleName: string }) => {
  const Icon = roleName === 'INSTRUCTOR' ? GiMartialArts : GiPerson;
  return <Icon className="w-10 h-10 text-indigo-300" />;
};

export const RoleSelectorPhiHau: React.FC<RoleSelectorPhiHauProps> = ({ roles, onRoleSelect, currentRoleId }) => {
  const handleSelect = async (roleId: string) => {
    try {
      await onRoleSelect(roleId);
      // Aici poți adăuga feedback vizual, ex: un toast de succes
    } catch (error) {
      console.error('Eroare la schimbarea rolului:', error);
      // Aici poți adăuga feedback vizual, ex: un toast de eroare
    }
  };

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white text-center mb-6">Selectează Rolul</h1>
      <div>
        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => handleSelect(role.id)}
            className={`w-full p-6 mb-4 rounded-2xl border-2 flex items-center shadow-lg transition-all duration-300 cursor-pointer ${
              currentRoleId === role.id
                ? 'bg-indigo-800 border-indigo-500 scale-105'
                : 'bg-indigo-900 border-indigo-900 hover:border-indigo-700'
            }`}>
            <IconErrorBoundary fallback={<span className="text-3xl">&#x1f94b;</span>}>
              <React.Suspense fallback={<div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse" />}>
                <RoleIcon roleName={role.rol_denumire} />
              </React.Suspense>
            </IconErrorBoundary>
            <div className="ml-4">
              <p className="text-xl font-bold text-white">{role.rol_denumire}</p>
              <p className="text-md text-gray-300">{role.club_denumire || 'Rol General'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
