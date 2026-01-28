import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Participare, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen, Antrenament } from '../types';
import { Card, Button } from './ui';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { AttendanceTracker } from './AttendanceTracker';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { CheckIcon } from './icons';
import { Permissions } from '../hooks/usePermissions';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;

// --- Componente și Logică pentru Acțiuni Rapide (Mutate din AthleteQuickActions.tsx) ---
type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';

interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
    currentUser: User;
}

const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState<AnuntStatus | null>(null);

    useEffect(() => {
        setOptimisticStatus(anunt?.status || null);
    }, [anunt]);

    const handleClick = async (status: AnuntStatus) => {
        setLoading(true);
        setOptimisticStatus(status); // Optimistic UI update

        try {
            await onStatusChange(training.id, status);
        } catch (e) {
            setOptimisticStatus(anunt?.status || null);
        } finally {
            setLoading(false);
        }
    };
    
    const getStyling = (status: AnuntStatus) => {
        const baseClasses = ['font-bold', 'gap-2', 'text-base'];
        const currentStatus = optimisticStatus;
        const isSelected = currentStatus === status;
        const isInactive = currentStatus !== null && !isSelected;

        if (isSelected) {
            baseClasses.push('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-[var(--bg-card)]', 'scale-[1.02]');
        }
        if (isInactive) {
            baseClasses.push('opacity-50', 'hover:opacity-100');
        }
        
        const variant: 'success' | 'warning' | 'danger' = status === 'Confirm' ? 'success' : status === 'Intarziat' ? 'warning' : 'danger';

        return { variant, className: baseClasses.join(' '), isSelected };
    };

    const ActionButton: React.FC<{ status: AnuntStatus; children: React.ReactNode; }> = ({ status, children }) => {
        const { variant, className, isSelected } = getStyling(status);
        return (
            <Button onClick={() => handleClick(status)} variant={variant} className={className} disabled={loading || !currentUser?.id}>
                {children}
                {status === 'Confirm' ? 
                    <CheckIcon className="w-5 h-5 ml-2 text-white" /> :
                    (isSelected && <CheckIcon className="w-5 h-5 ml-2" />)
                }
            </Button>
        );
    };

    return (
        <Card className="bg-light-navy border-slate-800">
            <h3 className="text-xl font-bold text-white mb-4">
                Antrenamentul de azi: {new Date(training.data + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <ActionButton status="Confirm">Participă</ActionButton>
                <ActionButton status="Intarziat">Întârzii</ActionButton>
                <ActionButton status="Absent">Absent</ActionButton>
            </div>
        </Card>
    );
};
// --- Sfârșit Logică Acțiuni Rapide ---


interface SportivDashboardProps {
  currentUser: User;
  viewedUser: User;
  participari: Participare[];
  examene: SesiuneExamen[];
  grade: Grad[];
  grupe: Grupa[];
  plati: Plata[];
  onNavigate: (view: View) => void;
  antrenamente: Antrenament[];
  anunturi: AnuntPrezenta[];
  setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
  sportivi: Sportiv[];
  permissions: Permissions;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({ currentUser, viewedUser, participari, examene, grade, grupe, plati, onNavigate, antrenamente, anunturi, setAnunturi, sportivi, permissions }) => {
    
    const { showSuccess, showError } = useError();
    const isViewingOwnProfile = currentUser.id === viewedUser.id;

    // --- Logic for Quick Actions & Schedules ---
    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todaysTrainings = useMemo(() => {
        return (antrenamente || [])
            .filter(a => 
                a.data === todayString &&
                (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
            )
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, todayString, currentUser]);
    
    const upcomingTrainings = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        const nextFourDays = new Date();
        nextFourDays.setDate(today.getDate() + 4);
        const nextFourDaysStr = nextFourDays.toISOString().split('T')[0];

        return (antrenamente || [])
            .filter(a => {
                return a.data >= todayStr && a.data < nextFourDaysStr &&
                       (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null));
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.data}T${a.ora_start}`);
                const dateB = new Date(`${b.data}T${b.ora_start}`);
                return dateA.getTime() - dateB.getTime();
            })
            .slice(0, 5); // Arată maxim 5 antrenamente viitoare
    }, [antrenamente, currentUser]);

    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        if (!supabase) return;

        // Block 1: Save attendance announcement
        try {
            const existingAnunt = (anunturi || []).find(a => a.antrenament_id === trainingId && a.sportiv_id === currentUser.id);
            const upsertData = {
                id: existingAnunt?.id,
                antrenament_id: trainingId,
                sportiv_id: currentUser.id,
                status: status,
                detalii: null 
            };
            const { data, error } = await supabase.from('anunturi_prezenta').upsert(upsertData, { onConflict: 'antrenament_id, sportiv_id' }).select().single();
            
            if (error) throw error;

            if (data) {
                showSuccess("Status actualizat", `Ai anunțat: ${status}`);
                setAnunturi(prev => {
                    const existingIndex = prev.findIndex(a => a.id === data.id || (a.antrenament_id === data.antrenament_id && a.sportiv_id === data.sportiv_id));
                    if (existingIndex > -1) {
                        const newAnunturi = [...prev];
                        newAnunturi[existingIndex] = data;
                        return newAnunturi;
                    } else {
                        return [...prev, data];
                    }
                });
            }
        } catch (error: any) {
            showError("Eroare la salvarea prezenței", error);
            throw error;
        }

        // Block 2: Send notification
        try {
            const antrenament = todaysTrainings.find(t => t.id === trainingId);
            if (!antrenament) return;

            const instructors = (sportivi || []).filter(s =>
                s.club_id === currentUser.club_id &&
                s.roluri.some(r => r.nume === 'Instructor') &&
                s.user_id
            );
            
            const recipientIds = instructors.map(i => i.user_id).filter(Boolean) as string[];
            
            if (recipientIds.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    console.warn("Utilizatorul nu este autentificat, notificarea nu poate fi trimisă.");
                    return;
                }
                const authUserId = user.id;

                const message = `${currentUser.nume} ${currentUser.prenume} a anunțat: ${status} la antrenamentul de la ${antrenament.ora_start}.`;
                const notificationsToInsert = recipientIds.map(userId => ({
                    recipient_user_id: userId,
                    sent_by: authUserId,
                    message: message,
                    link_to: `prezenta`, 
                    sender_sportiv_id: currentUser.id
                }));
                
                const { error: notifError } = await supabase.from('notificari').insert(notificationsToInsert);

                if (notifError) {
                    throw notifError;
                }
            }
        } catch (error: any) {
            console.warn("Notificarea către instructori a eșuat, dar statusul prezenței a fost salvat cu succes.", error);
        }
    };
    // --- End Logic ---

    const currentGrad = useMemo(() => {
        const officialGrad = getGrad(viewedUser.grad_actual_id, grade);
        if (officialGrad) return officialGrad;

        const admittedParticipations = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, examen: (examene || []).find(e => e.id === p.sesiune_id) }))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
        
        return getGrad(admittedParticipations[0]?.grad_vizat_id || null, grade);
    }, [participari, viewedUser.grad_actual_id, viewedUser.id, grade, examene]);
    
    const sumaRestanta = useMemo(() => {
        return (plati || [])
            .filter(p => 
                (p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id)) &&
                (p.status === 'Neachitat' || p.status === 'Achitat Parțial')
            )
            .reduce((sum, p) => sum + p.suma, 0);
    }, [viewedUser, plati]);

    const grupaCurenta = useMemo(() => {
        return (grupe || []).find(g => g.id === viewedUser.grupa_id)?.denumire || 'Fără grupă';
    }, [viewedUser.grupa_id, grupe]);

    const allGradesWithDates = useMemo(() => {
        const examDateMap = new Map((examene || []).map(e => [e.id, e.data]));
        const admittedParticipations = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .sort((a, b) => {
                const dateA = examDateMap.get(a.sesiune_id) || '9999-12-31';
                const dateB = examDateMap.get(b.sesiune_id) || '9999-12-31';
                // FIX: Explicitly cast date strings to resolve TypeScript inference issue with the 'new Date()' constructor.
                return new Date(dateB as string).getTime() - new Date(dateA as string).getTime();
            });

        const obtainedGradesMap = new Map<string, string>();
        admittedParticipations.forEach(p => {
            const examDate = examDateMap.get(p.sesiune_id);
            // FIX: Explicitly cast 'grad_vizat_id' to string to resolve a type inference issue where it was being treated as 'unknown'.
            if (examDate && !obtainedGradesMap.has(p.grad_vizat_id)) {
                // FIX: Explicitly cast 'grad_vizat_id' to string to resolve a type inference issue where it was being treated as 'unknown'.
                obtainedGradesMap.set(p.grad_vizat_id, examDate);
            }
        });

        const fullGradeList = [...(grade || [])]
            .sort((a, b) => a.ordine - b.ordine)
            .map(g => ({
                ...g,
                data_obtinere: obtainedGradesMap.get(g.id) || null
            }));

        if (isViewingOwnProfile && !permissions.hasAdminAccess) {
            const currentGradOrder = currentGrad?.ordine ?? 0;
            return fullGradeList.filter(g => g.ordine <= currentGradOrder);
        }
        
        return fullGradeList;
    }, [grade, participari, examene, viewedUser.id, currentGrad, isViewingOwnProfile, permissions]);

    return (
        <div className="space-y-6">
            <header className="text-center md:text-left border-b border-slate-700/50 pb-4">
                <h1 className="text-3xl font-bold text-white">{viewedUser.nume} {viewedUser.prenume}</h1>
                <p className="text-lg text-slate-300">{grupaCurenta}</p>
                {isViewingOwnProfile && (
                    <div className="mt-4 max-w-md mx-auto md:mx-0">
                        <NotificationPermissionWidget />
                    </div>
                )}
            </header>

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
            
            {isViewingOwnProfile && (
                 <Card className="animate-fade-in-down" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-lg font-bold text-white mb-4">🗓️ Program Următor</h3>
                    {upcomingTrainings.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingTrainings.map(training => (
                                <div key={training.id} className="bg-slate-800/50 p-3 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white">{new Date(training.data + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        <p className="text-sm text-slate-400">Ora: {training.ora_start}</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-600 text-slate-200">
                                        {training.grupe?.denumire || 'Vacanță'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic">Niciun antrenament programat în următoarele zile.</p>
                    )}
                </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 md:col-span-2">
                    <AttendanceTracker currentUser={currentUser} antrenamente={antrenamente} onNavigate={onNavigate} />
                </div>
                <Card className="flex flex-col items-center text-center">
                    <h3 className="text-base font-semibold uppercase tracking-wider text-slate-400">Progres Tehnic</h3>
                    <div className="my-4 flex-grow flex flex-col justify-center">
                        <p className="text-sm text-slate-500">Grad Actual</p>
                        <p className="text-3xl font-bold text-brand-secondary">{currentGrad?.nume || 'Începător'}</p>
                    </div>
                    <Button onClick={() => onNavigate('istoric-examene')} variant="secondary" className="w-full mt-2">
                        📜 Istoric Examene
                    </Button>
                </Card>

                <Card className="flex flex-col items-center text-center">
                     <h3 className="text-base font-semibold uppercase tracking-wider text-slate-400">Situație Financiară</h3>
                     <div className="my-4 flex-grow flex flex-col justify-center">
                        <p className="text-sm text-slate-500">Sumă Restantă</p>
                        <p className={`text-3xl font-bold ${sumaRestanta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {sumaRestanta.toFixed(2)} RON
                        </p>
                     </div>
                     <Button onClick={() => onNavigate('istoric-plati')} variant="secondary" className="w-full mt-2">
                        💳 Istoric Plăți
                    </Button>
                </Card>
            </div>

            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Progres Tehnic (Grade Obținute)</h3>
                {allGradesWithDates.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                        {allGradesWithDates.map(g => (
                            <div key={g.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-md">
                                <p className={`font-semibold ${g.data_obtinere ? 'text-white' : 'text-slate-500'}`}>{g.nume}</p>
                                {g.data_obtinere ? (
                                    <p className="text-sm text-brand-secondary font-bold">{new Date(g.data_obtinere + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                                ) : (
                                    <p className="text-sm text-slate-600 italic">--</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 italic">Niciun grad obținut încă.</p>
                )}
            </Card>
        </div>
    );
};