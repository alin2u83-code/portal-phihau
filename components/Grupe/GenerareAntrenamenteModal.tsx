import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Modal, Input } from '../ui';
import { CheckCircleIcon, CalendarIcon, ClockIcon, CheckIcon, XIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { formatTime } from '../../utils/date';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

interface AntrenamentGenerat {
    key: string;
    data: string;           // YYYY-MM-DD
    ziua: string;
    ora_start: string;
    ora_sfarsit: string;
    orar_id: string;
    selectat: boolean;
}

interface GenerareAntrenamenteModalProps {
    isOpen: boolean;
    onClose: () => void;
    grupa: GrupaWithDetails;
}

// Mapa zi text → număr JS (0=Duminică)
const ZILE_INDEX: Record<string, number> = {
    'Duminică': 0,
    'Luni': 1,
    'Marți': 2,
    'Miercuri': 3,
    'Joi': 4,
    'Vineri': 5,
    'Sâmbătă': 6,
};

// Formatare dată pentru afișare: "Lu, 19 mai 2026"
const formatDataRo = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('ro-RO', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

// Returnează YYYY-MM-DD fără conversie timezone
const toDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getAziStr = (): string => toDateStr(new Date());

export const GenerareAntrenamenteModal: React.FC<GenerareAntrenamenteModalProps> = ({
    isOpen,
    onClose,
    grupa,
}) => {
    const azi = getAziStr();
    const [dataStart, setDataStart] = useState<string>(azi);
    const [dataEnd, setDataEnd] = useState<string>('');
    const [preview, setPreview] = useState<AntrenamentGenerat[] | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

    // Resetare la deschidere modal
    React.useEffect(() => {
        if (isOpen) {
            setDataStart(azi);
            setDataEnd('');
            setPreview(null);
            setErrMsg(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const programActiv = useMemo(
        () => (grupa.program || []).filter(p => p.is_activ !== false),
        [grupa.program]
    );

    // Generează lista de antrenamente din interval + orar
    const handleGeneratePreview = useCallback(async () => {
        setErrMsg(null);
        if (!dataStart || !dataEnd) {
            setErrMsg('Selectează data de început și data de sfârșit.');
            return;
        }
        if (dataEnd < dataStart) {
            setErrMsg('Data de sfârșit trebuie să fie după data de început.');
            return;
        }
        if (programActiv.length === 0) {
            setErrMsg('Această grupă nu are niciun slot de orar activ definit.');
            return;
        }

        setLoadingPreview(true);
        try {
            // Fetch antrenamente existente în interval pentru deduplicare
            const { data: existente } = await supabase
                .from('program_antrenamente')
                .select('data, ora_start, grupa_id')
                .eq('grupa_id', grupa.id)
                .gte('data', dataStart)
                .lte('data', dataEnd);

            const existenteSet = new Set(
                (existente || []).map(e => `${(e.data || '').toString().slice(0, 10)}-${e.ora_start}`)
            );

            const rezultat: AntrenamentGenerat[] = [];
            const start = new Date(dataStart + 'T00:00:00');
            const end = new Date(dataEnd + 'T00:00:00');

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayIndex = d.getDay();
                const dateStr = toDateStr(d);

                for (const slot of programActiv) {
                    if (ZILE_INDEX[slot.ziua] === dayIndex) {
                        const key = `${dateStr}-${slot.ora_start}`;
                        const deja = existenteSet.has(key);
                        rezultat.push({
                            key,
                            data: dateStr,
                            ziua: slot.ziua,
                            ora_start: slot.ora_start,
                            ora_sfarsit: slot.ora_sfarsit,
                            orar_id: slot.id,
                            // cele existente deja sunt debifate automat (nu le suprascriem)
                            selectat: !deja,
                        });
                    }
                }
            }

            setPreview(rezultat);
        } catch (err: any) {
            setErrMsg('Eroare la generarea preview-ului: ' + err.message);
        } finally {
            setLoadingPreview(false);
        }
    }, [dataStart, dataEnd, programActiv, grupa.id]);

    const handleToggle = (key: string) => {
        setPreview(prev =>
            prev ? prev.map(a => a.key === key ? { ...a, selectat: !a.selectat } : a) : prev
        );
    };

    const handleToggleAll = (val: boolean) => {
        setPreview(prev => prev ? prev.map(a => ({ ...a, selectat: val })) : prev);
    };

    const handleSave = async () => {
        if (!preview) return;
        const deInsertat = preview.filter(a => a.selectat);
        if (deInsertat.length === 0) {
            setErrMsg('Nu ai selectat niciun antrenament de inserat.');
            return;
        }

        setLoadingSave(true);
        setErrMsg(null);
        try {
            const recurentGroupId = crypto.randomUUID();
            const rows = deInsertat.map(a => ({
                grupa_id: grupa.id,
                club_id: grupa.club_id,
                data: a.data,
                ziua: a.ziua,
                ora_start: a.ora_start,
                ora_sfarsit: a.ora_sfarsit,
                status: 'planificat',
                is_recurent: true,
                orar_id: a.orar_id !== a.key ? a.orar_id : null,
                recurent_group_id: recurentGroupId,
            }));

            const { error } = await supabase.from('program_antrenamente').insert(rows);
            if (error) throw error;

            // Invalidează cache-ul de antrenamente
            await queryClient.invalidateQueries({ queryKey: ['program_antrenamente'] });
            await queryClient.invalidateQueries({ queryKey: ['antrenamente'] });

            showSuccess(
                'Antrenamente generate',
                `${deInsertat.length} antrenament${deInsertat.length !== 1 ? 'e adăugate' : ' adăugat'} cu succes.`
            );
            onClose();
        } catch (err: any) {
            showError('Eroare la salvare', err.message);
        } finally {
            setLoadingSave(false);
        }
    };

    const nrSelectate = preview?.filter(a => a.selectat).length ?? 0;
    const nrTotal = preview?.length ?? 0;
    const nrExistente = preview?.filter(a => !a.selectat).length ?? 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Generează Antrenamente — ${grupa.denumire}`}
        >
            <div className="space-y-5">
                {/* Info orar activ */}
                <div className="flex items-start gap-2 text-slate-400 text-sm -mt-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span>
                        Generează antrenamente concrete din orarul săptămânal al grupei pe o perioadă selectată.
                        {programActiv.length > 0 ? (
                            <span className="text-slate-300 ml-1">
                                ({programActiv.length} slot{programActiv.length !== 1 ? 'uri' : ''} activ{programActiv.length !== 1 ? 'e' : ''}: {programActiv.map(p => p.ziua).join(', ')})
                            </span>
                        ) : (
                            <span className="text-rose-400 ml-1">Niciun orar activ definit pentru această grupă.</span>
                        )}
                    </span>
                </div>

                {/* Inputs dată */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Data start"
                        type="date"
                        value={dataStart}
                        min={azi}
                        onChange={e => { setDataStart(e.target.value); setPreview(null); }}
                    />
                    <Input
                        label="Data sfârșit"
                        type="date"
                        value={dataEnd}
                        min={dataStart || azi}
                        onChange={e => { setDataEnd(e.target.value); setPreview(null); }}
                    />
                </div>

                {/* Eroare validare */}
                {errMsg && (
                    <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-rose-400 text-sm">
                        <XIcon className="w-4 h-4 shrink-0" />
                        {errMsg}
                    </div>
                )}

                {/* Buton generare preview */}
                {!preview && (
                    <Button
                        variant="info"
                        onClick={handleGeneratePreview}
                        isLoading={loadingPreview}
                        disabled={!dataStart || !dataEnd || programActiv.length === 0}
                        className="w-full"
                    >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Generează Preview
                    </Button>
                )}

                {/* Preview tabel */}
                {preview !== null && (
                    <div className="space-y-3">
                        {/* Header preview cu statistici */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-sm flex-wrap">
                                <span className="text-slate-300 font-medium">
                                    {nrTotal} antrenament{nrTotal !== 1 ? 'e' : ''} găsite
                                </span>
                                {nrExistente > 0 && (
                                    <span className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                        {nrExistente} deja existente (debifate)
                                    </span>
                                )}
                                <span className="text-green-400 text-xs bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                                    {nrSelectate} selectate
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleToggleAll(true)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors"
                                >
                                    Bifează toate
                                </button>
                                <span className="text-slate-600">|</span>
                                <button
                                    onClick={() => handleToggleAll(false)}
                                    className="text-xs text-slate-400 hover:text-slate-300 underline transition-colors"
                                >
                                    Debifează toate
                                </button>
                                <span className="text-slate-600">|</span>
                                <button
                                    onClick={() => { setPreview(null); setErrMsg(null); }}
                                    className="text-xs text-rose-400 hover:text-rose-300 underline transition-colors"
                                >
                                    Resetează
                                </button>
                            </div>
                        </div>

                        {nrTotal === 0 ? (
                            <div className="text-center py-8 text-slate-400 italic text-sm bg-slate-800/30 rounded-xl border border-slate-700/50">
                                Niciun antrenament de generat în intervalul selectat.
                            </div>
                        ) : (
                            <div className="max-h-[35vh] sm:max-h-[40vh] overflow-y-auto rounded-xl border border-slate-700/50">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-800 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={nrSelectate === nrTotal && nrTotal > 0}
                                                    onChange={e => handleToggleAll(e.target.checked)}
                                                    className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800"
                                                />
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Zi</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Orar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {preview.map(a => (
                                            <tr
                                                key={a.key}
                                                onClick={() => handleToggle(a.key)}
                                                className={`cursor-pointer transition-colors ${
                                                    a.selectat
                                                        ? 'bg-slate-800/20 hover:bg-slate-700/30'
                                                        : 'bg-slate-900/40 opacity-50 hover:opacity-70'
                                                }`}
                                            >
                                                <td className="px-3 py-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={a.selectat}
                                                        onChange={() => handleToggle(a.key)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800"
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-200 font-medium">
                                                    {formatDataRo(a.data)}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-400 hidden sm:table-cell">
                                                    {a.ziua}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className="inline-flex items-center gap-1.5 text-indigo-300 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {formatTime(a.ora_start)} - {formatTime(a.ora_sfarsit)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer butoane */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loadingSave} className="w-full sm:w-auto">
                        Anulează
                    </Button>
                    {preview !== null && nrTotal > 0 && (
                        <Button
                            variant="success"
                            onClick={handleSave}
                            isLoading={loadingSave}
                            disabled={nrSelectate === 0}
                            className="w-full sm:w-auto"
                        >
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Inserează {nrSelectate > 0 ? `${nrSelectate} ` : ''}Antrenament{nrSelectate !== 1 ? 'e' : ''}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
