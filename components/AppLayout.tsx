import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import ErrorBoundary from './ErrorBoundary';
import { ClubGuard } from './ClubGuard';
import { AppRouter } from './AppRouter';
import { View, Sportiv, Plata, User, Permissions } from '../types';
import { AIAssistantWidget } from './AIAssistant';
import { TutorialOverlay } from './Tutorial';
import { useAIStore } from '../src/store/useAIStore';
import { BotIcon, XIcon } from './icons';
import { ThemeEditor } from './ThemeEditor';

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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isThemeEditorOpen, setIsThemeEditorOpen] = useState(false);
    const { isOpen: isAIOpen, setIsOpen: setIsAIOpen } = useAIStore();

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
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
                isMobileOpen={isMobileSidebarOpen}
                setIsMobileOpen={setIsMobileSidebarOpen}
                onOpenThemeEditor={() => setIsThemeEditorOpen(true)}
            />

            <Header
                onBack={handleBackToDashboard}
                currentUser={currentUser}
                permissions={permissions}
                onLogout={handleLogout}
                isSidebarExpanded={isSidebarExpanded}
                userRoles={userRoles}
                onSwitchRole={onSwitchRole}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onOpenThemeEditor={() => setIsThemeEditorOpen(true)}
            />

            <main className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'} min-h-screen`} style={{ background: 'var(--t-content-bg)' }}>
                <div className="p-4 pb-32 md:p-6 md:pb-28 lg:p-8 lg:pb-28 max-w-7xl mx-auto animate-fade-in">
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

            {/* Footer fix desktop — bara de jos cu AI assistant integrat */}
            <footer className={`hidden md:flex fixed bottom-0 right-0 z-[7999] h-12 items-center justify-between px-4 backdrop-blur border-t border-[var(--t-header-border)] transition-all duration-300 ${isSidebarExpanded ? 'left-64' : 'left-20'}`} style={{ background: 'var(--t-footer-bg)' }}>
                <p className="text-[10px] text-slate-700 tracking-wide select-none">
                    Realizat cu <span className="text-amber-800">AI</span> de <span className="text-slate-600 font-semibold">Alin Lungu</span>
                </p>

                {/* Buton AI integrat în footer */}
                <button
                    data-tutorial="ai-widget"
                    onClick={() => setIsAIOpen(!isAIOpen)}
                    className={`flex items-center gap-2 px-3 h-8 rounded-xl text-sm font-semibold transition-all border ${
                        isAIOpen
                            ? 'bg-slate-700 border-slate-600 text-white'
                            : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 hover:border-indigo-400/60'
                    }`}
                    title="Asistent AI"
                >
                    {isAIOpen ? <XIcon className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
                    <span className="hidden lg:inline text-xs">{isAIOpen ? 'Închide' : 'Asistent AI'}</span>
                    {!isAIOpen && (
                        <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                    )}
                </button>
            </footer>

            {/* Theme Editor modal */}
            <ThemeEditor
                isOpen={isThemeEditorOpen}
                onClose={() => setIsThemeEditorOpen(false)}
            />

            {/* AI Assistant - floating widget */}
            <AIAssistantWidget activeRole={activeRole} />

            {/* Tutorial overlay - shown on first login for admin roles */}
            <TutorialOverlay />
        </div>
    );
};
