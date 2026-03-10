import React from 'react';
import { View } from '../types';
import { Card } from './ui';
import { TrophyIcon, UsersIcon } from './icons';
import { useIsMobile } from '../hooks/useIsMobile';
import { FederationDashboardMobile } from './FederationDashboardMobile';
import { useData } from '../contexts/DataContext';

const NavCard: React.FC<{ title: string; view: View; icon: React.ElementType; onNavigate: (view: View) => void; }> = ({ title, view, icon: Icon, onNavigate }) => (
    <div onClick={() => onNavigate(view)} className="bg-slate-900/50 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:bg-slate-800/50 transition-all border border-slate-800 hover:border-slate-700 hover:shadow-lg hover:-translate-y-1 min-h-[200px] group">
        <div className="p-4 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
            <Icon className="w-8 h-8 text-brand-light group-hover:text-white transition-colors" />
        </div>
        <span className="font-semibold text-slate-200 text-lg group-hover:text-white transition-colors">{title}</span>
    </div>
);


interface FederationDashboardProps {
    onNavigate: (view: View) => void;
}

export const FederationDashboard: React.FC<FederationDashboardProps> = ({ onNavigate }) => {
    const isMobile = useIsMobile();
    const { sportivi, clubs } = useData();

    if (isMobile) {
        return <FederationDashboardMobile sportivi={sportivi} clubs={clubs} />;
    }

    return (
        <div className="space-y-8">
             <header>
                <h1 className="text-3xl font-bold text-white">Panou de Control Federație</h1>
                <p className="text-slate-400">Administrare la nivel național.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <NavCard 
                    title="Creează Eveniment Național"
                    view="stagii"
                    icon={TrophyIcon}
                    onNavigate={onNavigate}
                />
                 <NavCard 
                    title="Management Cluburi"
                    view="cluburi"
                    icon={UsersIcon}
                    onNavigate={onNavigate}
                />
            </div>
        </div>
    );
};
