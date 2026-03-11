import React, { useState, useMemo } from 'react';
import { Grupa, ProgramItem } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, CogIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';

export const OrarEditor: React.FC<{ 
    grupa: Grupa & {program: ProgramItem[]}; 
    onNavigate: (id: string) => void; 
    onBack: () => void; 
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>> 
}> = ({ grupa, onNavigate, onBack, setGrupe }) => {
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
