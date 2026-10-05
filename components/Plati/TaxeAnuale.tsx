import React, { useState, useMemo } from 'react';
import { User, Sportiv, Plata, TipTaxaFederala } from '../../types';
import { Button, EmptyState } from '../ui';
import { ArrowLeftIcon } from '../icons';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getPerioadaTaxa, formatPerioadaTaxa } from '../../utils/anFiscal';
import { pretTaxa } from '../../utils/taxeAnuale';
import { TabPreturiTaxe } from './TaxeAnualeTabs/TabPreturiTaxe';
import { TabRaportCluburi } from './TaxeAnualeTabs/TabRaportCluburi';
import { TabSituatieTaxe } from './TaxeAnualeTabs/TabSituatieTaxe';
import { TabRestantieriTaxe } from './TaxeAnualeTabs/TabRestantieriTaxe';
import { BannerViratNeachitat } from './TaxeAnualeTabs/BannerViratNeachitat';

interface TaxeAnualeProps {
    onBack: () => void;
    currentUser: User;
    sportivi: Sportiv[];
    plati: Plata[];
    /** Pastrat pentru compatibilitate cu TabConfigurare; nu mai este folosit aici. */
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    /** Faza 31 — ascuns cand e montat in hub-ul Plăți & Facturi */
    hideBackButton?: boolean;
}

type TabId = 'preturi' | 'raport-cluburi' | 'situatie' | 'restantieri';

const TAXE: TipTaxaFederala[] = ['FRQKD', 'FRAM'];

/**
 * Shell Taxe anuale (Faza 33): tab-uri pe rol din contextul activ.
 * Federatie: Prețuri taxe + Raport cluburi. ADMIN_CLUB: Situație taxe + Restanțieri.
 * Securitatea ramane in RLS/RPC; UI-ul doar alege ce afiseaza.
 */
export const TaxeAnuale: React.FC<TaxeAnualeProps> = ({ onBack, sportivi, plati, hideBackButton }) => {
    const { activeRoleContext, taxaAnualaFederatieConfig, filteredData, loading } = useData();
    const { setActiveView } = useNavigation();
    const permissions = usePermissions(activeRoleContext);

    const esteFederatie = permissions.isFederationAdmin;
    const esteAdminClub = !esteFederatie && permissions.isAdminClub;
    const clubId: string | null = activeRoleContext?.club_id ?? null;

    const taburi: { id: TabId; label: string }[] = esteFederatie
        ? [
            { id: 'preturi', label: 'Prețuri taxe' },
            { id: 'raport-cluburi', label: 'Raport cluburi' },
          ]
        : [
            { id: 'situatie', label: 'Situație taxe' },
            { id: 'restantieri', label: 'Restanțieri' },
          ];

    const [tabSelectat, setTabSelectat] = useState<TabId | null>(null);
    const activeTab: TabId = taburi.some(t => t.id === tabSelectat) ? (tabSelectat as TabId) : taburi[0].id;

    // Preturi lipsa pentru perioada curenta (taxele raman «in asteptare», inscrierile nu esueaza)
    const lipsuri = useMemo(() => {
        const config = taxaAnualaFederatieConfig || [];
        return TAXE
            .filter(tip => pretTaxa(config, tip, getPerioadaTaxa(tip)) === null)
            .map(tip => {
                const perioada = formatPerioadaTaxa(tip, getPerioadaTaxa(tip));
                return tip === 'FRQKD' ? `FRQKD sezonul ${perioada}` : `FRAM anul ${perioada}`;
            });
    }, [taxaAnualaFederatieConfig]);

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Se încarcă datele...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    {!hideBackButton && (
                        <Button onClick={onBack} variant="secondary" size="sm" className="mb-2">
                            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Înapoi
                        </Button>
                    )}
                    <h1 className="text-4xl font-black text-white tracking-tighter">TAXE ANUALE & VIZE</h1>
                    <p className="text-slate-400 text-sm">
                        Taxele anuale FRQKD (sezon fiscal) și FRAM (an calendaristic): activare automată, generare, scutiri, plata către federație.
                    </p>
                </div>
                {esteAdminClub && (
                    <Button variant="secondary" onClick={() => setActiveView('deconturi-federatie')}>
                        Plăți către federație
                    </Button>
                )}
            </div>

            {lipsuri.length > 0 && (
                esteFederatie ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
                        <p className="text-sm text-rose-300">
                            Lipsește prețul pentru: <strong>{lipsuri.join(', ')}</strong>. Taxele activate rămân «în așteptare» și se facturează automat când setezi prețul.
                        </p>
                        <Button variant="danger" size="sm" onClick={() => setTabSelectat('preturi')} className="flex-shrink-0">
                            Configurează prețul
                        </Button>
                    </div>
                ) : (
                    <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3">
                        <p className="text-sm text-amber-300">
                            Federația nu a setat încă prețul pentru: <strong>{lipsuri.join(', ')}</strong>. Taxele activate rămân «în așteptare» și vor fi facturate automat.
                        </p>
                    </div>
                )
            )}

            {esteAdminClub && clubId && (
                <BannerViratNeachitat clubId={clubId} sportivi={sportivi} plati={plati} />
            )}

            <div className="flex border-b border-[var(--t-border)] overflow-x-auto">
                {taburi.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setTabSelectat(tab.id)}
                        className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-brand-primary text-brand-secondary'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'preturi' && esteFederatie && <TabPreturiTaxe />}
            {activeTab === 'raport-cluburi' && esteFederatie && <TabRaportCluburi />}

            {!esteFederatie && (
                clubId ? (
                    <>
                        {activeTab === 'situatie' && (
                            <TabSituatieTaxe clubId={clubId} sportivi={sportivi} plati={plati} familii={filteredData?.familii ?? []} />
                        )}
                        {activeTab === 'restantieri' && (
                            <TabRestantieriTaxe clubId={clubId} sportivi={sportivi} plati={plati} familii={filteredData?.familii ?? []} />
                        )}
                    </>
                ) : (
                    <EmptyState title="Selectează un context de club pentru a gestiona taxele." />
                )
            )}
        </div>
    );
};
