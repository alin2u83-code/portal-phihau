import React, { useMemo, useEffect } from 'react';
import type { User, Permissions, Plata, Sportiv } from '../../../types';
import { useNavigation } from '../../../contexts/NavigationContext';
import { Button } from '../../ui';
import { ArrowLeftIcon, FileTextIcon, BanknotesIcon, ChartBarIcon, CogIcon } from '../../icons';
import { MartialArtsSkeleton } from '../../MartialArtsSkeleton';
import { TabFacturi } from './TabFacturi';
import { TabIncasari } from './TabIncasari';
import { TabRapoarte } from './TabRapoarte';
import { TabConfigurare } from './TabConfigurare';
import {
  TABURI_HUB,
  ETICHETE_TABURI,
  SECTIUNI_PE_TAB,
  ETICHETE_SECTIUNI,
  SECTIUNE_IMPLICITA,
  rezolvaPozitieHub,
  type TabHub,
  type SectiuneHub,
  type TabProfilSportiv,
} from './platiHubConfig';

/**
 * Shell-ul hub-ului "Plăți & Facturi" (Faza 31, D-01..D-05).
 *
 * Cele 12 vederi financiare vechi (plati-scadente, gestiune-facturi,
 * facturi-fara-prezenta, jurnal-incasari, istoric-plati, raport-financiar,
 * financial-dashboard, tipuri-abonament, configurare-preturi, reduceri,
 * taxe-anuale, nomenclatoare) devin secțiuni în interiorul a 4 tab-uri
 * (Facturi / Încasări / Rapoarte / Configurare — D-01..D-04). `familii` și
 * `deconturi-federatie` NU intră aici (D-05), rămân neatinse în AppRouter.
 *
 * Poziția curentă (tab + secțiune) e citită din `NavigationContext.viewParams`
 * prin `rezolvaPozitieHub` (31-01) — NU e un `useState` local. Motiv: schimbarea
 * de tab/secțiune se face cu `setViewParams` (fără intrare de history), deci
 * `goBack()` din alte ecrane (ex. profil-sportiv) restaurează `viewParams` și
 * readuce userul exact pe tab-ul și secțiunea unde era.
 *
 * Fluxurile F1-F4 (încasare multiplă) sunt mutate aici din AppRouter.tsx —
 * vezi `handleIncaseazaMultiple`, `handleJurnalBack`, `handleIncasareProcesata`
 * mai jos, oglindă exactă a codului vechi (AppRouter.tsx:72-89, eliminat în
 * 31-08 Task 2).
 */
export interface PlatiHubProps {
  currentUser: User;
  permissions: Permissions;
  activeRoleContext: any;
  onViewSportiv: (sportiv: Sportiv, tab?: TabProfilSportiv) => void;
  onBack: () => void;
  platiPentruIncasare: Plata[];
  setPlatiPentruIncasare: (plati: Plata[]) => void;
}

const ICONITE_TABURI: Record<TabHub, React.ComponentType<{ className?: string }>> = {
  facturi: FileTextIcon,
  incasari: BanknotesIcon,
  rapoarte: ChartBarIcon,
  configurare: CogIcon,
};

export const PlatiHub: React.FC<PlatiHubProps> = ({
  currentUser,
  permissions,
  activeRoleContext,
  onViewSportiv,
  onBack,
  platiPentruIncasare,
  setPlatiPentruIncasare,
}) => {
  const { activeView, viewParams, setViewParams, navigateTo, goBack, canGoBack } = useNavigation();

  const poateVedeaTaxeAnuale = permissions.isSuperAdmin || permissions.isAdminClub;

  const pozitie = useMemo(
    () => rezolvaPozitieHub(activeView, viewParams, poateVedeaTaxeAnuale),
    [activeView, viewParams, poateVedeaTaxeAnuale]
  );

  // Schimbare de tab/secțiune FĂRĂ intrare în history — goBack() din alte ecrane
  // (ex. profil-sportiv) trebuie să restaureze exact această poziție.
  const schimbaPozitie = (tab: TabHub, sectiune?: SectiuneHub) =>
    setViewParams({ tab, sectiune: sectiune ?? SECTIUNE_IMPLICITA[tab] });

  // F1 (mutat din AppRouter.tsx:72-75): `navigateTo` pune poziția curentă în
  // history, deci "înapoi" din Jurnal revine pe Facturi, ca vechiul flux.
  const handleIncaseazaMultiple = (platiSelectate: Plata[]) => {
    setPlatiPentruIncasare(platiSelectate);
    navigateTo('plati-hub' as any, { tab: 'incasari', sectiune: 'jurnal-incasari' });
  };

  // F4 (mutat din AppRouter.tsx:87-89)
  const handleIncasareProcesata = () => {
    setPlatiPentruIncasare([]);
  };

  // F3 (oglindă exactă AppRouter.tsx:78-85) — invocat manual (buton) și automat
  // (JurnalIncasari.tsx apelează onBack la 1500ms după orice încasare reușită).
  const handleJurnalBack = () => {
    setPlatiPentruIncasare([]);
    if (canGoBack) {
      goBack();
    } else {
      schimbaPozitie('facturi', 'plati-scadente');
    }
  };

  // Butonul unic de întoarcere al hub-ului (Meniu) — golește orice selecție
  // reziduală înainte de a ieși complet din hub.
  const handleBack = () => {
    setPlatiPentruIncasare([]);
    onBack();
  };

  // Golește selecția de încasare multiplă când userul părăsește Jurnalul prin
  // tab/pastilă (nu prin fluxul F1-F4) — previne precompletarea cu facturi
  // vechi (T-31-05-01). NU golește la intrarea prin handleIncaseazaMultiple:
  // cele două setState-uri (setPlatiPentruIncasare + navigateTo) sunt în
  // același batch React 18, deci primul render deja are sectiune 'jurnal-incasari'.
  useEffect(() => {
    if (pozitie.sectiune !== 'jurnal-incasari' && platiPentruIncasare.length > 0) {
      setPlatiPentruIncasare([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pozitie.sectiune]);

  // F5 (GrupaDetailView → gestiune-facturi cu sportivId, AppRouter.tsx:231)
  const initialSportivId =
    viewParams && typeof viewParams === 'object' && typeof (viewParams as any).sportivId === 'string'
      ? (viewParams as any).sportivId
      : undefined;

  const sectiuniVizibile = SECTIUNI_PE_TAB[pozitie.tab].filter(
    s => s !== 'taxe-anuale' || poateVedeaTaxeAnuale
  );

  const propsComune = {
    sectiune: pozitie.sectiune,
    currentUser,
    permissions,
    activeRoleContext,
    onViewSportiv,
    onBack: handleBack,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleBack} variant="secondary" size="sm">
          <ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu
        </Button>
        <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">
          Plăți &amp; Facturi
        </h1>
      </div>

      {/* Bara de tab-uri */}
      <div className="overflow-x-hidden -mx-4">
        <div
          role="tablist"
          className="flex gap-1.5 overflow-x-auto pb-1 px-4 scroll-smooth scrollbar-hide"
        >
          {TABURI_HUB.map(tab => {
            const IconitaTab = ICONITE_TABURI[tab];
            const activ = pozitie.tab === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={activ}
                onClick={() => schimbaPozitie(tab)}
                style={{ touchAction: 'manipulation' }}
                className={`shrink-0 h-9 flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activ
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <IconitaTab className="w-4 h-4 shrink-0" />
                {ETICHETE_TABURI[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pastile de secțiune — doar dacă tab-ul curent are mai mult de o secțiune */}
      {sectiuniVizibile.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {sectiuniVizibile.map(s => {
            const activ = pozitie.sectiune === s;
            return (
              <button
                key={s}
                onClick={() => schimbaPozitie(pozitie.tab, s)}
                style={{ touchAction: 'manipulation' }}
                className={`h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activ
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {ETICHETE_SECTIUNI[s]}
              </button>
            );
          })}
        </div>
      )}

      {/* Conținutul tab-ului activ */}
      <React.Suspense fallback={<MartialArtsSkeleton count={4} />}>
        {pozitie.tab === 'facturi' && (
          <TabFacturi
            {...propsComune}
            onIncaseazaMultiple={handleIncaseazaMultiple}
            initialSportivId={initialSportivId}
          />
        )}
        {pozitie.tab === 'incasari' && (
          <TabIncasari
            {...propsComune}
            platiPentruIncasare={platiPentruIncasare}
            onIncasareProcesata={handleIncasareProcesata}
            onJurnalBack={handleJurnalBack}
          />
        )}
        {pozitie.tab === 'rapoarte' && <TabRapoarte {...propsComune} />}
        {pozitie.tab === 'configurare' && <TabConfigurare {...propsComune} />}
      </React.Suspense>
    </div>
  );
};
