import React from 'react';
import { View, DecontFederatie, InscriereExamen, Plata } from '../types';
import { Card } from './ui';
import { 
    UsersIcon, 
    ArchiveBoxIcon, 
    CalendarDaysIcon, 
    ClipboardCheckIcon, 
    TrophyIcon, 
    WalletIcon, 
    BanknotesIcon, 
    CogIcon,
    UserPlusIcon,
    BookOpenIcon,
    ChartBarIcon,
    BookMarkedIcon,
    FileTextIcon
} from './icons';

const ItemCard: React.FC<{ title: string; view: View; icon: React.ElementType; badge?: number; onNavigate: (view: View) => void; }> = ({ title, view, icon: Icon, badge, onNavigate }) => (
    <div onClick={() => onNavigate(view)} className="relative bg-[var(--bg-card)] p-6 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-slate-700/50 transition-colors border border-slate-800">
        <Icon className="w-8 h-8 text-amber-400 shrink-0" />
        <span className="font-bold text-slate-200 text-base">{title}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-slate-800">
                {badge > 9 ? '9+' : badge}
            </span>
        )}
    </div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card className="border-slate-800">
        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-amber-400/30 pb-2">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {children}
        </div>
    </Card>
);

interface AdminMasterMapProps {
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    inscrieriExamene: InscriereExamen[];
    plati: Plata[];
}

export const AdminMasterMap: React.FC<AdminMasterMapProps> = ({ onNavigate, deconturiFederatie, inscrieriExamene, plati }) => {

    const pendingDeconturi = React.useMemo(() => 
        (deconturiFederatie || []).filter(d => d.status === 'In asteptare').length, 
    [deconturiFederatie]);

    const pendingExamPayments = React.useMemo(() => 
        (inscrieriExamene || []).filter(i => {
            if (!i.plata_id) return false;
            const p = (plati || []).find(pl => pl.id === i.plata_id);
            return p && p.status !== 'Achitat';
        }).length,
    [inscrieriExamene, plati]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Group title="Gestiune Membri">
                <ItemCard title="Sportivi" view="sportivi" icon={UsersIcon} onNavigate={onNavigate} />
                <ItemCard title="Familii" view="familii" icon={UserPlusIcon} onNavigate={onNavigate} />
                <ItemCard title="Nomenclator Grade" view="grade" icon={BookOpenIcon} onNavigate={onNavigate} />
                <ItemCard title="Administrare Staff" view="user-management" icon={CogIcon} onNavigate={onNavigate} />
            </Group>

            <Group title="Activitate Sală">
                <ItemCard title="Grupe & Orar" view="grupe" icon={ArchiveBoxIcon} onNavigate={onNavigate} />
                <ItemCard title="Generator Program" view="activitati" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                <ItemCard title="Înregistrare Prezențe" view="prezenta" icon={ClipboardCheckIcon} onNavigate={onNavigate} />
                <ItemCard title="Raport Prezențe" view="raport-prezenta" icon={ChartBarIcon} onNavigate={onNavigate} />
            </Group>

            <Group title="Evenimente & Examene">
                <ItemCard title="Sesiuni Examene" view="examene" icon={TrophyIcon} onNavigate={onNavigate} badge={pendingExamPayments} />
                <ItemCard title="Stagii & Competiții" view="stagii" icon={BookMarkedIcon} onNavigate={onNavigate} />
                <ItemCard title="Rapoarte Examen" view="rapoarte-examen" icon={FileTextIcon} onNavigate={onNavigate} />
            </Group>

            <Group title="Administrativ & Plăți">
                <ItemCard title="Facturi & Plăți" view="plati-scadente" icon={WalletIcon} onNavigate={onNavigate} />
                <ItemCard title="Facturi Federale" view="deconturi-federatie" icon={BanknotesIcon} onNavigate={onNavigate} badge={pendingDeconturi} />
                <ItemCard title="Config. Abonamente" view="tipuri-abonament" icon={CogIcon} onNavigate={onNavigate} />
                <ItemCard title="Configurare Prețuri" view="configurare-preturi" icon={CogIcon} onNavigate={onNavigate} />
            </Group>
        </div>
    );
};
