import React, { useState, useEffect, useCallback } from 'react';
import { Sportiv, Grupa, Grad, Familie, TipAbonament, Club, User, Rol } from '../../types';
import { Modal, Button } from '../ui';
import { useError } from '../ErrorProvider';
import { useSportivForm } from '../../hooks/useSportivForm';
import { useFamilyManager } from '../../hooks/useFamilyManager';
import { supabase } from '../../supabaseClient';
import { SportivFormFields } from './SportivFormFields';
import { QuickAddModal } from './QuickAddModal';

const initialFormState: Partial<Sportiv> = {
    nume: '', prenume: '', status: 'Activ', 
    data_inscrierii: new Date().toISOString().split('T')[0],
    participa_vacanta: false,
    data_nasterii: '',
    gen: null,
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
    clubFilter?: string;
    allRoles: Rol[];
}> = ({ 
  isOpen, onClose, onSave, sportivToEdit, grupe, setGrupe, grade, familii, setFamilii, tipuriAbonament, clubs, currentUser, clubFilter, allRoles
}) => {
    const { showError } = useError();
    const [loading, setLoading] = useState(false);
    const { formData, setFormData, errors, validate, handleChange } = useSportivForm(initialFormState);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isGrupaModalOpen, setIsGrupaModalOpen] = useState(false);
    const [isFamilieModalOpen, setIsFamilieModalOpen] = useState(false);

    const { handleCreateFamily } = useFamilyManager(familii, setFamilii, [], () => {});

    useEffect(() => {
        if (isOpen) {
            if (sportivToEdit) {
                setFormData(sportivToEdit);
                setIsFormValid(true); 
            } else {
                const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
                const defaultClubId = !isSuperAdmin && currentUser?.club_id ? currentUser.club_id : (clubFilter || null);
                
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
    }, [isOpen, sportivToEdit, currentUser, grade, setFormData, clubFilter]);
    
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
                        allRoles={allRoles}
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
                await handleCreateFamily(n, [], formData.club_id || currentUser?.club_id);
            }} />
        </>
    );
};
