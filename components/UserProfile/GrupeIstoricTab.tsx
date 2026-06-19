import React from 'react';
import { Card, Button } from '../ui';
import { useIstoricGrupeSportiv } from '../../hooks/useGrupeIstoric';
import type { Sportiv } from '../../types';

interface GrupeIstoricTabProps {
    sportiv: Sportiv;
}

function formatData(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ro-RO');
}

function durata(intrare: string, iesire: string | null): string {
    const start = new Date(intrare);
    const end = iesire ? new Date(iesire) : new Date();
    const zile = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (zile < 30) return `${zile} zile`;
    const luni = Math.floor(zile / 30);
    if (luni < 12) return `${luni} luni`;
    const ani = Math.floor(luni / 12);
    const luniRest = luni % 12;
    return luniRest > 0 ? `${ani} ani ${luniRest} luni` : `${ani} ani`;
}

function exportCsv(rows: any[], numePrenume: string) {
    const header = 'Grupă,Dată Intrare,Dată Ieșire,Durată,Motiv';
    const lines = rows.map(r =>
        [
            `"${r.grupe?.denumire || r.grupa_id}"`,
            formatData(r.data_intrare),
            r.data_iesire ? formatData(r.data_iesire) : 'prezent',
            durata(r.data_intrare, r.data_iesire),
            `"${r.motiv_iesire || ''}"`,
        ].join(',')
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `istoric-grupe-${numePrenume.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export const GrupeIstoricTab: React.FC<GrupeIstoricTabProps> = ({ sportiv }) => {
    const { data: istoric, isLoading, error } = useIstoricGrupeSportiv(sportiv.id);

    if (isLoading) return <p className="text-slate-400 italic p-4">Se încarcă istoricul...</p>;
    if (error) return <p className="text-red-400 p-4">Eroare la încărcarea istoricului.</p>;
    if (!istoric || istoric.length === 0) {
        return (
            <Card>
                <p className="text-slate-400 italic text-center py-8">
                    Niciun istoric de grupe înregistrat pentru acest sportiv.
                </p>
            </Card>
        );
    }

    const numeComplet = `${sportiv.nume} ${sportiv.prenume}`;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Istoric Grupe</h3>
                <Button
                    variant="secondary"
                    onClick={() => exportCsv(istoric, numeComplet)}
                    className="text-xs"
                >
                    Export CSV
                </Button>
            </div>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-300">Grupă</th>
                                <th className="px-4 py-3 font-semibold text-slate-300">Intrare</th>
                                <th className="px-4 py-3 font-semibold text-slate-300">Ieșire</th>
                                <th className="px-4 py-3 font-semibold text-slate-300">Durată</th>
                                <th className="px-4 py-3 font-semibold text-slate-300">Motiv</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {istoric.map(entry => {
                                const activ = !entry.data_iesire;
                                return (
                                    <tr key={entry.id} className={activ ? 'bg-emerald-900/10' : ''}>
                                        <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                            {activ && (
                                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Grupă curentă" />
                                            )}
                                            {(entry as any).grupe?.denumire || entry.grupa_id}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">{formatData(entry.data_intrare)}</td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {activ
                                                ? <span className="text-emerald-400 font-medium">prezent</span>
                                                : formatData(entry.data_iesire)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">{durata(entry.data_intrare, entry.data_iesire)}</td>
                                        <td className="px-4 py-3 text-slate-400 italic">{entry.motiv_iesire || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
