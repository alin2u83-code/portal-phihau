import React, { useState } from 'react';
import { Card, Button } from '../../ui';
import { ImportResult } from './types';
import { formatDateForDisplay } from './utils';

interface Props {
    importResult: ImportResult;
    onBack: () => void;
}

export const Pas2Raport: React.FC<Props> = ({ importResult, onBack }) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['omisi']));

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    const exportRaportCSV = () => {
        const BOM = '﻿';
        const header = 'rand_csv,nume,prenume,data_nasterii,status_import,motiv';
        const rows: string[] = [];

        importResult.adaugati.forEach((s, i) => {
            rows.push(`${i + 1},"${s.nume}","${s.prenume}","${s.data_nasterii || ''}","ADAUGAT",""`);
        });
        importResult.actualizati.forEach((s, i) => {
            rows.push(`${i + 1},"${s.nume}","${s.prenume}","${s.data_nasterii || ''}","ACTUALIZAT",""`);
        });
        importResult.omisi.forEach(s => {
            rows.push(`${s.rand},"${s.nume}","${s.prenume}","","OMIS","${s.motiv}"`);
        });

        const csvContent = BOM + header + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raport_import_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    return (
        <Card className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-zinc-100">Raport Import</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{dateTimeStr}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" onClick={exportRaportCSV} className="text-sm">
                        Export raport CSV
                    </Button>
                    <Button onClick={onBack} className="text-sm">
                        Inchide
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">{importResult.adaugati.length}</div>
                    <div className="text-sm text-green-300 mt-1">Adaugati (noi)</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{importResult.actualizati.length}</div>
                    <div className="text-sm text-blue-300 mt-1">Actualizati</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-400">{importResult.omisi.length}</div>
                    <div className="text-sm text-red-300 mt-1">Omisi (erori)</div>
                </div>
            </div>

            <div className="space-y-3">
                {/* Adaugati */}
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                        onClick={() => toggleSection('adaugati')}
                    >
                        <span className="font-medium text-green-400">Adaugati ({importResult.adaugati.length})</span>
                        <span className="text-zinc-400 text-sm">{expandedSections.has('adaugati') ? '▲' : '▶'}</span>
                    </button>
                    {expandedSections.has('adaugati') && (
                        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50">
                            {importResult.adaugati.length === 0 && (
                                <p className="px-4 py-3 text-sm text-zinc-500">Niciun sportiv adaugat.</p>
                            )}
                            {importResult.adaugati.map((s, i) => (
                                <div key={i} className="px-4 py-2 text-sm text-zinc-300">
                                    {s.nume} {s.prenume}
                                    {s.data_nasterii && (
                                        <span className="text-zinc-500 ml-2">({formatDateForDisplay(s.data_nasterii)})</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actualizati */}
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                        onClick={() => toggleSection('actualizati')}
                    >
                        <span className="font-medium text-blue-400">Actualizati ({importResult.actualizati.length})</span>
                        <span className="text-zinc-400 text-sm">{expandedSections.has('actualizati') ? '▲' : '▶'}</span>
                    </button>
                    {expandedSections.has('actualizati') && (
                        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50">
                            {importResult.actualizati.length === 0 && (
                                <p className="px-4 py-3 text-sm text-zinc-500">Niciun sportiv actualizat.</p>
                            )}
                            {importResult.actualizati.map((s, i) => (
                                <div key={i} className="px-4 py-2 text-sm text-zinc-300">
                                    {s.nume} {s.prenume}
                                    {s.data_nasterii && (
                                        <span className="text-zinc-500 ml-2">({formatDateForDisplay(s.data_nasterii)})</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Omisi */}
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                        onClick={() => toggleSection('omisi')}
                    >
                        <span className="font-medium text-red-400">Omisi ({importResult.omisi.length})</span>
                        <span className="text-zinc-400 text-sm">{expandedSections.has('omisi') ? '▲' : '▶'}</span>
                    </button>
                    {expandedSections.has('omisi') && (
                        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50">
                            {importResult.omisi.length === 0 && (
                                <p className="px-4 py-3 text-sm text-zinc-500">Niciun sportiv omis.</p>
                            )}
                            {importResult.omisi.map((s, i) => (
                                <div key={i} className="px-4 py-2 text-sm">
                                    <span className="text-zinc-500 mr-1">Rand #{s.rand}:</span>
                                    <span className="text-zinc-300">{s.nume} {s.prenume}</span>
                                    <span className="text-red-400 ml-2">— {s.motiv}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};
