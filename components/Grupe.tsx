
import React, { useState } from 'react';
import { Grupa, ProgramItem } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon } from './icons';

// Componentă pentru editarea programului
const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => {
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    const [newItem, setNewItem] = useState<ProgramItem>({ ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30' });

    const handleAdd = () => { setProgram(p => [...p, newItem]); };
    const handleRemove = (index: number) => { setProgram(p => p.filter((_, i) => i !== index)); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value })) };
    
    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-semibold mb-2 text-white">Program Curent</h4>
                {program.length > 0 ? ( program.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-700 p-2 rounded mb-2">
                        <span className="font-semibold flex-grow">{item.ziua}: {item.ora_start} - {item.ora_sfarsit}</span>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(index)}><TrashIcon /></Button>
                    </div>
                ))) : <p className="text-slate-400">Niciun interval adăugat.</p>}
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg space-y-2">
                 <h4 className="text-md font-semibold text-white">Adaugă Interval Nou</h4>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <Select label="Ziua" name="ziua" value={newItem.ziua} onChange={handleChange}>
                        {zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)}
                    </Select>
                    <Input label="Ora Start" type="time" name="ora_start" value={newItem.ora_start} onChange={handleChange} />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={newItem.ora_sfarsit} onChange={handleChange} />
                    <Button type="button" variant="info" onClick={handleAdd}><PlusIcon /></Button>
                 </div>
            </div>
        </div>
    );
};

// Modal pentru adăugare/editare grupă
const GrupaFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (grupa: Omit<Grupa, 'id'>) => void; grupaToEdit: Omit<Grupa, 'id'> | null }> = ({ isOpen, onClose, onSave, grupaToEdit }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '' });
    const [program, setProgram] = useState<ProgramItem[]>([]);
    
    React.useEffect(() => {
        if (isOpen) {
            setFormState({ denumire: grupaToEdit?.denumire || '', sala: grupaToEdit?.sala || '' });
            setProgram(grupaToEdit?.program || []);
        }
    }, [isOpen, grupaToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...formState, program }); onClose(); };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Editează Grupă" : "Adaugă Grupă Nouă"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required />
                <Input label="Sala" name="sala" value={formState.sala} onChange={handleChange} />
                <ProgramEditor program={program} setProgram={setProgram} />
                <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Anulează</Button><Button variant="success" type="submit">Salvează</Button></div>
            </form>
        </Modal>
    );
};


interface GrupeManagementProps { grupe: Grupa[]; setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>; onBack: () => void; }
export const GrupeManagement: React.FC<GrupeManagementProps> = ({ grupe, setGrupe, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grupaToEdit, setGrupaToEdit] = useState<Grupa | null>(null);
  
  const handleSave = (grupaData: Omit<Grupa, 'id'>) => {
    if (grupaToEdit) {
        setGrupe(prev => prev.map(g => g.id === grupaToEdit.id ? { ...g, ...grupaData } : g));
    } else {
        setGrupe(prev => [...prev, { id: new Date().toISOString(), ...grupaData }]);
    }
  };
  
  const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (grupa: Grupa) => { setGrupaToEdit(grupa); setIsModalOpen(true); };

  const handleDelete = (grupaId: string) => {
    if (window.confirm("Ești sigur că vrei să ștergi această grupă? Sportivii alocați vor rămâne fără grupă.")) {
      setGrupe(prev => prev.filter(g => g.id !== grupaId));
    }
  };

  return (
    <div>
       <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Management Grupe & Orar</h1>
        <Button onClick={handleOpenAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grupă</Button>
      </div>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Denumire</th><th className="p-4 font-semibold">Sală</th><th className="p-4 font-semibold">Program</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
          <tbody>
            {grupe.map(grupa => (
              <tr key={grupa.id} className="border-b border-slate-700">
                <td className="p-4 font-medium">{grupa.denumire}</td>
                <td className="p-4">{grupa.sala}</td>
                <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                        {grupa.program.map((p, i) => <span key={i} className="bg-slate-600 text-slate-200 text-xs font-semibold px-2 py-1 rounded-full">{p.ziua} {p.ora_start}-{p.ora_sfarsit}</span>)}
                    </div>
                </td>
                <td className="p-2 text-right">
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => handleOpenEdit(grupa)} variant="primary" size="sm"><EditIcon /></Button>
                        <Button onClick={() => handleDelete(grupa.id)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {grupe.length === 0 && <p className="p-4 text-center text-slate-400">Nicio grupă definită.</p>}
      </div>
      <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} />
    </div>
  );
};