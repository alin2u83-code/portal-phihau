import React, { useMemo } from 'react';
import { Sportiv, Plata, IstoricGrade } from '../types';
import { Card } from './ui';
import { UsersIcon, BanknotesIcon, TrophyIcon } from './icons';

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; subtext?: string }> = ({ title, value, icon: Icon, color, subtext }) => (
    <Card className={`relative overflow-hidden border-l-4 ${color}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-bold uppercase text-slate-400 tracking-wider">{title}</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-extrabold text-white">{value}</p>
                    {subtext && <span className="text-sm text-slate-500 font-bold">{subtext}</span>}
                </div>
            </div>
            <Icon className={`w-10 h-10 text-slate-600/70`} />
        </div>
    </Card>
);

interface AdminDashboardProps {
    sportivi: Sportiv[];
    plati: Plata[];
    istoricGrade: IstoricGrade[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ sportivi, plati, istoricGrade }) => {
    const kpiData = useMemo(() => {
        const activeMembers = (sportivi || []).filter(s => s.status === 'Activ').length;
        
        const totalDebts = (plati || [])
            .filter(p => p.status === 'Neachitat' || p.status === 'Achitat Parțial')
            .reduce((sum, p) => sum + p.suma, 0);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newGradesThisMonth = (istoricGrade || []).filter(ig => {
            const gradeDate = new Date(ig.data_obtinere);
            return gradeDate.getMonth() === currentMonth && gradeDate.getFullYear() === currentYear;
        }).length;

        return { activeMembers, totalDebts, newGradesThisMonth };
    }, [sportivi, plati, istoricGrade]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KpiCard title="Membri Activi" value={kpiData.activeMembers} icon={UsersIcon} color="border-green-500" />
            <KpiCard title="Total Datorii" value={`${kpiData.totalDebts.toFixed(2)}`} subtext="RON" icon={BanknotesIcon} color="border-red-500" />
            <KpiCard title="Grade Noi (Luna Curentă)" value={kpiData.newGradesThisMonth} icon={TrophyIcon} color="border-yellow-500" />
        </div>
    );
};
