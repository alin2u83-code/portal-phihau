import React, { useState, useMemo } from 'react';
import { Eveniment, Rezultat, Sportiv, Plata, PretConfig, InscriereExamen, Examen, Grad, User, Permissions } from '../types';
import { Button, Modal, Input, Select, Card, Switch } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { usePermissions } from '../hooks/usePermissions';
import { ROLES } from '../constants';

const formatDateRange = (start: string) => {
    return new Date(start).toLocaleDateString('ro-RO');
};

interface EvenimentFormProps { isOpen: boolean; onClose: () => void; onSave: (ev: Omit<Eveniment, 'id'>) => Promise<void>; evToEdit: Eveniment | null; type: 'Stagiu' | 'Competitie'; currentUser: User; permissions: Permissions; }
const EvenimentForm: React.FC<EvenimentFormProps> = ({ isOpen, onClose, onSave, evToEdit, type, currentUser, permissions }) => {
    const [formState, setFormState] = useState<Omit<Eveniment, 'id' | 'probe_disponibile'>>({ denumire: '', data: new Date().toISOString().split('T')[0], locatie: '', organizator: '', tip: type });
    const [probeStr, setProbeStr] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFederationEvent, setIsFederationEvent] = useState(false);
    
    React.useEffect(() => {
        if (isOpen) {
            if (evToEdit) {
                setFormState({ denumire: evToEdit.denumire, data: evToEdit.data, locatie: evToEdit.locatie, organizator: evToEdit.organizator, tip: evToEdit.tip });
                setProbeStr(evToEdit.probe_disponibile?.join(', ') || '');
                setIsFederationEvent(evToEdit.club_id === null);
            } else {
                setFormState({ denumire: '', data: new Date().toISOString().split('T')[0], locatie: '', organizator: '', tip: type });
                setProbeStr('');
                setIsFederationEvent(false);
            }
        }
    }, [evToEdit, isOpen, type]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const eventData: Partial<Eveniment> = {
            ...formState,
            club_id: (permissions.isFederationAdmin && isFederationEvent) ? null : currentUser.club_id,
            ...(type === 'Competitie' && { probe_disponibile: probeStr.split(',').map(p => p.trim()).filter(Boolean) })
        };
        await onSave(eventData as Omit<Eveniment, 'id'>);
        setLoading(false);
        onClose();
    };

    return ( <Modal isOpen={isOpen} onClose={onClose} title={evToEdit ? `Editează ${type}` : `Adaugă ${type} Nou`}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Denumire" name="denumire" value={formState.denumire} onChange={handleChange} required /> <Input label="Data Eveniment" name="data" type="date" value={formState.data} onChange={handleChange} required /> <Input label="Locație" name="locatie" value={formState.locatie} onChange={handleChange} /> <Input label="Organizator" name="organizator" value={formState.organizator} onChange={handleChange} /> {type === 'Competitie' && ( <Input label="Probe Competiție (separate prin virgulă)" name="probe" value={probeStr} onChange={(e) => setProbeStr(e.target.value)} placeholder="Ex: Quyen, Song Dau, Arme" /> )}
    {permissions.isFederationAdmin && (
        <div className="pt-2">
            <Switch 
                label="Eveniment de Federație (vizibil tuturor cluburilor)" 
                name="isFederation"
                checked={isFederationEvent}
                onChange={(e) => setIsFederationEvent(e.target.checked)}
            />
        </div>
    )}
    <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};

interface EvenimentDetailProps { eveniment: Eveniment; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; inscrieriExamene: InscriereExamen[]; examene: Examen[]; grade: Grad[]; }
const EvenimentDetail: React.FC<EvenimentDetailProps> = ({ eveniment, rezultate, setRezultate, sportivi, setPlati, preturiConfig, inscrieriExamene, examene, grade }) => {
    const [sportivId, setSportivId] = useState('');
    const { showError, showSuccess } = useError();
    const [rezultatToDelete, setRezultatToDelete] = useState<Rezultat | null>(null);
    const [isDeletingRezultat, setIsDeletingRezultat] = useState(false);
    
    const [formState, setFormState] = useState({ sportivId: '', rezultat: 'Participare', probe: [] as string[] });

    const participantiIds = useMemo(() => new Set((rezultate || []).map(r => r.sportiv_id)), [rezultate]);
    const sportiviDisponibili = useMemo(() => (sportivi || []).filter(s => s.status === 'Activ' && !participantiIds.has(s.id)), [sportivi, participantiIds]);
    
    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.sportivId) { showError("Date incomplete", "Vă rugăm selectați un sportiv."); return; }

        const sportiv = sportivi.find(s => s.id === formState.sportivId);
        if(!sportiv) return;

        let taxaConfig: PretConfig | undefined;
        if(eveniment.tip === 'Stagiu') taxaConfig = getPretValabil(preturiConfig, 'Taxa Stagiu', eveniment.data);
        else if(eveniment.tip === 'Competitie') taxaConfig = getPretValabil(preturiConfig, 'Taxa Competitie', eveniment.data);

        const newRezultat: Omit<Rezultat, 'id'> = { sportiv_id: formState.sportivId, eveniment_id: eveniment.id, rezultat: formState.rezultat, probe: formState.probe.join(', ') };
        
        try {
            const { data, error } = await supabase.from('rezultate').insert(newRezultat).select().single();
            if (error) throw error;
            setRezultate(prev => [...prev, data as Rezultat]);

            if (taxaConfig) {
                const newPlata: Omit<Plata, 'id' | 'club_id'> & { club_id?: string | null } = { sportiv_id: sportiv.id, familie_id: sportiv.familie_id, club_id: sportiv.club_id, suma: taxaConfig.suma, data: eveniment.data, status: 'Neachitat', descriere: `Taxa ${eveniment.tip}: ${eveniment.denumire}`, tip: eveniment.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie', observatii: 'Generat automat la înscriere.' };
                const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().single();
                if(plataError) throw plataError;
                setPlati(prev => [...prev, plataData as Plata]);
            }
            showSuccess("Succes", `Sportivul a fost înscris${taxaConfig ? ' și taxa generată' : ''}.`);
            setFormState({ sportivId: '', rezultat: 'Participare', probe: [] });
        } catch (err) {
            console.error('DEBUG:', err);
            showError("Eroare la înscriere", err);
        }
    };
    
    const confirmDeleteRezultat = async (rezultatId: string) => {
        setIsDeletingRezultat(true);
        const { error } = await supabase.from('rezultate').delete().eq('id', rezultatId);
        if (error) {
            console.error('DEBUG:', error);
            showError("Eroare la ștergere", error);
        }
        else { setRezultate(prev => prev.filter(r => r.id !== rezultatId)); showSuccess("Succes", "Înscrierea a fost ștearsă."); }
        setIsDeletingRezultat(false);
        setRezultatToDelete(null);
    };

    const handleProbeChange = (proba: string, checked: boolean) => { setFormState(p => ({ ...p, probe: checked ? [...p.probe, proba] : p.probe.filter(pr => pr !== proba) })); };

    const getSportivGrad = (sportivId: string) => {
        const admittedParticipations = inscrieriExamene
            .filter(p => p.sportiv_id === sportivId && p.rezultat === 'Admis')
            .sort((a, b) => {
                const dateA = examene.find(e => e.id === a.sesiune_id)?.data || '1970-01-01';
                const dateB = examene.find(e => e.id === b.sesiune_id)?.data || '1970-01-01';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        return grade.find(g => g.id === admittedParticipations[0]?.grad_vizat_id);
    };

    return ( <Card> <h3 className="text-2xl font-bold text-white">{eveniment.denumire}</h3> <p className="text-slate-400">{formatDateRange(eveniment.data)} - {eveniment.locatie}</p> <div className="mt-6 border-t border-slate-700 pt-6"> <h4 className="text-xl font-semibold mb-4 text-white">Participanți Înscriși ({rezultate.length})</h4>
    <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">{(rezultate || []).map(r => { const s = sportivi.find(sp => sp.id === r.sportiv_id); const g = getSportivGrad(r.sportiv_id); return ( <div key={r.id} className="bg-slate-700/50 p-3 rounded-md grid grid-cols-1 md:grid-cols-4 gap-4 items-center"><div className="col-span-1 md:col-span-2"><p className="font-medium">{s?.nume} {s?.prenume}</p><p className="text-xs text-slate-400">{g?.nume || 'Începător'}</p></div><p className="font-semibold">{r.rezultat}</p><Button onClick={() => setRezultatToDelete(r)} variant="danger" size="sm" className="justify-self-end"><TrashIcon /></Button></div> )})}{(rezultate || []).length === 0 && <p className="text-slate-400">Niciun participant înscris.</p>}</div>
    <Card className="bg-slate-900/50">
        <h5 className="text-lg font-semibold mb-4 text-white">Înscrie Participant</h5>
        <form onSubmit={handleAddParticipant} className="space-y-4">
            <Select label="Sportiv" value={formState.sportivId} onChange={e => setFormState(p => ({ ...p, sportivId: e.target.value }))}><option value="">Selectează...</option>{sportiviDisponibili.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}</Select>
            <Input label="Rezultat (ex: Participare, Locul 1)" name="rezultat" value={formState.rezultat} onChange={e => setFormState(p => ({ ...p, rezultat: e.target.value }))} />
            {eveniment.tip === 'Competitie' && eveniment.probe_disponibile && eveniment.probe_disponibile.length > 0 && (
                <div><label className="block text-sm font-medium text-slate-300 mb-2">Probe</label><div className="flex flex-wrap gap-x-4 gap-y-2">{(eveniment.probe_disponibile || []).map(proba => (<label key={proba} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={formState.probe.includes(proba)} onChange={e => handleProbeChange(proba, e.target.checked)} className="h-4 w-4 rounded" /><span>{proba}</span></label>))}</div></div>
            )}
            <div className="flex justify-end pt-2"><Button type="submit" variant="info">Înscrie</Button></div>
        </form>
    </Card>
</div><ConfirmDeleteModal isOpen={!!rezultatToDelete} onClose={() => setRezultatToDelete(null)} onConfirm={() => { if(rezultatToDelete) confirmDeleteRezultat(rezultatToDelete.id) }} tableName="înscriere" isLoading={isDeletingRezultat} /> </Card> );
};

// --- Componenta Principală ---
interface StagiiCompetitiiProps { type: 'Stagiu' | 'Competitie'; evenimente: Eveniment[]; setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; inscrieriExamene: InscriereExamen[]; examene: Examen[]; grade: Grad[]; onBack: () => void; currentUser: User; permissions: Permissions; }
export const StagiiCompetitiiManagement: React.FC<StagiiCompetitiiProps> = ({ type, evenimente, setEvenimente, rezultate, setRezultate, sportivi, setPlati, preturiConfig, inscrieriExamene, examene, grade, onBack, currentUser, permissions }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [evToEdit, setEvToEdit] = useState<Eveniment | null>(null);
    const [evToDelete, setEvToDelete] = useState<Eveniment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEvenimentId, setSelectedEvenimentId] = useLocalStorage<string | null>(`phi-hau-selected-${type}`, null);
    const { showError, showSuccess } = useError();
    
    const filteredEvenimente = useMemo(() => (evenimente || []).filter(ev => ev.tip === type), [evenimente, type]);
    const selectedEveniment = useMemo(() => selectedEvenimentId ? filteredEvenimente.find(e => e.id === selectedEvenimentId) || null : null, [selectedEvenimentId, filteredEvenimente]);

    const handleSave = async (evData: Omit<Eveniment, 'id'>) => {
        if (evToEdit) {
            const { data, error } = await supabase.from('evenimente').update(evData).eq('id', evToEdit.id).select().single();
            if (error) { 
                console.error('DEBUG:', error);
                showError("Eroare la actualizare", error); 
            } else if (data) { setEvenimente(prev => prev.map(e => e.id === data.id ? data : e)); showSuccess("Succes", `${type} actualizat.`); }
        } else {
            const { data, error } = await supabase.from('evenimente').insert(evData).select().single();
            if (error) { 
                console.error('DEBUG:', error);
                showError("Eroare la adăugare", error); 
            } else if (data) { setEvenimente(prev => [...prev, data]); showSuccess("Succes", `${type} adăugat.`); }
        }
    };
    
    const confirmDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            await supabase.from('rezultate').delete().eq('eveniment_id', id);
            await supabase.from('evenimente').delete().eq('id', id);
            setEvenimente(prev => prev.filter(e => e.id !== id));
            if (selectedEvenimentId === id) setSelectedEvenimentId(null);
            showSuccess("Succes", `${type} și înscrierile asociate au fost șterse.`);
        } catch(err) { 
            console.error('DEBUG:', err);
            showError("Eroare la ștergere", err); 
        }
        finally { setIsDeleting(false); setEvToDelete(null); }
    };

    if (selectedEveniment) { return ( <div><Button onClick={() => setSelectedEvenimentId(null)} className="mb-4" variant="secondary"><ArrowLeftIcon /> Înapoi la listă</Button><EvenimentDetail eveniment={selectedEveniment} rezultate={rezultate.filter(r => r.eveniment_id === selectedEveniment.id)} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} inscrieriExamene={inscrieriExamene} examene={examene} grade={grade} /></div> ); }
    const sortedEvenimente = [...filteredEvenimente].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune {type === 'Stagiu' ? 'Stagii' : 'Competiții'}</h1><Button onClick={() => { setEvToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Adaugă {type}</Button></div><div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Dată</th><th className="p-4 font-semibold">Denumire</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead><tbody className="divide-y divide-slate-700">{sortedEvenimente.map(ev => ( <tr key={ev.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedEvenimentId(ev.id)}>{formatDateRange(ev.data)}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedEvenimentId(ev.id)}>{ev.denumire}</td><td className="p-4">{rezultate.filter(r => r.eveniment_id === ev.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setEvToEdit(ev); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setEvToDelete(ev)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}{sortedEvenimente.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Niciun eveniment de tipul '{type}' programat.</p></td></tr>}</tbody></table></div><EvenimentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} evToEdit={evToEdit} type={type} currentUser={currentUser} permissions={permissions} />
<ConfirmDeleteModal isOpen={!!evToDelete} onClose={() => setEvToDelete(null)} onConfirm={() => { if(evToDelete) confirmDelete(evToDelete.id) }} tableName={type} isLoading={isDeleting} /></div> );
};