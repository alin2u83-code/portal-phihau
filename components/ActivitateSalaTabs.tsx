import React from 'react';
import type { View } from '../types';

/**
 * Navigare "Activitate Sală" pe pagină (oglinda submeniului din sidebar).
 * Nu introduce view-uri noi: fiecare link/tab = un view existent din AppRouter,
 * iar poziția curentă se deduce din `activeView`.
 *  - rândul 1: cele 3 secțiuni (Grupe & Sezoane / Prezențe & Antrenamente / Rapoarte)
 *  - rândul 2: tab-urile secțiunii curente
 */
interface TabDef {
    view: View;
    label: string;
    adminOnly?: boolean;
    /** vizibil doar pentru instructorul pur (view 'prezenta-instructor') */
    instructorOnly?: boolean;
    /** ascuns pentru instructorul pur (view 'prezenta') */
    hideForInstructor?: boolean;
}

interface GrupDef {
    label: string;
    /** view-ul spre care duce linkul secțiunii (per rol, vezi `intrare`) */
    intrare: (instructorPur: boolean) => View;
    taburi: TabDef[];
}

const GRUPURI: GrupDef[] = [
    {
        label: 'Grupe & Sezoane',
        intrare: () => 'grupe',
        taburi: [
            { view: 'grupe', label: 'Grupe & Orar' },
            { view: 'sezoane', label: 'Sezoane', adminOnly: true },
        ],
    },
    {
        label: 'Prezențe & Antrenamente',
        intrare: instructorPur => (instructorPur ? 'prezenta-instructor' : 'prezenta'),
        taburi: [
            { view: 'prezenta', label: 'Înregistrare Prezențe', hideForInstructor: true },
            { view: 'prezenta-instructor', label: 'Înregistrare Prezențe', instructorOnly: true },
            { view: 'program-antrenamente', label: 'Program Antrenamente' },
            { view: 'calendar', label: 'Calendar' },
            { view: 'activitati', label: 'Generator Program' },
        ],
    },
    {
        label: 'Rapoarte Prezențe',
        intrare: () => 'raport-prezenta',
        taburi: [
            { view: 'raport-prezenta', label: 'Analiză Prezențe' },
            { view: 'raport-lunar-prezenta', label: 'Raport Lunar' },
        ],
    },
];

export const ACTIVITATE_SALA_GRUPURI = GRUPURI;

export const ActivitateSalaTabs: React.FC<{
    activeView: View;
    onNavigate: (view: View) => void;
    isAdminClub: boolean;
    isInstructorOnly: boolean;
    /** Doar instructor+ vede navigarea (Calendarul e deschis și altor roluri) */
    enabled: boolean;
    children: React.ReactNode;
}> = ({ activeView, onNavigate, isAdminClub, isInstructorOnly, enabled, children }) => {
    if (!enabled) return <>{children}</>;

    // 'prezenta' și 'prezenta-instructor' sunt aceeași poziție pentru rolurile diferite
    const grupCurent = GRUPURI.find(g => g.taburi.some(t => t.view === activeView));
    if (!grupCurent) return <>{children}</>;

    const taburi = grupCurent.taburi.filter(t => {
        if (t.adminOnly && !isAdminClub) return false;
        if (t.instructorOnly && !isInstructorOnly) return false;
        if (t.hideForInstructor && isInstructorOnly) return false;
        return true;
    });
    const esteActiv = (t: TabDef) =>
        t.view === activeView ||
        // adminul poate ajunge pe view-ul de instructor (și invers): același tab
        (t.view === 'prezenta' && activeView === 'prezenta-instructor') ||
        (t.view === 'prezenta-instructor' && activeView === 'prezenta');

    return (
        <div>
            {/* Rând 1: secțiunile — legături între submeniurile din sidebar */}
            <nav className="flex overflow-x-auto border-b border-[var(--t-border)] mb-3 min-h-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Antrenamente">
                {GRUPURI.map(g => {
                    const activ = g === grupCurent;
                    return (
                        <button
                            key={g.label}
                            type="button"
                            onClick={() => { if (!activ) onNavigate(g.intrare(isInstructorOnly)); }}
                            aria-current={activ ? 'page' : undefined}
                            className={`shrink-0 px-4 min-h-11 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)] ${
                                activ
                                    ? 'font-semibold text-[var(--t-text)] border-[var(--t-primary)]'
                                    : 'font-normal border-transparent text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                            }`}
                        >
                            {g.label}
                        </button>
                    );
                })}
            </nav>

            {/* Rând 2: tab-urile secțiunii curente */}
            {taburi.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4" role="tablist">
                    {taburi.map(t => {
                        const activ = esteActiv(t);
                        return (
                            <button
                                key={t.view}
                                role="tab"
                                aria-selected={activ}
                                onClick={() => { if (!activ) onNavigate(t.view); }}
                                className={`rounded-lg min-h-11 lg:min-h-9 px-4 text-sm transition-colors ${
                                    activ
                                        ? 'font-semibold text-[var(--t-text)] bg-[var(--t-surface)] border border-[var(--t-border)]'
                                        : 'font-normal text-[var(--t-text-muted)] border border-transparent hover:text-[var(--t-text)]'
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            )}
            {children}
        </div>
    );
};
