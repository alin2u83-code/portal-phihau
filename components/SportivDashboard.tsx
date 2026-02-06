import React, { useMemo } from 'react';
import { Sportiv, Grad, IstoricGrade, User, View, Permissions } from '../types';
import { Card } from './ui';
import { GradBadge, getGradStyle } from '../utils/grades';

const IstoricGradeCard: React.FC<{ 
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    sportivId: string;
}> = ({ grade, istoricGrade, sportivId }) => {
    
    const gradeHistory = useMemo(() => {
        return (istoricGrade || [])
            .filter(hg => hg.sportiv_id === sportivId)
            .map(hg => {
                const grad = grade.find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return {
                    date: hg.data_obtinere,
                    gradNume: grad.nume,
                    source: hg.sesiune_examen_id ? 'Examen' : 'Manual'
                };
            })
            .filter((g): g is { date: string; gradNume: string; source: string } => g !== null)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [grade, istoricGrade, sportivId]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-2">Istoric Grade (Thao Quyen / Co Vo Dao)</h3>
            <div className="max-h-96 overflow-y-auto pr-2">
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
                                     <span className={`inline-block rounded-full whitespace-nowrap text-center px-3 py-1 text-sm font-bold ${getGradStyle(item.gradNume)}`}>
                                        {item.gradNume}
                                    </span>
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


interface SportivDashboardProps {
  currentUser: User;
  viewedUser: User;
  grade: Grad[];
  istoricGrade: IstoricGrade[];
  onNavigate: (view: View) => void;
  permissions: Permissions;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({ viewedUser, grade, istoricGrade }) => {
    
    const currentGrad = useMemo(() => {
        return grade.find(g => g.id === viewedUser.grad_actual_id) || null;
    }, [viewedUser.grad_actual_id, grade]);

    return (
        <div className="space-y-6 animate-fade-in-down">
            <header className="text-center md:text-left border-b border-slate-700/50 pb-4">
                <h1 className="text-3xl font-bold text-white">{viewedUser.nume} {viewedUser.prenume}</h1>
                <div className="mt-2">
                   <GradBadge grad={currentGrad || {nume: 'Începător', ordine: 0} as Grad} isLarge />
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <h3 className="text-lg font-bold text-white mb-3">Profil Sportiv</h3>
                    <dl className="space-y-3 text-sm">
                        <div><dt className="text-slate-400">Club</dt><dd className="font-semibold">{viewedUser.cluburi?.nume || 'N/A'}</dd></div>
                        <div><dt className="text-slate-400">Data Înscrierii</dt><dd className="font-semibold">{new Date(viewedUser.data_inscrierii).toLocaleDateString('ro-RO')}</dd></div>
                    </dl>
                </Card>
                
                <IstoricGradeCard grade={grade} istoricGrade={istoricGrade} sportivId={viewedUser.id} />
            </div>
        </div>
    );
};
