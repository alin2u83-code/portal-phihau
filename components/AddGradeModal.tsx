import React, { useState, useEffect } from 'react';
import { Sportiv, Grad } from '../types';
import { Modal, Button, Input, Select } from './ui';
import { useError } from './ErrorProvider';

interface AddGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { grad_id: string; data_obtinere: string; observatii: string }) => Promise<void>;
    sportiv: Sportiv;
    grades: Grad[];
}

export const AddGradeModal: React.FC<AddGradeModalProps> = ({ isOpen, onClose, onSave, sportiv, grades }) => {
    const [gradId, setGradId] = useState('');
    const [dataObtinere, setDataObtinere] = useState(new Date().toISOString().split('T')[0]);
    const [observatii, setObservatii] = useState('');
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    useEffect(() => {
        if (isOpen) {
            // Resetează starea la deschidere
            setGradId('');
            setDataObtinere(new Date().toISOString().split('T')[0]);
            setObservatii('');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradId) {
            showError("Validare eșuată", "Vă rugăm selectați un grad.");
            return;
        }
        setLoading(true);
        await onSave({ grad_id: gradId, data_obtinere: dataObtinere, observatii });
        setLoading(false);
    };

    const sortedGrades = [...grades].sort((a,b) => a.ordine - b.ordine);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Adaugă Grad Manual pentru ${sportiv.nume}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Gradul Obținut"
                    value={gradId}
                    onChange={(e) => setGradId(e.target.value)}
                    required
                >
                    <option value="">Selectează un grad...</option>
                    {sortedGrades.map(g => (
                        <option key={g.id} value={g.id}>{g.nume} (ord. {g.ordine})</option>
                    ))}
                </Select>
                <Input
                    label="Data Obținerii"
                    type="date"
                    value={dataObtinere}
                    onChange={(e) => setDataObtinere(e.target.value)}
                    required
                />
                <Input
                    label="Detalii (Opțional)"
                    value={observatii}
                    onChange={(e) => setObservatii(e.target.value)}
                    placeholder="Ex: Obținut la altă federație, corecție, etc."
                />
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                        Anulează
                    </Button>
                    <Button type="submit" variant="success" isLoading={loading}>
                        Salvează Grad
                    </Button>
                </div>
            </form>
        </Modal>
    );
};