import React from 'react';
import { Card, Button } from '../../ui';
import { UnifiedRow } from './types';
import { formatDateForDisplay, getStatusBadge } from './utils';

interface Props {
    unifiedRows: UnifiedRow[];
    selectedIndices: Set<number>;
    excludedStrictIndices: Set<number>;
    expandedRows: Set<number>;
    overwriteMode: boolean;
    importing: boolean;
    showConfirm: boolean;
    seVaImporta: number;
    validNouCount: number;
    activeAutoUpdates: number;
    selectedLooseCount: number;
    countNou: number;
    countActualizare: number;
    countDuplicat: number;
    countEroare: number;
    onToggleSelection: (index: number) => void;
    onToggleExcludeStrict: (index: number) => void;
    onToggleExpandRow: (index: number) => void;
    onToggleOverwrite: () => void;
    onExecuteImport: () => void;
    onBack: () => void;
    onCancelConfirm: () => void;
}

export const Pas1Revizuire: React.FC<Props> = ({
    unifiedRows, selectedIndices, excludedStrictIndices, expandedRows,
    overwriteMode, importing, showConfirm, seVaImporta, validNouCount,
    activeAutoUpdates, selectedLooseCount,
    countNou, countActualizare, countDuplicat, countEroare,
    onToggleSelection, onToggleExcludeStrict, onToggleExpandRow,
    onToggleOverwrite, onExecuteImport, onBack, onCancelConfirm,
}) => (
    <Card className="p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-zinc-100">Revizuire Import</h2>

        <div className="flex flex-wrap gap-2 mb-3">
            {countNou > 0 && (
                <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded text-sm font-medium">
                    NOU: {countNou}
                </span>
            )}
            {countActualizare > 0 && (
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-3 py-1 rounded text-sm font-medium">
                    ACTUALIZARE: {countActualizare}
                </span>
            )}
            {countDuplicat > 0 && (
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-3 py-1 rounded text-sm font-medium">
                    POSIBIL DUPLICAT: {countDuplicat}
                </span>
            )}
            {countEroare > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded text-sm font-medium">
                    EROARE: {countEroare}
                </span>
            )}
        </div>
        <p className="text-sm text-zinc-400 mb-4">
            Se va importa: <span className="text-zinc-100 font-semibold">{seVaImporta} sportivi</span>
        </p>

        <div className="mb-6 border border-zinc-800 rounded-lg overflow-hidden">
            {/* Tabel desktop (md+) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-800/70 text-zinc-400 text-xs uppercase tracking-wide">
                            <th className="px-3 py-2.5 text-left w-10">#</th>
                            <th className="px-3 py-2.5 text-left">Nume</th>
                            <th className="px-3 py-2.5 text-left">Prenume</th>
                            <th className="px-3 py-2.5 text-left">Data nasterii</th>
                            <th className="px-3 py-2.5 text-left">Status</th>
                            <th className="px-3 py-2.5 text-left">Motiv</th>
                            <th className="px-3 py-2.5 text-left w-28">Actiune</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {unifiedRows.map((row, idx) => (
                            <React.Fragment key={idx}>
                                <tr className={`hover:bg-zinc-800/30 transition-colors ${row.status === 'EROARE' ? 'opacity-60' : ''}`}>
                                    <td className="px-3 py-2.5 text-zinc-500 tabular-nums">{row.originalIndex + 1}</td>
                                    <td className="px-3 py-2.5 text-zinc-200 font-medium">{row.nume}</td>
                                    <td className="px-3 py-2.5 text-zinc-200">{row.prenume}</td>
                                    <td className="px-3 py-2.5 text-zinc-400 tabular-nums">{row.dataNasteriiCSV || '—'}</td>
                                    <td className="px-3 py-2.5">{getStatusBadge(row.status)}</td>
                                    <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-xs truncate" title={row.motiv}>{row.motiv || '—'}</td>
                                    <td className="px-3 py-2.5">
                                        {row.status === 'POSIBIL_DUPLICAT' && row.looseIndex !== undefined && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIndices.has(row.looseIndex)}
                                                    onChange={() => onToggleSelection(row.looseIndex!)}
                                                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                                                    title="Bifati pentru a actualiza"
                                                />
                                                <button
                                                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap"
                                                    onClick={() => onToggleExpandRow(row.originalIndex)}
                                                >
                                                    {expandedRows.has(row.originalIndex) ? '▲ Ascunde' : '▼ Detalii'}
                                                </button>
                                            </div>
                                        )}
                                        {row.status === 'ACTUALIZARE_AUTO' && row.strictIndex !== undefined && (
                                            <button
                                                className={`text-xs px-2 py-0.5 rounded border transition-colors ${excludedStrictIndices.has(row.strictIndex) ? 'bg-zinc-700 text-zinc-400 border-zinc-600' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'}`}
                                                onClick={() => onToggleExcludeStrict(row.strictIndex!)}
                                            >
                                                {excludedStrictIndices.has(row.strictIndex) ? 'Inclus' : 'Exclude'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {row.status === 'POSIBIL_DUPLICAT' && expandedRows.has(row.originalIndex) && row.existingSportiv && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-3 bg-zinc-900/50">
                                            <div className="rounded-lg overflow-hidden border border-zinc-700">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-zinc-800/80 text-zinc-500 uppercase tracking-wide">
                                                            <th className="px-3 py-1.5 text-left w-16"></th>
                                                            <th className="px-3 py-1.5 text-left">Nume</th>
                                                            <th className="px-3 py-1.5 text-left">Prenume</th>
                                                            <th className="px-3 py-1.5 text-left">Data nasterii</th>
                                                            <th className="px-3 py-1.5 text-left">CNP</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr className="border-t border-zinc-700">
                                                            <td className="px-3 py-1.5 text-zinc-500 font-medium">CSV:</td>
                                                            <td className="px-3 py-1.5 text-zinc-200">{row.sportivData?.nume || '—'}</td>
                                                            <td className="px-3 py-1.5 text-zinc-200">{row.sportivData?.prenume || '—'}</td>
                                                            <td className="px-3 py-1.5 text-zinc-200">{row.dataNasteriiCSV || '—'}</td>
                                                            <td className="px-3 py-1.5 text-zinc-400">{row.sportivData?.cnp || '—'}</td>
                                                        </tr>
                                                        <tr className="border-t border-zinc-700">
                                                            <td className="px-3 py-1.5 text-zinc-500 font-medium">In DB:</td>
                                                            <td className={`px-3 py-1.5 ${row.sportivData?.nume?.toLowerCase().trim() !== row.existingSportiv.nume?.toLowerCase().trim() ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'text-zinc-200'}`}>
                                                                {row.existingSportiv.nume || '—'}
                                                            </td>
                                                            <td className={`px-3 py-1.5 ${row.sportivData?.prenume?.toLowerCase().trim() !== row.existingSportiv.prenume?.toLowerCase().trim() ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'text-zinc-200'}`}>
                                                                {row.existingSportiv.prenume || '—'}
                                                            </td>
                                                            <td className={`px-3 py-1.5 ${row.sportivData?.data_nasterii !== row.existingSportiv.data_nasterii ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'text-zinc-200'}`}>
                                                                {formatDateForDisplay(row.existingSportiv.data_nasterii)}
                                                            </td>
                                                            <td className="px-3 py-1.5 text-zinc-400">{row.existingSportiv.cnp || '—'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Carduri mobil (< md) */}
            <div className="md:hidden divide-y divide-zinc-800/50 max-h-[60vh] overflow-y-auto">
                {unifiedRows.map((row, idx) => (
                    <div key={idx} className={`p-3 ${row.status === 'EROARE' ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                                <span className="text-zinc-500 text-xs mr-1.5">#{row.originalIndex + 1}</span>
                                <span className="text-zinc-100 font-medium">{row.nume} {row.prenume}</span>
                            </div>
                            {getStatusBadge(row.status)}
                        </div>
                        <div className="text-xs text-zinc-500 mb-1.5">
                            Data: <span className="text-zinc-400">{row.dataNasteriiCSV || '—'}</span>
                        </div>
                        {row.motiv && (
                            <div className="text-xs text-zinc-500 mb-2 leading-relaxed">{row.motiv}</div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            {row.status === 'POSIBIL_DUPLICAT' && row.looseIndex !== undefined && (
                                <>
                                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedIndices.has(row.looseIndex)}
                                            onChange={() => onToggleSelection(row.looseIndex!)}
                                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
                                        />
                                        Actualizeaza
                                    </label>
                                    <button
                                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                        onClick={() => onToggleExpandRow(row.originalIndex)}
                                    >
                                        {expandedRows.has(row.originalIndex) ? '▲ Ascunde' : '▼ Detalii'}
                                    </button>
                                </>
                            )}
                            {row.status === 'ACTUALIZARE_AUTO' && row.strictIndex !== undefined && (
                                <button
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${excludedStrictIndices.has(row.strictIndex) ? 'bg-zinc-700 text-zinc-400 border-zinc-600' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                                    onClick={() => onToggleExcludeStrict(row.strictIndex!)}
                                >
                                    {excludedStrictIndices.has(row.strictIndex) ? 'Inclus' : 'Exclude'}
                                </button>
                            )}
                        </div>
                        {row.status === 'POSIBIL_DUPLICAT' && expandedRows.has(row.originalIndex) && row.existingSportiv && (
                            <div className="mt-2 rounded border border-zinc-700 overflow-hidden text-xs">
                                <div className="grid grid-cols-[3rem_1fr_1fr_1fr] bg-zinc-800/80 text-zinc-500 uppercase tracking-wide">
                                    <div className="px-2 py-1"></div>
                                    <div className="px-2 py-1">Nume</div>
                                    <div className="px-2 py-1">Prenume</div>
                                    <div className="px-2 py-1">Data</div>
                                </div>
                                <div className="grid grid-cols-[3rem_1fr_1fr_1fr] border-t border-zinc-700">
                                    <div className="px-2 py-1.5 text-zinc-500">CSV</div>
                                    <div className="px-2 py-1.5 text-zinc-200">{row.sportivData?.nume || '—'}</div>
                                    <div className="px-2 py-1.5 text-zinc-200">{row.sportivData?.prenume || '—'}</div>
                                    <div className="px-2 py-1.5 text-zinc-200">{row.dataNasteriiCSV || '—'}</div>
                                </div>
                                <div className="grid grid-cols-[3rem_1fr_1fr_1fr] border-t border-zinc-700">
                                    <div className="px-2 py-1.5 text-zinc-500">DB</div>
                                    <div className={`px-2 py-1.5 ${row.sportivData?.nume?.toLowerCase().trim() !== row.existingSportiv.nume?.toLowerCase().trim() ? 'bg-yellow-500/10 text-yellow-300' : 'text-zinc-200'}`}>
                                        {row.existingSportiv.nume || '—'}
                                    </div>
                                    <div className={`px-2 py-1.5 ${row.sportivData?.prenume?.toLowerCase().trim() !== row.existingSportiv.prenume?.toLowerCase().trim() ? 'bg-yellow-500/10 text-yellow-300' : 'text-zinc-200'}`}>
                                        {row.existingSportiv.prenume || '—'}
                                    </div>
                                    <div className={`px-2 py-1.5 ${row.sportivData?.data_nasterii !== row.existingSportiv.data_nasterii ? 'bg-yellow-500/10 text-yellow-300' : 'text-zinc-200'}`}>
                                        {formatDateForDisplay(row.existingSportiv.data_nasterii)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Toggle overwrite */}
        <div className="flex items-start gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <button
                type="button"
                onClick={onToggleOverwrite}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none mt-0.5 ${overwriteMode ? 'bg-amber-500' : 'bg-zinc-600'}`}
                role="switch"
                aria-checked={overwriteMode}
            >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200 ${overwriteMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <div>
                <p className="text-sm font-medium text-zinc-200">
                    {overwriteMode ? 'Suprascrie câmpurile existente' : 'Completează doar câmpurile lipsă'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                    {overwriteMode
                        ? 'Datele din CSV vor înlocui câmpurile existente în baza de date, chiar dacă au deja valori.'
                        : 'Implicit: câmpurile care au deja valori în baza de date nu vor fi modificate.'}
                </p>
                {overwriteMode && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <span>⚠</span> Atenție: această opțiune poate suprascrie date corecte existente.
                    </p>
                )}
            </div>
        </div>

        {/* Actiuni */}
        <div className="flex flex-col gap-4 mt-4">
            {showConfirm ? (
                <div className="bg-violet-900/20 border border-violet-500/50 p-4 rounded-lg">
                    <p className="text-zinc-200 mb-4">
                        Esti pe cale sa adaugi <strong className="text-white">{validNouCount}</strong> sportivi noi si sa actualizezi <strong className="text-white">{activeAutoUpdates + selectedLooseCount}</strong> existenti. Esti sigur?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={onExecuteImport} isLoading={importing} className="w-full sm:w-auto touch-manipulation">
                            Da, Importa acum
                        </Button>
                        <Button variant="secondary" onClick={onCancelConfirm} className="w-full sm:w-auto touch-manipulation">
                            Anuleaza
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={onExecuteImport} isLoading={importing} className="w-full sm:w-auto touch-manipulation">
                        Finalizeaza Import ({seVaImporta} sportivi)
                    </Button>
                    <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto touch-manipulation">
                        Inapoi la incarcare
                    </Button>
                </div>
            )}
        </div>
    </Card>
);
