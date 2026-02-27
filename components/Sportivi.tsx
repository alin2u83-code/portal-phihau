import React, { useState, useCallback, useEffect, useMemo, useReducer } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament, Club, User, Grad } from '../types';
import { Button, Modal, Input, Select, FormSection, Switch } from './ui';
import { PlusIcon, ExclamationTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { BirthDateInput } from './BirthDateInput';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

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
    const [formData, dispatch] = useReducer(formReducer, initialData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
      // Dacă este un sportiv nou (nu are ID) și nu are grad selectat
      if (!formData.id && !formData.grad_actual_id && grade.length > 0) {
        const debutantGrade = grade.find(g => g.ordine === 1 || g.nume === 'Debutant');
        if (debutantGrade) {
          dispatch({ type: 'SET_FIELD', field: 'grad_actual_id', value: debutantGrade.id });
        }
      }
    }, [grade, formData.id, formData.grad_actual_id]);
    
    const isSuperAdmin = useMemo(() => 
        currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN'), 
        [currentUser]
    );

    const validate = useCallback((data: Partial<Sportiv>) => {
        const newErrors: Record<string, string> = {};
        if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
        if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
        if (!data.data_nasterii) newErrors.data_nasterii = "Data nașterii este obligatorie.";
        if (!initialData.id && data.parola && data.parola.length < 6) newErrors.parola = "Parola trebuie să aibă minim 6 caractere.";
        return newErrors;
    }, [initialData.id]);

    useEffect(() => {
        let data = { ...initialData };
        if (!isSuperAdmin && !data.club_id) {
            data.club_id = currentUser?.club_id;
        }
        dispatch({ type: 'RESET', payload: data });
        const initialErrors = validate(data);
        setErrors(initialErrors);
        onFormChange(data, Object.keys(initialErrors).length === 0);
    }, [initialData, onFormChange, validate, isSuperAdmin, currentUser]);

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

        updatedData[name as keyof Sportiv] = finalValue;
        
        if (name === 'club_id') {
            const currentGroup = grupe.find(g => g.id === updatedData.grupa_id);
            if (currentGroup && currentGroup.club_id !== finalValue) {
                updatedData.grupa_id = null;
            }
        }
        
        if (!initialData.id && (name === 'nume' || name === 'prenume')) {
            const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            const nume = sanitize(name === 'nume' ? value : updatedData.nume || '');
            const prenume = sanitize(name === 'prenume' ? value : updatedData.prenume || '');
            
            if (nume && prenume) {
                const targetClubId = updatedData.club_id || currentUser?.club_id;
                const club = clubs.find(c => c.id === targetClubId);
                const domain = club ? club.nume.toLowerCase().replace(/[^a-z0-9]/g, '') + '.ro' : 'phihau.ro';
                updatedData.email = `${nume}.${prenume}@${domain}`;
                updatedData.parola = `${nume}.1234!`;
            }
        }

        dispatch({ type: 'SET_FORM_DATA', payload: updatedData });
        const newErrors = validate(updatedData);
        setErrors(newErrors);
        onFormChange(updatedData, Object.keys(newErrors).length === 0);
    };
    
    const inputStyle = "!text-lg !py-2.5 h-12";

    return (
        <div className="space-y-4">
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

            <FormSection title="Date Contact & Acces">
                 <Input label="Telefon" name="telefon" value={formData.telefon || ''} onChange={handleChange} disabled={loading} className={inputStyle} />
                 <Input label="Adresă" name="adresa" value={formData.adresa || ''} onChange={handleChange} disabled={loading} className={inputStyle} />
                 <Input label="Email (Login)" name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled={loading} required={!initialData.id} error={errors.email} className={inputStyle} />
            </FormSection>

            {!initialData.id && (
                <FormSection title="Detalii Cont Acces (Opțional)">
                    <p className="text-xs text-slate-400 col-span-full -mt-1">La salvare, se va crea automat un cont de acces cu email și parolă generate. Puteți edita detaliile mai sus.</p>
                    <Input label="Username (Opțional)" name="username" value={formData.username || ''} onChange={handleChange} disabled={loading} placeholder="ex: ion.popescu" className={inputStyle} />
                    <Input label="Parolă" name="parola" value={formData.parola || ''} onChange={handleChange} disabled={loading} required error={errors.parola} className={inputStyle} />
                </FormSection>
            )}

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
    const [formData, setFormData] = useState<Partial<Sportiv>>(initialFormState);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);
    const [criticalPermissionError, setCriticalPermissionError] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(sportivToEdit || initialFormState);
            setCriticalPermissionError(null);
            setErrorMessage(null);
        }
    }, [isOpen, sportivToEdit]);
    
    const handleFormChange = useCallback((data: Partial<Sportiv>, isValid: boolean) => {
        setFormData(data);
        setIsFormValid(isValid);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCriticalPermissionError(null);
        setErrorMessage(null);

        const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
        
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
            const result = await onSave(formData);
            if (result.success) {
                onClose(result.data);
            } else if (result.error) {
                setErrorMessage(result.error.message || "A apărut o eroare la salvare.");
            }
        } catch (err: any) {
            console.error('DEBUG:', err);
            setErrorMessage(err.message || "A apărut o eroare neașteptată.");
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
                {criticalPermissionError ? (
                    <div className="p-6 rounded-lg bg-[var(--bg-card)] border-2 border-red-500 text-center animate-fade-in-down">
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-400 mb-2">Eroare de Securitate</h3>
                        <p className="text-slate-300 mb-6">{criticalPermissionError}</p>
                        <Button variant="danger" onClick={() => setCriticalPermissionError(null)} className="w-full">
                            Am înțeles, reîncearcă
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {errorMessage && (
                            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-md flex items-start justify-between gap-3 animate-fade-in-down">
                                <div className="flex items-start gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(errorMessage);
                                    }}
                                    className="text-[10px] uppercase font-bold bg-red-500/20 hover:bg-red-500/40 px-2 py-1 rounded text-red-200 transition-colors shrink-0"
                                >
                                    Copiază
                                </button>
                            </div>
                        )}
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
                )}
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
