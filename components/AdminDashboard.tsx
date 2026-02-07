import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sportiv, Plata, Grad, Grupa, View } from '../types';
import { Button, Card } from './ui';
import { WelcomeHero } from './WelcomeHero';
import { GradBadge } from '../utils/grades';
import { Users, CreditCard, Trophy, ShieldCheck, PlusIcon } from 'lucide-react';
import { ResponsiveTable, Column } from './ResponsiveTable';

const StatCard: React.FC<{ title: string; description: string; icon: React.ElementType; view: View; onNavigate: (v: View) => void; }> = ({ title, description, icon: Icon, view, onNavigate }) => (
    <Card onClick={() => onNavigate(view)} className="group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-white">{title}</h3>
            <Icon className="w-8 h-8 text-slate-500 group-hover:text-amber-400 transition-colors" />
        </div>
        <p className="text-sm text-slate-400 mt-2">{description}</p>
    </Card>
);

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
    
    const recentSportivi = useMemo(() => {
        if (!sportivi) return [];
        return [...sportivi]
            .sort((a, b) => new Date(b.data_inscrierii).getTime() - new Date(a.data_inscrierii).getTime())
            .slice(0, 5);
    }, [sportivi]);

    if (!currentUser) {
        return <div className="text-center p-8">Se încarcă...</div>;
    }

    const columns: Column<Sportiv>[] = [
        { 
            key: 'nume', 
            label: 'Nume Sportiv',
            render: (s) => <span className="font-semibold text-white">{s.nume} {s.prenume}</span>
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
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Activ' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.status}</span>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <WelcomeHero profile={currentUser} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Gestiune Membri" description="Adaugă, editează și vizualizează sportivi și familii." icon={Users} view="sportivi" onNavigate={navigate} />
                <StatCard title="Situație Financiară" description="Urmărește plățile, datoriile și generează rapoarte." icon={CreditCard} view="plati-scadente" onNavigate={navigate}/>
                <StatCard title="Examene & Evenimente" description="Organizează sesiuni de examen, stagii și competiții." icon={Trophy} view="examene" onNavigate={navigate} />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Sportivi Adăugați Recent</h2>
                <ResponsiveTable
                    columns={columns}
                    data={recentSportivi}
                    searchTerm=""
                    onSearchChange={() => {}}
                    onRowClick={onViewSportiv}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
