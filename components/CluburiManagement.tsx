import React, { useState } from 'react';
import { Club, User, Permissions } from '../types';
import { Button, Modal, Input, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    permissions: Permissions;
}

export const CluburiManagement: React.FC<CluburiManagementProps> = ({ clubs, setClubs, onBack, currentUser, permissions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clubToEdit, setClubToEdit] = useState<Club | null>(null);
    const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const { navigateRoot } = useNavigation();
    
    const handleSave = async (clubData: Partial<Club>) => {
        if (!supabase) return;
        if (!clubToEdit && !permissions.isSuperAdmin) {
            showError("Acces Interzis", "Doar un SUPER_ADMIN_FEDERATIE poate adăuga cluburi noi.");
            return;
        }

        try {
            if (clubToEdit) {
                const { id, ...updates } = clubData;
                // Curăță CIF gol — evită conflict pe unique constraint cu string gol
                if (updates.cif === '') updates.cif = null as any;
                // Verificare duplicat CIF la editare (alt club cu același CIF)
                if (updates.cif) {
                    const { data: existing } = await supabase
                        .from('cluburi')
                        .select('id')
                        .eq('cif', updates.cif)
                        .neq('id', id!)
                        .maybeSingle();
                    if (existing) {
                        showError("CIF Duplicat", "Există deja un alt club înregistrat cu acest CIF/CUI.");
                        return;
                    }
                }
                const { data, error } = await supabase.from('cluburi').update(updates).eq('id', id!).select().single();
                if (error) throw error;
                if (data) { setClubs(prev => prev.map(c => c.id === id ? data : c)); showSuccess("Succes", "Club actualizat."); }
            } else {
                const { id, ...insertData } = clubData;
                // Curăță CIF gol — evită conflict pe unique constraint cu string gol
                if (insertData.cif === '') insertData.cif = null as any;
                // Verificare duplicat CIF la creare
                if (insertData.cif) {
                    const { data: existing } = await supabase
                        .from('cluburi')
                        .select('id')
                        .eq('cif', insertData.cif)
                        .maybeSingle();
                    if (existing) {
                        showError("CIF Duplicat", "Există deja un club înregistrat cu acest CIF/CUI. Verificați datele sau lăsați câmpul gol.");
                        return;
                    }
                }
                const { data, error } = await supabase.from('cluburi').insert([insertData]).select().single();
                if (error) throw error;
                if (data) { setClubs(prev => [...prev, data]); showSuccess("Succes", "Club adăugat."); }
            }
        } catch (err: any) {
            if (err.message.includes('violates row-level security policy') || err.code === '42501') {
                showError("Permisiune Refuzată (RLS)", "Politica de securitate a bazei de date a blocat acțiunea. Asigurați-vă că rolul dumneavoastră ('SUPER_ADMIN_FEDERATIE') este corect configurat.");
            } else if (err.code === '23505' && err.message.includes('cif')) {
                showError("CIF Duplicat", "Există deja un club înregistrat cu acest CIF/CUI. Verificați datele introduse sau lăsați câmpul CIF gol.");
            } else if (err.code === '23505') {
                showError("Date Duplicate", "Un club cu aceste date există deja în baza de date.");
            } else {
                showError("Eroare la Salvare", err.message);
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
            showError("Eroare la ștergere", err.message);
        } finally {
            setIsDeleting(false);
            setClubToDelete(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl md:text-3xl font-bold text-white">Gestiune Cluburi</h1>
                {permissions.isSuperAdmin && (
                    <Button onClick={() => { setClubToEdit(null); setIsModalOpen(true); }} variant="info">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Club
                    </Button>
                )}
            </div>
            {(clubs || []).length === 0 ? (
                <Card className="text-center p-8">
                    <p className="text-slate-400 italic">Nu există cluburi înregistrate. Adăugați primul club folosind butonul de mai sus.</p>
                </Card>
            ) : (
                <>
                    {/* Tabel desktop */}
                    <Card className="p-0 overflow-hidden hidden md:block">
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
                                        <tr key={club.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="p-4 font-medium text-white">{club.id === FEDERATIE_ID ? FEDERATIE_NAME : club.nume}</td>
                                            <td className="p-4 text-slate-300">{club.oras || '-'}</td>
                                            <td className="p-4 text-slate-300 font-mono text-sm">{club.cif || '-'}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        type="button"
                                                        title="Gestionează utilizatorii acestui club"
                                                        onClick={() => navigateRoot('user-management')}
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        <UsersIcon className="w-4 h-4 mr-1" />
                                                        <span className="hidden lg:inline">Utilizatori</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={club.id === FEDERATIE_ID || !permissions.isSuperAdmin}
                                                        onClick={() => { setClubToEdit(club); setIsModalOpen(true); }}
                                                        variant="primary"
                                                        size="sm"
                                                        title="Editează club"
                                                    >
                                                        <EditIcon />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={club.id === FEDERATIE_ID || !permissions.isSuperAdmin}
                                                        onClick={() => setClubToDelete(club)}
                                                        variant="danger"
                                                        size="sm"
                                                        title="Șterge club"
                                                    >
                                                        <TrashIcon />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Carduri mobile */}
                    <div className="md:hidden space-y-3">
                        {(clubs || []).map(club => (
                            <Card key={club.id} className="border-l-4 border-sky-500">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-base truncate">
                                            {club.id === FEDERATIE_ID ? FEDERATIE_NAME : club.nume}
                                        </p>
                                        <p className="text-sm text-slate-400">{club.oras || 'Oraș necunoscut'}</p>
                                        {club.cif && (
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">CIF: {club.cif}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-slate-700">
                                    <Button
                                        type="button"
                                        onClick={() => navigateRoot('user-management')}
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1 justify-center"
                                    >
                                        <UsersIcon className="w-4 h-4 mr-1" /> Utilizatori
                                    </Button>
                                    {permissions.isSuperAdmin && club.id !== FEDERATIE_ID && (
                                        <>
                                            <Button
                                                type="button"
                                                onClick={() => { setClubToEdit(club); setIsModalOpen(true); }}
                                                variant="primary"
                                                size="sm"
                                                className="flex-1 justify-center"
                                            >
                                                <EditIcon className="w-4 h-4 mr-1" /> Editează
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => setClubToDelete(club)}
                                                variant="danger"
                                                size="sm"
                                            >
                                                <TrashIcon />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}
            <ClubFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} clubToEdit={clubToEdit} />
            <ConfirmDeleteModal isOpen={!!clubToDelete} onClose={() => setClubToDelete(null)} onConfirm={() => { if (clubToDelete) confirmDelete(clubToDelete.id); }} tableName="Club" isLoading={isDeleting} />
        </div>
    );
};