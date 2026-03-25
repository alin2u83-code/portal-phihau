import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import ErrorBoundary from './ErrorBoundary';
import { ClubGuard } from './ClubGuard';
import { AppRouter } from './AppRouter';
import { View, Sportiv, Plata, User, Permissions } from '../types';
import { AIAssistantWidget } from './AIAssistant';
import { TutorialOverlay } from './Tutorial';

interface AppLayoutProps {
    currentUser: User;
    isSidebarExpanded: boolean;
    setIsSidebarExpanded: (expanded: boolean) => void;
    clubs: any[];
    permissions?: Permissions;
    activeRole: string;
    canSwitchRoles: boolean;
    onSwitchRole: (context: any) => void;
    isSwitchingRole: boolean;
    grade: any[];
    userRoles: any[];
    activeView: View;
    setActiveView: (view: View) => void;
    handleBackToDashboard: () => void;
    handleLogout: () => void;
    selectedSportiv: Sportiv | null;
    setSelectedSportiv: (s: Sportiv | null) => void;
    platiPentruIncasare: Plata[];
    setPlatiPentruIncasare: (plati: Plata[]) => void;
    activeRoleContext: any;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    currentUser, isSidebarExpanded, setIsSidebarExpanded, clubs, permissions,
    activeRole, canSwitchRoles, onSwitchRole, isSwitchingRole, grade, userRoles,
    activeView, setActiveView, handleBackToDashboard, handleLogout,
    selectedSportiv, setSelectedSportiv, platiPentruIncasare, setPlatiPentruIncasare,
    activeRoleContext
}) => {
    return (
        <div className="flex min-h-screen bg-[var(--bg-main)]">
            <Sidebar
                currentUser={currentUser}
                onLogout={handleLogout}
                isExpanded={isSidebarExpanded}
                setIsExpanded={setIsSidebarExpanded}
                clubs={clubs}
                permissions={permissions}
                activeRole={activeRole}
                canSwitchRoles={canSwitchRoles}
                onSwitchRole={onSwitchRole}
                isSwitchingRole={isSwitchingRole}
                grade={grade}
                userRoles={userRoles}
            />

            <Header
                onBack={handleBackToDashboard}
                currentUser={currentUser}
                permissions={permissions}
                onLogout={handleLogout}
                isSidebarExpanded={isSidebarExpanded}
                userRoles={userRoles}
                onSwitchRole={onSwitchRole}
            />

            <main className={`flex-1 transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'} min-h-screen`}>
                <div className="p-4 pb-24 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
                    <ErrorBoundary onNavigate={setActiveView}>
                        <ClubGuard>
                            <AppRouter
                                activeView={activeView}
                                setActiveView={setActiveView}
                                currentUser={currentUser}
                                userRoles={userRoles}
                                activeRoleContext={activeRoleContext}
                                permissions={permissions}
                                activeRole={activeRole}
                                selectedSportiv={selectedSportiv}
                                setSelectedSportiv={setSelectedSportiv}
                                platiPentruIncasare={platiPentruIncasare}
                                setPlatiPentruIncasare={setPlatiPentruIncasare}
                                handleBackToDashboard={handleBackToDashboard}
                                handleSwitchRole={onSwitchRole}
                                isSwitchingRole={isSwitchingRole}
                                canSwitchRoles={canSwitchRoles}
                                isEmergencyAdmin={currentUser?.email === 'alin2u83@gmail.com'}
                            />
                        </ClubGuard>
                    </ErrorBoundary>
                </div>
            </main>

            {/* AI Assistant - floating widget, always visible */}
            <AIAssistantWidget activeRole={activeRole} />

            {/* Tutorial overlay - shown on first login for admin roles */}
            <TutorialOverlay />
        </div>
    );
};
