import React, { useState, useMemo } from 'react';
import { Grupa, Antrenament, ProgramItem } from '../types';
import { Button, Card, Input, Select } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useData } from '../contexts/DataContext';
import { sendBulkNotifications } from '../utils/notifications';

interface ProgramareActivitatiProps {
    onBack: () => void;
}

const FRECVENTE = [
    { value: 'saptamanal', label: 'Săptămânal' },
    { value: 'bilunar', label: 'La 2 săptămâni (Bilunar)' },
];

const ZILE_INDEX: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 0 };

interface PreviewInstance {
    data: Date;
    ora_start: string;
    ora_sfarsit: string;
    ziua: ProgramItem['ziua'];
    isConflict: boolean;
}

export const ProgramareActivitati: React.FC<ProgramareActivitatiProps> = ({ onBack }) => {
    const { filteredData, setAntrenamente } = useData();
    const grupe = filteredData.grupe;
    const antrenamente = filteredData.antrenamente;
    
    const [formState, setFormState] = useState({
        grupaId: '',
        programId: '', // Composite key: 'ziua-ora_start'
        dataStart: '',
        dataSfarsit: '',
        frecventa: 'saptamanal'
    });
    const [preview, setPreview] = useState<PreviewInstance[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        grupaId: '',
        tip: 'toate', // toate, recurent, personalizat
        perioada: 'viitoare', // toate, viitoare, luna-curenta
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Antrenament>>({});
    const { showError, showSuccess } = useError();

    const selectedGrupa = useMemo(() => grupe.find(g => g.id === formState.grupaId), [grupe, formState.grupaId]);

    const filteredAntrenamente = useMemo(() => {
        const { grupaId, tip, perioada } = filters;
        let result = antrenamente;

        if (grupaId) {
            result = result.filter(a => a.grupa_id === grupaId);
        }

        if (tip === 'recurent') {
            result = result.filter(a => a.is_recurent);
        } else if (tip === 'personalizat') {
            result = result.filter(a => !a.is_recurent);
        }
        
        if (perioada !== 'toate') {
            const now = new Date();
            now.setHours(0,0,0,0);
            const nowTime = now.getTime();
            
            if (perioada === 'viitoare') {
                result = result.filter(a => new Date(a.data).getTime() >= nowTime);
            } else if (perioada === 'luna-curenta') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime();
                result = result.filter(a => {
                    const d = new Date(a.data).getTime();
                    return d >= startOfMonth && d <= endOfMonth;
                });
            }
        }
        
        return [...result].sort((a, b) => a.data.localeCompare(b.data));
    }, [antrenamente, filters]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: value }));
        setPreview(null); // Reset preview on form change
    };

    const handlePreview = () => {
        // 1. Validări câmpuri necesare
        if (!formState.grupaId || !formState.programId || !formState.dataStart || !formState.dataSfarsit) {
            showError("Date Incomplete", "Vă rugăm să completați toate câmpurile: grupă, orar, data de început și data de sfârșit.");
            return;
        }

        const startDate = new Date(formState.dataStart);
        const endDate = new Date(formState.dataSfarsit);

        if (endDate < startDate) {
            showError("Interval Invalid", "Data de sfârșit trebuie să fie ulterioară datei de început.");
            return;
        }

        const selectedProgramItem = selectedGrupa?.program.find(p => `${p.ziua}-${p.ora_start}` === formState.programId);
        if (!selectedProgramItem) {
            showError("Eroare", "Programul selectat nu a fost găsit în configurația grupei.");
            return;
        }
        
        const { ziua, ora_start, ora_sfarsit } = selectedProgramItem;
        
        // 2. Generare listă instanțe viitoare
        const dates = generateDates(formState.dataStart, formState.dataSfarsit, ziua, formState.frecventa);
        
        if (dates.length === 0) {
            showError("Niciun Rezultat", "Nu s-au găsit date care să se potrivească criteriilor în intervalul selectat.");
            return;
        }

        // Verificare conflicte cu antrenamentele existente (Overlap de timp)
        const checkOverlap = (dateStr: string, start: string, end: string, grpId: string) => {
            return antrenamente.some(a => 
                a.grupa_id === grpId && 
                a.data === dateStr &&
                a.is_activ !== false && // Verificăm doar conflictele cu antrenamentele active
                (start < (a.ora_sfarsit || '23:59') && (a.ora_start || '00:00') < end)
            );
        };

        const previewInstances = dates.map(date => {
            const dateString = date.toISOString().split('T')[0];
            const hasConflict = checkOverlap(dateString, ora_start, ora_sfarsit, formState.grupaId);
            return {
                data: date,
                ora_start,
                ora_sfarsit,
                ziua,
                isConflict: hasConflict,
            };
        });

        setPreview(previewInstances);
    };

    const handleUpdatePreviewItem = (index: number, field: keyof PreviewInstance, value: any) => {
        setPreview(prev => {
            if (!prev) return null;
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            
            // Re-check conflict if data or time changed
            if (field === 'data' || field === 'ora_start' || field === 'ora_sfarsit') {
                const dateString = next[index].data.toISOString().split('T')[0];
                const start = next[index].ora_start;
                const end = next[index].ora_sfarsit;
                
                const hasConflict = antrenamente.some(a => 
                    a.grupa_id === formState.grupaId && 
                    a.data === dateString &&
                    a.is_activ !== false &&
                    (start < (a.ora_sfarsit || '23:59') && (a.ora_start || '00:00') < end)
                );
                
                next[index].isConflict = hasConflict;
            }
            
            return next;
        });
    };

    const handleDeleteExisting = async (id: string) => {
        if (!window.confirm("Sigur doriți să ștergeți acest antrenament?")) return;
        
        try {
            const { error } = await supabase.from('program_antrenamente').delete().eq('id', id);
            if (error) throw error;
            setAntrenamente(prev => prev.filter(a => a.id !== id));
            showSuccess("Succes", "Antrenamentul a fost șters.");
        } catch (err: any) {
            showError("Eroare", err.message);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('program_antrenamente').update({ is_activ: !currentStatus }).eq('id', id);
            if (error) throw error;
            
            const antrenament = antrenamente.find(a => a.id === id);
            
            // If training was cancelled (deactivated)
            if (currentStatus === true && antrenament) {
                // Fetch sportivi in this group
                const { data: sportiviInGrupa } = await supabase
                    .from('sportivi')
                    .select('user_id')
                    .eq('grupa_id', antrenament.grupa_id)
                    .eq('status', 'Activ');
                
                if (sportiviInGrupa && sportiviInGrupa.length > 0) {
                    const notifications = sportiviInGrupa
                        .filter(s => s.user_id)
                        .map(s => ({
                            recipient_user_id: s.user_id!,
                            title: 'Antrenament Anulat',
                            body: `Antrenamentul din data de ${new Date(antrenament.data).toLocaleDateString('ro-RO')} (${antrenament.ora_start}) a fost anulat.`,
                            type: 'antrenament',
                            metadata: { antrenament_id: id }
                        }));
                    
                    if (notifications.length > 0) {
                        await sendBulkNotifications(notifications);
                    }
                }
            }

            setAntrenamente(prev => prev.map(a => a.id === id ? { ...a, is_activ: !currentStatus } : a));
            showSuccess("Succes", `Antrenamentul a fost ${!currentStatus ? 'activat' : 'dezactivat'}.`);
        } catch (err: any) {
            showError("Eroare", err.message);
        }
    };

    const handleStartEdit = (a: Antrenament) => {
        setEditingId(a.id);
        setEditForm({ ...a });
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editForm) return;
        try {
            const { error } = await supabase
                .from('program_antrenamente')
                .update({
                    ora_start: editForm.ora_start,
                    ora_sfarsit: editForm.ora_sfarsit,
                    ziua: editForm.ziua,
                    data: editForm.data,
                })
                .eq('id', editingId);

            if (error) throw error;

            setAntrenamente(prev => prev.map(a => a.id === editingId ? { ...a, ...editForm } : a));
            showSuccess("Succes", "Antrenamentul a fost actualizat.");
            setEditingId(null);
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
        }
    };

    const generateDates = (start: string, end: string, ziua: ProgramItem['ziua'], frecventa: string): Date[] => {
        const dates: Date[] = [];
        const [sY, sM, sD] = start.split('-').map(Number);
        const [eY, eM, eD] = end.split('-').map(Number);
        
        let current = new Date(sY, sM - 1, sD);
        const endDate = new Date(eY, eM - 1, eD);
        endDate.setHours(23, 59, 59, 999);
        
        const dayIndex = ZILE_INDEX[ziua];

        // Găsim prima zi care se potrivește cu ziua săptămânii selectată în intervalul [start, end]
        while (current.getDay() !== dayIndex) {
            current.setDate(current.getDate() + 1);
        }

        const increment = (frecventa === 'bilunar') ? 14 : 7;

        while (current <= endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + increment);
        }
        return dates;
    };
    
    const handleGenerate = async () => {
        if (!preview) return;

        const newTrainingsToInsert = preview
            .filter(p => !p.isConflict)
            .map(p => ({
                data: p.data.toISOString().split('T')[0],
                ora_start: p.ora_start,
                ora_sfarsit: p.ora_sfarsit,
                grupa_id: formState.grupaId,
                club_id: selectedGrupa?.club_id,
                ziua: p.ziua,
                is_recurent: true
            }));
            
        if (newTrainingsToInsert.length === 0) {
            showError("Nicio acțiune", "Nu există antrenamente noi de generat (toate sunt în conflict).");
            return;
        }

        if (!window.confirm(`Sunteți pe cale să generați ${newTrainingsToInsert.length} antrenamente noi. Doriți să continuați?`)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('program_antrenamente')
                .insert(newTrainingsToInsert)
                .select();

            if (error) throw error;

            if (data) {
                const newAntrenamente: Antrenament[] = data.map(dbRecord => ({
                    ...(dbRecord as any),
                    prezenta: []
                }));

                setAntrenamente(prev => [...prev, ...newAntrenamente]);
                showSuccess("Succes!", `${data.length} antrenamente au fost adăugate cu succes în calendar.`);
                setPreview(null);
            }
        } catch (error: any) {
            showError("Eroare la Generare", error.message || "A apărut o eroare neașteptată.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            </div>
            
            <h1 className="text-3xl font-bold text-white">Generator Program Recurent</h1>
            
            <Card className="border-l-4 border-brand-secondary">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-1">
                        <Select label="1. Selectează Grupa" name="grupaId" value={formState.grupaId} onChange={handleFormChange}>
                            <option value="">Alege grupa...</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                    </div>
                    <div className="lg:col-span-1">
                         <Select label="2. Selectează Orarul" name="programId" value={formState.programId} onChange={handleFormChange} disabled={!selectedGrupa}>
                            <option value="">Alege program...</option>
                            {selectedGrupa?.program.filter(p => p.is_activ !== false).map(p => <option key={`${p.ziua}-${p.ora_start}`} value={`${p.ziua}-${p.ora_start}`}>{p.ziua}, {p.ora_start}-{p.ora_sfarsit}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                        <Input label="3. Data Start" type="date" name="dataStart" value={formState.dataStart} onChange={handleFormChange}/>
                        <Input label="Data Sfârșit" type="date" name="dataSfarsit" value={formState.dataSfarsit} onChange={handleFormChange}/>
                    </div>
                    <div className="lg:col-span-1">
                         <Select label="4. Frecvență" name="frecventa" value={formState.frecventa} onChange={handleFormChange}>
                             {FRECVENTE.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                         </Select>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <Button onClick={handlePreview} variant="primary">
                        <CalendarDaysIcon className="w-5 h-5 mr-2" />
                        Previzualizează Antrenamentele
                    </Button>
                </div>
            </Card>

            {preview !== null && (
                <Card className="border-l-4 border-emerald-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                Previzualizare Generare
                            </h3>
                            <p className="text-slate-400 text-sm">Editează sau elimină instanțe înainte de a salva.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                {preview.filter(p => !p.isConflict).length} noi / {preview.length} total
                            </span>
                            <Button 
                                onClick={handleGenerate} 
                                variant="success" 
                                isLoading={loading}
                                disabled={preview.filter(p => !p.isConflict).length === 0}
                                className="shadow-lg shadow-emerald-900/20"
                            >
                                Confirmă Generarea
                            </Button>
                        </div>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto space-y-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 custom-scrollbar">
                        {preview.length > 0 ? preview.map((inst, index) => (
                            <div key={index} className={`group flex flex-col sm:flex-row justify-between items-center p-4 rounded-xl border transition-all ${inst.isConflict ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/40 border-slate-700/50 hover:border-indigo-500/30'}`}>
                                <div className="flex items-center gap-4 w-full sm:w-auto mb-3 sm:mb-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inst.isConflict ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                        <CalendarDaysIcon className="w-5 h-5" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:flex gap-2 items-center">
                                        <input 
                                            type="date" 
                                            value={inst.data.toISOString().split('T')[0]} 
                                            onChange={(e) => handleUpdatePreviewItem(index, 'data', new Date(e.target.value))}
                                            className="bg-slate-800 text-white text-sm border border-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <input 
                                            type="time" 
                                            value={inst.ora_start} 
                                            onChange={(e) => handleUpdatePreviewItem(index, 'ora_start', e.target.value)}
                                            className="bg-slate-800 text-white text-sm border border-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <span className="text-slate-500 hidden sm:inline">-</span>
                                        <input 
                                            type="time" 
                                            value={inst.ora_sfarsit} 
                                            onChange={(e) => handleUpdatePreviewItem(index, 'ora_sfarsit', e.target.value)}
                                            className="bg-slate-800 text-white text-sm border border-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    {inst.isConflict && (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                                            Conflict
                                        </span>
                                    )}
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        onClick={() => setPreview(p => p?.filter((_, i) => i !== index) || null)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4 rotate-45" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                                <p className="text-slate-500 italic">Niciun antrenament de generat.</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <div className="pt-8 border-t border-slate-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Management Program Existent</h2>
                        <p className="text-slate-400 text-sm">Vizualizează și gestionează antrenamentele deja create.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
                        <Select 
                            label="" 
                            value={filters.grupaId} 
                            onChange={e => setFilters(f => ({ ...f, grupaId: e.target.value }))}
                        >
                            <option value="">Toate Grupele</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                        <Select 
                            label="" 
                            value={filters.tip} 
                            onChange={e => setFilters(f => ({ ...f, tip: e.target.value }))}
                        >
                            <option value="toate">Toate Tipurile</option>
                            <option value="recurent">Recurente</option>
                            <option value="personalizat">Personalizate</option>
                        </Select>
                        <Select 
                            label="" 
                            value={filters.perioada} 
                            onChange={e => setFilters(f => ({ ...f, perioada: e.target.value }))}
                        >
                            <option value="viitoare">Doar Viitoare</option>
                            <option value="luna-curenta">Luna Curentă</option>
                            <option value="toate">Toate (Istoric)</option>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAntrenamente.length > 0 ? filteredAntrenamente.map(a => (
                        <Card key={a.id} className={`group relative overflow-hidden border-none shadow-lg transition-all ${!a.is_activ ? 'opacity-60 grayscale' : 'hover:shadow-indigo-500/10'} ${editingId === a.id ? 'ring-2 ring-indigo-500' : ''}`}>
                            <div className={`absolute top-0 left-0 w-1 h-full ${a.is_recurent ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${a.is_recurent ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {a.is_recurent ? 'Recurent' : 'Personalizat'}
                                        </span>
                                        <h4 className="text-lg font-bold text-white mt-1">{(a as any).grupe?.denumire || 'Grupă'}</h4>
                                    </div>
                                    <div className="flex gap-1">
                                        {editingId === a.id ? (
                                            <>
                                                <Button size="sm" variant="success" className="h-8 w-8 p-0" onClick={handleSaveEdit}>
                                                    <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                                                </Button>
                                                <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                                                    <ArrowLeftIcon className="w-4 h-4 rotate-45" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleStartEdit(a)}
                                                    title="Editează"
                                                >
                                                    <CalendarDaysIcon className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleToggleActive(a.id, a.is_activ ?? true)}
                                                    title={a.is_activ ? 'Dezactivează' : 'Activează'}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${a.is_activ ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="danger" 
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteExisting(a.id)}
                                                >
                                                    <ArrowLeftIcon className="w-4 h-4 rotate-45" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {editingId === a.id ? (
                                    <div className="space-y-3 mt-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">Data</label>
                                                <input 
                                                    type="date" 
                                                    value={editForm.data} 
                                                    onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))}
                                                    className="w-full bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-2 py-1.5"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">Ziua</label>
                                                <select 
                                                    value={editForm.ziua} 
                                                    onChange={e => setEditForm(f => ({ ...f, ziua: e.target.value as any }))}
                                                    className="w-full bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-2 py-1.5"
                                                >
                                                    {Object.keys(ZILE_INDEX).map(z => <option key={z} value={z}>{z}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">Start</label>
                                                <input 
                                                    type="time" 
                                                    value={editForm.ora_start} 
                                                    onChange={e => setEditForm(f => ({ ...f, ora_start: e.target.value }))}
                                                    className="w-full bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-2 py-1.5"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">Sfârșit</label>
                                                <input 
                                                    type="time" 
                                                    value={editForm.ora_sfarsit} 
                                                    onChange={e => setEditForm(f => ({ ...f, ora_sfarsit: e.target.value }))}
                                                    className="w-full bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-2 py-1.5"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                                        <div className="flex items-center gap-1">
                                            <CalendarDaysIcon className="w-4 h-4 text-slate-500" />
                                            {new Date(a.data).toLocaleDateString('ro-RO')}
                                            <span className="text-[10px] text-slate-600 ml-1">({a.ziua})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-500">Ora:</span>
                                            <span className="text-white">{a.ora_start}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )) : (
                        <div className="col-span-full text-center py-20 bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800">
                            <CalendarDaysIcon className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Nu am găsit antrenamente care să corespundă filtrelor.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
