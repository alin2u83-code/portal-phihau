import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sportiv, Plata, Grad, Grupa } from '../types';
import { Input, Button } from './ui';
import { WelcomeHero } from './WelcomeHero';
import { GradBadge } from '../utils/grades';
import { Users, CreditCard, ShieldCheck } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User | null;
  sportivi: Sportiv[];
  plati: Plata[];
  grade: Grad[];
  grupe: Grupa[];
  onViewSportiv: (sportiv: Sportiv) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, sportivi, plati, grade, grupe, onViewSportiv }) => {
    const navigate = useNavigate();

    const stats = useMemo(() => {
        if (!sportivi || !plati || !currentUser) {
            return { totalSportivi: 0, totalDatorii: 0, vizeExpirate: 0 };
        }
        
        const sportiviInClub = sportivi.filter(s => s.club_id === currentUser.club_id);
        const sportiviActivi = sportiviInClub.filter(s => s.status === 'Activ');
        const sportiviClubIds = new Set(sportiviInClub.map(s => s.id));
        const familiiClubIds = new Set(sportiviInClub.filter(s => s.familie_id).map(s => s.familie_id!));
        
        const totalDatorii = (plati || []).filter(p =>
            p.status !== 'Achitat' &&
            (sportiviClubIds.has(p.sportiv_id!) || (p.familie_id && familiiClubIds.has(p.familie_id)))
        ).reduce((sum, p) => sum + p.suma, 0);

        const today = new Date();
        const seasonStartYear = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
        
        const sportiviCuVizaValida = new Set(
            (plati || []).filter(p =>
                p.tip === 'Taxa Anuala' && p.status === 'Achitat' && sportiviClubIds.has(p.sportiv_id!) &&
                (new Date(p.data).getFullYear() > seasonStartYear || (new Date(p.data).getFullYear() === seasonStartYear && new Date(p.data).getMonth() >= 8))
            ).map(p => p.sportiv_id)
        );
        const vizeExpirate = sportiviActivi.filter(s => !sportiviCuVizaValida.has(s.id!)).length;

        return {
            totalSportivi: sportiviActivi.length,
            totalDatorii,
            vizeExpirate,
        };
    }, [sportivi, plati, currentUser]);

    const filteredSportivi = useMemo(() => {
        if (!sportivi || !currentUser?.club_id) return [];
        return sportivi
            .filter(s => s.club_id === currentUser.club_id && s.status === 'Activ')
            .sort((a,b) => a.nume.localeCompare(b.nume))
            .slice(0, 10); // Afișează primii 10 pentru un dashboard curat
    }, [sportivi, currentUser]);

    if (!currentUser) {
        return <div className="text-center p-8">Se încarcă datele utilizatorului...</div>;
    }

    const statCards = [
      { label: 'Membri Activi', value: stats.totalSportivi, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { label: 'Total Datorii', value: `${stats.totalDatorii.toFixed(2)} lei`, icon: CreditCard, color: 'text-rose-400', bg: 'bg-rose-500/10' },
      { label: 'Vize Medicale Expirate', value: stats.vizeExpirate, icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-8">
            <WelcomeHero profile={currentUser} />

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, i) => (
                <div key={i} className={`${stat.bg} p-6 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all shadow-sm`}>
                    <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                        <h3 className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                    </div>
                </div>
                ))}
            </div>

            {/* DATA TABLE SECTION */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white">Sportivi Recenți / Activi</h3>
                    <Button onClick={() => navigate('/sportivi')} variant="secondary" size="sm">Vezi Toți Sportivii</Button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Nume Sportiv</th>
                        <th className="px-6 py-4 font-semibold">Grad Actual</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Acțiuni</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                    {filteredSportivi.length > 0 ? (
                        filteredSportivi.map((s, index) => {
                            const currentGrade = grade.find(g => g.id === s.grad_actual_id);
                            return (
                                <tr key={s.id} className={`${index % 2 !== 0 ? 'bg-slate-800/20' : ''} hover:bg-slate-800/40 transition-colors`}>
                                    <td className="px-6 py-4 font-semibold text-white">{s.nume} {s.prenume}</td>
                                    <td className="px-6 py-4"><GradBadge grad={currentGrade} /></td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Activ' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button size="sm" variant="secondary" onClick={() => onViewSportiv(s)}>Detalii</Button>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr className="hover:bg-slate-800/40 transition-colors">
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                                <Users className="w-12 h-12 opacity-20" />
                                <p>Niciun sportiv înregistrat în C.S. Phi Hau</p>
                            </div>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;