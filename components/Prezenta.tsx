import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, ProgramItem, User } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, CogIcon, CalendarDaysIcon, UsersIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ListaPrezentaAntrenament, FormularPrezenta } from './ListaPrezentaAntrenament';
import { useCalendarView } from '../hooks/useCalendarView';
import { AntrenamentForm } from './AntrenamentForm';
import { useAttendance } from '../hooks/useAttendance';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { GeneratorProgramMasiv } from './GeneratorProgramMasiv';
import { useData } from '../contexts/DataContext';
import { ResponsiveTable, Column } from './ResponsiveTable';

import { DashboardPrezentaAzi } from './Prezenta/DashboardPrezentaAzi';
import { CalendarActivitati } from './Prezenta/CalendarActivitati';
import { OrarEditor } from './Prezenta/OrarEditor';
import { GrupeList } from './Prezenta/GrupeList';
import { IstoricPrezentaGlobal } from './Prezenta/IstoricPrezentaGlobal';

type View = 'grupe' | 'orar' | 'calendar' | 'prezenta' | 'istoric-global' | 'prezenta-azi' | 'prezenta-azi-global' | 'generator-masiv';
interface ViewState { view: View; id: string | null; }

// --- Componenta Principală de Navigare ---
export const Prezenta: React.FC<{ onBack: () => void; onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, onViewSportiv }) => {
    const { currentUser } = useData();
    const [viewStack, setViewStack] = useState<ViewState[]>([{ view: 'prezenta-azi-global', id: null }]);
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

    const navigateTo = (view: View, id: string | null) => setViewStack(prev => [...prev, { view, id }]);
    const navigateBack = () => { if (viewStack.length > 1) setViewStack(prev => prev.slice(0, -1)); else onBack(); };
    
    const handleSelectAntrenament = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase.from('program_antrenamente')
            .select('*, grupe(*, sportivi(*)), prezenta:prezenta_antrenament(sportiv_id, status)')
            .eq('id', id).single();
        if(error) { showError("Eroare", error.message); }
        else if (data) {
            setAntrenamentDetaliu(data as any);
            navigateTo('prezenta', id);
        }
        setLoading(false);
    };

    const currentView = viewStack[viewStack.length - 1];
    const selectedGrupa = useMemo(() => grupe.find(g => g.id === currentView.id), [grupe, currentView]);

    const renderContent = () => {
        if (loading && currentView.view === 'grupe') return <p className="text-white p-8">Se încarcă grupele...</p>;
        
        switch (currentView.view) {
            case 'prezenta-azi-global': 
                return (
                    <DashboardPrezentaAzi 
                        clubId={currentUser.club_id} 
                        onSelectAntrenament={handleSelectAntrenament}
                        onViewGrupe={() => navigateTo('grupe', null)}
                        onGlobalHistory={() => navigateTo('istoric-global', 'all')}
                        onMassGenerator={() => navigateTo('generator-masiv', null)}
                    />
                );
            case 'grupe': 
                return (
                    <GrupeList 
                        onSelect={id => navigateTo('orar', id)} 
                        onSelectToday={id => navigateTo('prezenta-azi', id)} 
                        onGlobalHistory={() => navigateTo('istoric-global', 'all')} 
                        grupe={grupe} 
                    />
                );
            case 'orar': return selectedGrupa ? <OrarEditor grupa={selectedGrupa} onNavigate={id => navigateTo('calendar', id)} onBack={navigateBack} setGrupe={setGrupe as any}/> : <p>Grupă negăsită.</p>;
            case 'calendar': return selectedGrupa ? <CalendarActivitati grupa={selectedGrupa} onSelect={handleSelectAntrenament} onBack={navigateBack} grupe={grupe}/> : <p>Grupă negăsită.</p>;
            case 'prezenta': return antrenamentDetaliu ? <FormularPrezenta antrenament={antrenamentDetaliu} onBack={navigateBack} saveAttendance={saveAttendance} onViewSportiv={onViewSportiv}/> : <p>Antrenament negăsit.</p>;
            case 'prezenta-azi': return selectedGrupa ? <ListaPrezentaAntrenament grupa={selectedGrupa} onBack={navigateBack} onViewSportiv={onViewSportiv} /> : <p>Grupă negăsită.</p>;
            case 'istoric-global': return <IstoricPrezentaGlobal onBack={navigateBack} onViewSportiv={onViewSportiv} />;
            case 'generator-masiv': return <GeneratorProgramMasiv onBack={navigateBack} clubId={currentUser.club_id} onNavigateToGrupe={() => navigateTo('grupe', null)} />;
            default: return null;
        }
    };

    return <div>{renderContent()}</div>;
};