import React, { useMemo } from 'react';
import { Badge, Card, EmptyState } from '../ui';
import { useData } from '../../contexts/DataContext';
import { stareTaxa, ETICHETE_STARE_TAXA } from '../../utils/taxeAnuale';
import { formatPerioadaTaxa } from '../../utils/anFiscal';
import type { Sportiv, TipTaxaFederala, VizaSportiv } from '../../types';

interface TaxeAnualeIstoricProps {
    sportiv: Sportiv;
}

const ORDINE_TIP: Record<TipTaxaFederala, number> = { FRQKD: 0, FRAM: 1 };

const CLASE_TIP: Record<TipTaxaFederala, string> = {
    FRQKD: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    FRAM: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
};

const formatData = (d: string | null | undefined): string =>
    d ? new Date(d).toLocaleDateString('ro-RO') : '';

const formatSuma = (n: number | null): string =>
    n == null ? '—' : `${Number(n).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;

/**
 * Istoric taxe anuale federale (FRQKD / FRAM) ale unui sportiv, pe perioade.
 * Nu face query-uri proprii: datele vin din useData() (deja filtrate de RLS).
 */
export const TaxeAnualeIstoric: React.FC<TaxeAnualeIstoricProps> = ({ sportiv }) => {
    const { vizeSportivi, decontSportivi, deconturiFederatie, filteredData, activeRoleContext } = useData();

    // SPORTIV nu vede deconturile clubului catre federatie
    const vedeDeconturi = activeRoleContext?.rol_denumire !== 'SPORTIV';

    const randuri = useMemo(() => {
        const platiById = new Map((filteredData?.plati || []).map(p => [p.id, p]));
        const deconturiById = new Map((deconturiFederatie || []).map(d => [d.id, d]));

        return (vizeSportivi || [])
            .filter((v: VizaSportiv) => v.sportiv_id === sportiv.id)
            .sort((a, b) => b.an - a.an || ORDINE_TIP[a.tip] - ORDINE_TIP[b.tip])
            .map(viza => {
                const plata = viza.plata_id ? (platiById.get(viza.plata_id) ?? null) : null;
                const stare = stareTaxa(viza, plata);
                const suma = plata?.suma != null ? Number(plata.suma) : (viza.plata?.suma != null ? Number(viza.plata.suma) : null);
                const decontRand = (decontSportivi || []).find(
                    d => d.sportiv_id === sportiv.id && d.tip === viza.tip && d.an === viza.an
                );
                const decont = decontRand ? deconturiById.get(decontRand.decont_id) : undefined;
                const dataDecont = formatData(decont?.data_decont ?? decont?.data_generare ?? decontRand?.created_at);
                const virat = !vedeDeconturi
                    ? '—'
                    : decontRand
                        ? (dataDecont ? `Da · ${dataDecont}` : 'Da')
                        : 'Nu';
                return { viza, stare, suma, virat };
            });
    }, [vizeSportivi, decontSportivi, deconturiFederatie, filteredData?.plati, sportiv.id, vedeDeconturi]);

    if (randuri.length === 0) {
        return (
            <EmptyState
                title="Taxe anuale federație (FRQKD / FRAM)"
                description="Nicio taxă anuală înregistrată pentru acest sportiv."
            />
        );
    }

    return (
        <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Taxe anuale federație (FRQKD / FRAM)</h3>
            </div>

            {/* Mobil: carduri */}
            <div className="md:hidden divide-y divide-slate-700/50">
                {randuri.map(({ viza, stare, suma, virat }) => (
                    <div key={viza.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${CLASE_TIP[viza.tip]}`}>
                                {viza.tip}
                            </span>
                            <Badge variant={ETICHETE_STARE_TAXA[stare].variant}>{ETICHETE_STARE_TAXA[stare].label}</Badge>
                        </div>
                        <div className="text-sm text-slate-300">Perioadă: {formatPerioadaTaxa(viza.tip, viza.an)}</div>
                        {viza.scutit && viza.motiv_scutire && (
                            <div className="text-xs text-slate-400 italic">Motiv scutire: {viza.motiv_scutire}</div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Sumă: <span className="text-slate-200">{formatSuma(suma)}</span></span>
                            <span className="text-slate-400">Virat: <span className="text-slate-200">{virat}</span></span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-slate-300">Taxă</th>
                            <th className="px-4 py-3 font-semibold text-slate-300">Perioadă</th>
                            <th className="px-4 py-3 font-semibold text-slate-300">Stare</th>
                            <th className="px-4 py-3 font-semibold text-slate-300">Sumă</th>
                            <th className="px-4 py-3 font-semibold text-slate-300">Virat federației</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {randuri.map(({ viza, stare, suma, virat }) => (
                            <tr key={viza.id}>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${CLASE_TIP[viza.tip]}`}>
                                        {viza.tip}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-300">{formatPerioadaTaxa(viza.tip, viza.an)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col items-start gap-1">
                                        <Badge variant={ETICHETE_STARE_TAXA[stare].variant}>{ETICHETE_STARE_TAXA[stare].label}</Badge>
                                        {viza.scutit && viza.motiv_scutire && (
                                            <span className="text-xs text-slate-400 italic">{viza.motiv_scutire}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-300">{formatSuma(suma)}</td>
                                <td className="px-4 py-3 text-slate-300">{virat}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
