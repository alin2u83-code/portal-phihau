import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Card, Button } from './ui';
import { User, Rol } from '../types';
import { ArrowLeftIcon } from './icons';

interface BackdoorTestProps {
    currentUser: User;
    onBack: () => void;
    activeRole: Rol['nume'];
}

// Actualizat pentru a permite accesul administratorului clubului Phi Hau
const AUTHORIZED_EMAILS = ['admin@phihau.ro', 'alin2u83@gmail.com'];

export const BackdoorTest: React.FC<BackdoorTestProps> = ({ currentUser, onBack, activeRole }) => {
    const { showError, showSuccess } = useError();
    const [loadingRole, setLoadingRole] = useState<string | null>(null);

    const handleSwitchRole = async (roleName: 'SUPER_ADMIN_FEDERATIE' | 'ADMIN_CLUB' | 'SPORTIV') => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }

        setLoadingRole(roleName);

        // This updates the user's metadata to set an 'active_role'.
        // RLS policies can then read this from the JWT to change the security context.
        const roleToSet: Rol['nume'] = roleName === 'ADMIN_CLUB' ? 'Admin Club' : roleName === 'SPORTIV' ? 'Sportiv' : 'SUPER_ADMIN_FEDERATIE';

        const { error } = await supabase.auth.updateUser({
            data: { active_role: roleToSet }
        });
        
        if (error) {
            showError("Eroare la comutarea rolului", error.message);
            setLoadingRole(null);
        } else {
            // Display confirmation message
            showSuccess("Context Schimbat", `Rolul a fost setat la ${roleName}. Pagina se va reîncărca...`);
            // Reload the page to apply new RLS policies
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    };

    if (!AUTHORIZED_EMAILS.includes(currentUser.email || '')) {
        return (
            <Card className="text-center p-8">
                <p className="text-red-400 font-bold">Acces restricționat.</p>
                <p className="text-sm text-slate-400 mt-2">Acest modul este rezervat dezvoltatorilor și administratorilor de sistem.</p>
                <Button onClick={onBack} className="mt-4">Înapoi</Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="mr-2 w-5 h-5"/> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Portal de Testare Backdoor</h1>
            <p className="text-slate-400">Acest panou permite comutarea contextului de rol pentru a testa politicile de securitate (RLS).</p>
            
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Comută Contextul Curent</h3>
                <p className="text-sm text-slate-300 mb-4">Rol activ curent: <span className="font-mono bg-slate-700 px-2 py-1 rounded">{activeRole}</span></p>
                <div className="flex flex-col md:flex-row gap-4">
                    <Button 
                        onClick={() => handleSwitchRole('SUPER_ADMIN_FEDERATIE')} 
                        isLoading={loadingRole === 'SUPER_ADMIN_FEDERATIE'} 
                        disabled={!!loadingRole}
                        className="text-lg py-6 flex-1"
                    >
                        SUPER_ADMIN_FEDERATIE
                    </Button>
                    <Button 
                        onClick={() => handleSwitchRole('ADMIN_CLUB')} 
                        isLoading={loadingRole === 'ADMIN_CLUB'} 
                        disabled={!!loadingRole}
                        className="text-lg py-6 flex-1"
                    >
                        ADMIN_CLUB
                    </Button>
                     <Button 
                        onClick={() => handleSwitchRole('SPORTIV')} 
                        isLoading={loadingRole === 'SPORTIV'} 
                        disabled={!!loadingRole}
                        className="text-lg py-6 flex-1"
                    >
                        SPORTIV
                    </Button>
                </div>
            </Card>
        </div>
    );
};