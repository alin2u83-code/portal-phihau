import React, { useMemo } from 'react';
import { User, View, DecontFederatie, Antrenament, Sportiv, Grupa, InscriereExamen, Plata, AnuntPrezenta, SesiuneExamen, Grad, Permissions, Rol, IstoricGrade, Familie } from '../types';
import { GeneralAttendanceWidget } from './GeneralAttendanceWidget';
import { AdminMasterMap } from './AdminMasterMap';
import { SportivDashboard } from './SportivDashboard';
import { Card, Button } from './ui';
import { UsersIcon, ChartBarIcon, BanknotesIcon, TrophyIcon, PlusIcon, WalletIcon, FileTextIcon } from './icons';

// Props
interface FinalUnifiedDashboardProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    permissions: Permissions;
    inscrieriExamene: InscriereExamen[];
    plati: Plata[];
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    sportivi: Sportiv[];
    grade: Grad[];
    grupe: Grupa[];
    sesiuniExamene: SesiuneExamen[];
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    istoricGrade: IstoricGrade[];
    familii: Familie[];
}

const StatCard: React.FC<{
    icon: React.ElementType,
    title: string,
    value: string | number,
    description: string,
    colorClass: string
}> = ({ icon: Icon, title, value, description, colorClass }) => (
    <Card className={`relative overflow-hidden border-l-4 ${colorClass}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-bold uppercase text-slate-400 tracking-wider">{title}</p>
                <p className="text-4xl font-black text-white mt-1">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
            <Icon className="w-10 h-10 text-slate-700" />
        </div>
    </Card>
);


// Main Component
export const FinalUnifiedDashboard: React.FC<FinalUnifiedDashboardProps> = (props) => {
    const { currentUser, onNavigate, deconturiFederatie, permissions, inscrieriExamene, plati, onSwitchRole, isSwitchingRole, antrenamente, sportivi, grade, istoricGrade, familii, ...sportivDashboardProps } = props;

    if (!currentUser) {
        return (
             <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
                <svg className="animate-spin h-8 w-8 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h1 className="text-xl font-bold text-white">Se încarcă...</h1>
            </div>
        );
    }
    
    // NEW Admin Club Dashboard
    if (permissions.isAdminClub) {
        const stats = useMemo(() => {
            const activeSportivi = (sportivi || []).filter(s => s.status === 'Activ').length;
            const totalDebt = (plati || []).filter(p => p.status === 'Neachitat' || p.status === 'Achitat Parțial').reduce((sum, p) => sum + p.suma, 0);

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const weeklyTrainings = (antrenamente || []).filter(a => new Date(a.data) >= sevenDaysAgo);
            const totalPresent = weeklyTrainings.reduce((sum, a) => sum + (a.sportivi_prezenti_ids || []).length, 0);
            const totalExpected = weeklyTrainings.reduce((sum, a) => {
                const groupMembers = (sportivi || []).filter(s => s.grupa_id === a.grupa_id && s.status === 'Activ').length;
                return sum + groupMembers;
            }, 0);
            const weeklyAttendance = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
            
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const examCandidates = (sportivi || []).filter(s => {
                if (s.status !== 'Activ' || !s.grad_actual_id) return false;
                const lastPromo = (istoricGrade || []).filter(ig => ig.sportiv_id === s.id).sort((a,b) => new Date(b.data_obtinere).getTime() - new Date(a.data_obtinere).getTime())[0];
                const lastDate = new Date(lastPromo ? lastPromo.data_obtinere : s.data_inscrierii);
                return lastDate <= sixMonthsAgo;
            }).length;

            return { activeSportivi, totalDebt, weeklyAttendance, examCandidates };
        }, [sportivi, plati, antrenamente, istoricGrade]);

        const last5Registered = useMemo(() => {
            return [...(sportivi || [])].sort((a,b) => new Date(b.data_inscrierii).getTime() - new Date(a.data_inscrierii).getTime()).slice(0,5);
        }, [sportivi]);
        
        const top5Debtors = useMemo(() => {
            const debtMap = new Map<string, { name: string, debt: number, type: 'familie' | 'sportiv' }>();
            (plati || []).forEach(p => {
                if (p.status === 'Neachitat' || p.status === 'Achitat Parțial') {
                    if (p.familie_id) {
                        const familie = (familii || []).find(f => f.id === p.familie_id);
                        if (familie) {
                            const entry = debtMap.get(familie.id) || { name: `Familia ${familie.nume}`, debt: 0, type: 'familie' };
                            entry.debt += p.suma;
                            debtMap.set(familie.id, entry);
                        }
                    } else if (p.sportiv_id) {
                        const sportiv = (sportivi || []).find(s => s.id === p.sportiv_id && !s.familie_id);
                        if (sportiv) {
                            const entry = debtMap.get(sportiv.id) || { name: `${sportiv.nume} ${sportiv.prenume}`, debt: 0, type: 'sportiv' };
                            entry.debt += p.suma;
                            debtMap.set(sportiv.id, entry);
                        }
                    }
                }
            });
            return Array.from(debtMap.values()).sort((a, b) => b.debt - a.debt).slice(0, 5);
        }, [plati, sportivi, familii]);


        return (
             <div className="space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-white">Panou de Control Club</h1>
                    <p className="text-slate-400">Bine ai venit, {currentUser.prenume}!</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={UsersIcon} title="Membri Activi" value={stats.activeSportivi} description="Sportivi cu status 'Activ'" colorClass="border-red-600" />
                    <StatCard icon={ChartBarIcon} title="Prezență Săptămânală" value={`${stats.weeklyAttendance}%`} description="Media ultimelor 7 zile" colorClass="border-red-600" />
                    <StatCard icon={BanknotesIcon} title="Datorii Curente" value={`${stats.totalDebt.toFixed(0)}`} description="Suma totală neachitată" colorClass="border-red-600" />
                    <StatCard icon={TrophyIcon} title="Candidați Examen" value={stats.examCandidates} description="Stagiu de min. 6 luni" colorClass="border-red-600" />
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                         <Card>
                            <h3 className="text-lg font-bold text-white mb-3">Ultimii 5 Sportivi Înscriși</h3>
                            <div className="space-y-2">
                                {(last5Registered || []).map(s => (
                                    <div key={s.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-md">
                                        <p className="font-semibold text-white">{s.nume} {s.prenume}</p>
                                        <p className="text-xs text-slate-400">{new Date(s.data_inscrierii).toLocaleDateString('ro-RO')}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                         <Card>
                            <h3 className="text-lg font-bold text-white mb-3">Top 5 Datornici</h3>
                            <div className="space-y-2">
                                {(top5Debtors || []).map(d => (
                                    <div key={d.name} className="flex justify-between items-center bg-red-900/20 p-2 rounded-md">
                                        <p className="font-semibold text-white">{d.name}</p>
                                        <p className="font-bold text-red-500">{d.debt.toFixed(2)} RON</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                    <div>
                        <Card>
                             <h3 className="text-lg font-bold text-white mb-4">Acțiuni Rapide</h3>
                             <div className="flex flex-col gap-3">
                                <Button onClick={() => onNavigate('jurnal-incasari')} variant="secondary" className="justify-start"><WalletIcon className="w-5 h-5 mr-3"/> Înregistrează Plată</Button>
                                <Button onClick={() => onNavigate('sportivi')} variant="secondary" className="justify-start"><PlusIcon className="w-5 h-5 mr-3"/> Adaugă Sportiv Nou</Button>
                                <Button onClick={() => onNavigate('examene')} variant="secondary" className="justify-start"><FileTextIcon className="w-5 h-5 mr-3"/> Generează Listă Examen</Button>
                             </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // Other Admin Views (Federation, Instructor)
    if (permissions.hasAdminAccess) {
        return (
            <div className="space-y-8 animate-fade-in-down">
                <header>
                    <h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1>
                    <p className="text-slate-400">Selectează un modul pentru a începe.</p>
                </header>
                
                 <SportivDashboard 
                    currentUser={currentUser}
                    viewedUser={currentUser} 
                    participari={inscrieriExamene}
                    examene={sportivDashboardProps.sesiuniExamene}
                    plati={plati}
                    onNavigate={onNavigate}
                    permissions={permissions}
                    {...sportivDashboardProps}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-700">
                    <div className="lg:col-span-2">
                        <AdminMasterMap 
                            onNavigate={onNavigate}
                            deconturiFederatie={deconturiFederatie}
                            inscrieriExamene={inscrieriExamene}
                            plati={plati}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        {(permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin) && (
                            <GeneralAttendanceWidget currentUser={currentUser} />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Sportiv View
    return (
         <div className="space-y-8">
            <SportivDashboard 
                currentUser={currentUser}
                viewedUser={currentUser} 
                participari={inscrieriExamene}
                examene={sportivDashboardProps.sesiuniExamene}
                plati={plati}
                onNavigate={onNavigate}
                permissions={permissions}
                {...sportivDashboardProps}
            />
        </div>
    );
};