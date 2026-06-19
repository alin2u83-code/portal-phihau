import React from 'react';
import { StarIcon } from './icons';
import { useQuickAccess } from '../hooks/useQuickAccess';

interface QuickAccessProps {
    userId: string;
    onNavigate: (view: string) => void;
    labelMap: Record<string, string>;
}

const Pill: React.FC<{
    label: string;
    isFavorite?: boolean;
    onClick: () => void;
}> = ({ label, isFavorite, onClick }) => (
    <button
        onClick={onClick}
        className={`h-8 px-3 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all
            ${isFavorite
                ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
            }`}
    >
        {isFavorite && <StarIcon className="w-3 h-3 text-amber-400 fill-amber-400" />}
        {label}
    </button>
);

export const QuickAccess: React.FC<QuickAccessProps> = ({ userId, onNavigate, labelMap }) => {
    const { favorites, topViews, trackView } = useQuickAccess(userId);

    const handleNavigate = (view: string) => {
        trackView(view);
        onNavigate(view);
    };

    const hasFavorites = favorites.length > 0;
    const hasTop = topViews.length > 0;

    if (!hasFavorites && !hasTop) return null;

    return (
        <div className="space-y-2 mb-4">
            {hasFavorites && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-widest">⭐ Preferate</p>
                    <div className="flex flex-wrap gap-2">
                        {favorites.map(view => (
                            <Pill
                                key={view}
                                label={labelMap[view] || view}
                                isFavorite
                                onClick={() => handleNavigate(view)}
                            />
                        ))}
                    </div>
                </div>
            )}
            {hasTop && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">🔥 Folosite des</p>
                    <div className="flex flex-wrap gap-2">
                        {topViews.map(view => (
                            <Pill
                                key={view}
                                label={labelMap[view] || view}
                                onClick={() => handleNavigate(view)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
