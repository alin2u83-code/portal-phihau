import React, { useState, useCallback, useEffect, useMemo, useReducer } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament, Club, User, Grad } from '../types';
import { Button, Modal, Input, Select, FormSection, Switch } from './ui';
import { PlusIcon, ExclamationTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { BirthDateInput } from './BirthDateInput';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useSportivForm } from '../hooks/useSportivForm';

// --- Modale de adăugare rapidă ---
import { validateSportiv } from '../utils/validation';

// --- Modale de adăugare rapidă ---
// FIX: Exported QuickAddModal to be used in other components.
export const QuickAddModal: React.FC<{ 
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
    data_nasterii: '',
    gen: null,
};

interface SportivFormFieldsProps {
    initialData: Partial<Sportiv>;
    onFormChange: (data: Partial<Sportiv>, isValid: boolean) => void;
    loading: boolean;
    grupe: Grupa[];
    grade: Grad[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    clubs: Club[];
    currentUser: User | null;
    onQuickAddGrupa: () => void;
    onQuickAddFamilie: () => void;
}

const formReducer = (state: any, action: any) => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'SET_FORM_DATA':
            return action.payload;
        case 'RESET':
            return action.payload;
        default:
            return state;
    }
};

// FIX: Exported SportivFormFields to be used in other components.
export const SportivFormFields: React.FC<SportivFormFieldsProps> = ({
    initialData,
    onFormChange,
    loading,
    grupe,
    grade,
    familii,
    tipuriAbonament,
    clubs,
    currentUser,
    onQuickAddGrupa,
    onQuickAddFamilie,
}) => {
    const formData = initialData;
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Memoize validate to avoid dependency cycles
    const validate = useCallback((data: Partial<Sportiv>) => {
        return validateSportiv(data);
    }, []);

    const isSuperAdmin = useMemo(() => 
        currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN'), 
        [currentUser]
    );

    // Validate on mount and when data changes
    useEffect(() => {
        const currentErrors = validate(formData);
        // Only update state if errors changed to avoid loops
        setErrors(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(currentErrors)) {
                return currentErrors;
            }
            return prev;
        });
        // We don't call onFormChange here to avoid loops. 
        // The parent should check validity when trying to save or we rely on handleChange to trigger updates.
    }, [formData, validate]);


    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let updatedData: Partial<Sportiv> = { ...formData };
        let finalValue: any;

        if (type === 'checkbox') {
            finalValue = checked;
        } else if (name === 'inaltime') {
            const num = parseInt(value, 10);
            finalValue = isNaN(num) ? null : num;
        } else if (['familie_id', 'grupa_id', 'tip_abonament_id', 'club_id', 'gen', 'grad_actual_id'].includes(name)) {
            finalValue = value === '' ? null : value;
        } else {
            finalValue = value;
        }

        (updatedData as any)[name] = finalValue;
        
        if (name === 'club_id') {
            const currentGroup = grupe.find(g => g.id === updatedData.grupa_id);
            if (currentGroup && currentGroup.club_id !== finalValue) {
                updatedData.grupa_id = null;
            }
        }
        
        if (!formData.id && (name === 'nume' || name === 'prenume')) {
            const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            const nume = sanitize(name === 'nume' ? value : updatedData.nume || '');
            const prenume = sanitize(name === 'prenume' ? value : updatedData.prenume || '');
            
            if (nume && prenume) {
                const targetClubId = updatedData.club_id || currentUser?.club_id;
                const club = clubs.find(c => c.id === targetClubId);
                const domain = club ? club.nume.toLowerCase().replace(/[^a-z0-9]/g, '') + '.ro' : 'phihau.ro';
                updatedData.email = `${nume}.${prenume}@${domain}`;
                updatedData.parola = `${nume}.1234!`;
                // Username is generated by the backend function 'adauga_sportiv_complet'
            }
        }

        const newErrors = validate(updatedData);
        setErrors(newErrors);
        onFormChange(updatedData, Object.keys(newErrors).length === 0);
    };
    
    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'club'>('general');
    
    const inputStyle = "!text-lg !py-2.5 h-12";

    return (
        <div className="space-y-4">
            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-700 mb-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'general' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Date Personale
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'contact' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Contact & Acces
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('club')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'club' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Club & Status
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Date Personale">
                        <Input label="Nume" name="nume" value={formData.nume || ''} onChange={handleChange} required disabled={loading} error={errors.nume} className={inputStyle} />
                        <Input label="Prenume" name="prenume" value={formData.prenume || ''} onChange={handleChange} required disabled={loading} error={errors.prenume} className={inputStyle} />
                        <BirthDateInput label="Data Nașterii" value={formData.data_nasterii} onChange={(v) => handleChange({ target: { name: 'data_nasterii', value: v } })} required error={errors.data_nasterii}/>
                        <Input label="CNP" name="cnp" value={formData.cnp || ''} onChange={handleChange} disabled={loading} maxLength={13} className={inputStyle} />
                        <Input label="Înălțime (cm)" name="inaltime" type="number" value={formData.inaltime || ''} onChange={handleChange} disabled={loading} className={inputStyle} />
                        <Select label="Gen" name="gen" value={formData.gen || ''} onChange={handleChange} disabled={loading} className={inputStyle}>
                            <option value="">Nespecificat</option>
                            <option value="Masculin">Masculin</option>
                            <option value="Feminin">Feminin</option>
                        </Select>
                    </FormSection>
                </div>
            )}

            {activeTab === 'contact' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Date Contact">
                        <Input label="Telefon" name="telefon" value={formData.telefon || ''} onChange={handleChange} disabled={loading} className={inputStyle} />
                        <Input label="Adresă" name="adresa" value={formData.adresa || ''} onChange={handleChange} disabled={loading} className={inputStyle} />
                    </FormSection>

                    {!initialData.id && (
                        <FormSection title="Detalii Cont Acces (Opțional)">
                            <p className="text-xs text-slate-400 col-span-full -mt-1">La salvare, se va crea automat un cont de acces cu email și parolă generate. Username-ul va fi generat automat (ex: nume.prenume).</p>
                            <Input label="Email (Login)" name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled={loading} required={!initialData.id} error={errors.email} className={inputStyle} />
                            <Input 
                                label="Username (Auto-generat)" 
                                name="username" 
                                value={formData.username || '(generat automat)'} 
                                onChange={handleChange} 
                                disabled={true} 
                                className={`${inputStyle} opacity-60 cursor-not-allowed`} 
                            />
                            <Input label="Parolă" name="parola" value={formData.parola || ''} onChange={handleChange} disabled={loading} required error={errors.parola} className={inputStyle} />
                        </FormSection>
                    )}
                </div>
            )}

            {activeTab === 'club' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Club & Antrenament">
                        <Input label="Data Înscrierii" name="data_inscrierii" type="date" value={formData.data_inscrierii?.split('T')[0] || ''} onChange={handleChange} disabled={loading} className={inputStyle} />
                        {isSuperAdmin && (
                            <Select label="Club" name="club_id" value={formData.club_id || ''} onChange={handleChange} disabled={loading} className={inputStyle}>
                                <option value="">Nespecificat</option>
                                {clubs.map(c => <option key={c.id} value={c.id}>{c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}</option>)}
                            </Select>
                        )}
                        <Select label="Grad Inițial/Actual" name="grad_actual_id" value={formData.grad_actual_id || ''} onChange={handleChange} disabled={loading} className={inputStyle}>
                            <option value="">Începător (fără grad)</option>
                            {grade.sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                        </Select>
                        <div className="flex gap-1 items-end">
                            <Select label="Grupă" name="grupa_id" value={formData.grupa_id || ''} onChange={handleChange} disabled={loading} className={`${inputStyle} flex-grow`}>
                                <option value="">Fără grupă</option>
                                {grupe.filter(g => !formData.club_id || g.club_id === formData.club_id).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="sm" onClick={onQuickAddGrupa} className="h-12 w-12"><PlusIcon className="w-5 h-5"/></Button>
                        </div>
                        <div className="flex gap-1 items-end">
                            <Select label="Familie" name="familie_id" value={formData.familie_id || ''} onChange={handleChange} disabled={loading} className={`${inputStyle} flex-grow`}>
                                <option value="">Individual</option>
                                {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="sm" onClick={onQuickAddFamilie} className="h-12 w-12"><PlusIcon className="w-5 h-5"/></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Status" name="status" value={formData.status || 'Activ'} onChange={handleChange} disabled={loading} className={inputStyle}>
                                <option value="Activ">Activ</option>
                                <option value="Inactiv">Inactiv</option>
                            </Select>
                            <div className="pt-5">
                                <Switch label="Participă la antrenamentele din vacanță" name="participa_vacanta" checked={formData.participa_vacanta || false} onChange={handleChange} />
                            </div>
                        </div>
                    </FormSection>
                </div>
            )}
        </div>
    );
};

export const SportivFormModal: React.FC<{
    isOpen: boolean;
    onClose: (savedSportiv?: Sportiv) => void;
    onSave: (formData: Partial<Sportiv>) => Promise<{ success: boolean; error?: any; data?: Sportiv }>;
    sportivToEdit: Partial<Sportiv> | null;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    grade: Grad[];
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    tipuriAbonament: TipAbonament[];
    clubs: Club[];
    currentUser: User | null;
}> = ({ 
  isOpen, onClose, onSave, sportivToEdit, grupe, setGrupe, grade, familii, setFamilii, tipuriAbonament, clubs, currentUser
}) => {
    const { showError } = useError();
    const [loading, setLoading] = useState(false);
    const { formData, setFormData, errors, validate, handleChange } = useSportivForm(initialFormState);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (sportivToEdit) {
                setFormData(sportivToEdit);
                setIsFormValid(true); 
            } else {
                const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
                const defaultClubId = !isSuperAdmin && currentUser?.club_id ? currentUser.club_id : null;
                
                let defaultGradeId = null;
                if (grade.length > 0) {
                    const debutantGrade = grade.find(g => g.ordine === 1 || g.nume === 'Debutant');
                    if (debutantGrade) defaultGradeId = debutantGrade.id;
                }

                setFormData({
                    ...initialFormState,
                    club_id: defaultClubId || undefined,
                    grad_actual_id: defaultGradeId || undefined
                });
                setIsFormValid(false);
            }
        }
    }, [isOpen, sportivToEdit, currentUser, grade, setFormData]);
    
    const handleFormChange = useCallback((data: Partial<Sportiv>, isValid: boolean) => {
        setFormData(data);
        setIsFormValid(isValid);
    }, [setFormData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
        
        if (!isSuperAdmin && formData.club_id && formData.club_id !== currentUser?.club_id) {
            showError("Eroare de Securitate", "Tentativă de modificare neautorizată! Nu aveți drepturi de administrare pentru clubul selectat.");
            return;
        }

        if (!isFormValid) {
            showError("Formular Invalid", "Vă rugăm corectați erorile înainte de a salva.");
            return;
        }

        setLoading(true);
        try {
            const result = await onSave(formData);
            if (result.success) {
                onClose(result.data);
            } 
            // If result.error exists, onSave (parent) has already shown the error via showError, 
            // so we don't need to do anything here except stop loading.
        } catch (err: any) {
            showError("Eroare", err.message || "A apărut o eroare neașteptată.");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddGrupa = async (nume: string) => {
        const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
        const { data, error } = await supabase.from('grupe').insert({ 
            denumire: nume, 
            sala: 'N/A', 
            club_id: isSuperAdmin ? null : currentUser?.club_id 
        }).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Grupa a fost creată, dar nu a putut fi recuperată. Verificați permisiunile.");
        setGrupe(prev => [...prev, { ...data, program: [] }]);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={() => onClose()} title={sportivToEdit ? "Editează Sportiv" : "Adaugă Sportiv"} persistent>
                <form onSubmit={handleSubmit}>
                    <SportivFormFields
                        initialData={formData}
                        onFormChange={handleFormChange}
                        loading={loading}
                        grupe={grupe}
                        grade={grade}
                        familii={familii}
                        tipuriAbonament={tipuriAbonament}
                        clubs={clubs}
                        currentUser={currentUser}
                        onQuickAddGrupa={() => setIsGrupaModalOpen(true)}
                        onQuickAddFamilie={() => setIsFamilieModalOpen(true)}
                    />
                    <div className="flex justify-end pt-4 mt-4 gap-2 border-t border-slate-700">
                        <Button type="button" variant="secondary" onClick={() => onClose()} disabled={loading}>Închide</Button>
                        <Button
                            type="submit"
                            variant={sportivToEdit ? 'success' : 'primary'}
                            isLoading={loading}
                            disabled={!isFormValid || loading}
                        >
                            {sportivToEdit ? 'Salvează Modificările' : 'Adaugă Practicant'}
                        </Button>
                    </div>
                </form>
            </Modal>
            <QuickAddModal title="Adaugă Grupă" label="Nume Grupă" isOpen={isGrupaModalOpen} onClose={() => setIsGrupaModalOpen(false)} onSave={handleQuickAddGrupa} />
            <QuickAddModal title="Adaugă Familie" label="Nume Familie" isOpen={isFamilieModalOpen} onClose={() => setIsFamilieModalOpen(false)} onSave={async (n) => {
                const { data, error } = await supabase.from('familii').insert({ nume: n }).select().maybeSingle();
                if (error) throw error;
                if (!data) throw new Error("Familia a fost creată, dar nu a putut fi recuperată. Verificați permisiunile.");
                setFamilii(prev => [...prev, data]);
            }} />
        </>
    );
};
