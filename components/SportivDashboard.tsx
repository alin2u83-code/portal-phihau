import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, InscriereExamen, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen, Antrenament, Permissions, Rol, IstoricGrade } from '../types';
import { Card, Button, Skeleton, Modal } from './ui';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { TrophyIcon, CalendarDaysIcon, ChartBarIcon, WalletIcon, UsersIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';
import { Loader2 } from 'lucide-react';
import { GradBadge } from '../utils/grades';
import { AntrenamenteViitoare } from './AntrenamenteViitoare';
import { UpcomingTrainingsWidget } from './UpcomingTrainingsWidget';
import { SportivProgressChart } from './SportivProgressChart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useDataProvider } from '../hooks/useDataProvider';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import { useDashboardPermissions } from '../hooks/useDashboardPermissions';
import { VizaMedicalaCard } from './SportivDashboard/VizaMedicalaCard';
import { TrainingActionCard, AnuntStatus } from './SportivDashboard/TrainingActionCard';
import { HistoryModal } from './SportivDashboard/HistoryModal';
import { FamilieWidget } from './SportivDashboard/FamilieWidget';
import { EvenimenteWidget } from './EvenimenteWidget';

const getGrad = (gradId: string | null, allGrades: Grad[]) =>
    gradId ? allGrades.find(g => g.id === gradId) ?? null : null;

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

    // Fix: dacă grupe din context e gol (RLS sportiv), fetch direct grupa sportivului
    const [grupaName, setGrupaName] = useState<string>('');
    const [grupaLoading, setGrupaLoading] = useState(false);

    useEffect(() => {
        if (viewedUser?.id) fetchIstoricVedere(viewedUser.id);
    }, [viewedUser?.id, fetchIstoricVedere]);

    useEffect(() => {
        if (!viewedUser.grupa_id) { setGrupaName('Fără grupă'); return; }
        const found = grupe.find(g => g.id === viewedUser.grupa_id);
        if (found) { setGrupaName(found.denumire); return; }
        // Grupe array gol (RLS sportiv) → fetch direct
        setGrupaLoading(true);
        const fetchGrupa = async () => {
            const { data } = await supabase.from('grupe').select('denumire').eq('id', viewedUser.grupa_id!).maybeSingle();
            setGrupaName(data?.denumire || 'Grupă necunoscută');
            setGrupaLoading(false);
        };
        fetchGrupa();
    }, [viewedUser.grupa_id, grupe]);

    const todayString = useMemo(() => {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }, []);

    const todaysTrainings = useMemo(() =>
        (antrenamente || [])
            .filter(a =>
                (a.data || '').toString().slice(0, 10) === todayString &&
                (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
            )
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start)),
        [antrenamente, todayString, currentUser]
    );

    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        if (!currentUser?.id || !currentUser.user_id || !currentUser.club_id) {
            showError("Sesiune invalidă", "Profilul tău nu este complet încărcat.");
            return;
        }
        try {
            const existingAnunt = (anunturi || []).find(a => a.antrenament_id === trainingId && a.sportiv_id === currentUser.id);
            const upsertData: Omit<AnuntPrezenta, 'id'> & { id?: string } = {
                id: existingAnunt?.id,
                antrenament_id: trainingId,
                sportiv_id: currentUser.id,
                club_id: currentUser.club_id,
                status,
                detalii: null
            };
            const { data, error } = await supabase
                .from('anunturi_prezenta')
                .upsert(upsertData, { onConflict: 'antrenament_id, sportiv_id' })
                .select().maybeSingle();
            if (error) throw error;
            if (data) {
                showSuccess("Status actualizat", `Ai anunțat: ${status}`);
                setAnunturi(prev => {
                    const idx = prev.findIndex(a => a.id === data.id || (a.antrenament_id === data.antrenament_id && a.sportiv_id === data.sportiv_id));
                    if (idx > -1) { const n = [...prev]; n[idx] = data; return n; }
                    return [...prev, data as AnuntPrezenta];
                });
            }
        } catch (error: any) {
            if (error.code === '42501' || error.message?.includes('violates row-level security policy')) {
                showError("Lipsă permisiuni", "Nu aveți permisiunea de a înregistra prezența.");
            } else {
                showError("Eroare", error.message);
            }
        }
    };

    const currentGrad = useMemo(() => {
        const official = getGrad(viewedUser.grad_actual_id ?? null, grade);
        if (official) return official;
        const admitted = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, examen: (examene || []).find(e => e.id === p.sesiune_id) }))
            .sort((a, b) => new Date((b.examen?.data || '').toString().slice(0, 10) || 0).getTime() - new Date((a.examen?.data || '').toString().slice(0, 10) || 0).getTime());
        return getGrad(admitted[0]?.grad_sustinut_id || null, grade);
    }, [participari, viewedUser.grad_actual_id, viewedUser.id, grade, examene]);

    const gradeHistoryData = useMemo(() => {
        if (!participari || !grade || !examene || !istoricGrade) return [];
        const examGrades = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => {
                const examen = (examene || []).find(e => e.id === p.sesiune_id);
                const grad = (grade || []).find(g => g.id === p.grad_sustinut_id);
                if (!examen || !grad) return null;
                return { source: 'examen', date: new Date((examen.data || '').toString().slice(0, 10)).getTime(), rankName: grad.nume, rank: grad.ordine };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);
        const manualGrades = (istoricGrade || [])
            .filter(hg => hg.sportiv_id === viewedUser.id && !hg.sesiune_examen_id)
            .map(hg => {
                const grad = (grade || []).find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return { source: 'manual', date: new Date((hg.data_obtinere || '').toString().slice(0, 10)).getTime(), rankName: grad.nume, rank: grad.ordine };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);
        return [...examGrades, ...manualGrades].sort((a, b) => a.date - b.date).map(item => ({
            date: new Date(item.date).toLocaleDateString('ro-RO'),
            rankOrder: item.rank,
            rankName: item.rankName,
            timestamp: item.date,
            source: item.source
        }));
    }, [participari, examene, grade, istoricGrade, viewedUser.id]);

    const totalPrezente = useMemo(() =>
        istoricPrezenta.filter(p => p.status?.toLowerCase() === 'prezent').length,
        [istoricPrezenta]
    );

    const neachitate = useMemo(() =>
        (plati || []).filter(p => p.sportiv_id === viewedUser.id && p.status === 'Neachitat'),
        [plati, viewedUser.id]
    );
    const statusPlati: 'RESTANTA' | 'LA ZI' = neachitate.length > 0 ? 'RESTANTA' : 'LA ZI';

    const { attendanceStats, gradeStats } = useAttendanceStats(istoricPrezenta, istoricGrade, grade);

    const initials = `${viewedUser.nume?.[0] ?? ''}${viewedUser.prenume?.[0] ?? ''}`;

    return (
        <div className="space-y-4 md:space-y-5 pb-24 md:pb-6">

            {/* ── HEADER CARD ─────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/60 shadow-xl">
                {/* decorative top line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 sm:p-6">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-700 border-4 border-slate-800 shadow-xl flex items-center justify-center overflow-hidden ring-2 ring-sky-500/30">
                            {viewedUser.foto_url ? (
                                <img src={viewedUser.foto_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="text-2xl sm:text-3xl font-bold text-slate-300">{initials}</span>
                            )}
                        </div>
                        {/* online indicator */}
                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                            {viewedUser.nume} {viewedUser.prenume}
                        </h1>

                        {/* Grupă */}
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                            <UsersIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            {grupaLoading ? (
                                <span className="text-xs text-slate-500 animate-pulse">Se încarcă...</span>
                            ) : (
                                <span className="text-sm text-sky-400 font-medium">{grupaName}</span>
                            )}
                        </div>

                        {/* Grad */}
                        <div className="mt-3 flex justify-center sm:justify-start">
                            <GradBadge grad={currentGrad} gradName={currentGrad?.nume} isLarge />
                        </div>
                    </div>

                    {/* Quick stats — desktop right side */}
                    <div className="hidden sm:flex flex-col gap-2 items-end shrink-0">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400">Prezențe</span>
                            <span className={`font-black text-lg ${loadingIstoric ? 'text-slate-600' : 'text-sky-400'}`}>
                                {loadingIstoric ? '...' : totalPrezente}
                            </span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                            statusPlati === 'RESTANTA'
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                            {statusPlati === 'RESTANTA'
                                ? <ExclamationTriangleIcon className="w-3 h-3" />
                                : <CheckCircleIcon className="w-3 h-3" />
                            }
                            {statusPlati === 'RESTANTA' ? `${neachitate.length} restanță` : 'Plăți la zi'}
                        </div>
                    </div>
                </div>

                {/* Quick stats — mobile row */}
                <div className="flex sm:hidden items-center divide-x divide-slate-700/60 border-t border-slate-700/60">
                    <div className="flex-1 flex flex-col items-center py-3">
                        <span className="text-xs text-slate-500">Prezențe</span>
                        <span className={`text-lg font-black ${loadingIstoric ? 'text-slate-600' : 'text-sky-400'}`}>
                            {loadingIstoric ? '...' : totalPrezente}
                        </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-3">
                        <span className="text-xs text-slate-500">Plăți</span>
                        <span className={`text-sm font-bold ${statusPlati === 'RESTANTA' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {statusPlati === 'RESTANTA' ? `${neachitate.length} restanță` : 'La zi'}
                        </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-3">
                        <span className="text-xs text-slate-500">Examene</span>
                        <span className="text-lg font-black text-amber-400">
                            {(participari || []).filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis').length}
                        </span>
                    </div>
                </div>

                {/* CTA buttons */}
                {isViewingOwnProfile && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="primary"
                            onClick={() => onNavigate('istoric-plati')}
                            className="flex-1 sm:flex-none bg-sky-500 hover:bg-sky-600 border-none shadow-lg shadow-sky-500/20"
                        >
                            <WalletIcon className="w-4 h-4 mr-2" /> Portofelul Meu
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setIsHistoryOpen(true)}
                            className="flex-1 sm:flex-none"
                        >
                            <CalendarDaysIcon className="w-4 h-4 mr-2" /> Istoric Prezențe
                        </Button>
                    </div>
                )}
            </div>

            {/* ── ANTRENAMENTE AZI ────────────────────────────────────── */}
            {isViewingOwnProfile && todaysTrainings.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Astăzi</p>
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

            {/* ── STATS GRID ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Prezențe Recente */}
                <Card className="border border-slate-800 bg-slate-900/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4 text-sky-400" />
                            Prezențe Recente
                        </h3>
                        <span className="text-xl font-black text-sky-400">{loadingIstoric ? '...' : totalPrezente}</span>
                    </div>
                    {loadingIstoric ? (
                        <div className="h-40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                        </div>
                    ) : totalPrezente === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-600 bg-slate-800/30 rounded-xl border border-slate-700/40">
                            <CalendarDaysIcon className="w-7 h-7 mb-2 opacity-40" />
                            <p className="text-xs">Nicio prezență înregistrată.</p>
                        </div>
                    ) : (
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceStats.recent} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                                    <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                                        formatter={(value: number) => [`${value} prezențe`, '']}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {attendanceStats.recent.map((_, i) => (
                                            <Cell key={i} fill={i === attendanceStats.recent.length - 1 ? '#0ea5e9' : '#1e293b'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Evoluție Grade */}
                <Card className="border border-slate-800 bg-slate-900/50">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-amber-400" />
                        Evoluție Grade
                    </h3>
                    <div className="h-40">
                        <SportivProgressChart data={gradeHistoryData} themeColor="#fbbf24" />
                    </div>
                </Card>

                {/* Status Plăți */}
                <Card className={`border ${statusPlati === 'RESTANTA' ? 'border-rose-500/40 bg-rose-950/30' : 'border-emerald-500/20 bg-emerald-950/20'}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                                <WalletIcon className={`w-4 h-4 ${statusPlati === 'RESTANTA' ? 'text-rose-400' : 'text-emerald-400'}`} />
                                Status Plăți
                            </h3>
                            <p className={`text-2xl font-black ${statusPlati === 'RESTANTA' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {statusPlati === 'RESTANTA' ? 'RESTANȚĂ' : 'LA ZI'}
                            </p>
                            {statusPlati === 'RESTANTA' && (
                                <p className="text-xs text-slate-400 mt-1">{neachitate.length} factură{neachitate.length !== 1 ? 'i' : ''} neachitată{neachitate.length !== 1 ? 'i' : ''}</p>
                            )}
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusPlati === 'RESTANTA' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                            {statusPlati === 'RESTANTA'
                                ? <ExclamationTriangleIcon className="w-6 h-6 text-rose-400" />
                                : <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                            }
                        </div>
                    </div>
                    {isViewingOwnProfile && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate('istoric-plati')}
                            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                        >
                            Vezi Detalii Plăți
                        </Button>
                    )}
                </Card>

                {/* Evenimente */}
                <EvenimenteWidget sportivId={viewedUser.id} clubId={viewedUser.club_id} />
            </div>

            {/* ── EVOLUȚIE PREZENȚE PE GRADE ──────────────────────────── */}
            {gradeStats.length > 0 && (
                <Card className="border border-slate-800 bg-slate-900/50">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-emerald-400" />
                        Prezențe pe Intervale de Grad
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {gradeStats.map((stat, idx) => (
                            <div key={`${stat.period}-${idx}`} className="flex flex-col p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 truncate">{stat.period}</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-emerald-400">{stat.count}</span>
                                    <span className="text-xs text-slate-500">prez.</span>
                                </div>
                                <span className="text-[10px] text-slate-600 mt-1">până la {new Date(stat.date).toLocaleDateString('ro-RO')}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ── WIDGETS SECUNDARE ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AntrenamenteViitoare currentUser={viewedUser} antrenamente={antrenamente} grupe={grupe} anunturi={anunturi} />

                <div className="space-y-4">
                    <UpcomingTrainingsWidget currentUser={viewedUser} grupe={grupe} />
                    <VizaMedicalaCard plati={plati} sportivId={viewedUser.id} />

                    {isViewingOwnProfile && (
                        <Card className="border border-slate-800 bg-slate-900/50">
                            <h3 className="text-sm font-bold text-white mb-3">Notificări Push</h3>
                            <NotificationPermissionWidget />
                        </Card>
                    )}
                </div>
            </div>

            {/* ── FAMILIE & FRAȚI ─────────────────────────────────────── */}
            {viewedUser.familie_id && (
                <FamilieWidget
                    currentUser={viewedUser}
                    isViewingOwnProfile={isViewingOwnProfile}
                    grade={grade}
                />
            )}

            {/* ── SWITCH ROL ──────────────────────────────────────────── */}
            {canSwitchRoles && (
                <Card className="border border-slate-800 bg-slate-900/50">
                    <h3 className="text-sm font-bold text-white mb-3">Comută Rol Activ</h3>
                    <div className="flex flex-wrap gap-2">
                        {(currentUser.roluri || []).map((rol, idx) => (
                            <Button
                                key={rol.id || rol.nume || idx}
                                variant={activeRole === rol.nume ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => onSwitchRole(rol.nume)}
                                disabled={isSwitchingRole}
                            >
                                {rol.nume}
                            </Button>
                        ))}
                    </div>
                </Card>
            )}

            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} istoric={istoricPrezenta} />
        </div>
    );
};
