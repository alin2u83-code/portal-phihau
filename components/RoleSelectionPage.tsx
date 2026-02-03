import React from 'react';
import { Card, Button } from './ui';
import { ShieldCheckIcon } from './icons';

// --- Helper Functions ---
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

// --- Main Component ---
interface RoleSelectionPageProps {
    roles: any[];
    onSelect: (role: any) => void;
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
                        {roles.map((role, index) => (
                            <button
                                key={index}
                                onClick={() => onSelect(role)}
                                disabled={loading}
                                className="w-full text-left p-4 rounded-lg bg-slate-700 hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-secondary transform hover:scale-105"
                            >
                                <p className="font-bold text-lg text-white">{getRoleDisplayName(role)}</p>
                                <p className="text-sm text-slate-400">{getRoleDescription(role)}</p>
                            </button>
                        ))}
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