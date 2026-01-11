import React, { useState, useEffect } from 'react';
import { Sportiv } from '../types';
import { Button, Modal, Input } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportivToEdit: Sportiv | null;
    fieldsToEdit: Array<keyof Sportiv>;
    onSaveSuccess: (updatedSportiv: Sportiv) => void;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({
    isOpen,
    onClose,
    sportivToEdit,
    fieldsToEdit,
    onSaveSuccess
}) => {
    const [formData, setFormData] = useState<Partial<Sportiv>>({});
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    useEffect(() => {
        if (sportivToEdit) {
            const initialData: Partial<Sportiv> = {};
            fieldsToEdit.forEach(field => {
                initialData[field as keyof Sportiv] = sportivToEdit[field as keyof Sportiv];
            });
            setFormData(initialData);
        }
    }, [isOpen, sportivToEdit, fieldsToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const getFieldLabel = (field: keyof Sportiv): string => {
        const labels: Record<string, string> = {
            data_nasterii: 'Data Nașterii',
            cnp: 'CNP',
            email: 'Email',
            inaltime: 'Înălțime (cm)'
        };
        return labels[field as string] || (field as string).toString();
    };

    const getFieldType = (field: keyof Sportiv): string => {
        const types: Record<string, string> = {
            data_nasterii: 'date',
            inaltime: 'number',
            email: 'email'
        };
        return types[field as string] || 'text';
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !sportivToEdit) return;

        setLoading(true);
        const { error, data } = await supabase
            .from('sportivi')
            .update(formData)
            .eq('id', sportivToEdit.id)
            .select('*, sportivi_roluri(roluri(id, nume))')
            .single();
        
        setLoading(false);

        if (error) {
            showError("Eroare la salvare", error);
        } else if (data) {
            const updatedUser = data as any;
            updatedUser.roluri = updatedUser.sportivi_roluri.map((item: any) => item.roluri);
            delete updatedUser.sportivi_roluri;

            onSaveSuccess(updatedUser as Sportiv);
            onClose();
        }
    };

    if (!sportivToEdit) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Completează Date pentru ${sportivToEdit.nume}`}>
            <form onSubmit={handleSave} className="space-y-4">
                <p className="text-sm text-slate-400">Anumite acțiuni necesită completarea următoarelor date:</p>
                {fieldsToEdit.map(field => (
                    <Input
                        key={field as string}
                        label={getFieldLabel(field)}
                        name={field as string}
                        type={getFieldType(field)}
                        value={formData[field as keyof Sportiv] as any || ''}
                        onChange={handleChange}
                        required
                    />
                ))}

                <div className="flex justify-end pt-4 space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>
                        {loading ? 'Se salvează...' : 'Salvează și Continuă'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
