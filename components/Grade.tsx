
import React, { useState } from 'react';
import { Grad } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';

const emptyFormState = { nume: '', ordine: 1, varsta_minima: 7, timp_asteptare: "6 luni", grad_start_id: null };

interface GradFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (grad: Omit<Grad, 'id'>) => void;
  grade: Grad[];
}

const AddGradModal: React.FC<GradFormProps> = ({ isOpen, onClose, onSave, grade }) => {
  const [formState, setFormState] = useState(emptyFormState);

  React.useEffect(() => { if(isOpen) setFormState(emptyFormState); }, [isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'ordine' || name === 'varsta_minima' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nume || formState.ordine <= 0) { alert("Numele și ordinea (pozitivă) sunt obligatorii."); return; }
    onSave(formState);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Grad Nou">
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
        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Anulează</Button><Button variant="success" type="submit">Salvează</Button></div>
      </form>
    </Modal>
  );
};

interface GradeManagementProps { grade: Grad[]; setGrade: React.Dispatch<React.SetStateAction<Grad[]>>; onBack: () => void; }
export const GradeManagement: React.FC<GradeManagementProps> = ({ grade, setGrade, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGradId, setEditingGradId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Omit<Grad, 'id'>>({ ...emptyFormState });
  const [showSuccessId, setShowSuccessId] = useState<string | null>(null);

  const handleAddGrad = (newGrad: Omit<Grad, 'id'>) => setGrade(prev => [...prev, {id: new Date().toISOString(), ...newGrad}]);
  
  const handleEditClick = (g: Grad) => {
    setEditingGradId(g.id);
    setEditFormData({ nume: g.nume, ordine: g.ordine, varsta_minima: g.varsta_minima, timp_asteptare: g.timp_asteptare, grad_start_id: g.grad_start_id });
  };
  
  const handleCancelEdit = () => setEditingGradId(null);

  const handleSaveEdit = (gradId: string) => {
    setGrade(prev => prev.map(g => g.id === gradId ? { id: gradId, ...editFormData } : g));
    setEditingGradId(null);
    setShowSuccessId(gradId);
    setTimeout(() => setShowSuccessId(null), 2000);
  };
  
  const handleDelete = (gradId: string) => { if (window.confirm("Ești sigur că vrei să ștergi acest grad?")) { setGrade(prev => prev.filter(g => g.id !== gradId)); } };

  const sortedGrade = [...grade].sort((a, b) => a.ordine - b.ordine);

  return (
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Management Grade</h1>
        <Button onClick={() => setIsModalOpen(true)} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grad</Button>
      </div>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Ordine</th><th className="p-4 font-semibold">Nume</th><th className="p-4 font-semibold">Vârstă Min.</th><th className="p-4 font-semibold">Timp Așteptare</th><th className="p-4 font-semibold">Grad Necesar</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
          <tbody>
            {sortedGrade.map(grad => (
              <tr key={grad.id} className="border-b border-slate-700">
                {editingGradId === grad.id ? (
                  <>
                    <td className="p-2"><Input label="" type="number" value={editFormData.ordine} onChange={e => setEditFormData(p => ({...p, ordine: parseInt(e.target.value)}))} className="w-20" /></td>
                    <td className="p-2"><Input label="" type="text" value={editFormData.nume} onChange={e => setEditFormData(p => ({...p, nume: e.target.value}))} /></td>
                    <td className="p-2"><Input label="" type="number" value={editFormData.varsta_minima} onChange={e => setEditFormData(p => ({...p, varsta_minima: parseInt(e.target.value)}))} className="w-24" /></td>
                    <td className="p-2"><Input label="" type="text" value={editFormData.timp_asteptare} onChange={e => setEditFormData(p => ({...p, timp_asteptare: e.target.value}))} /></td>
                    <td className="p-2"><Select label="" value={editFormData.grad_start_id || ''} onChange={e => setEditFormData(p => ({...p, grad_start_id: e.target.value || null}))}><option value="">Niciunul</option>{sortedGrade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}</Select></td>
                    <td className="p-2 text-right"><div className="flex justify-end space-x-2"><Button size="sm" variant="success" onClick={() => handleSaveEdit(grad.id)}>Salvează</Button><Button size="sm" variant="secondary" onClick={handleCancelEdit}>Anulează</Button></div></td>
                  </>
                ) : (
                  <>
                    <td className="p-4 w-20">{grad.ordine}</td><td className="p-4 font-medium">{grad.nume}</td><td className="p-4">{grad.varsta_minima} ani</td><td className="p-4">{grad.timp_asteptare}</td><td className="p-4">{grade.find(g => g.id === grad.grad_start_id)?.nume || 'N/A'}</td>
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                           {showSuccessId === grad.id && <span className="text-green-400 text-sm">Salvat!</span>}
                           <Button onClick={() => handleEditClick(grad)} variant="primary" size="sm"><EditIcon /></Button>
                           <Button onClick={() => handleDelete(grad.id)} variant="danger" size="sm"><TrashIcon /></Button>
                        </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedGrade.length === 0 && <p className="p-4 text-center text-slate-400">Niciun grad definit.</p>}
      </div>
      <AddGradModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddGrad} grade={sortedGrade} />
    </div>
  );
};