import React, { useState } from 'react';
import { User, Rol, View } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Button } from './ui';
import { ShieldCheckIcon } from './icons';

const AUTHORIZED_EMAILS = ['admin@phihau.ro', 'alin2u83@gmail.com'];

interface AdminDebugFloatingPanelProps {
    currentUser: User | null;
    userRoles: any[];
    onNavigate: (view: View) => void;
}

export const AdminDebugFloatingPanel: React.FC<AdminDebugFloatingPanelProps> = ({ currentUser, userRoles, onNavigate }) => {
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

        const normalize = (str: string) => str.toUpperCase().replace(/ /g, '_');
        const targetRoleNameNormalized = normalize(roleName);
        
        const targetContext = userRoles.find(r => normalize(r.rol_denumire) === targetRoleNameNormalized);

        if (!targetContext) {
            showError("Impersonare Eșuată", `Nu aveți un context de rol "${roleName}" pentru a comuta. Adăugați rolul în User Management.`);
            setLoadingRole(null);
            return;
        }

        const { error } = await supabase.rpc('set_primary_context', {
            p_sportiv_id: targetContext.sportiv_id,
            p_rol_denumire: targetContext.rol_denumire
        });

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
                    // FIX: Corrected role name to match type definition.
                    onClick={() => handleSwitch('ADMIN_CLUB')}
                    // FIX: Corrected role name to match type definition.
                    isLoading={loadingRole === 'ADMIN_CLUB'}
                    disabled={!!loadingRole}
                >
                    Set: Club
                </Button>
                 <Button
                    size="sm"
                    variant="secondary"
                    // FIX: Corrected role name to match type definition.
                    onClick={() => handleSwitch('SPORTIV')}
                    // FIX: Corrected role name to match type definition.
                    isLoading={loadingRole === 'SPORTIV'}
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