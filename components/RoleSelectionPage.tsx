import React from 'react';
import { Card, Button } from './ui';
import { Shield, User, Users, GraduationCap, CheckCircle2, LogOut, ChevronRight } from 'lucide-react';
import { Rol } from '../types';

// --- Helper Functions ---
const getRoleDisplayName = (role: any) => {
    switch(role.roluri?.nume) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'ADMIN': return 'Admin General';
        case 'ADMIN_CLUB': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'INSTRUCTOR': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'SPORTIV': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.roluri?.nume;
    }
};

const getRoleDescription = (role: any) => {
    switch(role.roluri?.nume) {
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
            return Shield;
        case 'ADMIN':
        case 'ADMIN_CLUB':
            return Users;
        case 'INSTRUCTOR':
            return GraduationCap;
        case 'SPORTIV':
            return User;
        default:
            return User;
    }
};


// --- Main Component ---
interface RoleSelectionPageProps {
    roles: any[];
    onSelect: (role: any) => void;
    loading: boolean;
    onLogout: () => void;
}

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ roles, onSelect, loading, onLogout }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
                        <Shield className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Selectează Contextul</h1>
                    <p className="text-slate-400 text-sm px-4">
                        Contul tău este asociat cu mai multe profiluri. Alege rolul cu care dorești să continui sesiunea.
                    </p>
                </div>

                <div className="space-y-3">
                    {roles.map((role, index) => {
                        const Icon = getRoleIcon(role.roluri?.nume);
                        const isActive = role.is_primary;
                        return (
                            <button
                                key={index}
                                onClick={() => onSelect(role)}
                                disabled={loading}
                                className={`group relative w-full text-left p-4 rounded-xl transition-all duration-200 border flex items-center gap-4 ${
                                    isActive 
                                    ? 'bg-amber-500/5 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                }`}
                            >
                                <div className={`p-3 rounded-lg ${isActive ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'}`}>
                                    <Icon size={24} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-white truncate">
                                            {getRoleDisplayName(role)}
                                        </p>
                                        {isActive && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                Activ
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {getRoleDescription(role)}
                                    </p>
                                </div>

                                <ChevronRight className={`w-5 h-5 ${isActive ? 'text-amber-500' : 'text-slate-700 group-hover:text-slate-500'}`} />
                            </button>
                        )
                    })}
                </div>

                {loading && (
                    <div className="flex items-center justify-center gap-3 text-slate-500 text-sm animate-pulse">
                        <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        Se configurează sesiunea...
                    </div>
                )}

                <div className="pt-6 flex flex-col items-center gap-4">
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        Deconectare cont
                    </button>
                    
                    <p className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">
                        Phi Hau Club Management v2.0
                    </p>
                </div>
            </div>
        </div>
    );
};
