import React, { useState, useEffect } from 'react';
import { Grupa as GrupaType, ProgramItem, User, Club, Locatie } from '../../types';
import { Modal, Button, Input, Select } from '../ui';
import { useError } from '../ErrorProvider';
import { ProgramEditor } from './ProgramEditor';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

export const GrupaFormModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (grupa: GrupaWithDetails) => Promise<void>; 
    grupaToEdit: GrupaWithDetails | null; 
    currentUser: User; 
    clubs: Club[]; 
    locatii: Locatie[];
}> = ({ isOpen, onClose, onSave, grupaToEdit, currentUser, clubs, locatii }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '', club_id: '', locatie_id: '' });
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();
    const isFederationAdmin = currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');

    useEffect(() => {
        if (isOpen) {
            setFormState({ 
                denumire: grupaToEdit?.denumire || '', 
                sala: grupaToEdit?.sala || '',
                club_id: grupaToEdit?.club_id || (isFederationAdmin ? '' : currentUser.club_id || ''),
                locatie_id: (grupaToEdit as any)?.locatie_id || ''
            });
            setProgram(grupaToEdit?.program || []);
        }
    }, [isOpen, grupaToEdit, currentUser, isFederationAdmin]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFederationAdmin && !formState.club_id) { showError("Validare eșuată", "Super Adminii trebuie să selecteze un club."); return; }
        setLoading(true);
        const finalGrupa: GrupaWithDetails = { 
            id: grupaToEdit?.id || '', 
            denumire: formState.denumire,
            sala: formState.sala,
            program: program,
            club_id: formState.club_id || null,
            sportivi: grupaToEdit?.sportivi || [{ count: 0 }],
            locatie_id: formState.locatie_id || null
        } as any;
        await onSave(finalGrupa);
        setLoading(false);
        onClose();
    };
    
    return ( 
        <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Gestionează Grupă" : "Adaugă Grupă Nouă"}> 
            <form onSubmit={handleSubmit} className="space-y-4"> 
                <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required />
                {isFederationAdmin && ( 
                    <Select label="Club" name="club_id" value={formState.club_id} onChange={handleChange} required> 
                        <option value="">Selectează club...</option> 
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)} 
                    </Select> 
                )}
                <Select label="Locație (Sala)" name="locatie_id" value={formState.locatie_id} onChange={handleChange}>
                    <option value="">Selectează locație...</option>
                    {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                </Select>
                <ProgramEditor program={program} setProgram={setProgram} /> 
                <div className="flex justify-end pt-4 space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="success" type="submit" isLoading={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div> 
            </form> 
        </Modal> 
    );
};
