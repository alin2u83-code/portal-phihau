/**
 * PaymentTypePieChart.tsx
 * Donut chart — distribuție metodă de plată (Cash vs Transfer Bancar).
 * Folosit în tab-ul "Grafice" din RaportFinanciar.
 */
import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IstoricPlataDetaliat } from '../types';

interface Props {
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
}

const COLORS: Record<string, string> = {
    'Cash': '#10b981',
    'Transfer Bancar': '#38bdf8',
    'Necunoscut': '#475569',
};

interface ChartEntry {
    name: string;
    value: number;
    percent: number;
    fill: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0].payload as ChartEntry;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl pointer-events-none">
            <p className="text-xs text-slate-400 font-semibold mb-1">{entry.name}</p>
            <p className="font-black text-base" style={{ color: entry.fill }}>
                {entry.value.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
            </p>
            <p className="text-xs text-slate-500">{entry.percent}% din total</p>
        </div>
    );
};

const renderLegend = (props: any) => {
    const { payload } = props;
    return (
        <div className="flex flex-col gap-1.5 mt-2">
            {(payload as any[]).map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-slate-400">{entry.value}</span>
                    <span className="text-xs font-bold ml-auto" style={{ color: entry.color }}>
                        {(entry.payload as ChartEntry).percent}%
                    </span>
                </div>
            ))}
        </div>
    );
};

export const PaymentTypePieChart: React.FC<Props> = ({ istoricPlatiDetaliat }) => {
    const { data, total } = useMemo(() => {
        const map: Record<string, number> = {};
        (istoricPlatiDetaliat || []).forEach(t => {
            if (!t.data_plata_string) return;
            const key = t.metoda_plata || 'Necunoscut';
            map[key] = (map[key] || 0) + (t.suma_incasata || 0);
        });
        const total = Object.values(map).reduce((s, v) => s + v, 0);
        const data: ChartEntry[] = Object.entries(map)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({
                name,
                value: Math.round(value),
                percent: total > 0 ? Math.round((value / total) * 100) : 0,
                fill: COLORS[name] ?? '#6366f1',
            }))
            .sort((a, b) => b.value - a.value);
        return { data, total: Math.round(total) };
    }, [istoricPlatiDetaliat]);

    if (data.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[260px]">
                <p className="text-slate-500 text-sm italic">Date insuficiente.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-sm font-bold text-white mb-0.5">Metodă de Plată</p>
            <p className="text-xs text-slate-500 mb-3">
                Total: {total.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
            </p>
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="78%"
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={renderLegend} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
