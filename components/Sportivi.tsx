import React, { useState, useCallback, useEffect } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament, Club, User } from '../types';
import { Button, Modal, Input, Select, FormSection, Switch } from './ui';
import { PlusIcon } from './icons';
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

const initialFormState: Partial<Sportiv> = {
    nume: '', prenume: '', status: 'Activ', 
    data_inscrierii: new Date().toISOString().split('T')[0],
    participa_vacanta: false,
    data_nasterii: ''
};

// --- Componente noi pentru UI Formular (MODIFICAT) ---
interface SportivFormFieldsProps {
    initialData: Partial<Sportiv>;
    onFormChange: (data: Partial<Sportiv>, isValid: boolean) => void;
    loading: boolean;
    grupe: Grupa[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    clubs: Club[];
    currentUser: User | null;
    onQuickAddGrupa: () => void;
    onQuickAddFamilie: () => void;
}

const SportivFormFields: React.FC<SportivFormFieldsProps> = ({
    initialData,
    onFormChange,
    loading,
    grupe,
    familii,
    tipuriAbonament,
    clubs,
    currentUser,
    onQuickAddGrupa,
    onQuickAddFamilie,
}) => {
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const isClubAdmin = currentUser?.roluri.some(r => r.nume === 'Admin Club') || false;

    const validate = useCallback((data: Partial<Sportiv>) => {
        const newErrors: Record<string, string> = {};
        if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
        if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
        if (!data.data_nasterii) {
            newErrors.data_nasterii = "Data nașterii este obligatorie.";
        } else {
            const birthYear = new Date(data.data_nasterii).getFullYear();
            if (birthYear < 1950 || birthYear > new Date().getFullYear() - 3) {
                newErrors.data_nasterii = "Anul nașterii pare invalid.";
            }
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            newErrors.email = "Adresa de email nu este validă.";
        }
        if (data.cnp && (data.cnp.length !== 13 || !/^\d+$/.test(data.cnp))) {
            newErrors.cnp = "CNP-ul trebuie să conțină 13 cifre.";
        }
        
        return newErrors;
    }, []);

    useEffect(() => {
        let data = { ...initialData };
        if (isClubAdmin && !data.club_id) {
            data.club_id = currentUser?.club_id;
        }
        setFormData(data);
        const initialErrors = validate(data);
        setErrors(initialErrors);
        onFormChange(data, Object.keys(initialErrors).length === 0);
    }, [initialData, onFormChange, validate, isClubAdmin, currentUser]);


    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        
        const updatedData: Partial<Sportiv> = { ...formData };
        let finalValue: any;

        if (type === 'checkbox') {
            finalValue = checked;
        } else if (name === 'inaltime') {
            const num = parseInt(value, 10);
            finalValue = isNaN(num) ? null : num;
        } else if (['familie_id', 'grupa_id', 'tip_abonament_id', 'club_id'].includes(name)) {
            finalValue = value === '' ? null : value;
        } else {
            finalValue = value;
        }

        updatedData[name as keyof Sportiv] = finalValue;

        if (name === 'familie_id' && finalValue) {
            updatedData.tip_abonament_id = null;
        }
        
        setFormData(updatedData);
        
        const newErrors = validate(updatedData);
        setErrors(newErrors);
        onFormChange(updatedData, Object.keys(newErrors).length === 0);
    };

    return (
        <div className="space-y-4">
            <FormSection title="Date Personale">
                <Input label="Nume" name="nume" value={formData.nume || ''} onChange={handleChange} required disabled={loading} className="!py-1.5" error={errors.nume} />
                <Input label="Prenume" name="prenume" value={formData.prenume || ''} onChange={handleChange} required disabled={loading} className="!py-1.5" error={errors.prenume} />
                <BirthDateInput label="Data Nașterii" value={formData.data_nasterii} onChange={(v) => handleChange({ target: { name: 'data_nasterii', value: v } })} required error={errors.data_nasterii}/>
                <Input label="Email (Opțional)" name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled={loading} className="!py-1.5" error={errors.email}/>
                <Input label="CNP (Opțional)" name="cnp" value={formData.cnp || ''} onChange={handleChange} maxLength={13} disabled={loading} className="!py-1.5" error={errors.cnp} />
                 <Select label="Club" name="club_id" value={formData.club_id || ''} onChange={handleChange} disabled={loading || isClubAdmin} className="!py-1.5">
                    <option value="">Nespecificat</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                </Select>
            </FormSection>

            <FormSection title="Club & Antrenament">
                <div className="flex gap-1 items-end">
                    <Select label="Grupă" name="grupa_id" value={formData.grupa_id || ''} onChange={handleChange} disabled={loading} className="flex-grow !py-1.5">
                        <option value="">Fără grupă</option>
                        {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={onQuickAddGrupa} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                </div>
                 {!formData.familie_id && (
                    <Select
                        label="Abonament"
                        name="tip_abonament_id"
                        value={formData.tip_abonament_id || ''}
                        onChange={handleChange}
                        disabled={loading}
                        className="!py-1.5"
                    >
                        <option value="">Niciunul (automat)</option>
                        {tipuriAbonament.map(t => (
                            <option key={t.id} value={t.id}>
                                {`${t.denumire} (${t.numar_membri} ${t.numar_membri === 1 ? 'membru' : 'membri'}) - ${t.pret} RON`}
                            </option>
                        ))}
                    </Select>
                )}
                <div className="flex gap-1 items-end">
                    <Select label="Familie" name="familie_id" value={formData.familie_id || ''} onChange={handleChange} disabled={loading} className="flex-grow !py-1.5">
                        <option value="">Individual</option>
                        {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={onQuickAddFamilie} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                </div>
                <Select label="Status" name="status" value={formData.status || 'Activ'} onChange={handleChange} disabled={loading} className="!py-1.5">
                    <option value="Activ">Activ</option>
                    <option value="Inactiv">Inactiv</option>
                </Select>
            </FormSection>

            <FormSection title="Opțiuni">
                 <Input label="Înălțime (cm)" name="inaltime" type="number" value={formData.inaltime || ''} onChange={handleChange} disabled={loading} className="!py-1.5" />
                 <div className="flex items-center pt-5">
                    <Switch label="Participă Vacanță" name="participa_vacanta" checked={!!formData.participa_vacanta} onChange={handleChange} />
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
    clubs: Club[];
    currentUser: User | null;
}> = ({ 
  isOpen,
  onClose,
  onSave,
  sportivToEdit,
  grupe,
  setGrupe,
  familii,
  setFamilii,
  tipuriAbonament,
  clubs,
  currentUser
}) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [initialData, setInitialData] = useState<Partial<Sportiv>>(initialFormState);
    const [formData, setFormData] = useState<Partial<Sportiv>>(initialFormState);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const data = sportivToEdit || initialFormState;
            setInitialData(data);
            setFormData(data);
        }
    }, [isOpen, sportivToEdit]);
    
    const handleFormChange = useCallback((data: Partial<Sportiv>, isValid: boolean) => {
        setFormData(data);
        setIsFormValid(isValid);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) {
            showError("Formular Invalid", "Vă rugăm corectați erorile înainte de a salva.");
            return;
        }

        setLoading(true);
        try {
            const { roluri, id, created_at, parola, ...cleanData } = formData;
            const result = await onSave(cleanData);
            
            if (result.success) {
                showSuccess('Succes', sportivToEdit ? 'Sportiv actualizat cu succes!' : 'Sportiv adăugat cu succes!');
                onClose();
            } else {
                console.error("Eroare la salvare (posibil RLS):", result.error); 
                showError("Eroare Salvare", result.error);
            }
        } catch (err) {
             console.error("Eroare Critică la handleSubmit:", err);
            showError("Eroare Critică", err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddGrupa = async (nume: string) => {
        const { data, error } = await supabase.from('grupe').insert({ denumire: nume, sala: 'N/A' }).select().single();
        if (error) throw error;
        setGrupe(prev => [...prev, { ...data, program: [] }]);
        setInitialData(p => ({ ...p, grupa_id: data.id }));
    };

    const handleQuickAddFamilie = async (nume: string) => {
        const { data, error } = await supabase.from('familii').insert({ nume }).select().single();
        if (error) throw error;
        setFamilii(prev => [...prev, data]);
        setInitialData(p => ({ ...p, familie_id: data.id }));
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={sportivToEdit ? "Editează Sportiv" : "Adaugă Sportiv"} persistent>
                <form onSubmit={handleSubmit}>
                    <SportivFormFields
                        initialData={initialData}
                        onFormChange={handleFormChange}
                        loading={loading}
                        grupe={grupe}
                        familii={familii}
                        tipuriAbonament={tipuriAbonament}
                        clubs={clubs}
                        currentUser={currentUser}
                        onQuickAddGrupa={() => setIsGrupaModalOpen(true)}
                        onQuickAddFamilie={() => setIsFamilieModalOpen(true)}
                    />
                    <div className="flex justify-end pt-4 mt-4 gap-2 border-t border-slate-700">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Închide</Button>
                        <Button type="submit" variant="primary" isLoading={loading} disabled={!isFormValid || loading}>Salvează</Button>
                    </div>
                </form>
            </Modal>
            <QuickAddModal title="Adaugă Grupă Nouă" label="Nume Grupă" isOpen={isGrupaModalOpen} onClose={() => setIsGrupaModalOpen(false)} onSave={handleQuickAddGrupa} />
            <QuickAddModal title="Adaugă Familie Nouă" label="Nume Familie" isOpen={isFamilieModalOpen} onClose={() => setIsFamilieModalOpen(false)} onSave={handleQuickAddFamilie} />
        </>
    );
};