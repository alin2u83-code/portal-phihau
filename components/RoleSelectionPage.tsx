import React from 'react';
import { Card, Button } from './ui';
import { ShieldCheckIcon } from './icons';

// --- Helper Functions ---
const getRoleDescription = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Acces total la nivel de federație.';
        case 'Admin': return 'Acces administrativ general.';
        case 'Admin Club': return 'Management complet pentru clubul asociat.';
        case 'Instructor': return 'Management sportivi și prezențe la clubul asociat.';
        case 'Sportiv': return `Accesează portalul personal ca ${role.nume || ''} ${role.prenume || ''}.`;
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
                        {roles && roles.length > 0 ? (
                            roles.map((role, index) => {
                                const isClubRole = role.rol_denumire === 'Admin Club' || role.rol_denumire === 'Instructor';
                                return (
                                    <button
                                        key={index}
                                        onClick={() => onSelect(role)}
                                        disabled={loading}
                                        className="w-full text-left p-4 rounded-lg bg-slate-700 hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-secondary transform hover:scale-105"
                                    >
                                        <p className="font-bold text-lg text-white">
                                            {role.rol_denumire === 'SUPER_ADMIN_FEDERATIE' ? 'Administrator Federație' : role.rol_denumire}
                                        </p>
                                        {isClubRole && role.club_nume && (
                                            <p className="text-md font-semibold text-slate-300 -mt-1">{role.club_nume}</p>
                                        )}
                                        <p className="text-sm text-slate-400 mt-1">{getRoleDescription(role)}</p>
                                    </button>
                                );
                            })
                        ) : (
                            <p className="text-center text-red-400 py-4">Nu s-au găsit roluri alocate pentru acest cont.</p>
                        )}
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
