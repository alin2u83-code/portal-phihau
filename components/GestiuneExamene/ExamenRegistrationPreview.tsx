import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Card, Modal } from '../ui';
import { useError } from '../ErrorProvider';
import { useExamenRegistration } from '../../hooks/useExamenRegistration';

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
            // VerificÄƒ mai Ã®ntÃ¢i dacÄƒ plata existÄƒ deja pentru aceastÄƒ sesiune
            const { data: existing } = await supabase
                .from('plati')
                .select('id')
                .eq('sportiv_id', sportiv_id)
                .eq('sesiune_id', sesiune_id)
                .eq('tip', 'Taxa Examen')
                .maybeSingle();

            if (existing?.id) {
                // Plata existÄƒ deja â€” actualizeazÄƒ dacÄƒ suma diferÄƒ
                const { error: updateError } = await supabase
                    .from('plati')
                    .update({
                        suma: data.taxa_suma,
                        status: isCash ? 'Achitat' : 'Neachitat',
                    })
                    .eq('id', existing.id);
                if (updateError) throw updateError;
            } else {
                // Plata nu existÄƒ â€” insereazÄƒ cu sesiune_id pentru unicitate
                const { data: sportivData } = await supabase
                    .from('sportivi')
                    .select('club_id')
                    .eq('id', sportiv_id)
                    .single();

                const { error: insertError } = await supabase.from('plati').insert({
                    sportiv_id,
                    sesiune_id,
                    suma: data.taxa_suma,
                    status: isCash ? 'Achitat' : 'Neachitat',
                    descriere: `TaxÄƒ examen - Grad: ${data.grad_sugerat_nume}`,
                    data: new Date().toISOString().split('T')[0],
                    tip: 'Taxa Examen',
                    observatii: 'Generat din ExamenRegistrationPreview',
                    club_id: sportivData?.club_id ?? null,
                });
                if (insertError) throw insertError;
            }

            showSuccess("Succes", "ÃŽnregistrarea la examen a fost salvatÄƒ.");
            onConfirm();
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare", err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Se Ã®ncarcÄƒ...</div>;
    if (error) return <div>Eroare: {error}</div>;
    if (!data) return <div>Nu existÄƒ detalii de Ã®nregistrare pentru acest sportiv.</div>;

    return (
        <Modal isOpen={true} onClose={onClose} title="Previzualizare ÃŽnregistrare Examen">
            <div className="space-y-4">
                <Card className="bg-slate-800 p-4">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Grad nou:</span>
                        <span className="font-bold text-white">{data.grad_sugerat_nume}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">SumÄƒ de platÄƒ:</span>
                        <span className="font-bold text-white">{data.taxa_suma} RON</span>
                    </div>
                    {data.is_debtor && (
                        <div className="text-red-400 text-sm mt-2">AtenÈ›ie: Sportivul are restanÈ›e!</div>
                    )}
                </Card>

                <label className="flex items-center gap-2 text-white">
                    <input 
                        type="checkbox" 
                        checked={isCash} 
                        onChange={(e) => setIsCash(e.target.checked)} 
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600"
                    />
                    PlatÄƒ Cash efectuatÄƒ pe loc
                </label>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>AnuleazÄƒ</Button>
                    <Button variant="success" onClick={handleConfirm} isLoading={submitting}>ConfirmÄƒ ÃŽnregistrarea</Button>
                </div>
            </div>
        </Modal>
    );
};

