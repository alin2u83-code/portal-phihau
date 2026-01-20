import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata, PretConfig, Locatie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretProdus } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// --- UTILITIES ---
const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
const getAgeOnDate = (birthDateStr: string, onDateStr: string) => { const onDate = new Date(onDateStr); const birthDate = new Date(birthDateStr); let age = onDate.getFullYear() - birthDate.getFullYear(); const m = onDate.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { if (!durationStr) return 0; const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };


// FIX: Define the missing DataField component.
const DataField: React.FC<{label: string, value: React.ReactNode, className?: string}> = ({label, value, className}) => (
    <div className={className}>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-white">{value}</p>
    </div>
);

// --- SUB-COMPONENTS ---

// MODAL PENTRU CREARE/EDITARE SESIUNE
interface SesiuneFormProps { isOpen: boolean; onClose: () => void; onSave: (sesiune: Partial<SesiuneExamen>) => Promise<void>; sesiuneToEdit: SesiuneExamen | null; locatii: Locatie[]; }
const SesiuneForm: React.FC<SesiuneFormProps> = ({ isOpen, onClose, onSave, sesiuneToEdit, locatii }) => {
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (sesiuneToEdit) { setFormState(sesiuneToEdit); } else { setFormState({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: '' }); } }, [sesiuneToEdit, isOpen]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave(formState); setLoading(false); onClose(); };
  return ( <Modal isOpen={isOpen} onClose={onClose} title={sesiuneToEdit ? "Editează Sesiune Examen" : "Adaugă Sesiune Nouă"}><form onSubmit={handleSubmit} className="space-y-4"><Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required /><Select label="Locația" name="locatie_id" value={formState.locatie_id} onChange={handleChange} required><option value="">Selectează locația...</option>{locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}</Select><Input label="Comisia" name="comisia" value={formState.comisia} onChange={handleChange} required /><div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div></form></Modal> );
};

// VEDERE DETALIATĂ A UNEI SESIUNI
interface DetaliiSesiuneProps { sesiune: SesiuneExamen; inscrieri: InscriereExamen[]; setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>; sportivi: Sportiv[]; grade: Grad[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; allInscrieri: InscriereExamen[]; locatii: Locatie[]; }
const DetaliiSesiune: React.FC<DetaliiSesiuneProps> = ({ sesiune, inscrieri, setInscrieri, sportivi, grade, setPlati, preturiConfig, allInscrieri, locatii }) => {
    const [sportivId, setSportivId] = useState('');
    const [selectedGradId, setSelectedGradId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const { showError, showSuccess } = useError();
    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);
    
    const sportivData = useMemo(() => {
        if (!sportivId) return null;
        const sportiv = sportivi.find(s => s.id === sportivId);
        if (!sportiv) return null;

        const varstaLaExamen = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
        const admittedInscrieri = allInscrieri.filter(i => i.sportiv_id === sportiv.id && i.rezultat === 'Admis').sort((a, b) => (getGrad(b.grad_sustinut_id, grade)?.ordine ?? 0) - (getGrad(a.grad_sustinut_id, grade)?.ordine ?? 0));
        const gradActual = getGrad(admittedInscrieri[0]?.grad_sustinut_id, grade);

        let gradVizatAutomat: Grad | undefined;
        let eligibilityMessage = "";
        
        if (!gradActual) {
            if (varstaLaExamen >= 5 && varstaLaExamen <= 6) {
                gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('galben'));
                eligibilityMessage = "Primul examen, propunere bazată pe vârstă (5-6 ani).";
            } else if (varstaLaExamen >= 7 && varstaLaExamen <= 12) {
                gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('roș'));
                eligibilityMessage = "Primul examen, propunere bazată pe vârstă (7-12 ani).";
            } else {
                gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('albastr'));
                eligibilityMessage = "Primul examen, propunere bazată pe vârstă (13+ ani).";
            }
        } else {
            gradVizatAutomat = sortedGrades.find(g => g.ordine === gradActual.ordine + 1);
            if (gradVizatAutomat) {
                const lastExamDate = admittedInscrieri[0]?.examen ? new Date(admittedInscrieri[0].examen.data) : new Date(sportiv.data_inscrierii);
                const monthsToWait = parseDurationToMonths(gradVizatAutomat.timp_asteptare);
                const eligibilityDate = new Date(lastExamDate);
                eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
                eligibilityMessage = new Date() < eligibilityDate
                    ? `Timp așteptare: ${gradVizatAutomat.timp_asteptare}. Devine eligibil după ${eligibilityDate.toLocaleDateString('ro-RO')}.`
                    : `Timp așteptare (${gradVizatAutomat.timp_asteptare}) îndeplinit.`;
            } else {
                eligibilityMessage = "Grad maxim atins.";
            }
        }

        const gradVizatFinal = selectedGradId ? sortedGrades.find(g => g.id === selectedGradId) : gradVizatAutomat;
        const taxa = gradVizatFinal ? getPretProdus(preturiConfig, 'Taxa Examen', gradVizatFinal.nume, { dataReferinta: sesiune.data })?.suma : null;
        
        return { sportiv, gradActual, gradVizatAutomat, varstaLaExamen, eligibilityMessage, taxa };
    }, [sportivId, sportivi, allInscrieri, grade, sortedGrades, preturiConfig, sesiune.data, selectedGradId]);
    
    useEffect(() => {
        setSelectedGradId(sportivData?.gradVizatAutomat?.id || null);
    }, [sportivData?.gradVizatAutomat]);

    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sportivData || !selectedGradId) { showError("Date Invalide", "Sportivul sau gradul vizat nu sunt valide."); return; }
        
        const { sportiv, gradActual, varstaLaExamen, taxa } = sportivData;
        const gradVizat = sortedGrades.find(g => g.id === selectedGradId);
        if (!gradVizat) return;

        if (inscrieri.some(i => i.sportiv_id === sportiv.id)) { showError("Conflict", "Acest sportiv este deja înscris."); return; }
        
        setLoading(true);
        try {
            const newInscriere: Omit<InscriereExamen, 'id'> = { sesiune_id: sesiune.id, sportiv_id: sportiv.id, grad_actual_id: gradActual?.id || null, grad_sustinut_id: gradVizat.id, varsta_la_examen: varstaLaExamen, rezultat: 'Neprezentat', observatii: '' };
            const { data: inscriereData, error: pError } = await supabase.from('inscrieri_examene').insert(newInscriere).select().single();
            if (pError) throw pError;
            setInscrieri(prev => [...prev, inscriereData as InscriereExamen]);

            if (taxa) {
                const newPlata: Omit<Plata, 'id'> = { sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: taxa, data: sesiune.data, status: 'Neachitat', descriere: `Taxa examen grad ${gradVizat.nume}`, tip: 'Taxa Examen', observatii: `Generată la înscrierea în sesiune.` };
                const { data: plataData, error: plError } = await supabase.from('plati').insert(newPlata).select().single();
                if (plError) throw plError;
                setPlati(prev => [...prev, plataData as Plata]);
            }
            showSuccess("Succes", `Sportivul ${sportiv.nume} a fost înscris și taxa generată.`);
            setSportivId('');
        } catch(err) {
            showError("Eroare la înscriere", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateInscriere = async (inscriereId: string, field: keyof InscriereExamen, value: any) => {
        const { data, error } = await supabase.from('inscrieri_examene').update({ [field]: value }).eq('id', inscriereId).select().single();
        if (error) { showError("Eroare la actualizare", error); }
        else if(data) setInscrieri(prev => prev.map(p => p.id === inscriereId ? data as InscriereExamen : p));
    };
    
    const confirmDeleteInscriere = async (inscriereId: string) => {
        const { error } = await supabase.from('inscrieri_examene').delete().eq('id', inscriereId);
        if (error) { showError("Eroare la ștergere", error); }
        else { setInscrieri(prev => prev.filter(p => p.id !== inscriereId)); showSuccess("Succes", "Înscrierea a fost ștearsă."); }
        setInscriereToDelete(null);
    };

    return ( 
    <Card> <h3 className="text-2xl font-bold text-white">{locatii.find(l => l.id === sesiune.locatie_id)?.nume} - {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</h3><p className="text-slate-400">Comisia: {sesiune.comisia}</p><div className="mt-6 border-t border-slate-700 pt-6"> <h4 className="text-xl font-semibold mb-4 text-white">Participanți Înscriși ({inscrieri.length})</h4>
    <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">{inscrieri.map(i => { const s = sportivi.find(sp => sp.id === i.sportiv_id); const g = grade.find(gr => gr.id === i.grad_sustinut_id); return ( <div key={i.id} className="bg-slate-700/50 p-3 rounded-md grid grid-cols-1 md:grid-cols-5 gap-4 items-center"><p className="font-medium col-span-1 md:col-span-1">{s?.nume} {s?.prenume}</p><p className="text-sm text-slate-300">{g?.nume}</p><Select label="" value={i.rezultat} onChange={e => handleUpdateInscriere(i.id, 'rezultat', e.target.value)}><option value="Admis">Admis</option><option value="Respins">Respins</option><option value="Neprezentat">Neprezentat</option></Select><Input label="" placeholder="Observații..." defaultValue={i.observatii || ''} onBlur={e => handleUpdateInscriere(i.id, 'observatii', e.target.value)} /><Button onClick={() => setInscriereToDelete(i)} variant="danger" size="sm" className="justify-self-end"><TrashIcon /></Button></div> )})}{inscrieri.length === 0 && <p className="text-slate-400">Niciun participant înscris.</p>}</div>
    <Card className="bg-slate-900/50">
        <h5 className="text-lg font-semibold mb-4 text-white">Înscrie Sportiv Nou</h5>
        <form onSubmit={handleAddParticipant} className="space-y-4">
            <Select label="Sportiv" value={sportivId} onChange={e => setSportivId(e.target.value)}><option value="">Selectează...</option>{sportivi.filter(s => s.status === 'Activ' && !inscrieri.some(i => i.sportiv_id === s.id)).map(s => ( <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option> ))}</Select>
            {sportivData && (<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4 animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="text-center md:text-left order-2 md:order-1">
                        <p className="text-xs text-slate-400">Propunere Grad (Automat)</p>
                        <p className="text-3xl md:text-4xl font-bold text-brand-secondary">{sportivData.gradVizatAutomat?.nume || 'N/A'}</p>
                        <p className="text-xs text-slate-500 mt-1 hidden md:block">{sportivData.eligibilityMessage}</p>
                    </div>
                    <div className="space-y-3 order-1 md:order-2">
                        <Select label="Grad Susținut (Confirmă sau Modifică)" value={selectedGradId || ''} onChange={(e) => setSelectedGradId(e.target.value)}>
                            {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                            <DataField label="Vârsta la Examen" value={`${sportivData.varstaLaExamen} ani`} />
                            <DataField label="Taxă Examen" value={sportivData.taxa ? `${sportivData.taxa.toFixed(2)} RON` : 'N/A'} className="text-right md:text-left" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-center md:justify-end pt-4 border-t border-slate-700">
                    <Button type="submit" variant="info" isLoading={loading} disabled={!selectedGradId} className="w-full md:w-auto">Înscrie și Generează Factură</Button>
                </div>
            </div>)}
        </form>
    </Card>
</div><ConfirmDeleteModal isOpen={!!inscriereToDelete} onClose={() => setInscriereToDelete(null)} onConfirm={() => { if(inscriereToDelete) confirmDeleteInscriere(inscriereToDelete.id) }} tableName="înscrieri" isLoading={false} /> </Card> );
};

// --- COMPONENTA PRINCIPALĂ ---
interface GestiuneExameneProps { onBack: () => void; sesiuni: SesiuneExamen[]; setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>; inscrieri: InscriereExamen[]; setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>; sportivi: Sportiv[]; grade: Grad[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; locatii: Locatie[]; }
export const GestiuneExamene: React.FC<GestiuneExameneProps> = ({ onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, grade, setPlati, preturiConfig, locatii }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sesiuneToEdit, setSesiuneToEdit] = useState<SesiuneExamen | null>(null);
  const [sesiuneToDelete, setSesiuneToDelete] = useState<SesiuneExamen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSesiuneId, setSelectedSesiuneId] = useLocalStorage<string | null>('phi-hau-selected-sesiune-id', null);
  const { showError, showSuccess } = useError();
  
  const selectedSesiune = useMemo(() => selectedSesiuneId ? sesiuni.find(e => e.id === selectedSesiuneId) || null : null, [selectedSesiuneId, sesiuni]);

  const handleSaveSesiune = async (sesiuneData: Partial<SesiuneExamen>) => {
    if (sesiuneToEdit) {
        const { data, error } = await supabase.from('sesiuni_examene').update(sesiuneData).eq('id', sesiuneToEdit.id).select().single();
        if (error) { showError("Eroare la actualizare", error); } else if (data) { setSesiuni(prev => prev.map(e => e.id === data.id ? data : e)); showSuccess("Succes", "Sesiunea a fost actualizată."); }
    } else {
        const { data, error } = await supabase.from('sesiuni_examene').insert(sesiuneData).select().single();
        if (error) { showError("Eroare la adăugare", error); } else if (data) { setSesiuni(prev => [...prev, data]); showSuccess("Succes", "Sesiunea a fost creată."); }
    }
  };

  const confirmDeleteSesiune = async (id: string) => {
    setIsDeleting(true);
    try {
        const { error: inscrieriError } = await supabase.from('inscrieri_examene').delete().eq('sesiune_id', id);
        if(inscrieriError) throw inscrieriError;
        setInscrieri(prev => prev.filter(p => p.sesiune_id !== id));
        
        const { error: sesiuneError } = await supabase.from('sesiuni_examene').delete().eq('id', id);
        if(sesiuneError) throw sesiuneError;
        setSesiuni(prev => prev.filter(e => e.id !== id));
        if (selectedSesiuneId === id) setSelectedSesiuneId(null);
        showSuccess("Succes", "Sesiunea și înscrierile asociate au fost șterse.");
    } catch (err: any) {
        showError("Eroare la ștergere", err);
    } finally {
        setIsDeleting(false);
        setSesiuneToDelete(null);
    }
  };

  if(selectedSesiune) { return ( <div><Button onClick={() => setSelectedSesiuneId(null)} className="mb-4" variant="secondary"><ArrowLeftIcon /> Înapoi la listă</Button><DetaliiSesiune sesiune={selectedSesiune} inscrieri={inscrieri.filter(p => p.sesiune_id === selectedSesiune.id)} setInscrieri={setInscrieri} sportivi={sportivi} grade={grade} setPlati={setPlati} preturiConfig={preturiConfig} allInscrieri={inscrieri} locatii={locatii} /></div> ) }
  const sortedSesiuni = [...sesiuni].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  
  return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune Sesiuni Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div><div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead><tbody className="divide-y divide-slate-700">{sortedSesiuni.map(s => ( <tr key={s.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A'}</td><td className="p-4">{inscrieri.filter(p => p.sesiune_id === s.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}{sortedSesiuni.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Nicio sesiune programată.</p></td></tr>}</tbody></table></div><SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} /><ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} /></div> );
};

// Renaming the export to match the old filename for App.tsx compatibility
export { GestiuneExamene as ExameneManagement };