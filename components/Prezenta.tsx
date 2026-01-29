import React, { useState, useMemo, useEffect } from 'react';
import { Antrenament, Sportiv, Grupa, Plata, TipAbonament, AnuntPrezenta, ProgramItem } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, EditIcon, XIcon, CheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// --- Sub-componente ---

const AntrenamentForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Antrenament, 'id' | 'sportivi_prezenti_ids'>) => Promise<void>;
    antrenamentToEdit: Antrenament | null;
    grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, antrenamentToEdit, grupe }) => {
    const getInitialState = () => ({
        data: antrenamentToEdit?.data || new Date().toISOString().split('T')[0],
        ora_start: antrenamentToEdit?.ora_start || '18:00',
        ora_sfarsit: antrenamentToEdit?.ora_sfarsit || '19:30',
        grupa_id: antrenamentToEdit?.grupa_id || null,
        tip: (antrenamentToEdit?.grupa_id ? 'Normal' : 'Vacanta') as 'Normal' | 'Vacanta',
    });
    
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    useEffect(() => {
        if (isOpen) {
            setFormState(getInitialState());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, antrenamentToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value === '' ? null : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { tip, ...antrenamentData } = formState;
        const finalData = {
            ...antrenamentData,
            grupa_id: tip === 'Normal' ? antrenamentData.grupa_id : null,
            ziua: null,
            is_recurent: false,
        };
        await onSave(finalData);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={antrenamentToEdit ? "Editează Antrenament" : "Creează Antrenament Nou"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <Input label="Data" type="date" name="data" value={formState.data} onChange={handleChange} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit ?? ''} onChange={handleChange} required />
                </div>
                 <Select label="Grupa" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange}>
                    <option value="">Antrenament Liber (Vacanță)</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};

// Componentă simplificată pentru gestionarea prezenței, conform solicitării.
const AttendanceDetail: React.FC<{
    antrenament: Antrenament;
    onBack: () => void;
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
}> = ({ antrenament, onBack, setAntrenamente }) => {
    // State inițializat cu un array gol pentru a preveni erorile de tip
    const [groupAthletes, setGroupAthletes] = useState<Sportiv[]>([]);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [markingAttendanceId, setMarkingAttendanceId] = useState<string | null>(null);
    const { showError, showSuccess } = useError();

    // Încarcă sportivii și prezența existentă la montarea componentei sau la schimbarea antrenamentului
    useEffect(() => {
        const fetchData = async () => {
            if (!antrenament.grupa_id) {
                showError("Antrenament fără grupă", "Acest antrenament nu este asociat cu nicio grupă. Nu se pot încărca sportivii.");
                setGroupAthletes([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            // 1. Încarcă sportivii care au același grupa_id ca antrenamentul
            const { data: athletesData, error: athletesError } = await supabase
                .from('sportivi')
                .select('*')
                .eq('grupa_id', antrenament.grupa_id)
                .order('nume', { ascending: true });

            if (athletesError) {
                showError("Eroare la încărcarea sportivilor", athletesError);
                setLoading(false);
                return;
            }
            setGroupAthletes(athletesData || []);

            // 2. Încarcă prezența deja înregistrată pentru acest antrenament
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('prezenta_antrenament')
                .select('sportiv_id')
                .eq('antrenament_id', antrenament.id);
            
            if (attendanceError) {
                showError("Eroare la încărcarea prezenței", attendanceError);
            } else if (attendanceData) {
                setPresentIds(new Set(attendanceData.map(p => p.sportiv_id)));
            }

            setLoading(false);
        };

        fetchData();
    }, [antrenament, showError]);

    // Funcția care face insert în `prezenta_antrenament`
    const handleMarkPresent = async (sportivId: string) => {
        if (presentIds.has(sportivId)) return; // Deja marcat, nu se face nimic

        setMarkingAttendanceId(sportivId);

        const { error } = await supabase
            .from('prezenta_antrenament')
            .insert({
                antrenament_id: antrenament.id,
                sportiv_id: sportivId
            });

        setMarkingAttendanceId(null);

        if (error) {
            showError("Eroare la salvarea prezenței", error);
        } else {
            const newPresentIds = new Set(presentIds).add(sportivId);
            setPresentIds(newPresentIds);
            
            // Actualizează starea globală a antrenamentelor pentru consistență în UI
            setAntrenamente(prev => prev.map(a => 
                a.id === antrenament.id 
                    ? { ...a, sportivi_prezenti_ids: Array.from(newPresentIds) } 
                    : a
            ));
            showSuccess("Prezență înregistrată");
        }
    };

    if (loading) {
        return <div className="text-center p-8">Se încarcă lista de sportivi...</div>;
    }
    
    const grupa = antrenament.grupe ? antrenament.grupe.denumire : 'N/A';

    return (
        <Card>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon /> Înapoi la Listă</Button>
            <h2 className="text-2xl font-bold text-white mb-1">Înregistrare Prezență</h2>
            <p className="text-slate-400 mb-4">
                Antrenament {grupa} - {new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')} ora {antrenament.ora_start}
            </p>

            <div className="space-y-2">
                {groupAthletes.length > 0 ? groupAthletes.map(sportiv => (
                    <div key={sportiv.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                        <span className="font-medium text-white">{sportiv.nume} {sportiv.prenume}</span>
                        {presentIds.has(sportiv.id) ? (
                            <Button variant="success" disabled className="!cursor-default w-36">
                                <CheckIcon className="w-4 h-4 mr-2" /> Prezent
                            </Button>
                        ) : (
                            <Button 
                                variant="primary" 
                                onClick={() => handleMarkPresent(sportiv.id)}
                                isLoading={markingAttendanceId === sportiv.id}
                                className="w-36"
                            >
                                Marchează Prezent
                            </Button>
                        )}
                    </div>
                )) : <p className="text-slate-400 italic text-center py-8">Niciun sportiv înscris în această grupă.</p>}
            </div>
        </Card>
    );
};


// --- Componenta Principală ---

export const PrezentaManagement: React.FC<{
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    antrenamente: Antrenament[];
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    grupe: Grupa[];
    onBack: () => void;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    tipuriAbonament: TipAbonament[];
    anunturi: AnuntPrezenta[];
    onViewSportiv: (sportiv: Sportiv) => void;
}> = ({ sportivi, setSportivi, antrenamente, setAntrenamente, grupe, onBack, setPlati, tipuriAbonament, anunturi, onViewSportiv }) => {
    
    const [selectedAntrenamentId, setSelectedAntrenamentId] = useLocalStorage<string | null>('phi-hau-selected-antrenament-id', null);
    const selectedAntrenament = useMemo(() => (antrenamente || []).find(p => p.id === selectedAntrenamentId) || null, [antrenamente, selectedAntrenamentId]);

    const handleSetSelectedAntrenament = (antrenament: Antrenament) => {
        setSelectedAntrenamentId(antrenament ? antrenament.id : null);
    };

    const [antrenamentToEdit, setAntrenamentToEdit] = useState<Antrenament | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Antrenament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();

    const initialFilters = { tip: '', data: new Date().toISOString().split('T')[0], grupa: '', ziua: '' };
    const [filters, setFilters] = useLocalStorage('phi-hau-prezenta-filters', initialFilters);
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAntrenament = async (antrenamentData: Omit<Antrenament, 'id' | 'sportivi_prezenti_ids'>) => {
        if (!supabase) return;
        if (antrenamentToEdit) {
            const { data, error } = await supabase.from('program_antrenamente').update(antrenamentData).eq('id', antrenamentToEdit.id).select('*, grupe(*), prezenta_antrenament!antrenament_id(sportiv_id)').single();
            if (error) { showError("Eroare la actualizare", error); } 
            else if (data) { 
                const formatted: Antrenament = { ...data, sportivi_prezenti_ids: data.prezenta_antrenament ? data.prezenta_antrenament.map((ps: any) => ps.sportiv_id) : [] };
                setAntrenamente(prev => prev.map(p => p.id === data.id ? formatted : p));
            }
        } else {
            const { data, error } = await supabase.from('program_antrenamente').insert(antrenamentData).select('*, grupe(*)').single();
            if (error) { showError("Eroare la creare", error); } 
            else if (data) { setAntrenamente(prev => [...prev, { ...data, sportivi_prezenti_ids: [] }]); }
        }
    };

    const confirmDeleteAntrenament = async (id: string) => {
        if (!supabase) return;
        setIsDeleting(true);
        try {
            await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', id);
            await supabase.from('program_antrenamente').delete().eq('id', id);
            setAntrenamente(prev => prev.filter(p => p.id !== id));
            showSuccess("Succes", "Antrenamentul a fost șters.");
        } catch (err: any) {
            showError("Eroare la ștergere", err);
        } finally {
            setIsDeleting(false);
            setAntrenamentToDelete(null);
        }
    };

    const handleOpenAdd = () => { setAntrenamentToEdit(null); setIsFormOpen(true); };
    
    const filteredAntrenamente = useMemo(() => {
        return (antrenamente || [])
            .filter(a =>
                (!filters.data || a.data === filters.data) &&
                (!filters.grupa || a.grupa_id === filters.grupa)
            )
            .sort((a, b) => (a.ora_start || '').localeCompare(b.ora_start || ''));
    }, [antrenamente, filters]);

    if (selectedAntrenament) {
        return <AttendanceDetail 
            antrenament={selectedAntrenament} 
            onBack={() => setSelectedAntrenamentId(null)} 
            setAntrenamente={setAntrenamente} 
        />;
    }

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-white">Înregistrare Prezențe</h1>
                <Button onClick={handleOpenAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Antrenament Nou</Button>
            </div>

            <Card className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Filtrează după Dată" name="data" type="date" value={filters.data} onChange={handleFilterChange} />
                <Select label="Filtrează după Grupă" name="grupa" value={filters.grupa} onChange={handleFilterChange}>
                    <option value="">Toate Grupele</option>
                    {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-700/50 text-sky-300 text-xs uppercase">
                            <tr>
                                <th className="p-4 font-semibold">Ora</th>
                                <th className="p-4 font-semibold">Grupa / Tip</th>
                                <th className="p-4 font-semibold text-center">Prezenți</th>
                                <th className="p-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredAntrenamente.map(p => (
                                <tr key={p.id} className="hover:bg-slate-700/50">
                                    <td className="p-4 font-medium text-white">{p.ora_start}</td>
                                    <td className="p-4 text-slate-300">{p.grupe?.denumire || 'Antrenament Liber'}</td>
                                    <td className="p-4 text-center font-bold text-brand-secondary">{p.sportivi_prezenti_ids.length}</td>
                                    <td className="p-4 text-right">
                                        <Button onClick={() => handleSetSelectedAntrenament(p as Antrenament)} variant="primary" size="sm">
                                            Gestionează Prezența
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAntrenamente.length === 0 && <p className="p-4 text-center text-slate-400">Niciun antrenament înregistrat conform filtrelor.</p>}
                </div>
            </Card>
            <AntrenamentForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSave={handleSaveAntrenament} 
                antrenamentToEdit={antrenamentToEdit}
                grupe={grupe}
            />
            <ConfirmDeleteModal 
                isOpen={!!antrenamentToDelete} 
                onClose={() => setAntrenamentToDelete(null)} 
                onConfirm={() => { if(antrenamentToDelete) confirmDeleteAntrenament(antrenamentToDelete.id) }} 
                tableName="Antrenament" 
                isLoading={isDeleting} 
            />
        </div>
    );
};
