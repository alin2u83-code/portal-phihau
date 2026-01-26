import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { ShieldCheckIcon, ChevronDownIcon, CheckCircleIcon, AlertTriangleIcon, HelpCircleIcon } from './icons';

interface AccessGuardianProps {
    currentUser: User | null;
}

type CheckStatusType = 'loading' | 'success' | 'warning' | 'error';

interface CheckStatus {
    status: CheckStatusType;
    message: string;
}

const StatusIcon: React.FC<{ status: CheckStatusType }> = ({ status }) => {
    switch (status) {
        case 'success': return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
        case 'warning': return <AlertTriangleIcon className="w-4 h-4 text-amber-400" />;
        case 'error': return <AlertTriangleIcon className="w-4 h-4 text-red-400" />;
        default: return <HelpCircleIcon className="w-4 h-4 text-slate-500 animate-pulse" />;
    }
};

export const AccessGuardian: React.FC<AccessGuardianProps> = ({ currentUser }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [profileCheck, setProfileCheck] = useState<CheckStatus>({ status: 'loading', message: 'Verificare...' });
    const [attendanceCheck, setAttendanceCheck] = useState<CheckStatus>({ status: 'loading', message: 'Verificare...' });

    useEffect(() => {
        if (!currentUser?.user_id || !supabase) return;

        const runChecks = async () => {
            // Check 1: Profile Accessibility
            setProfileCheck({ status: 'loading', message: 'Verificare profil...' });
            const { count: profileCount, error: profileError } = await supabase
                .from('sportivi')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', currentUser.user_id);
            
            if (profileError) {
                setProfileCheck({ status: 'error', message: `Eroare RLS: ${profileError.message}` });
            } else if (profileCount === 1) {
                setProfileCheck({ status: 'success', message: 'Profil personal accesibil.' });
            } else {
                setProfileCheck({ status: 'error', message: '⚠️ Eroare RLS: Profil inaccesibil (0 rânduri)' });
            }

            // Check 2: Attendance Accessibility
            setAttendanceCheck({ status: 'loading', message: 'Verificare prezențe...' });
            const { count: attendanceCount, error: attendanceError } = await supabase
                .from('prezenta_antrenament')
                .select('*', { count: 'exact', head: true })
                .eq('sportiv_id', currentUser.id);

            if (attendanceError) {
                 setAttendanceCheck({ status: 'error', message: `Eroare RLS: ${attendanceError.message}` });
            } else if (attendanceCount !== null && attendanceCount > 0) {
                 setAttendanceCheck({ status: 'success', message: `Accesibile (${attendanceCount} înregistrări)` });
            } else {
                 setAttendanceCheck({ status: 'warning', message: '0 înregistrări găsite (sau RLS activ)' });
            }
        };

        runChecks();

    }, [currentUser]);

    if (!(import.meta as any).env.DEV || currentUser?.email !== 'admin@phihau.ro') {
        return null;
    }

    return (
        <div className="fixed bottom-16 left-4 z-[9999] w-72 font-mono text-xs">
            <div className="bg-[var(--bg-card)] rounded-lg shadow-2xl border border-amber-500/50">
                <button
                    className="w-full flex justify-between items-center p-2 text-left"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-amber-400">Access Guardian</span>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </button>

                {!isCollapsed && (
                    <div className="p-3 border-t border-slate-700 space-y-2 animate-fade-in-down">
                        <div className="flex items-start gap-2">
                            <StatusIcon status={profileCheck.status} />
                            <div>
                                <p className="font-bold text-slate-300">Profil Sportiv</p>
                                <p className={`text-slate-400 ${profileCheck.status === 'error' ? 'text-red-400' : ''}`}>{profileCheck.message}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-2">
                            <StatusIcon status={attendanceCheck.status} />
                            <div>
                                <p className="font-bold text-slate-300">Prezențe</p>
                                <p className={`text-slate-400 ${attendanceCheck.status === 'error' ? 'text-red-400' : attendanceCheck.status === 'warning' ? 'text-amber-400' : ''}`}>{attendanceCheck.message}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
