import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, InscriereExamen, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen, ProgramItem, Antrenament, Permissions, Rol, IstoricGrade } from '../types';
import { Card, Button } from './ui';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { AttendanceTracker } from './AttendanceTracker';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { CheckIcon, ExclamationTriangleIcon, ArrowLeftIcon } from './icons';
import { GradBadge } from '../utils/grades';
import { AntrenamenteViitoare } from './AntrenamenteViitoare';

interface EligibilityResult {
    eligible: boolean;
    reason: string;
    nextGrad?: Grad;
}

// Placeholder for getEligibleGrade function
const getEligibleGrade = (currentGradId: string | null, istoricGrade: IstoricGrade[], allGrades: Grad[]): EligibilityResult => {
    if (!currentGradId) {
        return { eligible: false, reason: "Sportivul nu are un grad actual." };
    }

    const currentGrad = allGrades.find(g => g.id === currentGradId);
    if (!currentGrad) {
        return { eligible: false, reason: "Gradul actual nu a fost găsit." };
    }

    const nextGradIndex = allGrades.findIndex(g => g.id === currentGradId) + 1;
    const nextGrad = allGrades[nextGradIndex];

    if (!nextGrad) {
        return { eligible: false, reason: "Nu există un grad superior disponibil." };
    }

    // Find the last exam date for the current grade
    const lastExamForCurrentGrade = istoricGrade
        .filter(hg => hg.sportiv_id === currentGrad.id) // Assuming istoricGrade stores sportiv_id and grad_id
        .sort((a, b) => new Date(b.data_obtinere).getTime() - new Date(a.data_obtinere).getTime())[0];

    if (!lastExamForCurrentGrade) {
        return { eligible: false, reason: `Nu s-a găsit nicio înregistrare de examen pentru gradul ${currentGrad.nume}.` };
    }

    const lastExamDate = new Date(lastExamForCurrentGrade.data_obtinere);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6); // Hypothetical 6-month waiting period

    if (lastExamDate > sixMonthsAgo) {
        return { eligible: false, reason: `Trebuie să treacă cel puțin 6 luni de la ultimul examen (${lastExamDate.toLocaleDateString('ro-RO')}) pentru a avansa la gradul ${nextGrad.nume}.` };
    }

    return { eligible: true, reason: "Sportivul este eligibil pentru următorul grad.", nextGrad: nextGrad };
};


const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;

// --- Componenta Viza Medicala ---
const VizaMedicalaCard: React.FC<{ plati: Plata[]; sportivId: string }> = ({ plati, sportivId }) => {
    const vizaInfo = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        // Sezonul este Septembrie - August
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
        const seasonStartDate = new Date(seasonStartYear, 8, 1);
        
        const vizaPlata = plati.find(p => 
            p.sportiv_id === sportivId && 
            p.tip === 'Taxa Anuala' && 
            p.status === 'Achitat' && 
            new Date(p.data) >= seasonStartDate
        );

        const isValid = !!vizaPlata;
        return {
            isValid,
            season: `${seasonStartYear}-${seasonStartYear + 1}`,
            paymentDate: vizaPlata ? new Date(vizaPlata.data).toLocaleDateString('ro-RO') : null,
        };
    }, [plati, sportivId]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-3">Viză Medicală Anuală</h3>
            <div className={`p-4 rounded-lg border text-center ${vizaInfo.isValid ? 'bg-green-900/30 border-green-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
                <div className="flex justify-center items-center gap-2">
                    {!vizaInfo.isValid && <ExclamationTriangleIcon className="w-6 h-6 text-red-300"/>}
                    <p className={`text-xl font-black ${vizaInfo.isValid ? 'text-green-300' : 'text-red-300'}`}>
                        {vizaInfo.isValid ? 'VALIDĂ' : 'EXPIRATĂ / NEÎNREGISTRATĂ'}
                    </p>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                    {vizaInfo.isValid ? `Achitată la ${vizaInfo.paymentDate} pentru sezonul ${vizaInfo.season}.` : `Este necesară taxa anuală pentru sezonul ${vizaInfo.season}.`}
                </p>
            </div>
        </Card>
    );
};

// --- Componenta Istoric Grade ---
const IstoricGradeCard: React.FC<{ 
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    sportivId: string;
}> = ({ grade, istoricGrade, sportivId }) => {
    
    const gradeHistory = useMemo(() => {
        return istoricGrade
            .filter(hg => hg.sportiv_id === sportivId)
            .map(hg => {
                const grad = grade.find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return {
                    date: hg.data_obtinere,
                    grad,
                    source: hg.sesiune_examen_id ? 'Examen' : 'Manual'
                };
            })
            .filter((g): g is { date: string; grad: Grad; source: string } => g !== null)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [grade, istoricGrade, sportivId]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-2">Istoric Grade</h3>
            <div className="max-h-48 overflow-y-auto pr-2">
                 <table className="w-full text-left text-sm">
                    <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-[var(--bg-card)]">
                        <tr>
                            <th className="py-2">Grad</th>
                            <th className="py-2 text-right">Data Obținerii</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {gradeHistory.map((item, index) => (
                            <tr key={index}>
                                <td className="py-2 font-semibold">
                                    <GradBadge grad={item.grad} />
                                </td>
                                <td className="py-2 text-right">{new Date(item.date).toLocaleDateString('ro-RO')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {gradeHistory.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Niciun grad obținut.</p>}
            </div>
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
    
    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        // Check eligibility for grade change if the action implies it (e.g., 'Confirm' status for a specific training type)
        // This part needs to be refined based on actual business logic for grade changes.
        // For demonstration, let's assume 'Confirm' status for a specific training might trigger a check.
        // You would typically check the training type here, e.g., if (training.type === 'ExamPreparation')
        if (status === 'Confirm') { // Simplified for now, assuming any 'Confirm' triggers check
            const eligibility = getEligibleGrade(viewedUser.grad_actual_id, istoricGrade, grade);
            if (!eligibility.eligible) {
                showError("Neeligibil pentru grad superior", eligibility.reason);
                return; // Prevent status change if not eligible
            }
            showSuccess("Eligibil pentru grad superior", `Sportivul este eligibil pentru gradul: ${eligibility.nextGrad?.nume || 'Necunoscut'}`);
        }

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
                .single();
            
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
            throw error;
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

    return (
        <div className="space-y-6">
            <header className="text-center md:text-left border-b border-slate-700/50 pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{viewedUser.nume} {viewedUser.prenume}</h1>
                    <div className="mt-2">
                       <GradBadge grad={currentGrad} isLarge />
                    </div>
                    
                    {isViewingOwnProfile && (
                        <div className="mt-4 max-w-md mx-auto md:mx-0">
                            <NotificationPermissionWidget />
                        </div>
                    )}
                </div>
                {isViewingOwnProfile && (
                    <Button variant="primary" onClick={() => onNavigate('istoric-plati')} className="w-full md:w-auto">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Portofelul Meu
                    </Button>
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
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                     <AttendanceTracker currentUser={viewedUser} antrenamente={antrenamente} onNavigate={onNavigate} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <AntrenamenteViitoare currentUser={viewedUser} antrenamente={antrenamente} grupe={grupe} anunturi={anunturi} />
                    <VizaMedicalaCard plati={plati} sportivId={viewedUser.id} />
                    <IstoricGradeCard grade={grade} istoricGrade={istoricGrade} sportivId={viewedUser.id} />
                </div>
            </div>

            {canSwitchRoles && (
                <Card className="animate-fade-in-down" style={{ animationDelay: '300ms' }}>
                    <h3 className="text-lg font-bold text-white mb-4">Comută Rol Activ</h3>
                    <div className="flex flex-wrap gap-2">
                        {currentUser.roluri.map(rol => (
                            <Button 
                                key={rol.id}
                                variant={activeRole === rol.nume ? 'primary' : 'secondary'}
                                onClick={() => onSwitchRole(rol.nume)}
                                disabled={isSwitchingRole}
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
