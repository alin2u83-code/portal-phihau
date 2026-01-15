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

// --- Componente noi pentru UI Formular ---

const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-slate-700 pb-1.5">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-3">
            {children}
        </div>
    </div>
);

const Switch: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer group">
        <div className="relative">
            <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
            <div className={`block w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand-secondary' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}></div>
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase group-hover:text-white transition-colors">{label}</span>
    </label>
);

const SportivFormFields: React.FC<{
    formState: Partial<Sportiv>;
    handleChange: (e: any) => void;
    loading: boolean;
    grupe: Grupa[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    onQuickAddGrupa: () => void;
    onQuickAddFamilie: () => void;
}> = ({ formState, handleChange, loading, grupe, familii, tipuriAbonament, onQuickAddGrupa, onQuickAddFamilie }) => {
    
    return (
        <div className="space-y-4">
            <FormSection title="Date Personale">
                <Input label="Nume" name="nume" value={formState.nume || ''} onChange={handleChange} required disabled={loading} className="!py-1.5" />
                <Input label="Prenume" name="prenume" value={formState.prenume || ''} onChange={handleChange} required disabled={loading} className="!py-1.5" />
                <Input label="CNP (Opțional)" name="cnp" value={formState.cnp || ''} onChange={handleChange} maxLength={13} disabled={loading} className="!py-1.5" />
                <BirthDateInput label="Data Nașterii" value={formState.data_nasterii} onChange={(v) => handleChange({ target: { name: 'data_nasterii', value: v } })} required />
            </FormSection>

            <FormSection title="Club & Antrenament">
                <div className="flex gap-1 items-end">
                    <Select label="Grupă" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange} disabled={loading} className="flex-grow !py-1.5">
                        <option value="">Fără grupă</option>
                        {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={onQuickAddGrupa} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                </div>
                 {!formState.familie_id && (
                    <Select
                        label="Abonament Individual"
                        name="tip_abonament_id"
                        value={formState.tip_abonament_id || ''}
                        onChange={handleChange}
                        disabled={loading}
                        className="!py-1.5"
                    >
                        <option value="">Niciunul (automat)</option>
                        {tipuriAbonament.filter(t => t.numar_membri === 1).map(t => (
                            <option key={t.id} value={t.id}>{`${t.denumire} (${t.pret} RON)`}</option>
                        ))}
                    </Select>
                )}
                <div className="flex gap-1 items-end">
                    <Select label="Familie" name="familie_id" value={formState.familie_id || ''} onChange={handleChange} disabled={loading} className="flex-grow !py-1.5">
                        <option value="">Individual</option>
                        {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={onQuickAddFamilie} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                </div>
                <Select label="Status" name="status" value={formState.status || 'Activ'} onChange={handleChange} disabled={loading} className="!py-1.5">
                    <option value="Activ">Activ</option>
                    <option value="Inactiv">Inactiv</option>
                </Select>
                <Input label="Club Proveniență" name="club_provenienta" value={formState.club_provenienta || ''} onChange={handleChange} disabled={loading} className="!py-1.5" />
            </FormSection>

            <FormSection title="Opțiuni">
                 <Input label="Înălțime (cm)" name="inaltime" type="number" value={formState.inaltime || ''} onChange={handleChange} disabled={loading} className="!py-1.5" />
                 <div className="flex items-center pt-5">
                    <Switch label="Participă Vacanță" name="participa_vacanta" checked={!!formState.participa_vacanta} onChange={handleChange} />
                </div>
            </FormSection>
        </div>
    );
};


// --- Formular Sportiv Principal (MODIFICAT) ---
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
                 if (Object.keys(formState).length === 0 || formState.id) { 
                     setFormState(initialFormState);
                }
            }
        }
    }, [isOpen, sportivToEdit, setFormState]);
    
    // NOUA LOGICĂ DE MAPPING
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;

        setFormState(prev => {
            let updatedState: Partial<Sportiv> = { ...prev };
            let finalValue: any;

            if (isCheckbox) {
                finalValue = checked; // Pentru 'participa_vacanta'
            } else if (name === 'inaltime') {
                finalValue = value === '' ? null : Number(value); // Convertește la număr
            } else if (['familie_id', 'grupa_id', 'tip_abonament_id'].includes(name)) {
                finalValue = value === '' ? null : value; // Setează null pentru selecții goale
            } else {
                finalValue = value;
            }

            updatedState[name as keyof Sportiv] = finalValue;

            // Logica specială pentru selectarea familiei
            if (name === 'familie_id' && finalValue) {
                updatedState.tip_abonament_id = null; // Golește abonamentul individual
            }
            
            return updatedState;
        });
    }, [setFormState]);

    // NOUA FUNCȚIE DE SALVARE
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Extrage doar datele "curate" pentru a evita erorile de coloană
            const { roluri, id, created_at, ...cleanData } = formState;

            const result = await onSave(cleanData);
            
            if (result.success) {
                showSuccess('Succes', sportivToEdit ? 'Actualizat cu succes!' : 'Sportiv adăugat cu succes!');
                if (!sportivToEdit) {
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
                <form onSubmit={handleSubmit}>
                    <SportivFormFields
                        formState={formState}
                        handleChange={handleChange}
                        loading={loading}
                        grupe={grupe}
                        familii={familii}
                        tipuriAbonament={tipuriAbonament}
                        onQuickAddGrupa={() => setIsGrupaModalOpen(true)}
                        onQuickAddFamilie={() => setIsFamilieModalOpen(true)}
                    />
                    <div className="flex justify-end pt-4 mt-4 gap-2 border-t border-slate-700">
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