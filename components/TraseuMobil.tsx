import React, { useEffect, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { VIEW_TITLES } from './Header';

/**
 * Rând cu traseul de navigare, doar pe telefon/tabletă (sub antet).
 * Pașii se derulează lateral în propriul container, fără scroll orizontal al paginii.
 */
export const TraseuMobil: React.FC = () => {
    const { activeView, history, jumpToHistory } = useNavigation();
    const ref = useRef<HTMLDivElement>(null);

    const pasi = history
        .map((entry, idx) => ({ title: VIEW_TITLES[entry.view], idx }))
        .filter((e): e is { title: string; idx: number } => !!e.title);

    useEffect(() => {
        if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
    }, [history.length, activeView]);

    if (pasi.length === 0) return null;

    return (
        <>
        {/* spațiu rezervat: bara e fixă (main are overflow-x-hidden, deci sticky nu ar ține) */}
        <div className="lg:hidden h-9" aria-hidden="true" />
        <nav
            aria-label="Traseu"
            className="lg:hidden fixed top-16 left-0 right-0 z-30 h-9 border-b border-slate-800 backdrop-blur-md"
            style={{ background: 'var(--t-header-bg)' }}
        >
            <div ref={ref} className="flex items-center gap-1.5 overflow-x-auto px-4 h-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pasi.map(p => (
                    <React.Fragment key={p.idx}>
                        <button
                            onClick={() => jumpToHistory(p.idx)}
                            className="shrink-0 whitespace-nowrap text-xs text-indigo-300 border border-slate-700 bg-slate-800/60 rounded-full px-3 py-1 hover:bg-slate-700 transition-colors"
                            title={`Înapoi la ${p.title}`}
                        >
                            {p.title}
                        </button>
                        <span className="text-slate-600 text-xs shrink-0" aria-hidden="true">›</span>
                    </React.Fragment>
                ))}
                <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-white">{VIEW_TITLES[activeView] || activeView}</span>
            </div>
        </nav>
        </>
    );
};
