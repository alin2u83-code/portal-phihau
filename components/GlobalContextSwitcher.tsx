import React from 'react';
import { UsersIcon, SitemapIcon } from './icons';

type AdminContext = 'club' | 'federation';

interface GlobalContextSwitcherProps {
    activeContext: AdminContext;
    onContextChange: (context: AdminContext) => void;
}

export const GlobalContextSwitcher: React.FC<GlobalContextSwitcherProps> = ({ activeContext, onContextChange }) => {
    
    const getButtonClasses = (context: AdminContext) => {
        const isActive = activeContext === context;
        let base = "flex-1 md:flex-none font-bold py-2 px-4 rounded-md transition-all duration-300 flex items-center justify-center gap-2 text-sm";
        if (isActive) {
            if (context === 'club') return `${base} bg-[#3D3D99] text-white shadow-lg ring-2 ring-white/50`;
            if (context === 'federation') return `${base} bg-red-600 text-white shadow-lg ring-2 ring-white/50`;
        } else {
            return `${base} bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white`;
        }
    };

    return (
        <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)] mb-6 animate-fade-in-down">
            <div className="flex items-center gap-2 md:gap-4">
                <span className="hidden md:block text-sm font-bold text-slate-400 uppercase">Post de lucru:</span>
                <button className={getButtonClasses('club')} onClick={() => onContextChange('club')}>
                    <UsersIcon className="w-5 h-5" />
                    <span className="hidden md:inline">Admin Club</span>
                    <span className="md:hidden">Club</span>
                </button>
                <button className={getButtonClasses('federation')} onClick={() => onContextChange('federation')}>
                    <SitemapIcon className="w-5 h-5" />
                     <span className="hidden md:inline">SuperAdmin Federație</span>
                     <span className="md:hidden">Federație</span>
                </button>
            </div>
        </div>
    );
};