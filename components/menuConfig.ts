import React from 'react';
import { View } from '../types';
import { HomeIcon, UsersIcon, TrophyIcon, ClipboardDocumentListIcon, BanknotesIcon, CalendarDaysIcon, UserCircleIcon, ShieldCheckIcon, ClipboardCheckIcon, ArchiveBoxIcon, CogIcon } from './icons';

export interface MenuItem {
    label: string;
    icon: React.ElementType;
    view?: View;
    submenu?: SubMenuItem[];
}

export interface SubMenuItem {
    label: string;
    view: View;
}

export const federationAdminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { 
        label: 'Gestiune Membri', 
        icon: UsersIcon,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi' },
             { label: 'Gestiune Familii', view: 'familii' },
             { label: 'Administrare Staff', view: 'user-management' }
        ]
    },
    {
        label: 'Activitate Sală',
        icon: ClipboardCheckIcon,
        submenu: [
            { label: 'Orar & Gestiune Grupe', view: 'grupe' },
            { label: 'Generator Program', view: 'activitati' },
            { label: 'Înregistrare Prezențe', view: 'prezenta' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' } 
        ]
    },
    {
        label: 'Evenimente & Examene',
        icon: TrophyIcon,
        submenu: [
             { view: 'examene', label: 'Sesiuni Examene' },
             { view: 'stagii', label: 'Stagii & Competiții' },
             { view: 'rapoarte-examen', label: 'Rapoarte Examen' },
        ]
    },
    { 
        label: 'Financiar', 
        icon: BanknotesIcon, 
        submenu: [ 
            { view: 'financial-dashboard', label: 'Dashboard Financiar' },
            { view: 'plati-scadente', label: 'Listă Facturi' }, 
            { view: 'jurnal-incasari', label: 'Jurnal Încasări' },
            { view: 'deconturi-federatie', label: 'Deconturi Federație' },
        ] 
    },
    {
        label: 'Setări & Nomenclatoare',
        icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Config. Abonamente', view: 'tipuri-abonament' }, 
            { label: 'Config. Taxe Examen', view: 'configurare-preturi' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Politici Reducere', view: 'reduceri' },
            { label: 'Categorii Plăți', view: 'nomenclatoare' },
            { label: 'Management Cluburi', view: 'cluburi' },
            { label: 'Trimite Notificări', view: 'notificari' },
            { label: 'Mentenanță Date', view: 'data-maintenance' },
        ]
    }
];

export const clubAdminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { 
        label: 'Gestiune Membri', 
        icon: UsersIcon,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi' },
             { label: 'Gestiune Familii', view: 'familii' },
             { label: 'Administrare Staff', view: 'user-management' }
        ]
    },
    {
        label: 'Activitate Sală',
        icon: ClipboardCheckIcon,
        submenu: [
            { label: 'Orar & Gestiune Grupe', view: 'grupe' },
            { label: 'Generator Program', view: 'activitati' },
            { label: 'Înregistrare Prezențe', view: 'prezenta' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' } 
        ]
    },
    {
        label: 'Evenimente & Examene',
        icon: TrophyIcon,
        submenu: [
             { view: 'examene', label: 'Sesiuni Examene' },
             { view: 'stagii', label: 'Stagii & Competiții' },
             { view: 'rapoarte-examen', label: 'Rapoarte Examen' },
        ]
    },
    { 
        label: 'Financiar Club', 
        icon: BanknotesIcon, 
        submenu: [ 
            { view: 'financial-dashboard', label: 'Dashboard Financiar' },
            { view: 'plati-scadente', label: 'Listă Facturi' }, 
            { view: 'jurnal-incasari', label: 'Jurnal Încasări' },
            { view: 'deconturi-federatie', label: 'Deconturi Federație' },
        ] 
    },
    {
        label: 'Setări Club',
        icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Config. Abonamente', view: 'tipuri-abonament' }, 
            { label: 'Config. Taxe Examen', view: 'configurare-preturi' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Politici Reducere', view: 'reduceri' },
            { label: 'Categorii Plăți', view: 'nomenclatoare' },
        ]
    }
];

export const instructorMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { 
        label: 'Gestiune Membri', 
        icon: UsersIcon,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi' },
             { label: 'Gestiune Familii', view: 'familii' },
        ]
    },
    {
        label: 'Activitate Sală',
        icon: ClipboardCheckIcon,
        submenu: [
            { label: 'Orar & Gestiune Grupe', view: 'grupe' },
            { label: 'Generator Program', view: 'activitati' },
            { label: 'Înregistrare Prezențe', view: 'prezenta' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' } 
        ]
    },
    {
        label: 'Evenimente & Examene',
        icon: TrophyIcon,
        submenu: [
             { view: 'examene', label: 'Sesiuni Examene' },
             { view: 'stagii', label: 'Stagii & Competiții' },
             { view: 'rapoarte-examen', label: 'Rapoarte Examen' },
        ]
    },
];

export const sportivMenu: MenuItem[] = [
    { 
        label: 'Pagina Mea', 
        icon: UserCircleIcon, 
        submenu: [
            { label: 'Dashboard', view: 'my-portal' },
            { label: 'Evenimentele Mele', view: 'evenimentele-mele' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
];