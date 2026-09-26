import React from 'react';
import type { Plata } from '../../../types';
import { useData } from '../../../contexts/DataContext';
import * as Lazy from '../../LazyComponents';
import type { PlatiHubTabProps } from './platiHubConfig';

/**
 * Tab-ul "Încasări" al hub-ului Plăți & Facturi (D-02): grupează `jurnal-incasari` și
 * `istoric-plati` sub aceeași identitate de tab, cu props IDENTICE celor transmise azi de
 * `AppRouter.tsx` (harta verificată în 31-01).
 *
 * ATENȚIE: `JurnalIncasari` apelează `onBack` AUTOMAT la 1500 ms după orice încasare
 * reușită (JurnalIncasari.tsx:494) — nu doar la click pe butonul "Înapoi" (care e ascuns
 * aici prin `hideBackButton`). De aceea acest tab NU transmite `onBack`-ul generic al
 * hub-ului către Jurnal, ci un callback dedicat `onJurnalBack` (oglinda
 * `handleJurnalBack` din AppRouter.tsx:78-85, implementată de PlatiHub în 31-08).
 */
export interface TabIncasariProps extends PlatiHubTabProps {
  /** Facturile preselectate din tab-ul Facturi (F1) — state App.tsx:50, trecut prin AppRouter → PlatiHub. */
  platiPentruIncasare: Plata[];
  /** Golește selecția după o încasare procesată (oglinda AppRouter.tsx:87-89). */
  onIncasareProcesata: () => void;
  /** Golește selecția și navighează înapoi (oglinda handleJurnalBack, AppRouter.tsx:78-85). */
  onJurnalBack: () => void;
}

export const TabIncasari: React.FC<TabIncasariProps> = ({
  sectiune,
  currentUser,
  permissions,
  onViewSportiv,
  onBack,
  platiPentruIncasare,
  onIncasareProcesata,
  onJurnalBack,
}) => {
  const { filteredData, setPlati, setTranzactii, preturiConfig, tipuriPlati, setTipuriPlati, reduceri } = useData();

  return (
    <>
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
      {sectiune === 'istoric-plati' && (
        <Lazy.IstoricPlati
          onBack={onBack}
          viewedUser={currentUser}
          plati={filteredData.plati}
          tranzactii={filteredData.tranzactii}
          hideBackButton
        />
      )}
    </>
  );
};
