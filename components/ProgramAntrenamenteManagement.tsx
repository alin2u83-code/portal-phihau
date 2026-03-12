import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Antrenament } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon, EditIcon, TrashIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { MartialArtsSkeleton } from './MartialArtsSkeleton';

interface ProgramAntrenamenteManagementProps {
    onBack: () => void;
}

export const ProgramAntrenamenteManagement: React.FC<ProgramAntrenamenteManagementProps> = ({ onBack }) => {
    const { filteredData, setAntrenamente, loading } = useData();
    const { showError, showSuccess } = useError();
    
    const [dayFilter, setDayFilter] = useState<string>('');
    const [groupFilter, setGroupFilter] = useState<string>('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAntrenament, setEditingAntrenament] = useState<Antrenament | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const zileSaptamana = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    const antrenamente = filteredData.antrenamente || [];

    const filteredAntrenamente = useMemo(() => {
        return antrenamente.filter(a => {
            const matchesDay = !dayFilter || a.ziua_saptamanii === dayFilter;
            const matchesGroup = !groupFilter || a.nume_grupa?.toLowerCase().includes(groupFilter.toLowerCase());
            return matchesDay && matchesGroup;
        }).sort((a, b) => {
            // Sort by date then by start time
            const dateCompare = new Date((b.data || '').toString().slice(0, 10)).getTime() - new Date((a.data || '').toString().slice(0, 10)).getTime();
            if (dateCompare !== 0) return dateCompare;
            return (a.ora_start || '').localeCompare(b.ora_start || '');
        });
    }, [antrenamente, dayFilter, groupFilter]);

    const handleEdit = (a: Antrenament) => {
        setEditingAntrenament({ ...a });
        setIsEditModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAntrenament) return;

        setIsSaving(true);
        try {
            const { id, nume_grupa, sala, durata_minute, ziua_saptamanii, grupe, prezenta, ...dataToUpdate } = editingAntrenament;
            
            const { error } = await supabase
                .from('program_antrenamente')
                .update(dataToUpdate)
                .eq('id', id);

            if (error) throw error;

            setAntrenamente(prev => prev.map(a => a.id === id ? editingAntrenament : a));
            showSuccess("Succes", "Antrenamentul a fost actualizat.");
            setIsEditModalOpen(false);
        } catch (err: any) {
            showError("Eroare la salvare", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const getBadgeColor = (tip?: string) => {
        switch (tip) {
            case 'stagiu': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'examen': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Program Antrenamente</h1>
                    <p className="text-slate-400 mt-1">Gestionează instanțele de antrenament din club.</p>
                </div>
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Înapoi
                </Button>
            </div>

            <Card className="p-4 bg-slate-900/40 backdrop-blur-sm border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Filtrează după zi" value={dayFilter} onChange={e => setDayFilter(e.target.value)}>
                        <option value="">Toate zilele</option>
                        {zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)}
                    </Select>
                    <Input 
                        label="Caută după grupă" 
                        placeholder="Nume grupă..." 
                        value={groupFilter} 
                        onChange={e => setGroupFilter(e.target.value)} 
                    />
                </div>
            </Card>

            {loading ? (
                <MartialArtsSkeleton count={6} />
            ) : filteredAntrenamente.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                    <CalendarDaysIcon className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-500 text-lg">Nu am găsit antrenamente care să corespundă filtrelor.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAntrenamente.map(a => (
                        <Card key={a.id} className="group relative overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm hover:shadow-indigo-500/10 transition-all duration-300">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getBadgeColor(a.tip_antrenament)}`}>
                                        {a.tip_antrenament || 'regular'}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{a.ziua_saptamanii}</p>
                                        <p className="text-sm font-black text-white">{new Date((a.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</p>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{a.nume_grupa || 'Grupă nespecificată'}</h3>
                                <p className="text-sm text-slate-400 mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    {a.sala || 'Sală nespecificată'}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interval Orar</span>
                                        <span className="text-lg font-black text-white">
                                            {a.ora_start} - {a.ora_sfarsit}
                                            <span className="text-xs font-normal text-slate-500 ml-2">({a.durata_minute} min)</span>
                                        </span>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => handleEdit(a)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <EditIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                title="Editează Antrenament"
            >
                {editingAntrenament && (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Data" 
                                type="date" 
                                value={editingAntrenament.data} 
                                onChange={e => setEditingAntrenament({...editingAntrenament, data: e.target.value})} 
                                required 
                            />
                            <Select 
                                label="Tip Antrenament" 
                                value={editingAntrenament.tip_antrenament || 'regular'} 
                                onChange={e => setEditingAntrenament({...editingAntrenament, tip_antrenament: e.target.value as any})}
                            >
                                <option value="regular">Regular</option>
                                <option value="stagiu">Stagiu</option>
                                <option value="examen">Examen</option>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Ora Start" 
                                type="time" 
                                value={editingAntrenament.ora_start} 
                                onChange={e => setEditingAntrenament({...editingAntrenament, ora_start: e.target.value})} 
                                required 
                            />
                            <Input 
                                label="Ora Sfârșit" 
                                type="time" 
                                value={editingAntrenament.ora_sfarsit || ''} 
                                onChange={e => setEditingAntrenament({...editingAntrenament, ora_sfarsit: e.target.value})} 
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>
                                Anulează
                            </Button>
                            <Button variant="primary" type="submit" isLoading={isSaving}>
                                Salvează Modificările
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};
