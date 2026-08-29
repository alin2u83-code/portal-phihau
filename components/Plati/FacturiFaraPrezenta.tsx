import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plata, Sportiv } from '../../types';
import { Button, Card, Select, EmptyState, Skeleton } from '../ui';
import { ArrowLeftIcon, ExclamationTriangleIcon, TrashIcon, XCircleIcon, CheckCircleIcon, BanknotesIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { getDisplayStatus, STATUS_DISPLAY_CONFIG, esteDeIncasat, esteAnulata } from '../../utils/paymentStatus';
import { usePrezenteLunare, cheiePrezenta } from '../../hooks/usePrezenteLunare';
import { anuleazaFacturaAbonament, reactiveazaFacturaAbonament, stergeFacturaAbonament } from '../../services/facturaService';
import { formatNume } from '../../utils/formatareSportiv';

interface FacturiFaraPrezentaProps {
    onBack: () => void;
    onViewSportiv?: (sportiv: Sportiv) => void;
}

const LUNI = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

/**
 * Raport dedicat: facturi de Abonament (per sportiv individual, fără familie) fără
 * nicio prezență în luna facturată — cu acțiuni de anulare (soft, reversibilă) și
 * ștergere definitivă (hard, ireversibilă).
 *
 * NU folosește `filteredData.plati` ca sursă a listei: `hooks/usePlati.ts` interoghează
 * `rbv_plati_club` fără paginare, deci lovește limita implicită PostgREST de 1000 rânduri
 * — pentru cluburi cu istoric lung, lunile vechi ar lipsi tăcut din cache. În schimb,
 * interoghează direct `rbv_plati_club`, filtrat server-side pe lună+an — o singură
 * interogare, câteva sute de rânduri maxim, corectă pentru orice lună istorică.
 */
export const FacturiFaraPrezenta: React.FC<FacturiFaraPrezentaProps> = ({ onBack, onViewSportiv }) => {
    const { filteredData, activeRoleContext } = useData();
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

    const acum = useMemo(() => new Date(), []);
    const [lunaSelectata, setLunaSelectata] = useState(acum.getMonth() + 1);
    const [anSelectat, setAnSelectat] = useState(acum.getFullYear());
    const [idInLucru, setIdInLucru] = useState<string | null>(null);
    const [plataToAnula, setPlataToAnula] = useState<Plata | null>(null);
    const [plataToSterge, setPlataToSterge] = useState<Plata | null>(null);

    // Anii disponibili: derivați dinamic din anii reali prezenți în plăți (pattern
    // confirmat din quick task 260709-fth), UNION cu anul curent — niciodată hardcodați.
    const aniDisponibili = useMemo(() => {
        const aniSet = new Set<number>([acum.getFullYear()]);
        (filteredData.plati || []).forEach(p => {
            if (p.an) { aniSet.add(p.an); return; }
            const anDinData = parseInt((p.data || '').toString().slice(0, 4), 10);
            if (!isNaN(anDinData)) aniSet.add(anDinData);
        });
        return Array.from(aniSet).sort((a, b) => b - a);
    }, [filteredData.plati, acum]);

    const { data: facturiLuna, isLoading: facturiLoading } = useQuery<Plata[], Error>({
        queryKey: ['facturi-abonament-luna', lunaSelectata, anSelectat, activeRoleContext?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rbv_plati_club')
                .select('*')
                .eq('tip', 'Abonament')
                .eq('luna', lunaSelectata)
                .eq('an', anSelectat);
            if (error) throw error;
            return (data || []) as Plata[];
        },
    });

    const prezenteQuery = usePrezenteLunare([{ luna: lunaSelectata, an: anSelectat }]);

    // Facturile de familie (familie_id non-null sau sportiv_id null) sunt excluse din
    // analiza „0 prezențe" — nu are sens pentru mai mulți sportivi simultan (același
    // raționament ca showPrezente din PlatiScadente.tsx). Le numărăm separat, ca să nu
    // pară uitate.
    const { facturiIndividuale, nrFacturiFamilie } = useMemo(() => {
        const toate = facturiLuna || [];
        const individuale = toate.filter(p => !!p.sportiv_id && !p.familie_id);
        const familie = toate.filter(p => !p.sportiv_id || p.familie_id);
        return { facturiIndividuale: individuale, nrFacturiFamilie: familie.length };
    }, [facturiLuna]);

    const facturiFaraPrezenta = useMemo(() => {
        if (prezenteQuery.isLoading) return [];
        const setPrezente = prezenteQuery.data ?? new Set<string>();
        return facturiIndividuale
            .filter(p => !setPrezente.has(cheiePrezenta(p.sportiv_id as string, lunaSelectata, anSelectat)))
            .map(p => {
                const sportiv = (filteredData.sportivi || []).find(s => s.id === p.sportiv_id);
                const nume = sportiv
                    ? formatNume(sportiv)
                    : (p.sportiv_nume ? `${p.sportiv_nume} ${p.sportiv_prenume || ''}`.trim() : '—');
                return { plata: p, sportiv, nume };
            })
            .sort((a, b) => a.nume.localeCompare(b.nume, 'ro-RO'));
    }, [facturiIndividuale, prezenteQuery.data, prezenteQuery.isLoading, lunaSelectata, anSelectat, filteredData.sportivi]);

    const totalSuma = useMemo(
        () => facturiFaraPrezenta.reduce((s, r) => s + (r.plata.suma || 0), 0),
        [facturiFaraPrezenta]
    );

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['facturi-abonament-luna'] });
        // Cache-ul global de plăți (hooks/usePlati.ts) trebuie invalidat și el, ca lista
        // din Plăți (PlatiScadente) să nu rămână învechită după o acțiune de aici.
        queryClient.invalidateQueries({ queryKey: ['plati'] });
    };

    const handleAnuleaza = async () => {
        if (!plataToAnula) return;
        const id = plataToAnula.id;
        setIdInLucru(id);
        const { error } = await anuleazaFacturaAbonament(id);
        setIdInLucru(null);
        if (error) {
            showError('Anulare eșuată', error.message);
        } else {
            showSuccess('Succes', 'Factura a fost anulată.');
            invalidateAll();
        }
        setPlataToAnula(null);
    };

    const handleReactiveaza = async (plata: Plata) => {
        setIdInLucru(plata.id);
        const { error } = await reactiveazaFacturaAbonament(plata.id);
        setIdInLucru(null);
        if (error) {
            showError('Reactivare eșuată', error.message);
        } else {
            showSuccess('Succes', 'Factura a fost reactivată.');
            invalidateAll();
        }
    };

    const handleSterge = async () => {
        if (!plataToSterge) return;
        const id = plataToSterge.id;
        setIdInLucru(id);
        const { error } = await stergeFacturaAbonament(id);
        setIdInLucru(null);
        if (error) {
            showError('Ștergere eșuată', error.message);
        } else {
            showSuccess('Succes', 'Factura a fost ștearsă definitiv.');
            invalidateAll();
        }
        setPlataToSterge(null);
    };

    const seIncarca = facturiLoading || prezenteQuery.isLoading;

    return (
        <div className="space-y-4 md:space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Facturi fără Prezență</h1>

            <Card className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Lună" value={lunaSelectata} onChange={e => setLunaSelectata(parseInt(e.target.value, 10))}>
                    {LUNI.map((nume, idx) => <option key={nume} value={idx + 1}>{nume}</option>)}
                </Select>
                <Select label="An" value={anSelectat} onChange={e => setAnSelectat(parseInt(e.target.value, 10))}>
                    {aniDisponibili.map(an => <option key={an} value={an}>{an}</option>)}
                </Select>
            </Card>

            {seIncarca ? (
                <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : facturiIndividuale.length === 0 ? (
                <EmptyState
                    icon={<BanknotesIcon className="w-10 h-10 text-[var(--t-text-muted)]" />}
                    title="Nicio factură de abonament în luna aleasă"
                    description="Nu există facturi de tip Abonament emise unor sportivi individuali pentru luna și anul selectate."
                />
            ) : facturiFaraPrezenta.length === 0 ? (
                <EmptyState
                    icon={<CheckCircleIcon className="w-10 h-10 text-emerald-500" />}
                    title="Toți sportivii facturați au avut prezențe"
                    description="Niciun sportiv cu factură de Abonament pe această lună nu are 0 prezențe."
                />
            ) : (
                <>
                    <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Facturi fără prezență</p>
                            <p className="text-2xl font-black text-white">{facturiFaraPrezenta.length}</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Sumă totală</p>
                            <p className="text-2xl font-black text-amber-400">{totalSuma.toFixed(2)} RON</p>
                        </div>
                    </Card>

                    <div className="space-y-2">
                        {facturiFaraPrezenta.map(({ plata: p, sportiv, nume }) => {
                            const ds = getDisplayStatus(p);
                            const cfg = STATUS_DISPLAY_CONFIG[ds];
                            const inLucru = idInLucru === p.id;
                            return (
                                <Card key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            className="text-white font-semibold text-sm hover:text-brand-primary hover:underline text-left disabled:no-underline disabled:cursor-default disabled:text-slate-300"
                                            disabled={!sportiv || !onViewSportiv}
                                            onClick={() => { if (sportiv && onViewSportiv) onViewSportiv(sportiv); }}
                                        >
                                            {nume}
                                        </button>
                                        <p className="text-slate-400 text-xs mt-0.5">{p.descriere}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                                            <span
                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-700/40 flex items-center gap-1"
                                                title="Sportivul nu are nicio prezență înregistrată în luna facturii"
                                            >
                                                <ExclamationTriangleIcon className="w-3 h-3" /> 0 prezențe
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3">
                                        <span className="text-white font-bold text-sm whitespace-nowrap">{p.suma.toFixed(2)} RON</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {esteDeIncasat(p) && (
                                                <Button
                                                    size="sm" variant="secondary" disabled={inLucru}
                                                    onClick={() => setPlataToAnula(p)} title="Anulează factura (reversibil)"
                                                >
                                                    <XCircleIcon className="w-4 h-4 mr-1" /> Anulează
                                                </Button>
                                            )}
                                            {esteAnulata(p) && (
                                                <Button
                                                    size="sm" variant="secondary" isLoading={inLucru} disabled={inLucru}
                                                    onClick={() => handleReactiveaza(p)} title="Reactivează factura"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4 mr-1" /> Reactivează
                                                </Button>
                                            )}
                                            <Button
                                                size="sm" variant="danger" disabled={inLucru}
                                                onClick={() => setPlataToSterge(p)} title="Șterge definitiv (ireversibil)"
                                            >
                                                <TrashIcon className="w-4 h-4 mr-1" /> Șterge definitiv
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {nrFacturiFamilie > 0 && !seIncarca && (
                <p className="text-xs text-slate-500 italic px-1">
                    {nrFacturiFamilie} {nrFacturiFamilie === 1 ? 'factură de familie a fost' : 'facturi de familie au fost'} excluse
                    din analiză — indicatorul „0 prezențe" se aplică doar facturilor individuale.
                </p>
            )}

            <ConfirmDeleteModal
                isOpen={!!plataToAnula}
                onClose={() => setPlataToAnula(null)}
                onConfirm={handleAnuleaza}
                tableName="factură"
                isLoading={idInLucru === plataToAnula?.id}
                title="Anulează factura"
                confirmButtonText="Anulează factura"
                confirmButtonVariant="secondary"
                icon={XCircleIcon}
                customMessage="Factura rămâne în evidență (pentru audit), iese din toate sumele de încasat și poate fi reactivată oricând — acțiunea este reversibilă."
            />

            <ConfirmDeleteModal
                isOpen={!!plataToSterge}
                onClose={() => setPlataToSterge(null)}
                onConfirm={handleSterge}
                tableName="factură"
                isLoading={idInLucru === plataToSterge?.id}
                title="Ștergere definitivă"
                confirmButtonText="Șterge definitiv"
                confirmButtonVariant="danger"
                icon={TrashIcon}
                customMessage="Rândul dispare complet din baza de date — această acțiune este ireversibilă. Alternativa recomandată este anularea (reversibilă)."
            />
        </div>
    );
};
