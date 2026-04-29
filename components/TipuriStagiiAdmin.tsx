/**
 * TipuriStagiiAdmin — wrapper peste TipuriNomenclatorAdmin
 * pentru gestionarea tipurilor de stagiu.
 */
import React from 'react';
import { Permissions } from '../types';
import { TipuriNomenclatorAdmin } from './TipuriNomenclatorAdmin';

interface Props {
  permissions: Permissions;
}

export const TipuriStagiiAdmin: React.FC<Props> = ({ permissions }) => (
  <TipuriNomenclatorAdmin
    permissions={permissions}
    tableName="tipuri_stagii"
    title="Denumiri tipuri stagiu"
  />
);
