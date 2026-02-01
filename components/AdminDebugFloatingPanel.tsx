import React, { useState } from 'react';
import { User, Rol, View } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Button } from './ui';
import { ShieldCheckIcon } from './icons';

const AUTHORIZED_EMAILS = ['admin@phihau.ro', 'alin2u83@gmail.com'];

interface AdminDebugFloatingPanelProps {
    currentUser: User | null;
    onNavigate: (view: View) => void;
}

export const AdminDebugFloatingPanel: React.FC<AdminDebugFloatingPanelProps> = ({ currentUser, onNavigate }) => {
    const [loadingRole, setLoadingRole] = useState<Rol['nume'] | null>(null);
    const { showError, showSuccess } = useError();

    if (!currentUser || !AUTHORIZED_EMAILS.includes(currentUser.email || '')) {
        return null;
    }

    const handleSwitch = async (roleName: Rol['nume']) => {
        if (!supabase) {
            showError("Eroare", "Clientul Supabase nu a putut fi stabilit.");
            return;
        }

        setLoadingRole(roleName);

        // This updates the user's metadata directly. This will be reflected in the JWT on the next refresh.
        const { error } = await supabase.auth.updateUser({ data: { active_role: roleName } });

        if (error) {
            showError("Eroare la comutarea rolului", error.message);
            setLoadingRole(null);
        } else {
            showSuccess("Context Schimbat", `Trecere la modul ${roleName}. Pagina se va reîncărca...`);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-amber-500/50 shadow-2xl space-y-2">
            <div className="flex items-center gap-2 px-1 pb-2 border-b border-amber-500/30">
                <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-amber-400">DEV PANEL</h4>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSwitch('SUPER_ADMIN_FEDERATIE')}
                    isLoading={loadingRole === 'SUPER_ADMIN_FEDERATIE'}
                    disabled={!!loadingRole}
                >
                    Set: Fed
                </Button>
                 <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSwitch('Admin Club')}
                    isLoading={loadingRole === 'Admin Club'}
                    disabled={!!loadingRole}
                >
                    Set: Club
                </Button>
                 <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSwitch('Sportiv')}
                    isLoading={loadingRole === 'Sportiv'}
                    disabled={!!loadingRole}
                >
                    Set: Sportiv
                </Button>
                 <Button
                    size="sm"
                    variant="warning"
                    onClick={() => onNavigate('backdoor-check')}
                    disabled={!!loadingRole}
                >
                    RLS Check
                </Button>
                 <Button
                    size="sm"
                    variant="warning"
                    onClick={() => onNavigate('backdoor-test')}
                    disabled={!!loadingRole}
                >
                    RLS Test
                </Button>
            </div>
        </div>
    );
};
