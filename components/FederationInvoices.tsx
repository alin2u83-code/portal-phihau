import React, { useEffect, useMemo, useState } from 'react';
import { DecontFederatie, DecontSportiv, User, Permissions, Sportiv, Plata, SportivAcoperitPlata, TipTaxaFederala } from '../types';
import { Card, Button, Modal, Select, EmptyState, Badge } from './ui';
import { BanknotesIcon } from './icons';
import { useData } from '../contexts/DataContext';
import { useError } from './ErrorProvider';
import { formatNume } from '../utils/formatareSportiv';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../utils/anFiscal';
import { construiesteSituatieTaxe, eligibiliPlataFederatie } from '../utils/taxeAnuale';
import {
    construiesteRanduriExport,
    exportPlatiFederatieCSV,
    exportPlatiFederatieXLSX,
    formateazaDataRo,
    RandScutitExport,
} from '../utils/exportPlatiFederatie';
import { incarcaSportiviAcoperiti, urlSemnatDovada } from '../services/taxeAnualeService';
import { useReincarcaTaxe } from '../hooks/useReincarcaTaxe';
import { SelectorPerioadaTaxa } from './Plati/TaxeAnualeTabs/SelectorPerioadaTaxa';
import { PlataFederatieModal } from './Plati/TaxeAnualeTabs/PlataFederatieModal';

interface FederationInvoicesProps {
    deconturi: DecontFederatie[];
    setDeconturi: React.Dispatch<React.SetStateAction<DecontFederatie[]>>;
    decontSportivi: DecontSportiv[];
    currentUser: User;
    onBack: () => void;
    permissions: Permissions;
    sportivi?: Sportiv[];
    plati?: Plata[];
    clubs?: { id: string; nume: string }[];
}

const lei = (n: number) => `${n.toFixed(2)} lei`;
const dataDecont = (d: DecontFederatie) => d.data_decont ?? d.data_generare ?? '';

// --- Lista sportivilor acoperiti de o plata ---

interface SportiviPlataModalProps {
    decont: DecontFederatie;
    tip: TipTaxaFederala;
    an: number;
    onClose: () => void;
}

const SportiviPlataModal: React.FC<SportiviPlataModalProps> = ({ decont, tip, an, onClose }) => {
    const [lista, setLista] = useState<SportivAcoperitPlata[]>([]);
    const [loading, setLoading] = useState(true);
    const [eroare, setEroare] = useState<string | null>(null);

    useEffect(() => {
        let activ = true;
        setLoading(true);
        incarcaSportiviAcoperiti({ tip, an, decontId: decont.id }).then(({ data, error }) => {
            if (!activ) return;
            if (error) setEroare(error);
            else {
                setLista(
                    [...(data || [])].sort(
                        (a, b) =>
                            (a.nume ?? '').localeCompare(b.nume ?? '', 'ro') ||
                            (a.prenume ?? '').localeCompare(b.prenume ?? '', 'ro')
                    )
                );
            }
            setLoading(false);
        });
        return () => {
            activ = false;
        };
    }, [decont.id, tip, an]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Sportivi acoperiți — plata din ${formateazaDataRo(dataDecont(decont))}`}>
            <div className="space-y-3">
                {loading ? (
                    <p className="text-center text-slate-500 text-sm py-4 italic">Se încarcă sportivii...</p>
                ) : eroare ? (
                    <p className="text-center text-rose-400 text-sm py-4">{eroare}</p>
                ) : lista.length === 0 ? (
                    <EmptyState title="Niciun sportiv legat" description="Plata nu are sportivi legați." />
                ) : (
                    <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--t-border)] divide-y divide-[var(--t-border)]">
                        {lista.map(s => (
                            <div key={s.sportiv_id} className="flex justify-between px-3 py-2 text-sm text-slate-300">
                                <span>{formatNume({ nume: s.nume ?? '', prenume: s.prenume ?? '' } as any)}</span>
                                <span className="font-semibold text-white">{lei(s.suma ?? 0)}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-end pt-3 border-t border-[var(--t-border)]">
                    <Button variant="secondary" onClick={onClose}>Închide</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Componenta principală ---

export const FederationInvoices: React.FC<FederationInvoicesProps> = ({
    deconturi,
    decontSportivi,
    currentUser,
    permissions,
    sportivi = [],
    plati = [],
    clubs = [],
}) => {
    const { isFederationAdmin, isAdminClub } = permissions;
    const { showError } = useError();
    const { vizeSportivi, activeRoleContext } = useData();
    const reincarca = useReincarcaTaxe();

    const [tip, setTip] = useState<TipTaxaFederala>('FRQKD');
    const [an, setAn] = useState<number>(getPerioadaTaxa('FRQKD'));
    const [clubFiltru, setClubFiltru] = useState<string>('');
    const [modalPlata, setModalPlata] = useState(false);
    const [decontSelectat, setDecontSelectat] = useState<DecontFederatie | null>(null);
    const [seExporta, setSeExporta] = useState(false);

    const clubId: string | null = (activeRoleContext as any)?.club_id ?? currentUser.club_id ?? null;
    const perioada = formatPerioadaTaxa(tip, an);
    const clubEfectiv = isFederationAdmin ? clubFiltru : clubId ?? '';

    const numeClub = (id: string) => clubs.find(c => c.id === id)?.nume ?? `Club ${String(id).slice(0, 8)}`;

    // Istoric: fiecare plata e un rand (mai multe plati pe aceeasi perioada nu se grupeaza)
    const istoric = useMemo(() => {
        return deconturi
            .filter(d => d.tip_activitate === tip && d.an_fiscal === an)
            .filter(d => (clubEfectiv ? d.club_id === clubEfectiv : true))
            .sort((a, b) => {
                const da = dataDecont(a) ? new Date(dataDecont(a)).getTime() : 0;
                const db = dataDecont(b) ? new Date(dataDecont(b)).getTime() : 0;
                return db - da;
            });
    }, [deconturi, tip, an, clubEfectiv]);

    // KPI pentru clubul curent
    const situatie = useMemo(
        () =>
            isAdminClub && clubId
                ? construiesteSituatieTaxe({ sportivi, vize: vizeSportivi || [], plati, decontSportivi, tip, an, clubId })
                : [],
        [isAdminClub, clubId, sportivi, vizeSportivi, plati, decontSportivi, tip, an]
    );
    const kpi = useMemo(() => {
        const eligibili = eligibiliPlataFederatie(situatie);
        const virati = situatie.filter(s => s.virat);
        const suma = (l: typeof situatie) => l.reduce((acc, s) => acc + (s.suma ?? 0), 0);
        return {
            deVirat: { nr: eligibili.length, suma: suma(eligibili) },
            virat: { nr: virati.length, suma: suma(virati) },
            scutiti: situatie.filter(s => s.stare === 'scutit').length,
        };
    }, [situatie]);

    const randuriScutiti = (): RandScutitExport[] => {
        const sportivById = new Map(sportivi.map(s => [s.id, s]));
        return (vizeSportivi || [])
            .filter(v => v.scutit && v.tip === tip && v.an === an)
            .filter(v => (clubEfectiv ? v.club_id === clubEfectiv : true))
            .map(v => {
                const s = sportivById.get(v.sportiv_id);
                return {
                    Club: v.club_id ? numeClub(v.club_id) : '',
                    Taxa: tip,
                    Perioada: perioada,
                    Nume: s?.nume ?? v.sportiv_id,
                    Prenume: s?.prenume ?? '',
                    Motiv: v.motiv_scutire ?? '',
                };
            });
    };

    const exportaPerioada = async (format: 'csv' | 'xlsx') => {
        setSeExporta(true);
        try {
            const { data, error } = await incarcaSportiviAcoperiti({ tip, an });
            if (error || !data) {
                showError('Export plăți către federație', error ?? 'Datele nu au putut fi încărcate.');
                return;
            }
            const ids = new Set(istoric.map(d => d.id));
            const randuri = construiesteRanduriExport({
                deconturi: istoric,
                acoperiti: data.filter(a => ids.has(a.decont_id)),
                clubs,
            });
            const nume = `plati_federatie_${tip}_${perioada}`;
            if (format === 'csv') exportPlatiFederatieCSV(randuri, `${nume}.csv`);
            else exportPlatiFederatieXLSX(randuri, randuriScutiti(), `${nume}.xlsx`);
        } finally {
            setSeExporta(false);
        }
    };

    const exportaPlata = async (d: DecontFederatie, format: 'csv' | 'xlsx') => {
        const { data, error } = await incarcaSportiviAcoperiti({ tip, an, decontId: d.id });
        if (error || !data) {
            showError('Export plată către federație', error ?? 'Datele nu au putut fi încărcate.');
            return;
        }
        const randuri = construiesteRanduriExport({ deconturi: [d], acoperiti: data, clubs });
        const nume = `plati_federatie_${tip}_${perioada}_${numeClub(d.club_id).replace(/[^\p{L}\p{N}]+/gu, '_')}_${dataDecont(d).slice(0, 10)}`;
        if (format === 'csv') exportPlatiFederatieCSV(randuri, `${nume}.csv`);
        else exportPlatiFederatieXLSX(randuri, [], `${nume}.xlsx`);
    };

    const deschideDovada = async (cale: string) => {
        const fereastra = window.open('', '_blank');
        const { data, error } = await urlSemnatDovada(cale);
        if (error || !data) {
            fereastra?.close();
            showError('Dovadă plată', error ?? 'Dovada nu a putut fi deschisă.');
            return;
        }
        if (fereastra) {
            fereastra.opener = null;
            fereastra.location.href = data;
        } else {
            window.open(data, '_blank', 'noopener');
        }
    };

    const celulaMetoda = (d: DecontFederatie) =>
        d.status_plata === 'In asteptare' ? (
            <Badge variant="amber">În așteptare (vechi)</Badge>
        ) : (
            d.metoda_plata ?? '—'
        );

    const butoaneDovada = (d: DecontFederatie) =>
        d.dovada_transfer_url ? (
            <Button size="sm" variant="secondary" onClick={() => deschideDovada(d.dovada_transfer_url as string)}>
                Vezi
            </Button>
        ) : (
            <span className="text-slate-500">—</span>
        );

    const butoaneActiuni = (d: DecontFederatie) => (
        <div className="flex flex-wrap gap-1 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setDecontSelectat(d)}>Sportivi</Button>
            <Button size="sm" variant="secondary" onClick={() => exportaPlata(d, 'csv')}>CSV</Button>
            <Button size="sm" variant="secondary" onClick={() => exportaPlata(d, 'xlsx')}>Excel</Button>
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Plăți către federație</h1>

            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <SelectorPerioadaTaxa
                    tip={tip}
                    an={an}
                    onChange={(t, a) => {
                        setTip(t);
                        setAn(a);
                    }}
                />
                {isFederationAdmin && (
                    <div className="lg:w-64">
                        <Select
                            id="plati-federatie-club"
                            label="Club"
                            value={clubFiltru}
                            onChange={e => setClubFiltru(e.target.value)}
                        >
                            <option value="">Toate cluburile</option>
                            {clubs.map(c => (
                                <option key={c.id} value={c.id}>{c.nume}</option>
                            ))}
                        </Select>
                    </div>
                )}
            </div>

            {isAdminClub && clubId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-brand-primary/10 border-brand-primary/30">
                        <div className="flex items-center gap-4">
                            <BanknotesIcon className="w-8 h-8 text-brand-secondary" />
                            <div>
                                <h3 className="text-xs font-bold uppercase text-slate-400">De virat</h3>
                                <p className="text-lg font-black text-white">
                                    {kpi.deVirat.nr} sportivi · {lei(kpi.deVirat.suma)}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-xs font-bold uppercase text-slate-400">Virat</h3>
                        <p className="text-lg font-black text-green-400">
                            {kpi.virat.nr} · {lei(kpi.virat.suma)}
                        </p>
                    </Card>
                    <Card>
                        <h3 className="text-xs font-bold uppercase text-slate-400">Scutiți</h3>
                        <p className="text-lg font-black text-blue-300">{kpi.scutiti}</p>
                    </Card>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {isAdminClub && clubId && (
                    <Button variant="success" onClick={() => setModalPlata(true)} disabled={kpi.deVirat.nr === 0}>
                        Înregistrează plată către federație
                    </Button>
                )}
                <Button variant="secondary" onClick={() => exportaPerioada('csv')} isLoading={seExporta}>
                    Export CSV perioadă
                </Button>
                <Button variant="secondary" onClick={() => exportaPerioada('xlsx')} isLoading={seExporta}>
                    Export Excel perioadă
                </Button>
            </div>

            {istoric.length === 0 ? (
                <EmptyState title={`Nicio plată către federație pentru ${tip} ${perioada}.`} />
            ) : (
                <>
                    {/* Desktop: tabel */}
                    <Card className="p-0 overflow-hidden hidden md:block">
                        <div className="p-4 bg-slate-700/50 font-bold text-white">Istoric plăți</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-3">Data plății</th>
                                        <th className="p-3">Taxă</th>
                                        <th className="p-3">Perioadă</th>
                                        {isFederationAdmin && <th className="p-3">Club</th>}
                                        <th className="p-3 text-center">Nr. sportivi</th>
                                        <th className="p-3 text-right">Sumă</th>
                                        <th className="p-3">Metodă</th>
                                        <th className="p-3 text-center">Dovadă</th>
                                        <th className="p-3 text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {istoric.map(d => (
                                        <tr key={d.id}>
                                            <td className="p-3">{formateazaDataRo(dataDecont(d)) || '—'}</td>
                                            <td className="p-3 font-semibold">{d.tip_activitate}</td>
                                            <td className="p-3">{perioada}</td>
                                            {isFederationAdmin && <td className="p-3">{numeClub(d.club_id)}</td>}
                                            <td className="p-3 text-center">{d.nr_participanti ?? 0}</td>
                                            <td className="p-3 text-right font-bold text-white">{lei(d.suma_totala || 0)}</td>
                                            <td className="p-3">{celulaMetoda(d)}</td>
                                            <td className="p-3 text-center">{butoaneDovada(d)}</td>
                                            <td className="p-3">{butoaneActiuni(d)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Mobil: carduri */}
                    <div className="md:hidden space-y-3">
                        {istoric.map(d => (
                            <Card key={d.id} className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-white">{formateazaDataRo(dataDecont(d)) || '—'}</p>
                                        <p className="text-xs text-slate-400">
                                            {d.tip_activitate} · {perioada}
                                            {isFederationAdmin ? ` · ${numeClub(d.club_id)}` : ''}
                                        </p>
                                    </div>
                                    <p className="font-black text-white">{lei(d.suma_totala || 0)}</p>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-300">
                                    <span>{d.nr_participanti ?? 0} sportivi</span>
                                    <span>{celulaMetoda(d)}</span>
                                    <span>{butoaneDovada(d)}</span>
                                </div>
                                {butoaneActiuni(d)}
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {modalPlata && clubId && (
                <PlataFederatieModal
                    isOpen={modalPlata}
                    onClose={() => setModalPlata(false)}
                    clubId={clubId}
                    tip={tip}
                    an={an}
                    sportivi={sportivi}
                    plati={plati}
                    onSaved={async () => {
                        await reincarca();
                    }}
                />
            )}

            {decontSelectat && (
                <SportiviPlataModal
                    decont={decontSelectat}
                    tip={tip}
                    an={an}
                    onClose={() => setDecontSelectat(null)}
                />
            )}
        </div>
    );
};
