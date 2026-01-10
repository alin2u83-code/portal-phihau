import React, { useState } from 'react';
import { Examen, Participare, Sportiv, Grad, Plata, PretConfig } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);
const getAgeOnDate = (birthDateStr: string, onDateStr: string) => { const onDate = new Date(onDateStr); const birthDate = new Date(birthDateStr); let age = onDate.getFullYear() - birthDate.getFullYear(); const m = onDate.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

interface ExamenFormProps { isOpen: boolean; onClose: () => void; onSave: (examen: Omit<Examen, 'id'>) => Promise<void>; examenToEdit: Examen | null; }
const ExamenForm: React.FC<ExamenFormProps> = ({ isOpen, onClose, onSave, examenToEdit }) => {
  const [formState, setFormState] = useState<Omit<Examen, 'id'>>({ data: new Date().toISOString().split('T')[0], locatia: '', comisia: '' });
  const [loading, setLoading] = useState(false);
  React.useEffect(() => { if (examenToEdit) { setFormState(examenToEdit); } else { setFormState({ data: new Date().toISOString().split('T')[0], locatia: '', comisia: '' }); } }, [examenToEdit, isOpen]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave(formState); setLoading(false); onClose(); };
  return ( <Modal isOpen={isOpen} onClose={onClose} title={examenToEdit ? "Editează Examen" : "Adaugă Examen Nou"}><form onSubmit={handleSubmit} className="space-y-4"><Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required /><Input label="Locația" name="locatia" value={formState.locatia} onChange={handleChange} required /><Input label="Comisia" name="comisia" value={formState.comisia} onChange={handleChange} required /><div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div></form></Modal> );
};

interface ExamenDetailProps { examen: Examen; participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>; sportivi: Sportiv[]; grade: Grad[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturi: PretConfig[]; allParticipari: Participare[]; examene: Examen[]; }
const ExamenDetail: React.FC<ExamenDetailProps> = ({ examen, participari, setParticipari, sportivi, grade, setPlati, preturi, allParticipari, examene }) => {
    const [sportivId, setSportivId] = useState('');
    const [showSuccess, setShowSuccess] = useState<string | null>(null);
    const sortedGrades = [...grade].sort((a,b) => a.ordine - b.ordine);
    const { showError } = useError();

    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit.");
            return;
        }
        const sportiv = sportivi.find(s => s.id === sportivId);
        if(!sportiv || participari.some(p => p.sportiv_id === sportivId)) { 
            showError("Selecție Invalidă", "Selectează un sportiv valid care nu este deja înscris."); 
            return; 
        }

        const admittedParticipations = allParticipari.filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis').sort((a,b) => (getGrad(b.grad_sustinut_id, grade)?.ordine ?? 0) - (getGrad(a.grad_sustinut_id, grade)?.ordine ?? 0));
        
        let gradSustinut: Grad;
        let confirmationOnly = false;

        if (admittedParticipations.length === 0) {
            gradSustinut = sortedGrades[0];
        } else {
            const currentGrad = getGrad(admittedParticipations[0].grad_sustinut_id, grade)!;
            const nextGrad = sortedGrades.find(g => g.ordine === (currentGrad.ordine + 1));
            
            if (nextGrad) {
                const ageAtExam = getAgeOnDate(sportiv.data_nasterii, examen.data); 
                const lastExamDate = new Date(examene.find(ex => ex.id === admittedParticipations[0].examen_id)!.data); 
                const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare); 
                const eligibilityDate = new Date(lastExamDate); 
                eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
                
                if (ageAtExam >= nextGrad.varsta_minima && new Date(examen.data) >= eligibilityDate) {
                    gradSustinut = nextGrad;
                } else {
                    gradSustinut = currentGrad;
                    confirmationOnly = true;
                }
            } else {
                gradSustinut = currentGrad;
                confirmationOnly = true;
            }
        }
        
        if (!gradSustinut) {
            showError("Eroare Logică", "Nu s-a putut determina gradul pentru acest sportiv. Verificați nomenclatorul de grade.");
            return;
        }

        const {data: participareData, error: pError} = await supabase.from('participari').insert({ examen_id: examen.id, sportiv_id: sportivId, grad_sustinut_id: gradSustinut.id, rezultat: 'Neprezentat' }).select().single();
        if (pError) { showError("Eroare Bază de Date", pError); return; }
        if (participareData) setParticipari(prev => [...prev, participareData as Participare]);
        
        const pretExamenConfig = getPretValabil(preturi, 'Taxa Examen', examen.data);
        if (!pretExamenConfig) { 
            showError("Avertisment Configurare", "Configurarea prețului pentru 'Taxa Examen' nu a fost găsită. Participantul a fost adăugat, dar plata trebuie generată manual."); 
            return; 
        }
        const descriere = `Taxa examen ${examen.data}${confirmationOnly ? ` (Confirmare ${gradSustinut.nume})` : ` (pt. ${gradSustinut.nume})`}`;
        
        const newPlata: Omit<Plata, 'id' | 'data_platii' | 'metoda_plata'> = {
            sportiv_id: sportivId,
            familie_id: sportiv.familie_id,
            suma: pretExamenConfig.suma,
            data: examen.data,
            status: 'Neachitat',
            descriere,
            tip: 'Taxa Examen',
            observatii: ''
        };

        const {data: plataData, error: plError} = await supabase.from('plati').insert(newPlata).select().single();
        if(plError) { showError("Eroare Plată", `Participant adăugat, dar eroare la generare plată: ${plError.message}`); }
        if (plataData) setPlati(prev => [...prev, plataData as Plata]);
        
        setShowSuccess(`Factura pentru ${sportiv.nume} ${sportiv.prenume} a fost generată cu succes!`);
        setTimeout(() => setShowSuccess(null), 3000); setSportivId('');
    };

    const handleUpdateParticipare = async (participareId: string, field: keyof Participare, value: string) => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit.");
            return;
        }
        const { data, error } = await supabase.from('participari').update({ [field]: value }).eq('id', participareId).select().single();
        if (error) { showError("Eroare la actualizare", error); return; }
        if(data) setParticipari(prev => prev.map(p => p.id === participareId ? data as Participare : p));
    };
    
    const handleDeleteParticipare = async (participareId: string) => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit.");
            return;
        }
        const { error } = await supabase.from('participari').delete().eq('id', participareId);
        if (error) { showError("Eroare la ștergere", error); return; }
        setParticipari(prev => prev.filter(p => p.id !== participareId));
    };

    return ( <Card> <h3 className="text-2xl font-bold text-white">{examen.locatia} - {examen.data}</h3><p className="text-slate-400">Comisia: {examen.comisia}</p><div className="mt-6 border-t border-slate-700 pt-6"> <h4 className="text-xl font-semibold mb-4 text-white">Participanți</h4><div className="space-y-2 mb-6">{participari.map(p => { const sportiv = sportivi.find(s => s.id === p.sportiv_id); return ( <div key={p.id} className="bg-slate-700/50 p-3 rounded-md grid grid-cols-1 md:grid-cols-5 gap-4 items-center"><p className="font-medium col-span-1 md:col-span-1">{sportiv?.nume} {sportiv?.prenume}</p><Select label="" value={p.grad_sustinut_id} onChange={e => handleUpdateParticipare(p.id, 'grad_sustinut_id', e.target.value)}>{sortedGrades.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select><Select label="" value={p.rezultat} onChange={e => handleUpdateParticipare(p.id, 'rezultat', e.target.value)}><option value="Admis">Admis</option><option value="Respins">Respins</option><option value="Neprezentat">Neprezentat</option></Select><Input label="" placeholder="Observații..." defaultValue={p.observatii || ''} onBlur={e => handleUpdateParticipare(p.id, 'observatii', e.target.value)} /><Button onClick={() => handleDeleteParticipare(p.id)} variant="danger" size="sm" className="justify-self-end"><TrashIcon /></Button></div> )})}{participari.length === 0 && <p className="text-slate-400">Niciun participant înscris.</p>}</div><Card className="bg-slate-900/50"><h5 className="text-lg font-semibold mb-2 text-white">Adaugă Participant</h5><form onSubmit={handleAddParticipant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"><div className="col-span-2"><Select label="Sportiv" value={sportivId} onChange={e => setSportivId(e.target.value)}><option value="">Selectează Sportiv</option>{sportivi.filter(s => s.status === 'Activ' && !participari.some(p => p.sportiv_id === s.id)).map(s => ( <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option> ))}</Select></div><Button type="submit" variant="info">Adaugă</Button></form>{showSuccess && <p className="text-green-400 mt-2 text-sm font-semibold">{showSuccess}</p>}</Card></div></Card> )
}

interface ExameneManagementProps { onBack: () => void; examene: Examen[]; setExamene: React.Dispatch<React.SetStateAction<Examen[]>>; participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>; sportivi: Sportiv[]; grade: Grad[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturi: PretConfig[]; }
export const ExameneManagement: React.FC<ExameneManagementProps> = ({ onBack, examene, setExamene, participari, setParticipari, sportivi, grade, setPlati, preturi }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [examenToEdit, setExamenToEdit] = useState<Examen | null>(null);
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const { showError } = useError();
  
  const handleSaveExamen = async (examenData: Omit<Examen, 'id'>) => {
    if (!supabase) {
        showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit.");
        return;
    }
    if (examenToEdit) {
        const { data, error } = await supabase.from('examene').update(examenData).eq('id', examenToEdit.id).select().single();
        if (error) { showError("Eroare la actualizare", error); return; }
        if (data) setExamene(prev => prev.map(e => e.id === examenToEdit.id ? data as Examen : e));
    } else {
        const { data, error } = await supabase.from('examene').insert(examenData).select().single();
        if (error) { showError("Eroare la adăugare", error); return; }
        if (data) setExamene(prev => [...prev, data as Examen]);
    }
  };

  const handleEdit = (examen: Examen) => { setExamenToEdit(examen); setIsFormOpen(true); };
  
  const handleDelete = async (examenId: string) => {
    if (!supabase) {
        showError("Eroare Configurare", "Clientul Supabase nu a putut fi stabilit.");
        return;
    }
    if (!window.confirm("Ești sigur? Toate participările asociate vor fi șterse.")) return;
    
    const { error: participariError } = await supabase.from('participari').delete().eq('examen_id', examenId);
    if(participariError) { showError("Eroare la ștergerea participarilor", participariError); return; }
    setParticipari(prev => prev.filter(p => p.examen_id !== examenId));
    
    const { error: examenError } = await supabase.from('examene').delete().eq('id', examenId);
    if(examenError) { showError("Eroare la ștergerea examenului", examenError); return; }
    setExamene(prev => prev.filter(e => e.id !== examenId));
    
    if (selectedExamen?.id === examenId) setSelectedExamen(null);
  };

  if(selectedExamen) { return ( <div><Button onClick={() => setSelectedExamen(null)} className="mb-4" variant="secondary">&larr; Înapoi la listă</Button><ExamenDetail examen={selectedExamen} participari={participari.filter(p => p.examen_id === selectedExamen.id)} setParticipari={setParticipari} sportivi={sportivi} grade={grade} setPlati={setPlati} preturi={preturi} allParticipari={participari} examene={examene}/></div> ) }
  const sortedExamene = [...examene].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Management Examene</h1><Button onClick={() => { setExamenToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Examen</Button></div><div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Participanți</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead><tbody className="divide-y divide-slate-700">{sortedExamene.map(examen => ( <tr key={examen.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedExamen(examen)}>{examen.data}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedExamen(examen)}>{examen.locatia}</td><td className="p-4">{participari.filter(p => p.examen_id === examen.id).length}</td><td className="p-4"><div className="flex items-center justify-end space-x-2"><Button onClick={() => handleEdit(examen)} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => handleDelete(examen.id)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}{sortedExamene.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Niciun examen programat.</p></td></tr>}</tbody></table></div><ExamenForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveExamen} examenToEdit={examenToEdit} /></div> );
};