import React from 'react';
import { Card } from './ui';
import { View } from '../types';
import { CalendarDaysIcon, ChartBarIcon, ClipboardCheckIcon, FileTextIcon } from './icons';
import { useNavigation } from '../contexts/NavigationContext';

interface ReportsDashboardProps {
    onNavigate: (view: View) => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ onNavigate }) => {
    const { navigateTo } = useNavigation();

    const reports = [
        { label: 'Raport Prezență', icon: ClipboardCheckIcon, view: 'raport-prezenta' },
        { label: 'Raport Lunar Prezență', icon: CalendarDaysIcon, view: 'raport-lunar-prezenta' },
        { label: 'Raport Financiar', icon: ChartBarIcon, view: 'plati-hub', params: { tab: 'rapoarte', sectiune: 'raport-financiar' } },
        { label: 'Rapoarte Examen', icon: FileTextIcon, view: 'rapoarte-examen' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white mb-6">Rapoarte</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <Card
                        key={report.view}
                        className="p-6 cursor-pointer hover:border-brand-primary transition-all"
                        style={{ touchAction: 'manipulation' }}
                        onClick={() => report.params ? navigateTo(report.view as View, report.params) : onNavigate(report.view as View)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <report.icon className="w-8 h-8 text-brand-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{report.label}</h3>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
