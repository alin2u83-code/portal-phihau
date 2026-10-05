import React, { useMemo, useState } from 'react';
import type { Sportiv, Plata, Familie, TipTaxaFederala, NotificareTaxaAnuala } from '../../../types';
import { Button, Card, EmptyState } from '../../ui';
import { ChatBubbleLeftEllipsisIcon, DownloadIcon, CheckIcon } from '../../icons';
import { useData } from '../../../contexts/DataContext';
import { construiesteSituatieTaxe, restantieriTaxe, genereazaNotificariTaxe } from '../../../utils/taxeAnuale';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../../../utils/anFiscal';
import { formatNume } from '../../../utils/formatareSportiv';
import { formateazaSumaLei } from '../../../utils/notificariRestantieri';
import { getDaysOverdue } from '../../../utils/paymentStatus';
import { exportToCsv } from '../../../utils/csv';
import { SelectorPerioadaTaxa } from './SelectorPerioadaTaxa';
import { NotificariTaxeAnualeModal } from './NotificariTaxeAnualeModal';

interface TabRestantieriTaxeProps {
    clubId: string;
    sportivi: Sportiv[];
    plati: Plata[];
    familii: Familie[];
}

const formatData = (d?: string | null) => {
    if (!d) return '—';
    const dt = new Date(String(d).slice(0, 10));
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('ro-RO');
};

export const TabRestantieriTaxe: React.FC<TabRestantieriTaxeProps> = ({ clubId, sportivi, plati, familii }) => {
    const { vizeSportivi, decontSportivi } = useData();
    const [tip, setTip] = useState<TipTaxaFederala>('FRQKD');
    const [an, setAn] = useState<number>(() => getPerioadaTaxa('FRQKD'));
    const [notificari, setNotificari] = useState<NotificareTaxaAnuala[] | null>(null);

    const perioada = formatPerioadaTaxa(tip, an);

    const randuri = useMemo(
        () =>
            restantieriTaxe(
                construiesteSituatieTaxe({
                    sportivi,
                    vize: vizeSportivi || [],
                    plati,
                    decontSportivi: decontSportivi || [],
                    tip,
                    an,
                    clubId,
                })
            ),
        [sportivi, vizeSportivi, plati, decontSportivi, tip, an, clubId]
    );

    const total = useMemo(() => randuri.reduce((acc, r) => acc + (r.suma ?? 0), 0), [randuri]);

    const dataFactura = (r: (typeof randuri)[number]) => (r.plata?.data ?? null) as string | null;
    const zileIntarziere = (r: (typeof randuri)[number]) =>
        r.plata ? getDaysOverdue({ status: r.plata.status, data: r.plata.data }) : 0;

    const deschideNotificari = () => {
        const intrari = randuri.map(r => ({
            sportivId: r.sportivId,
            plataId: r.viza?.plata_id ?? null,
            suma: r.suma ?? 0,
            achitatPartial: r.stare === 'achitat_partial',
        }));
        setNotificari(genereazaNotificariTaxe({ intrari, sportivi, familii, tip, an, mod: 'restanta' }));
    };

    const exporta = () => {
        const rows = randuri.map(r => ({
            Nume: r.sportiv?.nume ?? '',
            Prenume: r.sportiv?.prenume ?? '',
            Taxa: tip,
            Perioada: perioada,
            Suma: r.suma != null ? r.suma : '',
            Data_factura: formatData(dataFactura(r)),
            Zile_intarziere: zileIntarziere(r),
            Virata_federatiei: r.virat ? 'Da' : 'Nu',
        }));
        exportToCsv(`restantieri_${tip}_${perioada}.csv`, rows);
    };

    return (
        <div className="space-y-4">
            <Card>
                <SelectorPerioadaTaxa
                    tip={tip}
                    an={an}
                    onChange={(t, a) => {
                        setTip(t);
                        setAn(a);
                    }}
                />
            </Card>

            {randuri.length === 0 ? (
                <EmptyState
                    icon={<CheckIcon className="w-10 h-10 text-emerald-500" />}
                    title={`Nicio restanță pentru ${tip} ${perioada}`}
                    description="Toate taxele facturate pentru această perioadă sunt achitate sau încă negenerate."
                />
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-[var(--t-text)]">
                            <span className="font-bold">{randuri.length}</span> restanțieri · total{' '}
                            <span className="font-bold">{formateazaSumaLei(total)} lei</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="success" size="sm" onClick={deschideNotificari}>
                                <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1" />
                                Notificări WhatsApp
                            </Button>
                            <Button variant="secondary" size="sm" onClick={exporta}>
                                <DownloadIcon className="w-4 h-4 mr-1" />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--t-border)]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--t-table-header-bg)' }} className="text-left text-xs uppercase text-slate-400">
                                    <th className="px-3 py-2">Sportiv</th>
                                    <th className="px-3 py-2 text-right">Sumă</th>
                                    <th className="px-3 py-2">Data facturii</th>
                                    <th className="px-3 py-2 text-right">Zile întârziere</th>
                                </tr>
                            </thead>
                            <tbody>
                                {randuri.map(r => (
                                    <tr key={r.sportivId} className="border-t border-[var(--t-border)]">
                                        <td className="px-3 py-2 font-semibold text-[var(--t-text)]">
                                            {r.sportiv ? formatNume(r.sportiv) : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-[var(--t-text)]">
                                            {r.suma != null ? `${formateazaSumaLei(r.suma)} lei` : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-[var(--t-text)]">{formatData(dataFactura(r))}</td>
                                        <td className="px-3 py-2 text-right text-[var(--t-text)]">{zileIntarziere(r)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-2">
                        {randuri.map(r => (
                            <div
                                key={r.sportivId}
                                className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 space-y-1"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-[var(--t-text)] truncate">
                                        {r.sportiv ? formatNume(r.sportiv) : '—'}
                                    </span>
                                    <span className="font-bold text-[var(--t-text)] shrink-0">
                                        {r.suma != null ? `${formateazaSumaLei(r.suma)} lei` : '—'}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--t-text-muted)]">
                                    Factură: {formatData(dataFactura(r))} · {zileIntarziere(r)} zile întârziere
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <NotificariTaxeAnualeModal
                isOpen={notificari !== null}
                onClose={() => setNotificari(null)}
                titlu={`Restanțieri taxă ${tip} ${perioada}`}
                notificari={notificari ?? []}
            />
        </div>
    );
};
