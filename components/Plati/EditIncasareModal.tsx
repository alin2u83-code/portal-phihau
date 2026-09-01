import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../ui';
import { useError } from '../ErrorProvider';
import { editeazaIncasare } from '../../services/tranzactiiService';
import { Plata, Tranzactie } from '../../types';

interface EditIncasareTarget {
    tranzactieId: string;
    plataId: string;
    suma: number;
    data_platii: string;
    metoda_plata: 'Cash' | 'Transfer Bancar';
    // suma editabilă doar când încasarea acoperă o singură factură —
    // altfel ar trebui realocată proporțional, ceea ce nu e cazul acoperit aici
    sumaEditabila: boolean;
}

interface EditIncasareModalProps {
    target: EditIncasareTarget | null;
    onClose: () => void;
    onSaved: (result: { tranzactie: Tranzactie; plata: Plata }) => void;
}

export const EditIncasareModal: React.FC<EditIncasareModalProps> = ({ target, onClose, onSaved }) => {
    const { showError, showSuccess } = useError();
    const [suma, setSuma] = useState('');
    const [data, setData] = useState('');
    const [metoda, setMetoda] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (target) {
            setSuma(target.suma.toFixed(2));
            setData(target.data_platii.slice(0, 10));
            setMetoda(target.metoda_plata);
        }
    }, [target]);

    if (!target) return null;

    const handleSave = async () => {
        const sumaNum = target.sumaEditabila ? parseFloat(suma.replace(',', '.')) : undefined;
        if (target.sumaEditabila && (isNaN(sumaNum!) || sumaNum! <= 0)) {
            showError('Sumă invalidă', 'Introduceți o sumă pozitivă.');
            return;
        }
        setLoading(true);
        try {
            const result = await editeazaIncasare(target.tranzactieId, target.plataId, {
                suma: sumaNum,
                data_platii: data,
                metoda_plata: metoda,
            });
            showSuccess('Succes', 'Încasarea a fost actualizată.');
            onSaved(result);
            onClose();
        } catch (err: any) {
            showError('Eroare la editare', err.message || err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={!!target} onClose={onClose} title="Editează Încasarea">
            <div className="space-y-4">
                <Input
                    label="Sumă (RON)"
                    type="number"
                    step="0.01"
                    value={suma}
                    onChange={e => setSuma(e.target.value)}
                    disabled={!target.sumaEditabila || loading}
                />
                {!target.sumaEditabila && (
                    <p className="text-xs text-amber-400">
                        Suma nu e editabilă — această încasare acoperă mai multe facturi. Poți modifica doar data și metoda de plată.
                    </p>
                )}
                <Input label="Data plății" type="date" value={data} onChange={e => setData(e.target.value)} disabled={loading} />
                <Select label="Metodă plată" value={metoda} onChange={e => setMetoda(e.target.value as 'Cash' | 'Transfer Bancar')} disabled={loading}>
                    <option value="Cash">Cash</option>
                    <option value="Transfer Bancar">Transfer Bancar</option>
                </Select>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={loading}>Salvează</Button>
                </div>
            </div>
        </Modal>
    );
};
