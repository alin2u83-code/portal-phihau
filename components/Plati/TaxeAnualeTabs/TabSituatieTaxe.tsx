import React, { useMemo, useState } from 'react';
import type {
    Sportiv,
    Plata,
    Familie,
    TipTaxaFederala,
    StareTaxa,
    SituatieTaxaSportiv,
    RezultatGenerareTaxe,
    NotificareTaxaAnuala,
} from '../../../types';
import { Button, Card, Badge, ConfirmModal, Select, StatCard, SearchInput, EmptyState } from '../../ui';
import { UsersIcon, CheckIcon, ExclamationTriangleIcon, BanknotesIcon, ChatBubbleLeftEllipsisIcon } from '../../icons';
import { useData } from '../../../contexts/DataContext';
import { useError } from '../../ErrorProvider';
import { useReincarcaTaxe } from '../../../hooks/useReincarcaTaxe';
import { genereazaTaxe, seteazaScutire } from '../../../services/taxeAnualeService';
import {
    construiesteSituatieTaxe,
    pretTaxa,
    genereazaNotificariTaxe,
    ETICHETE_STARE_TAXA,
} from '../../../utils/taxeAnuale';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../../../utils/anFiscal';
import { formatNume } from '../../../utils/formatareSportiv';
import { formateazaSumaLei } from '../../../utils/notificariRestantieri';
import { SelectorPerioadaTaxa } from './SelectorPerioadaTaxa';
import { NotificariTaxeAnualeModal } from './NotificariTaxeAnualeModal';
import { ScutireTaxaModal } from './ScutireTaxaModal';

interface TabSituatieTaxeProps {
    clubId: string;
    sportivi: Sportiv[];
    plati: Plata[];
    familii: Familie[];
}

type FiltruStare = 'toate' | StareTaxa;

interface TintaScutire {
    sportivId: string;
    numeSportiv: string;
    scutitAcum: boolean;
    motivCurent: string | null;
}

interface NotificariDeschise {
    titlu: string;
    notificari: NotificareTaxaAnuala[];
}

const STARI_FILTRU: StareTaxa[] = [
    'negenerata',
    'in_asteptare',
    'scutit',
    'neachitat',
    'achitat_partial',
    'achitat',
    'anulat',
    'alt_club',
];

const ARE_FACTURA: StareTaxa[] = ['neachitat', 'achitat_partial', 'achitat'];

const poateGenera = (r: SituatieTaxaSportiv) => r.stare === 'negenerata';
const poateScuti = (r: SituatieTaxaSportiv) =>
    !r.virat && ['negenerata', 'in_asteptare', 'neachitat', 'anulat'].includes(r.stare);
const poateAnulaScutirea = (r: SituatieTaxaSportiv) => r.stare === 'scutit';

export const TabSituatieTaxe: React.FC<TabSituatieTaxeProps> = ({ clubId, sportivi, plati, familii }) => {
    const { vizeSportivi, decontSportivi, taxaAnualaFederatieConfig } = useData();
    const { showError, showSuccess } = useError();
    const reincarca = useReincarcaTaxe();

    const [tip, setTip] = useState<TipTaxaFederala>('FRQKD');
    const [an, setAn] = useState<number>(() => getPerioadaTaxa('FRQKD'));
    const [filtruStare, setFiltruStare] = useState<FiltruStare>('toate');
    const [cautare, setCautare] = useState('');
    const [selectie, setSelectie] = useState<Set<string>>(new Set());
    const [confirmMasa, setConfirmMasa] = useState(false);
    const [tintaScutire, setTintaScutire] = useState<TintaScutire | null>(null);
    const [notificariDeschise, setNotificariDeschise] = useState<NotificariDeschise | null>(null);
    const [ultimulRezultat, setUltimulRezultat] = useState<RezultatGenerareTaxe | null>(null);
    const [seIncarca, setSeIncarca] = useState(false);

    const situatie = useMemo(
        () =>
            construiesteSituatieTaxe({
                sportivi,
                vize: vizeSportivi || [],
                plati,
                decontSportivi: decontSportivi || [],
                tip,
                an,
                clubId,
            }),
        [sportivi, vizeSportivi, plati, decontSportivi, tip, an, clubId]
    );

    const pret = useMemo(() => pretTaxa(taxaAnualaFederatieConfig || [], tip, an), [taxaAnualaFederatieConfig, tip, an]);
    const perioada = formatPerioadaTaxa(tip, an);

    const statistici = useMemo(
        () => ({
            total: situatie.length,
            facturate: situatie.filter(r => ARE_FACTURA.includes(r.stare)).length,
            achitate: situatie.filter(r => r.stare === 'achitat').length,
            restante: situatie.filter(r => r.stare === 'neachitat' || r.stare === 'achitat_partial').length,
            scutiti: situatie.filter(r => r.stare === 'scutit').length,
            inAsteptare: situatie.filter(r => r.stare === 'in_asteptare').length,
            virate: situatie.filter(r => r.virat).length,
        }),
        [situatie]
    );

    const randuriFiltrate = useMemo(() => {
        const q = cautare.trim().toLowerCase();
        return situatie.filter(r => {
            if (filtruStare !== 'toate' && r.stare !== filtruStare) return false;
            if (q) {
                const nume = r.sportiv ? formatNume(r.sportiv).toLowerCase() : '';
                if (!nume.includes(q)) return false;
            }
            return true;
        });
    }, [situatie, filtruStare, cautare]);

    const negenerateVizibile = useMemo(() => randuriFiltrate.filter(poateGenera), [randuriFiltrate]);
    const toateSelectate = negenerateVizibile.length > 0 && negenerateVizibile.every(r => selectie.has(r.sportivId));
    const selectieEfectiva = useMemo(
        () => situatie.filter(r => poateGenera(r) && selectie.has(r.sportivId)).map(r => r.sportivId),
        [situatie, selectie]
    );

    const schimbaPerioada = (tipNou: TipTaxaFederala, anNou: number) => {
        setTip(tipNou);
        setAn(anNou);
        setSelectie(new Set());
        setUltimulRezultat(null);
        setFiltruStare('toate');
    };

    const numeSportiv = (r: SituatieTaxaSportiv) => (r.sportiv ? formatNume(r.sportiv) : '—');

    const comutaSelectie = (id: string) =>
        setSelectie(prev => {
            const nou = new Set(prev);
            if (nou.has(id)) nou.delete(id);
            else nou.add(id);
            return nou;
        });

    const comutaToate = () =>
        setSelectie(prev => {
            const nou = new Set(prev);
            if (toateSelectate) negenerateVizibile.forEach(r => nou.delete(r.sportivId));
            else negenerateVizibile.forEach(r => nou.add(r.sportivId));
            return nou;
        });

    const ruleazaGenerare = async (sportivIds?: string[]) => {
        setSeIncarca(true);
        try {
            const { data, error } = await genereazaTaxe({ clubId, tip, an, sportivIds });
            if (error || !data) {
                showError('Taxe anuale', error ?? 'Taxele nu au putut fi generate.');
                return;
            }
            showSuccess(
                'Taxe generate',
                `Facturate: ${data.facturat} · În așteptare: ${data.in_asteptare} · Existau deja: ${data.exista} · Refuzate: ${data.refuzat}` +
                    (data.exista > 0 ? ' («existau deja» poate însemna și taxă activată la alt club)' : '')
            );
            setUltimulRezultat(data);
            setSelectie(new Set());
            await reincarca();
        } finally {
            setSeIncarca(false);
        }
    };

    const deschideNotificariGenerare = () => {
        if (!ultimulRezultat) return;
        const intrari = ultimulRezultat.detalii
            .filter(d => d.rezultat === 'facturat')
            .map(d => ({ sportivId: d.sportiv_id, plataId: d.plata_id, suma: pret ?? 0 }));
        const notificari = genereazaNotificariTaxe({ intrari, sportivi, familii, tip, an, mod: 'generare' });
        setNotificariDeschise({ titlu: `Notificări taxă ${tip} ${perioada}`, notificari });
    };

    const confirmaScutire = async (motiv: string): Promise<boolean> => {
        if (!tintaScutire) return false;
        const scutit = !tintaScutire.scutitAcum;
        const { error } = await seteazaScutire({
            sportivId: tintaScutire.sportivId,
            tip,
            an,
            scutit,
            motiv: scutit ? motiv : null,
        });
        if (error) {
            showError('Taxe anuale', error);
            return false;
        }
        showSuccess('Taxe anuale', scutit ? 'Sportivul a fost marcat ca scutit.' : 'Scutirea a fost anulată.');
        await reincarca();
        return true;
    };

    const deschideScutire = (r: SituatieTaxaSportiv, scutitAcum: boolean) =>
        setTintaScutire({
            sportivId: r.sportivId,
            numeSportiv: numeSportiv(r),
            scutitAcum,
            motivCurent: r.viza?.motiv_scutire ?? null,
        });

    const renderActiuni = (r: SituatieTaxaSportiv) => {
        if (r.stare === 'alt_club') {
            return <span className="text-xs text-[var(--t-text-muted)]">Taxa este activată la alt club</span>;
        }
        const butoane: React.ReactNode[] = [];
        if (poateGenera(r)) {
            butoane.push(
                <Button
                    key="gen"
                    size="sm"
                    variant="primary"
                    disabled={seIncarca}
                    onClick={() => ruleazaGenerare([r.sportivId])}
                >
                    Generează
                </Button>
            );
        }
        if (poateScuti(r)) {
            butoane.push(
                <Button key="scut" size="sm" variant="secondary" disabled={seIncarca} onClick={() => deschideScutire(r, false)}>
                    Scutește
                </Button>
            );
        }
        if (poateAnulaScutirea(r)) {
            butoane.push(
                <Button key="anscut" size="sm" variant="warning" disabled={seIncarca} onClick={() => deschideScutire(r, true)}>
                    Anulează scutirea
                </Button>
            );
        }
        if (butoane.length === 0) return <span className="text-xs text-[var(--t-text-muted)]">—</span>;
        return <div className="flex flex-wrap gap-2">{butoane}</div>;
    };

    const renderStare = (r: SituatieTaxaSportiv) => {
        const e = ETICHETE_STARE_TAXA[r.stare];
        return (
            <div className="space-y-0.5">
                <Badge variant={e.variant}>{e.label}</Badge>
                {r.stare === 'scutit' && r.viza?.motiv_scutire && (
                    <p className="text-xs text-[var(--t-text-muted)] break-words">{r.viza.motiv_scutire}</p>
                )}
            </div>
        );
    };

    const sumaTxt = (r: SituatieTaxaSportiv) => (r.suma != null ? `${formateazaSumaLei(r.suma)} lei` : '—');

    const nrFacturatUltim = ultimulRezultat?.facturat ?? 0;

    return (
        <div className="space-y-4">
            <Card className="space-y-3">
                <SelectorPerioadaTaxa tip={tip} an={an} onChange={schimbaPerioada} />
                {pret != null ? (
                    <p className="text-sm text-[var(--t-text)]">
                        Preț {tip} {perioada}: <span className="font-bold">{formateazaSumaLei(pret)} lei</span>
                    </p>
                ) : (
                    <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                        Federația nu a setat încă prețul — taxele generate rămân «în așteptare» și se facturează automat când prețul este setat.
                    </p>
                )}
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <StatCard label="Sportivi" value={statistici.total} icon={UsersIcon} accentColor="sky" />
                <StatCard label="Facturate" value={statistici.facturate} icon={BanknotesIcon} accentColor="indigo" />
                <StatCard label="Achitate" value={statistici.achitate} icon={CheckIcon} accentColor="emerald" />
                <StatCard label="Restanțe" value={statistici.restante} icon={ExclamationTriangleIcon} accentColor="rose" />
                <StatCard label="Scutiți" value={statistici.scutiti} accentColor="sky" />
                <StatCard label="În așteptare" value={statistici.inAsteptare} accentColor="slate" />
                <StatCard label="Virate federației" value={statistici.virate} icon={BanknotesIcon} accentColor="emerald" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="lg:w-64">
                    <Select
                        label="Stare"
                        value={filtruStare}
                        onChange={e => setFiltruStare(e.target.value as FiltruStare)}
                    >
                        <option value="toate">Toate stările</option>
                        {STARI_FILTRU.map(s => (
                            <option key={s} value={s}>
                                {ETICHETE_STARE_TAXA[s].label}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="flex-1">
                    <SearchInput
                        label="Caută sportiv"
                        placeholder="Nume sau prenume"
                        value={cautare}
                        onChange={e => setCautare(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" disabled={seIncarca} onClick={() => setConfirmMasa(true)}>
                    Generează pentru toți sportivii activi
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={seIncarca || selectieEfectiva.length === 0}
                    onClick={() => ruleazaGenerare(selectieEfectiva)}
                >
                    Generează pentru selectați ({selectieEfectiva.length})
                </Button>
                {ultimulRezultat && nrFacturatUltim > 0 && (
                    <Button variant="success" size="sm" onClick={deschideNotificariGenerare}>
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1" />
                        Notifică pe WhatsApp ({nrFacturatUltim})
                    </Button>
                )}
            </div>

            {randuriFiltrate.length === 0 ? (
                <EmptyState
                    icon={<UsersIcon className="w-10 h-10 text-slate-500" />}
                    title="Niciun sportiv de afișat"
                    description="Nu există sportivi care să corespundă filtrelor alese pentru această perioadă."
                />
            ) : (
                <>
                    {/* Tabel pe ecrane mari */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--t-border)]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--t-table-header-bg)' }} className="text-left text-xs uppercase text-slate-400">
                                    <th className="px-3 py-2 w-10">
                                        <input
                                            type="checkbox"
                                            aria-label="Selectează toți sportivii negenerați"
                                            checked={toateSelectate}
                                            disabled={negenerateVizibile.length === 0}
                                            onChange={comutaToate}
                                        />
                                    </th>
                                    <th className="px-3 py-2">Sportiv</th>
                                    <th className="px-3 py-2">Stare</th>
                                    <th className="px-3 py-2 text-right">Sumă</th>
                                    <th className="px-3 py-2">Virat federației</th>
                                    <th className="px-3 py-2">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {randuriFiltrate.map(r => (
                                    <tr key={r.sportivId} className="border-t border-[var(--t-border)] align-top">
                                        <td className="px-3 py-2">
                                            {poateGenera(r) && (
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Selectează ${numeSportiv(r)}`}
                                                    checked={selectie.has(r.sportivId)}
                                                    onChange={() => comutaSelectie(r.sportivId)}
                                                />
                                            )}
                                        </td>
                                        <td className="px-3 py-2 font-semibold text-[var(--t-text)]">{numeSportiv(r)}</td>
                                        <td className="px-3 py-2">{renderStare(r)}</td>
                                        <td className="px-3 py-2 text-right text-[var(--t-text)]">{sumaTxt(r)}</td>
                                        <td className="px-3 py-2 text-[var(--t-text)]">{r.virat ? 'Da' : 'Nu'}</td>
                                        <td className="px-3 py-2">{renderActiuni(r)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Carduri pe mobil */}
                    <div className="md:hidden space-y-2">
                        {randuriFiltrate.map(r => (
                            <div
                                key={r.sportivId}
                                className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-3 space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {poateGenera(r) && (
                                            <input
                                                type="checkbox"
                                                aria-label={`Selectează ${numeSportiv(r)}`}
                                                checked={selectie.has(r.sportivId)}
                                                onChange={() => comutaSelectie(r.sportivId)}
                                            />
                                        )}
                                        <span className="font-semibold text-[var(--t-text)] truncate">{numeSportiv(r)}</span>
                                    </div>
                                    <span className="font-bold text-[var(--t-text)] shrink-0">{sumaTxt(r)}</span>
                                </div>
                                <div className="flex items-start justify-between gap-2">
                                    {renderStare(r)}
                                    <span className="text-xs text-[var(--t-text-muted)] shrink-0">
                                        Virat federației: {r.virat ? 'Da' : 'Nu'}
                                    </span>
                                </div>
                                {renderActiuni(r)}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={confirmMasa}
                onClose={() => setConfirmMasa(false)}
                onConfirm={() => {
                    setConfirmMasa(false);
                    ruleazaGenerare();
                }}
                title="Generare în masă"
                variant="info"
                confirmLabel="Generează"
                message={`Se vor genera taxele ${tip} ${perioada} pentru toți sportivii activi care nu au deja taxa. Continui?`}
            />

            {tintaScutire && (
                <ScutireTaxaModal
                    isOpen={true}
                    onClose={() => setTintaScutire(null)}
                    numeSportiv={tintaScutire.numeSportiv}
                    tip={tip}
                    an={an}
                    scutitAcum={tintaScutire.scutitAcum}
                    motivCurent={tintaScutire.motivCurent}
                    onConfirm={confirmaScutire}
                />
            )}

            <NotificariTaxeAnualeModal
                isOpen={notificariDeschise !== null}
                onClose={() => setNotificariDeschise(null)}
                titlu={notificariDeschise?.titlu ?? ''}
                notificari={notificariDeschise?.notificari ?? []}
            />
        </div>
    );
};
