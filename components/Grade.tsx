import React, { useState } from 'react';
import { Grad, PretConfig } from '../types';
import { Button, Modal, Input, Select, ConfirmationModal } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

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
    if (!formState.nume || formState.ordine <= 0) { alert("Numele și ordinea (pozitivă) sunt obligatorii."); return; }
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

interface GradeManagementProps { 
    grade: Grad[]; 
    setGrade: React.Dispatch<React.SetStateAction<Grad[]>>; 
    onBack: () => void;
    preturiConfig: PretConfig[];
    setPreturiConfig: React.Dispatch<React.SetStateAction<PretConfig[]>>;
}
export const GradeManagement: React.FC<GradeManagementProps> = ({ grade, setGrade, onBack, preturiConfig, setPreturiConfig }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gradToEdit, setGradToEdit] = useState<Grad | null>(null);
  const [gradToDelete, setGradToDelete] = useState<Grad | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getPretGrad = (gradNume: string, dataReferinta: string = new Date().toISOString()): number | null => {
        const data = new Date(dataReferinta);
        const preturiValabile = preturiConfig
            .filter(p => p.categorie === 'Taxa Examen' && p.denumire_serviciu === gradNume && new Date(p.valabil_de_la_data) <= data)
            .sort((a, b) => new Date(b.valabil_de_la_data).getTime() - new Date(a.valabil_de_la_data).getTime());
        return preturiValabile.length > 0 ? preturiValabile[0].suma : null;
    };

    const handlePriceUpdate = async (grad: Grad, newPriceStr: string) => {
        const newPrice = parseFloat(newPriceStr);
        if (isNaN(newPrice) || newPrice < 0) {
            alert("Prețul trebuie să fie un număr valid pozitiv.");
            return;
        }

        const currentPrice = getPretGrad(grad.nume);
        if (currentPrice === newPrice) return; // Nicio modificare

        const newPretConfig: Omit<PretConfig, 'id'> = {
            categorie: 'Taxa Examen',
            denumire_serviciu: grad.nume,
            suma: newPrice,
            valabil_de_la_data: new Date().toISOString().split('T')[0],
        };

        const { data, error } = await supabase.from('preturi_config').insert(newPretConfig).select().single();
        if (error) {
            alert(`Eroare la salvarea prețului: ${error.message}`);
        } else if (data) {
            setPreturiConfig(prev => [...prev, data as PretConfig]);
            alert('Preț actualizat cu succes!');
        }
    };

  const handleSaveGrad = async (gradData: Omit<Grad, 'id'>) => {
    if (!supabase) return;
    if (gradToEdit) {
        const { data, error } = await supabase.from('grade').update(gradData).eq('id', gradToEdit.id).select().single();
        if (error) { alert(`Eroare la actualizare: ${error.message}`); } 
        else if (data) { setGrade(prev => prev.map(g => g.id === gradToEdit.id ? data as Grad : g)); }
    } else {
        const { data, error } = await supabase.from('grade').insert(gradData).select().single();
        if (error) { alert(`Eroare la adăugare: ${error.message}`); } 
        else if (data) { setGrade(prev => [...prev, data as Grad]); }
    }
  };
  
  const handleOpenEdit = (g: Grad) => { setGradToEdit(g); setIsModalOpen(true); };
  const handleOpenAdd = () => { setGradToEdit(null); setIsModalOpen(true); };
  
  const handleDeleteRequest = (grad: Grad) => { 
      setGradToDelete(grad);
  };
  
  const confirmDelete = async () => { 
      if (!supabase || !gradToDelete) return;
      setDeleteLoading(true);
      const { error } = await supabase.from('grade').delete().eq('id', gradToDelete.id);
      setDeleteLoading(false);
      if (error) { alert(`Eroare la ștergere: ${error.message}`); }
      else { setGrade(prev => prev.filter(g => g.id !== gradToDelete.id)); }
      setGradToDelete(null);
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
        <table className="w-full text-left min-w-[950px]">
          <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Ordine</th><th className="p-4 font-semibold">Nume</th><th className="p-4 font-semibold">Vârstă Min.</th><th className="p-4 font-semibold">Timp Așteptare</th><th className="p-4 font-semibold">Grad Necesar</th><th className="p-4 font-semibold">Preț Examen (RON)</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
          <tbody className="divide-y divide-slate-700">
            {sortedGrade.map(grad => (
              <tr key={grad.id}>
                <td className="p-4 w-20">{grad.ordine}</td>
                <td className="p-4 font-medium">{grad.nume}</td>
                <td className="p-4">{grad.varsta_minima} ani</td>
                <td className="p-4">{grad.timp_asteptare}</td>
                <td className="p-4">{grade.find(g => g.id === grad.grad_start_id)?.nume || 'N/A'}</td>
                <td className="p-2 w-48">
                    <Input 
                        type="number"
                        label=""
                        defaultValue={getPretGrad(grad.nume) ?? ''}
                        onBlur={(e) => handlePriceUpdate(grad, e.target.value)}
                        placeholder="N/A"
                    />
                </td>
                <td className="p-4 text-right w-32">
                    <div className="flex items-center justify-end space-x-2">
                       <Button onClick={() => handleOpenEdit(grad)} variant="primary" size="sm"><EditIcon /></Button>
                       <Button onClick={() => handleDeleteRequest(grad)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedGrade.length === 0 && <p className="p-4 text-center text-slate-400">Niciun grad definit.</p>}
      </div>
      <GradFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveGrad} grade={sortedGrade} gradToEdit={gradToEdit} />
      <ConfirmationModal 
        isOpen={!!gradToDelete}
        onClose={() => setGradToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmare Ștergere Grad"
        message="Sunteți sigur că doriți să ștergeți această înregistrare? Această acțiune este ireversibilă."
        loading={deleteLoading}
      />
    </div>
  );
};