import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { User, Rol, Permissions, View, Club, Grad } from '../types';

interface MainLayoutProps {
  currentUser: User;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  activeView: View;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  clubs: Club[];
  globalClubFilter: string | null;
  setGlobalClubFilter: (clubId: string | null) => void;
  permissions: Permissions;
  activeRole: Rol['nume'];
  canSwitchRoles: boolean;
  onSwitchRole: (role: any) => void;
  isSwitchingRole: boolean;
  grade: Grad[];
  userRoles: any[];
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentUser,
  onNavigate,
  onLogout,
  activeView,
  isSidebarExpanded,
  setIsSidebarExpanded,
  clubs,
  globalClubFilter,
  setGlobalClubFilter,
  permissions,
  activeRole,
  canSwitchRoles,
  onSwitchRole,
  isSwitchingRole,
  grade,
  userRoles,
  children,
}) => {
  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      <Sidebar
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={onLogout}
        activeView={activeView}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        clubs={clubs}
        globalClubFilter={globalClubFilter}
        setGlobalClubFilter={setGlobalClubFilter}
        permissions={permissions}
        activeRole={activeRole!}
        canSwitchRoles={canSwitchRoles}
        onSwitchRole={onSwitchRole}
        isSwitchingRole={isSwitchingRole}
        grade={grade}
        userRoles={userRoles}
      />

      <Header
        activeView={activeView}
        onBack={() => onNavigate('dashboard')}
        currentUser={currentUser}
        permissions={permissions}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isSidebarExpanded={isSidebarExpanded}
      />

      <main className={`flex-1 transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
