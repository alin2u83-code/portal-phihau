import React, { useState, useMemo } from 'react';
import { Sportiv, Club, View } from '../types';
import { Card } from './ui';
import { SearchIcon, TrophyIcon, UsersIcon } from './icons';

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
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// --- Tipuri props ---
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

interface FederationDashboardMobileProps {
    sportivi: Sportiv[];
    clubs: Club[];
    taxeRestante?: TaxeRestanteKPI | null;
    loadingTaxe?: boolean;
    evenimente?: EvenimentViitor[];
    loadingEvenimente?: boolean;
    onNavigate?: (view: View) => void;
}

// --- Skeleton ---
const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-700/60 rounded-lg ${className ?? ''}`} />
);

export const FederationDashboardMobile: React.FC<FederationDashboardMobileProps> = ({
    sportivi,
    clubs,
    taxeRestante,
    loadingTaxe = false,
    evenimente = [],
    loadingEvenimente = false,
    onNavigate,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCluburi, setShowCluburi] = useState(false);
    const [showEvenimente, setShowEvenimente] = useState(false);

    const filteredSportivi = useMemo(() => {
        if (!searchTerm) return sportivi;
        const lowerTerm = searchTerm.toLowerCase();
        return sportivi.filter(s =>
            s.nume.toLowerCase().includes(lowerTerm) ||
            s.prenume.toLowerCase().includes(lowerTerm) ||
            s.cod_sportiv?.toLowerCase().includes(lowerTerm)
        );
    }, [sportivi, searchTerm]);

    const stats = useMemo(() => ({
        totalSportivi: sportivi.length,
        vizeActive: sportivi.filter(s => s.status === 'Activ').length,
        numarCluburi: clubs.length,
    }), [sportivi, clubs]);

    const clubRows = useMemo(() => {
        return clubs.map(club => {
            const ai = sportivi.filter(s => s.club_id === club.id);
            return {
                id: club.id,
                nume: club.nume,
                total: ai.length,
                activi: ai.filter(s => s.status === 'Activ').length,
            };
        }).sort((a, b) => b.total - a.total);
    }, [sportivi, clubs]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(val);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
    };

    const getDaysUntil = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-4 p-4">
            {/* --- Statistici rapide top --- */}
            <div className="grid grid-cols-3 gap-2">
                <Card className="p-2 text-center">
                    <div className="text-xs text-slate-400">Sportivi</div>
                    <div className="text-lg font-bold text-white">{stats.totalSportivi}</div>
                </Card>
                <Card className="p-2 text-center">
                    <div className="text-xs text-slate-400">Activi</div>
                    <div className="text-lg font-bold text-emerald-400">{stats.vizeActive}</div>
                </Card>
                <Card className="p-2 text-center">
                    <div className="text-xs text-slate-400">Cluburi</div>
                    <div className="text-lg font-bold text-blue-400">{stats.numarCluburi}</div>
                </Card>
            </div>

            {/* --- KPI Taxe Restante --- */}
            {loadingTaxe ? (
                <SkeletonBlock className="h-20 w-full" />
            ) : taxeRestante != null && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
                        <AlertCircleIcon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-amber-400/80 font-medium">Taxe anuale restante</p>
                        <p className="text-xl font-bold text-amber-400">{taxeRestante.nrSportiviRestanti} sportivi</p>
                        {taxeRestante.valoareEstimata > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                ≈ {formatCurrency(taxeRestante.valoareEstimata)} neîncasat
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* --- Evenimente următori 30 zile (colapsibil) --- */}
            <div className="rounded-xl border border-slate-700 overflow-hidden">
                <button
                    onClick={() => setShowEvenimente(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 text-left"
                >
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-slate-200 text-sm">Evenimente (30 zile)</span>
                        {!loadingEvenimente && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">
                                {evenimente.length}
                            </span>
                        )}
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showEvenimente ? 'rotate-180' : ''}`} />
                </button>

                {showEvenimente && (
                    <div className="bg-slate-900/30">
                        {loadingEvenimente ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 2 }).map((_, i) => <SkeletonBlock key={i} className="h-10 w-full" />)}
                            </div>
                        ) : evenimente.length === 0 ? (
                            <p className="text-center text-slate-500 text-xs py-5">Niciun eveniment în următoarele 30 zile.</p>
                        ) : (
                            <div className="divide-y divide-slate-700/40">
                                {evenimente.map(ev => {
                                    const zile = getDaysUntil(ev.data);
                                    const isExamen = ev.tip === 'examen';
                                    return (
                                        <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isExamen ? 'bg-purple-400' : 'bg-orange-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-400">
                                                    <span className={isExamen ? 'text-purple-400' : 'text-orange-400'}>
                                                        {isExamen ? 'Examen' : 'Competiție'}
                                                    </span>
                                                    {' · '}{formatDate(ev.data)}
                                                    {' · '}{zile === 0 ? 'azi' : zile === 1 ? 'mâine' : `în ${zile}z`}
                                                </p>
                                                <p className="text-sm text-slate-200 font-medium truncate">{ev.denumire}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Sportivi per club (colapsibil) --- */}
            <div className="rounded-xl border border-slate-700 overflow-hidden">
                <button
                    onClick={() => setShowCluburi(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 text-left"
                >
                    <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-slate-200 text-sm">Sportivi per club</span>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showCluburi ? 'rotate-180' : ''}`} />
                </button>

                {showCluburi && (
                    <div className="bg-slate-900/30 divide-y divide-slate-700/40">
                        {clubRows.length === 0 ? (
                            <p className="text-center text-slate-500 text-xs py-5">Niciun club.</p>
                        ) : clubRows.map(row => {
                            const pct = row.total > 0 ? Math.round((row.activi / row.total) * 100) : 0;
                            return (
                                <div key={row.id} className="px-4 py-3">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-200 font-medium truncate max-w-[60%]">{row.nume}</span>
                                        <span className="text-sm text-white font-bold">{row.total} <span className="text-xs text-emerald-400 font-normal">({row.activi} activi)</span></span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- Căutare sportivi --- */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Caută nume sau legitimație..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* --- Listă Sportivi --- */}
            <div className="space-y-2">
                {filteredSportivi.map(s => {
                    const club = clubs.find(c => c.id === s.club_id);
                    return (
                        <div key={s.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700">
                            <div>
                                <div className="font-bold text-white">{s.nume} {s.prenume}</div>
                                <div className="text-xs text-slate-400">Leg: {s.cod_sportiv}</div>
                            </div>
                            {club && (
                                <span className="px-2 py-1 bg-slate-700 text-xs rounded-full text-slate-200">
                                    {club.nume}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- Acces rapid (jos) --- */}
            {onNavigate && (
                <div className="space-y-2 pt-2">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Acces rapid</p>
                    <button
                        onClick={() => onNavigate('stagii')}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                        <TrophyIcon className="w-5 h-5 text-brand-light" />
                        <span className="text-sm font-medium text-slate-200">Creează Eveniment Național</span>
                    </button>
                    <button
                        onClick={() => onNavigate('cluburi')}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                        <UsersIcon className="w-5 h-5 text-brand-light" />
                        <span className="text-sm font-medium text-slate-200">Management Cluburi</span>
                    </button>
                </div>
            )}
        </div>
    );
};
