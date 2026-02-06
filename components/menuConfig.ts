import React from 'react';
import { View, Permissions } from '../types';
import { HomeIcon, UsersIcon, TrophyIcon, ClipboardDocumentListIcon, BanknotesIcon, CalendarDaysIcon, UserCircleIcon, ShieldCheckIcon, ClipboardCheckIcon, ArchiveBoxIcon, CogIcon, BellIcon, WalletIcon, UserPlusIcon, BookOpenIcon, ChartBarIcon, BookMarkedIcon, FileTextIcon, SitemapIcon } from './icons';

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
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard', permission: (p) => p.hasAdminAccess },
    { 
        label: 'Gestiune Membri', 
        icon: UsersIcon,
        permission: (p) => p.hasAdminAccess,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi', permission: (p) => p.hasAdminAccess },
             { label: 'Gestiune Familii', view: 'familii', permission: (p) => p.hasAdminAccess },
             { label: 'Administrare Staff', view: 'user-management', permission: (p) => p.isAdminClub || p.isFederationAdmin }
        ]
    },
    {
        label: 'Activitate Sală',
        icon: ClipboardCheckIcon,
        permission: (p) => p.hasAdminAccess,
        submenu: [
            { label: 'Orar & Gestiune Grupe', view: 'grupe', permission: (p) => p.hasAdminAccess },
            { label: 'Generator Program', view: 'activitati', permission: (p) => p.hasAdminAccess },
            { label: 'Prezență Instructor', view: 'prezenta-instructor', permission: (p) => p.hasAdminAccess },
            { label: 'Raport Prezențe', view: 'raport-prezenta', permission: (p) => p.hasAdminAccess },
            { label: 'Raport Lunar Prezențe', view: 'raport-lunar-prezenta', permission: (p) => p.hasAdminAccess },
            { label: 'Raport Activitate', view: 'raport-activitate', permission: (p) => p.hasAdminAccess }
        ]
    },
    {
        label: 'Evenimente & Examene',
        icon: TrophyIcon,
        permission: (p) => p.hasAdminAccess,
        submenu: [
             { view: 'examene', label: 'Sesiuni Examene', permission: (p) => p.hasAdminAccess },
             { view: 'stagii', label: 'Stagii & Competiții', permission: (p) => p.hasAdminAccess },
             { view: 'rapoarte-examen', label: 'Rapoarte Examen', permission: (p) => p.hasAdminAccess },
        ]
    },
    { 
        label: 'Financiar', 
        icon: BanknotesIcon,
        permission: (p) => p.canManageFinances,
        submenu: [ 
            { view: 'financial-dashboard', label: 'Dashboard Financiar', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { view: 'gestiune-facturi', label: 'Adaugă Factură Manuală', permission: (p) => p.canManageFinances },
            { view: 'plati-scadente', label: 'Listă Facturi', permission: (p) => p.canManageFinances }, 
            { view: 'jurnal-incasari', label: 'Jurnal Încasări', permission: (p) => p.canManageFinances },
            { view: 'raport-financiar', label: 'Raport Încasări', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { view: 'deconturi-federatie', label: 'Deconturi Federație', permission: (p) => p.isAdminClub || p.isFederationAdmin },
        ] 
    },
    {
        label: 'Setări & Nomenclatoare',
        icon: CogIcon,
        permission: (p) => p.isAdminClub || p.isFederationAdmin,
        submenu: [
            { label: 'Setări Club', view: 'setari-club', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { label: 'Config. Abonamente', view: 'tipuri-abonament', permission: (p) => p.isAdminClub || p.isFederationAdmin }, 
            { label: 'Config. Taxe Examen', view: 'configurare-preturi', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { label: 'Config. Taxe Anuale', view: 'taxe-anuale', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { label: 'Nomenclator Grade', view: 'grade', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { label: 'Politici Reducere', view: 'reduceri', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { label: 'Categorii Plăți', view: 'nomenclatoare', permission: (p) => p.isAdminClub || p.isFederationAdmin },
            { label: 'Management Cluburi', view: 'cluburi', permission: (p) => p.isFederationAdmin },
            { label: 'Structură Națională', view: 'structura-federatie', permission: (p) => p.isFederationAdmin },
            { label: 'Trimite Notificări', view: 'notificari', permission: (p) => p.hasAdminAccess },
            { label: 'Mentenanță Date', view: 'data-maintenance', permission: (p) => p.isFederationAdmin },
        ]
    }
];

export const sportivMenu: MenuItem[] = [
    { 
        label: 'Portalul Meu', 
        icon: UserCircleIcon, 
        submenu: [
            { label: 'Dashboard', view: 'my-portal' },
            { label: 'Fișa Digitală', view: 'fisa-digitala' },
            { label: 'Fișa Competiție', view: 'fisa-competitie' },
            { label: 'Istoric Prezență', view: 'istoric-prezenta' },
            { label: 'Istoric Plăți', view: 'istoric-plati' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
];
