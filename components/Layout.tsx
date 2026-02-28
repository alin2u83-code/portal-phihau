import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalContextSwitcher } from './GlobalContextSwitcher';
import ErrorBoundary from './ErrorBoundary';
import { AdminDebugFloatingPanel } from './AdminDebugFloatingPanel';
import { User, View, Permissions } from '../types';

interface LayoutProps {
    currentUser: User;
    activeView: View;
    setActiveView: (view: View) => void;
    handleBackToDashboard: () => void;
    handleLogout: () => void;
    isSidebarExpanded: boolean;
    setIsSidebarExpanded: (expanded: boolean) => void;
    clubs: any[];
    globalClubFilter: string | null;
    setGlobalClubFilter: (clubId: string | null) => void;
    permissions: Permissions;
    activeRole: string;
    canSwitchRoles: boolean;
    handleSwitchRole: (role: any) => Promise<void>;
    isSwitchingRole: boolean;
    grade: any[];
    userRoles: any[];
    adminContext: 'club' | 'federation';
    setAdminContext: (context: 'club' | 'federation') => void;
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
    currentUser, activeView, setActiveView, handleBackToDashboard,
    handleLogout, isSidebarExpanded, setIsSidebarExpanded, clubs,
    globalClubFilter, setGlobalClubFilter, permissions, activeRole,
    canSwitchRoles, handleSwitchRole, isSwitchingRole, grade,
    userRoles, adminContext, setAdminContext, children
}) => {
    return (
        <div className="flex min-h-screen bg-[var(--bg-main)]">
            <Sidebar 
                currentUser={currentUser} 
                onNavigate={setActiveView} 
                onLogout={handleLogout} 
                activeView={activeView} 
                isExpanded={isSidebarExpanded} 
                setIsExpanded={setIsSidebarExpanded} 
                clubs={clubs} 
                globalClubFilter={globalClubFilter} 
                setGlobalClubFilter={setGlobalClubFilter} 
                permissions={permissions} 
                activeRole={activeRole} 
                canSwitchRoles={canSwitchRoles} 
                onSwitchRole={handleSwitchRole} 
                isSwitchingRole={isSwitchingRole} 
                grade={grade} 
                userRoles={userRoles} 
            />
            
            <Header 
                activeView={activeView}
                onBack={handleBackToDashboard}
                currentUser={currentUser}
                permissions={permissions}
                onNavigate={setActiveView}
                onLogout={handleLogout}
                isSidebarExpanded={isSidebarExpanded}
            />

            <main className={`flex-1 transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {permissions.isMultiContextAdmin && permissions.hasAdminAccess && (
                        <GlobalContextSwitcher activeContext={adminContext} onContextChange={setAdminContext} />
                    )}
                    <ErrorBoundary onNavigate={setActiveView}>
                        {children}
                    </ErrorBoundary>
                </div>
            </main>

            {(import.meta as any).env.DEV && currentUser && (
                <AdminDebugFloatingPanel 
                    currentUser={currentUser} 
                    userRoles={userRoles} 
                    onNavigate={(view) => setActiveView(view)} 
                />
            )}
        </div>
    );
};
