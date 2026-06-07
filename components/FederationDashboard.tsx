import React, { useEffect, useState, useMemo } from 'react';
import { View } from '../types';
import { Card } from './ui';
import { TrophyIcon, UsersIcon } from './icons';
import { useIsMobile } from '../hooks/useIsMobile';
import { FederationDashboardMobile } from './FederationDashboardMobile';
import { useData } from '../contexts/DataContext';
import { supabase } from '../supabaseClient';

// --- Iconițe inline locale ---
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const AlertCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const BuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="9" width="18" height="13" /><path d="M8 22V12h8v10" /><path d="M3 9l9-6 9 6" />
    </svg>
);

// --- Tipuri locale KPI ---
interface ClubSportiviRow {
    club_id: string;
    club_nume: string;
    total: number;
    activi: number;
}

interface TaxeRestanteKPI {
    nrSportiviRestanti: number;
    valoareEstimata: number;
    taxaUnitara: number;
}

interface EvenimentViitor {
    id: string;
    tip: 'examen' | 'competitie';
    denumire: string;
    data: string;
    locatie?: string;
}

// --- Skeleton ---
const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-700/60 rounded-lg ${className ?? ''}`} />
);

const KpiCardSkeleton: React.FC = () => (
    <Card className="p-5 space-y-3">
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-8 w-1/3" />
        <SkeletonBlock className="h-3 w-2/3" />
    </Card>
);

// --- NavCard (mutat jos, Acces rapid) ---
const NavCard: React.FC<{ title: string; view: View; icon: React.ElementType; onNavigate: (view: View) => void; }> = ({ title, view, icon: Icon, onNavigate }) => (
    <div
        onClick={() => onNavigate(view)}
        style={{ touchAction: 'manipulation' }}
        className="bg-[var(--t-surface-2)] p-5 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-[var(--t-surface)] transition-all border border-[var(--t-border)] hover:shadow-lg group"
    >
        <div className="p-3 rounded-full bg-[var(--t-surface)] group-hover:bg-[var(--t-surface-2)] transition-colors shrink-0">
            <Icon className="w-6 h-6 text-brand-light group-hover:text-white transition-colors" />
        </div>
        <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">{title}</span>
    </div>
);

// --- Componenta principală ---
interface FederationDashboardProps {
    onNavigate: (view: View) => void;
}

export const FederationDashboard: React.FC<FederationDashboardProps> = ({ onNavigate }) => {
    const isMobile = useIsMobile();
    const { sportivi, clubs } = useData();

    // State KPI-uri
    const [clubRows, setClubRows] = useState<ClubSportiviRow[]>([]);
    const [loadingCluburi, setLoadingCluburi] = useState(true);

    const [taxeRestante, setTaxeRestante] = useState<TaxeRestanteKPI | null>(null);
    const [loadingTaxe, setLoadingTaxe] = useState(true);

    const [evenimente, setEvenimente] = useState<EvenimentViitor[]>([]);
    const [loadingEvenimente, setLoadingEvenimente] = useState(true);

    // --- KPI 1: Sportivi per club din contextul local (deja în cache DataContext) ---
    useEffect(() => {
        const rows: ClubSportiviRow[] = clubs.map(club => {
            const sportiviiClubului = sportivi.filter(s => s.club_id === club.id);
            return {
                club_id: club.id,
                club_nume: club.nume,
                total: sportiviiClubului.length,
                activi: sportiviiClubului.filter(s => s.status === 'Activ').length,
            };
        }).sort((a, b) => b.total - a.total);
        setClubRows(rows);
        setLoadingCluburi(false);
    }, [sportivi, clubs]);

    // --- KPI 2: Taxe anuale restante ---
    useEffect(() => {
        const fetchTaxeRestante = async () => {
            setLoadingTaxe(true);
            try {
                const anCurent = new Date().getFullYear();

                // Adunăm taxa activă din taxe_anuale_config
                const { data: taxeConfig } = await supabase
                    .from('taxe_anuale_config')
                    .select('suma')
                    .eq('is_activ', true)
                    .limit(1)
                    .maybeSingle();

                const taxaUnitara = taxeConfig?.suma ?? 0;

                // Sportivi activi care NU au o plată de tip taxa_anuala în anul curent
                const { data: sportiviActivi } = await supabase
                    .from('sportivi')
                    .select('id')
                    .eq('status', 'Activ');

                if (!sportiviActivi || sportiviActivi.length === 0) {
                    setTaxeRestante({ nrSportiviRestanti: 0, valoareEstimata: 0, taxaUnitara });
                    return;
                }

                const idActivi = sportiviActivi.map(s => s.id);

                // Plăți de tip taxa anuală în anul curent
                const { data: platiAn } = await supabase
                    .from('plati')
                    .select('sportiv_id')
                    .eq('an', anCurent)
                    .in('tip', ['taxa_anuala', 'taxa_federatie', 'Taxa anuala', 'Taxa federatie'])
                    .eq('status', 'Platit');

                const idCuTaxa = new Set((platiAn ?? []).map((p: { sportiv_id: string }) => p.sportiv_id));
                const restanti = idActivi.filter(id => !idCuTaxa.has(id));

                setTaxeRestante({
                    nrSportiviRestanti: restanti.length,
                    valoareEstimata: restanti.length * taxaUnitara,
                    taxaUnitara,
                });
            } catch {
                setTaxeRestante(null);
            } finally {
                setLoadingTaxe(false);
            }
        };
        fetchTaxeRestante();
    }, []);

    // --- KPI 3: Evenimente următori 30 zile ---
    useEffect(() => {
        const fetchEvenimente = async () => {
            setLoadingEvenimente(true);
            try {
                const azi = new Date().toISOString().split('T')[0];
                const plus30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const [{ data: sesiuni }, { data: competitii }] = await Promise.all([
                    supabase
                        .from('sesiuni_examene')
                        .select('id, nume, sesiune, data, localitate')
                        .gte('data', azi)
                        .lte('data', plus30)
                        .order('data', { ascending: true }),
                    supabase
                        .from('competitii')
                        .select('id, denumire, data_inceput, locatie')
                        .gte('data_inceput', azi)
                        .lte('data_inceput', plus30)
                        .order('data_inceput', { ascending: true }),
                ]);

                const ev: EvenimentViitor[] = [
                    ...(sesiuni ?? []).map((s: { id: string; nume?: string; sesiune?: string; data: string; localitate?: string }) => ({
                        id: s.id,
                        tip: 'examen' as const,
                        denumire: s.nume || s.sesiune || 'Sesiune examen',
                        data: s.data,
                        locatie: s.localitate,
                    })),
                    ...(competitii ?? []).map((c: { id: string; denumire: string; data_inceput: string; locatie?: string }) => ({
                        id: c.id,
                        tip: 'competitie' as const,
                        denumire: c.denumire,
                        data: c.data_inceput,
                        locatie: c.locatie,
                    })),
                ].sort((a, b) => a.data.localeCompare(b.data));

                setEvenimente(ev);
            } catch {
                setEvenimente([]);
            } finally {
                setLoadingEvenimente(false);
            }
        };
        fetchEvenimente();
    }, []);

    // --- Totaluri agregat ---
    const totalSportivi = useMemo(() => sportivi.length, [sportivi]);
    const totalActivi = useMemo(() => sportivi.filter(s => s.status === 'Activ').length, [sportivi]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(val);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getDaysUntil = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    if (isMobile) {
        return (
            <FederationDashboardMobile
                sportivi={sportivi}
                clubs={clubs}
                taxeRestante={taxeRestante}
                loadingTaxe={loadingTaxe}
                evenimente={evenimente}
                loadingEvenimente={loadingEvenimente}
                onNavigate={onNavigate}
            />
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Panou de Control Federație</h1>
                <p className="text-slate-400">Vedere de ansamblu la nivel național — date în timp real.</p>
            </header>

            {/* --- Rând KPI Cards --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* KPI: Total sportivi */}
                <Card className="p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Total Sportivi</p>
                            <p className="text-4xl font-bold text-white mt-1">{totalSportivi}</p>
                            <p className="text-sm text-emerald-400 mt-1">{totalActivi} activi &middot; {totalSportivi - totalActivi} inactivi</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-500/15">
                            <UsersIcon className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500">{clubs.length} cluburi înregistrate</p>
                    </div>
                </Card>

                {/* KPI: Taxe restante */}
                {loadingTaxe ? (
                    <KpiCardSkeleton />
                ) : (
                    <Card className="p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-400 font-medium">Taxe Anuale Restante</p>
                                <p className="text-4xl font-bold text-amber-400 mt-1">
                                    {taxeRestante?.nrSportiviRestanti ?? '—'}
                                </p>
                                <p className="text-sm text-slate-400 mt-1">
                                    {taxeRestante && taxeRestante.valoareEstimata > 0
                                        ? `≈ ${formatCurrency(taxeRestante.valoareEstimata)} neîncasat`
                                        : 'sportivi fără taxă achitată'}
                                </p>
                            </div>
                            <div className="p-3 rounded-full bg-amber-500/15">
                                <AlertCircleIcon className="w-6 h-6 text-amber-400" />
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-xs text-slate-500">
                                {taxeRestante?.taxaUnitara
                                    ? `Taxă unitară: ${formatCurrency(taxeRestante.taxaUnitara)}/sportiv`
                                    : 'Fără configurație taxă activă'}
                            </p>
                        </div>
                    </Card>
                )}

                {/* KPI: Evenimente viitoare */}
                {loadingEvenimente ? (
                    <KpiCardSkeleton />
                ) : (
                    <Card className="p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-400 font-medium">Evenimente (30 zile)</p>
                                <p className="text-4xl font-bold text-purple-400 mt-1">{evenimente.length}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    {evenimente.filter(e => e.tip === 'examen').length} examene &middot; {evenimente.filter(e => e.tip === 'competitie').length} competiții
                                </p>
                            </div>
                            <div className="p-3 rounded-full bg-purple-500/15">
                                <CalendarIcon className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-xs text-slate-500">
                                {evenimente.length > 0
                                    ? `Următor: ${formatDate(evenimente[0].data)}`
                                    : 'Niciun eveniment programat'}
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            {/* --- Rând principal: tabel cluburi + timeline --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sportivi per club — 2/3 lățime */}
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--t-border)] flex items-center gap-3">
                            <BuildingIcon className="w-5 h-5 text-[var(--t-text-muted)]" />
                            <h2 className="font-semibold text-[var(--t-text)]">Sportivi per Club</h2>
                        </div>
                        {loadingCluburi ? (
                            <div className="p-5 space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <SkeletonBlock key={i} className="h-9 w-full" />
                                ))}
                            </div>
                        ) : clubRows.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">Niciun club înregistrat.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                                            <th className="text-left px-5 py-3 font-medium">Club</th>
                                            <th className="text-right px-5 py-3 font-medium">Total</th>
                                            <th className="text-right px-5 py-3 font-medium">Activi</th>
                                            <th className="px-5 py-3 font-medium text-right">Activi %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clubRows.map((row, idx) => {
                                            const pct = row.total > 0 ? Math.round((row.activi / row.total) * 100) : 0;
                                            return (
                                                <tr
                                                    key={row.club_id}
                                                    className={`border-t border-[var(--t-border)] hover:bg-[var(--t-table-row-hover)] transition-colors ${idx === 0 ? 'border-t-0' : ''}`}
                                                >
                                                    <td className="px-5 py-3 text-slate-200">{row.club_nume}</td>
                                                    <td className="px-5 py-3 text-right font-semibold text-white">{row.total}</td>
                                                    <td className="px-5 py-3 text-right text-emerald-400">{row.activi}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-20 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-slate-400 text-xs w-8 text-right">{pct}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-[var(--t-border)] bg-[var(--t-surface-2)]">
                                            <td className="px-5 py-3 font-semibold text-[var(--t-text-muted)]">Total federație</td>
                                            <td className="px-5 py-3 text-right font-bold text-white">{totalSportivi}</td>
                                            <td className="px-5 py-3 text-right font-bold text-emerald-400">{totalActivi}</td>
                                            <td className="px-5 py-3 text-right text-slate-400 text-xs">
                                                {totalSportivi > 0 ? Math.round((totalActivi / totalSportivi) * 100) : 0}%
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Timeline evenimente — 1/3 lățime */}
                <div className="lg:col-span-1">
                    <Card className="overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--t-border)] flex items-center gap-3">
                            <CalendarIcon className="w-5 h-5 text-[var(--t-text-muted)]" />
                            <h2 className="font-semibold text-[var(--t-text)]">Următori 30 zile</h2>
                        </div>
                        {loadingEvenimente ? (
                            <div className="p-5 space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <SkeletonBlock className="h-3 w-1/3" />
                                        <SkeletonBlock className="h-5 w-3/4" />
                                    </div>
                                ))}
                            </div>
                        ) : evenimente.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Niciun eveniment programat în următoarele 30 zile.
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--t-border)] max-h-[400px] overflow-y-auto">
                                {evenimente.map(ev => {
                                    const zile = getDaysUntil(ev.data);
                                    const isExamen = ev.tip === 'examen';
                                    return (
                                        <div key={ev.id} className="px-5 py-4 hover:bg-[var(--t-table-row-hover)] transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isExamen ? 'bg-purple-400' : 'bg-orange-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-500 mb-0.5">
                                                        <span className={`font-medium ${isExamen ? 'text-purple-400' : 'text-orange-400'}`}>
                                                            {isExamen ? 'Examen' : 'Competiție'}
                                                        </span>
                                                        {' · '}
                                                        {zile === 0 ? 'azi' : zile === 1 ? 'mâine' : `în ${zile} zile`}
                                                    </p>
                                                    <p className="text-sm font-medium text-slate-200 truncate">{ev.denumire}</p>
                                                    {ev.locatie && (
                                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{ev.locatie}</p>
                                                    )}
                                                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(ev.data)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* --- Acces rapid (fostele NavCard-uri, mutate jos) --- */}
            <div>
                <h2 className="text-lg font-semibold text-slate-300 mb-3">Acces rapid</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NavCard
                        title="Creează Eveniment Național"
                        view="stagii"
                        icon={TrophyIcon}
                        onNavigate={onNavigate}
                    />
                    <NavCard
                        title="Management Cluburi"
                        view="cluburi"
                        icon={UsersIcon}
                        onNavigate={onNavigate}
                    />
                </div>
            </div>
        </div>
    );
};
