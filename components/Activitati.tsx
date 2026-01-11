import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Prezenta, Sportiv, Grupa, Examen, Participare, Grad, PretConfig, Plata, Eveniment, Rezultat } from '../types';
import { Button, Card, Input, Select, ConfirmationModal, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ExameneManagement } from './Examene';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';

type Tab = 'antrenamente' | 'examene' | 'evenimente';

interface ActivitatiManagementProps {
    onBack: () => void;
    initialTab?: Tab;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    examene: Examen[];
    setExamene: React.Dispatch<React.SetStateAction<Examen[]>>;
    grade: Grad[];
    setGrade: React.Dispatch<React.SetStateAction<Grad[]>>;
    participari: Participare[];
    setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    evenimente: Eveniment[];
    setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>;
    rezultate: Rezultat[];
    setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>;
    preturiConfig: PretConfig[];
    setPreturiConfig: React.Dispatch<React.SetStateAction<PretConfig[]>>;
}

const TabButton: React.FC<{ activeTab: Tab, tabName: Tab, label: string, onClick: (tab: Tab) => void }> = ({ activeTab, tabName, label, onClick }) => (
    <button
        onClick={() => onClick(tabName)}
        className={`px-4 py-2 text-sm md:text-base font-bold transition-colors duration-200 border-b-2 ${
            activeTab === tabName
                ? 'text-brand-secondary border-brand-secondary'
                : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'
        }`}
    >
        {label}
    </button>
);

// --- START REFACTORED ATTENDANCE LOGIC ---

const AttendanceModal: React.FC<{ isOpen: boolean; onClose: () => void; antrenament: Prezenta | null; sportivi: Sportiv[]; grupe: Grupa[]; onSaveSuccess: () => void; }> = ({ isOpen, onClose, antrenament, sportivi, grupe, onSaveSuccess }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const isVacationMonth = useCallback((dateStr: string) => {
        const month = new Date(dateStr).getUTCMonth();
        return month === 6 || month === 7;
    }, []);

    const sportiviInGrupa = useMemo(() => {
        if (!antrenament || !antrenament.grupa_id) return [];
        return sportivi
            .filter(s => s.status === 'Activ' && s.grupa_id === antrenament.grupa_id && (!isVacationMonth(antrenament.data) || s.participa_vacanta))
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [antrenament, sportivi, isVacationMonth]);

    useEffect(() => { if (isOpen && antrenament) setPresentIds(new Set(antrenament.sportivi_prezenti_ids)); }, [isOpen, antrenament]);
    const handleToggle = (sportivId: string) => setPresentIds(prev => { const newSet = new Set(prev); if (newSet.has(sportivId)) newSet.delete(sportivId); else newSet.add(sportivId); return newSet; });

    const handleSave = async () => {
        if (!antrenament || !supabase) return;
        setLoading(true);
        const { error: deleteError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenament.id);
        if (deleteError) { showError("Eroare la actualizarea prezenței", deleteError); setLoading(false); return; }
        if (presentIds.size > 0) {
            const toInsert = Array.from(presentIds).map(sportiv_id => ({ antrenament_id: antrenament.id, sportiv_id }));
            const { error: insertError } = await supabase.from('prezenta_antrenament').insert(toInsert);
            if (insertError) { showError("Eroare la salvarea prezenței", insertError); setLoading(false); return; }
        }
        setLoading(false);
        onSaveSuccess();
        onClose();
    };

    if (!antrenament) return null;
    const grupa = grupe.find(g => g.id === antrenament.grupa_id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Prezență ${grupa?.denumire} - ${new Date(antrenament.data).toLocaleDateString('ro-RO')}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
                    {sportiviInGrupa.map(s => (
                        <label key={s.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600 transition-colors">
                            <input type="checkbox" checked={presentIds.has(s.id)} onChange={() => handleToggle(s.id)} className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"/>
                            <span className="text-sm">{s.nume} {s.prenume}</span>
                        </label>
                    ))}
                    {sportiviInGrupa.length === 0 && <p className="text-slate-400 italic col-span-full text-center">Niciun sportiv eligibil în grupă.</p>}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <Button onClick={handleSave} variant="success" disabled={loading}>{loading ? 'Se salvează...' : `Salvează (${presentIds.size} Prezenți)`}</Button>
                </div>
            </div>
        </Modal>
    );
};

const AddAntrenamentModal: React.FC<{ isOpen: boolean; onClose: () => void; grupe: Grupa[]; onSaveSuccess: () => void; }> = ({ isOpen, onClose, grupe, onSaveSuccess }) => {
    const [formState, setFormState] = useState({ grupa_id: '', data: new Date().toISOString().split('T')[0], ora_inceput: '18:00', ora_sfarsit: '19:30', is_recurent: false });
    const [loading, setLoading] = useState(false);
    const { showError } = useError();
    const zileSaptamana = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.grupa_id || !formState.data || !formState.ora_inceput || !formState.ora_sfarsit) { showError("Eroare", "Toate câmpurile sunt obligatorii."); return; }
        if (!supabase) return;

        setLoading(true);
        const newAntrenament = {
            grupa_id: formState.grupa_id,
            data: formState.data,
            ziua: zileSaptamana[new Date(formState.data).getDay()],
            ora_inceput: formState.ora_inceput,
            ora_sfarsit: formState.ora_sfarsit,
            is_recurent: formState.is_recurent
        };

        const { error } = await supabase.from('program_antrenamente').insert(newAntrenament);
        setLoading(false);
        if (error) { showError("Eroare la adăugare", error); } else { onSaveSuccess(); onClose(); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Antrenament Nou">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label="Grupa" value={formState.grupa_id} onChange={e => setFormState(p => ({...p, grupa_id: e.target.value}))} required>
                    <option value="">Alege grupa...</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <Input label="Data" type="date" value={formState.data} onChange={e => setFormState(p => ({...p, data: e.target.value}))} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Ora Început" type="time" value={formState.ora_inceput} onChange={e => setFormState(p => ({...p, ora_inceput: e.target.value}))} required />
                    <Input label="Ora Sfârșit" type="time" value={formState.ora_sfarsit} onChange={e => setFormState(p => ({...p, ora_sfarsit: e.target.value}))} required />
                </div>
                {/* Recurrence logic can be expanded here */}
                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Antrenament'}</Button>
                </div>
            </form>
        </Modal>
    );
};


const AntrenamenteTab: React.FC<{ sportivi: Sportiv[]; grupe: Grupa[]; }> = ({ sportivi, grupe }) => {
    const [antrenamente, setAntrenamente] = useState<Prezenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Prezenta | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [antrenamentForAttendance, setAntrenamentForAttendance] = useState<Prezenta | null>(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { showError } = useError();
    
    const [filters, setFilters] = useState({
        an: new Date().getFullYear().toString(),
        luna: (new Date().getMonth() + 1).toString().padStart(2, '0'),
        grupa: '',
        tip: 'toate'
    });
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: antrenamenteData, error: antrenamenteError } = await supabase.from('program_antrenamente').select('*').order('data', { ascending: false }).order('ora_inceput', { ascending: true });
        if (antrenamenteError) { showError("Eroare la încărcarea antrenamentelor", antrenamenteError); setLoading(false); return; }

        const { data: prezenteData, error: prezenteError } = await supabase.from('prezenta_antrenament').select('*');
        if (prezenteError) { showError("Eroare la încărcarea prezențelor", prezenteError); setLoading(false); return; }

        const prezenteMap = new Map<string, string[]>();
        prezenteData.forEach(p => { if (!prezenteMap.has(p.antrenament_id)) prezenteMap.set(p.antrenament_id, []); prezenteMap.get(p.antrenament_id)?.push(p.sportiv_id); });
        const combinedData = (antrenamenteData || []).map(a => ({ ...a, sportivi_prezenti_ids: prezenteMap.get(a.id) || [] }));
        
        setAntrenamente(combinedData as Prezenta[]);
        setLoading(false);
    }, [showError]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteAntrenament = async () => {
        if (!antrenamentToDelete || !supabase) return;
        setDeleteLoading(true);
        const { error } = await supabase.from('program_antrenamente').delete().eq('id', antrenamentToDelete.id);
        setDeleteLoading(false);
        if (error) { showError("Eroare la ștergere", error); } 
        else { fetchData(); setAntrenamentToDelete(null); }
    };

    const isVacationMonth = useCallback((dateStr: string) => { const month = new Date(dateStr).getUTCMonth(); return month === 6 || month === 7; }, []);
    
    const filteredAntrenamente = useMemo(() => antrenamente.filter(a => {
        const d = new Date(a.data);
        const anMatch = !filters.an || d.getFullYear().toString() === filters.an;
        const lunaMatch = !filters.luna || (d.getMonth() + 1).toString().padStart(2, '0') === filters.luna;
        const groupMatch = !filters.grupa || a.grupa_id === filters.grupa;
        const tipMatch = filters.tip === 'toate' || (filters.tip === 'vacanta' && isVacationMonth(a.data)) || (filters.tip === 'normal' && !isVacationMonth(a.data));
        return anMatch && lunaMatch && groupMatch && tipMatch;
    }), [antrenamente, filters, isVacationMonth]);

    const aniDisponibili = useMemo(() => [...new Set(antrenamente.map(a => new Date(a.data).getFullYear()))].sort((a: number, b: number) => b - a), [antrenamente]);

    const openAttendanceModal = (antrenament: Prezenta) => { setAntrenamentForAttendance(antrenament); setIsAttendanceModalOpen(true); };

    if (loading) return <div className="text-center p-8">Se încarcă antrenamentele...</div>;

    return (
        <div>
            <Card className="mb-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">Filtre & Acțiuni</h2>
                    <Button onClick={() => setIsAddModalOpen(true)} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Antrenament Nou</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Select label="An" value={filters.an} onChange={e => setFilters(p => ({...p, an: e.target.value}))}>
                         {aniDisponibili.map(an => <option key={an} value={an}>{an}</option>)}
                    </Select>
                    <Select label="Luna" value={filters.luna} onChange={e => setFilters(p => ({...p, luna: e.target.value}))}>
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={(i+1).toString().padStart(2, '0')}>{new Date(0, i).toLocaleString('ro-RO', {month: 'long'})}</option>)}
                    </Select>
                    <Select label="Grupă" value={filters.grupa} onChange={e => setFilters(p => ({...p, grupa: e.target.value}))}>
                        <option value="">Toate grupele</option>
                        {grupe.map(g => (<option key={g.id} value={g.id}>{g.denumire}</option>))}
                    </Select>
                    <Select label="Tip Antrenament" value={filters.tip} onChange={e => setFilters(p => ({...p, tip: e.target.value}))}>
                        <option value="toate">Toate</option><option value="normal">Normal</option><option value="vacanta">Vacanță</option>
                    </Select>
                </div>
            </Card>
            
            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50">
                    <h3 className="font-bold text-white">Listă Antrenamente</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                            <tr>{['Data', 'Interval Orar', 'Grupa', 'Prezenți', ''].map(h => <th key={h} className="p-4 font-semibold">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredAntrenamente.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-slate-400">Niciun antrenament conform filtrelor.</td></tr>)}
                            {filteredAntrenamente.map(a => {
                                const grupa = grupe.find(g => g.id === a.grupa_id);
                                return (
                                    <tr key={a.id} className="hover:bg-slate-700/30">
                                        <td className="p-4 font-medium">{new Date(a.data + 'T00:00:00Z').toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</td>
                                        <td className="p-4">{a.ora_inceput} - {a.ora_sfarsit}</td>
                                        <td className="p-4">{grupa?.denumire}</td>
                                        <td className="p-4 font-bold text-brand-secondary">{a.sportivi_prezenti_ids.length}</td>
                                        <td className="p-4 text-right flex justify-end items-center gap-2">
                                            <Button variant="primary" size="sm" onClick={() => openAttendanceModal(a)}><UsersIcon className="w-4 h-4 mr-1"/> Prezență</Button>
                                            <Button variant="danger" size="sm" onClick={() => setAntrenamentToDelete(a)}><TrashIcon /></Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AttendanceModal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} antrenament={antrenamentForAttendance} sportivi={sportivi} grupe={grupe} onSaveSuccess={fetchData} />
            <AddAntrenamentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} grupe={grupe} onSaveSuccess={fetchData} />
            <ConfirmationModal isOpen={!!antrenamentToDelete} onClose={() => setAntrenamentToDelete(null)} title="Confirmare Ștergere" message="Sunteți sigur că doriți să ștergeți acest antrenament și prezența asociată?" loading={deleteLoading} onConfirm={handleDeleteAntrenament} />
        </div>
    );
};

// --- END REFACTORED ATTENDANCE LOGIC ---

export const ActivitatiManagement: React.FC<ActivitatiManagementProps> = (props) => {
    const { onBack, initialTab = 'antrenamente' } = props;
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Activități & Evaluări</h1>
            
            <div className="border-b border-slate-700 mb-6">
                <TabButton activeTab={activeTab} tabName="antrenamente" label="Antrenamente & Prezență" onClick={setActiveTab} />
                <TabButton activeTab={activeTab} tabName="examene" label="Examene & Grade" onClick={setActiveTab} />
                <TabButton activeTab={activeTab} tabName="evenimente" label="Stagii & Competiții" onClick={setActiveTab} />
            </div>

            <div>
                {activeTab === 'antrenamente' && <AntrenamenteTab sportivi={props.sportivi} grupe={props.grupe} />}
                {activeTab === 'examene' && <ExameneManagement {...props} onBack={() => {}} />}
                {activeTab === 'evenimente' && (
                    <div className="space-y-8">
                        <StagiiCompetitiiManagement {...props} type="Stagiu" onBack={()=>{}}/>
                        <StagiiCompetitiiManagement {...props} type="Competitie" onBack={()=>{}}/>
                    </div>
                )}
            </div>
        </div>
    );
};