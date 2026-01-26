import React from 'react';
import { View } from '../types';
import { Card } from './ui';
import { TrophyIcon, UsersIcon } from './icons';

const NavCard: React.FC<{ title: string; view: View; icon: React.ElementType; onNavigate: (view: View) => void; }> = ({ title, view, icon: Icon, onNavigate }) => (
    <div onClick={() => onNavigate(view)} className="bg-slate-800/50 p-6 rounded-lg flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:bg-slate-700/50 transition-colors border border-slate-700 min-h-[200px]">
        <Icon className="w-10 h-10 text-red-400" />
        <span className="font-semibold text-white text-lg">{title}</span>
    </div>
);


interface FederationDashboardProps {
    onNavigate: (view: View) => void;
}

export const FederationDashboard: React.FC<FederationDashboardProps> = ({ onNavigate }) => {
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