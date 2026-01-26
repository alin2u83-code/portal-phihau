import React from 'react';
import { View, DecontFederatie, InscriereExamen, Plata } from '../types';
import { Card } from './ui';
import { 
    UsersIcon, 
    CalendarDaysIcon, 
    ClipboardCheckIcon, 
    TrophyIcon, 
    WalletIcon, 
    BanknotesIcon, 
    CogIcon,
    BookOpenIcon,
    ChatBubbleLeftEllipsisIcon,
    FileTextIcon
} from './icons';
import { Permissions } from '../hooks/usePermissions';

const NavCard: React.FC<{ title: string; view: View; icon: React.ElementType; onNavigate: (view: View) => void; }> = ({ title, view, icon: Icon, onNavigate }) => (
    <div onClick={() => onNavigate(view)} className="bg-slate-800/50 p-4 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-slate-700/50 transition-colors border border-slate-700">
        <Icon className="w-6 h-6 text-sky-400 shrink-0" />
        <span className="font-semibold text-white">{title}</span>
    </div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card className="bg-light-navy border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-sky-400/30 pb-2">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {children}
        </div>
    </Card>
);

interface ClubManagementHubProps {
    onNavigate: (view: View) => void;
    permissions: Permissions;
}

export const ClubManagementHub: React.FC<ClubManagementHubProps> = ({ onNavigate, permissions }) => {

    const { isAdminClub } = permissions;

    return (
        <div className="space-y-6">
            <Group title="Antrenamente">
                <NavCard title="Prezență Azi" view="prezenta" icon={ClipboardCheckIcon} onNavigate={onNavigate} />
                <NavCard title="Program Săptămânal" view="grupe" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                <NavCard title="Anunțuri Absențe" view="prezenta" icon={ChatBubbleLeftEllipsisIcon} onNavigate={onNavigate} />
                 <NavCard title="Generator Program" view="activitati" icon={CogIcon} onNavigate={onNavigate} />
            </Group>

            <Group title="Tehnic">
                <NavCard title="Listă Sportivi" view="sportivi" icon={UsersIcon} onNavigate={onNavigate} />
                <NavCard title="Istoric Grade" view="grade" icon={BookOpenIcon} onNavigate={onNavigate} />
                <NavCard title="Note & Finalizare Examene" view="examene" icon={FileTextIcon} onNavigate={onNavigate} />
                <NavCard title="Generează Examen Nou" view="examene" icon={TrophyIcon} onNavigate={onNavigate} />
            </Group>
            
            {isAdminClub && (
                 <Group title="Financiar & Administrativ">
                    <NavCard title="Facturi Federație (FRQKD)" view="deconturi-federatie" icon={BanknotesIcon} onNavigate={onNavigate} />
                    <NavCard title="Încasări Abonamente" view="jurnal-incasari" icon={WalletIcon} onNavigate={onNavigate} />
                    <NavCard title="Politici Reducere" view="reduceri" icon={CogIcon} onNavigate={onNavigate} />
                    <NavCard title="Management Abonamente" view="tipuri-abonament" icon={CogIcon} onNavigate={onNavigate} />
                </Group>
            )}
        </div>
    );
};
