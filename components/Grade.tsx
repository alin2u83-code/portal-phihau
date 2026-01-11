import React, { useState } from 'react';
import { Grad, PretConfig } from '../types';
import { Button, Modal, Input, Select, ConfirmationModal, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

const emptyFormState: Omit<Grad, 'id'> = { nume: '', ordine: 1, varsta_minima: 7, timp_asteptare: "6 luni", grad_start_id: null };

const GradFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (grad: Omit<Grad, 'id'>) => Promise<void>; grade: Grad[]; gradToEdit: Omit<Grad, 'id'> | null; }> = ({ isOpen, onClose, onSave, grade, gradToEdit }) => {
  const [formState, setFormState] = useState(emptyFormState);
  const [loading, setLoading] = useState(false);
  React.useEffect(() => { if(isOpen) { setFormState(gradToEdit || emptyFormState); } }, [isOpen, gradToEdit]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; let finalValue: any = value; if (name === 'ordine' || name === 'varsta_minima') { finalValue = parseInt(value) || 0; } else if (name === 'grad_start_id' && value === '') { finalValue = null; } setFormState(prev => ({ ...prev, [name]: finalValue })); };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!formState.nume || formState.ordine <= 0) { alert("Numele și ordinea (pozitivă) sunt obligatorii."); return; } setLoading(true); await onSave(formState); setLoading(false); onClose(); };
  return ( <Modal isOpen={isOpen} onClose={onClose} title={gradToEdit ? "Editează Grad" : "Adaugă Grad Nou"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Nume Grad" name="nume" value={formState.nume} onChange={handleChange} required /> <Input label="Ordine (Rang)" name="ordine" type="number" value={formState.ordine} onChange={handleChange} required min="1" /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Vârstă Minimă" name="varsta_minima" type="number" value={formState.varsta_minima} onChange={handleChange} required min="1" /> <Input label="Timp Așteptare" name="timp_asteptare" value={formState.timp_asteptare} onChange={handleChange} required /> </div> <Select label="Grad Necesar" name="grad_start_id" value={formState.grad_start_id || ''} onChange={handleChange}> <option value="">Niciunul (pentru începători)</option> {grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)} </Select> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};

export const GradeManagement: React.FC<{ grade: Grad[]; setGrade: React.Dispatch<React.SetStateAction<Grad[]>>; onBack: () => void; preturiConfig: PretConfig[]; setPreturiConfig: React.Dispatch<React.SetStateAction<PretConfig[]>>; }> = ({ grade, setGrade, onBack, preturiConfig, setPreturiConfig }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gradToEdit, setGradToEdit] = useState<Grad | null>(null);
  const [gradToDelete, setGradToDelete] = useState<Grad | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showError } = useError();

  const getPretGrad = (gradNume: string): number | null => { const data = new Date(); const preturiValabile = preturiConfig.filter(p => p.categorie === 'Taxa Examen' && p.denumire_serviciu === gradNume && new Date(p.valabil_de_la_data) <= data).sort((a, b) => new Date(b.valabil_de_la_data).getTime() - new Date(a.valabil_de_la_data).getTime()); return preturiValabile.length > 0 ? preturiValabile[0].suma : null; };
  
  const handlePriceUpdate = async (grad: Grad, newPriceStr: string) => { 
      const newPrice = parseFloat(newPriceStr); 
      if (isNaN(newPrice) || newPrice < 0) return; 
      if (getPretGrad(grad.nume) === newPrice) return; 
      const newPretConfig: Omit<PretConfig, 'id'> = { categorie: 'Taxa Examen', denumire_serviciu: grad.nume, suma: newPrice, valabil_de_la_data: new Date().toISOString().split('T')[0] }; 
      const { data, error } = await supabase.from('preturi_config').insert(newPretConfig).select().single(); 
      if (error) { showError("Eroare la salvare preț", error); } 
      else if (data) { setPreturiConfig(prev => [...prev, data as PretConfig]); } 
  };
  
  const handleSaveGrad = async (gradData: Omit<Grad, 'id'>) => { if (!supabase) return; if (gradToEdit) { const { data, error } = await supabase.from('grade').update(gradData).eq('id', gradToEdit.id).select().single(); if (error) { showError("Eroare la actualizare", error); } else if (data) { setGrade(prev => prev.map(g => g.id === gradToEdit.id ? data as Grad : g)); } } else { const { data, error } = await supabase.from('grade').insert(gradData).select().single(); if (error) { showError("Eroare la adăugare", error); } else if (data) { setGrade(prev => [...prev, data as Grad]); } } };
  const handleOpenEdit = (g: Grad) => { setGradToEdit(g); setIsModalOpen(true); };
  const confirmDelete = async () => { if (!supabase || !gradToDelete) return; setDeleteLoading(true); const { error } = await supabase.from('grade').delete().eq('id', gradToDelete.id); setDeleteLoading(false); if (error) { showError("Eroare la ștergere", error); } else { setGrade(prev => prev.filter(g => g.id !== gradToDelete.id)); } setGradToDelete(null); };
  const sortedGrade = [...grade].sort((a, b) => a.ordine - b.ordine);

  return ( <div> <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button> <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Management Grade</h1> <Button onClick={() => { setGradToEdit(null); setIsModalOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grad</Button> </div>
    <div className="hidden md:block bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[950px]"> <thead className="bg-slate-700/50"><tr>{['Ordine', 'Nume', 'Vârstă Min.', 'Timp Așteptare', 'Grad Necesar', 'Preț Examen (RON)', 'Acțiuni'].map(h => <th key={h} className="p-4 font-semibold">{h}</th>)}</tr></thead> <tbody className="divide-y divide-slate-700"> {sortedGrade.map(grad => ( <tr key={grad.id}> <td className="p-4 w-20">{grad.ordine}</td> <td className="p-4 font-medium">{grad.nume}</td> <td className="p-4">{grad.varsta_minima} ani</td> <td className="p-4">{grad.timp_asteptare}</td> <td className="p-4">{grade.find(g => g.id === grad.grad_start_id)?.nume || 'N/A'}</td> <td className="p-2 w-48"> <Input type="number" label="" defaultValue={getPretGrad(grad.nume) ?? ''} onBlur={(e) => handlePriceUpdate(grad, e.target.value)} placeholder="N/A" /> </td> <td className="p-4 text-right w-32"> <div className="flex items-center justify-end space-x-2"> <Button onClick={() => handleOpenEdit(grad)} variant="primary" size="sm"><EditIcon /></Button> <Button onClick={() => setGradToDelete(grad)} variant="danger" size="sm"><TrashIcon /></Button> </div> </td> </tr> ))} </tbody> </table>
        </div>
        {sortedGrade.length === 0 && <p className="p-4 text-center text-slate-400">Niciun grad definit.</p>}
    </div>
    <div className="md:hidden grid grid-cols-1 gap-4">
        {sortedGrade.map(grad => (
            <Card key={grad.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold">{grad.ordine}. {grad.nume}</h3>
                    <div className="flex items-center space-x-2">
                       <Button onClick={() => handleOpenEdit(grad)} variant="primary" size="sm"><EditIcon /></Button>
                       <Button onClick={() => setGradToDelete(grad)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p><span className="text-slate-400">Vârstă Min:</span> {grad.varsta_minima} ani</p>
                    <p><span className="text-slate-400">Așteptare:</span> {grad.timp_asteptare}</p>
                    <p className="col-span-2"><span className="text-slate-400">Grad Necesar:</span> {grade.find(g => g.id === grad.grad_start_id)?.nume || 'N/A'}</p>
                </div>
                <Input type="number" label="Preț Examen (RON)" defaultValue={getPretGrad(grad.nume) ?? ''} onBlur={(e) => handlePriceUpdate(grad, e.target.value)} placeholder="N/A" />
            </Card>
        ))}
    </div>
  <GradFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveGrad} grade={sortedGrade} gradToEdit={gradToEdit} /> <ConfirmationModal isOpen={!!gradToDelete} onClose={() => setGradToDelete(null)} onConfirm={confirmDelete} title="Confirmare Ștergere" message="Sunteți sigur?" loading={deleteLoading}/> </div> );
};