import React, { useState, useMemo } from 'react';
import { Plata, Sportiv, User, TipPlata, Familie } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { ArrowLeftIcon, PlusIcon, EditIcon, TrashIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface GestiuneFacturiProps {
    onBack: () => void;
    currentUser: User;
    sportivi: Sportiv[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    tipuriPlati: TipPlata[];
    familii: Familie[];
}

const initialFormState = {
    sportiv_id: '',
    suma: '',
    descriere: '',
    tip: 'Abonament',
    data: new Date().toISOString().split('T')[0],
};

export const GestiuneFacturi: React.FC<GestiuneFacturiProps> = ({ onBack, currentUser, sportivi, plati, setPlati, tipuriPlati, familii }) => {
    const { showError, showSuccess } = useError();
    const [formState, setFormState] = useState(initialFormState);
    const [loading, setLoading] = useState(false);

    const [plataToEdit, setPlataToEdit] = useState<Plata | null>(null);
    const [editStatus, setEditStatus] = useState<Plata['status']>('Neachitat');
    const [isEditLoading, setIsEditLoading] = useState(false);
    
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const clubSportivi = useMemo(() => sportivi.filter(s => s.club_id === currentUser.club_id).sort((a, b) => a.nume.localeCompare(b.nume)), [sportivi, currentUser.club_id]);
    const clubPlati = useMemo(() => {
        const clubSportiviIds = new Set(clubSportivi.map(s => s.id));
        return plati.filter(p => p.sportiv_id && clubSportiviIds.has(p.sportiv_id)).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [plati, clubSportivi]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddFactura = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare", "Client Supabase neconfigurat."); return; }
        
        const sumaNum = parseFloat(formState.suma);
        if (!formState.sportiv_id || !formState.descriere || isNaN(sumaNum) || sumaNum <= 0) {
            showError("Date Invalide", "Vă rugăm completați toate câmpurile cu date valide.");
            return;
        }

        const sportivSelectat = sportivi.find(s => s.id === formState.sportiv_id);
        if (sportivSelectat?.club_id !== currentUser.club_id) {
            showError("Acces Interzis", "Nu puteți emite facturi pentru sportivi din alt club.");
            return;
        }

        setLoading(true);
        const newPlata: Omit<Plata, 'id'> = {
            sportiv_id: formState.sportiv_id,
            familie_id: sportivSelectat.familie_id,
            suma: sumaNum,
            data: formState.data,
            status: 'Neachitat',
            descriere: formState.descriere,
            tip: formState.tip,
            observatii: 'Generat manual de admin'
        };

        const { data, error } = await supabase.from('plati').insert(newPlata).select().single();
        setLoading(false);

        if (error) {
            showError("Eroare la adăugare", error.message);
        } else if (data) {
            setPlati(prev => [data, ...prev]);
            setFormState(initialFormState);
            showSuccess("Succes", "Factura a fost adăugată.");
        }
    };

    const handleOpenEdit = (plata: Plata) => {
        setPlataToEdit(plata);
        setEditStatus(plata.status);
    };

    const handleSaveEdit = async () => {
        if (!plataToEdit || !supabase) return;
        setIsEditLoading(true);
        const { data, error } = await supabase.from('plati').update({ status: editStatus }).eq('id', plataToEdit.id).select().single();
        setIsEditLoading(false);

        if (error) {
            showError("Eroare la modificare", error.message);
        } else if (data) {
            setPlati(prev => prev.map(p => p.id === data.id ? data : p));
            setPlataToEdit(null);
            showSuccess("Succes", "Statusul facturii a fost actualizat.");
        }
    };

    const handleDelete = async () => {
        if (!plataToDelete || !supabase) return;
        setIsDeleting(true);
        const { error } = await supabase.from('plati').delete().eq('id', plataToDelete.id);
        setIsDeleting(false);

        if (error) {
            showError("Eroare la ștergere", error.message);
        } else {
            setPlati(prev => prev.filter(p => p.id !== plataToDelete.id));
            setPlataToDelete(null);
            showSuccess("Succes", "Factura a fost ștearsă.");
        }
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Gestiune Facturi Manuale</h1>

            <Card>
                <form onSubmit={handleAddFactura} className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">Adaugă Factură Nouă</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select label="Sportiv" name="sportiv_id" value={formState.sportiv_id} onChange={handleFormChange} required>
                            <option value="">Alege sportiv...</option>
                            {clubSportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                        <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleFormChange} required />
                        <Select label="Tip Plată" name="tip" value={formState.tip} onChange={handleFormChange} required>
                            {tipuriPlati.map(t => <option key={t.id} value={t.nume}>{t.nume}</option>)}
                        </Select>
                    </div>
                    <Input label="Descriere Factură" name="descriere" value={formState.descriere} onChange={handleFormChange} required placeholder="Ex: Echipament, Taxă specială..." />
                    <div className="flex justify-end pt-2">
                        <Button type="submit" variant="primary" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2" /> Adaugă Factură</Button>
                    </div>
                </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">Facturi Recente</div>
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-400 sticky top-0">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Sportiv</th>
                                <th className="p-3">Descriere</th>
                                <th className="p-3 text-right">Sumă</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {clubPlati.map(p => (
                                <tr key={p.id}>
                                    <td className="p-3">{new Date(p.data).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 font-medium text-white">{sportivi.find(s => s.id === p.sportiv_id)?.nume} {sportivi.find(s => s.id === p.sportiv_id)?.prenume}</td>
                                    <td className="p-3">{p.descriere}</td>
                                    <td className="p-3 text-right font-bold text-white">{p.suma.toFixed(2)} lei</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'Achitat' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(p)}><EditIcon className="w-4 h-4" /></Button>
                                            <Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)}><TrashIcon className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {clubPlati.length === 0 && <p className="p-12 text-center text-slate-500 italic">Nicio factură manuală adăugată pentru acest club.</p>}
                </div>
            </Card>

            {plataToEdit && (
                <Modal isOpen={!!plataToEdit} onClose={() => setPlataToEdit(null)} title="Modifică Status Factură">
                    <div className="space-y-4">
                        <p>Modifică statusul pentru factura: <strong>{plataToEdit.descriere}</strong></p>
                        <Select label="Status Nou" value={editStatus} onChange={e => setEditStatus(e.target.value as Plata['status'])}>
                            <option value="Neachitat">Neachitat</option>
                            <option value="Achitat Parțial">Achitat Parțial</option>
                            <option value="Achitat">Achitat</option>
                        </Select>
                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={() => setPlataToEdit(null)} disabled={isEditLoading}>Anulează</Button>
                            <Button variant="success" onClick={handleSaveEdit} isLoading={isEditLoading}>Salvează</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmDeleteModal
                isOpen={!!plataToDelete}
                onClose={() => setPlataToDelete(null)}
                onConfirm={handleDelete}
                tableName="factură"
                isLoading={isDeleting}
            />
        </div>
    );
};