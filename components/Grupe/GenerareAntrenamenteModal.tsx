import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Modal, Input, Select } from '../ui';
import { CheckCircleIcon, CalendarIcon, ClockIcon, XIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { formatTime } from '../../utils/date';
import { clearCache } from '../../utils/cache';
import { useSezoane } from '../../hooks/useSezoane';
import { sincronizeazaOrar } from '../../services/orarGrupaService';

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
    /** Apelat după inserare reușită (ex: reîncarcă calendarul grupei). */
    onGenerated?: () => void;
    /** Dacă e dat, pasul 1 oferă buton către editorul de orar (tab Orar). */
    onEditOrar?: () => void;
    /** Apelat după ce orarul grupei a fost înlocuit prin copiere. */
    onOrarChanged?: () => void;
    /** Tab-ul Orar are modificări nesalvate care se pierd la copiere. */
    orarNesalvat?: boolean;
}

type Pas = 1 | 2 | 3;

const ZILE_INDEX: Record<string, number> = {
    'Duminică': 0, 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6,
};
const ZILE_ORDINE = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

const formatDataRo = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ro-RO', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
};

// YYYY-MM-DD fără conversie timezone
const toDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const adaugaZile = (dateStr: string, zile: number): string => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + zile);
    return toDateStr(d);
};

const sfarsitDeLuna = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

const clearGrupeCache = () =>
    Object.keys(localStorage).filter(k => k.startsWith('cache_grupe_')).forEach(k => clearCache(k));

const TITLURI_PAS: Record<Pas, string> = { 1: 'Orar', 2: 'Perioadă', 3: 'Previzualizare' };

export const GenerareAntrenamenteModal: React.FC<GenerareAntrenamenteModalProps> = ({
    isOpen, onClose, grupa, onGenerated, onEditOrar, onOrarChanged, orarNesalvat,
}) => {
    const azi = toDateStr(new Date());
    const [pas, setPas] = useState<Pas>(1);
    const [orar, setOrar] = useState<ProgramItem[]>([]);
    const [loadingOrar, setLoadingOrar] = useState(false);
    const [dataStart, setDataStart] = useState<string>(azi);
    const [dataEnd, setDataEnd] = useState<string>(adaugaZile(azi, 27));
    const [preview, setPreview] = useState<AntrenamentGenerat[] | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    // copiere orar din altă grupă
    const [copieOpen, setCopieOpen] = useState(false);
    const [altele, setAltele] = useState<{ id: string; denumire: string; program: ProgramItem[] }[]>([]);
    const [sursaId, setSursaId] = useState('');
    const [loadingCopie, setLoadingCopie] = useState(false);

    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();
    const { data: sezoane = [] } = useSezoane(grupa.club_id);
    const sezonGrupa = (grupa as any).tip_grupa === 'per_sezon'
        ? sezoane.find(s => s.id === (grupa as any).sezon_id)
        : null;

    // Orarul se citește proaspăt din DB: prop-ul grupa.program poate fi vechi după editări în tab-ul Orar.
    const incarcaOrar = useCallback(async () => {
        setLoadingOrar(true);
        const { data, error } = await supabase.from('orar_saptamanal').select('*').eq('grupa_id', grupa.id);
        if (error) showError('Eroare la citirea orarului', error.message);
        else setOrar((data || []) as ProgramItem[]);
        setLoadingOrar(false);
    }, [grupa.id, showError]);

    useEffect(() => {
        if (!isOpen) return;
        setPas(1);
        setDataStart(azi);
        setDataEnd(adaugaZile(azi, 27));
        setPreview(null);
        setErrMsg(null);
        setCopieOpen(false);
        setSursaId('');
        setAltele([]); // lista grupelor sursă se reîncarcă la fiecare deschidere
        incarcaOrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, grupa.id]);

    // dedup după zi + oră start: dublurile ar da chei React duplicate și 23505 la inserare
    const orarActiv = orar.filter(p => p.is_activ !== false)
        .filter((p, i, arr) => arr.findIndex(q => q.ziua === p.ziua && q.ora_start === p.ora_start) === i);
    const orarSortat = [...orarActiv].sort((a, b) =>
        ZILE_ORDINE.indexOf(a.ziua) - ZILE_ORDINE.indexOf(b.ziua) || a.ora_start.localeCompare(b.ora_start));

    // --- Copiere orar din altă grupă ---
    const deschideCopie = async () => {
        setCopieOpen(true);
        if (altele.length > 0) return;
        const { data, error } = await supabase
            .from('grupe')
            .select('id, denumire, program:orar_saptamanal!grupa_id(*)')
            .eq('club_id', grupa.club_id)
            .neq('id', grupa.id)
            .order('denumire');
        if (error) { showError('Eroare la citirea grupelor', error.message); return; }
        setAltele(((data || []) as any[]).filter(g => (g.program || []).length > 0));
    };

    const handleCopiaza = async () => {
        const sursa = altele.find(g => g.id === sursaId);
        if (!sursa) return;
        setLoadingCopie(true);
        try {
            // fără id → toate intervalele sunt noi; cele vechi se șterg doar după inserarea reușită
            await sincronizeazaOrar(grupa.id, grupa.club_id,
                sursa.program.map(p => ({ ziua: p.ziua, ora_start: p.ora_start, ora_sfarsit: p.ora_sfarsit, is_activ: p.is_activ ?? true })));
            clearGrupeCache();
            await queryClient.invalidateQueries({ queryKey: ['grupe'] });
            await incarcaOrar();
            onOrarChanged?.();
            setCopieOpen(false);
            showSuccess('Orar copiat', `Orarul grupei '${sursa.denumire}' a fost copiat.`);
        } catch (err: any) {
            showError('Eroare la copierea orarului', err.message || err);
        } finally {
            setLoadingCopie(false);
        }
    };

    // --- Presetări perioadă ---
    const seteazaPerioada = (end: string) => { setDataEnd(end); setPreview(null); setErrMsg(null); };
    const presete: { label: string; end: string | null }[] = [
        { label: '4 săptămâni', end: adaugaZile(dataStart, 27) },
        { label: 'Până la sfârșit de lună', end: sfarsitDeLuna(dataStart) },
        { label: '3 luni', end: adaugaZile(dataStart, 90) },
        { label: sezonGrupa ? `Până la sfârșit de sezon` : '', end: sezonGrupa?.data_final ?? null },
    ].filter(p => p.end && p.end >= dataStart && p.label);

    // --- Previzualizare ---
    const genereazaPreview = useCallback(async () => {
        setErrMsg(null);
        if (!dataStart || !dataEnd) { setErrMsg('Selectează data de început și data de sfârșit.'); return false; }
        if (dataEnd < dataStart) { setErrMsg('Data de sfârșit trebuie să fie după data de început.'); return false; }
        if (orarActiv.length === 0) { setErrMsg('Grupa nu are niciun interval de orar activ.'); return false; }

        setLoadingPreview(true);
        try {
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
                const dateStr = toDateStr(d);
                for (const slot of orarActiv) {
                    if (ZILE_INDEX[slot.ziua] === d.getDay()) {
                        const key = `${dateStr}-${slot.ora_start}`;
                        rezultat.push({
                            key, data: dateStr, ziua: slot.ziua,
                            ora_start: slot.ora_start, ora_sfarsit: slot.ora_sfarsit,
                            orar_id: slot.id,
                            selectat: !existenteSet.has(key), // cele existente nu se suprascriu
                        });
                    }
                }
            }
            setPreview(rezultat);
            return true;
        } catch (err: any) {
            setErrMsg('Eroare la generarea previzualizării: ' + err.message);
            return false;
        } finally {
            setLoadingPreview(false);
        }
    }, [dataStart, dataEnd, orarActiv, grupa.id]);

    const mergiLaPas3 = async () => {
        if (await genereazaPreview()) setPas(3);
    };

    const handleToggle = (key: string) =>
        setPreview(prev => prev ? prev.map(a => a.key === key ? { ...a, selectat: !a.selectat } : a) : prev);
    const handleToggleAll = (val: boolean) =>
        setPreview(prev => prev ? prev.map(a => ({ ...a, selectat: val })) : prev);

    const handleSave = async () => {
        if (!preview) return;
        const deInsertat = preview.filter(a => a.selectat);
        if (deInsertat.length === 0) { setErrMsg('Nu ai selectat niciun antrenament de inserat.'); return; }

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
            if (error) {
                // UNIQUE poate respinge dacă a apărut un rând concurent între previzualizare și salvare
                if (error.code === '23505') {
                    showError('Antrenament existent', 'Cel puțin un antrenament din selecție există deja și nu a fost creat din nou.');
                    return;
                }
                throw error;
            }
            await queryClient.invalidateQueries({ queryKey: ['program_antrenamente'] });
            await queryClient.invalidateQueries({ queryKey: ['antrenamente'] });
            showSuccess(
                'Antrenamente generate',
                `${deInsertat.length} antrenament${deInsertat.length !== 1 ? 'e adăugate' : ' adăugat'} cu succes.`
            );
            onGenerated?.();
            onClose();
        } catch (err: any) {
            showError('Eroare la salvare', err.message);
        } finally {
            setLoadingSave(false);
        }
    };

    const nrSelectate = preview?.filter(a => a.selectat).length ?? 0;
    const nrTotal = preview?.length ?? 0;
    const nrExistente = nrTotal - (preview?.filter(a => a.selectat).length ?? 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Generează program — ${grupa.denumire}`}>
            <div className="space-y-5">
                {/* Indicator pași */}
                <ol className="flex items-center gap-2 text-xs -mt-2" aria-label="Pași">
                    {([1, 2, 3] as Pas[]).map(n => (
                        <li key={n} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                                pas === n ? 'bg-indigo-500 text-white' : pas > n ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                            }`}>{n}</span>
                            <span className={pas === n ? 'text-white font-semibold' : 'text-slate-500'}>{TITLURI_PAS[n]}</span>
                            {n < 3 && <span className="text-slate-600">›</span>}
                        </li>
                    ))}
                </ol>

                {/* PAS 1 — Orar */}
                {pas === 1 && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">
                            Antrenamentele se creează din orarul săptămânal al grupei. Verifică orarul de mai jos.
                        </p>
                        {loadingOrar ? (
                            <p className="text-sm text-slate-500">Se încarcă orarul…</p>
                        ) : orarSortat.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center">
                                <p className="text-sm text-slate-300 font-semibold">Grupa nu are încă orar.</p>
                                <p className="text-xs text-slate-500 mt-1">Copiază orarul unei alte grupe sau definește-l manual în tab-ul Orar.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {orarSortat.map(p => (
                                    <span key={p.id} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 px-2.5 py-1 rounded-full">
                                        <ClockIcon className="w-3 h-3" />
                                        {p.ziua} {formatTime(p.ora_start)}–{formatTime(p.ora_sfarsit)}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={deschideCopie} disabled={copieOpen}>
                                Copiază orar din altă grupă
                            </Button>
                            {onEditOrar && (
                                <Button variant="secondary" size="sm" onClick={() => { onClose(); onEditOrar(); }}>
                                    Editează orarul manual
                                </Button>
                            )}
                        </div>

                        {copieOpen && (
                            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-3">
                                {altele.length === 0 ? (
                                    <p className="text-sm text-slate-400">Nicio altă grupă din club nu are orar definit.</p>
                                ) : (
                                    <>
                                        <Select label="Grupa sursă" value={sursaId} onChange={e => setSursaId(e.target.value)}>
                                            <option value="">Alege grupa…</option>
                                            {altele.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    {g.denumire} ({g.program.length} intervale)
                                                </option>
                                            ))}
                                        </Select>
                                        {sursaId && orar.length > 0 && (
                                            <p className="text-xs text-amber-400">
                                                Orarul curent ({orar.length} intervale) va fi înlocuit. Antrenamentele deja generate nu se modifică.
                                            </p>
                                        )}
                                        {sursaId && orarNesalvat && (
                                            <p className="text-xs text-amber-400">
                                                Ai modificări nesalvate în tab-ul Orar — se vor pierde la copiere.
                                            </p>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <Button variant="secondary" size="sm" onClick={() => setCopieOpen(false)} disabled={loadingCopie}>Renunță</Button>
                                            <Button variant="primary" size="sm" onClick={handleCopiaza} isLoading={loadingCopie} disabled={!sursaId}>Copiază</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* PAS 2 — Perioadă */}
                {pas === 2 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Data start" type="date" value={dataStart} min={azi}
                                onChange={e => { setDataStart(e.target.value); setPreview(null); }}
                            />
                            <Input
                                label="Data sfârșit" type="date" value={dataEnd} min={dataStart || azi}
                                onChange={e => seteazaPerioada(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {presete.map(p => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => seteazaPerioada(p.end!)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors min-h-[32px] ${
                                        dataEnd === p.end
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                                            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">
                            Antrenamentele deja existente în perioadă nu se suprascriu — apar debifate la pasul următor.
                        </p>
                    </div>
                )}

                {/* PAS 3 — Previzualizare */}
                {pas === 3 && preview !== null && (
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-sm flex-wrap">
                                <span className="text-slate-300 font-medium">
                                    {nrTotal} antrenament{nrTotal !== 1 ? 'e' : ''} găsite
                                </span>
                                {nrExistente > 0 && (
                                    <span className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                        {nrExistente} debifate (existente sau excluse)
                                    </span>
                                )}
                                <span className="text-green-400 text-xs bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                                    {nrSelectate} selectate
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleToggleAll(true)} className="text-xs text-indigo-400 hover:text-indigo-300 underline">Bifează toate</button>
                                <span className="text-slate-600">|</span>
                                <button onClick={() => handleToggleAll(false)} className="text-xs text-slate-400 hover:text-slate-300 underline">Debifează toate</button>
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
                                            <th className="px-3 py-2 w-10">
                                                <input
                                                    type="checkbox"
                                                    aria-label="Selectează toate"
                                                    checked={nrSelectate === nrTotal && nrTotal > 0}
                                                    onChange={e => handleToggleAll(e.target.checked)}
                                                    className="rounded border-slate-600 bg-slate-700 text-indigo-500"
                                                />
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Orar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {preview.map(a => (
                                            <tr
                                                key={a.key}
                                                onClick={() => handleToggle(a.key)}
                                                className={`cursor-pointer transition-colors ${
                                                    a.selectat ? 'bg-slate-800/20 hover:bg-slate-700/30' : 'bg-slate-900/40 opacity-50 hover:opacity-70'
                                                }`}
                                            >
                                                <td className="px-3 py-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={a.selectat}
                                                        onChange={() => handleToggle(a.key)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="rounded border-slate-600 bg-slate-700 text-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-200 font-medium">{formatDataRo(a.data)}</td>
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

                {errMsg && (
                    <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-rose-400 text-sm">
                        <XIcon className="w-4 h-4 shrink-0" />
                        {errMsg}
                    </div>
                )}

                {/* Footer */}
                <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-4 border-t border-slate-700">
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button variant="secondary" onClick={onClose} disabled={loadingSave} className="w-full sm:w-auto">Anulează</Button>
                        {pas > 1 && (
                            <Button variant="secondary" onClick={() => { setErrMsg(null); setPas((pas - 1) as Pas); }} disabled={loadingSave} className="w-full sm:w-auto">
                                Înapoi
                            </Button>
                        )}
                    </div>
                    {pas === 1 && (
                        <Button variant="primary" onClick={() => setPas(2)} disabled={orarActiv.length === 0 || loadingOrar} className="w-full sm:w-auto">
                            Continuă
                        </Button>
                    )}
                    {pas === 2 && (
                        <Button variant="primary" onClick={mergiLaPas3} isLoading={loadingPreview} disabled={!dataStart || !dataEnd} className="w-full sm:w-auto">
                            <CalendarIcon className="w-4 h-4 mr-2" /> Previzualizează
                        </Button>
                    )}
                    {pas === 3 && nrTotal > 0 && (
                        <Button variant="success" onClick={handleSave} isLoading={loadingSave} disabled={nrSelectate === 0} className="w-full sm:w-auto">
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Inserează {nrSelectate > 0 ? `${nrSelectate} ` : ''}Antrenament{nrSelectate !== 1 ? 'e' : ''}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
