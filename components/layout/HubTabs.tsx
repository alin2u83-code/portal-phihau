import React from 'react';
import type { View } from '../../types';

/**
 * Strip de tab-uri pentru hub-uri (Sportivi, Examene, Competiții, Fișa mea).
 * Nu introduce view-uri noi: fiecare tab = un view existent din AppRouter;
 * click schimbă doar activeView. Permisiunile reale rămân în renderProtected + RLS.
 */
export interface HubTabDef {
    view: View;
    label: string;
    minRole?: 'instructor' | 'clubAdmin';
}

export interface HubDef {
    id: string;
    label: string;
    enabledFor: 'all' | 'instructor' | 'clubAdmin';
    tabs: HubTabDef[];
}

export const SPORTIVI_HUB: HubDef = {
    id: 'sportivi',
    label: 'Sportivi',
    enabledFor: 'clubAdmin',
    tabs: [
        { view: 'sportivi', label: 'Sportivi', minRole: 'clubAdmin' },
        { view: 'familii', label: 'Familii', minRole: 'clubAdmin' },
        { view: 'legitimatii', label: 'Legitimații', minRole: 'clubAdmin' },
        { view: 'cereri-inscriere', label: 'Cereri', minRole: 'clubAdmin' },
        { view: 'cereri-gdpr', label: 'Cereri GDPR', minRole: 'clubAdmin' },
        { view: 'import-sportivi', label: 'Import', minRole: 'clubAdmin' },
        { view: 'deduplicare-sportivi', label: 'Deduplicare', minRole: 'clubAdmin' },
    ],
};

export const EXAMENE_HUB: HubDef = {
    id: 'examene',
    label: 'Examene',
    enabledFor: 'clubAdmin',
    tabs: [
        { view: 'examene', label: 'Sesiuni' },
        { view: 'rapoarte-examen', label: 'Rapoarte' },
        { view: 'audit-grade', label: 'Audit Grade' },
    ],
};

export const COMPETITII_HUB: HubDef = {
    id: 'competitii',
    label: 'Competiții',
    enabledFor: 'instructor',
    tabs: [
        { view: 'competitii', label: 'Competiții' },
        { view: 'activitati-nationale', label: 'Activități Naționale' },
        { view: 'template-probe', label: 'Template Probe', minRole: 'clubAdmin' },
    ],
};

export const FISA_HUB: HubDef = {
    id: 'fisa',
    label: 'Fișa mea',
    enabledFor: 'all',
    tabs: [
        { view: 'fisa-digitala', label: 'Fișa Digitală' },
        { view: 'fisa-competitie', label: 'Fișa de Competiție' },
    ],
};

interface HubTabsProps {
    def: HubDef;
    activeView: View;
    onNavigate: (view: View) => void;
    isAtLeastInstructor: boolean;
    isAtLeastClubAdmin: boolean;
    children: React.ReactNode;
}

export const HubTabs: React.FC<HubTabsProps> = ({ def, activeView, onNavigate, isAtLeastInstructor, isAtLeastClubAdmin, children }) => {
    const allowed = (r?: 'instructor' | 'clubAdmin') =>
        r === 'clubAdmin' ? isAtLeastClubAdmin : r === 'instructor' ? isAtLeastInstructor : true;

    const enabled =
        def.enabledFor === 'all' ||
        (def.enabledFor === 'instructor' ? isAtLeastInstructor : isAtLeastClubAdmin);
    if (!enabled || !def.tabs.some(t => t.view === activeView)) return <>{children}</>;

    const tabs = def.tabs.filter(t => allowed(t.minRole));
    if (tabs.length < 2) return <>{children}</>;

    return (
        <>
            <nav
                aria-label={def.label}
                role="tablist"
                className="flex overflow-x-auto border-b border-[var(--t-border)] mb-4 min-h-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {tabs.map(t => {
                    const activ = t.view === activeView;
                    return (
                        <button
                            key={t.view}
                            type="button"
                            role="tab"
                            aria-selected={activ}
                            aria-current={activ ? 'page' : undefined}
                            onClick={() => { if (!activ) onNavigate(t.view); }}
                            className={`shrink-0 px-4 min-h-11 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)] ${
                                activ
                                    ? 'font-semibold text-[var(--t-text)] border-[var(--t-primary)]'
                                    : 'font-normal border-transparent text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </nav>
            {children}
        </>
    );
};

type WrapperProps = Omit<HubTabsProps, 'def'>;
export const SportiviTabs: React.FC<WrapperProps> = p => <HubTabs def={SPORTIVI_HUB} {...p} />;
export const ExameneTabs: React.FC<WrapperProps> = p => <HubTabs def={EXAMENE_HUB} {...p} />;
export const CompetitiiTabs: React.FC<WrapperProps> = p => <HubTabs def={COMPETITII_HUB} {...p} />;
export const FisaTabs: React.FC<WrapperProps> = p => <HubTabs def={FISA_HUB} {...p} />;
