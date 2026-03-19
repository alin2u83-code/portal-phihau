import React from 'react';
import { Permissions } from '../types';
import { CompetitiiManagement as CompetitiiManagementNew } from './Competitii';

interface CompetitiiManagementProps { onBack: () => void; permissions: Permissions; }
export const CompetitiiManagement: React.FC<CompetitiiManagementProps> = ({ onBack, permissions }) => (
    <CompetitiiManagementNew onBack={onBack} permissions={permissions} />
);
