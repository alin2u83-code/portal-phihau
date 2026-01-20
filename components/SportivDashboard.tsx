import React, { useMemo } from 'react';
import { Sportiv, Participare, Grad, Grupa, Plata, User, View, AnuntPrezenta, SesiuneExamen } from '../types';
import { Card, Button } from './ui';
import { AnuntPrezentaWidget } from './AnuntPrezentaWidget';
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
  antrenamente: any[]; // Prop needed for AnuntPrezentaWidget
  anunturi: AnuntPrezenta[]; // Prop needed for AnuntPrezentaWidget
  setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>; // Prop needed for AnuntPrezentaWidget
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({ currentUser, viewedUser, participari, examene, grade, grupe, plati, onNavigate, antrenamente, anunturi, setAnunturi }) => {
    
    const isViewingOwnProfile = currentUser.id === viewedUser.id;

    const currentGrad = useMemo(() => {
        const admittedParticipations = participari
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, examen: examene.find(e => e.id === p.sesiune_id) }))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
        
        return getGrad(admittedParticipations[0]?.grad_sustinut_id || null, grade);
    }, [participari, viewedUser.id, grade, examene]);
    
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

    return (
        <div className="space-y-6">
            {isViewingOwnProfile && <NotificationPermissionWidget />}
            {isViewingOwnProfile && <AnuntPrezentaWidget currentUser={currentUser} antrenamente={antrenamente} anunturi={anunturi} setAnunturi={setAnunturi} />}
            
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
        </div>
    );
};
