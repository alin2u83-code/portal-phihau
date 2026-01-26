
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament, Club, User } from '../types';
import { Button, Modal, Input, Select, FormSection, Switch } from './ui';
import { PlusIcon, ExclamationTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { BirthDateInput } from './BirthDateInput';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

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
    
    const isSuperAdmin = useMemo(() => 
        currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin'), 
        [currentUser]
    );

    const isClubAdmin = useMemo(() => 
        !isSuperAdmin && currentUser?.roluri.some(r => r.nume === 'Admin Club' || r.nume === 'Instructor'), 
        [currentUser, isSuperAdmin]
    );

    const validate = useCallback((data: Partial<Sportiv>) => {
        const newErrors: Record<string, string> = {};
        if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
        if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
        if (!data.data_nasterii) {
            newErrors.data_nasterii = "Data nașterii este obligatorie.";
        }
        return newErrors;
    }, []);

    useEffect(() => {
        let data = { ...initialData };
        if (!isSuperAdmin && !data.club_id) {
            data.club_id = currentUser?.club_id;
        }
        setFormData(data);
        const initialErrors = validate(data);
        setErrors(initialErrors);
        onFormChange(data, Object.keys(initialErrors).length === 0);
    }, [initialData, onFormChange, validate, isSuperAdmin, currentUser]);

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
        
        setFormData(updatedData);
        const newErrors = validate(updatedData);
        setErrors(newErrors);
        onFormChange(updatedData, Object.keys(newErrors).length === 0);
    };

    return (
        <div className="space-y-4">
            <FormSection title="Date Personale">
                <Input label="Nume" name="nume" value={formData.nume || ''} onChange={handleChange} required disabled={loading} error={errors.nume} />
                <Input label="Prenume" name="prenume" value={formData.prenume || ''} onChange={handleChange} required disabled={loading} error={errors.prenume} />
                <BirthDateInput label="Data Nașterii" value={formData.data_nasterii} onChange={(v) => handleChange({ target: { name: 'data_nasterii', value: v } })} required error={errors.data_nasterii}/>
                 <Select label="Club" name="club_id" value={formData.club_id || ''} onChange={handleChange} disabled={loading || !isSuperAdmin}>
                    {!isSuperAdmin && <option value={currentUser?.club_id || ''}>{clubs.find(c => c.id === currentUser?.club_id)?.nume || 'Clubul Meu'}</option>}
                    {isSuperAdmin && (
                        <>
                            <option value="">Nespecificat</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}</option>)}
                        </>
                    )}
                </Select>
            </FormSection>

            <FormSection title="Club & Antrenament">
                <div className="flex gap-1 items-end">
                    <Select label="Grupă" name="grupa_id" value={formData.grupa_id || ''} onChange={handleChange} disabled={loading} className="flex-grow">
                        <option value="">Fără grupă</option>
                        {grupe.filter(g => !formData.club_id || g.club_id === formData.club_id).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={onQuickAddGrupa} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                </div>
                <div className="flex gap-1 items-end">
                    <Select label="Familie" name="familie_id" value={formData.familie_id || ''} onChange={handleChange} disabled={loading} className="flex-grow">
                        <option value="">Individual</option>
                        {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={onQuickAddFamilie} className="h-[34px]"><PlusIcon className="w-4 h-4"/></Button>
                </div>
            </FormSection>
        </div>
    );
};

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
  isOpen, onClose, onSave, sportivToEdit, grupe, setGrupe, familii, setFamilii, tipuriAbonament, clubs, currentUser
}) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Sportiv>>(initialFormState);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);
    const [criticalPermissionError, setCriticalPermissionError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(sportivToEdit || initialFormState);
            setCriticalPermissionError(null);
        }
    }, [isOpen, sportivToEdit]);
    
    const handleFormChange = useCallback((data: Partial<Sportiv>, isValid: boolean) => {
        setFormData(data);
        setIsFormValid(isValid);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCriticalPermissionError(null);

        const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin');
        
        // Verificare critică Multi-Tenancy
        if (!isSuperAdmin && formData.club_id && formData.club_id !== currentUser?.club_id) {
            setCriticalPermissionError(`Tentativă de modificare neautorizată! Nu aveți drepturi de administrare pentru clubul selectat.`);
            return;
        }

        if (!isFormValid) {
            showError("Formular Invalid", "Vă rugăm corectați erorile înainte de a salva.");
            return;
        }

        setLoading(true);
        try {
            const { roluri, id, created_at, parola, ...cleanData } = formData;
            const result = await onSave(cleanData);
            if (result.success) {
                showSuccess('Succes', sportivToEdit ? 'Sportiv actualizat!' : 'Sportiv adăugat!');
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
        const { data, error } = await supabase.from('grupe').insert({ 
            denumire: nume, 
            sala: 'N/A', 
            club_id: isSuperAdmin ? null : currentUser?.club_id 
        }).select().single();
        if (error) throw error;
        setGrupe(prev => [...prev, { ...data, program: [] }]);
    };

    const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin');

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={sportivToEdit ? "Editează Sportiv" : "Adaugă Sportiv"} persistent>
                {criticalPermissionError ? (
                    <div className="p-6 rounded-lg bg-[#112240] border-2 border-red-500 text-center animate-fade-in-down">
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-400 mb-2">Eroare de Securitate</h3>
                        <p className="text-slate-300 mb-6">{criticalPermissionError}</p>
                        <Button variant="danger" onClick={() => setCriticalPermissionError(null)} className="w-full">
                            Am înțeles, reîncearcă
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <SportivFormFields
                            initialData={formData}
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
                )}
            </Modal>
            <QuickAddModal title="Adaugă Grupă" label="Nume Grupă" isOpen={isGrupaModalOpen} onClose={() => setIsGrupaModalOpen(false)} onSave={handleQuickAddGrupa} />
            <QuickAddModal title="Adaugă Familie" label="Nume Familie" isOpen={isFamilieModalOpen} onClose={() => setIsFamilieModalOpen(false)} onSave={async (n) => {
                const { data, error } = await supabase.from('familii').insert({ nume: n }).select().single();
                if (error) throw error;
                setFamilii(prev => [...prev, data]);
            }} />
        </>
    );
};
