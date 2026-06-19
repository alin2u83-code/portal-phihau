import React, { useEffect } from 'react';
import { View, DecontFederatie, InscriereExamen, Plata, User } from '../types';
import { Card, Accordion, AccordionItem } from './ui';
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
    CalendarIcon,
    BuildingOfficeIcon,
    SitemapIcon,
    ClipboardListIcon,
    MessageSquareIcon,
    ClockIcon,
    TrendingUpIcon,
    MinusCircleIcon,
} from './icons';
import { useState } from 'react';
// SparklesIcon kept for Prezență Rapidă hero card
import { supabase } from '../supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useDataProvider } from '../hooks/useDataProvider';

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


interface AdminMasterMapProps {
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    inscrieriExamene: InscriereExamen[];
    plati: Plata[];
    currentUser: User | null;
}

export const AdminMasterMap: React.FC<AdminMasterMapProps> = ({ onNavigate, deconturiFederatie, inscrieriExamene, plati, currentUser }) => {
    const { activeRoleContext } = useDataProvider();
    const permissions = usePermissions(activeRoleContext);
    const [antrenamenteAzi, setAntrenamenteAzi] = React.useState<number | null>(null);
    const [openSection, setOpenSection] = useState<string>('membri');
    const handleToggle = (id: string) => setOpenSection(prev => prev === id ? '' : id);

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

            {/* Acordeon module */}
            <Accordion>
                <AccordionItem id="membri" title="Membri" icon={UsersIcon} isOpen={openSection === 'membri'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Sportivi" view="sportivi" icon={UsersIcon} onNavigate={onNavigate} />
                        <ItemCard title="Import Sportivi" view="import-sportivi" icon={ArchiveBoxIcon} onNavigate={onNavigate} />
                        <ItemCard title="Deduplicare Sportivi" view="deduplicare-sportivi" icon={ClipboardListIcon} onNavigate={onNavigate} />
                        <ItemCard title="Familii" view="familii" icon={UserPlusIcon} onNavigate={onNavigate} />
                        <ItemCard title="Legitimații" view="legitimatii" icon={FileTextIcon} onNavigate={onNavigate} />
                        <ItemCard title="Nomenclator Grade" view="grade" icon={BookOpenIcon} onNavigate={onNavigate} />
                        <ItemCard title="Administrare Staff" view="user-management" icon={CogIcon} onNavigate={onNavigate} />
                    </div>
                </AccordionItem>

                <AccordionItem id="activitate" title="Activitate Sală" icon={ArchiveBoxIcon} isOpen={openSection === 'activitate'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Grupe & Orar" view="grupe" icon={ArchiveBoxIcon} onNavigate={onNavigate} />
                        <ItemCard title="Program Antrenamente" view="program-antrenamente" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                        <ItemCard title="Înregistrare Prezențe" view="prezenta" icon={ClipboardCheckIcon} onNavigate={onNavigate} />
                        <ItemCard title="Raport Prezențe" view="raport-prezenta" icon={ChartBarIcon} onNavigate={onNavigate} />
                        <ItemCard title="Raport Lunar Prezențe" view="raport-lunar-prezenta" icon={ChartBarIcon} onNavigate={onNavigate} />
                        <ItemCard title="Generator Program" view="activitati" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                        <ItemCard title="Calendar" view="calendar" icon={CalendarIcon} onNavigate={onNavigate} />
                    </div>
                </AccordionItem>

                <AccordionItem id="examene" title="Examene & Competiții" icon={TrophyIcon} isOpen={openSection === 'examene'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Sesiuni Examene" view="examene" icon={TrophyIcon} onNavigate={onNavigate} badge={pendingExamPayments} />
                        <ItemCard title="Rapoarte Examen" view="rapoarte-examen" icon={FileTextIcon} onNavigate={onNavigate} />
                        <ItemCard title="Competiții" view="competitii" icon={TrophyIcon} onNavigate={onNavigate} />
                        <ItemCard title="Stagii Naționale" view="stagii" icon={BookMarkedIcon} onNavigate={onNavigate} />
                        <ItemCard title="Activități Naționale" view="activitati-nationale" icon={TrophyIcon} onNavigate={onNavigate} />
                    </div>
                </AccordionItem>

                <AccordionItem id="financiar" title="Financiar & Plăți" icon={WalletIcon} isOpen={openSection === 'financiar'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Dashboard Financiar" view="financial-dashboard" icon={TrendingUpIcon} onNavigate={onNavigate} />
                        <ItemCard title="Facturi & Plăți" view="plati-scadente" icon={WalletIcon} onNavigate={onNavigate} />
                        <ItemCard title="Gestiune Facturi" view="gestiune-facturi" icon={FileTextIcon} onNavigate={onNavigate} />
                        <ItemCard title="Jurnal Încasări" view="jurnal-incasari" icon={BanknotesIcon} onNavigate={onNavigate} />
                        <ItemCard title="Raport Financiar" view="raport-financiar" icon={ChartBarIcon} onNavigate={onNavigate} />
                        <ItemCard title="Taxe Anuale" view="taxe-anuale" icon={BanknotesIcon} onNavigate={onNavigate} />
                        <ItemCard title="Reduceri" view="reduceri" icon={MinusCircleIcon} onNavigate={onNavigate} />
                        <ItemCard title="Config. Abonamente" view="tipuri-abonament" icon={CogIcon} onNavigate={onNavigate} />
                        <ItemCard title="Configurare Prețuri" view="configurare-preturi" icon={CogIcon} onNavigate={onNavigate} />
                        <ItemCard title="Nomenclatoare" view="nomenclatoare" icon={BookOpenIcon} onNavigate={onNavigate} />
                        <ItemCard title="Deconturi Federație" view="deconturi-federatie" icon={BanknotesIcon} onNavigate={onNavigate} badge={pendingDeconturi} />
                    </div>
                </AccordionItem>

                <AccordionItem id="setari" title="Setări & Admin" icon={CogIcon} isOpen={openSection === 'setari'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Setări Club" view="setari-club" icon={CogIcon} onNavigate={onNavigate} />
                        <ItemCard title="Notificări" view="notificari" icon={ClipboardCheckIcon} onNavigate={onNavigate} />
                        <ItemCard title="SMS" view="admin-sms" icon={MessageSquareIcon} onNavigate={onNavigate} />
                        <ItemCard title="Cereri Înscriere" view="cereri-inscriere" icon={UserPlusIcon} onNavigate={onNavigate} />
                        <ItemCard title="Istoric Activitate" view="istoric-activitate" icon={ClockIcon} onNavigate={onNavigate} />
                        <ItemCard title="Setări Cont" view="account-settings" icon={CogIcon} onNavigate={onNavigate} />
                    </div>
                </AccordionItem>

                {permissions.isFederationAdmin && (
                    <AccordionItem id="superadmin" title="Administrare Federație" icon={BuildingOfficeIcon} isOpen={openSection === 'superadmin'} onToggle={handleToggle}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <ItemCard title="Gestiune Cluburi" view="cluburi" icon={BuildingOfficeIcon} onNavigate={onNavigate} />
                            <ItemCard title="Structură Federație" view="structura-federatie" icon={SitemapIcon} onNavigate={onNavigate} />
                            <ItemCard title="Template Probe" view="template-probe" icon={FileTextIcon} onNavigate={onNavigate} />
                            <ItemCard title="Mentenanță Date" view="data-maintenance" icon={ArchiveBoxIcon} onNavigate={onNavigate} />
                            <ItemCard title="Înlănțuiri Grade" view="inlantuiri-admin" icon={BookMarkedIcon} onNavigate={onNavigate} />
                        </div>
                    </AccordionItem>
                )}
            </Accordion>
        </div>
    );
};
