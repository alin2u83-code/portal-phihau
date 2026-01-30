import React from 'react';
import { Rol, View } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, UsersIcon, UserCircleIcon } from './icons';

interface AdminConsoleProps {
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    onBack: () => void;
}

const RoleCard: React.FC<{
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
    isLoading: boolean;
    disabled: boolean;
}> = ({ title, description, icon: Icon, onClick, isLoading, disabled }) => (
    <Card className="flex flex-col items-center justify-center text-center p-8 transition-all duration-300 hover:border-brand-secondary/50 hover:shadow-glow-blue">
        <Icon className="w-16 h-16 text-brand-secondary mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6 flex-grow">{description}</p>
        <Button 
            variant="primary" 
            className="w-full"
            onClick={onClick}
            isLoading={isLoading}
            disabled={disabled}
        >
            Activează Modul
        </Button>
    </Card>
);

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <RoleCard 
                    title="Federație"
                    description="Simulează un SUPER_ADMIN_FEDERATIE cu vizibilitate globală peste toate cluburile."
                    icon={ShieldCheckIcon}
                    onClick={() => onSwitchRole('SUPER_ADMIN_FEDERATIE')}
                    isLoading={isSwitchingRole}
                    disabled={isSwitchingRole}
                />
                <RoleCard 
                    title="Admin Club"
                    description="Simulează un Admin Club cu vizibilitate limitată la propriul club."
                    icon={UsersIcon}
                    onClick={() => onSwitchRole('Admin Club')}
                    isLoading={isSwitchingRole}
                    disabled={isSwitchingRole}
                />
                <RoleCard 
                    title="Sportiv"
                    description="Simulează un utilizator standard (Sportiv) cu acces doar la portalul personal."
                    icon={UserCircleIcon}
                    onClick={() => onSwitchRole('Sportiv')}
                    isLoading={isSwitchingRole}
                    disabled={isSwitchingRole}
                />
            </div>
        </div>
    );
};