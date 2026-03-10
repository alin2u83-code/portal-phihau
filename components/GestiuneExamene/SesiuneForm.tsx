import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Select, Button } from '../ui';
import { PlusIcon } from '../icons';
import { SesiuneExamen, Locatie, Club, User } from '../../types';
import { useError } from '../ErrorProvider';
import { supabase } from '../../supabaseClient';
import { ComisieEditor } from './ComisieEditor';
import { LocatieFormModal } from './LocatieFormModal';

export interface SesiuneFormProps { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (sesiune: Partial<SesiuneExamen>) => Promise<void>; 
    sesiuneToEdit: SesiuneExamen | null; 
    locatii: Locatie[]; 
    setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; 
    clubs: Club[]; 
    currentUser: User; 
}

export const SesiuneForm: React.FC<SesiuneFormProps> = ({ isOpen, onClose, onSave, sesiuneToEdit, locatii, setLocatii, clubs, currentUser }) => {
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
  const [loading, setLoading] = useState(false);
  const [isLocatieModalOpen, setIsLocatieModalOpen] = useState(false);
  const { showError, showSuccess } = useError();
  const isSuperAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN'), [currentUser]);

  useEffect(() => {
      if (sesiuneToEdit) {
          const comisiaAsAny = sesiuneToEdit.comisia as any;
          const comisieArray = Array.isArray(comisiaAsAny) ? comisiaAsAny : (typeof comisiaAsAny === 'string' ? comisiaAsAny.split(',').map(s => s.trim()).filter(Boolean) : []);
          setFormState({ ...sesiuneToEdit, comisia: comisieArray });
      } else {
          setFormState({ 
              data: new Date().toISOString().split('T')[0], 
              locatie_id: '', 
              comisia: [],
              club_id: isSuperAdmin ? '' : currentUser.club_id
          });
      }
  }, [sesiuneToEdit, isOpen, isSuperAdmin, currentUser.club_id]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave(formState); setLoading(false); onClose(); };

  const handleSaveLocatie = async (locatieData: { nume: string, adresa: string }) => {
        if (!supabase) { showError("Eroare", "Client Supabase neconfigurat."); return; }
        const { data, error } = await supabase.from('nom_locatii').insert(locatieData).select().single();
        if (error) { 
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError("Eroare la salvare locație", error); 
        } 
        else if (data) {
            setLocatii(prev => [...prev, data]);
            setFormState(p => ({ ...p, locatie_id: data.id }));
            setIsLocatieModalOpen(false);
            showSuccess("Succes", "Locația a fost adăugată.");
        }
    };

  return ( <>
  <Modal isOpen={isOpen} onClose={onClose} title={sesiuneToEdit ? "Editează Sesiune Examen" : "Adaugă Sesiune Nouă"}>
    <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required />
        {isSuperAdmin && (
            <Select label="Club Organizator" name="club_id" value={formState.club_id || ''} onChange={handleChange}>
                <option value="">Federație (eveniment central)</option>
                {(clubs || []).map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
            </Select>
        )}
        <div className="flex items-end gap-2">
            <div className="flex-grow">
                 <Select label="Locația" name="locatie_id" value={formState.locatie_id || ''} onChange={handleChange} required>
                    <option value="">Selectează locația...</option>
                    {(locatii || []).map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                </Select>
            </div>
            <Button type="button" variant="secondary" onClick={() => setIsLocatieModalOpen(true)} className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0" title="Adaugă locație nouă"><PlusIcon className="w-6 h-6"/></Button>
        </div>
        <ComisieEditor membri={formState.comisia || []} setMembri={(newMembri) => setFormState(p => ({ ...p, comisia: newMembri }))} />
        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" isLoading={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div>
    </form>
  </Modal>
  <LocatieFormModal isOpen={isLocatieModalOpen} onClose={() => setIsLocatieModalOpen(false)} onSave={handleSaveLocatie} />
  </> );
};
