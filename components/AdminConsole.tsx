import React, { useState } from 'react';
import { Rol, User, Club, Permissions } from '../types';
import { Button, Card } from './ui';
// FIX: Added CheckCircleIcon, UsersIcon, UserCircleIcon and removed obsolete IdentitySwitcher import.
import { ArrowLeftIcon, ShieldCheckIcon, CheckCircleIcon, UsersIcon, UserCircleIcon } from './icons';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';

// FIX: Re-implemented the deleted IdentitySwitcher component and its helpers locally.
// --- Helper Functions from RoleSelectionPage ---
const getRoleDisplayName = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'Admin': return 'Admin General';
        case 'Admin Club': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'Instructor': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'Sportiv': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.rol_denumire;
    }
};

const getRoleDescription = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Acces total la nivel de federație.';
        case 'Admin': return 'Acces administrativ general.';
        case 'Admin Club': return `Management complet pentru ${role.club?.nume || 'club'}.`;
        case 'Instructor': return `Management sportivi și prezențe la ${role.club?.nume || 'club'}.`;
        case 'Sportiv': return 'Accesează portalul personal de sportiv.';
        default: return 'Selectează acest profil pentru a continua.';
    }
}

const getRoleIcon = (roleName: Rol['nume']) => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'Admin':
            return ShieldCheckIcon;
        case 'Admin Club':
        case 'Instructor':
            return UsersIcon;
        case 'Sportiv':
            return UserCircleIcon;
        default:
            return UsersIcon;
    }
};

// --- Re-implemented IdentitySwitcher component ---
const IdentitySwitcher: React.FC<{
    userRoles: any[];
    activeRoleContext: any;
    onSwitchRole: (roleContext: any) => void;
    isSwitchingRole: boolean;
}> = ({ userRoles, activeRoleContext, onSwitchRole, isSwitchingRole }) => {
    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Schimbă Contextul Curent</h3>
            <div className="space-y-4">
                {userRoles.map((role, index) => {
                    const Icon = getRoleIcon(role.rol_denumire);
                    const isActive = activeRoleContext?.rol_denumire === role.rol_denumire && activeRoleContext?.sportiv_id === role.sportiv_id;
                    return (
                        <button
                            key={index}
                            onClick={() => onSwitchRole(role)}
                            disabled={isSwitchingRole || isActive}
                            className={`relative w-full text-left p-6 rounded-lg transition-all duration-300 disabled:opacity-50 border-2 ${
                                isActive 
                                ? 'bg-brand-secondary/20 border-brand-secondary shadow-glow-secondary cursor-default' 
                                : 'bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer transform hover:scale-[1.03]'
                            }`}
                        >
                            {isActive && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-brand-secondary bg-green-900/50 px-2 py-1 rounded-full">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Activ
                                </div>
                            )}
                            <div className="flex items-start gap-4">
                                <Icon className={`w-10 h-10 shrink-0 mt-1 ${isActive ? 'text-brand-secondary' : 'text-slate-400'}`} />
                                <div>
                                    <p className="font-bold text-lg text-white">{getRoleDisplayName(role)}</p>
                                    <p className="text-sm text-slate-400">{getRoleDescription(role)}</p>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </Card>
    );
};


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