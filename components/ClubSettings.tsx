import React from 'react';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';

export const ClubSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard</Button>
            <Card>
                <h1 className="text-2xl font-bold text-white mb-4">Configurare Federație</h1>
                <p className="text-slate-400">Această secțiune este în curs de dezvoltare și va permite configurarea datelor generale ale federației.</p>
            </Card>
        </div>
    );
};
