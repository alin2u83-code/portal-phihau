import React, { useState } from 'react';
import { Card, Button } from '../../ui';
import { ImportConfig } from './types';
import { KNOWN_COLS, LOCKED_COLS } from './utils';

interface Props {
    allColumns: string[];
    onConfirm: (config: ImportConfig) => void;
    onBack: () => void;
}

export const Pas05Configurare: React.FC<Props> = ({ allColumns, onConfirm, onBack }) => {
    const [addNew, setAddNew] = useState(true);
    const [updateExisting, setUpdateExisting] = useState(false);

    const optionalKnown = allColumns.filter(
        col => !LOCKED_COLS.includes(col) && KNOWN_COLS[col]
    );
    const ignoredCols = allColumns.filter(
        col => !LOCKED_COLS.includes(col) && !KNOWN_COLS[col]
    );

    const [selected, setSelected] = useState<Set<string>>(
        new Set(optionalKnown.filter(c => ['CNP', 'DATA NASTERII', 'GEN'].includes(c)))
    );

    const toggle = (col: string) => {
        const next = new Set(selected);
        if (next.has(col)) next.delete(col); else next.add(col);
        setSelected(next);
    };

    const showWarning = updateExisting && selected.size === 0;

    const handleConfirm = () => {
        if (!addNew && !updateExisting) return;
        onConfirm({
            addNew,
            updateExisting,
            selectedColumns: [...LOCKED_COLS, ...Array.from(selected)],
            allColumns,
        });
    };

    return (
        <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-zinc-100">Configurează importul</h2>
            <p className="text-sm text-slate-400 mb-5">Alege ce vrei să faci cu datele din fișier</p>

            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Ce vrei să faci?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                        { id: 'add', label: 'Adaugă sportivi noi', desc: 'Creează sportivii care nu există încă', val: addNew, set: () => setAddNew(v => !v) },
                        { id: 'upd', label: 'Actualizează existenți', desc: 'Completează / modifică date deja salvate', val: updateExisting, set: () => setUpdateExisting(v => !v) },
                    ].map(({ id, label, desc, val, set }) => (
                        <button
                            key={id}
                            onClick={set}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${val ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900 hover:border-slate-600'}`}
                        >
                            <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${val ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600'}`}>
                                {val ? '✓' : ''}
                            </span>
                            <div>
                                <div className="text-sm font-semibold text-slate-200">{label}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
                {!addNew && !updateExisting && (
                    <p className="text-xs text-red-400 mt-2">Selectează cel puțin un mod de import.</p>
                )}
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ce informații să fie importate?</p>
                    <div className="flex gap-3">
                        <button className="text-xs text-blue-400 font-semibold" onClick={() => setSelected(new Set(optionalKnown))}>Toate</button>
                        <button className="text-xs text-blue-400 font-semibold" onClick={() => setSelected(new Set())}>Niciunul</button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                    {LOCKED_COLS.map(col => (
                        <span key={col} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/40 border border-blue-800 text-blue-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {col === 'NUME SPORTIV' ? 'Nume' : 'Prenume'}
                            <span className="text-[10px] text-blue-500">mereu</span>
                        </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                    {optionalKnown.map(col => {
                        const on = selected.has(col);
                        return (
                            <button
                                key={col}
                                onClick={() => toggle(col)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${on ? 'bg-blue-400' : 'bg-slate-600'}`} />
                                {KNOWN_COLS[col]}
                            </button>
                        );
                    })}
                </div>

                {ignoredCols.length > 0 && (
                    <>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Ignorate — sistemul nu le recunoaște</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ignoredCols.map(col => (
                                <span key={col} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs italic bg-slate-900 border border-slate-800 text-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                                    {col}
                                </span>
                            ))}
                        </div>
                    </>
                )}

                {showWarning && (
                    <p className="text-xs text-amber-400 mt-3">
                        ⚠ Ai ales „Actualizează existenți" dar nu ai selectat niciun câmp.
                    </p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700">
                <Button onClick={handleConfirm} disabled={!addNew && !updateExisting} className="w-full sm:flex-1">
                    Analizează →
                </Button>
                <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto">Înapoi</Button>
            </div>
        </Card>
    );
};
