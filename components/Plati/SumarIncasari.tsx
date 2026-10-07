import React, { useMemo, useState } from 'react';
import { Card, Select } from '../ui';
import { ResponsiveTable, Column } from '../ResponsiveTable';
import { PeriodFilterBar } from './PeriodFilterBar';
import { useData } from '../../contexts/DataContext';
import { calculeazaSumarIncasari, type MetodaPlata } from '../../services/soldService';
import type { Tranzactie, Permissions } from '../../types';

interface SumarIncasariProps {
    permissions: Permissions;
}

const formatSum = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';

const formatLuna = (luna: string) => {
    const [an, l] = luna.split('-');
    const nume = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'][Number(l) - 1];
    return nume ? `${nume} ${an}` : luna;
};

const pad = (n: number) => String(n).padStart(2, '0');
const azi = new Date();
const inceputLuna = `${azi.getFullYear()}-${pad(azi.getMonth() + 1)}-01`;
const sfarsitAzi = `${azi.getFullYear()}-${pad(azi.getMonth() + 1)}-${pad(azi.getDate())}`;

/**
 * Sumar Încasări — banii EFECTIV încasați, calculați direct din `tranzactii`
 * (nu din view-urile DB, care supraestimează încasările pe facturile plătite împreună).
 */
export const SumarIncasari: React.FC<SumarIncasariProps> = ({ permissions }) => {
    const { filteredData, clubs } = useData();
    const [perioada, setPerioada] = useState({ startDate: inceputLuna, endDate: sfarsitAzi });
    const [metoda, setMetoda] = useState<MetodaPlata | ''>('');
    const [clubId, setClubId] = useState('');

    const numeSportiv = useMemo(() => {
        const m = new Map<string, string>();
        (filteredData.sportivi || []).forEach(s => m.set(s.id, `${s.nume} ${s.prenume}`));
        return m;
    }, [filteredData.sportivi]);
    const numeFamilie = useMemo(() => {
        const m = new Map<string, string>();
        (filteredData.familii || []).forEach(f => m.set(f.id, `Familia ${f.nume}`));
        return m;
    }, [filteredData.familii]);

    const sumar = useMemo(
        () => calculeazaSumarIncasari(filteredData.tranzactii, {
            dela: perioada.startDate,
            panaLa: perioada.endDate,
            metoda,
            clubId: clubId || undefined,
        }),
        [filteredData.tranzactii, perioada, metoda, clubId]
    );

    const platitor = (t: Tranzactie) =>
        (t.familie_id && numeFamilie.get(t.familie_id)) ||
        (t.sportiv_id && numeSportiv.get(t.sportiv_id)) ||
        '—';

    const columns: Column<Tranzactie>[] = [
        { key: 'data_platii', label: 'Data', render: t => (t.data_platii || '').slice(0, 10) },
        { key: 'platitor', label: 'Plătitor', render: t => platitor(t) },
        { key: 'metoda_plata', label: 'Metodă' },
        {
            key: 'suma', label: 'Sumă', cellClassName: 'text-right',
            render: t => <span className="font-semibold text-emerald-400 whitespace-nowrap">{formatSum(t.suma)}</span>,
        },
    ];

    const renderMobileItem = (t: Tranzactie) => (
        <div className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
                <p className="text-sm text-white truncate">{platitor(t)}</p>
                <p className="text-xs text-slate-400">{(t.data_platii || '').slice(0, 10)} · {t.metoda_plata}</p>
            </div>
            <p className="font-bold text-emerald-400 whitespace-nowrap shrink-0">{formatSum(t.suma)}</p>
        </div>
    );

    const maxLuna = Math.max(1, ...sumar.perLuna.map(l => l.total));

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-wrap items-end gap-3">
                    <PeriodFilterBar
                        startDate={perioada.startDate}
                        endDate={perioada.endDate}
                        onChange={(startDate, endDate) => setPerioada({ startDate, endDate })}
                    />
                    <div className="w-44">
                        <Select label="Metodă plată" value={metoda} onChange={e => setMetoda(e.target.value as MetodaPlata | '')}>
                            <option value="">Toate</option>
                            <option value="Cash">Cash</option>
                            <option value="Transfer Bancar">Transfer Bancar</option>
                            <option value="Revolut">Revolut</option>
                        </Select>
                    </div>
                    {permissions.isFederationAdmin && (
                        <div className="w-56">
                            <Select label="Club" value={clubId} onChange={e => setClubId(e.target.value)}>
                                <option value="">Toate cluburile</option>
                                {(clubs || []).map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                            </Select>
                        </div>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Total încasat</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{formatSum(sumar.total)}</p>
                    <p className="text-xs text-slate-500 mt-1">{sumar.nrTranzactii} tranzacții</p>
                </Card>
                {(['Cash', 'Transfer Bancar', 'Revolut'] as const).map(m => (
                    <Card key={m}>
                        <p className="text-xs uppercase tracking-wider text-slate-400">{m}</p>
                        <p className="text-xl font-bold text-white mt-1">{formatSum(sumar.perMetoda[m] || 0)}</p>
                    </Card>
                ))}
            </div>

            {sumar.perLuna.length > 0 && (
                <Card>
                    <p className="font-bold text-white mb-3">Încasat pe luni</p>
                    <div className="space-y-2">
                        {sumar.perLuna.map(l => (
                            <div key={l.luna} className="flex items-center gap-3 text-sm">
                                <span className="w-20 shrink-0 text-slate-300">{formatLuna(l.luna)}</span>
                                <div className="flex-1 h-3 rounded bg-slate-800 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${(l.total / maxLuna) * 100}%` }} />
                                </div>
                                <span className="w-32 shrink-0 text-right font-semibold text-white">{formatSum(l.total)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card>
                <p className="font-bold text-white mb-3">Tranzacții din perioadă</p>
                {sumar.tranzactii.length === 0 ? (
                    <p className="text-sm text-slate-400">Nicio încasare în perioada și filtrele selectate.</p>
                ) : (
                    <ResponsiveTable
                        columns={columns}
                        data={sumar.tranzactii}
                        renderMobileItem={renderMobileItem}
                        idKey="id"
                    />
                )}
            </Card>
        </div>
    );
};
