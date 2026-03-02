import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, ProgramItem, User } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, CogIcon, CalendarDaysIcon, UsersIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ListaPrezentaAntrenament, FormularPrezenta } from './ListaPrezentaAntrenament';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { AntrenamentForm } from './AntrenamentForm';

type View = 'grupe' | 'orar' | 'calendar' | 'prezenta' | 'istoric-global' | 'prezenta-azi' | 'prezenta-azi-global';
interface ViewState { view: View; id: string | null; }

// --- Dashboard Prezență Azi (Global) ---
const DashboardPrezentaAzi: React.FC<{ 
    onSelectAntrenament: (id: string) => void;
    onViewGrupe: () => void;
    onGlobalHistory: () => void;
    clubId: string | null;
}> = ({ onSelectAntrenament, onViewGrupe, onGlobalHistory, clubId }) => {
    const { todaysTrainings, allTrainings, loading } = useAttendanceData(clubId);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Prezență Astăzi</h1>
                    <p className="text-slate-400 mt-1">
                        {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onViewGrupe}>
                        <UsersIcon className="w-5 h-5 mr-2 text-indigo-400" />
                        Vezi Grupe
                    </Button>
                    <Button variant="secondary" onClick={onGlobalHistory}>
                        <CalendarDaysIcon className="w-5 h-5 mr-2 text-purple-400" />
                        Istoric Global
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                                Programul Zilei
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">Total: {allTrainings.length}</span>
                                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
                                    {todaysTrainings.length} Azi
                                </span>
                            </div>
                        </div>
                        <div className="p-6">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : todaysTrainings.length === 0 ? (
                                <div className="space-y-6">
                                    <div className="text-center py-12 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                        <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                                        <p className="text-slate-500 italic">Niciun antrenament programat pentru astăzi.</p>
                                        <p className="text-xs text-slate-600 mt-2">Verifică calendarul sau orarul pentru alte zile.</p>
                                    </div>

                                    {/* Show recent trainings if today is empty */}
                                    <div className="pt-6 border-t border-slate-800/50">
                                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Antrenamente Recente (Istoric)</h3>
                                        <div className="space-y-3">
                                            {(allTrainings as any[])
                                                .filter(a => new Date(a.data) < new Date())
                                                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                                                .slice(0, 5)
                                                .map(a => (
                                                    <div key={a.id} className="p-4 bg-slate-800/20 rounded-xl border border-slate-800/50 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-white font-bold">{a.grupe?.denumire || 'Grupă'}</p>
                                                            <p className="text-xs text-slate-500">{new Date(a.data).toLocaleDateString('ro-RO')} • {a.ora_start}</p>
                                                        </div>
                                                        <Button size="sm" variant="secondary" onClick={() => onSelectAntrenament(a.id)}>
                                                            Vezi Prezență
                                                        </Button>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {todaysTrainings.map(a => (
                                        <div key={a.id} className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                    <span className="text-xs font-black uppercase leading-none mb-1">Ora</span>
                                                    <span className="text-sm font-bold">{a.ora_start}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white leading-tight">{(a as any).grupe?.denumire || 'Grupă necunoscută'}</h3>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                        <UsersIcon className="w-3 h-3" />
                                                        {(a as any).grupe?.sala || 'Sală nespecificată'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => onSelectAntrenament(a.id)} className="w-full sm:w-auto shadow-lg shadow-indigo-500/10">
                                                Bifează Prezența &rarr;
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-sm p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                            Statistici Azi
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Sportivi Așteptați</p>
                                <p className="text-3xl font-black text-white">
                                    {todaysTrainings.reduce((acc, a) => acc + ((a as any).grupe?.sportivi_count?.[0]?.count || 0), 0)}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Prezențe Înregistrate</p>
                                <p className="text-3xl font-black text-emerald-400">
                                    {todaysTrainings.reduce((acc, a) => acc + (a.prezenta?.length || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- PASUL 3: Calendar Activități (Instanțe Reale) ---
const CalendarActivitati: React.FC<{
    grupa: Grupa; onSelect: (id: string) => void; onBack: () => void; grupe: Grupa[]
}> = ({ grupa, onSelect, onBack, grupe }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [daysToGenerate, setDaysToGenerate] = useState(30);
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { showError, showSuccess } = useError();

    const fetchAntrenamente = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('program_antrenamente')
            .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)')
            .eq('grupa_id', grupa.id).eq('data', date).order('ora_start');
        if (error) showError("Eroare la încărcarea calendarului", error.message);
        else setAntrenamente((data || []).map(a => ({...a, prezenta: a.prezenta || []})));
        setLoading(false);
    }, [grupa.id, date, showError]);

    useEffect(() => { fetchAntrenamente(); }, [fetchAntrenamente]);
    
    const handleGenerate = async () => {
        setLoading(true);
        const { error } = await supabase.rpc('genereaza_antrenamente_din_orar', { 
            p_zile_in_avans: daysToGenerate,
            p_grupa_id: grupa.id 
        });
        
        if (error) {
            const { error: error2 } = await supabase.rpc('genereaza_antrenamente_din_orar', { 
                p_zile_in_avans: daysToGenerate 
            });
            if (error2) showError("Eroare RPC", error2.message);
            else { 
                showSuccess("Succes", `Calendarul a fost populat pentru următoarele ${daysToGenerate} zile (Global).`); 
                await fetchAntrenamente(); 
            }
        } else { 
            showSuccess("Succes", `Calendarul a fost populat pentru următoarele ${daysToGenerate} zile.`); 
            await fetchAntrenamente(); 
        }
        setLoading(false);
    };

    const handleSaveCustom = async (data: any) => {
        if (data.is_recurent) {
            const { error } = await supabase.from('orar_saptamanal').insert({
                ziua: data.ziua,
                ora_start: data.ora_start,
                ora_sfarsit: data.ora_sfarsit,
                grupa_id: data.grupa_id,
                club_id: grupa.club_id,
                is_activ: true
            });
            if (error) showError("Eroare la salvare orar", error.message);
            else {
                showSuccess("Succes", "Antrenamentul recurent a fost adăugat în orar.");
                await handleGenerate();
            }
        } else {
            const { data: newAntrenament, error } = await supabase.from('program_antrenamente').insert(data).select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)').single();
            if (error) showError("Eroare", error.message);
            else if (newAntrenament) {
                showSuccess("Succes", "Antrenamentul personalizat a fost adăugat.");
                await fetchAntrenamente();
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi la Orar
            </Button>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                        Calendar Activități: <span className="text-indigo-300">{grupa.denumire}</span>
                    </h2>
                    <p className="text-slate-400 mt-1">Gestionează instanțele reale de antrenament și prezența.</p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                        <Input label="Afișează data" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        <Input label="Zile în avans" type="number" value={daysToGenerate} onChange={e => setDaysToGenerate(parseInt(e.target.value) || 0)} />
                        <Button onClick={handleGenerate} isLoading={loading} className="w-full">Generează Calendar</Button>
                        <Button variant="info" onClick={() => setIsFormOpen(true)} className="w-full">+ Adaugă Antrenament</Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Antrenamente Programate</h3>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : antrenamente.length === 0 ? (
                            <div className="text-center py-12 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                                <p className="text-slate-500 italic">Niciun antrenament programat pentru această dată.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {antrenamente.map(a => (
                                    <div key={a.id} className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.is_recurent ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                <CalendarDaysIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${a.is_recurent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {a.is_recurent ? 'Recurent' : 'Personalizat'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">#{a.id.slice(0, 8)}</span>
                                                </div>
                                                <p className="text-lg font-bold text-white leading-none">{a.ora_start} - {a.ora_sfarsit}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => onSelect(a.id)} className="w-full sm:w-auto shadow-lg shadow-indigo-500/10">
                                            Bifează Prezența &rarr;
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            <AntrenamentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveCustom} grupaId={grupa.id} grupe={grupe} />
        </div>
    );
};


// --- PASUL 2: Editor Orar Săptămânal (Template) ---
const OrarEditor: React.FC<{ grupa: Grupa & {program: ProgramItem[]}; onNavigate: (id: string) => void; onBack: () => void; setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>> }> = ({ grupa, onNavigate, onBack, setGrupe }) => {
    const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    
    const handleSave = async () => {
        setLoading(true);
        try {
            await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
            const toInsert = program.map(({ id, ...rest }) => ({ ...rest, grupa_id: grupa.id, club_id: grupa.club_id }));
            if (toInsert.length > 0) {
                const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
                if (error) throw error;
            }
            setGrupe(prev => prev.map(g => g.id === grupa.id ? { ...g, program: program } : g));
            showSuccess("Succes", "Orarul a fost salvat.");
        } catch (error: any) {
            showError("Eroare la salvare orar", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = (zi: ProgramItem['ziua'] = 'Luni') => setProgram(p => [...p, { id: `new-${Date.now()}`, ziua: zi, ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true }]);
    const handleRemoveItem = (id: string) => setProgram(p => p.filter(item => item.id !== id));
    const handleItemChange = (id: string, field: keyof ProgramItem, value: any) => setProgram(p => p.map(item => item.id === id ? { ...item, [field]: value } : item));

    const programByDay = useMemo(() => {
        const grouped: Record<string, ProgramItem[]> = {};
        zileSaptamana.forEach(zi => grouped[zi] = program.filter(p => p.ziua === zi));
        return grouped;
    }, [program, zileSaptamana]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <Button onClick={onBack} variant="secondary" size="sm">
                    <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi la Grupe
                </Button>
                <div className="flex gap-2">
                    <Button variant="success" onClick={handleSave} isLoading={loading} size="sm">
                        <CheckCircleIcon className="w-4 h-4 mr-2"/> Salvează Orar
                    </Button>
                    <Button variant="primary" onClick={() => onNavigate(grupa.id)} size="sm">
                        Gestionează Calendar <span className="ml-2">&rarr;</span>
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CogIcon className="w-6 h-6 text-indigo-400" />
                        Orar Săptămânal: <span className="text-indigo-300">{grupa.denumire}</span>
                    </h2>
                    <p className="text-slate-400 mt-1">Definește șablonul recurent al antrenamentelor pentru această grupă.</p>
                </div>

                <div className="p-6 space-y-8">
                    {zileSaptamana.map(zi => (
                        <div key={zi} className="group">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-800/50 pb-2">
                                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    {zi}
                                </h3>
                                <Button variant="secondary" size="sm" onClick={() => handleAddItem(zi)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PlusIcon className="w-3 h-3 mr-1"/> Adaugă Interval
                                </Button>
                            </div>
                            
                            <div className="space-y-3">
                                {programByDay[zi].length > 0 ? (
                                    programByDay[zi].map(item => (
                                        <div key={item.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-all shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Start</span>
                                                <Input label="" type="time" value={item.ora_start} onChange={e => handleItemChange(item.id, 'ora_start', e.target.value)} className="flex-grow" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Sfârșit</span>
                                                <Input label="" type="time" value={item.ora_sfarsit} onChange={e => handleItemChange(item.id, 'ora_sfarsit', e.target.value)} className="flex-grow" />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.id)} className="hover:scale-105 transition-transform">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div 
                                        onClick={() => handleAddItem(zi)}
                                        className="py-4 px-6 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 hover:border-slate-700 hover:text-slate-400 cursor-pointer transition-all"
                                    >
                                        <p className="text-sm italic">Niciun antrenament programat pentru {zi.toLowerCase()}.</p>
                                        <p className="text-xs mt-1">Apasă pentru a adăuga primul interval.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

// --- PASUL 1: Lista de grupe ---
const GrupeList: React.FC<{ onSelect: (id: string) => void; onSelectToday: (id: string) => void; onGlobalHistory: () => void; grupe: (Grupa & {sportivi_count: {count: number}[]})[] }> = ({ onSelect, onSelectToday, onGlobalHistory, grupe }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Management Prezență</h1>
                <p className="text-slate-400 mt-1">Gestionează orarul, calendarul și prezența sportivilor pe grupe.</p>
            </div>
            <Button variant="secondary" onClick={onGlobalHistory} className="shadow-lg hover:shadow-indigo-500/10">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-indigo-400" />
                Istoric Global Prezențe
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {grupe.map(g => (
                <Card key={g.id} className="group relative flex flex-col overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-slate-900/40 backdrop-blur-sm">
                    {/* Decorative accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="p-6 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <UsersIcon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                                {g.sportivi_count[0]?.count || 0} Sportivi
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">{g.denumire}</h3>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                <span>{g.sala || 'Sală nespecificată'}</span>
                            </div>
                            {g.program && g.program.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                                    <span>{g.program.length} intervale săptămânale</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 pt-0 mt-auto space-y-3">
                        <Button 
                            variant="success" 
                            className="w-full justify-between group/btn shadow-lg shadow-emerald-900/20" 
                            onClick={() => onSelectToday(g.id)}
                        >
                            <span>Prezență Azi</span>
                            <span className="group-hover/btn:translate-x-1 transition-transform">&rarr;</span>
                        </Button>
                        <Button 
                            variant="primary" 
                            className="w-full justify-between group/btn bg-slate-800 hover:bg-slate-700 border-none" 
                            onClick={() => onSelect(g.id)}
                        >
                            <span>Configurare Orar</span>
                            <CogIcon className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    </div>
);

// --- Istoric Global Prezențe ---
const IstoricPrezentaGlobal: React.FC<{ onBack: () => void, onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, onViewSportiv }) => {
    const [istoric, setIstoric] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();
    const [sportivi, setSportivi] = useState<Record<string, Sportiv>>({});

    // Filters & Sorting
    const [filterNume, setFilterNume] = useState('');
    const [filterGrupa, setFilterGrupa] = useState('');
    const [filterDataStart, setFilterDataStart] = useState('');
    const [filterDataEnd, setFilterDataEnd] = useState('');
    const [sortField, setSortField] = useState<'data' | 'nume_sportiv' | 'nume_grupa'>('data');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const fetchFilteredData = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('vedere_prezenta_sportiv').select('*');

        if (filterDataStart) query = query.gte('data', filterDataStart);
        if (filterDataEnd) query = query.lte('data', filterDataEnd);
        if (filterGrupa) query = query.ilike('nume_grupa', `%${filterGrupa}%`);
        
        query = query.order('data', { ascending: false });
        query = query.limit(500);

        const { data, error } = await query;
        
        if (error) {
            showError("Eroare la încărcarea istoricului", error.message);
        } else {
            setIstoric(data || []);
        }
        setLoading(false);
    }, [filterDataStart, filterDataEnd, filterGrupa, showError]);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            const { data } = await supabase.from('sportivi').select('*');
            if (data) {
                const spMap: Record<string, Sportiv> = {};
                data.forEach(s => spMap[s.id] = s);
                setSportivi(spMap);
            }
            fetchFilteredData();
        };
        loadInitial();
    }, []);

    useEffect(() => {
        fetchFilteredData();
    }, [fetchFilteredData]);

    const filteredAndSortedIstoric = useMemo(() => {
        let result = [...istoric];

        if (filterNume) {
            const lowerFilter = filterNume.toLowerCase();
            result = result.filter(row => {
                const sp = sportivi[row.sportiv_id];
                const numeComplet = sp ? `${sp.nume} ${sp.prenume}` : '';
                return numeComplet.toLowerCase().includes(lowerFilter);
            });
        }

        result.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortField === 'data') {
                valA = new Date(a.data).getTime();
                valB = new Date(b.data).getTime();
            } else if (sortField === 'nume_sportiv') {
                const spA = sportivi[a.sportiv_id];
                const spB = sportivi[b.sportiv_id];
                valA = spA ? `${spA.nume} ${spA.prenume}` : '';
                valB = spB ? `${spB.nume} ${spB.prenume}` : '';
            } else if (sortField === 'nume_grupa') {
                valA = a.nume_grupa || '';
                valB = b.nume_grupa || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [istoric, filterNume, sportivi, sortField, sortDirection]);

    const handleSort = (field: 'data' | 'nume_sportiv' | 'nume_grupa') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi la Grupe
            </Button>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                                Istoric Global Prezențe
                            </h2>
                            <p className="text-slate-400 mt-1">Vizualizează și filtrează prezențele tuturor sportivilor.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                        <Input label="Caută Sportiv" placeholder="Nume..." value={filterNume} onChange={e => setFilterNume(e.target.value)} />
                        <Input label="Caută Grupă" placeholder="Grupă..." value={filterGrupa} onChange={e => setFilterGrupa(e.target.value)} />
                        <Input label="De la" type="date" value={filterDataStart} onChange={e => setFilterDataStart(e.target.value)} />
                        <Input label="Până la" type="date" value={filterDataEnd} onChange={e => setFilterDataEnd(e.target.value)} />
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('data')}>
                                        Data {sortField === 'data' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-4">Ora</th>
                                    <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('nume_sportiv')}>
                                        Sportiv {sortField === 'nume_sportiv' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('nume_grupa')}>
                                        Grupa {sortField === 'nume_grupa' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">Se încarcă datele...</td></tr>
                                ) : filteredAndSortedIstoric.length === 0 ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">Nu au fost găsite rezultate conform filtrelor.</td></tr>
                                ) : (
                                    filteredAndSortedIstoric.map((row, idx) => {
                                        const sp = sportivi[row.sportiv_id];
                                        return (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-4 text-slate-300">{new Date(row.data).toLocaleDateString('ro-RO')}</td>
                                                <td className="p-4 text-slate-500 font-mono">{row.ora_start}</td>
                                                <td className="p-4">
                                                    <span 
                                                        className="font-bold text-white cursor-pointer hover:text-indigo-400 hover:underline transition-colors"
                                                        onClick={() => sp && onViewSportiv && onViewSportiv(sp)}
                                                    >
                                                        {sp ? `${sp.nume} ${sp.prenume}` : 'Necunoscut'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-400">{row.nume_grupa}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status?.toLowerCase() === 'prezent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- Componenta Principală de Navigare ---
export const Prezenta: React.FC<{ onBack: () => void; currentUser: User; onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, currentUser, onViewSportiv }) => {
    const [viewStack, setViewStack] = useState<ViewState[]>([{ view: 'prezenta-azi-global', id: null }]);
    const [grupe, setGrupe] = useState<(Grupa & { program: ProgramItem[], sportivi_count: {count: number}[] })[]>([]);
    const [antrenamentDetaliu, setAntrenamentDetaliu] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();
    const { saveAttendance } = useAttendanceData(currentUser.club_id, true);

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
            default: return null;
        }
    };

    return <div>{renderContent()}</div>;
};

export { Prezenta as PrezentaManagement };