import React, { useState, useMemo } from 'react';
import { Eveniment, Rezultat, Sportiv, Plata, PretConfig, Participare, Examen, Grad } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useLocalStorage } from '../hooks/useLocalStorage';

const formatDateRange = (start: string) => {
    return new Date(start).toLocaleDateString('ro-RO');
};

interface EvenimentFormProps { isOpen: boolean; onClose: () => void; onSave: (ev: Omit<Eveniment, 'id'>) => Promise<void>; evToEdit: Eveniment | null; type: 'Stagiu' | 'Competitie'; }
const EvenimentForm: React.FC<EvenimentFormProps> = ({ isOpen, onClose, onSave, evToEdit, type }) => {
    const [formState, setFormState] = useState<Omit<Eveniment, 'id' | 'probe_disponibile'>>({ denumire: '', data: new Date().toISOString().split('T')[0], locatie: '', organizator: '', tip: type });
    const [probeStr, setProbeStr] = useState('');
    const [loading, setLoading] = useState(false);
    
    React.useEffect(() => {
        if (isOpen) {
            if (evToEdit) {
                setFormState({ denumire: evToEdit.denumire, data: evToEdit.data, locatie: evToEdit.locatie, organizator: evToEdit.organizator, tip: evToEdit.tip });
                setProbeStr(evToEdit.probe_disponibile?.join(', ') || '');
            } else {
                setFormState({ denumire: '', data: new Date().toISOString().split('T')[0], locatie: '', organizator: '', tip: type });
                setProbeStr('');
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
        const eventData: Omit<Eveniment, 'id'> = {
            ...formState,
            ...(type === 'Competitie' && { probe_disponibile: probeStr.split(',').map(p => p.trim()).filter(Boolean) })
        };
        await onSave(eventData);
        setLoading(false);
        onClose();
    };

    return ( <Modal isOpen={isOpen} onClose={onClose} title={evToEdit ? `Editează ${type}` : `Adaugă ${type} Nou`}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Denumire" name="denumire" value={formState.denumire} onChange={handleChange} required /> <Input label="Data Eveniment" name="data" type="date" value={formState.data} onChange={handleChange} required /> <Input label="Locație" name="locatie" value={formState.locatie} onChange={handleChange} /> <Input label="Organizator" name="organizator" value={formState.organizator} onChange={handleChange} /> {type === 'Competitie' && ( <Input label="Probe Competiție (separate prin virgulă)" name="probe" value={probeStr} onChange={(e) => setProbeStr(e.target.value)} placeholder="Ex: Quyen, Song Dau, Arme" /> )} <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};

interface EvenimentDetailProps { eveniment: Eveniment; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; participari: Participare[]; examene: Examen[]; grade: Grad[]; }
const EvenimentDetail: React.FC<EvenimentDetailProps> = ({ eveniment, rezultate, setRezultate, sportivi, setPlati, preturiConfig, participari, examene, grade }) => {
    const [sportivId, setSportivId] = useState('');
    const [showSuccess, setShowSuccess] = useState<string | null>(null);

    const sortedRezultate = useMemo(() => {
        const getGradOrder = (sportiv: Sportiv) => {
            const admitted = participari
                .filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis')
                .map(p => ({ ...p, examen: examene.find(e => e.id === p.examen_id) }))
                .filter(p => p.examen) // ensure exam is found
                .sort((p1, p2) => new Date(p2.examen!.data).getTime() - new Date(p1.examen!.data).getTime());
            
            if (admitted.length === 0) return 0; // Beginner
            const currentGrad = grade.find(g => g.id === admitted[0].grad_sustinut_id);
            return currentGrad ? currentGrad.ordine : 0;
        };

        return [...rezultate].sort((a, b) => {
            const sportivA = sportivi.find(s => s.id === a.sportiv_id);
            const sportivB = sportivi.find(s => s.id === b.sportiv_id);
            if (!sportivA || !sportivB) return 0;

            const gradOrderA = getGradOrder(sportivA);
            const gradOrderB = getGradOrder(sportivB);

            if (gradOrderB !== gradOrderA) {
                return gradOrderB - gradOrderA; // Higher grade (higher ordine) first
            }

            const nameA = `${sportivA.nume} ${sportivA.prenume}`;
            const nameB = `${sportivB.nume} ${sportivB.prenume}`;
            return nameA.localeCompare(nameB);
        });
    }, [rezultate, sportivi, participari, examene, grade]);

    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        const sportiv = sportivi.find(s => s.id === sportivId);
        if (!sportiv || rezultate.some(r => r.sportiv_id === sportivId)) { alert("Selectează un sportiv valid care nu este deja înscris."); return; }

        const { data: rezultatData, error: rezultatError } = await supabase.from('rezultate').insert({ eveniment_id: eveniment.id, sportiv_id: sportivId, rezultat: 'Înscris' }).select().single();
        if (rezultatError) { alert(`Eroare la adăugarea participantului: ${rezultatError.message}`); return; }

        const categorie = eveniment.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie';
        const pretConfig = getPretValabil(preturiConfig, categorie, eveniment.data);

        if (pretConfig) {
            const newPlata = { 
                sportiv_id: sportiv.id, 
                familie_id: sportiv.familie_id, 
                suma: pretConfig.suma, 
                data: new Date().toISOString().split('T')[0], 
                status: 'Neachitat' as const, 
                descriere: `Taxa ${eveniment.denumire}`, 
                tip: categorie,
                observatii: `Generată la înscrierea în eveniment.`, 
            };
            const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlata).select().single();
            if(plataError) { alert(`Participant adăugat, dar eroare la generare plată: ${plataError.message}`); }
            if (plataData) setPlati(prev => [...prev, plataData as Plata]);
        }
        
        if(rezultatData) setRezultate(prev => [...prev, rezultatData as Rezultat]);
        setShowSuccess(`Participantul ${sportiv.nume} ${sportiv.prenume} a fost înscris și taxa a fost generată.`);
        setTimeout(() => setShowSuccess(null), 4000);
        setSportivId('');
    };
    
    const handleUpdateRezultat = async (rezultatId: string, updates: Partial<Rezultat>) => { 
        if (!supabase) return;
        const {data, error} = await supabase.from('rezultate').update(updates).eq('id', rezultatId).select().single();
        if(error) { alert(`Eroare la actualizare: ${error.message}`); }
        else if (data) { setRezultate(prev => prev.map(r => r.id === rezultatId ? data as Rezultat : r)); }
    };
    const handleDeleteRezultat = async (rezultatId: string) => { 
        if(!supabase) return;
        if (window.confirm("Sunteți sigur că doriți să ștergeți această înregistrare? Această acțiune este ireversibilă.")) {
            const {error} = await supabase.from('rezultate').delete().eq('id', rezultatId);
            if(error) { alert(`Eroare la ștergere: ${error.message}`); }
            else { setRezultate(prev => prev.filter(r => r.id !== rezultatId)); }
        }
    };
    
    const handleProbeChange = (rezultatId: string, proba: string, isChecked: boolean) => {
        const rezultat = rezultate.find(r => r.id === rezultatId);
        if(!rezultat) return;
        const currentProbes = rezultat.probe ? rezultat.probe.split(',').map(p => p.trim()).filter(Boolean) : [];
        const newProbes = isChecked ? [...new Set([...currentProbes, proba])] : currentProbes.filter(p => p !== proba);
        handleUpdateRezultat(rezultatId, { probe: newProbes.join(', ') });
    };

    return ( <Card> <h3 className="text-2xl font-bold text-white">{eveniment.denumire} - {formatDateRange(eveniment.data)}</h3> <p className="text-slate-400">{eveniment.locatie} (Org: {eveniment.organizator})</p> <div className="mt-6 border-t border-slate-700 pt-6"> <h4 className="text-xl font-semibold mb-4 text-white">Participanți & Rezultate</h4> <div className="space-y-2 mb-6">{sortedRezultate.map(r => { const sportiv = sportivi.find(s => s.id === r.sportiv_id); return ( <div key={r.id} className="bg-slate-700 p-3 rounded-md grid grid-cols-1 md:grid-cols-4 gap-4 items-center"> <p className="font-medium">{sportiv?.nume} {sportiv?.prenume}</p> <Input label="" value={r.rezultat} onBlur={e => handleUpdateRezultat(r.id, { rezultat: e.target.value })} onChange={e => setRezultate(prev => prev.map(res => res.id === r.id ? {...res, rezultat: e.target.value} : res))} placeholder="Ex: Locul 1, Medalie de aur" /> {eveniment.tip === 'Competitie' ? ( <div className="flex flex-wrap items-center gap-x-4 gap-y-2"> {eveniment.probe_disponibile && eveniment.probe_disponibile.length > 0 ? ( eveniment.probe_disponibile.map(proba => ( <label key={proba} className="flex items-center space-x-2 text-sm cursor-pointer"> <input type="checkbox" className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500" checked={r.probe?.includes(proba) || false} onChange={(e) => handleProbeChange(r.id, proba, e.target.checked)} /> <span>{proba}</span> </label> )) ) : ( <p className="text-xs text-slate-400">Nicio probă definită.</p> )} </div> ) : null} <Button onClick={() => handleDeleteRezultat(r.id)} variant="danger" size="sm" className="justify-self-end md:col-start-4"><TrashIcon /></Button> </div> ) })} {rezultate.length === 0 && <p className="text-slate-400">Niciun participant înscris.</p>} </div> <Card className="bg-slate-900/50"> <h5 className="text-lg font-semibold mb-2 text-white">Adaugă Participant</h5> <form onSubmit={handleAddParticipant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"> <div className="col-span-2"> <Select label="Sportiv" value={sportivId} onChange={e => setSportivId(e.target.value)}> <option value="">Selectează Sportiv</option> {sportivi.filter(s => s.status === 'Activ' && !rezultate.some(p => p.sportiv_id === s.id)).map(s => ( <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option> ))} </Select> </div> <Button type="submit" variant="info">Adaugă</Button> </form> {showSuccess && <p className="text-green-400 mt-2 text-sm font-semibold">{showSuccess}</p>} </Card> </div> </Card> );
};

interface StagiiCompetitiiProps { onBack: () => void; type: 'Stagiu' | 'Competitie'; evenimente: Eveniment[]; setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; participari: Participare[]; examene: Examen[]; grade: Grad[]; }
export const StagiiCompetitiiManagement: React.FC<StagiiCompetitiiProps> = ({ onBack, type, evenimente, setEvenimente, rezultate, setRezultate, sportivi, setPlati, preturiConfig, participari, examene, grade }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [evToEdit, setEvToEdit] = useState<Eveniment | null>(null);
    const [selectedEvId, setSelectedEvId] = useLocalStorage<string | null>(`phi-hau-selected-${type.toLowerCase()}-id`, null);

    const selectedEv = useMemo(() => {
        if (!selectedEvId) return null;
        return evenimente.find(ev => ev.id === selectedEvId) || null;
    }, [selectedEvId, evenimente]);

    const handleSetSelectedEv = (ev: Eveniment | null) => {
        setSelectedEvId(ev ? ev.id : null);
    };
    
    const handleSave = async (evData: Omit<Eveniment, 'id'>) => {
        if (!supabase) return;
        if (evToEdit) {
            const { data, error } = await supabase.from('evenimente').update(evData).eq('id', evToEdit.id).select().single();
            if (error) { alert(`Eroare la actualizare: ${error.message}`); } 
            else if (data) { setEvenimente(prev => prev.map(e => e.id === evToEdit.id ? data as Eveniment : e)); }
        } else {
            const { data, error } = await supabase.from('evenimente').insert(evData).select().single();
            if (error) { alert(`Eroare la adăugare: ${error.message}`); } 
            else if (data) { setEvenimente(prev => [...prev, data as Eveniment]); }
        }
    };
    
    const handleEdit = (ev: Eveniment) => { setEvToEdit(ev); setIsFormOpen(true); };
    
    const handleDelete = async (evId: string) => { 
        if (!supabase) return;
        if (window.confirm("Sunteți sigur că doriți să ștergeți această înregistrare? Această acțiune este ireversibilă.")) {
            const { error: deleteRezultateError } = await supabase.from('rezultate').delete().eq('eveniment_id', evId);
            if (deleteRezultateError) { alert(`Eroare la ștergerea rezultatelor: ${deleteRezultateError.message}`); return; }

            const { error: deleteEventError } = await supabase.from('evenimente').delete().eq('id', evId);
            if (deleteEventError) { alert(`Eroare la ștergerea evenimentului: ${deleteEventError.message}`); return; }

            setEvenimente(prev => prev.filter(e => e.id !== evId)); 
            setRezultate(prev => prev.filter(p => p.eveniment_id !== evId)); 
            if (selectedEv?.id === evId) handleSetSelectedEv(null); 
        } 
    };

    const filteredEvenimente = evenimente.filter(ev => ev.tip === type);

    if(selectedEv) { return ( <div> <Button onClick={() => handleSetSelectedEv(null)} className="mb-4" variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la listă</Button> <EvenimentDetail eveniment={selectedEv} rezultate={rezultate.filter(r => r.eveniment_id === selectedEv.id)} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={participari} examene={examene} grade={grade} /> </div> ); }
    const sortedEvenimente = [...filteredEvenimente].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return ( <div> <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button> <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Management {type === 'Stagiu' ? 'Stagii' : 'Competiții'}</h1> <Button onClick={() => { setEvToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă {type}</Button> </div> <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden"> <table className="w-full text-left"> <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Eveniment</th><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Participanți</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead> <tbody className="divide-y divide-slate-700"> {sortedEvenimente.map(ev => ( <tr key={ev.id} className="hover:bg-slate-700/50"> <td className="p-4 font-medium cursor-pointer" onClick={() => handleSetSelectedEv(ev)}>{ev.denumire}</td> <td className="p-4 cursor-pointer" onClick={() => handleSetSelectedEv(ev)}>{formatDateRange(ev.data)}</td> <td className="p-4">{rezultate.filter(p => p.eveniment_id === ev.id).length}</td> <td className="p-4 text-right w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => handleEdit(ev)} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => handleDelete(ev.id)} variant="danger" size="sm"><TrashIcon /></Button></div></td> </tr> ))} </tbody> </table> {sortedEvenimente.length === 0 && <p className="p-4 text-center text-slate-400">Niciun eveniment înregistrat.</p>} </div> <EvenimentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} evToEdit={evToEdit} type={type} /> </div> );
};