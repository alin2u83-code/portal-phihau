import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sportiv, Plata, Grad } from '../types';
import { Card, Input, Button } from './ui';
import { UsersIcon, ExclamationTriangleIcon, SearchIcon } from './icons';
import { GradBadge } from '../utils/grades';

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; onClick: () => void; }> = ({ title, value, icon: Icon, color, onClick }) => (
    <div onClick={onClick} className="group relative bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border-color)] cursor-pointer hover:border-brand-primary/50 transition-all">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-bold uppercase text-slate-400">{title}</p>
                <p className={`text-5xl font-black mt-2 ${color}`}>{value}</p>
            </div>
            <Icon className="w-10 h-10 text-slate-600" />
        </div>
        <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Vezi detalii &rarr;
        </div>
    </div>
);

interface AdminDashboardProps {
  currentUser: User | null;
  sportivi: Sportiv[];
  plati: Plata[];
  grade: Grad[];
  onViewSportiv: (sportiv: Sportiv) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, sportivi, plati, grade, onViewSportiv }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const stats = useMemo(() => {
        const sportiviActivi = (sportivi || []).filter(s => s.status === 'Activ');

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        // Sezonul începe în septembrie (luna 8, index 0)
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
        
        const sportiviCuVizaValida = new Set(
            (plati || [])
                .filter(p => {
                    if (p.tip !== 'Taxa Anuala' || p.status !== 'Achitat' || !p.sportiv_id) return false;
                    const paymentDate = new Date(p.data);
                    // Verifică dacă plata este în sezonul curent
                    return paymentDate.getFullYear() > seasonStartYear || 
                           (paymentDate.getFullYear() === seasonStartYear && paymentDate.getMonth() >= 8);
                })
                .map(p => p.sportiv_id)
        );

        const vizeExpirate = sportiviActivi.filter(s => !sportiviCuVizaValida.has(s.id)).length;

        return {
            totalSportivi: sportiviActivi.length,
            vizeExpirate,
        };
    }, [sportivi, plati]);

    const filteredSportivi = useMemo(() => {
        if (!sportivi) return [];
        return sportivi
            .filter(s => s.status === 'Activ' && `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.nume.localeCompare(b.nume))
            .slice(0, 10); // Afișează doar primele 10 rezultate pe dashboard
    }, [sportivi, searchTerm]);

    if (!currentUser) {
        return <div className="text-center p-8">Se încarcă datele utilizatorului...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in-down">
            <h1 className="text-3xl font-bold text-white">Dashboard Club: <span className="text-brand-secondary">{currentUser.cluburi?.nume || 'Phi Hau Iași'}</span></h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiCard title="Sportivi Activi" value={stats.totalSportivi} icon={UsersIcon} color="text-green-400" onClick={() => navigate('/sportivi')} />
                <KpiCard title="Vize Expirate" value={stats.vizeExpirate} icon={ExclamationTriangleIcon} color={stats.vizeExpirate > 0 ? 'text-red-400' : 'text-green-400'} onClick={() => navigate('/taxe-anuale')} />
            </div>

            <Card>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-white">Membri Club (Recent Activi)</h2>
                    <div className="relative w-full md:w-64">
                         <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                         <Input label="" placeholder="Caută sportiv..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="!pl-10" />
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-slate-400 uppercase">
                            <tr>
                                <th className="p-2">Nume Complet</th>
                                <th className="p-2">Grad</th>
                                <th className="p-2 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredSportivi.map(s => {
                                const currentGrade = (grade || []).find(g => g.id === s.grad_actual_id);
                                return (
                                    <tr key={s.id} className="hover:bg-slate-700/50">
                                        <td className="p-2 font-medium">{s.nume} {s.prenume}</td>
                                        <td className="p-2"><GradBadge grad={currentGrade} className="text-[10px]" /></td>
                                        <td className="p-2 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => onViewSportiv(s)}>Vezi Profil</Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredSportivi.length === 0 && <p className="text-center p-8 text-slate-500">Niciun sportiv găsit.</p>}
                </div>
                 <div className="mt-4 text-center">
                    <Button onClick={() => navigate('/sportivi')} variant="primary">Vezi toți sportivii</Button>
                 </div>
            </Card>
        </div>
    );
};

export default AdminDashboard;
