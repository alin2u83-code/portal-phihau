import React from 'react';
import { Rol, View } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { IdentitySwitcher } from './IdentitySwitcher';

interface AdminConsoleProps {
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    onBack: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onSwitchRole, isSwitchingRole, onBack }) => {
    return (
        <div className="space-y-8 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard
            </Button>
            
            <header className="text-center">
                <h1 className="text-4xl font-black text-white">Consola de Administrare</h1>
                <p className="text-slate-400 mt-2">Comută rapid între contexte de rol pentru testare.</p>
            </header>

            <IdentitySwitcher onSwitchRole={onSwitchRole} isSwitchingRole={isSwitchingRole} />
        </div>
    );
};
