import React from 'react';
import { View, User, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from './ui';
import { ArrowLeftIcon, Bars3Icon } from './icons';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useIsMobile } from '../hooks/useIsMobile';
import { ThemeDropdown } from './ThemeDropdown';
import { useRefresh } from '../contexts/RefreshContext';

interface HeaderProps {
    onBack: () => void;
    currentUser: User;
    permissions?: Permissions;
    onLogout: () => void;
    isSidebarExpanded: boolean;
    userRoles?: any[];
    onSwitchRole?: (context: any) => void;
    onOpenMobileSidebar?: () => void;
    onOpenThemeEditor: () => void;
}

export const ROOT_VIEWS: View[] = ['dashboard', 'my-portal', 'federation-dashboard', 'admin-dashboard'];
const MAX_PASI_TRASEU = 6;

export const VIEW_TITLES: Partial<Record<View, string>> = {
    'activitati-nationale': 'Activități Naționale',
    'admin-sms': 'SMS',
    'cereri-gdpr': 'Cereri GDPR',
    'cereri-inscriere': 'Cereri Înscriere',
    'data-maintenance': 'Mentenanță Date',
    'deduplicare-sportivi': 'Deduplicare Sportivi',
    'familii': 'Familii',
    'inlantuiri-admin': 'Nomenclator Înlănțuiri',
    'istoric-activitate': 'Istoric Activitate',
    'istoric-prezenta': 'Istoric Prezență',
    'jurnal-audit': 'Jurnal Audit',
    'produse': 'Echipamente',
    'protectia-datelor': 'Protecția Datelor',
    'stagii': 'Stagii',
    'template-probe': 'Template Probe',
    'user-management': 'Administrare Staff',
    'vanzari-produse': 'Vânzări Echipamente',
    'dashboard': 'Acasă',
    'anunturi-federatie': 'Anunțuri Federație',
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
    'facturi-fara-prezenta': 'Facturi fără Prezență',
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
    'deconturi-federatie': 'Deconturi Federație',
    'structura-federatie': 'Structură Federație',
    'financial-dashboard': 'Dashboard Financiar',
    'legitimatii': 'Legitimații',
    'activitati': 'Activități',
    'grade': 'Grade',
    'fisa-digitala': 'Fișă Digitală',
    'fisa-competitie': 'Fișă Competiție',
    'rapoarte-examen': 'Rapoarte Examene',
    'perioade-vacanta': 'Vacanțe Antrenamente',
    'audit-grade': 'Audit Grade',
    'plati-hub': 'Plăți & Facturi',
    'raport-prezenta': 'Analiză Prezențe',
    'raport-lunar-prezenta': 'Raport Lunar Prezențe',
    'sezoane': 'Sezoane',
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
    onOpenThemeEditor,
}) => {
    const { activeView, setActiveView, canGoBack, history, goBack, jumpToHistory } = useNavigation();
    const isMobile = useIsMobile();
    const { refresh, isRefreshing } = useRefresh();

    const pageTitle = VIEW_TITLES[activeView] || activeView;

    const namedHistory = history
        .map((entry, idx) => ({ title: VIEW_TITLES[entry.view], idx }))
        .filter((e): e is { title: string; idx: number } => !!e.title);

    type Crumb = { title: string; idx: number } | { title: '…'; idx: -1 };
    let visibleCrumbs: Crumb[];
    if (namedHistory.length <= MAX_PASI_TRASEU - 1) {
        visibleCrumbs = namedHistory;
    } else {
        // primul pas rămâne mereu vizibil, mijlocul se ascunde
        visibleCrumbs = [
            namedHistory[0],
            { title: '…', idx: -1 },
            ...namedHistory.slice(-(MAX_PASI_TRASEU - 3)),
        ];
    }

    return (
        <header
            data-tutorial="header"
            className={`fixed top-0 right-0 h-16 flex items-center justify-between px-4 transition-all duration-300 ${isSidebarExpanded ? 'lg:left-64' : 'lg:left-20'} left-0 z-40`}
            style={{ background: 'var(--t-header-bg)', borderBottom: '1px solid var(--t-header-border)' }}
        >
            {/* Left: Hamburger (mobile) + Back Button + Breadcrumb */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                {onOpenMobileSidebar && (
                    <button
                        className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg transition-colors shrink-0 text-[var(--t-text-muted)] hover:bg-[var(--t-surface-2)] hover:text-[var(--t-text)]"
                        onClick={onOpenMobileSidebar}
                        aria-label="Deschide meniul"
                    >
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}

                {canGoBack && (
                    <Button
                        onClick={goBack}
                        variant="secondary"
                        size="sm"
                        ghost
                        className="min-h-11 lg:min-h-9 !shadow-none shrink-0"
                        title="Înapoi"
                        aria-label="Înapoi"
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
                                    className="text-xs font-normal text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors px-1 py-1 rounded whitespace-nowrap shrink-0 hidden sm:block"
                                    title={`Înapoi la ${crumb.title}`}
                                >
                                    {crumb.title}
                                </button>
                            ) : (
                                <span className="text-xs text-[var(--t-text-muted)] shrink-0 hidden sm:block">…</span>
                            )}
                            <span className="text-[var(--t-text-muted)] text-xs shrink-0 hidden sm:block">›</span>
                        </React.Fragment>
                    ))}

                    <h1 className="text-base font-semibold leading-tight text-[var(--t-text)] truncate">
                        {pageTitle}
                    </h1>
                </nav>
            </div>

            {/* Right: Notifications & User Menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={refresh}
                    disabled={isRefreshing}
                    title="Reîncarcă datele"
                    aria-label="Reîncarcă datele"
                    style={{ touchAction: 'manipulation' }}
                    className="h-11 w-11 lg:h-9 lg:w-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 shrink-0 text-[var(--t-text-muted)] hover:bg-[var(--t-surface-2)] hover:text-[var(--t-text)]"
                >
                    <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <ThemeDropdown onOpenAdvanced={onOpenThemeEditor} />

                {currentUser && <NotificationBell currentUser={currentUser} />}

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
