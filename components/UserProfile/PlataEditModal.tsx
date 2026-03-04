import React, { useState, useEffect } from 'react';
import { Plata } from '../../types';
import { Modal, Input, Select, Button } from '../ui';

export interface PlataEditModalProps {
    plata: Plata | null;
    onClose: () => void;
    onSave: (plata: Plata) => Promise<void>;
    isLoading: boolean;
}

export const PlataEditModal: React.FC<PlataEditModalProps> = ({ plata, onClose, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Plata | null>(plata);

    useEffect(() => {
        setFormData(plata);
    }, [plata]);

    if (!formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: name === 'suma' ? parseFloat(value) || 0 : value } : null);
    };

    const handleSaveClick = async () => {
        if (formData) {
            await onSave(formData);
        }
    };

    return (
        <Modal isOpen={!!plata} onClose={onClose} title="Editează Factură">
            <div className="space-y-4">
                <Input label="Descriere" name="descriere" value={formData.descriere} onChange={handleChange} />
                <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formData.suma} onChange={handleChange} />
                <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                    <option value="Neachitat">Neachitat</option>
                    <option value="Achitat Parțial">Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                </Select>
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Anulează</Button>
                    <Button variant="success" onClick={handleSaveClick} isLoading={isLoading}>Salvează</Button>
                </div>
            </div>
        </Modal>
    );
}
