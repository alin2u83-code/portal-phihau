import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { BirthDateInput } from './BirthDateInput';

// --- Modale de adăugare rapidă ---
const QuickAddModal: React.FC<{ 
  title: string; 
  label: string; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (name: string) => Promise<any>; 
}> = ({ title, label, isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setLoading(true);
        try {
            await onSave(trimmed);
            setName('');
            onClose();
        } catch (err) {
            showError("Eroare Adăugare", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label={label} value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                <div className="flex justify-end pt-2 gap-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="primary" isLoading={loading}>Adaugă</Button>
                </div>
            </form>
        </Modal>
    );
};

// --- Formular Sportiv Principal ---
const SportivFormModal: React.FC<any> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  sportivToEdit, 
  grupe, 
  setGrupe, 
  familii, 
  setFamilii, 
  tipuriAbonament, 
  customFields, 
  showSuccessToast 
}) => {
    const { showError } = useError();
    const [loading, setLoading] = useState(false);
    const [formState, setFormState] = useState<Partial<Sportiv>>({});
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormState(sportivToEdit || {
                nume: '', prenume: '', status: 'Activ', 
                data_inscrierii: new Date().toISOString().split('T')[0],
                club_provenienta: 'Phi Hau Iași', participa_vacanta: false,
                data_nasterii: ''
            });
        }
    }, [isOpen, sportivToEdit]);

    const handleChange = useCallback((e: any) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: value === '' ? null : value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Timeout 0 permite UI-ului să marcheze loading state-ul înainte de execuția async
        setTimeout(async () => {
            try {
                const result = await onSave(formState);
                if (result.success) {
                    showSuccessToast(sportivToEdit ? 'Actualizat cu succes!' : 'Sportiv adăugat cu succes!');
                    onClose();
                } else {
                    showError("Eroare Salvare", result.error);
                }
            } catch (err) {
                showError("Eroare Critică", err);
            } finally {
                setLoading(false);
            }
        }, 0);
    };

    const handleQuickAddGrupa = async (nume: string) => {
        if (!supabase) return;
        const { data, error } = await supabase.from('grupe').insert({ denumire: nume, sala: 'N/A' }).select().single();
        if (error) throw error;
        setGrupe((prev: any) => [...prev, { ...data, program: [] }]);
        setFormState(p => ({ ...p, grupa_id: data.id }));
    };

    const handleQuickAddFamilie = async (nume: string) => {
        if (!supabase) return;
        const { data, error } = await supabase.from('familii').insert({ nume }).select().single();
        if (error) throw error;
        setFamilii((prev: any) => [...prev, data]);
        setFormState(p => ({ ...p, familie_id: data.id }));
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={sportivToEdit ? "Editează Sportiv" : "Adaugă Sportiv"} persistent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Nume" name="nume" value={formState.nume || ''} onChange={handleChange} required disabled={loading} />
                        <Input label="Prenume" name="prenume" value={formState.prenume || ''} onChange={handleChange} required disabled={loading} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <BirthDateInput 
                            label="Data Nașterii" 
                            value={formState.data_nasterii} 
                            onChange={(v) => handleChange({ target: { name: 'data_nasterii', value: v } })} 
                            required 
                        />
                        <Input label="CNP (Opțional)" name="cnp" value={formState.cnp || ''} onChange={handleChange} maxLength={13} disabled={loading} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div className="flex gap-1 items-end">
                            <Select label="Grupă" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange} disabled={loading}>
                                <option value="">Fără grupă</option>
                                {grupe.map((g: any) => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsGrupaModalOpen(true)} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                        </div>
                        <div className="flex gap-1 items-end">
                            <Select label="Familie" name="familie_id" value={formState.familie_id || ''} onChange={handleChange} disabled={loading}>
                                <option value="">Individual</option>
                                {familii.map((f: any) => <option key={f.id} value={f.id}>{f.nume}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsFamilieModalOpen(true)} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Status" name="status" value={formState.status || 'Activ'} onChange={handleChange} disabled={loading}>
                            <option value="Activ">Activ</option>
                            <option value="Inactiv">Inactiv</option>
                        </Select>
                        <Input label="Data Înscrierii" name="data_inscrierii" type="date" value={formState.data_inscrierii || ''} onChange={handleChange} disabled={loading} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <Input label="Înălțime (cm)" name="inaltime" type="number" value={formState.inaltime || ''} onChange={handleChange} disabled={loading} />
                         <Input label="Club Proveniență" name="club_provenienta" value={formState.club_provenienta || ''} onChange={handleChange} disabled={loading} />
                    </div>

                    <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Închide</Button>
                        <Button type="submit" variant="primary" isLoading={loading}>Salvează</Button>
                    </div>
                </form>
            </Modal>
            <QuickAddModal title="Adaugă Grupă Nouă" label="Nume Grupă" isOpen={isGrupaModalOpen} onClose={() => setIsGrupaModalOpen(false)} onSave={handleQuickAddGrupa} />
            <QuickAddModal title="Adaugă Familie Nouă" label="Nume Familie" isOpen={isFamilieModalOpen} onClose={() => setIsFamilieModalOpen(false)} onSave={handleQuickAddFamilie} />
        </>
    );
};

// --- Componenta Management Principală ---
export const SportiviManagement: React.FC<any> = ({ 
  onBack, 
  sportivi, 
  setSportivi, 
  grupe, 
  setGrupe, 
  tipuriAbonament, 
  familii, 
  setFamilii, 
  customFields, 
  allRoles 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [successToast, setSuccessToast] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { showError } = useError();

    const [searchTerm, setSearchTerm] = useState('');

    const filteredSportivi = useMemo(() => {
        return sportivi.filter((s: Sportiv) => 
            `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, searchTerm]);

    const handleSave = async (formData: Partial<Sportiv>) => {
        if (!supabase) return { success: false, error: 'Supabase indisponibil' };
        
        try {
            if (sportivToEdit) {
                const { data, error } = await supabase.from('sportivi').update(formData).eq('id', sportivToEdit.id).select().single();
                if (error) throw error;
                setSportivi((prev: Sportiv[]) => prev.map(s => s.id === sportivToEdit.id ? { ...s, ...data } : s));
            } else {
                const { data, error } = await supabase.from('sportivi').insert(formData).select().single();
                if (error) throw error;
                setSportivi((prev: Sportiv[]) => [...prev, { ...data, roluri: [] }]);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const handleDelete = async (id: string) => {
        if (!supabase || !window.confirm("Sigur ștergi sportivul?")) return;
        setDeletingId(id);
        try {
            const { error } = await supabase.from('sportivi').delete().eq('id', id);
            if (error) throw error;
            setSportivi((prev: Sportiv[]) => prev.filter(s => s.id !== id));
        } catch (err) {
            showError("Eroare Ștergere", err);
        } finally {
            setDeletingId(null);
        }
    };

    const showSuccessToast = (msg: string) => {
        setSuccessToast(msg);
        setTimeout(() => setSuccessToast(null), 3000);
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                <Button variant="primary" onClick={() => { setSportivToEdit(null); setIsModalOpen(true); }}>
                    <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                </Button>
            </div>

            {successToast && <div className="bg-green-600/50 text-white p-2 rounded text-center text-sm font-bold animate-fade-in-down border border-green-500">{successToast}</div>}

            <Card className="flex flex-col sm:flex-row gap-4">
                <Input label="Caută Sportiv" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nume sau prenume..." />
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3 font-bold uppercase text-[10px]">Nume Prenume</th>
                                <th className="p-3 font-bold uppercase text-[10px]">Grupă</th>
                                <th className="p-3 font-bold uppercase text-[10px]">Status</th>
                                <th className="p-3 font-bold uppercase text-[10px] text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredSportivi.map(s => (
                                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-semibold">{s.nume} {s.prenume}</td>
                                    <td className="p-3 text-slate-400 text-xs">{grupe.find((g: any) => g.id === s.grupa_id)?.denumire || '-'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-red-600/20 text-red-400 border border-red-600/50'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="secondary" onClick={() => { setSportivToEdit(s); setIsModalOpen(true); }}><EditIcon className="w-4 h-4"/></Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)} isLoading={deletingId === s.id}><TrashIcon className="w-4 h-4"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredSportivi.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun sportiv găsit.</p>}
                </div>
            </Card>

            <SportivFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                sportivToEdit={sportivToEdit}
                grupe={grupe}
                setGrupe={setGrupe}
                familii={familii}
                setFamilii={setFamilii}
                tipuriAbonament={tipuriAbonament}
                showSuccessToast={showSuccessToast}
            />
        </div>
    );
};