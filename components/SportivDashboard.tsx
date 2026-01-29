import React, { useState, useMemo, useEffect } from 'react';
// FIX: Replaced deprecated type 'Participare' with 'InscriereExamen'.
import { Sportiv, InscriereExamen, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen, Antrenament, ProgramItem } from '../types';
import { Card, Button } from './ui';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { AttendanceTracker } from './AttendanceTracker';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { CheckIcon } from './icons';
import { Permissions } from '../hooks/usePermissions';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;

// --- Badge pentru Grad ---
const getGradStyle = (gradName: string): string => {
    const name = gradName.toLowerCase();
    if (name.includes('dang')) {
        if (name.includes('5')) return 'bg-black text-white border-2 border-yellow-400';
        if (name.includes('6') || name.includes('7')) return 'bg-white text-red-600 border-2 border-red-600';
        return 'bg-black text-white border-2 border-red-600';
    }
    if (name.includes('neagră')) return 'bg-black text-white';
    if (name.includes('violet')) return 'bg-violet-600 text-white';
    if (name.includes('roșu')) return 'bg-red-600 text-white';
    if (name.includes('albastru')) return 'bg-white text-blue-600 border border-blue-600';
    if (name.includes('galben')) return 'bg-yellow-400 text-black';
    return 'bg-slate-600 text-white'; // Default
};

const GradBadge: React.FC<{ grad: Grad | null | undefined }> = ({ grad }) => {
    if (!grad) return null;
    return (
        <span className={`px-3 py-1 text-sm font-bold rounded-full whitespace-nowrap ${getGradStyle(grad.nume)}`}>
            {grad.nume}
        </span>
    );
};


// --- Componenta Program Antrenament ---
const ProgramAntrenament: React.FC<{ grupaId: string | null; grupe: Grupa[] }> = ({ grupaId, grupe }) => {
    const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };

    const grupaCurenta = useMemo(() => grupe.find(g => g.id === grupaId), [grupaId, grupe]);
    
    const programSortat = useMemo(() => {
        if (!grupaCurenta?.program) return [];
        return [...grupaCurenta.program]
            .filter(p => p.is_activ !== false) // Show only active sessions
            .sort((a, b) => {
                const ziCompare = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
                if (ziCompare !== 0) return ziCompare;
                return a.ora_start.localeCompare(b.ora_start);
            });
    }, [grupaCurenta]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-2 animate-fade-in-down">Programul Meu de Antrenament</h3>
            {!grupaId || !grupaCurenta ? (
                <p className="text-sm text-slate-400 italic">Contactați instructorul pentru alocarea la o grupă.</p>
            ) : programSortat.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="py-2">Ziua</th>
                                <th className="py-2">Ora Start</th>
                                <th className="py-2">Ora Sfârșit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {programSortat.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-2 font-semibold">{item.ziua}</td>
                                    <td className="py-2">{item.ora_start}</td>
                                    <td className="py-2">{item.ora_sfarsit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-slate-400 italic">Grupa curentă nu are un program definit.</p>
            )}
        </Card>
    );
};


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
  participari: InscriereExamen[];
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
                    const index = prev.findIndex(a => a.id === data.id || (a.antrenament_id === data.antrenament_id && a.sportiv_id === data.sportiv_id));
                    if (index > -1) {
                        const newAnunturi = [...prev];
                        newAnunturi[index] = data;
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
                // FIX: Cast date strings to resolve potential 'unknown' type errors from TypeScript's inference.
                return new Date(dateB as string).getTime() - new Date(dateA as string).getTime();
            });

        const obtainedGradesMap = new Map<string, string>();
        admittedParticipations.forEach(p => {
            const examDate = examDateMap.get(p.sesiune_id);
            // FIX: The type of `p.grad_vizat_id` is inferred incorrectly. Casting it to `string` ensures type safety for the `Map` operations.
            if (examDate && !obtainedGradesMap.has(p.grad_vizat_id as string)) {
                // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
                // The type of `p.grad_vizat_id` is inferred incorrectly. Casting it to `string` ensures type safety for the `Map` operations.
                obtainedGradesMap.set(p.grad_vizat_id as string, examDate as string);
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
                <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
                    <GradBadge grad={currentGrad} />
                </div>
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
                            {upcomingTrainings.map(training => {
                                const trainingDate = new Date(training.data + 'T00:00:00');
                                return (
                                    <div key={training.id} className="flex items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-md bg-slate-700 text-brand-secondary flex-shrink-0">
                                            <span className="text-2xl font-black">{trainingDate.toLocaleDateString('ro-RO', { day: '2-digit' })}</span>
                                            <span className="text-xs font-bold uppercase">{trainingDate.toLocaleDateString('ro-RO', { month: 'short' })}</span>
                                        </div>
                                        <div className="flex-grow ml-4">
                                            <p className="font-bold text-white">{trainingDate.toLocaleDateString('ro-RO', { weekday: 'long' })}</p>
                                            <p className="text-sm text-slate-400">Ora: {training.ora_start}, Grupa: {training.grupe?.denumire || 'Vacanță'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic text-center py-4">Niciun antrenament programat în următoarele zile.</p>
                    )}
                </Card>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                     <AttendanceTracker currentUser={currentUser} antrenamente={antrenamente} onNavigate={onNavigate} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <ProgramAntrenament grupaId={viewedUser.grupa_id} grupe={grupe} />
                </div>
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