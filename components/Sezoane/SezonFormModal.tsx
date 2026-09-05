import React, { useState } from 'react';
import { Sezon } from '../../types';
import { Button, Input, Modal, Switch } from '../ui';

interface SezonFormModalProps {
    mode: 'add' | 'edit';
    item: Sezon | null;
    isFirstSezon: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSave: (values: { denumire: string; data_start: string; data_final: string; activ: boolean }) => Promise<void>;
}

export const SezonFormModal: React.FC<SezonFormModalProps> = ({ mode, item, isFirstSezon, isSaving, onClose, onSave }) => {
    const [denumire, setDenumire] = useState(item?.denumire ?? '');
    const [dataStart, setDataStart] = useState(item?.data_start ?? '');
    const [dataFinal, setDataFinal] = useState(item?.data_final ?? '');
    const [dateError, setDateError] = useState('');
    const [activeazaAcum, setActiveazaAcum] = useState(
        mode === 'edit' ? (item?.activ ?? false) : isFirstSezon
    );

    const handleSave = async () => {
        if (!denumire.trim()) return;
        if (!dataStart || !dataFinal) return;
        if (dataFinal < dataStart) {
            setDateError('Data de sfârșit trebuie să fie după data de start.');
            return;
        }
        setDateError('');
        await onSave({ denumire: denumire.trim(), data_start: dataStart, data_final: dataFinal, activ: activeazaAcum });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={mode === 'add' ? 'Adaugă Sezon' : 'Editează Sezon'}
        >
            <div className="space-y-4">
                <Input
                    label="Denumire *"
                    value={denumire}
                    onChange={e => setDenumire(e.target.value)}
                    placeholder="ex: Sezon 2026-2027"
                />
                <Input
                    label="Data Start *"
                    type="date"
                    value={dataStart}
                    onChange={e => setDataStart(e.target.value)}
                />
                <Input
                    label="Data Final *"
                    type="date"
                    value={dataFinal}
                    onChange={e => setDataFinal(e.target.value)}
                    error={dateError || undefined}
                />
                <Switch
                    label="Activează acest sezon acum"
                    name="activ"
                    checked={activeazaAcum}
                    onChange={e => setActiveazaAcum(e.target.checked)}
                />
                <p className="text-xs text-[var(--t-text-muted)]">
                    Sezonul activ determină ce grupe per-sezon și ce tipuri de abonament sunt considerate curente.
                </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                    Anulează
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    disabled={!denumire.trim() || !dataStart || !dataFinal}
                >
                    Salvează
                </Button>
            </div>
        </Modal>
    );
};
