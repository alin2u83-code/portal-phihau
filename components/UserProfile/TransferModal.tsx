import React, { useState } from 'react';
import { Sportiv, Club } from '../../types';
import { Modal, Select, Button } from '../ui';
import { CheckCircleIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';

export interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv;
    clubs: Club[];
    onTransferComplete: (updatedSportiv: Sportiv) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransferComplete, sportiv, clubs }) => {
    const [newClubId, setNewClubId] = useState('');
    const [loading, setLoading] = useState(false);
    const [transferSuccess, setTransferSuccess] = useState(false);
    const { showError, showSuccess } = useError();
    
    const availableClubs = clubs.filter(c => c.id !== sportiv.club_id);

    const handleTransfer = async () => {
        if (!newClubId) {
            showError("Validare", "Vă rugăm selectați noul club.");
            return;
        }

        setLoading(true);
        try {
            const { error: rpcError } = await supabase.rpc('transfer_sportiv', {
                p_sportiv_id: sportiv.id,
                p_new_club_id: newClubId,
                p_old_club_id: sportiv.club_id
            });
            if (rpcError) throw rpcError;

            const { data: updatedSportiv, error: fetchError } = await supabase
                .from('sportivi')
                .select('*, roluri(id, nume)')
                .eq('id', sportiv.id)
                .maybeSingle();
            if (fetchError) throw fetchError;
            if (!updatedSportiv) throw new Error("Nu s-a putut recupera profilul după transfer. Verificați permisiunile.");

            showSuccess("Transfer Finalizat", `${sportiv.nume} ${sportiv.prenume} a fost mutat la noul club.`);
            setTransferSuccess(true);
            
            setTimeout(() => {
                onTransferComplete(updatedSportiv as Sportiv);
            }, 2000);

        } catch (err: any) {
            showError("Eroare la Transfer", err.message);
        }
    };
    
    const handleClose = () => {
        if (loading || transferSuccess) return;
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={transferSuccess ? "Transfer Realizat" : `Transfer Sportiv: ${sportiv.nume}`}
            persistent={loading || transferSuccess}
        >
            {transferSuccess ? (
                <div className="text-center py-8 flex flex-col items-center gap-4 animate-fade-in-down">
                    <CheckCircleIcon className="w-16 h-16 text-green-500" />
                    <h3 className="text-xl font-bold text-white">Succes!</h3>
                    <p className="text-slate-300">
                        {sportiv.nume} {sportiv.prenume} a fost transferat. Fereastra se va închide automat.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p>Selectați noul club pentru <strong>{sportiv.nume} {sportiv.prenume}</strong>.</p>
                    <Select
                        label="Club Destinație"
                        value={newClubId}
                        onChange={e => setNewClubId(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Alege un club...</option>
                        {(availableClubs || []).map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                    </Select>
                    <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>Anulează</Button>
                        <Button variant="primary" onClick={handleTransfer} isLoading={loading}>Confirmă Transfer</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
