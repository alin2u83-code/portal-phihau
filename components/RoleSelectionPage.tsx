import React from 'react';
import { Card, Button } from './ui';
import { ShieldCheckIcon, UsersIcon, CheckCircleIcon, BlackBeltIcon, VoPhucIcon } from './icons';
import { Rol } from '../types';

// --- Helper Functions ---
const getRoleDisplayName = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'ADMIN': return 'Admin General';
        case 'ADMIN_CLUB': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'INSTRUCTOR': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'SPORTIV': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.rol_denumire;
    }
};

const getRoleDescription = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Acces total la nivel de federație.';
        case 'ADMIN': return 'Acces administrativ general.';
        case 'ADMIN_CLUB': return `Management complet pentru ${role.club?.nume || 'club'}.`;
        case 'INSTRUCTOR': return `Management sportivi și prezențe la ${role.club?.nume || 'club'}.`;
        case 'SPORTIV': return 'Accesează portalul personal de sportiv.';
        default: return 'Selectează acest profil pentru a continua.';
    }
}

const getRoleIcon = (roleName: Rol['nume']) => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'ADMIN':
            return ShieldCheckIcon;
        case 'ADMIN_CLUB':
            return UsersIcon;
        case 'INSTRUCTOR':
            return BlackBeltIcon;
        case 'SPORTIV':
            return VoPhucIcon;
        default:
            return UsersIcon;
    }
};


// --- Main Component ---
interface RoleSelectionPageProps {
    roles: any[];
    onSelect: (roleContextId: string) => void; // Așteaptă un ID pentru a apela RPC-ul
    loading: boolean;
    onLogout: () => void;
}

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ roles, onSelect, loading, onLogout }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
            <div className="w-full max-w-2xl">
                <Card className="border-t-4 border-amber-400 animate-fade-in-down">
                    <div className="text-center mb-8">
                        <ShieldCheckIcon className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                        <h1 className="text-3xl font-bold text-white">Selectează Contextul</h1>
                        <p className="text-slate-400 mt-2">Contul tău este asociat cu mai multe profiluri. Alege rolul cu care dorești să continui sesiunea.</p>
                    </div>

                    <div className="space-y-4">
                        {roles.map((role, index) => {
                            const Icon = getRoleIcon(role.rol_denumire);
                            const isActive = role.is_primary;
                            return (
                                <button
                                    key={index}
                                    onClick={() => onSelect(role.id)} // Trimite direct ID-ul
                                    disabled={loading || isActive}
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

                    {loading && <div className="text-center mt-6 text-slate-400 animate-pulse">Se configurează sesiunea...</div>}

                    <div className="text-center mt-8 pt-4 border-t border-slate-700">
                        <Button variant="secondary" size="sm" onClick={onLogout}>Deconectare</Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
