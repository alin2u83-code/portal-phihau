import React, { useState, useMemo, useCallback } from 'react';
import { Sportiv } from '../../types';
import { Modal, Button, Input, Select } from '../ui';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { formatNume } from '../../utils/formatareSportiv';
import toast from 'react-hot-toast';

type PerioadaTip = 'luna-curenta' | 'an-curent' | 'custom';

interface PlataRaport {
    id: string;
    data: string;
    descriere: string;
    suma: number;
    status: string;
}

interface PrezentaLuna {
    luna: string;
    count: number;
}

interface RaportData {
    platiAchitate: PlataRaport[];
    restante: PlataRaport[];
    prezentePerLuna: PrezentaLuna[];
    totalPrezente: number;
}

const fmtDate = (v: string) => {
    const d = new Date(v.slice(0, 10));
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('ro-RO');
};

const fmtLuna = (ym: string) => {
    const [y, m] = ym.split('-');
    const luni = ['', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${luni[parseInt(m, 10)]} ${y}`;
};

const fmtSuma = (n: number) =>
    n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const RaportCompletSportiv: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv;
}> = ({ isOpen, onClose, sportiv }) => {
    const today = new Date().toLocaleDateString('sv-SE');
    const firstDayOfMonth = today.substring(0, 7) + '-01';
    const firstDayOfYear = today.substring(0, 4) + '-01-01';

    const [perioadaTip, setPerioadaTip] = useState<PerioadaTip>('luna-curenta');
    const [dataStart, setDataStart] = useState(firstDayOfMonth);
    const [dataEnd, setDataEnd] = useState(today);
    const [raport, setRaport] = useState<RaportData | null>(null);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const { from, to } = useMemo(() => {
        if (perioadaTip === 'luna-curenta') return { from: firstDayOfMonth, to: today };
        if (perioadaTip === 'an-curent') return { from: firstDayOfYear, to: today };
        return { from: dataStart, to: dataEnd };
    }, [perioadaTip, dataStart, dataEnd, firstDayOfMonth, firstDayOfYear, today]);

    const fetchRaport = useCallback(async () => {
        setLoading(true);
        setRaport(null);
        try {
            const [platiRes, antRes, statuseRes] = await Promise.all([
                supabase
                    .from('plati')
                    .select('id, data, descriere, suma, status')
                    .eq('sportiv_id', sportiv.id)
                    .gte('data', from)
                    .lte('data', to)
                    .order('data'),
                supabase
                    .from('program_antrenamente')
                    .select('id, data')
                    .gte('data', from)
                    .lte('data', to),
                supabase
                    .from('statuse_prezenta')
                    .select('id')
                    .eq('este_prezent', true),
            ]);

            if (platiRes.error) throw platiRes.error;
            if (antRes.error) throw antRes.error;

            const antIds = (antRes.data || []).map(a => a.id);
            const statusePrezentIds = (statuseRes.data || []).map(s => s.id);
            const antDateMap = new Map((antRes.data || []).map(a => [a.id, a.data as string]));

            let prezenteData: { antrenament_id: string }[] = [];
            if (antIds.length > 0 && statusePrezentIds.length > 0) {
                const { data: prez, error: prezError } = await supabase
                    .from('prezenta_antrenament')
                    .select('antrenament_id')
                    .eq('sportiv_id', sportiv.id)
                    .in('antrenament_id', antIds)
                    .in('status_id', statusePrezentIds);
                if (prezError) throw prezError;
                prezenteData = prez || [];
            }

            const prezLunaMap: Record<string, number> = {};
            for (const p of prezenteData) {
                const data = antDateMap.get(p.antrenament_id);
                if (data) {
                    const luna = data.substring(0, 7);
                    prezLunaMap[luna] = (prezLunaMap[luna] || 0) + 1;
                }
            }

            const plati = (platiRes.data || []) as PlataRaport[];

            setRaport({
                platiAchitate: plati.filter(p => p.status === 'Achitat'),
                restante: plati.filter(p => p.status !== 'Achitat'),
                prezentePerLuna: Object.entries(prezLunaMap)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([luna, count]) => ({ luna, count })),
                totalPrezente: prezenteData.length,
            });
        } catch (err: any) {
            showError('Eroare la generare raport', err.message);
        } finally {
            setLoading(false);
        }
    }, [sportiv.id, from, to, showError]);

    const handleDownloadPDF = async () => {
        if (!raport) return;
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(`Raport — ${formatNume(sportiv)}`, 14, 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Perioadă: ${fmtDate(from)} — ${fmtDate(to)}`, 14, 21);
        doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')}`, 14, 27);

        let y = 34;

        if (raport.platiAchitate.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(16, 185, 129);
            doc.text(`Plăți achitate (${raport.platiAchitate.length})`, 14, y);
            y += 3;
            autoTable(doc, {
                head: [['Data', 'Descriere', 'Sumă (RON)']],
                body: raport.platiAchitate.map(p => [fmtDate(p.data), p.descriere, fmtSuma(p.suma)]),
                startY: y,
                styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] as [number, number, number] },
                headStyles: { fillColor: [16, 185, 129] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
                alternateRowStyles: { fillColor: [240, 253, 244] as [number, number, number] },
                foot: [[
                    'TOTAL',
                    '',
                    fmtSuma(raport.platiAchitate.reduce((s, p) => s + p.suma, 0)) + ' RON',
                ]],
                footStyles: { fillColor: [209, 250, 229] as [number, number, number], fontStyle: 'bold' },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }

        if (raport.restante.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68);
            doc.text(`Restanțe (${raport.restante.length})`, 14, y);
            y += 3;
            autoTable(doc, {
                head: [['Data', 'Descriere', 'Sumă (RON)', 'Status']],
                body: raport.restante.map(p => [fmtDate(p.data), p.descriere, fmtSuma(p.suma), p.status]),
                startY: y,
                styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] as [number, number, number] },
                headStyles: { fillColor: [239, 68, 68] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
                alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
                foot: [[
                    'TOTAL RESTANȚE',
                    '',
                    fmtSuma(raport.restante.reduce((s, p) => s + p.suma, 0)) + ' RON',
                    '',
                ]],
                footStyles: { fillColor: [254, 226, 226] as [number, number, number], fontStyle: 'bold' },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }

        if (raport.prezentePerLuna.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(99, 102, 241);
            doc.text(`Prezențe antrenamente (total: ${raport.totalPrezente})`, 14, y);
            y += 3;
            autoTable(doc, {
                head: [['Luna', 'Nr. prezențe']],
                body: raport.prezentePerLuna.map(p => [fmtLuna(p.luna), String(p.count)]),
                startY: y,
                styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] as [number, number, number] },
                headStyles: { fillColor: [99, 102, 241] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
                alternateRowStyles: { fillColor: [238, 242, 255] as [number, number, number] },
            });
        }

        doc.save(`raport-${sportiv.nume || 'sportiv'}-${from}.pdf`);
        toast.success('PDF descărcat!');
    };

    const handleCopyText = () => {
        if (!raport) return;
        const lines: string[] = [
            `*Raport ${formatNume(sportiv)}*`,
            `Perioadă: ${fmtDate(from)} — ${fmtDate(to)}`,
            '',
        ];

        if (raport.platiAchitate.length > 0) {
            const total = raport.platiAchitate.reduce((s, p) => s + p.suma, 0);
            lines.push(`✅ *Plăți achitate (${raport.platiAchitate.length}) — Total: ${fmtSuma(total)} RON*`);
            raport.platiAchitate.forEach(p => {
                lines.push(`  • ${fmtDate(p.data)} — ${p.descriere}: ${fmtSuma(p.suma)} RON`);
            });
            lines.push('');
        } else {
            lines.push('✅ Nicio plată achitată în această perioadă.');
            lines.push('');
        }

        if (raport.restante.length > 0) {
            const total = raport.restante.reduce((s, p) => s + p.suma, 0);
            lines.push(`❌ *Restanțe (${raport.restante.length}) — Total: ${fmtSuma(total)} RON*`);
            raport.restante.forEach(p => {
                lines.push(`  • ${p.descriere}: ${fmtSuma(p.suma)} RON (${p.status})`);
            });
            lines.push('');
        } else {
            lines.push('✅ Fără restanțe în această perioadă.');
            lines.push('');
        }

        if (raport.totalPrezente > 0) {
            lines.push(`🥋 *Prezențe: ${raport.totalPrezente} antrenamente*`);
            raport.prezentePerLuna.forEach(p => {
                lines.push(`  • ${fmtLuna(p.luna)}: ${p.count} prezențe`);
            });
        } else {
            lines.push('🥋 Nicio prezență înregistrată în această perioadă.');
        }

        navigator.clipboard.writeText(lines.join('\n'));
        toast.success('Text copiat! Poți lipi direct în WhatsApp.');
    };

    const totalAchitat = raport?.platiAchitate.reduce((s, p) => s + p.suma, 0) ?? 0;
    const totalRestante = raport?.restante.reduce((s, p) => s + p.suma, 0) ?? 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Raport — ${formatNume(sportiv)}`}>
            <div className="space-y-4">
                {/* Selector perioadă */}
                <div className="space-y-3">
                    <Select
                        label="Perioadă"
                        value={perioadaTip}
                        onChange={e => { setPerioadaTip(e.target.value as PerioadaTip); setRaport(null); }}
                    >
                        <option value="luna-curenta">Luna curentă</option>
                        <option value="an-curent">Anul curent</option>
                        <option value="custom">Interval personalizat</option>
                    </Select>
                    {perioadaTip === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="De la"
                                type="date"
                                value={dataStart}
                                onChange={e => { setDataStart(e.target.value); setRaport(null); }}
                            />
                            <Input
                                label="Până la"
                                type="date"
                                value={dataEnd}
                                onChange={e => { setDataEnd(e.target.value); setRaport(null); }}
                            />
                        </div>
                    )}
                </div>

                <Button variant="primary" onClick={fetchRaport} disabled={loading} className="w-full">
                    {loading ? 'Se generează...' : 'Generează Raport'}
                </Button>

                {/* Preview raport */}
                {raport && (
                    <div className="space-y-4 mt-2">
                        {/* Sumar rapid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-400 mb-1">Achitat</p>
                                <p className="text-lg font-black text-emerald-400">{fmtSuma(totalAchitat)}</p>
                                <p className="text-xs text-slate-500">RON</p>
                            </div>
                            <div className={`border rounded-xl p-3 text-center ${totalRestante > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800 border-slate-700'}`}>
                                <p className="text-xs text-slate-400 mb-1">Restanțe</p>
                                <p className={`text-lg font-black ${totalRestante > 0 ? 'text-red-400' : 'text-slate-400'}`}>{fmtSuma(totalRestante)}</p>
                                <p className="text-xs text-slate-500">RON</p>
                            </div>
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-400 mb-1">Prezențe</p>
                                <p className="text-lg font-black text-indigo-400">{raport.totalPrezente}</p>
                                <p className="text-xs text-slate-500">antrenamente</p>
                            </div>
                        </div>

                        {/* Plăți achitate */}
                        {raport.platiAchitate.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-emerald-400 mb-2">Plăți achitate ({raport.platiAchitate.length})</h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {raport.platiAchitate.map(p => (
                                        <div key={p.id} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5 text-sm">
                                            <span className="text-slate-300">{fmtDate(p.data)} — {p.descriere}</span>
                                            <span className="text-emerald-400 font-bold ml-2 shrink-0">{fmtSuma(p.suma)} RON</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Restanțe */}
                        {raport.restante.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-red-400 mb-2">Restanțe ({raport.restante.length})</h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {raport.restante.map(p => (
                                        <div key={p.id} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5 text-sm">
                                            <span className="text-slate-300">{p.descriere}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-slate-500">{p.status}</span>
                                                <span className="text-red-400 font-bold">{fmtSuma(p.suma)} RON</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prezențe per lună */}
                        {raport.prezentePerLuna.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-indigo-400 mb-2">Prezențe pe luni</h4>
                                <div className="flex flex-wrap gap-2">
                                    {raport.prezentePerLuna.map(p => (
                                        <span key={p.luna} className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold px-3 py-1.5 rounded-lg">
                                            {fmtLuna(p.luna)}: {p.count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fără date */}
                        {raport.platiAchitate.length === 0 && raport.restante.length === 0 && raport.totalPrezente === 0 && (
                            <p className="text-center text-slate-500 py-4">Nicio dată pentru această perioadă.</p>
                        )}

                        {/* Butoane export */}
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" onClick={handleDownloadPDF} className="flex-1">
                                📄 Download PDF
                            </Button>
                            <Button variant="secondary" onClick={handleCopyText} className="flex-1">
                                📋 Copiază text
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
