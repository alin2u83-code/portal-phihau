/**
 * TipuriCompetitieAdmin — wrapper peste TipuriNomenclatorAdmin
 * pentru gestionarea tipurilor de competiție.
 */
import React from 'react';
import { Permissions } from '../types';
import { TipuriNomenclatorAdmin } from './TipuriNomenclatorAdmin';

interface Props {
  permissions: Permissions;
}

export const TipuriCompetitieAdmin: React.FC<Props> = ({ permissions }) => (
  <TipuriNomenclatorAdmin
    permissions={permissions}
    tableName="tipuri_competitie"
    title="Denumiri tipuri competitie"
  />
);
