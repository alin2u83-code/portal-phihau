import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export interface ChartDataPoint {
    date: string;
    rankOrder: number;
    rankName: string;
    timestamp: number;
    source?: string;
}

interface SportivProgressChartProps {
    data: ChartDataPoint[];
    themeColor?: string;
}

export const SportivProgressChart: React.FC<SportivProgressChartProps> = ({ data, themeColor = '#3b82f6' }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-600 bg-slate-800/30 rounded-xl border border-slate-700/40">
                <p className="text-xs italic">Nu există date istorice despre grade.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={10}
                    tickMargin={8}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    dataKey="rankOrder"
                    stroke="#64748b"
                    fontSize={10}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    hide
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#fff', fontSize: 12 }}
                    itemStyle={{ color: themeColor }}
                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                    formatter={(_value: any, _name: any, props: any) => [props.payload.rankName, 'Grad']}
                />
                <Line
                    type="monotone"
                    dataKey="rankOrder"
                    stroke={themeColor}
                    strokeWidth={3}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                    animationDuration={1500}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
