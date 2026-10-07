import React, { useState } from 'react';
import type { Plata } from '../../../types';
import { useData } from '../../../contexts/DataContext';
import * as Lazy from '../../LazyComponents';
import { FacturaDetaliu } from '../FacturaDetaliu';
import type { PlatiHubTabProps } from './platiHubConfig';

/**
 * Tab-ul "Facturi & Încasări" al hub-ului Plăți & Facturi (D-01 + D-02 unificate): grupează
 * `plati-scadente`, `gestiune-facturi`, `facturi-fara-prezenta`, `jurnal-incasari` și
 * `sumar-incasari` sub aceeași identitate de tab, cu props
 * IDENTICE celor transmise azi de `AppRouter.tsx` (harta verificată în 31-01). Montează
 * suplimentar `FacturaDetaliu` (31-03) pentru butonul „Detalii” (D-08) expus de
 * PlatiScadente/GestiuneFacturi via `onDeschideDetalii`.
 */
export interface TabFacturiProps extends PlatiHubTabProps {
  onIncaseazaMultiple: (plati: Plata[]) => void;
  initialSportivId?: string;
  /** Facturile preselectate din Restanțe (F1) — state App.tsx:50, trecut prin AppRouter → PlatiHub. */
  platiPentruIncasare: Plata[];
  /** Golește selecția după o încasare procesată (oglinda AppRouter.tsx:87-89). */
  onIncasareProcesata: () => void;
  /**
   * `JurnalIncasari` apelează `onBack` AUTOMAT la 1500 ms după orice încasare reușită
   * (JurnalIncasari.tsx:494) — de aceea Jurnalul primește acest callback dedicat, nu `onBack`-ul
   * generic al hub-ului (oglinda `handleJurnalBack` din AppRouter.tsx:78-85).
   */
  onJurnalBack: () => void;
}

export const TabFacturi: React.FC<TabFacturiProps> = ({
  sectiune,
  currentUser,
  permissions,
  onViewSportiv,
  onBack,
  onIncaseazaMultiple,
  initialSportivId,
  platiPentruIncasare,
  onIncasareProcesata,
  onJurnalBack,
}) => {
  const { filteredData, setPlati, setTranzactii, tipuriPlati, preturiConfig, setTipuriPlati, reduceri } = useData();

  const [plataDetaliuId, setPlataDetaliuId] = useState<string | null>(null);
  const deschideDetalii = (p: Plata) => setPlataDetaliuId(p.id);

  return (
    <>
      {sectiune === 'plati-scadente' && (
        <Lazy.PlatiScadente
          onIncaseazaMultiple={onIncaseazaMultiple}
          onViewSportiv={onViewSportiv}
          permissions={permissions}
          onBack={onBack}
          hideBackButton
          onDeschideDetalii={deschideDetalii}
        />
      )}
      {sectiune === 'gestiune-facturi' && (
        <Lazy.GestiuneFacturi
          onBack={onBack}
          currentUser={currentUser}
          sportivi={filteredData.sportivi}
          plati={filteredData.plati}
          setPlati={setPlati}
          setTranzactii={setTranzactii}
          tipuriPlati={tipuriPlati}
          familii={filteredData.familii}
          onViewSportiv={onViewSportiv}
          initialSportivId={initialSportivId}
          hideBackButton
          onDeschideDetalii={deschideDetalii}
        />
      )}
      {sectiune === 'facturi-fara-prezenta' && (
        <Lazy.FacturiFaraPrezenta onBack={onBack} onViewSportiv={onViewSportiv} hideBackButton />
      )}
      {sectiune === 'jurnal-incasari' && (
        <Lazy.JurnalIncasari
          currentUser={currentUser}
          permissions={permissions}
          plati={filteredData.plati}
          setPlati={setPlati}
          sportivi={filteredData.sportivi}
          familii={filteredData.familii}
          preturiConfig={preturiConfig}
          tipuriAbonament={filteredData.tipuriAbonament}
          tipuriPlati={tipuriPlati}
          setTipuriPlati={setTipuriPlati}
          tranzactii={filteredData.tranzactii}
          setTranzactii={setTranzactii}
          platiInitiale={platiPentruIncasare}
          onIncasareProcesata={onIncasareProcesata}
          onBack={onJurnalBack}
          reduceri={reduceri}
          onViewSportiv={onViewSportiv}
          hideBackButton
        />
      )}
      {sectiune === 'sumar-incasari' && <Lazy.SumarIncasari permissions={permissions} />}
      <FacturaDetaliu plataId={plataDetaliuId} onClose={() => setPlataDetaliuId(null)} />
    </>
  );
};
