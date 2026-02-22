import React, { useEffect, useState } from 'react';
import { Card, Button } from './ui';
import { Shield, User, Users, GraduationCap, CheckCircle2, LogOut, ChevronRight } from 'lucide-react';
import { Rol } from '../types';
import { supabase } from '../supabaseClient';

// --- Helper Functions ---
const getRoleDisplayName = (role: any) => {
    switch(role.roluri?.nume) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'ADMIN': return 'Admin General';
        case 'ADMIN_CLUB': return `Admin - ${role.club?.nume || 'Fără Club'}`;
        case 'INSTRUCTOR': return `Instructor - ${role.club?.nume || 'Fără Club'}`;
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
    user: any;
    onSelect: (role: any) => void;
    loading: boolean;
    onLogout: () => void;
}

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ user, onSelect, loading, onLogout }) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfiles = async () => {
            if (user) {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('utilizator_roluri_multicont') // REPARAT: Tabelul corect
                    .select(`
                        *,
                        roluri:rol_id (id, nume),
                        club:club_id (id, nume),
                        sportiv:sportiv_id (id, nume, prenume)
                    `)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error fetching profiles:', error.message);
                } else {
                    setProfiles(data || []);
                }
                setIsLoading(false);
            }
        };

        fetchProfiles();
    }, [user]);

    const handleRoleSelection = (role: any) => {
        localStorage.setItem('activeRole', JSON.stringify(role));
        onSelect(role);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
                    <svg className="animate-spin h-8 w-8 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-2">Se încarcă profilurile...</p>
                </div>
            </div>
        );
    }

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

                <div className={`space-y-3 ${profiles.length > 5 ? 'max-h-[50vh] overflow-y-auto pr-2' : ''}`}>
                    {profiles.length > 0 ? (
                        profiles.map((profile, index) => {
                            const Icon = getRoleIcon(profile.roluri?.nume);
                            const isActive = profile.is_primary;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleRoleSelection(profile)}
                                    disabled={loading}
                                    className={`group relative w-full text-left p-4 rounded-lg transition-all duration-200 border flex items-center gap-4 ${isActive ? 'bg-amber-500/5 border-amber-500/50 shadow-lg' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'}`}>
                                    <div className={`p-2 rounded-md ${isActive ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white truncate text-sm">{getRoleDisplayName(profile)}</p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{getRoleDescription(profile)}</p>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-700 group-hover:text-slate-500'}`} />
                                </button>
                            )
                        })
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-400">Nu s-au găsit roluri pentru acest utilizator.</p>
                            <Button onClick={onLogout} className="mt-4">Deconectare</Button>
                        </div>
                    )}
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
