import React, { useMemo } from 'react';
import { Sportiv, Participare, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen } from '../types';
import { Card, Button } from './ui';
import { AthleteQuickActions } from './AthleteQuickActions';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;

interface SportivDashboardProps {
  currentUser: User;
  viewedUser: User;
  participari: Participare[];
  examene: SesiuneExamen[];
  grade: Grad[];
  grupe: Grupa[];
  plati: Plata[];
  onNavigate: (view: View) => void;
  antrenamente: any[]; // Prop needed for AthleteQuickActions
  anunturi: AnuntPrezenta[]; // Prop needed for AthleteQuickActions
  setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({ currentUser, viewedUser, participari, examene, grade, grupe, plati, onNavigate, antrenamente, anunturi, setAnunturi }) => {
    
    const isViewingOwnProfile = currentUser.id === viewedUser.id;

    const currentGrad = useMemo(() => {
        const officialGrad = getGrad(viewedUser.grad_actual_id, grade);
        if (officialGrad) return officialGrad;

        const admittedParticipations = participari
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, examen: examene.find(e => e.id === p.sesiune_id) }))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
        
        return getGrad(admittedParticipations[0]?.grad_vizat_id || null, grade);
    }, [participari, viewedUser.grad_actual_id, viewedUser.id, grade, examene]);
    
    const sumaRestanta = useMemo(() => {
        return plati
            .filter(p => 
                (p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id)) &&
                (p.status === 'Neachitat' || p.status === 'Achitat Parțial')
            )
            .reduce((sum, p) => sum + p.suma, 0);
    }, [viewedUser, plati]);

    const grupaCurenta = useMemo(() => {
        return grupe.find(g => g.id === viewedUser.grupa_id)?.denumire || 'Fără grupă';
    }, [viewedUser.grupa_id, grupe]);

    const userParticipari = useMemo(() => {
        return participari
            .filter(p => p.sportiv_id === viewedUser.id)
            .map(p => {
                const sesiune = examene.find(s => s.id === p.sesiune_id);
                const grad = grade.find(g => g.id === p.grad_vizat_id);
                return {
                    ...p,
                    data_examen: sesiune?.data || 'N/A',
                    nume_grad: grad?.nume || 'N/A'
                };
            })
            .sort((a, b) => new Date(b.data_examen).getTime() - new Date(a.data_examen).getTime());
    }, [viewedUser.id, participari, examene, grade]);

    return (
        <div className="space-y-6">
            {isViewingOwnProfile && <NotificationPermissionWidget />}
            {isViewingOwnProfile && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white -mb-2">Acțiuni Rapide</h2>
                    <AthleteQuickActions currentUser={currentUser} antrenamente={antrenamente} anunturi={anunturi} setAnunturi={setAnunturi} />
                </div>
            )}
            
            <header className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-white">{viewedUser.nume} {viewedUser.prenume}</h1>
                <p className="text-lg text-slate-300">{grupaCurenta}</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Progres Tehnic */}
                <Card className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Progres Tehnic</h3>
                    <div className="my-4 flex-grow">
                        <p className="text-xs text-slate-500">Grad Actual</p>
                        <p className="text-3xl font-bold text-brand-secondary">{currentGrad?.nume || 'Începător'}</p>
                    </div>
                    <Button onClick={() => onNavigate('istoric-examene')} variant="secondary" className="w-full mt-2">
                        📜 Istoric Examene
                    </Button>
                </Card>

                {/* Card Situație Financiară */}
                <Card className="flex flex-col items-center md:items-start text-center md:text-left">
                     <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Situație Financiară</h3>
                     <div className="my-4 flex-grow">
                        <p className="text-xs text-slate-500">Sumă Restantă</p>
                        <p className={`text-3xl font-bold ${sumaRestanta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {sumaRestanta.toFixed(2)} RON
                        </p>
                     </div>
                     <Button onClick={() => onNavigate('facturi-personale')} variant="secondary" className="w-full mt-2">
                        💳 Vezi Facturi
                    </Button>
                </Card>
            </div>

            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Istoric Recent Examene</h3>
                {userParticipari.length > 0 ? (
                    <div className="space-y-3">
                        {userParticipari.slice(0, 3).map(p => (
                            <div key={p.id} className="bg-slate-800/50 p-3 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{p.nume_grad}</p>
                                    <p className="text-sm text-slate-400">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    p.rezultat === 'Admis' ? 'bg-green-600/20 text-green-400' :
                                    p.rezultat === 'Respins' ? 'bg-red-600/20 text-red-400' :
                                    'bg-slate-600/20 text-slate-400'
                                }`}>{p.rezultat || 'N/A'}</span>
                            </div>
                        ))}
                        {userParticipari.length > 3 && (
                            <Button onClick={() => onNavigate('istoric-examene')} variant="secondary" className="w-full mt-4">
                                Vezi tot istoricul
                            </Button>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-400 italic">Niciun examen susținut.</p>
                )}
            </Card>
        </div>
    );
};