import React, { useState, useEffect } from 'react';
import { View, User } from '../types';
import { Card } from './ui';
import { 
    UsersIcon, 
    CalendarDaysIcon, 
    ClipboardCheckIcon, 
    TrophyIcon, 
    WalletIcon, 
    BanknotesIcon, 
    CogIcon,
    BookOpenIcon,
    ChatBubbleLeftEllipsisIcon,
    FileTextIcon,
    ShieldCheckIcon
} from './icons';
import { Permissions } from '../hooks/usePermissions';
import { supabase } from '../supabaseClient';

const NavCard: React.FC<{ title: string; view: View; icon: React.ElementType; onNavigate: (view: View) => void; }> = ({ title, view, icon: Icon, onNavigate }) => (
    <div onClick={() => onNavigate(view)} className="bg-slate-800/50 p-4 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-slate-700/50 transition-colors border border-slate-700">
        <Icon className="w-6 h-6 text-sky-400 shrink-0" />
        <span className="font-semibold text-white">{title}</span>
    </div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card className="bg-light-navy border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-sky-400/30 pb-2">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {children}
        </div>
    </Card>
);

interface ClubManagementHubProps {
    onNavigate: (view: View) => void;
    permissions: Permissions;
    currentUser: User;
}

export const ClubManagementHub: React.FC<ClubManagementHubProps> = ({ onNavigate, permissions, currentUser }) => {

    const { isAdminClub } = permissions;
    const [rlsDebugInfo, setRlsDebugInfo] = useState<{ sportiviCount: number | null; error: string | null }>({ sportiviCount: null, error: null });

    useEffect(() => {
        if ((import.meta as any).env.DEV && supabase) {
            const checkRls = async () => {
                const { count, error } = await supabase
                    .from('sportivi')
                    .select('*', { count: 'exact', head: true });
                
                if (error) {
                    setRlsDebugInfo({ sportiviCount: null, error: error.message });
                } else {
                    setRlsDebugInfo({ sportiviCount: count, error: null });
                }
            };
            checkRls();
        }
    }, []);

    return (
        <div className="space-y-6">
            <Group title="Antrenamente">
                <NavCard title="Prezență Azi" view="prezenta" icon={ClipboardCheckIcon} onNavigate={onNavigate} />
                <NavCard title="Pontaj Live" view="live-attendance" icon={ClipboardCheckIcon} onNavigate={onNavigate} />
                <NavCard title="Program Săptămânal" view="grupe" icon={CalendarDaysIcon} onNavigate={onNavigate} />
                <NavCard title="Anunțuri Absențe" view="prezenta" icon={ChatBubbleLeftEllipsisIcon} onNavigate={onNavigate} />
                 <NavCard title="Generator Program" view="activitati" icon={CogIcon} onNavigate={onNavigate} />
            </Group>

            <Group title="Tehnic">
                <NavCard title="Listă Sportivi" view="sportivi" icon={UsersIcon} onNavigate={onNavigate} />
                <NavCard title="Istoric Grade" view="grade" icon={BookOpenIcon} onNavigate={onNavigate} />
                <NavCard title="Note & Finalizare Examene" view="examene" icon={FileTextIcon} onNavigate={onNavigate} />
                <NavCard title="Generează Examen Nou" view="examene" icon={TrophyIcon} onNavigate={onNavigate} />
            </Group>
            
            {isAdminClub && (
                 <Group title="Financiar & Administrativ">
                    <NavCard title="Facturi Federație (FRQKD)" view="deconturi-federatie" icon={BanknotesIcon} onNavigate={onNavigate} />
                    <NavCard title="Încasări Abonamente" view="jurnal-incasari" icon={WalletIcon} onNavigate={onNavigate} />
                    <NavCard title="Politici Reducere" view="reduceri" icon={CogIcon} onNavigate={onNavigate} />
                    <NavCard title="Management Abonamente" view="tipuri-abonament" icon={CogIcon} onNavigate={onNavigate} />
                </Group>
            )}

            {(import.meta as any).env.DEV && (
                <Card className="mt-6 bg-slate-900 border-amber-500/50">
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4" />
                        Debug RLS (Row Level Security)
                    </h4>
                    <div className="text-xs text-slate-300 mt-2 space-y-1 font-mono">
                        <p>User Club ID: <span className="font-bold">{currentUser.club_id || 'NULL'}</span></p>
                        <p>User Roles: <span className="font-bold">{(currentUser.roluri || []).map(r => r.nume).join(', ') || 'N/A'}</span></p>
                        <p>Query `sportivi` count: <span className={`font-bold ${rlsDebugInfo.sportiviCount === 0 ? 'text-red-400' : 'text-green-400'}`}>{rlsDebugInfo.sportiviCount ?? 'Loading...'}</span></p>
                        {rlsDebugInfo.sportiviCount === 0 && <p className="text-red-400">RLS pe 'sportivi' blochează accesul. Prezența și alte module nu vor funcționa.</p>}
                        {rlsDebugInfo.error && <p className="text-red-400">Error: {rlsDebugInfo.error}</p>}
                        {!currentUser.club_id && <p className="text-red-400">ID-ul de club lipsește din profilul utilizatorului. Politicile RLS vor eșua.</p>}
                    </div>
                </Card>
            )}
        </div>
    );
};