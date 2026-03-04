import React from 'react';
import { Sportiv } from '../../types';
import { Card, Button } from '../ui';
import { TransferIcon } from '../icons';
import { DataField } from './DataField';

interface ContactTabProps {
    sportiv: Sportiv;
    isSuperAdmin: boolean;
    setIsTransferModalOpen: (val: boolean) => void;
}

export const ContactTab: React.FC<ContactTabProps> = ({
    sportiv,
    isSuperAdmin,
    setIsTransferModalOpen
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Informații Personale</h3>
                <dl className="space-y-4 divide-y divide-slate-700">
                    <div className="pt-2"><DataField label="CNP" value={sportiv.cnp} /></div>
                    <div className="pt-2"><DataField label="Data Nașterii" value={new Date(sportiv.data_nasterii).toLocaleDateString('ro-RO')} /></div>
                    <div className="pt-2"><DataField label="Gen" value={sportiv.gen || 'Nespecificat'} /></div>
                    <div className="pt-2"><DataField label="Înălțime" value={sportiv.inaltime ? `${sportiv.inaltime} cm` : 'Nespecificat'} /></div>
                </dl>
            </Card>
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Contact & Adresă</h3>
                <dl className="space-y-4 divide-y divide-slate-700">
                    <div className="pt-2"><DataField label="Email" value={sportiv.email} /></div>
                    <div className="pt-2"><DataField label="Telefon" value={sportiv.telefon} /></div>
                    <div className="pt-2"><DataField label="Adresă" value={sportiv.adresa} /></div>
                    <div className="pt-2"><DataField label="Club" value={sportiv.cluburi?.nume} /></div>
                </dl>
                {isSuperAdmin && (
                    <div className="mt-6 pt-4 border-t border-slate-700">
                        <Button onClick={() => setIsTransferModalOpen(true)} variant="secondary" className="w-full">
                            <TransferIcon className="w-4 h-4 mr-2"/> Transferă la alt Club
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};
