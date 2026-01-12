import React, { useMemo } from 'react';
import { Sportiv, Participare, Examen, Grad, Antrenament, Grupa, Plata, User, Familie, Tranzactie } from '../types';
import { Card } from './ui';
import { UsersIcon, ShieldCheckIcon } from './icons';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);

const DataField: React.FC<{label: string, value: React.ReactNode, className?: string}> = ({label, value, className}) => (
    <div className={className}>
        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 text-md text-white font-bold">{value || 'N/A'}</dd>
    </div>
);

interface SportivDashboardProps {
  currentUser: User;
  viewedUser: User;
  onSwitchView: (memberId: string) => void;
  participari: Participare[];
  examene: Examen[];
  grade: Grad[];
  antrenamente: Antrenament[];
  grupe: Grupa[];
  plati: Plata[];
  tranzactii: Tranzactie[];
  sportivi: Sportiv[];
  familii: Familie[];
  onNavigateToDashboard: () => void;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({ currentUser, viewedUser, onSwitchView, participari, examene, grade, antrenamente, grupe, plati, sportivi, familii, onNavigateToDashboard, tranzactii }) => {
    
    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === viewedUser.id), [participari, viewedUser.id]);
    const sportivAntrenamente = useMemo(() => antrenamente.filter(p => p.sportivi_prezenti_ids.includes(viewedUser.id)).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()), [antrenamente, viewedUser.id]);
    
    const admittedParticipations = useMemo(() => {
        return sportivParticipari
            .filter(p => p.rezultat === 'Admis')
            .map(p => ({
                ...p,
                grad: getGrad(p.grad_sustinut_id, grade),
                examen: examene.find(e => e.id === p.examen_id)
            }))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
    }, [sportivParticipari, grade, examene]);

    const currentGrad = admittedParticipations[0]?.grad;

    const prezenteLunaCurenta = useMemo(() => {
        const lunaCurenta = new Date().getMonth();
        const anulCurent = new Date().getFullYear();
        return sportivAntrenamente.filter(p => { const d = new Date(p.data); return d.getMonth() === lunaCurenta && d.getFullYear() === anulCurent; }).length;
    }, [sportivAntrenamente]);

    const isAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor'), [currentUser.roluri]);
    const isViewingOwnProfile = currentUser.id === viewedUser.id;
    
    const { sold } = useMemo(() => {
        const relevantPlati = plati.filter(p => p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id));
        const relevantTranzactii = tranzactii.filter(t => t.sportiv_id === viewedUser.id || (t.familie_id && t.familie_id === viewedUser.familie_id));
        const totalDatorii = relevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = relevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        return { sold: totalIncasari - totalDatorii };
    }, [viewedUser, plati, tranzactii]);

    return (
        <div className="space-y-6" style={{ fontSize: '13px' }}>
            {isAdmin && (
                <Card className="bg-sky-600/10 border border-sky-500/30">
                     <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-8 h-8 text-sky-400"/>
                        <div>
                            <h3 className="font-bold text-white">Mod Vizualizare Portal Propriu (Admin)</h3>
                            <p className="text-sm text-sky-300">Acesta este portalul dvs. de sportiv. Vă puteți întoarce oricând la panoul de administrare.</p>
                        </div>
                    </div>
                </Card>
            )}

            <h1 className="text-3xl font-bold text-white">Bun venit, {viewedUser.prenume}!</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 space-y-4">
                     <h3 className="text-xl font-bold text-white mb-2" style={{color: '#3D3D99'}}>Prezențe</h3>
                     <DataField label="Antrenamente luna aceasta" value={`${prezenteLunaCurenta} ședințe`} />
                     <div>
                        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ultimele prezențe</dt>
                        <ul className="mt-1 space-y-1">
                            {sportivAntrenamente.slice(0, 5).map(a => (
                                <li key={a.id} className="text-sm text-slate-300 bg-slate-700/50 px-2 py-1 rounded-md flex justify-between">
                                    <span>{new Date(a.data).toLocaleDateString('ro-RO')}</span>
                                    <span className="text-slate-400">{a.ora_start}</span>
                                </li>
                            ))}
                            {sportivAntrenamente.length === 0 && <li className="text-sm text-slate-500 italic">Nicio prezență înregistrată.</li>}
                        </ul>
                     </div>
                </Card>
                
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-4" style={{color: '#3D3D99'}}>Evoluție Tehnică</h3>
                    <DataField label="Grad Actual" value={currentGrad?.nume || <span className="text-sky-400 italic">Începător</span>} />
                    
                    <div className="mt-4 overflow-x-auto">
                        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Istoric Examinări</dt>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="p-2">Data</th>
                                    <th className="p-2">Grad</th>
                                    <th className="p-2 text-center">Tehnică</th>
                                    <th className="p-2 text-center">Thao Quyen</th>
                                    <th className="p-2 text-center">Media</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {admittedParticipations.map(p => {
                                    const media = (p.nota_tehnica != null && p.nota_thao_quyen != null) ? ((p.nota_tehnica + p.nota_thao_quyen) / 2).toFixed(2) : 'N/A';
                                    return (
                                        <tr key={p.id}>
                                            <td className="p-2">{p.examen?.data}</td>
                                            <td className="p-2 font-semibold">{p.grad?.nume}</td>
                                            <td className="p-2 text-center">{p.nota_tehnica ?? '-'}</td>
                                            <td className="p-2 text-center">{p.nota_thao_quyen ?? '-'}</td>
                                            <td className="p-2 text-center font-bold">{media}</td>
                                        </tr>
                                    );
                                })}
                                {admittedParticipations.length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">Niciun examen promovat.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="lg:col-span-3">
                     <h3 className="text-xl font-bold text-white mb-2" style={{color: '#3D3D99'}}>Situație Financiară</h3>
                     <div className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                        <span className="font-semibold text-slate-300">Sold Curent Cont</span>
                        <span className={`text-2xl font-bold ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {sold.toFixed(2)} RON
                            <span className="ml-2 text-xs uppercase">{sold >= 0 ? '(Credit)' : '(Datorie)'}</span>
                        </span>
                     </div>
                </Card>
            </div>
        </div>
    );
};
