import React from 'react';
import { Card, Button } from './ui';
import { ExclamationTriangleIcon, ArrowLeftIcon } from './icons';

interface AccessDeniedProps {
    onBack: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ onBack }) => {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="max-w-md text-center border-l-4 border-red-500">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-900/50">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mt-4">Acces Interzis (403)</h1>
                <p className="text-slate-300 mt-2">
                    Nu aveți permisiunile necesare pentru a accesa această pagină. Vă rugăm contactați un administrator dacă credeți că aceasta este o eroare.
                </p>
                <Button onClick={onBack} variant="secondary" className="mt-6">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard
                </Button>
            </Card>
        </div>
    );
};

export default AccessDenied;