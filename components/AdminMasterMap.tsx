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
import { useQuickAccess } from '../hooks/useQuickAccess';
import { QuickAccess } from './QuickAccess';
import { StarIcon } from './icons';

// --- Item card compact ---
const ItemCard: React.FC<{
    title: string;
    view: View;
    icon: React.ElementType;
    badge?: number;
    isFavorite?: boolean;
    onNavigate: (view: View) => void;
    onToggleFavorite?: (view: View) => void;
}> = ({ title, view, icon: Icon, badge, isFavorite, onNavigate, onToggleFavorite }) => (
    <div
        onClick={() => onNavigate(view)}
        className="relative bg-slate-800/60 p-4 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-slate-700/70 transition-colors border border-slate-700/50 hover:border-amber-400/40 group"
    >
        <Icon className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="font-medium text-slate-200 text-sm">{title}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute bottom-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {badge > 9 ? '9+' : badge}
            </span>
        )}
        {onToggleFavorite && (
            <button
                type="button"
                onClick={e => { e.stopPropagation(); onToggleFavorite(view); }}
                className={`absolute top-1.5 right-1.5 p-0.5 rounded transition-opacity ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title={isFavorite ? 'Elimină din preferate' : 'Adaugă la preferate'}
            >
                <StarIcon className={`w-3.5 h-3.5 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
            </button>
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
    const { favorites, toggleFavorite, trackView } = useQuickAccess(currentUser?.id || 'anonymous');
    const [antrenamenteAzi, setAntrenamenteAzi] = React.useState<number | null>(null);

    const labelMap: Record<string, string> = {
        'sportivi': 'Sportivi', 'import-sportivi': 'Import Sportivi', 'deduplicare-sportivi': 'Deduplicare',
        'familii': 'Familii', 'legitimatii': 'Legitimații', 'grade': 'Nomenclator Grade',
        'user-management': 'Administrare Staff', 'grupe': 'Grupe & Orar',
        'program-antrenamente': 'Program Antrenamente', 'prezenta': 'Înregistrare Prezențe',
        'raport-prezenta': 'Raport Prezențe', 'raport-lunar-prezenta': 'Raport Lunar',
        'activitati': 'Generator Program', 'calendar': 'Calendar',
        'examene': 'Sesiuni Examene', 'rapoarte-examen': 'Rapoarte Examen',
        'competitii': 'Competiții', 'stagii': 'Stagii Naționale',
        'activitati-nationale': 'Activități Naționale', 'financial-dashboard': 'Dashboard Financiar',
        'plati-scadente': 'Facturi & Plăți', 'gestiune-facturi': 'Gestiune Facturi',
        'jurnal-incasari': 'Jurnal Încasări', 'raport-financiar': 'Raport Financiar',
        'taxe-anuale': 'Taxe Anuale', 'reduceri': 'Reduceri',
        'tipuri-abonament': 'Config. Abonamente', 'configurare-preturi': 'Configurare Prețuri',
        'nomenclatoare': 'Nomenclatoare', 'deconturi-federatie': 'Deconturi Federație',
        'setari-club': 'Setări Club', 'notificari': 'Notificări', 'admin-sms': 'SMS',
        'cereri-inscriere': 'Cereri Înscriere', 'istoric-activitate': 'Istoric Activitate',
        'account-settings': 'Setări Cont', 'cluburi': 'Gestiune Cluburi',
        'structura-federatie': 'Structură Federație', 'template-probe': 'Template Probe',
        'data-maintenance': 'Mentenanță Date', 'inlantuiri-admin': 'Înlănțuiri Grade',
    };

    const nav = (view: View) => { trackView(view); onNavigate(view); };
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
            <QuickAccess userId={currentUser?.id || 'anonymous'} onNavigate={onNavigate} labelMap={labelMap} />
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
                        <ItemCard title="Sportivi" view="sportivi" icon={UsersIcon} onNavigate={nav} isFavorite={favorites.includes('sportivi')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Import Sportivi" view="import-sportivi" icon={ArchiveBoxIcon} onNavigate={nav} isFavorite={favorites.includes('import-sportivi')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Deduplicare Sportivi" view="deduplicare-sportivi" icon={ClipboardListIcon} onNavigate={nav} isFavorite={favorites.includes('deduplicare-sportivi')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Familii" view="familii" icon={UserPlusIcon} onNavigate={nav} isFavorite={favorites.includes('familii')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Legitimații" view="legitimatii" icon={FileTextIcon} onNavigate={nav} isFavorite={favorites.includes('legitimatii')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Nomenclator Grade" view="grade" icon={BookOpenIcon} onNavigate={nav} isFavorite={favorites.includes('grade')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Administrare Staff" view="user-management" icon={CogIcon} onNavigate={nav} isFavorite={favorites.includes('user-management')} onToggleFavorite={toggleFavorite} />
                    </div>
                </AccordionItem>

                <AccordionItem id="activitate" title="Activitate Sală" icon={ArchiveBoxIcon} isOpen={openSection === 'activitate'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Grupe & Orar" view="grupe" icon={ArchiveBoxIcon} onNavigate={nav} isFavorite={favorites.includes('grupe')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Program Antrenamente" view="program-antrenamente" icon={CalendarDaysIcon} onNavigate={nav} isFavorite={favorites.includes('program-antrenamente')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Înregistrare Prezențe" view="prezenta" icon={ClipboardCheckIcon} onNavigate={nav} isFavorite={favorites.includes('prezenta')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Raport Prezențe" view="raport-prezenta" icon={ChartBarIcon} onNavigate={nav} isFavorite={favorites.includes('raport-prezenta')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Raport Lunar Prezențe" view="raport-lunar-prezenta" icon={ChartBarIcon} onNavigate={nav} isFavorite={favorites.includes('raport-lunar-prezenta')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Generator Program" view="activitati" icon={CalendarDaysIcon} onNavigate={nav} isFavorite={favorites.includes('activitati')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Calendar" view="calendar" icon={CalendarIcon} onNavigate={nav} isFavorite={favorites.includes('calendar')} onToggleFavorite={toggleFavorite} />
                    </div>
                </AccordionItem>

                <AccordionItem id="examene" title="Examene & Competiții" icon={TrophyIcon} isOpen={openSection === 'examene'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Sesiuni Examene" view="examene" icon={TrophyIcon} onNavigate={nav} badge={pendingExamPayments} isFavorite={favorites.includes('examene')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Rapoarte Examen" view="rapoarte-examen" icon={FileTextIcon} onNavigate={nav} isFavorite={favorites.includes('rapoarte-examen')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Competiții" view="competitii" icon={TrophyIcon} onNavigate={nav} isFavorite={favorites.includes('competitii')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Stagii Naționale" view="stagii" icon={BookMarkedIcon} onNavigate={nav} isFavorite={favorites.includes('stagii')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Activități Naționale" view="activitati-nationale" icon={TrophyIcon} onNavigate={nav} isFavorite={favorites.includes('activitati-nationale')} onToggleFavorite={toggleFavorite} />
                    </div>
                </AccordionItem>

                <AccordionItem id="financiar" title="Financiar & Plăți" icon={WalletIcon} isOpen={openSection === 'financiar'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Dashboard Financiar" view="financial-dashboard" icon={TrendingUpIcon} onNavigate={nav} isFavorite={favorites.includes('financial-dashboard')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Facturi & Plăți" view="plati-scadente" icon={WalletIcon} onNavigate={nav} isFavorite={favorites.includes('plati-scadente')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Gestiune Facturi" view="gestiune-facturi" icon={FileTextIcon} onNavigate={nav} isFavorite={favorites.includes('gestiune-facturi')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Jurnal Încasări" view="jurnal-incasari" icon={BanknotesIcon} onNavigate={nav} isFavorite={favorites.includes('jurnal-incasari')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Raport Financiar" view="raport-financiar" icon={ChartBarIcon} onNavigate={nav} isFavorite={favorites.includes('raport-financiar')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Taxe Anuale" view="taxe-anuale" icon={BanknotesIcon} onNavigate={nav} isFavorite={favorites.includes('taxe-anuale')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Reduceri" view="reduceri" icon={MinusCircleIcon} onNavigate={nav} isFavorite={favorites.includes('reduceri')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Config. Abonamente" view="tipuri-abonament" icon={CogIcon} onNavigate={nav} isFavorite={favorites.includes('tipuri-abonament')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Configurare Prețuri" view="configurare-preturi" icon={CogIcon} onNavigate={nav} isFavorite={favorites.includes('configurare-preturi')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Nomenclatoare" view="nomenclatoare" icon={BookOpenIcon} onNavigate={nav} isFavorite={favorites.includes('nomenclatoare')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Deconturi Federație" view="deconturi-federatie" icon={BanknotesIcon} onNavigate={nav} badge={pendingDeconturi} isFavorite={favorites.includes('deconturi-federatie')} onToggleFavorite={toggleFavorite} />
                    </div>
                </AccordionItem>

                <AccordionItem id="setari" title="Setări & Admin" icon={CogIcon} isOpen={openSection === 'setari'} onToggle={handleToggle}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ItemCard title="Setări Club" view="setari-club" icon={CogIcon} onNavigate={nav} isFavorite={favorites.includes('setari-club')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Notificări" view="notificari" icon={ClipboardCheckIcon} onNavigate={nav} isFavorite={favorites.includes('notificari')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="SMS" view="admin-sms" icon={MessageSquareIcon} onNavigate={nav} isFavorite={favorites.includes('admin-sms')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Cereri Înscriere" view="cereri-inscriere" icon={UserPlusIcon} onNavigate={nav} isFavorite={favorites.includes('cereri-inscriere')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Istoric Activitate" view="istoric-activitate" icon={ClockIcon} onNavigate={nav} isFavorite={favorites.includes('istoric-activitate')} onToggleFavorite={toggleFavorite} />
                        <ItemCard title="Setări Cont" view="account-settings" icon={CogIcon} onNavigate={nav} isFavorite={favorites.includes('account-settings')} onToggleFavorite={toggleFavorite} />
                    </div>
                </AccordionItem>

                {permissions.isFederationAdmin && (
                    <AccordionItem id="superadmin" title="Administrare Federație" icon={BuildingOfficeIcon} isOpen={openSection === 'superadmin'} onToggle={handleToggle}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <ItemCard title="Gestiune Cluburi" view="cluburi" icon={BuildingOfficeIcon} onNavigate={nav} isFavorite={favorites.includes('cluburi')} onToggleFavorite={toggleFavorite} />
                            <ItemCard title="Structură Federație" view="structura-federatie" icon={SitemapIcon} onNavigate={nav} isFavorite={favorites.includes('structura-federatie')} onToggleFavorite={toggleFavorite} />
                            <ItemCard title="Template Probe" view="template-probe" icon={FileTextIcon} onNavigate={nav} isFavorite={favorites.includes('template-probe')} onToggleFavorite={toggleFavorite} />
                            <ItemCard title="Mentenanță Date" view="data-maintenance" icon={ArchiveBoxIcon} onNavigate={nav} isFavorite={favorites.includes('data-maintenance')} onToggleFavorite={toggleFavorite} />
                            <ItemCard title="Înlănțuiri Grade" view="inlantuiri-admin" icon={BookMarkedIcon} onNavigate={nav} isFavorite={favorites.includes('inlantuiri-admin')} onToggleFavorite={toggleFavorite} />
                        </div>
                    </AccordionItem>
                )}
            </Accordion>
        </div>
    );
};


