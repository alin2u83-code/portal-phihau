import React, { useMemo, useState } from 'react';
import type { Sportiv, Plata } from '../../../types';
import { Badge } from '../../ui';
import { ExclamationTriangleIcon } from '../../icons';
import { useData } from '../../../contexts/DataContext';
import { gasesteViratiNeachitati } from '../../../utils/taxeAnuale';
import { formatPerioadaTaxa } from '../../../utils/anFiscal';
import { formateazaSumaLei } from '../../../utils/notificariRestantieri';

interface BannerViratNeachitatProps {
    clubId: string;
    sportivi: Sportiv[];
    plati: Plata[];
}

const NUMAR_INITIAL = 5;

/**
 * Banner informativ: clubul a virat taxa federatiei, dar sportivul nu a achitat inca factura clubului.
 * Singurul mecanism de anunt pentru acest caz; nu blocheaza nimic si nu cere actiune.
 */
export const BannerViratNeachitat: React.FC<BannerViratNeachitatProps> = ({ clubId, sportivi, plati }) => {
    const { vizeSportivi, decontSportivi } = useData();
    const [extins, setExtins] = useState(false);

    const lista = useMemo(
        () => gasesteViratiNeachitati({ sportivi, vize: vizeSportivi || [], plati, decontSportivi: decontSportivi || [], clubId }),
        [sportivi, vizeSportivi, plati, decontSportivi, clubId]
    );

    if (lista.length === 0) return null;

    const n = lista.length;
    const vizibile = extins ? lista : lista.slice(0, NUMAR_INITIAL);

    return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3" role="status">
            <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <p className="font-semibold text-amber-300">Taxe virate federației, neîncasate de la sportivi ({n})</p>
                    <p className="text-sm text-[var(--t-text-muted)]">
                        Clubul a plătit federației taxa pentru acești sportivi, dar ei nu au achitat încă factura către club.
                    </p>
                </div>
            </div>

            <ul className="space-y-1.5">
                {vizibile.map(r => (
                    <li
                        key={`${r.sportivId}|${r.tip}|${r.an}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--t-surface)] border border-[var(--t-border)] px-3 py-2 text-sm"
                    >
                        <div className="min-w-0">
                            <span className="font-semibold text-[var(--t-text)]">{r.numeSportiv}</span>
                            <span className="text-[var(--t-text-muted)]"> · {r.tip} {formatPerioadaTaxa(r.tip, r.an)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-[var(--t-text)]">{formateazaSumaLei(r.suma)} lei</span>
                            <Badge variant={r.statusFactura === 'Achitat Parțial' ? 'amber' : 'red'}>{r.statusFactura}</Badge>
                        </div>
                    </li>
                ))}
            </ul>

            {n > NUMAR_INITIAL && (
                <button
                    type="button"
                    onClick={() => setExtins(v => !v)}
                    className="text-sm font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
                >
                    {extins ? 'Restrânge' : `Vezi toți (${n})`}
                </button>
            )}
        </div>
    );
};
