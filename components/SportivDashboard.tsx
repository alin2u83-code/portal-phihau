import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, InscriereExamen, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen, Antrenament, Permissions, Rol, IstoricGrade } from '../types';
import { Card, Button, Skeleton, Modal } from './ui';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { CheckIcon, ExclamationTriangleIcon, TrophyIcon, CalendarDaysIcon, ChartBarIcon, WalletIcon } from './icons';
import { GradBadge } from '../utils/grades';
import { AntrenamenteViitoare } from './AntrenamenteViitoare';
import { UpcomingTrainingsWidget } from './UpcomingTrainingsWidget';
import { SportivProgressChart, ChartDataPoint } from './SportivProgressChart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useDataProvider } from '../hooks/useDataProvider';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import { useDashboardPermissions } from '../hooks/useDashboardPermissions';
import { VizaMedicalaCard } from './SportivDashboard/VizaMedicalaCard';
import { TrainingActionCard, AnuntStatus } from './SportivDashboard/TrainingActionCard';
import { HistoryModal } from './SportivDashboard/HistoryModal';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;

interface SportivDashboardProps {
  currentUser: User;
  viewedUser: User;
  participari: InscriereExamen[];
  examene: SesiuneExamen[];
  grade: Grad[];
  istoricGrade: IstoricGrade[];
  grupe: Grupa[];
  plati: Plata[];
  onNavigate: (view: View) => void;
  antrenamente: Antrenament[];
  anunturi: AnuntPrezenta[];
  setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
  sportivi: Sportiv[];
  permissions: Permissions;
  canSwitchRoles: boolean;
  activeRole: Rol['nume'];
  onSwitchRole: (roleName: Rol['nume']) => void;
  isSwitchingRole: boolean;
  isAdminView?: boolean;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({
    currentUser, viewedUser, participari, examene, grade, istoricGrade, grupe,
    plati, onNavigate, antrenamente, anunturi, setAnunturi, sportivi,
    permissions, canSwitchRoles, activeRole, onSwitchRole, isSwitchingRole,
    isAdminView = false
}) => {
    const { showSuccess, showError } = useError();
    const { istoricPrezenta, fetchIstoricVedere, loadingIstoric } = useDataProvider();
    const { isViewingOwnProfile } = useDashboardPermissions(currentUser, viewedUser, permissions);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        if (viewedUser?.id) {
            fetchIstoricVedere(viewedUser.id);
        }
    }, [viewedUser?.id, fetchIstoricVedere]);

    const todayString = useMemo(() => {
        const d = new Date();
        // Adjust for local timezone if necessary, but ISO string is usually UTC.
        // Assuming the server/database uses local date strings.
        return d.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
    }, []);

    const todaysTrainings = useMemo(() => {
        return (antrenamente || [])
            .filter(a => 
                a.data === todayString &&
                (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
            )
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, todayString, currentUser]);
    
    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        if (!supabase) {
            showError("Eroare", "Client Supabase neconfigurat.");
            return;
        }

        if (!currentUser?.id || !currentUser.user_id || !currentUser.club_id) {
            showError("Sesiune invalidă", "Profilul tău nu este complet încărcat. Te rugăm să te reautentifici pentru a trimite prezența.");
            return;
        }

        try {
            const existingAnunt = (anunturi || []).find(a => a.antrenament_id === trainingId && a.sportiv_id === currentUser.id);
            const upsertData: Omit<AnuntPrezenta, 'id'> & { id?: string } = {
                id: existingAnunt?.id,
                antrenament_id: trainingId,
                sportiv_id: currentUser.id,
                club_id: currentUser.club_id,
                status: status,
                detalii: null 
            };
            
            const { data, error } = await supabase
                .from('anunturi_prezenta')
                .upsert(upsertData, { onConflict: 'antrenament_id, sportiv_id' })
                .select()
                .maybeSingle();
            
            if (error) throw error;

            if (data) {
                showSuccess("Status actualizat", `Ai anunțat: ${status}`);
                setAnunturi(prev => {
                    const index = prev.findIndex(a => a.id === data.id || (a.antrenament_id === data.antrenament_id && a.sportiv_id === data.sportiv_id));
                    if (index > -1) {
                        const newAnunturi = [...prev];
                        newAnunturi[index] = data;
                        return newAnunturi;
                    } else {
                        return [...prev, data as AnuntPrezenta];
                    }
                });
            }
        } catch (error: any) {
            if (error.code === '42501' || error.message.includes('violates row-level security policy')) {
                showError("Lipsă permisiuni scriere", "Nu aveți permisiunea de a înregistra prezența. Contactați administratorul.");
            } else {
                showError("Eroare la salvarea statusului", error.message);
            }
        }
    };

    const currentGrad = useMemo(() => {
        const officialGrad = getGrad(viewedUser.grad_actual_id, grade);
        if (officialGrad) return officialGrad;

        const admittedParticipations = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, examen: (examene || []).find(e => e.id === p.sesiune_id) }))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
        
        return getGrad(admittedParticipations[0]?.grad_vizat_id || null, grade);
    }, [participari, viewedUser.grad_actual_id, viewedUser.id, grade, examene]);

    // --- Grade Evolution Data ---
    const gradeHistoryData = useMemo(() => {
        if (!participari || !grade || !examene || !istoricGrade) return [];

        const examGrades = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => {
                const examen = (examene || []).find(e => e.id === p.sesiune_id);
                const grad = (grade || []).find(g => g.id === p.grad_vizat_id);
                if (!examen || !grad) return null;
                return {
                    source: 'examen',
                    date: new Date(examen.data).getTime(),
                    grad_id: grad.id,
                    rankName: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

        const manualGrades = (istoricGrade || [])
            .filter(hg => hg.sportiv_id === viewedUser.id && !hg.sesiune_examen_id)
            .map(hg => {
                const grad = (grade || []).find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return {
                    source: 'manual',
                    date: new Date(hg.data_obtinere).getTime(),
                    grad_id: hg.grad_id,
                    rankName: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);

        const combined = [...examGrades, ...manualGrades].sort((a, b) => a.date - b.date);
        
        return combined.map(item => ({
            date: new Date(item.date).toLocaleDateString('ro-RO'),
            rankOrder: item.rank,
            rankName: item.rankName,
            timestamp: item.date,
            source: item.source
        }));
    }, [participari, examene, grade, istoricGrade, viewedUser.id]);

    // --- Attendance Stats Data ---
    const { attendanceStats, gradeStats } = useAttendanceStats(istoricPrezenta, istoricGrade, grade);

    return (
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
            {/* Mobile-first Header Profile Card */}
            <Card className="relative overflow-hidden border-t-4 border-t-sky-500 bg-gradient-to-b from-slate-800 to-[var(--bg-card)] shadow-lg">
                <div className="flex flex-col items-center text-center p-6">
                    <div className="w-24 h-24 rounded-full bg-slate-700 border-4 border-slate-800 shadow-xl mb-4 flex items-center justify-center overflow-hidden ring-2 ring-sky-500/20">
                        {viewedUser.foto_url ? (
                            <img src={viewedUser.foto_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="text-3xl font-bold text-slate-400">{viewedUser.nume[0]}{viewedUser.prenume[0]}</span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{viewedUser.nume} {viewedUser.prenume}</h1>
                    <p className="text-sm text-sky-400 font-medium mt-1 uppercase tracking-wider">
                        {grupe.find(g => g.id === viewedUser.grupa_id)?.denumire || 'Fără grupă'}
                    </p>
                    <div className="mt-4 transform scale-110">
                       <GradBadge grad={currentGrad} isLarge />
                    </div>
                    
                    {isViewingOwnProfile && (
                        <div className="mt-6 w-full flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="primary" onClick={() => onNavigate('istoric-plati')} className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-bold border-none shadow-lg shadow-sky-500/20">
                                <WalletIcon className="w-5 h-5 mr-2"/> Portofelul Meu
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {isViewingOwnProfile && todaysTrainings.length > 0 && (
                <div className="space-y-4 animate-fade-in-down">
                    {todaysTrainings.map(training => (
                        <TrainingActionCard
                            key={training.id}
                            training={training}
                            anunt={(anunturi || []).find(a => a.antrenament_id === training.id && a.sportiv_id === currentUser.id)}
                            onStatusChange={handleStatusChange}
                            currentUser={currentUser}
                        />
                    ))}
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Attendance Summary Chart */}
                <Card className="flex flex-col border border-slate-800 bg-slate-900/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-sky-400" />
                            Prezențe Recente
                        </h3>
                        <span className="text-2xl font-black text-sky-400">{attendanceStats.total}</span>
                    </div>
                    
                    {attendanceStats.loading ? (
                        <div className="h-48 flex items-center justify-center"><Skeleton className="w-full h-full rounded-lg bg-slate-800" /></div>
                    ) : attendanceStats.total === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <CalendarDaysIcon className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">Nicio prezență înregistrată.</p>
                        </div>
                    ) : (
                        <div className="h-48 w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceStats.recent} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                                        formatter={(value: number) => [`${value} prezențe`, 'Total']}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {attendanceStats.recent.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === attendanceStats.recent.length - 1 ? '#0ea5e9' : '#334155'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <Button onClick={() => setIsHistoryOpen(true)} variant="secondary" size="sm" className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">
                        Vezi Istoric Detaliat
                    </Button>
                </Card>
                <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} istoric={istoricPrezenta || []} />

                {/* Grade Evolution */}
                <Card className="flex flex-col border border-slate-800 bg-slate-900/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrophyIcon className="w-5 h-5 text-amber-400" />
                        Evoluție Grade
                    </h3>
                    <div className="flex-grow">
                        <SportivProgressChart data={gradeHistoryData} themeColor="#fbbf24" />
                    </div>
                </Card>
            </div>

            {/* Exam Attendance Stats */}
            <Card className="flex flex-col border border-slate-800 bg-slate-900/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-emerald-400" />
                    Evoluție Prezență pe Grade
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {gradeStats.length === 0 ? (
                        <p className="text-slate-400 text-sm italic col-span-full">Nu există date suficiente pentru calculul intervalelor.</p>
                    ) : (
                        gradeStats.map((stat, idx) => (
                            <div key={`${stat.period}-${idx}`} className="flex flex-col p-3 bg-slate-800/50 rounded border border-slate-700/50 hover:bg-slate-700 transition-colors">
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{stat.period}</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-emerald-400">{stat.count}</span>
                                    <span className="text-xs text-slate-500">prezențe</span>
                                </div>
                                <span className="text-[10px] text-slate-600 mt-1">Până la: {new Date(stat.date).toLocaleDateString('ro-RO')}</span>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <AntrenamenteViitoare currentUser={viewedUser} antrenamente={antrenamente} grupe={grupe} anunturi={anunturi} />
                
                <div className="space-y-4 md:space-y-6">
                    <UpcomingTrainingsWidget currentUser={viewedUser} antrenamente={antrenamente} grupe={grupe} />
                    <VizaMedicalaCard plati={plati} sportivId={viewedUser.id} />
                    
                    {isViewingOwnProfile && (
                        <Card className="border border-slate-800 bg-slate-900/50">
                            <h3 className="text-lg font-bold text-white mb-4">Setări Notificări</h3>
                            <NotificationPermissionWidget />
                        </Card>
                    )}
                </div>
            </div>

            {canSwitchRoles && (
                <Card className="animate-fade-in-down border border-slate-800 bg-slate-900/50" style={{ animationDelay: '300ms' }}>
                    <h3 className="text-lg font-bold text-white mb-4">Comută Rol Activ</h3>
                    <div className="flex flex-wrap gap-2">
                        {(currentUser.roluri || []).map((rol, idx) => (
                            <Button 
                                key={rol.id || rol.nume || idx}
                                variant={activeRole === rol.nume ? 'primary' : 'secondary'}
                                onClick={() => onSwitchRole(rol.nume)}
                                disabled={isSwitchingRole}
                                className={activeRole === rol.nume ? 'bg-sky-500 hover:bg-sky-600 text-white border-none shadow-md shadow-sky-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}
                            >
                                {rol.nume}
                            </Button>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};
