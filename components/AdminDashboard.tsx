import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sportiv, Plata, Grad } from '../types';
import { Card, Input, Button } from './ui';
import { UsersIcon, ExclamationTriangleIcon, SearchIcon, BanknotesIcon } from './icons';
import { WelcomeHero } from './WelcomeHero';
import { GradBadge } from '../utils/grades';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; }> = ({ title, value, icon: Icon, color }) => (
    <div className={`bg-slate-800/50 p-6 rounded-lg border border-slate-700`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-bold uppercase text-slate-400">{title}</p>
                <p className={`text-4xl font-black mt-2 ${color}`}>{value}</p>
            </div>
            <Icon className="w-8 h-8 text-slate-500" />
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
            .filter(s => 
                s.club_id === currentUser.club_id &&
                `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a,b) => a.nume.localeCompare(b.nume));
    }, [sportivi, searchTerm, currentUser]);

    if (!currentUser) {
        return <div className="text-center p-8">Se încarcă datele utilizatorului...</div>;
    }

    return (
        <div className="space-y-8">
            <WelcomeHero profile={currentUser} />

            <h2 className="text-2xl font-bold text-white border-b-2 border-brand-secondary/50 pb-2">Sumar Administrativ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Membri Activi" value={stats.totalSportivi} icon={UsersIcon} color="text-green-400" />
                <StatCard title="Total Datorii Club" value={`${stats.totalDatorii.toFixed(2)} lei`} icon={BanknotesIcon} color={stats.totalDatorii > 0 ? "text-red-400" : "text-green-400"} />
                <StatCard title="Vize Medicale Expirate" value={stats.vizeExpirate} icon={ExclamationTriangleIcon} color={stats.vizeExpirate > 0 ? 'text-amber-400' : 'text-green-400'} />
            </div>

            <h2 className="text-2xl font-bold text-white border-b-2 border-brand-secondary/50 pb-2">Management Sportivi</h2>
            <Card>
                <div className="flex justify-end mb-4">
                    <div className="relative w-full md:w-72">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input label="" placeholder="Caută membru..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="!pl-10" />
                    </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                            <tr>
                                <th className="p-3">Nume Prenume</th>
                                <th className="p-3">Grad</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredSportivi.map(s => {
                                const currentGrade = grade.find(g => g.id === s.grad_actual_id);
                                return (
                                    <tr key={s.id} className="hover:bg-slate-700/50">
                                        <td className="p-3 font-medium">{s.nume} {s.prenume}</td>
                                        <td className="p-3"><GradBadge grad={currentGrade} className="text-[10px]" /></td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>{s.status}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => onViewSportiv(s)}>Vezi Profil</Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredSportivi.length === 0 && <p className="text-center p-8 text-slate-500">Niciun sportiv găsit.</p>}
                </div>
            </Card>
            
            <h2 className="text-2xl font-bold text-white border-b-2 border-brand-secondary/50 pb-2">Evenimente</h2>
            <Card>
                <p className="text-slate-400 text-center p-8">Modul pentru gestionarea stagiilor și competițiilor este în curs de dezvoltare.</p>
            </Card>
        </div>
    );
};

export default AdminDashboard;
