import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Grupa, ProgramItem } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon, CheckCircleIcon } from './icons';
import { useError } from './ErrorProvider';
import { formatTime } from '../utils/date';

interface GeneratorProgramMasivProps {
    onBack: () => void;
    clubId?: string | null;
    onNavigateToGrupe?: () => void;
}

interface SchedulableItem {
    id: string; // Unique ID for selection (e.g., "grupaId-day-start")
    grupaId: string;
    grupaNume: string;
    ziua: string;
    oraStart: string;
    oraSfarsit: string;
    clubId: string;
}

interface GeneratedInstance {
    grupa_id: string;
    club_id: string;
    data: string; // YYYY-MM-DD
    ziua: string;
    ora_start: string;
    ora_sfarsit: string;
    is_recurent: boolean;
    grupaNume?: string; // For display
}

const ZILE_INDEX: Record<string, number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 0 };

export const GeneratorProgramMasiv: React.FC<GeneratorProgramMasivProps> = ({ onBack, clubId, onNavigateToGrupe }) => {
    const [step, setStep] = useState<'selection' | 'preview'>('selection');
    const [loading, setLoading] = useState(false);
    const [grupe, setGrupe] = useState<(Grupa & { program: ProgramItem[] })[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [previewData, setPreviewData] = useState<GeneratedInstance[]>([]);
    const { showError, showSuccess } = useError();

    // 1. Fetch Groups and Schedules
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let query = supabase.from('grupe').select('*, program:orar_saptamanal(*)');
            if (clubId) query = query.eq('club_id', clubId);
            
            const { data, error } = await query;
            if (error) {
                showError("Eroare încărcare date", error.message);
            } else {
                setGrupe(data as any || []);
            }
            setLoading(false);
        };
        fetchData();
    }, [clubId, showError]);

    // 2. Flatten Schedule Items for Selection
    const schedulableItems: SchedulableItem[] = useMemo(() => {
        const items: SchedulableItem[] = [];
        grupe.forEach(g => {
            if (g.program && g.program.length > 0) {
                g.program.forEach(p => {
                    if (p.is_activ !== false) {
                        items.push({
                            id: `${g.id}-${p.ziua}-${p.ora_start}`,
                            grupaId: g.id,
                            grupaNume: g.denumire,
                            ziua: p.ziua,
                            oraStart: p.ora_start,
                            oraSfarsit: p.ora_sfarsit,
                            clubId: g.club_id
                        });
                    }
                });
            }
        });
        return items;
    }, [grupe]);

    // Initialize selection with all items
    useEffect(() => {
        if (schedulableItems.length > 0 && selectedItems.size === 0) {
            setSelectedItems(new Set(schedulableItems.map(i => i.id)));
        }
    }, [schedulableItems]);

    const handleToggleItem = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const handleSelectAll = (select: boolean) => {
        if (select) setSelectedItems(new Set(schedulableItems.map(i => i.id)));
        else setSelectedItems(new Set());
    };

    // 3. Generate Preview
    const handlePreview = () => {
        if (!dateRange.start || !dateRange.end) {
            showError("Date lipsă", "Selectați perioada de generare.");
            return;
        }
        if (selectedItems.size === 0) {
            showError("Selecție lipsă", "Selectați cel puțin un orar de generat.");
            return;
        }

        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        
        if (end < start) {
            showError("Perioadă invalidă", "Data de sfârșit trebuie să fie după data de început.");
            return;
        }

        const instances: GeneratedInstance[] = [];
        const itemsToGenerate = schedulableItems.filter(i => selectedItems.has(i.id));

        // Generate a unique group ID for each schedule item selected
        const groupIds: Record<string, string> = {};
        itemsToGenerate.forEach(item => {
            groupIds[item.id] = crypto.randomUUID();
        });

        // Iterate through each day in range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayIndex = d.getDay(); // 0 = Sunday
            const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

            // Find matching schedule items for this day of week
            itemsToGenerate.forEach(item => {
                if (ZILE_INDEX[item.ziua] === dayIndex) {
                    instances.push({
                        grupa_id: item.grupaId,
                        club_id: item.clubId,
                        data: dateStr,
                        ziua: item.ziua,
                        ora_start: item.oraStart,
                        ora_sfarsit: item.oraSfarsit,
                        is_recurent: true,
                        grupaNume: item.grupaNume,
                        recurent_group_id: groupIds[item.id]
                    } as any);
                }
            });
        }

        if (instances.length === 0) {
            showError("Niciun rezultat", "Nu s-au generat antrenamente pentru perioada și orarul selectat (verificați zilele săptămânii).");
            return;
        }

        setPreviewData(instances);
        setStep('preview');
    };

    // 4. Save to Database
    const handleSave = async () => {
        if (previewData.length === 0) return;
        
        if (!window.confirm(`Confirmați generarea a ${previewData.length} antrenamente?`)) return;

        setLoading(true);
        try {
            // Remove display property before insert
            const toInsert = previewData.map(({ grupaNume, ...rest }) => rest);
            
            const { error } = await supabase.from('program_antrenamente').insert(toInsert);
            if (error) throw error;

            showSuccess("Generare reușită", `${previewData.length} antrenamente au fost create.`);
            onBack();
        } catch (err: any) {
            showError("Eroare salvare", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <Button onClick={() => step === 'preview' ? setStep('selection') : onBack()} variant="secondary">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    {step === 'preview' ? 'Înapoi la Selecție' : 'Înapoi la Meniu'}
                </Button>
                <h1 className="text-2xl font-bold text-white">Generator Masiv Program</h1>
            </div>

            {step === 'selection' && (
                <div className="space-y-6">
                    <Card className="p-6 bg-slate-900/40 border-none shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <CalendarDaysIcon className="w-6 h-6 text-indigo-400"/> 1. Perioada și Filtre
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Data Start" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
                            <Input label="Data Sfârșit" type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
                        </div>
                    </Card>

                    <Card className="p-6 bg-slate-900/40 border-none shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <CheckCircleIcon className="w-6 h-6 text-emerald-400"/> 2. Selectează Orarul
                            </h2>
                            <div className="space-x-2">
                                <Button size="sm" variant="secondary" onClick={() => handleSelectAll(true)}>Selectează Tot</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleSelectAll(false)}>Deselectează Tot</Button>
                            </div>
                        </div>

                        {loading ? (
                            <p className="text-center py-8 text-slate-400">Se încarcă orarul...</p>
                        ) : schedulableItems.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <p className="text-slate-400">Nu există grupe cu orar configurat.</p>
                                {onNavigateToGrupe && (
                                    <Button onClick={onNavigateToGrupe} variant="primary">
                                        Mergi la Gestionare Grupe
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                {schedulableItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleToggleItem(item.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedItems.has(item.id) ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-slate-800/30 border-slate-700 hover:border-slate-500'}`}
                                    >
                                        <div>
                                            <p className="font-bold text-white text-sm">{item.grupaNume}</p>
                                            <p className="text-xs text-slate-400">{item.ziua}, {item.oraStart}-{item.oraSfarsit}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedItems.has(item.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>
                                            {selectedItems.has(item.id) && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handlePreview} variant="primary" size="md" disabled={loading}>
                            Generează Previzualizare &rarr;
                        </Button>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <Card className="p-6 bg-slate-900/40 border-none shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">Previzualizare Generare</h2>
                                <p className="text-slate-400 text-sm">Se vor crea <span className="text-emerald-400 font-bold">{previewData.length}</span> antrenamente.</p>
                            </div>
                            <Button onClick={handleSave} variant="success" size="md" isLoading={loading}>
                                Salvează în Baza de Date
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-black tracking-widest sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="p-4">Data</th>
                                        <th className="p-4">Ziua</th>
                                        <th className="p-4">Ora</th>
                                        <th className="p-4">Grupa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {previewData.map((inst, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 text-white font-mono">{inst.data}</td>
                                            <td className="p-4 text-slate-400">{inst.ziua}</td>
                                            <td className="p-4 text-slate-400">{formatTime(inst.ora_start)} - {formatTime(inst.ora_sfarsit)}</td>
                                            <td className="p-4 text-indigo-300 font-bold">{inst.grupaNume}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
