import React from 'react';
import { useQuickAccess } from '../hooks/useQuickAccess';

interface QuickAccessProps {
    userId: string;
    onNavigate: (view: string) => void;
    labelMap: Record<string, string>;
}

// Rand "Recente": ultimele pagini vizitate (max 4, taiate in hook). Urmarirea vizitelor o face Sidebar.
export const QuickAccess: React.FC<QuickAccessProps> = ({ userId, onNavigate, labelMap }) => {
    const { recents } = useQuickAccess(userId);

    if (!Array.isArray(recents) || recents.length === 0) return null;

    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--t-text-muted)]">Recente</p>
            <div className="flex flex-wrap gap-2">
                {recents.map(view => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onNavigate(view)}
                        className="h-9 px-3 rounded-lg border border-[var(--t-border)] text-sm text-[var(--t-text)] hover:border-[var(--t-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-input-focus-ring)] transition-colors"
                    >
                        {labelMap[view] || view}
                    </button>
                ))}
            </div>
        </div>
    );
};
