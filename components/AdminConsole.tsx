import React, { useState } from 'react';
import { Rol, User, Club, Permissions } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { IdentitySwitcher } from './IdentitySwitcher';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';

const DevRoleImpersonation: React.FC<{ userRoles: any[] }> = ({ userRoles }) => {
    const [loadingRole, setLoadingRole] = useState<Rol['nume'] | null>(null);
    const { showError, showSuccess } = useError();

    const handleImpersonate = async (roleName: Rol['nume']) => {
        if (!supabase) {
            showError("Eroare", "Clientul Supabase nu a putut fi stabilit.");
            return;
        }
        setLoadingRole(roleName);
        
        // Găsește un context care corespunde numelui rolului
        const targetContext = userRoles.find(r => r.rol_denumire === roleName);
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
            showSuccess("Context Schimbat", `Perspectiva a fost setată la ${roleName}. Pagina se va reîncărca...`);
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    };

    const rolesToImpersonate: Rol['nume'][] = ['SUPER_ADMIN_FEDERATIE', 'Admin Club', 'Sportiv'];

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-amber-400" />
                Panou DEV: Impersonare Rol
            </h3>
            <p className="text-sm text-slate-300 mb-4">
                Alege o perspectivă pentru a testa politicile RLS. Acțiunea va seta forțat contextul activ și va reîncărca aplicația.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
                {rolesToImpersonate.map(roleName => (
                    <Button
                        key={roleName}
                        onClick={() => handleImpersonate(roleName)}
                        isLoading={loadingRole === roleName}
                        disabled={!!loadingRole}
                        className="text-lg py-6 flex-1"
                        variant={roleName === 'SUPER_ADMIN_FEDERATIE' ? 'danger' : roleName === 'Admin Club' ? 'primary' : 'secondary'}
                    >
                        {roleName}
                    </Button>
                ))}
            </div>
        </Card>
    );
};


interface AdminConsoleProps {
    currentUser: User;
    userRoles: any[];
    activeRoleContext: any;
    onBack: () => void;
    sportivi: User[];
    allRoles: Rol[];
    clubs: Club[];
    permissions: Permissions;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ currentUser, userRoles, activeRoleContext, onBack }) => {
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const { showError } = useError();

    const handleSwitchRole = async (roleContext: any) => {
        if (!supabase || !currentUser?.user_id) return;
        setIsSwitchingRole(true);

        const { error } = await supabase.rpc('set_primary_context', {
            p_sportiv_id: roleContext.sportiv_id,
            p_rol_denumire: roleContext.rol_denumire
        });

        if (error) {
            showError("Eroare la comutarea rolului", error.message);
            setIsSwitchingRole(false);
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard
            </Button>
            
            <header className="text-center">
                <h1 className="text-4xl font-black text-white">Consola de Administrare</h1>
                <p className="text-slate-400 mt-2">Comută rapid între contextele de rol disponibile pentru contul tău.</p>
            </header>

            {currentUser.email === 'alin2u83@gmail.com' && (
                <DevRoleImpersonation userRoles={userRoles} />
            )}

            <IdentitySwitcher 
                userRoles={userRoles}
                activeRoleContext={activeRoleContext}
                onSwitchRole={handleSwitchRole}
                isSwitchingRole={isSwitchingRole} 
            />
        </div>
    );
};