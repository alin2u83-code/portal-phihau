import React from 'react';
import { useData } from '../../../contexts/DataContext';
import * as Lazy from '../../LazyComponents';
import AccessDenied from '../../AccessDenied';
import type { PlatiHubTabProps } from './platiHubConfig';

/**
 * Tab-ul "Configurare" al hub-ului Plăți & Facturi (D-04): grupează `tipuri-abonament`,
 * `configurare-preturi`, `reduceri`, `taxe-anuale` și `nomenclatoare` sub aceeași
 * identitate de tab, cu props IDENTICE celor transmise azi de `AppRouter.tsx` (harta
 * verificată în 31-01).
 *
 * ATENȚIE: `plati` (GestionareNomenclatoare) și `reduceri` (ReduceriManagement) sunt
 * transmise NEFILTRAT — direct din `useData()`, NU din `filteredData` — paritate exactă
 * cu AppRouter.tsx:263, 265.
 *
 * Guard-ul Taxe Anuale (`permissions.isSuperAdmin || permissions.isAdminClub`,
 * AppRouter.tsx:271) e pastrat in interiorul tab-ului: `rezolvaPozitieHub` (31-01) face
 * deja fallback pe 'tipuri-abonament' cand `poateVedeaTaxeAnuale` e false, iar
 * `AccessDenied` e a doua linie de aparare daca sectiunea 'taxe-anuale' ajunge oricum aici.
 */
export const TabConfigurare: React.FC<PlatiHubTabProps> = ({
  sectiune,
  currentUser,
  permissions,
  activeRoleContext,
  onBack,
}) => {
  const {
    filteredData,
    setTipuriAbonament,
    clubs,
    grade,
    reduceri,
    setReduceri,
    tipuriPlati,
    setTipuriPlati,
    plati,
    setPlati,
  } = useData();

  const poateVedeaTaxeAnuale = permissions.isSuperAdmin || permissions.isAdminClub;

  return (
    <>
      {sectiune === 'tipuri-abonament' && (
        <Lazy.TipuriAbonamentManagement
          onBack={onBack}
          tipuriAbonament={filteredData.tipuriAbonament}
          setTipuriAbonament={setTipuriAbonament}
          currentUser={currentUser}
          clubs={clubs}
          activeRoleContext={activeRoleContext}
          permissions={permissions}
          hideBackButton
        />
      )}
      {sectiune === 'configurare-preturi' && (
        <Lazy.ConfigurarePreturi grade={grade} onBack={onBack} hideBackButton />
      )}
      {sectiune === 'reduceri' && (
        <Lazy.ReduceriManagement onBack={onBack} reduceri={reduceri} setReduceri={setReduceri} hideBackButton />
      )}
      {sectiune === 'taxe-anuale' && (
        poateVedeaTaxeAnuale ? (
          <Lazy.TaxeAnuale
            onBack={onBack}
            currentUser={currentUser}
            sportivi={filteredData.sportivi}
            plati={filteredData.plati}
            setPlati={setPlati}
            hideBackButton
          />
        ) : (
          <AccessDenied onBack={onBack} />
        )
      )}
      {sectiune === 'nomenclatoare' && (
        <Lazy.GestionareNomenclatoare
          onBack={onBack}
          tipuriPlati={tipuriPlati}
          setTipuriPlati={setTipuriPlati}
          plati={plati}
          hideBackButton
        />
      )}
    </>
  );
};
