import React, { useState, useMemo } from 'react';
import { Sportiv, Club, View } from '../types';
import { Card, Button, Skeleton, AccordionItem } from './ui';
import { SearchIcon, UsersIcon } from './icons';

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
    const toggleSectiune = (id: string) => (id === 'evenimente' ? setShowEvenimente(v => !v) : setShowCluburi(v => !v));

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
                <Card className="text-center">
                    <div className="text-xs font-semibold text-[var(--t-text-muted)]">Sportivi</div>
                    <div className="text-2xl font-semibold text-[var(--t-text)]">{stats.totalSportivi}</div>
                </Card>
                <Card className="text-center">
                    <div className="text-xs font-semibold text-[var(--t-text-muted)]">Activi</div>
                    <div className="text-2xl font-semibold text-[var(--t-text)]">{stats.vizeActive}</div>
                </Card>
                <Card className="text-center">
                    <div className="text-xs font-semibold text-[var(--t-text-muted)]">Cluburi</div>
                    <div className="text-2xl font-semibold text-[var(--t-text)]">{stats.numarCluburi}</div>
                </Card>
            </div>

            {/* --- KPI Taxe Restante --- */}
            {loadingTaxe ? (
                <Skeleton className="h-20 w-full" />
            ) : taxeRestante != null && (
                <Card className="flex items-center gap-4">
                    <AlertCircleIcon className="w-5 h-5 shrink-0 text-[var(--t-primary)]" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--t-text-muted)]">Taxe anuale restante</p>
                        <p
                            className="text-2xl font-semibold text-[var(--t-text)]"
                            style={taxeRestante.nrSportiviRestanti > 0 ? { color: 'var(--t-status-danger)' } : undefined}
                        >
                            {taxeRestante.nrSportiviRestanti} sportivi
                        </p>
                        {taxeRestante.valoareEstimata > 0 && (
                            <p className="text-xs text-[var(--t-text-muted)] mt-1">
                                ≈ {formatCurrency(taxeRestante.valoareEstimata)} neîncasat
                            </p>
                        )}
                    </div>
                </Card>
            )}

            {/* --- Evenimente următoarele 30 zile (pliabil) --- */}
            <AccordionItem
                id="evenimente"
                title={`Evenimente (30 zile)${loadingEvenimente ? '' : ` · ${evenimente.length}`}`}
                icon={CalendarIcon}
                isOpen={showEvenimente}
                onToggle={toggleSectiune}
            >
                {loadingEvenimente ? (
                    <div className="space-y-4">
                        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                ) : evenimente.length === 0 ? (
                    <p className="text-center text-[var(--t-text-muted)] text-xs py-4">Niciun eveniment în următoarele 30 zile.</p>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {evenimente.map(ev => {
                            const zile = getDaysUntil(ev.data);
                            const isExamen = ev.tip === 'examen';
                            return (
                                <div key={ev.id} className="py-3">
                                    <p className="text-xs text-[var(--t-text-muted)]">
                                        <span className="font-semibold">{isExamen ? 'Examen' : 'Competiție'}</span>
                                        {' · '}{formatDate(ev.data)}
                                        {' · '}{zile === 0 ? 'azi' : zile === 1 ? 'mâine' : `în ${zile}z`}
                                    </p>
                                    <p className="text-sm font-semibold text-[var(--t-text)] truncate">{ev.denumire}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </AccordionItem>

            {/* --- Sportivi per club (pliabil) --- */}
            <AccordionItem
                id="cluburi"
                title="Sportivi per club"
                icon={UsersIcon}
                isOpen={showCluburi}
                onToggle={toggleSectiune}
            >
                {clubRows.length === 0 ? (
                    <p className="text-center text-[var(--t-text-muted)] text-xs py-4">Niciun club.</p>
                ) : (
                    <div className="divide-y divide-[var(--t-border)]">
                        {clubRows.map(row => {
                            const pct = row.total > 0 ? Math.round((row.activi / row.total) * 100) : 0;
                            return (
                                <div key={row.id} className="py-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-[var(--t-text)] truncate max-w-[60%]">{row.nume}</span>
                                        <span className="text-sm font-semibold text-[var(--t-text)]">{row.total} <span className="text-xs text-[var(--t-text-muted)] font-normal">({row.activi} activi)</span></span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-[var(--t-border)] overflow-hidden">
                                        <div className="h-full rounded-full bg-[var(--t-status-success)]" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </AccordionItem>

            {/* --- Căutare sportivi --- */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-[var(--t-text-muted)]" />
                <input
                    type="text"
                    placeholder="Caută nume sau legitimație..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] placeholder:text-[var(--t-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-input-focus-ring)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* --- Listă Sportivi --- */}
            <div className="space-y-2">
                {filteredSportivi.map(s => {
                    const club = clubs.find(c => c.id === s.club_id);
                    return (
                        <Card key={s.id} className="flex justify-between items-center">
                            <div>
                                <div className="text-sm font-semibold text-[var(--t-text)]">{s.nume} {s.prenume}</div>
                                <div className="text-xs text-[var(--t-text-muted)]">Leg: {s.cod_sportiv}</div>
                            </div>
                            {club && (
                                <span className="text-xs text-[var(--t-text-muted)]">
                                    {club.nume}
                                </span>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* --- Acces rapid (jos) --- */}
            {onNavigate && (
                <div className="space-y-2 pt-2">
                    <Button variant="primary" className="w-full min-h-11" onClick={() => onNavigate('cluburi')}>Management Cluburi</Button>
                    <Button variant="secondary" className="w-full min-h-11" onClick={() => onNavigate('stagii')}>Creează Eveniment Național</Button>
                </div>
            )}
        </div>
    );
};
