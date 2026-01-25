import React, { useState } from 'react';
import { Club, User } from '../types';
import { Button, Modal, Input, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { usePermissions } from '../hooks/usePermissions';

interface ClubFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (clubData: Partial<Club>) => Promise<void>;
    clubToEdit: Club | null;
}

const ClubFormModal: React.FC<ClubFormModalProps> = ({ isOpen, onClose, onSave, clubToEdit }) => {
    const [formData, setFormData] = useState({ nume: '', cif: '', oras: '' });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                nume: clubToEdit?.nume || '',
                cif: clubToEdit?.cif || '',
                oras: clubToEdit?.oras || '',
            });
        }
    }, [isOpen, clubToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const dataToSave = { id: clubToEdit?.id, ...formData };
        await onSave(dataToSave);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={clubToEdit ? "Editează Club" : "Adaugă Club Nou"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nume Club" name="nume" value={formData.nume} onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="CIF / CUI (Opțional)" name="cif" value={formData.cif} onChange={handleChange} />
                    <Input label="Oraș (Opțional)" name="oras" value={formData.oras} onChange={handleChange} />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};

interface CluburiManagementProps {
    clubs: Club[];
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
    onBack: () => void;
    currentUser: User;
}

export const CluburiManagement: React.FC<CluburiManagementProps> = ({ clubs, setClubs, onBack, currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clubToEdit, setClubToEdit] = useState<Club | null>(null);
    const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const permissions = usePermissions(currentUser);

    const handleSave = async (clubData: Partial<Club>) => {
        if (!supabase) return;
        if (!clubToEdit && !permissions.isSuperAdmin) {
            showError("Acces Interzis", "Doar un SUPER_ADMIN_FEDERATIE poate adăuga cluburi noi.");
            return;
        }

        try {
            if (clubToEdit) {
                const { id, ...updates } = clubData;
                const { data, error } = await supabase.from('cluburi').update(updates).eq('id', id!).select().single();
                if (error) throw error;
                if (data) { setClubs(prev => prev.map(c => c.id === id ? data : c)); showSuccess("Succes", "Club actualizat."); }
            } else {
                const { id, ...insertData } = clubData;
                const { data, error } = await supabase.from('cluburi').insert([insertData]).select().single();
                if (error) throw error;
                if (data) { setClubs(prev => [...prev, data]); showSuccess("Succes", "Club adăugat."); }
            }
        } catch (err: any) {
             if (err.message.includes('violates row-level security policy')) {
                showError("Permisiune Refuzată (RLS)", "Politica de securitate a bazei de date a blocat acțiunea. Asigurați-vă că rolul dumneavoastră ('SUPER_ADMIN_FEDERATIE') este corect configurat.");
            } else {
                showError("Eroare la Salvare", err);
            }
        }
    };

    const confirmDelete = async (id: string) => {
        if (!supabase) return;
        setIsDeleting(true);
        try {
            // Check if any sportivi are assigned to this club
            const { count, error: checkError } = await supabase.from('sportivi').select('id', { count: 'exact', head: true }).eq('club_id', id);
            if (checkError) throw checkError;
            if (count && count > 0) {
                throw new Error(`Nu se poate șterge: ${count} sportivi sunt asignați acestui club.`);
            }

            const { error } = await supabase.from('cluburi').delete().eq('id', id);
            if (error) throw error;
            setClubs(prev => prev.filter(c => c.id !== id));
            showSuccess("Succes", "Clubul a fost șters.");
        } catch (err: any) {
            showError("Eroare la ștergere", err);
        } finally {
            setIsDeleting(false);
            setClubToDelete(null);
        }
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Gestiune Cluburi</h1>
                {permissions.isSuperAdmin && (
                    <Button onClick={() => { setClubToEdit(null); setIsModalOpen(true); }} variant="info">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Club
                    </Button>
                )}
            </div>
            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Nume</th>
                                <th className="p-4 font-semibold">Oraș</th>
                                <th className="p-4 font-semibold">CIF</th>
                                <th className="p-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {(clubs || []).map(club => (
                                <tr key={club.id}>
                                    <td className="p-4 font-medium">{club.id === FEDERATIE_ID ? FEDERATIE_NAME : club.nume}</td>
                                    <td className="p-4">{club.oras || '-'}</td>
                                    <td className="p-4">{club.cif || '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button disabled={club.id === FEDERATIE_ID || !permissions.isSuperAdmin} onClick={() => { setClubToEdit(club); setIsModalOpen(true); }} variant="primary" size="sm"><EditIcon /></Button>
                                            <Button disabled={club.id === FEDERATIE_ID || !permissions.isSuperAdmin} onClick={() => setClubToDelete(club)} variant="danger" size="sm"><TrashIcon /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <ClubFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} clubToEdit={clubToEdit} />
            <ConfirmDeleteModal isOpen={!!clubToDelete} onClose={() => setClubToDelete(null)} onConfirm={() => { if (clubToDelete) confirmDelete(clubToDelete.id); }} tableName="Club" isLoading={isDeleting} />
        </div>
    );
};