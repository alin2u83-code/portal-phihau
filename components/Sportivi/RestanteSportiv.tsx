import React, { useMemo, useState } from 'react';
import type { Plata, Sportiv, IstoricPlataDetaliat } from '../../types';
import { Modal, Button } from '../ui';
import { ExclamationTriangleIcon } from '../icons';
import { construiesteFacturi, type FacturaEntry } from '../../utils/facturiSportiv';
import { esteDeIncasat } from '../../utils/paymentStatus';

const formatSuma = (n: number) =>
    n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Facturile restante (de încasat) per sportiv — aceeași semantică ca în profil (`facturiAleSportivului`):
 * facturile proprii + cele ale familiei. O singură trecere peste `plati`, ca să meargă și pe liste mari.
 */
export function useRestantePerSportiv(
    sportivi: Pick<Sportiv, 'id' | 'familie_id' | 'nume' | 'prenume'>[],
    plati: Plata[] | null | undefined,
    istoric: IstoricPlataDetaliat[] | null | undefined,
): (sportiv: Pick<Sportiv, 'id' | 'familie_id'>) => FacturaEntry[] {
    return useMemo(() => {
        const familiaSportivului = new Map<string, string>();
        const numeSportiv = new Map<string, string>();
        (sportivi || []).forEach(s => {
            if (s.familie_id) familiaSportivului.set(s.id, s.familie_id);
            numeSportiv.set(s.id, `${s.nume} ${s.prenume}`);
        });

        const pePersoana = new Map<string, FacturaEntry[]>();
        const peFamilie = new Map<string, FacturaEntry[]>();
        const neachitate = (plati || []).filter(esteDeIncasat);
        construiesteFacturi(neachitate, istoric, id => numeSportiv.get(id) ?? '')
            .filter(f => f.rest > 0)
            .forEach(f => {
                const famId = f.detalii.familie_id ?? (f.detalii.sportiv_id ? familiaSportivului.get(f.detalii.sportiv_id) : undefined);
                const [map, cheie] = famId
                    ? [peFamilie, famId] as const
                    : [pePersoana, f.detalii.sportiv_id ?? ''] as const;
                if (!cheie) return;
                map.set(cheie, [...(map.get(cheie) ?? []), f]);
            });

        const gol: FacturaEntry[] = [];
        return (s) => (s.familie_id ? peFamilie.get(s.familie_id) : pePersoana.get(s.id)) ?? gol;
    }, [sportivi, plati, istoric]);
}

interface RestanteButtonProps {
    facturi: FacturaEntry[];
    /** Deschide factura aleasă (ecranul de detaliu). */
    onDeschideFactura: (plataId: string) => void;
    className?: string;
}

/** Buton „Restanțe (N)” — apare doar dacă există facturi neachitate; lista duce la fiecare factură. */
export const RestanteButton: React.FC<RestanteButtonProps> = ({ facturi, onDeschideFactura, className = '' }) => {
    const [open, setOpen] = useState(false);
    if (facturi.length === 0) return null;
    const total = facturi.reduce((s, f) => s + f.rest, 0);
    const sortate = [...facturi].sort((a, b) =>
        (a.detalii.data_emitere || '').toString().localeCompare((b.detalii.data_emitere || '').toString()));

    return (
        <>
            <button
                type="button"
                onClick={e => { e.stopPropagation(); setOpen(true); }}
                title="Vezi facturile neachitate"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25 transition-colors touch-manipulation min-h-[32px] ${className}`}
            >
                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                Restanțe ({facturi.length}) · {formatSuma(total)} RON
            </button>

            {open && (
                <div onClick={e => e.stopPropagation()}>
                    <Modal isOpen onClose={() => setOpen(false)} title="Facturi restante">
                        <div className="space-y-2">
                            {sortate.map(f => (
                                <div key={f.detalii.plata_id} className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{f.detalii.descriere}</p>
                                        <p className="text-xs text-slate-400">
                                            {f.detalii.nume_complet && <>{f.detalii.nume_complet} · </>}
                                            {new Date((f.detalii.data_emitere || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-bold text-red-400 whitespace-nowrap">{formatSuma(f.rest)} RON</span>
                                        <Button size="sm" variant="secondary" onClick={() => { setOpen(false); onDeschideFactura(f.detalii.plata_id); }}>
                                            Factura
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center justify-between pt-2 px-1 text-sm">
                                <span className="text-slate-300 font-medium">Total de achitat</span>
                                <span className="font-black text-red-400">{formatSuma(total)} RON</span>
                            </div>
                            <Button variant="secondary" onClick={() => setOpen(false)} className="w-full">Închide</Button>
                        </div>
                    </Modal>
                </div>
            )}
        </>
    );
};
