import React, { useMemo, useState } from 'react';
import { Sportiv, Participare, Examen, Grad, Antrenament, Grupa, Plata, User, Familie, Tranzactie, TipAbonament, View } from '../types';
import { Card, Button } from './ui';
import { ShieldCheckIcon, CogIcon, ArchiveBoxIcon, DocumentArrowDownIcon } from './icons';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);
const zileSaptamana: Record<number, string> = { 0: 'Duminică', 1: 'Luni', 2: 'Marți', 3: 'Miercuri', 4: 'Joi', 5: 'Vineri', 6: 'Sâmbătă' };


const DataField: React.FC<{label: string, value: React.ReactNode, className?: string}> = ({label, value, className}) => (
    <div className={className}>
        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 text-md text-white font-bold">{value || 'N/A'}</dd>
    </div>
);

const calculateDuration = (start: string, end: string | null): number => {
    if (!end) return 1.5; 
    try {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startH, startM);
        const endDate = new Date(0, 0, 0, endH, endM);
        if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
        return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    } catch (e) {
        return 1.5;
    }
};

const AdminQuickAccessBar: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => (
    <Card className="mb-6 bg-slate-700/30 border-slate-600">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <ShieldCheckIcon className="w-5 h-5 text-amber-400"/>
                <h4 className="font-bold text-white text-sm">Acces Rapid Admin</h4>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => onNavigate('setari-club')} size="sm" variant="secondary"><CogIcon className="w-4 h-4 mr-2"/> Setări Club</Button>
                <Button onClick={() => onNavigate('data-maintenance')} size="sm" variant="secondary"><ArchiveBoxIcon className="w-4 h-4 mr-2"/> Backup</Button>
            </div>
        </div>
    </Card>
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
  tipuriAbonament: TipAbonament[];
  onNavigate: (view: View) => void;
  onNavigateToDashboard: () => void;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = ({ currentUser, viewedUser, participari, examene, grade, antrenamente, grupe, plati, tranzactii, tipuriAbonament, onNavigate }) => {
    
    const [periodFilter, setPeriodFilter] = useState<'current_month' | 'current_year'>('current_month');
    
    const admittedParticipations = useMemo(() => {
        return participari.filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => ({ ...p, grad: getGrad(p.grad_sustinut_id, grade), examen: examene.find(e => e.id === p.examen_id) }))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
    }, [participari, viewedUser.id, grade, examene]);

    const currentGrad = admittedParticipations[0]?.grad;

    const isAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor'), [currentUser.roluri]);
    const isViewingOwnProfile = currentUser.id === viewedUser.id;
    
    const { sold, abonamentCurent } = useMemo(() => {
        const relevantPlati = plati.filter(p => p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id));
        const relevantTranzactii = tranzactii.filter(t => t.sportiv_id === viewedUser.id || (t.familie_id && t.familie_id === viewedUser.familie_id));
        const totalDatorii = relevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = relevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        const abonament = tipuriAbonament.find(ab => ab.id === viewedUser.tip_abonament_id);
        return { sold: totalIncasari - totalDatorii, abonamentCurent: abonament };
    }, [viewedUser, plati, tranzactii, tipuriAbonament]);
    
    const reportTrainings = useMemo(() => {
        const now = new Date();
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayCurrentYear = new Date(now.getFullYear(), 0, 1);

        const periodStart = periodFilter === 'current_month' ? firstDayCurrentMonth : firstDayCurrentYear;

        const allTrainingsForPeriod = antrenamente.filter(a => 
            (a.grupa_id === viewedUser.grupa_id || (viewedUser.participa_vacanta && !a.grupa_id)) && 
            new Date(a.data) >= periodStart
        );
        
        return allTrainingsForPeriod.map(a => ({
            ...a,
            status: a.sportivi_prezenti_ids.includes(viewedUser.id) ? 'Prezent' : 'Absent'
        })).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    }, [antrenamente, viewedUser, periodFilter]);

    const totalOre = useMemo(() => {
        return reportTrainings
            .filter(a => a.status === 'Prezent')
            .reduce((acc, curr) => acc + calculateDuration(curr.ora_start, curr.ora_sfarsit), 0);
    }, [reportTrainings]);

    return (
        <div className="space-y-6" style={{ fontSize: '13px' }}>
            {isAdmin && isViewingOwnProfile && <AdminQuickAccessBar onNavigate={onNavigate} />}

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">{viewedUser.nume} {viewedUser.prenume}</h1>
                    <p className="text-xl font-semibold" style={{ color: '#E5B80B' }}>{currentGrad?.nume || 'Începător'}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => alert('Funcționalitate în dezvoltare.')}><DocumentArrowDownIcon className="w-4 h-4 mr-2"/> Descarcă Raport PDF</Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 space-y-3">
                     <h3 className="text-xl font-bold mb-2" style={{color: '#3D3D99'}}>Detalii Sportiv</h3>
                     <DataField label="CNP" value={viewedUser.cnp} />
                     <DataField label="Data Nașterii" value={new Date(viewedUser.data_nasterii).toLocaleDateString('ro-RO')} />
                     <DataField label="Data Înscrierii" value={new Date(viewedUser.data_inscrierii).toLocaleDateString('ro-RO')} />
                     <DataField label="Telefon" value={viewedUser.telefon} />
                     <DataField label="Adresă" value={viewedUser.adresa} />
                     <DataField label="Antrenament Vacanță" value={viewedUser.participa_vacanta ? 'Da' : 'Nu'} />
                </Card>
                
                <Card className="lg:col-span-2 space-y-3">
                    <h3 className="text-xl font-bold mb-2" style={{color: '#3D3D99'}}>Evoluție Tehnică & Financiar</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DataField label="Abonament Curent" value={abonamentCurent?.denumire || 'N/A'} />
                        <div>
                             <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sold Cont</dt>
                             <dd className={`mt-1 text-2xl font-bold ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sold.toFixed(2)} RON
                                <span className="ml-2 text-xs uppercase">{sold >= 0 ? '(Credit)' : '(Datorie)'}</span>
                            </dd>
                        </div>
                    </div>
                    <div className="mt-4 overflow-x-auto pt-3 border-t border-slate-700">
                        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Istoric Examinări</dt>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-700/50"><tr><th className="p-2">Data</th><th className="p-2">Grad</th><th className="p-2 text-center">Tehnică</th><th className="p-2 text-center">Thao Quyen</th><th className="p-2 text-center">Media</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">{admittedParticipations.map(p => { const media = (p.nota_tehnica != null && p.nota_thao_quyen != null) ? ((p.nota_tehnica + p.nota_thao_quyen) / 2).toFixed(2) : 'N/A'; return (<tr key={p.id}><td className="p-2">{p.examen?.data}</td><td className="p-2 font-semibold">{p.grad?.nume}</td><td className="p-2 text-center">{p.nota_tehnica ?? '-'}</td><td className="p-2 text-center">{p.nota_thao_quyen ?? '-'}</td><td className="p-2 text-center font-bold">{media}</td></tr>);})}{admittedParticipations.length === 0 && (<tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">Niciun examen promovat.</td></tr>)}</tbody>
                        </table>
                    </div>
                </Card>

                <Card className="lg:col-span-3 bg-gradient-to-br from-slate-800/60 to-brand-primary/20">
                    <h3 className="text-xl font-bold mb-4" style={{color: '#3D3D99'}}>Raport Detaliat Antrenamente</h3>
                    <div className="flex gap-2 mb-4">
                        <Button variant={periodFilter === 'current_month' ? 'primary' : 'secondary'} size="sm" onClick={() => setPeriodFilter('current_month')}>Luna Curentă</Button>
                        <Button variant={periodFilter === 'current_year' ? 'primary' : 'secondary'} size="sm" onClick={() => setPeriodFilter('current_year')}>Anul Curent</Button>
                    </div>
                    <div className="overflow-x-auto max-h-64 border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-700/50 sticky top-0 backdrop-blur-sm"><tr><th className="p-2">Data</th><th className="p-2">Ziua</th><th className="p-2">Interval Orar</th><th className="p-2">Grupa</th><th className="p-2">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">{reportTrainings.map(a => { const grupa = grupe.find(g => g.id === a.grupa_id); const ziua = a.ziua || zileSaptamana[new Date(a.data).getUTCDay()]; return (<tr key={a.id}><td className="p-2">{new Date(a.data).toLocaleDateString('ro-RO')}</td><td className="p-2">{ziua}</td><td className="p-2">{a.ora_start} - {a.ora_sfarsit}</td><td className="p-2">{grupa?.denumire || 'Vacanță'}</td><td className={`p-2 font-bold ${a.status === 'Prezent' ? 'text-green-400' : 'text-red-400'}`}>{a.status}</td></tr>);})}{reportTrainings.length === 0 && (<tr><td colSpan={5} className="text-center text-slate-500 italic p-4">Nicio activitate în perioada selectată.</td></tr>)}</tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-right font-bold">Total Ore Acumulate (doar prezențe): <span className="text-brand-secondary text-lg">{totalOre.toFixed(1)} ore</span></div>
                </Card>
            </div>
        </div>
    );
};