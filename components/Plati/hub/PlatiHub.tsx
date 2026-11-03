import React, { useMemo, useEffect } from 'react';
import type { User, Permissions, Plata, Sportiv } from '../../../types';
import { useNavigation } from '../../../contexts/NavigationContext';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { MartialArtsSkeleton } from '../../MartialArtsSkeleton';
import { TabFacturi } from './TabFacturi';
import { TabRapoarte } from './TabRapoarte';
import { TabConfigurare } from './TabConfigurare';
import { TabDeconturiEchipamente } from './TabDeconturiEchipamente';
import {
  TABURI_HUB,
  TABURI_ECHIPAMENTE,
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
 * Shell-ul hub-ului Plati (Faza 31, D-01..D-05).
 *
 * Hub-ul are 7 tab-uri: Facturi & Încasări / Rapoarte / Configurare (D-01..D-04) +
 * Deconturi Federație / Vacanțe Antrenamente / Echipamente / Vânzări (UAT-3, faza 34:
 * `deconturi-federatie` a intrat în hub, D-05 revizuit). `familii` rămâne în afara
 * hub-ului, neatinsă în AppRouter. Echipamente/Vânzări sunt vizibile doar ADMIN_CLUB.
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

  // Paritate cu fostul adminClubMenu: adminMenu (federatie) nu avea Echipamente/Vanzari.
  const poateVedeaEchipamente = permissions.isAdminClub;

  const pozitie = useMemo(
    () => rezolvaPozitieHub(activeView, viewParams, poateVedeaTaxeAnuale, poateVedeaEchipamente),
    [activeView, viewParams, poateVedeaTaxeAnuale, poateVedeaEchipamente]
  );

  // Schimbare de tab/secțiune FĂRĂ intrare în history — goBack() din alte ecrane
  // (ex. profil-sportiv) trebuie să restaureze exact această poziție.
  const schimbaPozitie = (tab: TabHub, sectiune?: SectiuneHub) =>
    setViewParams({ tab, sectiune: sectiune ?? SECTIUNE_IMPLICITA[tab] });

  // F1 (mutat din AppRouter.tsx:72-75): `navigateTo` pune poziția curentă în
  // history, deci "înapoi" din Jurnal revine pe Facturi, ca vechiul flux.
  const handleIncaseazaMultiple = (platiSelectate: Plata[]) => {
    setPlatiPentruIncasare(platiSelectate);
    navigateTo('plati-hub' as any, { tab: 'facturi', sectiune: 'jurnal-incasari' });
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
      {/* Intoarcere (titlul paginii e in Header) */}
      <div>
        <Button onClick={handleBack} variant="secondary" ghost size="sm" className="min-h-11 lg:min-h-9">
          <ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu
        </Button>
      </div>

      {/* Strip de tab-uri (contractul HubTabs) */}
      <div
        role="tablist"
        className="flex overflow-x-auto border-b border-[var(--t-border)] min-h-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABURI_HUB.filter(tab => poateVedeaEchipamente || !TABURI_ECHIPAMENTE.includes(tab)).map(tab => {
          const activ = pozitie.tab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activ}
              aria-current={activ ? 'page' : undefined}
              onClick={() => schimbaPozitie(tab)}
              style={{ touchAction: 'manipulation' }}
              className={`shrink-0 px-4 min-h-11 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)] ${
                activ
                  ? 'font-semibold text-[var(--t-text)] border-[var(--t-primary)]'
                  : 'font-normal border-transparent text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
              }`}
            >
              {ETICHETE_TABURI[tab]}
            </button>
          );
        })}
      </div>

      {/* Chip-uri de secțiune — doar dacă tab-ul curent are mai mult de o secțiune */}
      {sectiuniVizibile.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sectiuniVizibile.map(s => {
            const activ = pozitie.sectiune === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => schimbaPozitie(pozitie.tab, s)}
                style={{ touchAction: 'manipulation' }}
                className={`rounded-lg min-h-11 lg:min-h-9 px-3 text-sm transition-colors whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)] ${
                  activ
                    ? 'font-semibold text-[var(--t-text)] bg-[var(--t-surface)] border-[var(--t-border)]'
                    : 'font-normal text-[var(--t-text-muted)] border-transparent hover:text-[var(--t-text)]'
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
            platiPentruIncasare={platiPentruIncasare}
            onIncasareProcesata={handleIncasareProcesata}
            onJurnalBack={handleJurnalBack}
          />
        )}
        {pozitie.tab === 'rapoarte' && <TabRapoarte {...propsComune} />}
        {pozitie.tab === 'configurare' && <TabConfigurare {...propsComune} />}
        {(pozitie.tab === 'deconturi' || pozitie.tab === 'vacante' || pozitie.tab === 'echipamente' || pozitie.tab === 'vanzari') && (
          <TabDeconturiEchipamente {...propsComune} />
        )}
      </React.Suspense>
    </div>
  );
};
