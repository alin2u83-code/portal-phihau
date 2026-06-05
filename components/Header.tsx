import React from 'react';
import { View, User, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from './ui';
import { ArrowLeftIcon, Bars3Icon } from './icons';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useIsMobile } from '../hooks/useIsMobile';

interface HeaderProps {
    onBack: () => void;
    currentUser: User;
    permissions?: Permissions;
    onLogout: () => void;
    isSidebarExpanded: boolean;
    userRoles?: any[];
    onSwitchRole?: (context: any) => void;
    onOpenMobileSidebar?: () => void;
}

const ROOT_VIEWS: View[] = ['dashboard', 'my-portal', 'federation-dashboard', 'admin-dashboard'];

const VIEW_TITLES: Partial<Record<View, string>> = {
    'dashboard': 'Dashboard',
    'my-portal': 'Portalul Meu',
    'federation-dashboard': 'Dashboard Federație',
    'admin-dashboard': 'Admin Dashboard',
    'sportivi': 'Sportivi',
    'grupe': 'Grupe',
    'examene': 'Examene',
    'prezenta': 'Prezență',
    'prezenta-instructor': 'Prezență',
    'plati-scadente': 'Plăți Scadente',
    'istoric-plati': 'Istoric Plăți',
    'notificari': 'Notificări',
    'gestiune-facturi': 'Gestiune Facturi',
    'competitii': 'Competiții',
    'profil-sportiv': 'Profil Sportiv',
    'import-sportivi': 'Import Sportivi',
    'setari-club': 'Setări Club',
    'account-settings': 'Setări Cont',
    'calendar': 'Calendar',
    'rapoarte': 'Rapoarte',
    'cluburi': 'Cluburi',
    'nomenclatoare': 'Nomenclatoare',
    'program-antrenamente': 'Program Antrenamente',
    'arhiva-prezente': 'Arhivă Prezențe',
    'deconturi-federatie': 'Deconturi Federație',
    'structura-federatie': 'Structură Federație',
    'financial-dashboard': 'Dashboard Financiar',
    'legitimatii': 'Legitimații',
    'activitati': 'Activități',
    'grade': 'Grade',
    'fisa-digitala': 'Fișă Digitală',
    'fisa-competitie': 'Fișă Competiție',
};

export const Header: React.FC<HeaderProps> = ({
    onBack,
    currentUser,
    permissions,
    onLogout,
    isSidebarExpanded,
    userRoles,
    onSwitchRole,
    onOpenMobileSidebar,
}) => {
    const { activeView, setActiveView, canGoBack, history, goBack, jumpToHistory } = useNavigation();
    const isRootView = ROOT_VIEWS.includes(activeView);
    const isMobile = useIsMobile();

    const pageTitle = VIEW_TITLES[activeView] || activeView;

    const namedHistory = history
        .map((entry, idx) => ({ title: VIEW_TITLES[entry.view], idx }))
        .filter((e): e is { title: string; idx: number } => !!e.title);

    type Crumb = { title: string; idx: number } | { title: '…'; idx: -1 };
    let visibleCrumbs: Crumb[];
    if (namedHistory.length <= 2) {
        visibleCrumbs = namedHistory;
    } else {
        visibleCrumbs = [
            namedHistory[0],
            { title: '…', idx: -1 },
            namedHistory[namedHistory.length - 1],
        ];
    }

    return (
        <header
            data-tutorial="header"
            className={`fixed top-0 right-0 h-16 flex items-center justify-between px-4 bg-slate-900/95 backdrop-blur-md transition-all duration-300 ${isSidebarExpanded ? 'md:left-64' : 'md:left-20'} left-0 z-40`}
            style={{ borderBottom: '1px solid rgba(30,41,59,0.9)', boxShadow: '0 1px 20px rgba(0,0,0,0.3)' }}
        >
            {/* Left: Hamburger (mobile) + Back Button + Breadcrumb */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                {onOpenMobileSidebar && (
                    <button
                        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                        onClick={onOpenMobileSidebar}
                        aria-label="Deschide meniu"
                    >
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}

                {canGoBack && (
                    <Button
                        onClick={goBack}
                        variant="secondary"
                        size="sm"
                        className="!px-2.5 !py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm flex items-center shrink-0"
                        title="Înapoi"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                )}

                <nav className="flex items-center gap-1 min-w-0" aria-label="Navigare">
                    {canGoBack && visibleCrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {crumb.idx >= 0 ? (
                                <button
                                    onClick={() => jumpToHistory(crumb.idx)}
                                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-1 py-0.5 rounded hover:bg-slate-800 whitespace-nowrap shrink-0 hidden sm:block"
                                    title={`Înapoi la ${crumb.title}`}
                                >
                                    {crumb.title}
                                </button>
                            ) : (
                                <span className="text-xs text-slate-600 shrink-0 hidden sm:block">…</span>
                            )}
                            <span className="text-slate-600 text-xs shrink-0 hidden sm:block">›</span>
                        </React.Fragment>
                    ))}

                    <h1 className="font-bold text-white tracking-tight text-sm md:text-base truncate">
                        {pageTitle}
                    </h1>

                    {isRootView && (
                        <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 ml-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Online
                        </span>
                    )}
                </nav>
            </div>

            {/* Right: Notifications & User Menu */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                {currentUser && <NotificationBell currentUser={currentUser} />}

                <div className="h-6 w-px bg-slate-800 hidden md:block" />

                <UserMenu
                    currentUser={currentUser}
                    permissions={permissions}
                    onNavigate={setActiveView}
                    onLogout={onLogout}
                    userRoles={userRoles}
                    onSwitchRole={onSwitchRole}
                />
            </div>
        </header>
    );
};
