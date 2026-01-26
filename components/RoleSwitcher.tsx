import React from 'react';
import { User, View } from '../types';
import { HomeIcon, ShieldCheckIcon, UserCircleIcon, CogIcon, ClipboardCheckIcon } from './icons';

interface DevNavigationToolbarProps {
    currentUser: User | null;
    onNavigate: (view: View) => void;
    activeView: View;
}

const NAV_ITEMS = [
    { view: 'dashboard', label: '🔴 FRQKD', title: 'Dashboard Federație' },
    { view: 'dashboard', label: '🔵 Club', title: 'Dashboard Club' },
    { view: 'prezenta', label: '🟢 Instructor', title: 'Modul Prezență' },
    { view: 'my-portal', label: '🟡 Sportiv', title: 'Portal Sportiv' },
    { view: 'account-settings', label: '⚙️ Cont', title: 'Setări Cont' },
];

const DEV_EMAIL = 'admin@phihau.ro'; 

export const RoleSwitcher: React.FC<DevNavigationToolbarProps> = ({ currentUser, onNavigate, activeView }) => {
    
    if (!currentUser || currentUser.email !== DEV_EMAIL) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/80 backdrop-blur-sm p-1.5 border-t border-amber-500 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                <div className="text-xs text-white hidden md:flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-amber-400"/>
                    <span className="font-bold text-amber-400">DEV MODE</span>
                </div>
                <div className="flex items-center justify-center flex-grow gap-2">
                    {NAV_ITEMS.map(item => {
                        const isActive = activeView === item.view;
                        let glowClass = '';
                        if (isActive) {
                            if (item.label.includes('🔴')) glowClass = 'shadow-[0_0_12px_3px_rgba(220,38,38,0.5)]';
                            else if (item.label.includes('🔵')) glowClass = 'shadow-[0_0_12px_3px_rgba(59,130,246,0.5)]';
                            else if (item.label.includes('🟢')) glowClass = 'shadow-[0_0_12px_3px_rgba(34,197,94,0.5)]';
                            else if (item.label.includes('🟡')) glowClass = 'shadow-[0_0_12px_3px_rgba(245,158,11,0.5)]';
                            else if (item.label.includes('⚙️')) glowClass = 'shadow-[0_0_12px_3px_rgba(156,163,175,0.5)]';
                        }
                        return (
                            <button
                                key={item.view}
                                onClick={() => onNavigate(item.view as View)}
                                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${isActive ? `bg-slate-600 text-white ${glowClass}` : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                title={item.title}
                            >
                               {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};