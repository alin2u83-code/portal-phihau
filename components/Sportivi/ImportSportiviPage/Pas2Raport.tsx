import React, { useState } from 'react';
import { Card, Button } from '../../ui';
import { ImportResult } from './types';
import { formatDateForDisplay } from './utils';
import { Wand2, Copy, Check, Download, AlertTriangle } from 'lucide-react';

interface LinkGenerat {
    id: string;
    nume: string;
    prenume: string;
    link: string;
    tempEmail: string;
}

interface LinkEroare {
    id: string;
    nume: string;
    prenume: string;
    error: string;
}

interface Props {
    importResult: ImportResult;
    onBack: () => void;
}

export const Pas2Raport: React.FC<Props> = ({ importResult, onBack }) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['omisi']));
    const [generareStatus, setGenerareStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [linkuriGenerate, setLinkuriGenerate] = useState<LinkGenerat[]>([]);
    const [linkuriErori, setLinkuriErori] = useState<LinkEroare[]>([]);
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedIndividual, setCopiedIndividual] = useState<string | null>(null);
    const [progres, setProgres] = useState(0);

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
        const csv = BOM + header + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raport_import_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleGenerareMagicLinkuri = async () => {
        const sportiviFaraId = importResult.adaugati.filter(s => !s.id);
        if (sportiviFaraId.length > 0) return;

        setGenerareStatus('loading');
        setProgres(0);
        const rezultate: LinkGenerat[] = [];
        const erori: LinkEroare[] = [];

        for (let i = 0; i < importResult.adaugati.length; i++) {
            const s = importResult.adaugati[i];
            try {
                const response = await fetch('/api/genereaza-magic-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sportiv_id: s.id, roles: ['SPORTIV'] }),
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    rezultate.push({ id: s.id, nume: s.nume, prenume: s.prenume, link: result.link, tempEmail: result.tempEmail });
                } else {
                    erori.push({ id: s.id, nume: s.nume, prenume: s.prenume, error: result.error || 'Eroare necunoscută' });
                }
            } catch {
                erori.push({ id: s.id, nume: s.nume, prenume: s.prenume, error: 'Eroare de rețea' });
            }
            setProgres(i + 1);
        }

        setLinkuriGenerate(rezultate);
        setLinkuriErori(erori);
        setGenerareStatus('done');
    };

    const exportLinkuriCSV = () => {
        const BOM = '﻿';
        const header = 'Prenume,Nume,Email Provizoriu,Magic Link';
        const rows = linkuriGenerate.map(l =>
            `"${l.prenume}","${l.nume}","${l.tempEmail}","${l.link}"`
        );
        const csv = BOM + header + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `magic_linkuri_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleCopyAll = () => {
        const text = linkuriGenerate.map(l => `${l.prenume} ${l.nume}: ${l.link}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2500);
    };

    const handleCopyOne = (link: LinkGenerat) => {
        navigator.clipboard.writeText(link.link);
        setCopiedIndividual(link.id);
        setTimeout(() => setCopiedIndividual(null), 2500);
    };

    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    const adaugatiCuId = importResult.adaugati.filter(s => s.id);

    return (
        <Card className="p-4 md:p-6 space-y-6">
            {/* Header raport */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

            {/* Statistici */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            {/* Sectiune Magic Link-uri — doar pt. sportivii nou adaugati */}
            {adaugatiCuId.length > 0 && (
                <div className="border border-amber-500/30 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10">
                        <Wand2 className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="font-semibold text-amber-300 text-sm">Generează magic link-uri de conectare</p>
                            <p className="text-xs text-amber-200/60">{adaugatiCuId.length} sportivi noi — fără cont activ</p>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {generareStatus === 'idle' && (
                            <Button
                                type="button"
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2"
                                onClick={handleGenerareMagicLinkuri}
                            >
                                <Wand2 className="w-4 h-4" />
                                Generează {adaugatiCuId.length} magic link-uri
                            </Button>
                        )}

                        {generareStatus === 'loading' && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Se generează link-urile...</span>
                                    <span>{progres} / {adaugatiCuId.length}</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2">
                                    <div
                                        className="bg-amber-500 h-2 rounded-full transition-all"
                                        style={{ width: `${(progres / adaugatiCuId.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {generareStatus === 'done' && (
                            <div className="space-y-4">
                                {/* Sumar */}
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-green-400">{linkuriGenerate.length}</div>
                                        <div className="text-xs text-green-300">Generate</div>
                                    </div>
                                    {linkuriErori.length > 0 && (
                                        <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-red-400">{linkuriErori.length}</div>
                                            <div className="text-xs text-red-300">Erori</div>
                                        </div>
                                    )}
                                </div>

                                {/* Actiuni export */}
                                {linkuriGenerate.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={exportLinkuriCSV}
                                            className="flex items-center gap-1"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export CSV
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={copiedAll ? 'success' : 'secondary'}
                                            size="sm"
                                            onClick={handleCopyAll}
                                            className="flex items-center gap-1"
                                        >
                                            {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copiedAll ? 'Copiat!' : 'Copiază toate (WhatsApp)'}
                                        </Button>
                                    </div>
                                )}

                                {/* Tabel link-uri */}
                                {linkuriGenerate.length > 0 && (
                                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/50">
                                            {linkuriGenerate.map(l => (
                                                <div key={l.id} className="flex items-center gap-3 px-3 py-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-zinc-200 font-medium">{l.prenume} {l.nume}</p>
                                                        <p className="text-xs text-zinc-500 font-mono truncate">{l.link}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyOne(l)}
                                                        className={`shrink-0 p-1.5 rounded transition-colors ${
                                                            copiedIndividual === l.id
                                                                ? 'text-green-400 bg-green-500/10'
                                                                : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                                                        }`}
                                                        title="Copiază link"
                                                    >
                                                        {copiedIndividual === l.id
                                                            ? <Check className="w-4 h-4" />
                                                            : <Copy className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Erori */}
                                {linkuriErori.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Erori la generare:
                                        </p>
                                        {linkuriErori.map(e => (
                                            <div key={e.id} className="text-xs text-red-300/70 pl-4">
                                                {e.prenume} {e.nume} — {e.error}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Liste detaliate import */}
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
