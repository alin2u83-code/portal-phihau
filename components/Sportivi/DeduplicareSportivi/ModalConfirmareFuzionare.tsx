import React, { useState, useEffect } from 'react';
import { Button, Modal } from '../../ui';
import { formatNume } from '../../../utils/formatareSportiv';
import { ExclamationTriangleIcon, TransferIcon } from '../../icons';
import { PereacheDuplicat, SportivCard } from './types';

const CAMPURI: { key: keyof SportivCard; label: string }[] = [
    { key: 'prenume',       label: 'Prenume' },
    { key: 'nume',          label: 'Nume' },
    { key: 'data_nasterii', label: 'Data nașterii' },
    { key: 'cnp',           label: 'CNP' },
    { key: 'email',         label: 'Email' },
    { key: 'telefon',       label: 'Telefon' },
];

type Selectie = Record<string, 'a' | 'b'>;

function initSelectii(primar: SportivCard, secundar: SportivCard): Selectie {
    const sel: Selectie = {};
    for (const { key } of CAMPURI) {
        const vP = primar[key];
        const vS = secundar[key];
        sel[key] = vP ? 'a' : vS ? 'b' : 'a';
    }
    return sel;
}

const ValoareCamp: React.FC<{ val: any }> = ({ val }) => {
    if (val === null || val === undefined || val === '')
        return <span className="text-slate-600 italic">—</span>;
    return <span>{String(val)}</span>;
};

export const ModalConfirmareFuzionare: React.FC<{
    isOpen: boolean;
    pereche: PereacheDuplicat | null;
    primarId: string;
    gradeMap: Record<string, string>;
    onConfirma: (campiAlesi: Record<string, any>) => void;
    onAnuleaza: () => void;
    inProgres: boolean;
}> = ({ isOpen, pereche, primarId, gradeMap, onConfirma, onAnuleaza, inProgres }) => {
    const [selectii, setSelectii] = useState<Selectie>({});

    const primar   = pereche ? (pereche.sportiv_a.id === primarId ? pereche.sportiv_a : pereche.sportiv_b) : null;
    const secundar = pereche ? (pereche.sportiv_a.id === primarId ? pereche.sportiv_b : pereche.sportiv_a) : null;

    useEffect(() => {
        if (primar && secundar) setSelectii(initSelectii(primar, secundar));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [primarId, pereche?.id]);

    if (!pereche || !primar || !secundar) return null;

    const campuriDiferente = CAMPURI.filter(({ key }) => {
        const vP = primar[key]; const vS = secundar[key];
        return vP !== vS && (vP || vS);
    });

    const campuriIdentice = CAMPURI.filter(({ key }) => {
        const vP = primar[key]; const vS = secundar[key];
        return vP === vS && vP;
    });

    const handleConfirma = () => {
        const campiAlesi: Record<string, any> = {};
        for (const { key } of campuriDiferente) {
            if (selectii[key] === 'b') {
                const val = secundar[key];
                if (val) campiAlesi[key] = val;
            }
        }
        onConfirma(campiAlesi);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onAnuleaza}
            title="Fuzionare conturi — alege ce păstrezi"
            persistent={inProgres}
        >
            <div className="space-y-5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-300">Acțiune ireversibilă</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                            Toate relațiile (plăți, examene, prezențe, grade etc.) se transferă la{' '}
                            <strong className="text-amber-300">{formatNume(primar)}</strong>.
                            Contul <strong className="text-amber-300">{formatNume(secundar)}</strong> se dezactivează.
                        </p>
                    </div>
                </div>

                {campuriDiferente.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Câmpuri diferite — alege valoarea de păstrat
                        </p>
                        <p className="text-xs text-slate-500 mb-3">
                            Pentru fiecare câmp, alege care valoare va rămâne pe contul final.
                            Selectează din coloana verde (contul existent) sau roșie (contul de comasat).
                        </p>
                        <div className="rounded-xl border border-slate-700 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left">Câmp</th>
                                        <th className="px-3 py-2 text-left">
                                            <span className="text-emerald-400">Cont existent</span>
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            <span className="text-rose-400">Cont comasat</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {campuriDiferente.map(({ key, label }) => (
                                        <tr key={key} className="hover:bg-slate-800/30">
                                            <td className="px-3 py-2.5 text-slate-400 font-medium text-xs whitespace-nowrap">{label}</td>
                                            <td className="px-3 py-2.5">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`camp-${key}`}
                                                        checked={selectii[key] === 'a'}
                                                        onChange={() => setSelectii(s => ({ ...s, [key]: 'a' }))}
                                                        className="accent-emerald-500 h-3.5 w-3.5 shrink-0"
                                                        disabled={inProgres}
                                                    />
                                                    <span className={`text-xs ${selectii[key] === 'a' ? 'text-emerald-300 font-medium' : 'text-slate-400'}`}>
                                                        <ValoareCamp val={primar[key]} />
                                                    </span>
                                                </label>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`camp-${key}`}
                                                        checked={selectii[key] === 'b'}
                                                        onChange={() => setSelectii(s => ({ ...s, [key]: 'b' }))}
                                                        className="accent-rose-500 h-3.5 w-3.5 shrink-0"
                                                        disabled={inProgres}
                                                    />
                                                    <span className={`text-xs ${selectii[key] === 'b' ? 'text-rose-300 font-medium' : 'text-slate-400'}`}>
                                                        <ValoareCamp val={secundar[key]} />
                                                    </span>
                                                </label>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {campuriIdentice.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Câmpuri identice în ambele conturi
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {campuriIdentice.map(({ key, label }) => (
                                <span key={key} className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg text-slate-400">
                                    {label}: <span className="text-slate-300">{String(primar[key])}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/40 text-xs text-slate-400">
                    Gradul, prezențele, plățile și celelalte relații se transferă automat
                    la contul <span className="text-slate-300 font-medium">{formatNume(primar)}</span>,
                    indiferent de selecțiile de mai sus.
                    {primar.grad_actual_id && (
                        <span className="ml-1">Grad curent: <span className="text-sky-400">{gradeMap[primar.grad_actual_id] || '—'}</span>.</span>
                    )}
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onAnuleaza}
                        disabled={inProgres}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anulează
                    </button>
                    <Button
                        variant="warning"
                        onClick={handleConfirma}
                        isLoading={inProgres}
                        disabled={inProgres}
                        className="flex-1"
                    >
                        <TransferIcon className="h-4 w-4 mr-2" />
                        Confirmă fuzionarea
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
