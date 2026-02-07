import React from 'react';
import { View, Permissions } from '../types';
import { Home, Users, Trophy, CreditCard, Calendar, Settings } from 'lucide-react';

export interface SubMenuItem {
    label: string;
    view: View;
    permission?: (p: Permissions) => boolean;
}

export interface MenuItem {
    label: string;
    icon: React.ElementType;
    view?: View;
    submenu?: SubMenuItem[];
    permission?: (p: Permissions) => boolean;
}

export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: Home, view: 'dashboard', permission: (p) => p.hasAdminAccess },
    { 
        label: 'Membri', 
        icon: Users,
        view: 'sportivi',
        permission: (p) => p.hasAdminAccess,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi', permission: (p) => p.hasAdminAccess },
             { label: 'Management Familii', view: 'familii', permission: (p) => p.isAdminClub || p.isFederationAdmin },
             { label: 'Gestiune Staff', view: 'user-management', permission: (p) => p.isAdminClub || p.isFederationAdmin }
        ]
    },
    {
        label: 'Evenimente',
        icon: Trophy,
        view: 'examene',
        permission: (p) => p.hasAdminAccess,
        submenu: [
             { view: 'examene', label: 'Sesiuni Examen' },
             { view: 'stagii', label: 'Stagii & Competiții' },
             { view: 'rapoarte-examen', label: 'Rapoarte' },
        ]
    },
    { 
        label: 'Financiar', 
        icon: CreditCard,
        view: 'plati-scadente',
        permission: (p) => p.canManageFinances,
        submenu: [ 
            { view: 'plati-scadente', label: 'Listă Facturi' }, 
            { view: 'jurnal-incasari', label: 'Jurnal Încasări' },
            { view: 'raport-financiar', label: 'Raport Încasări' },
        ] 
    },
    {
        label: 'Calendar',
        icon: Calendar,
        view: 'calendar',
        permission: (p) => p.hasAdminAccess,
    },
    {
        label: 'Setări',
        icon: Settings,
        permission: (p) => p.isAdminClub || p.isFederationAdmin,
        submenu: [
            { label: 'Config. Abonamente', view: 'tipuri-abonament' }, 
            { label: 'Config. Taxe', view: 'configurare-preturi' },
            { label: 'Nomenclator Grade', view: 'grade' },
        ]
    }
];

export const sportivMenu: MenuItem[] = [
    // This menu is not currently used as SportivDashboard has its own navigation
];
