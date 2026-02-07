import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sportiv, Plata, Grad, Grupa, View } from '../types';
import { Card } from './ui';
import { WelcomeHero } from './WelcomeHero';
import { GradBadge } from '../utils/grades';
import { Users, Wallet, Trophy, ArrowRight } from 'lucide-react';
import { ResponsiveTable, Column } from './ResponsiveTable';

const StatCard: React.FC<{ title: string; subtitle: string; icon: React.ElementType; view: string; color: string }> = ({ title, subtitle, icon: Icon, view, color }) => {
    const navigate = useNavigate();
    return (
        <Card onClick={() => navigate(`/${view}`)} className="group cursor-pointer hover:-translate-y-1 transition-all duration-300 glass-card p-6 overflow-hidden relative">
            <div className={`absolute -right-4 -top-4 p-8 rounded-full opacity-10 ${color}`}>
                <Icon size={80} />
            </div>
            <div className="flex flex-col gap-1 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color.replace('bg-', 'bg-opacity-20 bg-')}`}>
                    <Icon className={color.replace('bg-', 'text-')} size={24} />
                </div>
                <h3 className="font-black text-2xl text-white tracking-tight">{title}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{subtitle}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:gap-3 transition-all">
                    GESTIONEAZĂ MODUL <ArrowRight size={14} />
                </div>
            </div>
        </Card>
    );
};

interface AdminDashboardProps {
  currentUser: User | null;
  sportivi: Sportiv[];
  plati: Plata[];
  grade: Grad[];
  grupe: Grupa[];
  onViewSportiv: (sportiv: Sportiv) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, sportivi, plati, grade, grupe, onViewSportiv }) => {
    const recentSportivi = useMemo(() => {
        if (!sportivi) return [];
        return [...sportivi]
            .sort((a, b) => new Date(b.data_inscrierii).getTime() - new Date(a.data_inscrierii).getTime())
            .slice(0, 5);
    }, [sportivi]);

    if (!currentUser) return null;

    const columns: Column<Sportiv>[] = [
        { 
            key: 'nume', 
            label: 'Nume Sportiv',
            render: (s) => <span className="font-bold text-white uppercase tracking-tight">{s.nume} {s.prenume}</span>
        },
        { 
            key: 'grad_actual_id', 
            label: 'Grad',
            render: (s) => <GradBadge grad={grade.find(g => g.id === s.grad_actual_id)} />
        },
        {
            key: 'status',
            label: 'Status',
            render: (s) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.status === 'Activ' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/20'}`}>
                    {s.status}
                </span>
            )
        }
    ];

    const stats = useMemo(() => ({
        totalMembri: sportivi.filter(s => s.status === 'Activ').length,
        totalDatorii: plati.filter(p => p.status !== 'Achitat').reduce((acc, p) => acc + p.suma, 0),
        exameneInAsteptare: 0 // Mock pentru acum
    }), [sportivi, plati]);

    return (
        <div className="space-y-8 animate-fade-in-down">
            <WelcomeHero profile={currentUser} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title={`${stats.totalMembri} Sportivi`} 
                    subtitle="Membri Activi" 
                    icon={Users} 
                    view="sportivi" 
                    color="bg-blue-500" 
                />
                <StatCard 
                    title={`${stats.totalDatorii.toFixed(0)} RON`} 
                    subtitle="Situație Plăți" 
                    icon={Wallet} 
                    view="plati-scadente" 
                    color="bg-emerald-500" 
                />
                <StatCard 
                    title="Examen Câp" 
                    subtitle="Sesiuni Viitoare" 
                    icon={Trophy} 
                    view="examene" 
                    color="bg-amber-500" 
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Noutăți Lot Sportiv</h2>
                </div>
                <ResponsiveTable
                    columns={columns}
                    data={recentSportivi}
                    searchTerm=""
                    onSearchChange={() => {}}
                    onRowClick={onViewSportiv}
                    searchPlaceholder='Caută în membrii recenți...'
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
