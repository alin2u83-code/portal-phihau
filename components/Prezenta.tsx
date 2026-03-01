import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, ProgramItem, User } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, CogIcon, CalendarDaysIcon, UsersIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

type View = 'grupe' | 'orar' | 'calendar' | 'prezenta' | 'istoric-global';
interface ViewState { view: View; id: string | null; }

// --- Formular Antrenament Personalizat (Reutilizat) ---
// FIX: Exported AntrenamentForm to be used in other components, resolving the "not exported" error.
export const AntrenamentForm: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (data: Partial<Antrenament>) => Promise<void>;
    grupaId: string | null; grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, grupaId, grupe }) => {
    const getInitialState = () => ({
        data: new Date().toISOString().split('T')[0],
        ora_start: '18:00',
        ora_sfarsit: '19:30',
        grupa_id: grupaId || '',
    });
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (isOpen) setFormState(getInitialState()); }, [isOpen, grupaId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave({ ...formState, is_recurent: false, ziua: null });
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Creează Antrenament Personalizat">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <Input label="Data" type="date" name="data" value={formState.data} onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit} onChange={handleChange} required />
                </div>
                 <Select label="Grupa" name="grupa_id" value={formState.grupa_id} onChange={handleChange} required>
                    <option value="">Alege o grupă...</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};

// --- PASUL 4: Lista de Prezență (Bulk Save) ---
const ListaPrezenta: React.FC<{
    antrenament: Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }};
    onBack: () => void; onSave: () => void;
    onViewSportiv?: (s: Sportiv) => void;
}> = ({ antrenament, onBack, onSave, onViewSportiv }) => {
    const { showError, showSuccess } = useError();
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setPresentIds(new Set(antrenament.prezenta.filter(p => p.status === 'prezent').map(p => p.sportiv_id)));
    }, [antrenament]);

    const sportiviInGrupa = useMemo(() => antrenament.grupe?.sportivi.filter(s => s.status === 'Activ').sort((a,b) => a.nume.localeCompare(b.nume)) || [], [antrenament.grupe]);
    
    const handleToggle = (sportivId: string) => setPresentIds(prev => { const next = new Set(prev); if(next.has(sportivId)) next.delete(sportivId); else next.add(sportivId); return next; });
    const handleSelectAll = (present: boolean) => setPresentIds(present ? new Set(sportiviInGrupa.map(s => s.id)) : new Set());

    const handleSave = async () => {
        setLoading(true);
        setSaved(false);
        const recordsToUpsert = sportiviInGrupa.map(s => ({
            antrenament_id: antrenament.id,
            sportiv_id: s.id,
            status: presentIds.has(s.id) ? 'prezent' as const : 'absent' as const,
        }));
        
        const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
        setLoading(false);

        if(error) { showError("Eroare la salvarea prezenței", error.message); }
        else { 
            showSuccess("Succes", `Prezența pentru ${sportiviInGrupa.length} sportivi a fost salvată.`); 
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onSave();
            }, 1000);
        }
    };

    return (
        <Card className={`transition-all duration-300 relative ${saved ? 'ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}`}>
            {saved && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" /> Salvat
                </div>
            )}
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon/> Înapoi la Calendar</Button>
            <h2 className="text-xl font-bold text-white mb-1">Prezență: {antrenament.grupe?.denumire}</h2>
            <p className="text-sm text-slate-400 mb-4">{new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')} - ora {antrenament.ora_start}</p>
            <div className="flex gap-2 mb-4">
                <Button size="sm" onClick={() => handleSelectAll(true)}>Toți Prezenți</Button>
                <Button size="sm" onClick={() => handleSelectAll(false)}>Toți Absenți</Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {sportiviInGrupa.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-md hover:bg-slate-700/50">
                        <input type="checkbox" checked={presentIds.has(s.id)} onChange={() => handleToggle(s.id)} className="h-5 w-5 rounded cursor-pointer"/>
                        <span 
                            className={`font-medium flex-grow cursor-pointer ${onViewSportiv ? 'hover:text-brand-primary hover:underline' : ''}`}
                            onClick={() => onViewSportiv && onViewSportiv(s)}
                        >
                            {s.nume} {s.prenume}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
                <Button variant="success" size="md" onClick={handleSave} isLoading={loading}>Confirmă Prezența Lot</Button>
            </div>
        </Card>
    );
}

// --- PASUL 3: Calendar Activități (Instanțe Reale) ---
const CalendarActivitati: React.FC<{
    grupa: Grupa; onSelect: (id: string) => void; onBack: () => void; grupe: Grupa[]
}> = ({ grupa, onSelect, onBack, grupe }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
        const { error } = await supabase.rpc('genereaza_antrenamente_din_orar', { p_zile_in_avans: 30 });
        if (error) showError("Eroare RPC", error.message);
        else { showSuccess("Succes", "Calendarul a fost populat."); await fetchAntrenamente(); }
        setLoading(false);
    };

    const handleSaveCustom = async (data: Partial<Antrenament>) => {
        const { data: newAntrenament, error } = await supabase.from('program_antrenamente').insert(data).select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)').single();
        if (error) showError("Eroare", error.message);
        else if (newAntrenament) {
            showSuccess("Succes", "Antrenamentul personalizat a fost adăugat.");
            await fetchAntrenamente();
        }
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon/> Înapoi la Orar</Button>
            <Card>
                <h2 className="text-xl font-bold text-white mb-1">Calendar Activități: {grupa.denumire}</h2>
                <p className="text-sm text-slate-400 mb-4">Afișează antrenamentele reale, generate sau personalizate.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <Input label="Afișează data" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    <Button onClick={handleGenerate} isLoading={loading}>Sincronizează 30 Zile</Button>
                    <Button variant="info" onClick={() => setIsFormOpen(true)}>+ Antrenament Personalizat</Button>
                </div>
                <div className="space-y-3">
                    {loading ? <p>Se încarcă...</p> : antrenamente.length === 0 ? <p className="text-slate-400 italic text-center p-4">Niciun antrenament programat.</p> :
                     antrenamente.map(a => (
                        <div key={a.id} className="p-3 bg-slate-700/50 rounded-md flex justify-between items-center">
                            <div>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full mr-2 ${a.is_recurent ? 'bg-sky-900/50 text-sky-300' : 'bg-amber-900/50 text-amber-300'}`}>{a.is_recurent ? 'Recurent' : 'Personalizat'}</span>
                                <span className="font-bold">{a.ora_start} - {a.ora_sfarsit}</span>
                            </div>
                            <Button size="sm" onClick={() => onSelect(a.id)}>Bifează Prezența</Button>
                        </div>
                     ))}
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
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
        const toInsert = program.map(({ id, ...rest }) => ({ ...rest, grupa_id: grupa.id, club_id: grupa.club_id }));
        if (toInsert.length > 0) {
            const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
            if (error) { showError("Eroare la salvare orar", error.message); setLoading(false); return; }
        }
        setGrupe(prev => prev.map(g => g.id === grupa.id ? { ...g, program: program } : g));
        showSuccess("Succes", "Orarul a fost salvat.");
        setLoading(false);
    };

    const handleAddItem = () => setProgram(p => [...p, { id: `new-${Date.now()}`, ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true }]);
    const handleRemoveItem = (id: string) => setProgram(p => p.filter(item => item.id !== id));
    const handleItemChange = (id: string, field: keyof ProgramItem, value: any) => setProgram(p => p.map(item => item.id === id ? { ...item, [field]: value } : item));

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon/> Înapoi la Grupe</Button>
            <Card>
                <h2 className="text-xl font-bold text-white mb-1">Orar Săptămânal: {grupa.denumire}</h2>
                <p className="text-sm text-slate-400 mb-4">Definește șablonul recurent al antrenamentelor.</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 mb-4">
                    {program.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-2 items-center bg-slate-800/50 p-2 rounded-lg">
                            <Select label="" value={item.ziua} onChange={e => handleItemChange(item.id, 'ziua', e.target.value)}>{zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)}</Select>
                            <Input label="" type="time" value={item.ora_start} onChange={e => handleItemChange(item.id, 'ora_start', e.target.value)} />
                            <Input label="" type="time" value={item.ora_sfarsit} onChange={e => handleItemChange(item.id, 'ora_sfarsit', e.target.value)} />
                            <Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.id)} className="ml-auto"><TrashIcon/></Button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                    <Button variant="info" onClick={handleAddItem}><PlusIcon className="mr-2"/> Adaugă Interval</Button>
                    <div className="flex gap-2">
                        <Button variant="success" onClick={handleSave} isLoading={loading}>Salvează Orar</Button>
                        <Button variant="primary" onClick={() => onNavigate(grupa.id)}>Gestionează Calendar <span className="ml-2">&rarr;</span></Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- PASUL 1: Lista de grupe ---
const GrupeList: React.FC<{ onSelect: (id: string) => void; onGlobalHistory: () => void; grupe: (Grupa & {sportivi_count: {count: number}[]})[] }> = ({ onSelect, onGlobalHistory, grupe }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Management Prezență</h1>
            <Button variant="secondary" onClick={onGlobalHistory}>
                <CalendarDaysIcon className="w-5 h-5 mr-2" />
                Istoric Global
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grupe.map(g => (
                <Card key={g.id} className="flex flex-col">
                    <div className="flex-grow">
                        <h3 className="text-xl font-bold text-white">{g.denumire}</h3>
                        <p className="text-sm text-slate-400 mb-2">{g.sala || 'Sală nespecificată'}</p>
                        <div className="flex items-center gap-2 text-sm text-green-400"><UsersIcon className="w-4 h-4"/><span>{g.sportivi_count[0]?.count || 0} Sportivi Activi</span></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <Button variant="primary" className="w-full" onClick={() => onSelect(g.id)}>Vezi Orar &rarr;</Button>
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [istoricRes, sportiviRes] = await Promise.all([
                supabase.from('vedere_prezenta_sportiv').select('*').order('data', { ascending: false }).limit(500),
                supabase.from('sportivi').select('*')
            ]);
            
            if (istoricRes.error) showError("Eroare la încărcarea istoricului", istoricRes.error.message);
            else setIstoric(istoricRes.data || []);

            if (sportiviRes.data) {
                const spMap: Record<string, Sportiv> = {};
                sportiviRes.data.forEach(s => spMap[s.id] = s);
                setSportivi(spMap);
            }
            
            setLoading(false);
        };
        fetchData();
    }, [showError]);

    return (
        <div className="space-y-4">
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon/> Înapoi la Grupe</Button>
            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Istoric Global Prezențe</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-400">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Ora</th>
                                <th className="p-3">Sportiv</th>
                                <th className="p-3">Grupa</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-400">Se încarcă...</td></tr>
                            ) : istoric.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-400">Nu există prezențe înregistrate.</td></tr>
                            ) : (
                                istoric.map((row, idx) => {
                                    const sp = sportivi[row.sportiv_id];
                                    return (
                                        <tr key={idx} className="hover:bg-slate-700/50">
                                            <td className="p-3">{new Date(row.data).toLocaleDateString('ro-RO')}</td>
                                            <td className="p-3">{row.ora_start}</td>
                                            <td className="p-3 font-medium text-white cursor-pointer hover:text-brand-primary hover:underline" onClick={() => sp && onViewSportiv && onViewSportiv(sp)}>
                                                {sp ? `${sp.nume} ${sp.prenume}` : 'Necunoscut'}
                                            </td>
                                            <td className="p-3 text-slate-400">{row.nume_grupa}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status?.toLowerCase() === 'prezent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
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
            </Card>
        </div>
    );
};

// --- Componenta Principală de Navigare ---
export const Prezenta: React.FC<{ onBack: () => void; currentUser: User; onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, currentUser, onViewSportiv }) => {
    const [viewStack, setViewStack] = useState<ViewState[]>([{ view: 'grupe', id: null }]);
    const [grupe, setGrupe] = useState<(Grupa & { program: ProgramItem[], sportivi_count: {count: number}[] })[]>([]);
    const [antrenamentDetaliu, setAntrenamentDetaliu] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();

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

    const navigateTo = (view: View, id: string) => setViewStack(prev => [...prev, { view, id }]);
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
        if (loading) return <p>Se încarcă...</p>;
        switch (currentView.view) {
            case 'grupe': return <GrupeList onSelect={id => navigateTo('orar', id)} onGlobalHistory={() => navigateTo('istoric-global', 'all')} grupe={grupe} />;
            case 'orar': return selectedGrupa ? <OrarEditor grupa={selectedGrupa} onNavigate={id => navigateTo('calendar', id)} onBack={navigateBack} setGrupe={setGrupe as any}/> : <p>Grupă negăsită.</p>;
            case 'calendar': return selectedGrupa ? <CalendarActivitati grupa={selectedGrupa} onSelect={handleSelectAntrenament} onBack={navigateBack} grupe={grupe}/> : <p>Grupă negăsită.</p>;
            case 'prezenta': return antrenamentDetaliu ? <ListaPrezenta antrenament={antrenamentDetaliu} onBack={navigateBack} onSave={navigateBack} onViewSportiv={onViewSportiv}/> : <p>Antrenament negăsit.</p>;
            case 'istoric-global': return <IstoricPrezentaGlobal onBack={navigateBack} onViewSportiv={onViewSportiv} />;
            default: return null;
        }
    };

    return <div>{renderContent()}</div>;
};

export { Prezenta as PrezentaManagement };