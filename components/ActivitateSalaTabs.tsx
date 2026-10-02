import React from 'react';
import type { View } from '../types';

/**
 * Bară de tab-uri comună pentru meniul "Activitate Sală".
 * Nu introduce view-uri noi: fiecare tab = un view existent din AppRouter,
 * iar tab-ul activ se deduce din `activeView`. Grupurile leagă paginile
 * înrudite (Grupe+Sezoane, Prezențe+Program+Calendar, Rapoarte).
 */
interface TabDef {
    view: View;
    label: string;
    /** view-uri care luminează acest tab */
    aliases?: View[];
    adminOnly?: boolean;
    instructorOnly?: boolean;
    adminOnlyHide?: boolean;
}

const GRUPURI: TabDef[][] = [
    [
        { view: 'grupe', label: 'Grupe & Orar' },
        { view: 'sezoane', label: 'Sezoane', adminOnly: true },
    ],
    [
        { view: 'prezenta', label: 'Înregistrare Prezențe', aliases: ['prezenta-instructor'], adminOnlyHide: true },
        { view: 'prezenta-instructor', label: 'Înregistrare Prezențe', instructorOnly: true },
        { view: 'program-antrenamente', label: 'Program Antrenamente' },
        { view: 'calendar', label: 'Calendar' },
    ],
    [
        { view: 'raport-prezenta', label: 'Analiză Prezențe' },
        { view: 'raport-lunar-prezenta', label: 'Raport Lunar' },
    ],
];

export const ActivitateSalaTabs: React.FC<{
    activeView: View;
    onNavigate: (view: View) => void;
    isAdminClub: boolean;
    isInstructorOnly: boolean;
    /** Doar instructor+ vede tab-urile (Calendarul e deschis și altor roluri) */
    enabled: boolean;
    children: React.ReactNode;
}> = ({ activeView, onNavigate, isAdminClub, isInstructorOnly, enabled, children }) => {
    if (!enabled) return <>{children}</>;
    const grup = GRUPURI.find(g => g.some(t => t.view === activeView));
    if (!grup) return <>{children}</>;

    const taburi = grup.filter(t => {
        if (t.adminOnly && !isAdminClub) return false;
        // Instructorul pur are tab-ul 'prezenta-instructor'; adminul are 'prezenta'.
        if (t.instructorOnly && !isInstructorOnly) return false;
        if (t.adminOnlyHide && isInstructorOnly) return false;
        return true;
    });
    if (taburi.length < 2) return <>{children}</>;

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4" role="tablist">
                {taburi.map(t => {
                    const activ = t.view === activeView || t.aliases?.includes(activeView);
                    return (
                        <button
                            key={t.view}
                            role="tab"
                            aria-selected={activ}
                            onClick={() => { if (!activ) onNavigate(t.view); }}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                activ ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>
            {children}
        </div>
    );
};
