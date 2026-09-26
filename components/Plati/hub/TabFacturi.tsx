import React, { useState } from 'react';
import type { Plata } from '../../../types';
import { useData } from '../../../contexts/DataContext';
import * as Lazy from '../../LazyComponents';
import { FacturaDetaliu } from '../FacturaDetaliu';
import type { PlatiHubTabProps } from './platiHubConfig';

/**
 * Tab-ul "Facturi" al hub-ului Plăți & Facturi (D-01): grupează `plati-scadente`,
 * `gestiune-facturi` și `facturi-fara-prezenta` sub aceeași identitate de tab, cu props
 * IDENTICE celor transmise azi de `AppRouter.tsx` (harta verificată în 31-01). Montează
 * suplimentar `FacturaDetaliu` (31-03) pentru butonul „Detalii” (D-08) expus de
 * PlatiScadente/GestiuneFacturi via `onDeschideDetalii`.
 */
export interface TabFacturiProps extends PlatiHubTabProps {
  onIncaseazaMultiple: (plati: Plata[]) => void;
  initialSportivId?: string;
}

export const TabFacturi: React.FC<TabFacturiProps> = ({
  sectiune,
  currentUser,
  permissions,
  onViewSportiv,
  onBack,
  onIncaseazaMultiple,
  initialSportivId,
}) => {
  const { filteredData, setPlati, setTranzactii, tipuriPlati } = useData();

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
      <FacturaDetaliu plataId={plataDetaliuId} onClose={() => setPlataDetaliuId(null)} />
    </>
  );
};
