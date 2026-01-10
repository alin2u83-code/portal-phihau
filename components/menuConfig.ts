import React from 'react';
import { View, Rol } from '../types';
import { HomeIcon, UsersIcon, TrophyIcon, ClipboardDocumentListIcon, BanknotesIcon, CalendarDaysIcon, UserCircleIcon, CogIcon } from './icons';

export interface MenuItem {
    label: string;
    icon: React.ElementType;
    view?: View;
    roles?: Rol['nume'][];
    submenu?: SubMenuItem[];
}

export interface SubMenuItem {
    label: string;
    view: View;
    roles?: Rol['nume'][];
}

export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { 
        label: 'Sportivi & Utilizatori', 
        icon: UsersIcon,
        submenu: [
            { view: 'sportivi', label: 'Listă Sportivi' },
            { view: 'sportivi', label: 'Gestiune Familii' },
            { view: 'sportivi', label: 'Management Acces' },
        ]
    },
    {
        label: 'Activități Club',
        icon: TrophyIcon,
        submenu: [
            { view: 'activitati', label: 'Antrenamente' },
            { view: 'activitati', label: 'Examene' },
            { view: 'activitati', label: 'Stagii & Competiții' },
            { view: 'activitati', label: 'Grade Qwan Ki Do' },
        ]
    },
    { 
        label: 'Financiar', 
        icon: BanknotesIcon, 
        submenu: [ 
            { view: 'plati-scadente', label: 'Facturi' }, 
            { view: 'jurnal-incasari', label: 'Jurnal Încasări' }, 
            { view: 'raport-financiar', label: 'Raport Financiar' }, 
        ] 
    },
     { 
        label: 'Configurări', 
        icon: CogIcon, 
        submenu: [ 
             { view: 'tipuri-abonament', label: 'Config. Abonamente' }, 
             { view: 'configurare-preturi', label: 'Config. Prețuri' },
             { view: 'raport-prezenta', label: 'Raport Prezențe' }
        ] 
    },
];

export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'dashboard' },
    { label: 'Evenimentele Mele', icon: CalendarDaysIcon, view: 'evenimentele-mele' },
    { label: 'Profil & Securitate', icon: UserCircleIcon, view: 'editare-profil-personal' },
];