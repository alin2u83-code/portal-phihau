import React from 'react';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';
import { Permissions } from '../types';

interface StagiiManagementProps { onBack: () => void; permissions: Permissions; }
export const StagiiManagement: React.FC<StagiiManagementProps> = ({ onBack, permissions }) => (
    <StagiiCompetitiiManagement type="Stagiu" onBack={onBack} permissions={permissions} />
);
