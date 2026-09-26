import React from 'react';
import { useData } from '../../../contexts/DataContext';
import * as Lazy from '../../LazyComponents';
import type { PlatiHubTabProps } from './platiHubConfig';

/**
 * Tab-ul "Rapoarte" al hub-ului Plăți & Facturi (D-03): grupează `raport-financiar` și
 * `financial-dashboard` sub aceeași identitate de tab, cu props IDENTICE celor transmise
 * azi de `AppRouter.tsx` (harta verificată în 31-01).
 *
 * `RaportFinanciar` nu randează niciun buton de întoarcere (prop-ul `onBack` e declarat
 * dar nefolosit — verificat la planificare), deci NU primește `hideBackButton`.
 */
export const TabRapoarte: React.FC<PlatiHubTabProps> = ({ sectiune, onViewSportiv, onBack }) => {
  const { filteredData, setPlati, setTranzactii } = useData();

  return (
    <>
      {sectiune === 'raport-financiar' && (
        <Lazy.RaportFinanciar
          onBack={onBack}
          istoricPlatiDetaliat={filteredData.istoricPlatiDetaliat}
          sportivi={filteredData.sportivi}
          familii={filteredData.familii}
          plati={filteredData.plati}
          setPlati={setPlati}
          setTranzactii={setTranzactii}
          onViewSportiv={onViewSportiv}
        />
      )}
      {sectiune === 'financial-dashboard' && (
        <Lazy.FinancialDashboard
          onBack={onBack}
          plati={filteredData.plati}
          tranzactii={filteredData.tranzactii}
          sportivi={filteredData.sportivi}
          familii={filteredData.familii}
          hideBackButton
        />
      )}
    </>
  );
};
