import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, WalletIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { BirthDateInput } from './BirthDateInput';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DeleteAuditModal } from './DeleteAuditModal';
import { SportivWallet } from './SportivWallet';

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

const initialFormState: Partial<Sportiv> = {
    nume: '', prenume: '', status: 'Activ', 
    data_inscrierii: new Date().toISOString().split('T')[0],
    club_provenienta: 'Phi Hau Iași', participa_vacanta: false,
    data_nasterii: ''
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
  customFields
}) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [formState, setFormState] = useLocalStorage<Partial<Sportiv>>('phi-hau-sportiv-form-draft', initialFormState);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (sportivToEdit) {
                // La editare, întotdeauna se încarcă datele sportivului, suprascriind orice draft.
                setFormState(sportivToEdit);
            } else {
                // La adăugare, hook-ul `useLocalStorage` a încărcat deja orice draft existent.
                // Dacă draft-ul este gol (ex. după o salvare reușită), re-inițializăm.
                if (Object.keys(formState).length === 0) {
                     setFormState(initialFormState);
                }
            }
        }
    }, [isOpen, sportivToEdit, setFormState]);

    const handleChange = useCallback((e: any) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: value === '' ? null : value }));
    }, [setFormState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        setTimeout(async () => {
            try {
                const result = await onSave(formState);
                if (result.success) {
                    showSuccess('Succes', sportivToEdit ? 'Actualizat cu succes!' : 'Sportiv adăugat cu succes!');
                    setFormState({}); // Curăță draft-ul din localStorage la succes
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
export const SportiviManagement: React.FC<{
    onBack: () => void;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    allRoles: Rol[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
}> = ({ onBack, sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, allRoles, plati, tranzactii, setTranzactii }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [sportivForAudit, setSportivForAudit] = useState<Sportiv | null>(null);
    const [walletSportiv, setWalletSportiv] = useState<Sportiv | null>(null);
    const { showError, showSuccess } = useError();
    const [searchTerm, setSearchTerm] = useState('');

    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!familii || !plati || !tranzactii) return balances;

        familii.forEach(f => balances.set(f.id, 0));

        tranzactii.forEach(t => {
            if (t.familie_id) {
                balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma);
            }
        });

        plati.forEach(p => {
            if (p.familie_id) {
                balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma);
            }
        });

        return balances;
    }, [familii, plati, tranzactii]);

    const filteredSportivi = useMemo(() => {
        return sportivi.filter((s: Sportiv) => 
            `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, searchTerm]);

    const handleSave = async (formData: Partial<Sportiv>) => {
        if (!supabase) return { success: false, error: 'Supabase indisponibil' };
        
        const { roluri, ...sportivData } = formData;
    
        try {
            if (sportivToEdit) {
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select().single();
                if (error) throw error;
                setSportivi((prev: Sportiv[]) => prev.map(s => 
                    s.id === sportivToEdit.id 
                    ? { ...s, ...data } 
                    : s
                ));
            } else {
                const { data, error } = await supabase.from('sportivi').insert(sportivData).select().single();
                if (error) throw error;
                setSportivi((prev: Sportiv[]) => [...prev, { ...data, roluri: [] }]);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };
    
    const handleDeactivate = async (sportiv: Sportiv) => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('sportivi')
            .update({ status: 'Inactiv' })
            .eq('id', sportiv.id)
            .select()
            .single();

        if (error) {
            showError("Eroare la Dezactivare", error);
        } else if (data) {
            setSportivi((prev: Sportiv[]) => prev.map(s => s.id === sportiv.id ? data : s));
            showSuccess("Succes", `Sportivul ${sportiv.nume} ${sportiv.prenume} a fost marcat ca 'Inactiv'.`);
        }
    };

    const handleDelete = async (sportiv: Sportiv) => {
        if (!supabase) return;
        const { error: deleteError } = await supabase.from('sportivi').delete().eq('id', sportiv.id);
        if (deleteError) {
            showError("Eroare la Ștergere", deleteError);
            return;
        }
        setSportivi((prev: Sportiv[]) => prev.filter(s => s.id !== sportiv.id));
        showSuccess("Succes", "Sportivul a fost șters definitiv.");
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
                            {filteredSportivi.map((s: Sportiv) => {
                                const familie = s.familie_id ? familii.find(f => f.id === s.familie_id) : null;
                                const familieBalance = s.familie_id ? familyBalances.get(s.familie_id) : undefined;
                                
                                return (
                                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-semibold">
                                        {s.nume} {s.prenume}
                                        {familie && familieBalance !== undefined && (
                                            <div className="text-xs font-normal text-slate-400" style={{fontSize: '13px'}}>
                                                Familia {familie.nume}
                                                <span className={`ml-2 font-bold ${familieBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    Sold: {familieBalance >= 0 ? '+' : ''}{familieBalance.toFixed(2)} lei
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-slate-400 text-xs">{grupe.find((g: any) => g.id === s.grupa_id)?.denumire || '-'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-red-600/20 text-red-400 border border-red-600/50'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="info" onClick={() => setWalletSportiv(s)}><WalletIcon className="w-4 h-4"/></Button>
                                            <Button size="sm" variant="secondary" onClick={() => { setSportivToEdit(s); setIsModalOpen(true); }}><EditIcon className="w-4 h-4"/></Button>
                                            <Button size="sm" variant="danger" onClick={() => setSportivForAudit(s)}><TrashIcon className="w-4 h-4"/></Button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
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
            />
            
            {sportivForAudit && (
                <DeleteAuditModal
                    sportiv={sportivForAudit}
                    isOpen={!!sportivForAudit}
                    onClose={() => setSportivForAudit(null)}
                    onDeactivate={handleDeactivate}
                    onDelete={handleDelete}
                />
            )}
             {walletSportiv && (
                <SportivWallet
                    sportiv={walletSportiv}
                    familie={familii.find(f => f.id === walletSportiv.familie_id)}
                    allPlati={plati}
                    allTranzactii={tranzactii}
                    setTranzactii={setTranzactii}
                    onClose={() => setWalletSportiv(null)}
                />
            )}
        </div>
    );
};