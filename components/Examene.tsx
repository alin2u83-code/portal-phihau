import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata, PretConfig, Locatie, View } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, ExclamationTriangleIcon } from './icons';
import { getPretProdus } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// --- UTILITIES ---
const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
const getAgeOnDate = (birthDateStr: string, onDateStr: string) => { const onDate = new Date(onDateStr); const birthDate = new Date(birthDateStr); let age = onDate.getFullYear() - birthDate.getFullYear(); const m = onDate.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { if (!durationStr) return 0; const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };


const DataField: React.FC<{label: string, value: React.ReactNode, className?: string}> = ({label, value, className}) => (
    <div className={className}>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-white">{value}</p>
    </div>
);

// --- SUB-COMPONENTS ---

const ComisieEditor: React.FC<{
    membri: string[];
    setMembri: (membri: string[]) => void;
}> = ({ membri, setMembri }) => {
    const [newMembru, setNewMembru] = useState('');

    const handleAdd = () => {
        const trimmed = newMembru.trim();
        if (trimmed && !membri.includes(trimmed)) {
            setMembri([...membri, trimmed]);
            setNewMembru('');
        }
    };

    const handleRemove = (membruToRemove: string) => {
        setMembri(membri.filter(m => m !== membruToRemove));
    };

    return (
        <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-2 ml-1">Membri Comisie</label>
            <div className="space-y-2 mb-3">
                {membri.map(membru => (
                    <div key={membru} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center text-sm">
                        <span className="font-medium text-white">{membru}</span>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(membru)} className="!p-1.5 h-auto" title={`Elimină pe ${membru}`}>
                            <TrashIcon className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {membri.length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">Niciun membru adăugat.</p>}
            </div>
            <div className="flex items-end gap-2">
                <div className="flex-grow">
                    <Input label="" value={newMembru} onChange={e => setNewMembru(e.target.value)} placeholder="Nume și prenume membru..." 
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}/>
                </div>
                <Button type="button" variant="info" onClick={handleAdd} className="h-[38px] aspect-square p-0" title="Adaugă membru">
                    <PlusIcon className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

interface LocatieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locatieData: { nume: string; adresa: string }) => Promise<void>;
}
const LocatieFormModal: React.FC<LocatieFormProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ nume: '', adresa: '' });
  const [loading, setLoading] = useState(false);
  const { showError } = useError();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nume.trim()) {
        showError("Validare eșuată", "Numele locației este obligatoriu.");
        return;
    }
    setLoading(true);
    await onSave({ nume: form.nume.trim(), adresa: form.adresa.trim() });
    setLoading(false);
    setForm({ nume: '', adresa: '' }); // Reset for next use
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Locație Nouă">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nume Locație" name="nume" value={form.nume} onChange={handleChange} required />
        <Input label="Adresă (Opțional)" name="adresa" value={form.adresa} onChange={handleChange} />
        <div className="flex justify-end pt-4 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" type="submit" isLoading={loading}>Salvează Locația</Button>
        </div>
      </form>
    </Modal>
  );
};

interface SesiuneFormProps { isOpen: boolean; onClose: () => void; onSave: (sesiune: Partial<SesiuneExamen>) => Promise<void>; sesiuneToEdit: SesiuneExamen | null; locatii: Locatie[]; setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; }
const SesiuneForm: React.FC<SesiuneFormProps> = ({ isOpen, onClose, onSave, sesiuneToEdit, locatii, setLocatii }) => {
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
  const [loading, setLoading] = useState(false);
  const [isLocatieModalOpen, setIsLocatieModalOpen] = useState(false);
  const { showError, showSuccess } = useError();

  useEffect(() => {
      if (sesiuneToEdit) {
          let comisieArray: string[] = [];
          if (Array.isArray(sesiuneToEdit.comisia)) {
              comisieArray = sesiuneToEdit.comisia;
          } else if (typeof sesiuneToEdit.comisia === 'string' && sesiuneToEdit.comisia) {
              comisieArray = sesiuneToEdit.comisia.split(',').map(s => s.trim()).filter(Boolean);
          }
          setFormState({ ...sesiuneToEdit, comisia: comisieArray });
      } else {
          setFormState({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
      }
  }, [sesiuneToEdit, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
  
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave(formState); setLoading(false); onClose(); };

  const handleSaveLocatie = async (locatieData: { nume: string, adresa: string }) => {
        if (!supabase) { showError("Eroare", "Client Supabase neconfigurat."); return; }
        const { data, error } = await supabase.from('nom_locatii').insert(locatieData).select().single();
        if (error) {
            showError("Eroare la salvare locație", error);
        } else if (data) {
            setLocatii(prev => [...prev, data]);
            setFormState(p => ({ ...p, locatie_id: data.id })); // Auto-select new
            setIsLocatieModalOpen(false);
            showSuccess("Succes", "Locația a fost adăugată.");
        }
    };


  return ( <>
  <Modal isOpen={isOpen} onClose={onClose} title={sesiuneToEdit ? "Editează Sesiune Examen" : "Adaugă Sesiune Nouă"}>
    <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required />
        <div className="flex items-end gap-2">
            <div className="flex-grow">
                 <Select label="Locația" name="locatie_id" value={formState.locatie_id || ''} onChange={handleChange} required>
                    <option value="">Selectează locația...</option>
                    {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                </Select>
            </div>
            <Button type="button" variant="secondary" onClick={() => setIsLocatieModalOpen(true)} className="h-[38px] aspect-square p-0" title="Adaugă locație nouă">
                <PlusIcon className="w-5 h-5"/>
            </Button>
        </div>
        <ComisieEditor membri={formState.comisia || []} setMembri={(newMembri) => setFormState(p => ({ ...p, comisia: newMembri }))} />
        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div>
    </form>
  </Modal>
  <LocatieFormModal isOpen={isLocatieModalOpen} onClose={() => setIsLocatieModalOpen(false)} onSave={handleSaveLocatie} />
  </> );
};

interface DetaliiSesiuneProps { sesiune: SesiuneExamen; inscrieri: InscriereExamen[]; setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>; sportivi: Sportiv[]; grade: Grad[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; allInscrieri: InscriereExamen[]; locatii: Locatie[]; onNavigate: (view: View) => void; onViewSportiv: (sportiv: Sportiv) => void; }
const DetaliiSesiune: React.FC<DetaliiSesiuneProps> = ({ sesiune, inscrieri, setInscrieri, sportivi, grade, setPlati, preturiConfig, allInscrieri, locatii, onNavigate, onViewSportiv }) => {
    const [sportivId, setSportivId] = useState('');
    const [gradVizatId, setGradVizatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const { showError, showSuccess } = useError();
    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);
    
    const sportivData = useMemo(() => {
        if (!sportivId) return null;
        const sportiv = sportivi.find(s => s.id === sportivId);
        if (!sportiv) return null;

        const varstaLaExamen = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
        const admittedInscrieri = allInscrieri.filter(i => i.sportiv_id === sportiv.id && i.rezultat === 'Admis').sort((a, b) => (getGrad(b.grad_vizat_id, grade)?.ordine ?? 0) - (getGrad(a.grad_vizat_id, grade)?.ordine ?? 0));
        const gradActual = getGrad(admittedInscrieri[0]?.grad_vizat_id, grade);

        let gradVizatAutomat: Grad | undefined;
        let esteEligibil = false;
        
        if (!gradActual) { // Primul examen
            if (varstaLaExamen >= 5 && varstaLaExamen <= 6) gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('galben'));
            else if (varstaLaExamen >= 7 && varstaLaExamen <= 12) gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('roș'));
            else gradVizatAutomat = sortedGrades.find(g => g.nume.toLowerCase().includes('albastr'));
            esteEligibil = !!gradVizatAutomat;
        } else { // Progresie
            gradVizatAutomat = sortedGrades.find(g => g.ordine === gradActual.ordine + 1);
            if (gradVizatAutomat) {
                const lastExamDate = admittedInscrieri[0]?.examen ? new Date(admittedInscrieri[0].examen.data) : new Date(sportiv.data_inscrierii);
                const monthsToWait = parseDurationToMonths(gradVizatAutomat.timp_asteptare);
                const eligibilityDate = new Date(lastExamDate);
                eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
                esteEligibil = new Date() >= eligibilityDate && varstaLaExamen >= gradVizatAutomat.varsta_minima;
            }
        }
        
        const gradVizatFinal = gradVizatId ? sortedGrades.find(g => g.id === gradVizatId) : gradVizatAutomat;
        const taxa = gradVizatFinal ? getPretProdus(preturiConfig, 'Taxa Examen', gradVizatFinal.nume, { dataReferinta: sesiune.data })?.suma : null;
        
        return { sportiv, gradActual, gradVizatAutomat, varstaLaExamen, esteEligibil, taxa };
    }, [sportivId, sportivi, allInscrieri, grade, sortedGrades, preturiConfig, sesiune.data, gradVizatId]);
    
    useEffect(() => { setGradVizatId(sportivData?.gradVizatAutomat?.id || null); }, [sportivData?.gradVizatAutomat]);

    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sportivData || !gradVizatId) { showError("Date Invalide", "Sportivul sau gradul vizat nu sunt valide."); return; }
        
        const { sportiv, gradActual, varstaLaExamen, taxa } = sportivData;
        const gradVizat = sortedGrades.find(g => g.id === gradVizatId);
        if (!gradVizat) return;

        if (inscrieri.some(i => i.sportiv_id === sportiv.id)) { showError("Conflict", "Acest sportiv este deja înscris."); return; }
        
        setLoading(true);
        try {
            const newInscriere: Omit<InscriereExamen, 'id'> = { sesiune_id: sesiune.id, sportiv_id: sportiv.id, grad_actual_id: gradActual?.id || null, grad_vizat_id: gradVizat.id, varsta_la_examen: varstaLaExamen, rezultat: 'Neprezentat', observatii: '' };
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
            
            // Navigare către profilul sportivului
            onViewSportiv(sportiv);
            onNavigate('sportivi');

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
    
    const handleNoteChange = async (inscriereId: string, field: 'nota_thao_quyen' | 'nota_song_doi', value: string) => {
        const targetInscriere = allInscrieri.find(p => p.id === inscriereId);
        if (!targetInscriere) return;

        const numericValue = value === '' ? null : parseFloat(value);
        
        const nota_thao = field === 'nota_thao_quyen' ? numericValue : targetInscriere.nota_thao_quyen;
        const nota_song = field === 'nota_song_doi' ? numericValue : targetInscriere.nota_song_doi;

        const notes = [nota_thao, nota_song].filter(n => n !== null && !isNaN(n as any)) as number[];
        const media = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;

        const updates = { [field]: numericValue, media_generala: media };

        const { data, error } = await supabase.from('inscrieri_examene').update(updates).eq('id', inscriereId).select().single();
        
        if (error) { showError("Eroare la actualizarea notei", error); } 
        else if (data) { setInscrieri(prev => prev.map(p => p.id === inscriereId ? data as InscriereExamen : p)); }
    };
    
    const confirmDeleteInscriere = async (inscriereId: string) => {
        const { error } = await supabase.from('inscrieri_examene').delete().eq('id', inscriereId);
        if (error) { showError("Eroare la ștergere", error); }
        else { setInscrieri(prev => prev.filter(p => p.id !== inscriereId)); showSuccess("Succes", "Înscrierea a fost ștearsă."); }
        setInscriereToDelete(null);
    };

    return ( <Card> <h3 className="text-2xl font-bold text-white">{locatii.find(l => l.id === sesiune.locatie_id)?.nume} - {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</h3><p className="text-slate-400">Comisia: {Array.isArray(sesiune.comisia) ? sesiune.comisia.join(', ') : sesiune.comisia}</p><div className="mt-6 border-t border-slate-700 pt-6"> <h4 className="text-xl font-semibold mb-4 text-white">Participanți Înscriși ({inscrieri.length})</h4>
    <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-700/50 text-xs uppercase">
                <tr>
                    <th className="p-2 font-semibold">Nume Sportiv</th>
                    <th className="p-2 font-semibold">Grad Vizat</th>
                    <th className="p-2 font-semibold w-32">Nota Thao Quyen</th>
                    <th className="p-2 font-semibold w-32">Nota Song Doi</th>
                    <th className="p-2 font-semibold w-24 text-center">Media</th>
                    <th className="p-2 font-semibold w-40">Rezultat</th>
                    <th className="p-2 font-semibold">Observații</th>
                    <th className="p-2 font-semibold text-right">Acțiuni</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
                {inscrieri.map(i => {
                    const s = sportivi.find(sp => sp.id === i.sportiv_id);
                    const g = grade.find(gr => gr.id === i.grad_vizat_id);
                    return (
                        <tr key={i.id} className="hover:bg-slate-700/20">
                            <td className="p-1 font-medium text-white">{s?.nume} {s?.prenume}</td>
                            <td className="p-1 text-slate-300">{g?.nume}</td>
                            <td className="p-1"><Input type="number" step="0.01" label="" className="!py-1" defaultValue={i.nota_thao_quyen || ''} onBlur={e => handleNoteChange(i.id, 'nota_thao_quyen', e.target.value)} /></td>
                            <td className="p-1"><Input type="number" step="0.01" label="" className="!py-1" defaultValue={i.nota_song_doi || ''} onBlur={e => handleNoteChange(i.id, 'nota_song_doi', e.target.value)} /></td>
                            <td className="p-1 text-center font-bold text-brand-secondary font-mono">{i.media_generala?.toFixed(2) || '-'}</td>
                            <td className="p-1"><Select label="" value={i.rezultat} className="!py-1" onChange={e => handleUpdateInscriere(i.id, 'rezultat', e.target.value)}><option value="Admis">Admis</option><option value="Respins">Respins</option><option value="Neprezentat">Neprezentat</option></Select></td>
                            <td className="p-1"><Input label="" placeholder="..." className="!py-1" defaultValue={i.observatii || ''} onBlur={e => handleUpdateInscriere(i.id, 'observatii', e.target.value)} /></td>
                            <td className="p-1 text-right"><Button onClick={() => setInscriereToDelete(i)} variant="danger" size="sm" className="!p-1.5"><TrashIcon className="w-4 h-4" /></Button></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        {inscrieri.length === 0 && <p className="text-slate-400 italic p-4 text-center">Niciun participant înscris.</p>}
    </div>
    <Card className="bg-slate-900/50">
        <h5 className="text-lg font-semibold mb-4 text-white">Înscrie Sportiv Nou</h5>
        <form onSubmit={handleAddParticipant} className="space-y-4">
            <Select label="Sportiv" value={sportivId} onChange={e => setSportivId(e.target.value)}><option value="">Selectează...</option>{sportivi.filter(s => s.status === 'Activ' && !inscrieri.some(i => i.sportiv_id === s.id)).map(s => ( <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option> ))}</Select>
            {sportivData && (<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4 animate-fade-in-down">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-full md:w-1/2 text-center bg-slate-900/50 p-6 rounded-lg">
                        <p className="text-xs text-slate-400">Propunere Grad</p>
                        <p className="text-4xl font-bold text-brand-secondary my-2">{sportivData.gradVizatAutomat?.nume || 'N/A'}</p>
                        <p className={`text-xs font-semibold ${sportivData.esteEligibil ? 'text-green-400' : 'text-amber-400'}`}>{sportivData.esteEligibil ? '✔ Eligibil' : '✖ Neeligibil'}</p>
                    </div>
                    <div className="w-full md:w-1/2 space-y-3">
                         <div className="flex items-center gap-2">
                            <Select label="Grad Vizat (Confirmă / Modifică)" value={gradVizatId || ''} onChange={(e) => setGradVizatId(e.target.value)}>
                                {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                            </Select>
                            {gradVizatId !== sportivData.gradVizatAutomat?.id && <div className="pt-4" title="Se înscrie la un grad diferit de cel propus automat."><ExclamationTriangleIcon className="w-5 h-5 text-amber-400"/></div>}
                        </div>
                        <DataField label="Taxă Examen Calculată" value={sportivData.taxa ? `${sportivData.taxa.toFixed(2)} RON` : 'N/A'}/>
                    </div>
                </div>
                <div className="hidden md:block pt-4 border-t border-slate-700/50 mt-4">
                    <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">Verificare Eligibilitate</h4>
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between items-center"><span className="text-slate-300">Cerință vârstă minimă:</span> <span className="font-mono">{sportivData.gradVizatAutomat?.varsta_minima || 'N/A'} ani</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-300">Vârstă sportiv la examen:</span> <span className="font-mono">{sportivData.varstaLaExamen} ani</span></div>
                    </div>
                </div>
                <div className="flex justify-center md:justify-end pt-4 mt-4 border-t border-slate-700">
                    <Button type="submit" variant="info" isLoading={loading} disabled={!gradVizatId} className="w-full md:w-auto">Înscrie și Vezi Profil</Button>
                </div>
            </div>)}
        </form>
    </Card>
</div><ConfirmDeleteModal isOpen={!!inscriereToDelete} onClose={() => setInscriereToDelete(null)} onConfirm={() => { if(inscriereToDelete) confirmDeleteInscriere(inscriereToDelete.id) }} tableName="înscrieri" isLoading={false} /> </Card> );
};

interface GestiuneExameneProps { onBack: () => void; sesiuni: SesiuneExamen[]; setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>; inscrieri: InscriereExamen[]; setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>; sportivi: Sportiv[]; grade: Grad[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; locatii: Locatie[]; setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; onNavigate: (view: View) => void; onViewSportiv: (sportiv: Sportiv) => void; }
export const GestiuneExamene: React.FC<GestiuneExameneProps> = ({ onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, grade, setPlati, preturiConfig, locatii, setLocatii, onNavigate, onViewSportiv }) => {
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
        if (error) { showError("Eroare la actualizare", error); } else if (data) { setSesiuni(prev => prev.map(e => e.id === data.id ? data as SesiuneExamen : e)); showSuccess("Succes", "Sesiunea a fost actualizată."); }
    } else {
        const { data, error } = await supabase.from('sesiuni_examene').insert(sesiuneData).select().single();
        if (error) { showError("Eroare la adăugare", error); } else if (data) { setSesiuni(prev => [...prev, data as SesiuneExamen]); showSuccess("Succes", "Sesiunea a fost creată."); }
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

  if(selectedSesiune) { return ( <div><Button onClick={() => setSelectedSesiuneId(null)} className="mb-4" variant="secondary"><ArrowLeftIcon /> Înapoi la listă</Button><DetaliiSesiune sesiune={selectedSesiune} inscrieri={inscrieri.filter(p => p.sesiune_id === selectedSesiune.id)} setInscrieri={setInscrieri} sportivi={sportivi} grade={grade} setPlati={setPlati} preturiConfig={preturiConfig} allInscrieri={inscrieri} locatii={locatii} onNavigate={onNavigate} onViewSportiv={onViewSportiv} /></div> ) }
  const sortedSesiuni = [...sesiuni].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  
  return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune Sesiuni Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div><div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead><tbody className="divide-y divide-slate-700">{sortedSesiuni.map(s => ( <tr key={s.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A'}</td><td className="p-4">{inscrieri.filter(p => p.sesiune_id === s.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}{sortedSesiuni.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Nicio sesiune programată.</p></td></tr>}</tbody></table></div><SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} /><ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} /></div> );
};

// Renaming the export to match the old filename for App.tsx compatibility
export { GestiuneExamene as ExameneManagement };