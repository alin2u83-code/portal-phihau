import React, { useState, useMemo } from 'react';
import { User, Antrenament } from '../types';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, CheckIcon, XIcon } from './icons';

interface SimpleAttendanceProps {
    currentUser: User;
    antrenamente: Antrenament[];
    onBack: () => void;
}

type Period = 'this_month' | 'last_month' | 'all';

interface AttendanceRecord {
    date: Date;
    time: string;
    dayOfWeek: string;
    status: 'Prezent' | 'Absent';
}

export const SimpleAttendance: React.FC<SimpleAttendanceProps> = ({ currentUser, antrenamente, onBack }) => {
    const [period, setPeriod] = useState<Period>('this_month');

    const filteredData = useMemo((): AttendanceRecord[] => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        const weekDaysRo: Record<number, string> = { 0: 'Duminică', 1: 'Luni', 2: 'Marți', 3: 'Miercuri', 4: 'Joi', 5: 'Vineri', 6: 'Sâmbătă' };

        return antrenamente
            .filter(a => {
                const trainingDate = new Date(a.data + "T00:00:00");
                const isRelevant = (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null)) && trainingDate <= now;

                if (!isRelevant) return false;

                switch (period) {
                    case 'this_month':
                        return trainingDate.getMonth() === currentMonth && trainingDate.getFullYear() === currentYear;
                    case 'last_month':
                        return trainingDate.getMonth() === lastMonth && trainingDate.getFullYear() === lastMonthYear;
                    case 'all':
                    default:
                        return true;
                }
            })
            .map((a): AttendanceRecord => ({
                date: new Date(a.data + "T00:00:00"),
                time: a.ora_start,
                dayOfWeek: weekDaysRo[new Date(a.data + "T00:00:00").getDay()],
                status: a.sportivi_prezenti_ids.includes(currentUser.id) ? 'Prezent' : 'Absent'
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [antrenamente, currentUser, period]);

    const stats = useMemo(() => {
        const total = filteredData.length;
        const attended = filteredData.filter(d => d.status === 'Prezent').length;
        const frequency = total > 0 ? Math.round((attended / total) * 100) : 0;
        return { attended, frequency };
    }, [filteredData]);

    const StatusIcon: React.FC<{ status: 'Prezent' | 'Absent' }> = ({ status }) => {
        if (status === 'Prezent') {
            return <CheckIcon className="w-5 h-5 text-green-400" />;
        }
        return <XIcon className="w-5 h-5 text-red-400" />;
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            <h1 className="text-3xl font-bold text-white">Istoric Prezențe</h1>

            <Card className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-white">Filtrează Perioada:</h3>
                <Select
                    label=""
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className="w-full sm:w-64"
                >
                    <option value="this_month">Luna aceasta</option>
                    <option value="last_month">Luna trecută</option>
                    <option value="all">Tot istoricul</option>
                </Select>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-slate-400">Total Prezențe</p>
                    <p className="text-4xl font-bold text-white">{stats.attended}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-slate-400">Frecvență</p>
                    <p className="text-4xl font-bold text-green-400">{stats.frequency}%</p>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-700">
                    {filteredData.map(item => (
                        <div key={item.date.toISOString() + item.time} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-white">{item.date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</p>
                                <p className="text-sm text-slate-400">{item.dayOfWeek}, ora {item.time}</p>
                            </div>
                            <StatusIcon status={item.status} />
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700/50 text-sm">
                            <tr>
                                <th className="p-3 font-semibold">Data</th>
                                <th className="p-3 font-semibold">Ziua</th>
                                <th className="p-3 font-semibold">Ora</th>
                                <th className="p-3 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.date.toISOString() + item.time} className="border-b border-slate-700 last:border-0 hover:bg-slate-800/50">
                                    <td className="p-3 font-medium text-white">{item.date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}.</td>
                                    <td className="p-3 text-slate-300">{item.dayOfWeek}</td>
                                    <td className="p-3 text-slate-300">{item.time}</td>
                                    <td className="p-3 text-center flex justify-center items-center"><StatusIcon status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredData.length === 0 && (
                    <p className="p-8 text-center text-slate-500 italic">Nicio prezență înregistrată pentru perioada selectată.</p>
                )}
            </Card>
        </div>
    );
};
