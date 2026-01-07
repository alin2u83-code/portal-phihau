
import React, { useState } from 'react';
import { Eveniment, Rezultat, Sportiv, Plata, PretConfig } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretValabil } from '../utils/pricing';

interface EvenimentFormProps { isOpen: boolean; onClose: () => void; onSave: (ev: Eveniment) => void; evToEdit: Eveniment | null; type: 'Stagiu' | 'Competitie'; }
const EvenimentForm: React.FC<EvenimentFormProps> = ({ isOpen, onClose, onSave, evToEdit, type }) => {
    const [formState, setFormState] = useState<Omit<Eveniment, 'id'>>({ denumire: '', data: new Date().toISOString().split('T')[0], locatie: '', organizator: '', tip: type });
    React.useEffect(() => { if (evToEdit) { setFormState(evToEdit); } else { setFormState({ denumire: '', data: new Date().toISOString().split('T')[0], locatie: '', organizator: '', tip: type }); } }, [evToEdit, isOpen, type]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: evToEdit?.id || new Date().toISOString(), ...formState }); onClose(); };
    return ( <Modal isOpen={isOpen} onClose={onClose} title={evToEdit ? `Editează ${type}` : `Adaugă ${type} Nou`}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Denumire" name="denumire" value={formState.denumire} onChange={handleChange} required /> <Input label="Data" name="data" type="date" value={formState.data} onChange={handleChange} required /> <Input label="Locație" name="locatie" value={formState.locatie} onChange={handleChange} /> <Input label="Organizator" name="organizator" value={formState.organizator} onChange={handleChange} /> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Anulează</Button><Button variant="success" type="submit">Salvează</Button></div> </form> </Modal> );
};

interface EvenimentDetailProps { eveniment: Eveniment; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; }
const EvenimentDetail: React.FC<EvenimentDetailProps> = ({ eveniment, rezultate, setRezultate, sportivi, setPlati, preturiConfig }) => {
    const [sportivId, setSportivId] = useState('');
    const [showSuccess, setShowSuccess] = useState<string | null>(null);

    const handleAddParticipant = (e: React.FormEvent) => {
        e.preventDefault();
        const sportiv = sportivi.find(s => s.id === sportivId);
        if (!sportiv || rezultate.some(r => r.sportivId === sportivId)) { alert("Selectează un sportiv valid care nu este deja înscris."); return; }

        setRezultate(prev => [...prev, { id: new Date().toISOString(), evenimentId: eveniment.id, sportivId: sportivId, rezultat: 'Înscris', probe: '' }]);

        const categorie = eveniment.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie';
        const pretConfig = getPretValabil(preturiConfig, categorie, eveniment.data);

        if (!pretConfig) { alert(`Configurarea prețului pentru '${categorie}' nu a fost găsită. Participantul a fost adăugat, dar plata trebuie generată manual.`); setSportivId(''); return; }
        
        const newPlata: Plata = { id: new Date().toISOString(), sportivId: sportiv.id, familieId: sportiv.familieId, suma: pretConfig.suma, data: new Date().toISOString().split('T')[0], status: 'Neachitat', descriere: `Taxa ${eveniment.denumire}`, tip: categorie, metodaPlata: null, dataPlatii: null, observatii: `Generată la înscrierea în eveniment.`, };
        setPlati(prev => [...prev, newPlata]);

        setShowSuccess(`Participantul ${sportiv.nume} ${sportiv.prenume} a fost înscris și taxa a fost generată.`);
        setTimeout(() => setShowSuccess(null), 4000);
        setSportivId('');
    };
    
    const handleUpdateRezultat = (rezultatId: string, field: 'rezultat' | 'probe', value: string) => { setRezultate(prev => prev.map(r => r.id === rezultatId ? { ...r, [field]: value } : r)); };
    const handleDeleteRezultat = (rezultatId: string) => { setRezultate(prev => prev.filter(r => r.id !== rezultatId)); };
    
    return ( <Card> <h3 className="text-2xl font-bold text-white">{eveniment.denumire} - {new Date(eveniment.data).toLocaleDateString('ro-RO')}</h3> <p className="text-slate-400">{eveniment.locatie} (Org: {eveniment.organizator})</p> <div className="mt-6 border-t border-slate-700 pt-6"> <h4 className="text-xl font-semibold mb-4 text-white">Participanți & Rezultate</h4> <div className="space-y-2 mb-6">{rezultate.map(r => { const sportiv = sportivi.find(s => s.id === r.sportivId); return ( <div key={r.id} className="bg-slate-700 p-3 rounded-md grid grid-cols-1 md:grid-cols-4 gap-4 items-center"> <p className="font-medium">{sportiv?.nume} {sportiv?.prenume}</p> <Input label="" value={r.rezultat} onChange={e => handleUpdateRezultat(r.id, 'rezultat', e.target.value)} placeholder="Ex: Locul 1, Medalie de aur" /> {eveniment.tip === 'Competitie' && <Input label="" value={r.probe || ''} onChange={e => handleUpdateRezultat(r.id, 'probe', e.target.value)} placeholder="Probe: Quyen, Song Dau..." />} <Button onClick={() => handleDeleteRezultat(r.id)} variant="danger" size="sm" className="justify-self-end md:col-start-4"><TrashIcon /></Button> </div> ) })} {rezultate.length === 0 && <p className="text-slate-400">Niciun participant înscris.</p>} </div> <Card className="bg-slate-900/50"> <h5 className="text-lg font-semibold mb-2 text-white">Adaugă Participant</h5> <form onSubmit={handleAddParticipant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"> <div className="col-span-2"> <Select label="Sportiv" value={sportivId} onChange={e => setSportivId(e.target.value)}> <option value="">Selectează Sportiv</option> {sportivi.filter(s => s.status === 'Activ' && !rezultate.some(p => p.sportivId === s.id)).map(s => ( <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option> ))} </Select> </div> <Button type="submit" variant="info">Adaugă</Button> </form> {showSuccess && <p className="text-green-400 mt-2 text-sm font-semibold">{showSuccess}</p>} </Card> </div> </Card> );
};

interface StagiiCompetitiiProps { onBack: () => void; type: 'Stagiu' | 'Competitie'; evenimente: Eveniment[]; setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; }
export const StagiiCompetitiiManagement: React.FC<StagiiCompetitiiProps> = ({ onBack, type, evenimente, setEvenimente, rezultate, setRezultate, sportivi, setPlati, preturiConfig }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [evToEdit, setEvToEdit] = useState<Eveniment | null>(null);
    const [selectedEv, setSelectedEv] = useState<Eveniment | null>(null);
    const handleSave = (ev: Eveniment) => { if (evToEdit) { setEvenimente(prev => prev.map(e => e.id === ev.id ? ev : e)); } else { setEvenimente(prev => [...prev, ev]); } };
    const handleEdit = (ev: Eveniment) => { setEvToEdit(ev); setIsFormOpen(true); };
    const handleDelete = (evId: string) => { if (window.confirm("Ești sigur? Toate rezultatele asociate vor fi șterse.")) { setEvenimente(prev => prev.filter(e => e.id !== evId)); setRezultate(prev => prev.filter(p => p.evenimentId !== evId)); if (selectedEv?.id === evId) setSelectedEv(null); } };

    const filteredEvenimente = evenimente.filter(ev => ev.tip === type);

    if(selectedEv) { return ( <div> <Button onClick={() => setSelectedEv(null)} className="mb-4" variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la listă</Button> <EvenimentDetail eveniment={selectedEv} rezultate={rezultate.filter(r => r.evenimentId === selectedEv.id)} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} /> </div> ); }
    const sortedEvenimente = [...filteredEvenimente].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return ( <div> <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button> <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Management {type === 'Stagiu' ? 'Stagii' : 'Competiții'}</h1> <Button onClick={() => { setEvToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă {type}</Button> </div> <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden"> <table className="w-full text-left"> <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Eveniment</th><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Participanți</th><th className="p-4 font-semibold">Acțiuni</th></tr></thead> <tbody> {sortedEvenimente.map(ev => ( <tr key={ev.id} className="border-b border-slate-700 hover:bg-slate-700/50"> <td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedEv(ev)}>{ev.denumire}</td> <td className="p-4 cursor-pointer" onClick={() => setSelectedEv(ev)}>{new Date(ev.data).toLocaleDateString('ro-RO')}</td> <td className="p-4">{rezultate.filter(p => p.evenimentId === ev.id).length}</td> <td className="p-4"><div className="flex items-center space-x-2"><Button onClick={() => handleEdit(ev)} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => handleDelete(ev.id)} variant="danger" size="sm"><TrashIcon /></Button></div></td> </tr> ))} </tbody> </table> {sortedEvenimente.length === 0 && <p className="p-4 text-center text-slate-400">Niciun eveniment înregistrat.</p>} </div> <EvenimentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} evToEdit={evToEdit} type={type} /> </div> );
};