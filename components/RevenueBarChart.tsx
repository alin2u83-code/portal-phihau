/**
 * RevenueBarChart.tsx
 * Bar chart — încasări lunare pe ultimele 12 luni.
 * Folosit în tab-ul "Grafice" din RaportFinanciar.
 */
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from 'recharts';
import { IstoricPlataDetaliat } from '../types';

interface Props {
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
}

const LUNA_SHORT: Record<string, string> = {
    '01': 'Ian', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'Mai', '06': 'Iun', '07': 'Iul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function getLast12Months(): string[] {
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toISOString().slice(0, 7));
    }
    return months;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl pointer-events-none">
            <p className="text-xs text-slate-400 font-semibold mb-1">{label}</p>
            <p className="text-emerald-400 font-black text-base">
                {(payload[0].value as number).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
            </p>
        </div>
    );
};

export const RevenueBarChart: React.FC<Props> = ({ istoricPlatiDetaliat }) => {
    const data = useMemo(() => {
        const months = getLast12Months();
        const map: Record<string, number> = {};
        months.forEach(m => { map[m] = 0; });

        (istoricPlatiDetaliat || []).forEach(t => {
            const m = t.data_plata_string?.toString().slice(0, 7);
            if (m && map[m] !== undefined) {
                map[m] += t.suma_incasata || 0;
            }
        });

        return months.map(m => ({
            luna: `${LUNA_SHORT[m.slice(5, 7)]} '${m.slice(2, 4)}`,
            incasat: Math.round(map[m]),
            isCurrent: m === new Date().toISOString().slice(0, 7),
        }));
    }, [istoricPlatiDetaliat]);

    const maxVal = Math.max(...data.map(d => d.incasat), 1);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-sm font-bold text-white mb-0.5">Încasări Lunare</p>
            <p className="text-xs text-slate-500 mb-4">Ultimele 12 luni · luna curentă = indigo</p>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                        dataKey="luna"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v =>
                            v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                        width={38}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.07)' }} />
                    <Bar dataKey="incasat" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {data.map((entry, i) => (
                            <Cell
                                key={i}
                                fill={
                                    entry.isCurrent
                                        ? '#6366f1'
                                        : entry.incasat === maxVal && maxVal > 0
                                        ? '#34d399'
                                        : '#334155'
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
