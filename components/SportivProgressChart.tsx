import React, { useMemo } from 'react';
import { Sportiv, Antrenament, Grad, GradeHistoryEntry } from '../types';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Area, Bar, Legend } from 'recharts';

// Props interface
interface SportivProgressChartProps {
    sportiv: Sportiv;
    gradeHistory: GradeHistoryEntry[];
    antrenamente: Antrenament[];
    grade: Grad[];
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const date = new Date(label);
        const dateString = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });

        const gradePayload = payload.find((p: any) => p.dataKey === 'rank');
        const attendancePayload = payload.find((p: any) => p.dataKey === 'attendance');

        return (
            <div className="bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-slate-600 text-white shadow-lg text-xs">
                <p className="font-bold mb-2">{dateString}</p>
                {gradePayload && gradePayload.payload.rankName && <p className="text-brand-secondary">Grad: <span className="font-semibold">{gradePayload.payload.rankName}</span></p>}
                {attendancePayload && attendancePayload.value > 0 && <p className="text-sky-300">Prezențe: <span className="font-semibold">{attendancePayload.value}</span></p>}
            </div>
        );
    }
    return null;
};


export const SportivProgressChart: React.FC<SportivProgressChartProps> = ({ sportiv, gradeHistory, antrenamente, grade }) => {
    const { chartData, yAxisTicks } = useMemo(() => {
        if (!grade || !antrenamente || !gradeHistory) return { chartData: [], yAxisTicks: [] };

        // --- Grade Data is now pre-processed and passed in as gradeHistory ---
        const sortedGrades = [...(grade || [])].sort((a, b) => a.ordine - b.ordine);
        
        // --- Attendance Data ---
        const attendanceByMonth: { [key: string]: number } = {};
        (antrenamente || []).forEach(a => {
            if ((a.prezenta || []).some(p => p.sportiv_id === sportiv.id)) {
                const monthKey = (a.data || '').substring(0, 7); // YYYY-MM
                if (monthKey) {
                    attendanceByMonth[monthKey] = (attendanceByMonth[monthKey] || 0) + 1;
                }
            }
        });
        
        // --- Combine Data ---
        const dataMap = new Map<number, any>();
        
        // Add attendance data to map
        for (const monthKey in attendanceByMonth) {
            const date = new Date(`${monthKey}-01T00:00:00Z`).getTime();
            dataMap.set(date, { date, attendance: attendanceByMonth[monthKey] });
        }
        
        // Add grade data to map
        let lastRank = 0;
        let lastRankName = "Începător";
        
        const gradeEvents = [
            { date: new Date(sportiv.data_inscrierii).getTime(), rank: 0, rankName: "Începător" },
            ...gradeHistory
        ].sort((a,b) => a.date - b.date);

        gradeEvents.forEach(event => {
            const dateKey = event.date;
            const monthKey = new Date(new Date(dateKey).toISOString().substring(0, 7) + '-01T00:00:00Z').getTime();

            const existingForMonth = dataMap.get(monthKey) || { date: monthKey };
            dataMap.set(monthKey, { ...existingForMonth, rank: event.rank, rankName: event.rankName });
            
            lastRank = event.rank;
            lastRankName = event.rankName;
        });

        const finalChartData = Array.from(dataMap.values()).sort((a, b) => a.date - b.date);
        
        // Fill in missing ranks
        for (let i = 0; i < finalChartData.length; i++) {
            if (finalChartData[i].rank === undefined) {
                 finalChartData[i].rank = (i > 0) ? finalChartData[i-1].rank : 0;
                 finalChartData[i].rankName = (i > 0) ? finalChartData[i-1].rankName : "Începător";
            }
        }
        
        // Add a final point for today to extend the graph
        const today = new Date();
        const todayKey = new Date(today.toISOString().substring(0, 7) + '-01T00:00:00Z').getTime();
        
        if (finalChartData.length > 0) {
            const lastEntry = finalChartData[finalChartData.length - 1];
            if (lastEntry.date < todayKey) {
                 finalChartData.push({ date: new Date().getTime(), rank: lastRank, rankName: lastRankName });
            }
        }

        const yTicks = [{ ordine: 0, nume: "Începător" }, ...sortedGrades];

        return { chartData: finalChartData, yAxisTicks: yTicks };

    }, [sportiv, gradeHistory, antrenamente, grade]);

    const gradeTickFormatter = (tickValue: number) => {
        const grade = yAxisTicks.find(g => g.ordine === tickValue);
        return grade ? grade.nume : '';
    };

    if (!grade || !antrenamente || !gradeHistory) {
        return <div className="h-80 w-full flex items-center justify-center bg-slate-800/20 rounded-lg animate-pulse">Încărcare date grafic...</div>;
    }

    return (
        <div className="h-80 w-full" style={{fontSize: '12px'}}>
            <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="date" 
                        type="number" 
                        scale="time" 
                        domain={['dataMin', 'dataMax']} 
                        tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })}
                        stroke="#9ca3af"
                    />
                    <YAxis 
                        yAxisId="left" 
                        dataKey="rank" 
                        type="number"
                        domain={[0, 'dataMax + 1']} 
                        allowDecimals={false}
                        ticks={yAxisTicks.map(g => g.ordine)}
                        tickFormatter={gradeTickFormatter}
                        stroke="#4DBCE9"
                        width={80}
                    />
                    <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        dataKey="attendance"
                        allowDecimals={false}
                        stroke="#67e8f9"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{fontSize: '11px'}}/>
                    <defs>
                        <linearGradient id="colorRank" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4DBCE9" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#4DBCE9" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area 
                        yAxisId="left" 
                        type="stepAfter" 
                        dataKey="rank" 
                        name="Grad" 
                        stroke="#4DBCE9" 
                        fill="url(#colorRank)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                    <Bar 
                        yAxisId="right" 
                        dataKey="attendance" 
                        name="Prezențe lunare" 
                        fill="#0e7490" 
                        barSize={20}
                        opacity={0.7}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};