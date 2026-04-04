/**
 * FacturaChitantaModal.tsx
 *
 * Modal cu două moduri:
 *  - "factura"  → vizualizare factură (ce este datorat, stare plată)
 *  - "chitanta" → vizualizare chitanță (confirmare plată efectuată)
 *
 * Se poate extinde cu export PDF via jspdf + jspdf-autotable.
 */
import React, { useRef } from 'react';
import { Plata, IstoricPlataDetaliat, Sportiv, Familie } from '../types';
import { XIcon, PrinterIcon, CheckCircleIcon, ExclamationTriangleIcon, FileTextIcon } from './icons';
import { getDisplayStatus, STATUS_DISPLAY_CONFIG } from '../utils/paymentStatus';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (val?: string | null) => {
    if (!val) return '—';
    const d = new Date(val.toString().slice(0, 10));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
};

// ─── Tipuri ──────────────────────────────────────────────────────────────────

interface FacturaChitantaModalProps {
    mode: 'factura' | 'chitanta';
    plata: IstoricPlataDetaliat;
    sportiv?: Sportiv | null;
    familie?: Familie | null;
    onClose: () => void;
}

// ─── Componentă ──────────────────────────────────────────────────────────────

export const FacturaChitantaModal: React.FC<FacturaChitantaModalProps> = ({
    mode, plata, sportiv, familie, onClose,
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    const isChitanta = mode === 'chitanta';
    const displayStatus = getDisplayStatus({ status: plata.status, data: plata.data_emitere });
    const statusCfg = STATUS_DISPLAY_CONFIG[displayStatus];

    const numeplatitor = sportiv
        ? `${sportiv.nume} ${sportiv.prenume}`
        : familie?.nume ?? plata.nume_complet_sportiv ?? '—';

    const restDePlata = plata.rest_de_plata ?? Math.max(0, plata.suma_datorata - (plata.total_incasat || 0));
    const sumaAchitata = plata.total_incasat || 0;

    const handlePrint = () => {
        const el = printRef.current;
        if (!el) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
            <html><head><title>${isChitanta ? 'Chitanță' : 'Factură'}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
                h1 { font-size: 22px; margin-bottom: 4px; }
                .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 8px 4px; font-size: 12px; color: #64748b; }
                td { padding: 8px 4px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
                .total { font-weight: bold; font-size: 16px; }
                .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
                .achitat { background: #dcfce7; color: #16a34a; }
                .neachitat { background: #fee2e2; color: #dc2626; }
                .footer { margin-top: 48px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            </style></head><body>${el.innerHTML}</body></html>
        `);
        w.document.close();
        w.print();
        w.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

                {/* ─── Header ─── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isChitanta ? 'bg-emerald-500/15' : 'bg-indigo-500/15'}`}>
                            {isChitanta
                                ? <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                                : <FileTextIcon className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div>
                            <p className="text-white font-bold text-base">
                                {isChitanta ? 'Chitanță de Plată' : 'Factură'}
                            </p>
                            <p className="text-slate-400 text-xs">
                                {isChitanta ? 'Confirmare încasare' : 'Situație obligație de plată'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            title="Printează"
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <PrinterIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ─── Corp (scrollabil) ─── */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4" ref={printRef}>

                    {/* Antet document */}
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                                {isChitanta ? 'Chitanță nr.' : 'Factură nr.'}
                            </p>
                            <p className="text-slate-300 font-mono text-sm">
                                {(plata.tranzactie_id || plata.plata_id || '—').slice(0, 8).toUpperCase()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                                {isChitanta ? 'Data plății' : 'Data emiterii'}
                            </p>
                            <p className="text-slate-300 text-sm font-medium">
                                {isChitanta ? fmtDate(plata.data_plata_string) : fmtDate(plata.data_emitere)}
                            </p>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="border-t border-slate-800" />

                    {/* Date plătitor */}
                    <div className="bg-slate-800/40 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                            {isChitanta ? 'Achitat de' : 'Beneficiar'}
                        </p>
                        <p className="text-white font-semibold text-base">{numeplatitor}</p>
                        {familie && (
                            <p className="text-slate-400 text-xs mt-0.5">Familia {familie.nume}</p>
                        )}
                    </div>

                    {/* Detalii serviciu */}
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                            Detalii serviciu
                        </p>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left py-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">Descriere</th>
                                    <th className="text-right py-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">Sumă</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-800/50">
                                    <td className="py-3 text-white">{plata.descriere || '—'}</td>
                                    <td className="py-3 text-right text-white font-medium whitespace-nowrap">
                                        {fmt(plata.suma_datorata)} RON
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Sumar financiar */}
                    <div className="bg-slate-800/30 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-700/50">
                            <span className="text-sm text-slate-400">Total de plată</span>
                            <span className="text-sm text-white font-medium">{fmt(plata.suma_datorata)} RON</span>
                        </div>
                        {sumaAchitata > 0 && (
                            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-700/50">
                                <span className="text-sm text-emerald-400">Achitat</span>
                                <span className="text-sm text-emerald-400 font-medium">− {fmt(sumaAchitata)} RON</span>
                            </div>
                        )}
                        <div className="px-4 py-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-white">
                                {restDePlata > 0 ? 'Rest de plată' : 'Total achitat'}
                            </span>
                            <span className={`text-lg font-black ${restDePlata > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {fmt(restDePlata > 0 ? restDePlata : sumaAchitata)} RON
                            </span>
                        </div>
                    </div>

                    {/* Status + metodă plată */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold">Status:</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotCls}`} />
                                {statusCfg.label}
                            </span>
                        </div>
                        {isChitanta && plata.metoda_plata && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold
                                ${plata.metoda_plata === 'Cash'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-sky-500/15 text-sky-400'}`}>
                                {plata.metoda_plata}
                            </span>
                        )}
                    </div>

                    {/* Avertisment restanță */}
                    {!isChitanta && restDePlata > 0 && (displayStatus === 'Scadent' || displayStatus === 'Scadent Critic') && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">
                                Această plată este restantă. Te rugăm să contactezi administrația clubului pentru regularizare.
                            </p>
                        </div>
                    )}

                    {/* Footer document */}
                    <div className="border-t border-slate-800 pt-3">
                        <p className="text-xs text-slate-500 text-center">
                            Club Qwan Ki Do · Document generat electronic · {new Date().toLocaleDateString('ro-RO')}
                        </p>
                    </div>
                </div>

                {/* ─── Footer acțiuni ─── */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-800 shrink-0 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-slate-700
                                   hover:border-slate-600 rounded-xl transition-colors font-medium"
                    >
                        Închide
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white
                                   rounded-xl transition-colors font-bold flex items-center justify-center gap-2"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Printează
                    </button>
                </div>
            </div>
        </div>
    );
};
