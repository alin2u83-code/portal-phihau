import React, { useState, useMemo, useEffect } from 'react';
import { Antrenament, Sportiv, Grupa, ProgramItem } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon, UsersIcon, SparklesIcon, ClockIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ListaPrezentaAntrenament, FormularPrezenta } from './ListaPrezentaAntrenament';
import { useAttendance } from '../hooks/useAttendance';
import { useStatusePrezenta } from '../hooks/useStatusePrezenta';
import { GeneratorProgramMasiv } from './GeneratorProgramMasiv';
import { useData } from '../contexts/DataContext';

import { DashboardPrezentaAzi } from './Prezenta/DashboardPrezentaAzi';
import { CalendarActivitati } from './Prezenta/CalendarActivitati';
import { OrarEditor } from './Prezenta/OrarEditor';
import { GrupeList } from './Prezenta/GrupeList';
import { IstoricPrezentaGlobal } from './Prezenta/IstoricPrezentaGlobal';
import { PrezentaRapida } from './Prezenta/PrezentaRapida';

type Tab = 'azi' | 'rapid' | 'grupe' | 'istoric';
type View = 'azi' | 'rapid' | 'grupe' | 'orar' | 'calendar' | 'prezenta' | 'prezenta-grupe' | 'istoric' | 'generator';
interface ViewState { view: View; id: string | null; }

const TAB_ROOTS: Record<Tab, View> = {
    azi: 'azi',
    rapid: 'rapid',
    grupe: 'grupe',
    istoric: 'istoric',
};

// --- Componenta Principală de Navigare ---
export const Prezenta: React.FC<{ onBack: () => void; onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, onViewSportiv }) => {
    const { currentUser } = useData();
    const { byId: statusById } = useStatusePrezenta();
    const [activeTab, setActiveTab] = useState<Tab>('azi');
    const [viewStack, setViewStack] = useState<ViewState[]>([{ view: 'azi', id: null }]);
    const [grupe, setGrupe] = useState<(Grupa & { program: ProgramItem[], sportivi_count: {count: number}[] })[]>([]);
    const [antrenamentDetaliu, setAntrenamentDetaliu] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();
    const { saveAttendance } = useAttendance();

    useEffect(() => {
        const fetchGrupe = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('grupe').select('*, program:orar_saptamanal(*), sportivi_count:sportivi(count)');
            if (error) showError("Eroare la încărcarea grupelor", error.message);
            else setGrupe(data as any || []);
            setLoading(false);
        };
        fetchGrupe();
    }, [showError]);

    const switchTab = (tab: Tab) => {
        setActiveTab(tab);
        setViewStack([{ view: TAB_ROOTS[tab], id: null }]);
    };

    const navigateTo = (view: View, id: string | null) => setViewStack(prev => [...prev, { view, id }]);

    const navigateBack = () => {
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
        } else {
            onBack();
        }
    };

    const handleSelectAntrenament = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase.from('program_antrenamente')
            .select('*, grupe(*, sportivi(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id, status_id)')
            .eq('id', id).single();
        if (error) { showError("Eroare", error.message); }
        else if (data) {
            const enriched = {
                ...data,
                prezenta: (data.prezenta || []).map((p: any) => ({
                    ...p,
                    status: p.status_id ? (statusById[p.status_id] ?? null) : null,
                })),
            };
            setAntrenamentDetaliu(enriched as any);
            navigateTo('prezenta', id);
            if (activeTab === 'rapid') setActiveTab('azi');
        }
        setLoading(false);
    };

    const currentView = viewStack[viewStack.length - 1];
    const selectedGrupa = useMemo(() => grupe.find(g => g.id === currentView.id), [grupe, currentView]);
    const isAtRoot = viewStack.length === 1;

    const renderContent = () => {
        switch (currentView.view) {
            case 'azi':
                return (
                    <DashboardPrezentaAzi
                        clubId={currentUser.club_id}
                        onSelectAntrenament={handleSelectAntrenament}
                        onMassGenerator={() => navigateTo('generator', null)}
                    />
                );
            case 'rapid':
                return <PrezentaRapida onSelectFull={handleSelectAntrenament} />;
            case 'grupe':
                return loading
                    ? <p className="text-white p-8 text-center">Se încarcă grupele...</p>
                    : (
                        <GrupeList
                            onSelect={id => navigateTo('orar', id)}
                            onSelectToday={id => navigateTo('prezenta-grupe', id)}
                            onGlobalHistory={() => switchTab('istoric')}
                            grupe={grupe}
                        />
                    );
            case 'orar':
                return selectedGrupa
                    ? <OrarEditor grupa={selectedGrupa} onNavigate={id => navigateTo('calendar', id)} onBack={navigateBack} setGrupe={setGrupe as any} />
                    : <p className="text-slate-400 p-8">Grupă negăsită.</p>;
            case 'calendar':
                return selectedGrupa
                    ? <CalendarActivitati grupa={selectedGrupa} onSelect={handleSelectAntrenament} onBack={navigateBack} grupe={grupe} />
                    : <p className="text-slate-400 p-8">Grupă negăsită.</p>;
            case 'prezenta':
                return antrenamentDetaliu
                    ? <FormularPrezenta antrenament={antrenamentDetaliu} onBack={navigateBack} saveAttendance={saveAttendance} onViewSportiv={onViewSportiv} />
                    : <p className="text-slate-400 p-8">Antrenament negăsit.</p>;
            case 'prezenta-grupe':
                return selectedGrupa
                    ? <ListaPrezentaAntrenament grupa={selectedGrupa} onBack={navigateBack} onViewSportiv={onViewSportiv} />
                    : <p className="text-slate-400 p-8">Grupă negăsită.</p>;
            case 'istoric':
                return <IstoricPrezentaGlobal onBack={navigateBack} onViewSportiv={onViewSportiv} />;
            case 'generator':
                return <GeneratorProgramMasiv onBack={navigateBack} clubId={currentUser.club_id} onNavigateToGrupe={() => switchTab('grupe')} />;
            default:
                return null;
        }
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'azi', label: 'Azi', icon: <CalendarDaysIcon className="w-4 h-4" /> },
        { id: 'rapid', label: 'Rapid', icon: <SparklesIcon className="w-4 h-4" /> },
        { id: 'grupe', label: 'Grupe', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'istoric', label: 'Istoric', icon: <ClockIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-4">
            {/* Top bar: back + tabs */}
            <div className="flex items-center gap-3">
                {!isAtRoot ? (
                    <button
                        onClick={navigateBack}
                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-slate-800 shrink-0"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Înapoi</span>
                    </button>
                ) : (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-slate-800 shrink-0"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Meniu</span>
                    </button>
                )}

                {/* Tab bar */}
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 flex-1 sm:flex-none">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none justify-center sm:justify-start whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {renderContent()}
        </div>
    );
};
