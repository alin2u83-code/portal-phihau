import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, StatCard } from '../../ui';
import { SelectorPerioadaTaxa } from './SelectorPerioadaTaxa';
import { incarcaRaportCluburi } from '../../../services/taxeAnualeService';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../../../utils/anFiscal';
import { exportToCsv } from '../../../utils/csv';
import type { TipTaxaFederala, RandRaportTaxeClub } from '../../../types';

const lei = (n: number) => `${Number(n || 0).toFixed(2)} lei`;

const TH = 'py-2 px-3 text-[10px] font-black uppercase tracking-wider';

/** Dashboard federatie: situatia taxei pe cluburi pentru tipul si perioada alese. RPC-ul filtreaza deja cluburile permise. */
export const TabRaportCluburi: React.FC<{}> = () => {
    const [tip, setTip] = useState<TipTaxaFederala>('FRQKD');
    const [an, setAn] = useState<number>(getPerioadaTaxa('FRQKD'));
    const [randuri, setRanduri] = useState<RandRaportTaxeClub[]>([]);
    const [loading, setLoading] = useState(true);
    const [eroare, setEroare] = useState<string | null>(null);

    useEffect(() => {
        let anulat = false;
        setLoading(true);
        setEroare(null);
        incarcaRaportCluburi(tip, an).then(({ data, error }) => {
            if (anulat) return;
            if (error) {
                setEroare(error);
                setRanduri([]);
            } else {
                setRanduri(data || []);
            }
            setLoading(false);
        });
        return () => { anulat = true; };
    }, [tip, an]);

    const total = useMemo(() => randuri.reduce((t, r) => ({
        nr_sportivi: t.nr_sportivi + r.nr_sportivi,
        nr_scutiti: t.nr_scutiti + r.nr_scutiti,
        nr_in_asteptare: t.nr_in_asteptare + r.nr_in_asteptare,
        suma_facturata: t.suma_facturata + r.suma_facturata,
        suma_achitata_club: t.suma_achitata_club + r.suma_achitata_club,
        suma_restanta_club: t.suma_restanta_club + r.suma_restanta_club,
        suma_virata: t.suma_virata + r.suma_virata,
        suma_de_virat: t.suma_de_virat + r.suma_de_virat,
    }), {
        nr_sportivi: 0, nr_scutiti: 0, nr_in_asteptare: 0, suma_facturata: 0,
        suma_achitata_club: 0, suma_restanta_club: 0, suma_virata: 0, suma_de_virat: 0,
    }), [randuri]);

    const perioada = formatPerioadaTaxa(tip, an);

    const handleExport = () => {
        exportToCsv(`raport_taxe_${tip}_${perioada}.csv`, randuri.map(r => ({
            Club: r.club_nume,
            Sportivi: r.nr_sportivi,
            Scutiti: r.nr_scutiti,
            In_asteptare: r.nr_in_asteptare,
            Facturat: r.suma_facturata.toFixed(2),
            Achitat_club: r.suma_achitata_club.toFixed(2),
            Restanta_sportivi: r.suma_restanta_club.toFixed(2),
            Virat_federatie: r.suma_virata.toFixed(2),
            De_virat: r.suma_de_virat.toFixed(2),
        })));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                <SelectorPerioadaTaxa tip={tip} an={an} onChange={(t, a) => { setTip(t); setAn(a); }} />
                <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || randuri.length === 0}>
                    Export CSV
                </Button>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400 italic py-8 text-center">Se încarcă raportul...</p>
            ) : eroare ? (
                <Card className="border-rose-500/40 bg-rose-500/10">
                    <p className="text-sm text-rose-300 font-semibold">{eroare}</p>
                </Card>
            ) : randuri.length === 0 ? (
                <EmptyState title={`Nu există date pentru ${tip} ${perioada}.`} />
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        <StatCard label="Cluburi cu taxe" value={randuri.length} accentColor="slate" />
                        <StatCard label="Sportivi" value={total.nr_sportivi} accentColor="sky" />
                        <StatCard label="Facturat" value={lei(total.suma_facturata)} accentColor="indigo" />
                        <StatCard label="Achitat la club" value={lei(total.suma_achitata_club)} accentColor="emerald" />
                        <StatCard label="Virat federației" value={lei(total.suma_virata)} accentColor="emerald" />
                        <StatCard label="De virat" value={lei(total.suma_de_virat)} accentColor={total.suma_de_virat > 0 ? 'rose' : 'emerald'} />
                    </div>

                    <div className="rounded-xl border border-[var(--t-border)] overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }} className="border-b border-[var(--t-border)]">
                                    <th className={`${TH} text-left`}>Club</th>
                                    <th className={`${TH} text-right`}>Sportivi</th>
                                    <th className={`${TH} text-right`}>Scutiți</th>
                                    <th className={`${TH} text-right`}>În așteptare</th>
                                    <th className={`${TH} text-right`}>Facturat</th>
                                    <th className={`${TH} text-right`}>Achitat la club</th>
                                    <th className={`${TH} text-right`}>Restanțe sportivi</th>
                                    <th className={`${TH} text-right`}>Virat federației</th>
                                    <th className={`${TH} text-right`}>De virat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {randuri.map(r => (
                                    <tr key={r.club_id} className="border-b border-[var(--t-border)] hover:bg-[var(--t-table-row-hover)] transition-colors">
                                        <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{r.club_nume}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300">{r.nr_sportivi}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300">{r.nr_scutiti}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300">{r.nr_in_asteptare}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">{lei(r.suma_facturata)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">{lei(r.suma_achitata_club)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">{lei(r.suma_restanta_club)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">{lei(r.suma_virata)}</td>
                                        <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${r.suma_de_virat > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {lei(r.suma_de_virat)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-[var(--t-surface-2)] font-black text-white">
                                    <td className="py-3 px-3 uppercase text-xs">Total</td>
                                    <td className="py-3 px-3 text-right">{total.nr_sportivi}</td>
                                    <td className="py-3 px-3 text-right">{total.nr_scutiti}</td>
                                    <td className="py-3 px-3 text-right">{total.nr_in_asteptare}</td>
                                    <td className="py-3 px-3 text-right whitespace-nowrap">{lei(total.suma_facturata)}</td>
                                    <td className="py-3 px-3 text-right whitespace-nowrap">{lei(total.suma_achitata_club)}</td>
                                    <td className="py-3 px-3 text-right whitespace-nowrap">{lei(total.suma_restanta_club)}</td>
                                    <td className="py-3 px-3 text-right whitespace-nowrap">{lei(total.suma_virata)}</td>
                                    <td className={`py-3 px-3 text-right whitespace-nowrap ${total.suma_de_virat > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {lei(total.suma_de_virat)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};
