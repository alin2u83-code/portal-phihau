import React, { useState, useCallback } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { BirthDateInput } from './BirthDateInput';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
export const SportivFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: Partial<Sportiv>) => Promise<{ success: boolean, error?: any }>;
    sportivToEdit: Partial<Sportiv> | null;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    tipuriAbonament: TipAbonament[];
}> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  sportivToEdit, 
  grupe, 
  setGrupe, 
  familii, 
  setFamilii, 
  tipuriAbonament
}) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [formState, setFormState] = useLocalStorage<Partial<Sportiv>>('phi-hau-sportiv-form-draft', sportivToEdit || initialFormState);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (sportivToEdit) {
                setFormState(sportivToEdit);
            } else {
                 if (Object.keys(formState).length === 0 || formState.id) { // if draft is empty or has an ID (from a previous edit)
                     setFormState(initialFormState);
                }
            }
        }
    }, [isOpen, sportivToEdit, setFormState]);

    const handleChange = useCallback((e: any) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
             setFormState(p => ({ ...p, [name]: checked }));
        } else {
            setFormState(p => ({ ...p, [name]: value === '' ? null : value }));
        }
    }, [setFormState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { roluri, ...dataToSave } = formState;
            const result = await onSave(dataToSave);
            if (result.success) {
                showSuccess('Succes', sportivToEdit ? 'Actualizat cu succes!' : 'Sportiv adăugat cu succes!');
                if (!sportivToEdit) { // only clear draft on new creation
                    setFormState({}); 
                }
                onClose();
            } else {
                showError("Eroare Salvare", result.error);
            }
        } catch (err) {
            showError("Eroare Critică", err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddGrupa = async (nume: string) => {
        const { data, error } = await supabase.from('grupe').insert({ denumire: nume, sala: 'N/A' }).select().single();
        if (error) throw error;
        setGrupe(prev => [...prev, { ...data, program: [] }]);
        setFormState(p => ({ ...p, grupa_id: data.id }));
    };

    const handleQuickAddFamilie = async (nume: string) => {
        const { data, error } = await supabase.from('familii').insert({ nume }).select().single();
        if (error) throw error;
        setFamilii(prev => [...prev, data]);
        setFormState(p => ({ ...p, familie_id: data.id }));
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={sportivToEdit ? "Editează Sportiv" : "Adaugă Sportiv"} persistent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3"><Input label="Nume" name="nume" value={formState.nume || ''} onChange={handleChange} required disabled={loading} /><Input label="Prenume" name="prenume" value={formState.prenume || ''} onChange={handleChange} required disabled={loading} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><BirthDateInput label="Data Nașterii" value={formState.data_nasterii} onChange={(v) => handleChange({ target: { name: 'data_nasterii', value: v } })} required /><Input label="CNP (Opțional)" name="cnp" value={formState.cnp || ''} onChange={handleChange} maxLength={13} disabled={loading} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                        <div className="flex gap-1 items-end">
                            <Select label="Grupă" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange} disabled={loading}><option value="">Fără grupă</option>{grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}</Select>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsGrupaModalOpen(true)} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                        </div>
                        <div className="space-y-1">
                            <div className="flex gap-1 items-end">
                                <Select label="Familie" name="familie_id" value={formState.familie_id || ''} onChange={handleChange} disabled={loading}><option value="">Individual</option>{familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}</Select>
                                <Button type="button" variant="secondary" size="sm" onClick={() => setIsFamilieModalOpen(true)} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    </div>
                     <Select 
                        label="Abonament Individual" 
                        name="tip_abonament_id" 
                        value={formState.tip_abonament_id || ''} 
                        onChange={handleChange} 
                        disabled={loading || !!formState.familie_id}
                    >
                        <option value="">Niciunul / Gestionat de familie</option>
                        {tipuriAbonament.filter(t => t.numar_membri === 1).map(t => <option key={t.id} value={t.id}>{t.denumire} ({t.pret} RON)</option>)}
                    </Select>
                    {!!formState.familie_id && <p className="text-xs text-slate-500 ml-1 -mt-3">Abonamentul este gestionat la nivel de familie.</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Status" name="status" value={formState.status || 'Activ'} onChange={handleChange} disabled={loading}><option value="Activ">Activ</option><option value="Inactiv">Inactiv</option></Select>
                        <Input label="Data Înscrierii" name="data_inscrierii" type="date" value={formState.data_inscrierii || ''} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <Input label="Înălțime (cm)" name="inaltime" type="number" value={formState.inaltime || ''} onChange={handleChange} disabled={loading} />
                         <Input label="Club Proveniență" name="club_provenienta" value={formState.club_provenienta || ''} onChange={handleChange} disabled={loading} />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Telefon (Opțional)" name="telefon" value={formState.telefon || ''} onChange={handleChange} disabled={loading} />
                        <Input label="Adresă (Opțional)" name="adresa" value={formState.adresa || ''} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="participa_vacanta" name="participa_vacanta" checked={!!formState.participa_vacanta} onChange={handleChange} className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"/>
                        <label htmlFor="participa_vacanta" className="ml-2 text-sm text-slate-300">Participă la antrenamentele din vacanță</label>
                    </div>
                    <div className="flex justify-end pt-4 gap-2 border-t border-slate-700"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Închide</Button><Button type="submit" variant="primary" isLoading={loading}>Salvează</Button></div>
                </form>
            </Modal>
            <QuickAddModal title="Adaugă Grupă Nouă" label="Nume Grupă" isOpen={isGrupaModalOpen} onClose={() => setIsGrupaModalOpen(false)} onSave={handleQuickAddGrupa} />
            <QuickAddModal title="Adaugă Familie Nouă" label="Nume Familie" isOpen={isFamilieModalOpen} onClose={() => setIsFamilieModalOpen(false)} onSave={handleQuickAddFamilie} />
        </>
    );
};