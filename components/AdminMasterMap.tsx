import React, { useEffect, useState } from 'react';
import { View, DecontFederatie, InscriereExamen, Plata, User } from '../types';
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
    FileTextIcon,
    SparklesIcon,
    ChevronRightIcon,
} from './icons';
// SparklesIcon kept for Prezență Rapidă hero card
import { supabase } from '../supabaseClient';

// --- Item card compact ---
const ItemCard: React.FC<{
    title: string;
    view: View;
    icon: React.ElementType;
    badge?: number;
    onNavigate: (view: View) => void;
}> = ({ title, view, icon: Icon, badge, onNavigate }) => (
    <div
        onClick={() => onNavigate(view)}
        className="relative bg-slate-800/60 p-4 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-slate-700/70 transition-colors border border-slate-700/50 hover:border-amber-400/40"
    >
        <Icon className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="font-medium text-slate-200 text-sm">{title}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {badge > 9 ? '9+' : badge}
            </span>
        )}
    </div>
);

// --- Group card ---
const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {children}
        </div>
    </div>
);

interface AdminMasterMapProps {
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    inscrieriExamene: InscriereExamen[];
    plati: Plata[];
    currentUser: User | null;
}

export const AdminMasterMap: React.FC<AdminMasterMapProps> = ({ onNavigate, deconturiFederatie, inscrieriExamene, plati, currentUser }) => {
    const [antrenamenteAzi, setAntrenamenteAzi] = useState<number | null>(null);

    const pendingDeconturi = React.useMemo(() =>
        (deconturiFederatie || []).filter(d => d.status_plata === 'In asteptare').length,
    [deconturiFederatie]);

    const pendingExamPayments = React.useMemo(() =>
        (inscrieriExamene || []).filter(i => {
            if (!i.plata_id) return false;
            const p = (plati || []).find(pl => pl.id === i.plata_id);
            return p && p.status !== 'Achitat';
        }).length,
    [inscrieriExamene, plati]);

    useEffect(() => {
        const today = new Date().toLocaleDateString('sv-SE');
        let query = supabase
            .from('program_antrenamente')
            .select('id', { count: 'exact', head: true })
            .eq('data', today);
        if (currentUser?.club_id) query = query.eq('club_id', currentUser.club_id);
        query.then(({ count }) => setAntrenamenteAzi(count ?? 0));
    }, [currentUser?.club_id]);

    return (
        <div className="space-y-6">
            {/* Hero: Prezență Rapidă */}
            <div
                onClick={() => onNavigate('prezenta')}
                className="group relative overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-900/40 via-slate-800/60 to-slate-900 p-5 cursor-pointer hover:border-emerald-400/70 hover:from-emerald-900/60 transition-all duration-200"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
                            <SparklesIcon className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">Prezență Rapidă</p>
                            <p className="text-sm text-emerald-300/80">
                                {antrenamenteAzi === null
                                    ? 'Se încarcă...'
                                    : antrenamenteAzi === 0
                                    ? 'Niciun antrenament programat azi'
                                    : `${antrenamenteAzi} antrenament${antrenamenteAzi > 1 ? 'e' : ''} programat${antrenamenteAzi > 1 ? 'e' : ''} azi`}
                            </p>
                        </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
                {antrenamenteAzi !== null && antrenamenteAzi > 0 && (
                    <div className="absolute top-0 right-0 w-32 h-full opacity-10">
                        <ClipboardCheckIcon className="w-full h-full text-emerald-300" />
                    </div>
                )}
            </div>

            {/* Grid principal 2 coloane */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Group title="Membri">
                    <ItemCard title="Sportivi" view="sportivi" icon={UsersIcon} onNavigate={onNavigate} />
                    <ItemCard title="Familii" view="familii" icon={UserPlusIcon} onNavigate={onNavigate} />
                    <ItemCard title="Nomenclator Grade" view="grade" icon={BookOpenIcon} onNavigate={onNavigate} />
                    <ItemCard title="Administrare Staff" view="user-management" icon={CogIcon} onNavigate={onNavigate} />
                </Group>

                <Group title="Activitate Sală">
                    <ItemCard title="Grupe & Orar" view="grupe" icon={ArchiveBoxIcon} onNavigate={onNavigate} />
                    <ItemCard title="Program Antrenamente" view="program-antrenamente" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                    <ItemCard title="Raport Prezențe" view="raport-prezenta" icon={ChartBarIcon} onNavigate={onNavigate} />
                    <ItemCard title="Generator Program" view="activitati" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                </Group>

                <Group title="Examene & Competiții">
                    <ItemCard title="Sesiuni Examene" view="examene" icon={TrophyIcon} onNavigate={onNavigate} badge={pendingExamPayments} />
                    <ItemCard title="Stagii & Competiții" view="stagii" icon={BookMarkedIcon} onNavigate={onNavigate} />
                    <ItemCard title="Rapoarte Examen" view="rapoarte-examen" icon={FileTextIcon} onNavigate={onNavigate} />
                </Group>

                <Group title="Administrativ & Plăți">
                    <ItemCard title="Facturi & Plăți" view="plati-scadente" icon={WalletIcon} onNavigate={onNavigate} />
                    <ItemCard title="Raport Financiar" view="raport-financiar" icon={ChartBarIcon} onNavigate={onNavigate} />
                    <ItemCard title="Facturi Federale" view="deconturi-federatie" icon={BanknotesIcon} onNavigate={onNavigate} badge={pendingDeconturi} />
                    <ItemCard title="Configurare" view="tipuri-abonament" icon={CogIcon} onNavigate={onNavigate} />
                </Group>
            </div>
        </div>
    );
};
