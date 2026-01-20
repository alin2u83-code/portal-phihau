import React, { useState, useMemo } from 'react';
import { Plata, Tranzactie, Sportiv } from '../types';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, BanknotesIcon, UsersIcon, ExclamationTriangleIcon } from './icons';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface FinancialDashboardProps {
    plati: Plata[];
    tranzactii: Tranzactie[];
    sportivi: Sportiv[];
    onBack: () => void;
}

const COLORS = ['#4DBCE9', '#3D3D99', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#64748b'];

const KpiCard: React.FC<{ title: string; value: string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <Card className={`relative overflow-hidden border-l-4 ${color}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-bold uppercase text-slate-400 tracking-wider">{title}</p>
                <p className="text-3xl font-extrabold text-white mt-2">{value}</p>
            </div>
            <Icon className="w-10 h-10 text-slate-600/70" />
        </div>
    </Card>
);

const generatePeriodOptions = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Season is from September to August
    const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;

    return [
        { label: `Sezonul Curent (${seasonStartYear}-${seasonStartYear + 1})`, value: `s_${seasonStartYear}` },
        { label: `Anul Curent (${currentYear})`, value: `y_${currentYear}` },
        { label: `Sezonul Următor (${seasonStartYear + 1}-${seasonStartYear + 2})`, value: `s_${seasonStartYear + 1}` },
        { label: `Anul Următor (${currentYear + 1})`, value: `y_${currentYear + 1}` },
    ];
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ plati, tranzactii, sportivi, onBack }) => {
    const [period, setPeriod] = useState(generatePeriodOptions()[0].value);

    // --- KPI Calculations (independent of date filter) ---
    const kpiData = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const totalIncasatLuna = tranzactii
            .filter(t => {
                const dataPlatii = new Date(t.data_platii);
                return dataPlatii >= firstDayOfMonth && dataPlatii <= lastDayOfMonth;
            })
            .reduce((sum, t) => sum + t.suma, 0);

        const totalRestante = plati
            .filter(p => p.status === 'Neachitat' || p.status === 'Achitat Parțial')
            .reduce((sum, p) => sum + p.suma, 0);
            
        const nrSportiviActivi = sportivi.filter(s => s.status === 'Activ').length;

        return { totalIncasatLuna, totalRestante, nrSportiviActivi };
    }, [tranzactii, plati, sportivi]);

    // --- Chart Data Calculation (dependent on date filter) ---
    const chartData = useMemo(() => {
        const [type, yearStr] = period.split('_');
        const year = parseInt(yearStr, 10);
        let startDate: Date, endDate: Date;

        if (type === 's') { // Season
            startDate = new Date(year, 8, 1); // September 1st
            endDate = new Date(year + 1, 7, 31); // August 31st
        } else { // Year
            startDate = new Date(year, 0, 1); // January 1st
            endDate = new Date(year, 11, 31); // December 31st
        }

        const filteredTranzactii = tranzactii.filter(t => {
            const dataPlatii = new Date(t.data_platii);
            return dataPlatii >= startDate && dataPlatii <= endDate;
        });

        const revenueByType: { [key: string]: number } = {};
        filteredTranzactii.forEach(t => {
            let tip = 'Avans / Neclasificat';
            if (t.plata_ids.length > 0) {
                const primaPlata = plati.find(p => p.id === t.plata_ids[0]);
                if (primaPlata) {
                    tip = primaPlata.tip;
                }
            }
            revenueByType[tip] = (revenueByType[tip] || 0) + t.suma;
        });

        return Object.entries(revenueByType)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);

    }, [period, tranzactii, plati]);

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null; // Don't render label for small slices
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Dashboard Financiar</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total Încasat (Luna Curentă)" value={`${kpiData.totalIncasatLuna.toFixed(2)} lei`} icon={BanknotesIcon} color="border-green-500" />
                <KpiCard title="Total de Încasat (Restanțe)" value={`${kpiData.totalRestante.toFixed(2)} lei`} icon={ExclamationTriangleIcon} color="border-amber-500" />
                <KpiCard title="Număr Sportivi Activi" value={String(kpiData.nrSportiviActivi)} icon={UsersIcon} color="border-sky-500" />
            </div>

            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <h3 className="text-xl font-bold text-white mb-2 sm:mb-0">Distribuția Veniturilor</h3>
                    <Select label="" value={period} onChange={e => setPeriod(e.target.value)} className="w-full sm:w-auto">
                        {generatePeriodOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                </div>
                <div className="h-80 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius="80%"
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    formatter={(value: number) => `${value.toFixed(2)} lei`}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 italic">
                            Nu există date de afișat pentru perioada selectată.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};