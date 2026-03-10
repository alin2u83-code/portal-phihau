import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Modal } from './ui';
import { useError } from './ErrorProvider';
import { useExamenRegistration } from '../hooks/useExamenRegistration';

interface ExamenRegistrationPreviewProps {
    sportiv_id: string;
    sesiune_id: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const ExamenRegistrationPreview: React.FC<ExamenRegistrationPreviewProps> = ({ sportiv_id, sesiune_id, onConfirm, onClose }) => {
    const { data, loading, error } = useExamenRegistration(sportiv_id);
    const [isCash, setIsCash] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { showError, showSuccess } = useError();

    const handleConfirm = async () => {
        if (!data) return;
        setSubmitting(true);
        
        try {
            const { error: insertError } = await supabase.from('plati').insert({
                sportiv_id,
                suma: data.taxa_suma,
                status: isCash ? 'Achitat' : 'Restanta',
                metoda_plata: isCash ? 'Cash' : null,
                descriere: `Taxă examen - Grad: ${data.grad_sugerat_nume} (Sesiune ID: ${sesiune_id})`,
                data_platii: isCash ? new Date().toISOString().split('T')[0] : null,
                club_id: (await supabase.from('sportivi').select('club_id').eq('id', sportiv_id).single()).data?.club_id
            });

            if (insertError) throw insertError;

            showSuccess("Succes", "Înregistrarea la examen a fost salvată.");
            onConfirm();
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare", err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Se încarcă...</div>;
    if (error) return <div>Eroare: {error}</div>;
    if (!data) return <div>Nu există detalii de înregistrare pentru acest sportiv.</div>;

    return (
        <Modal isOpen={true} onClose={onClose} title="Previzualizare Înregistrare Examen">
            <div className="space-y-4">
                <Card className="bg-slate-800 p-4">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Grad nou:</span>
                        <span className="font-bold text-white">{data.grad_sugerat_nume}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Sumă de plată:</span>
                        <span className="font-bold text-white">{data.taxa_suma} RON</span>
                    </div>
                    {data.is_debtor && (
                        <div className="text-red-400 text-sm mt-2">Atenție: Sportivul are restanțe!</div>
                    )}
                </Card>

                <label className="flex items-center gap-2 text-white">
                    <input 
                        type="checkbox" 
                        checked={isCash} 
                        onChange={(e) => setIsCash(e.target.checked)} 
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600"
                    />
                    Plată Cash efectuată pe loc
                </label>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>Anulează</Button>
                    <Button variant="success" onClick={handleConfirm} isLoading={submitting}>Confirmă Înregistrarea</Button>
                </div>
            </div>
        </Modal>
    );
};
