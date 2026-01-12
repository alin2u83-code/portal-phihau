import React, { useState } from 'react';
import { Grad } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const emptyFormState: Omit<Grad, 'id'> = { nume: '', ordine: 1, varsta_minima: 7, timp_asteptare: "6 luni", grad_start_id: null };

interface GradFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (grad: Omit<Grad, 'id'>) => Promise<void>;
  grade: Grad[];
  gradToEdit: Omit<Grad, 'id'> | null;
}

const GradFormModal: React.FC<GradFormProps> = ({ isOpen, onClose, onSave, grade, gradToEdit }) => {
  const [formState, setFormState] = useState(emptyFormState);
  const [loading, setLoading] = useState(false);
  const { showError } = useError();

  React.useEffect(() => { 
      if(isOpen) {
        setFormState(gradToEdit || emptyFormState);
      }
  }, [isOpen, gradToEdit]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    if (name === 'ordine' || name === 'varsta_minima') {
        finalValue = parseInt(value) || 0;
    } else if (name === 'grad_start_id' && value === '') {
        finalValue = null;
    }
    setFormState(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nume || formState.ordine <= 0) { 
        showError("Validare Eșuată", "Numele și ordinea (pozitivă) sunt obligatorii."); 
        return; 
    }
    setLoading(true);
    await onSave(formState);
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={gradToEdit ? "Editează Grad" : "Adaugă Grad Nou"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nume Grad" name="nume" value={formState.nume} onChange={handleChange} required />
            <Input label="Ordine (Rang)" name="ordine" type="number" value={formState.ordine} onChange={handleChange} required min="1" />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Vârstă Minimă" name="varsta_minima" type="number" value={formState.varsta_minima} onChange={handleChange} required min="1" />
            <Input label="Timp Așteptare" name="timp_asteptare" value={formState.timp_asteptare} onChange={handleChange} required />
        </div>
        <Select label="Grad Necesar" name="grad_start_id" value={formState.grad_start_id || ''} onChange={handleChange}>
            <option value="">Niciunul (pentru începători)</option>
            {grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
        </Select>
        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div>
      </form>
    </Modal>
  );
};

interface GradeManagementProps { grade: Grad[]; setGrade: React.Dispatch<React.SetStateAction<Grad[]>>; onBack: () => void; }
export const GradeManagement: React.FC<GradeManagementProps> = ({ grade, setGrade, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gradToEdit, setGradToEdit] = useState<Grad | null>(null);
  const [gradToDelete, setGradToDelete] = useState<Grad | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError, showSuccess } = useError();

  const handleSaveGrad = async (gradData: Omit<Grad, 'id'>) => {
    if (!supabase) return;
    if (gradToEdit) {
        const { data, error } = await supabase.from('grade').update(gradData).eq('id', gradToEdit.id).select().single();
        if (error) { showError("Eroare la actualizare", error); } 
        else if (data) { setGrade(prev => prev.map(g => g.id === gradToEdit.id ? data as Grad : g)); showSuccess("Succes", "Grad actualizat."); }
    } else {
        const { data, error } = await supabase.from('grade').insert(gradData).select().single();
        if (error) { showError("Eroare la adăugare", error); } 
        else if (data) { setGrade(prev => [...prev, data as Grad]); showSuccess("Succes", "Grad adăugat."); }
    }
  };
  
  const handleOpenEdit = (g: Grad) => { setGradToEdit(g); setIsModalOpen(true); };
  const handleOpenAdd = () => { setGradToEdit(null); setIsModalOpen(true); };
  
  const confirmDelete = async (gradId: string) => { 
      if (!supabase) return;
      setIsDeleting(true);
      try {
          const { data, error: checkError } = await supabase.from('participari').select('id').eq('grad_sustinut_id', gradId).limit(1);
          if (checkError) throw checkError;
          if (data && data.length > 0) {
              throw new Error("Acest grad nu poate fi șters deoarece este asociat cu istoricul de examinări al unor sportivi. Îl puteți edita dacă este necesar.");
          }
          const { error } = await supabase.from('grade').delete().eq('id', gradId);
          if (error) throw error;

          setGrade(prev => prev.filter(g => g.id !== gradId));
          showSuccess("Succes", "Gradul a fost șters.");
      } catch (err: any) {
          showError("Eroare la ștergere", err);
      } finally {
          setIsDeleting(false);
          setGradToDelete(null);
      }
  };

  const sortedGrade = [...grade].sort((a, b) => a.ordine - b.ordine);

  return (
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Management Grade</h1>
        <Button onClick={handleOpenAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grad</Button>
      </div>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Ordine</th><th className="p-4 font-semibold">Nume</th><th className="p-4 font-semibold">Vârstă Min.</th><th className="p-4 font-semibold">Timp Așteptare</th><th className="p-4 font-semibold">Grad Necesar</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
          <tbody className="divide-y divide-slate-700">
            {sortedGrade.map(grad => (
              <tr key={grad.id}>
                <td className="p-4 w-20">{grad.ordine}</td>
                <td className="p-4 font-medium">{grad.nume}</td>
                <td className="p-4">{grad.varsta_minima} ani</td>
                <td className="p-4">{grad.timp_asteptare}</td>
                <td className="p-4">{grade.find(g => g.id === grad.grad_start_id)?.nume || 'N/A'}</td>
                <td className="p-4 text-right w-32">
                    <div className="flex items-center justify-end space-x-2">
                       <Button onClick={() => handleOpenEdit(grad)} variant="primary" size="sm"><EditIcon /></Button>
                       <Button onClick={() => setGradToDelete(grad)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedGrade.length === 0 && <p className="p-4 text-center text-slate-400">Niciun grad definit.</p>}
      </div>
      <GradFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveGrad} grade={sortedGrade} gradToEdit={gradToEdit} />
      <ConfirmDeleteModal isOpen={!!gradToDelete} onClose={() => setGradToDelete(null)} onConfirm={() => { if(gradToDelete) confirmDelete(gradToDelete.id) }} tableName="Grade" isLoading={isDeleting} />
    </div>
  );
};