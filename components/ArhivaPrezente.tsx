import React from 'react';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';

interface ArhivaPrezenteProps {
    onBack: () => void;
}

export const ArhivaPrezente: React.FC<ArhivaPrezenteProps> = ({ onBack }) => {
    return (
        <div>
            <Card>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-4">Arhivă Prezențe</h1>
                <p className="text-slate-400">Acest modul este în curs de dezvoltare și va permite vizualizarea și raportarea pe baza istoricului de prezențe.</p>
            </Card>
        </div>
    );
};