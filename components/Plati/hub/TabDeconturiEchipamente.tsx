import React from 'react';
import { useData } from '../../../contexts/DataContext';
import * as Lazy from '../../LazyComponents';
import type { PlatiHubTabProps } from './platiHubConfig';

/**
 * Tab-urile "Deconturi Federație", "Vacanțe Antrenamente", "Echipamente" și "Vânzări" ale
 * hub-ului Plăți & Facturi, adăugate prin UAT-3 (faza 34). Props IDENTICE celor transmise
 * înainte de `AppRouter.tsx` către aceleași componente.
 *
 * Garda (`canManageFinances` == fostul `isAtLeastClubAdmin`) e aplicată de AppRouter;
 * vizibilitatea Echipamente/Vânzări doar pe ADMIN_CLUB o fac PlatiHub + rezolvaPozitieHub.
 */
export const TabDeconturiEchipamente: React.FC<PlatiHubTabProps> = ({
  sectiune,
  currentUser,
  permissions,
  onBack,
}) => {
  const { filteredData, setDeconturiFederatie, decontSportivi, clubs } = useData();

  if (sectiune === 'deconturi-federatie') {
    return (
      <Lazy.FederationInvoices
        onBack={onBack}
        deconturi={filteredData.deconturiFederatie}
        setDeconturi={setDeconturiFederatie}
        decontSportivi={decontSportivi}
        currentUser={currentUser}
        permissions={permissions}
        sportivi={filteredData.sportivi}
        plati={filteredData.plati}
        clubs={clubs}
      />
    );
  }

  if (sectiune === 'perioade-vacanta') {
    return <Lazy.PerioadaVacantaView onBack={onBack} hideBackButton />;
  }

  if (sectiune === 'produse') {
    return (
      <Lazy.ProduseManagement
        currentUser={currentUser}
        permissions={permissions}
        onBack={onBack}
        hideBackButton
        initialTab="catalog"
      />
    );
  }

  if (sectiune === 'vanzari-produse') {
    return (
      <Lazy.ProduseManagement
        currentUser={currentUser}
        permissions={permissions}
        onBack={onBack}
        hideBackButton
        initialTab="vanzari"
      />
    );
  }

  return null;
};
