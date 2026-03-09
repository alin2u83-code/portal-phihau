import React from 'react';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';
import { Permissions } from '../types';

interface CompetitiiManagementProps { onBack: () => void; permissions: Permissions; }
export const CompetitiiManagement: React.FC<CompetitiiManagementProps> = ({ onBack, permissions }) => (
    <StagiiCompetitiiManagement type="Competitie" onBack={onBack} permissions={permissions} />
);
