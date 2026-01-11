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
             { label: 'Listă Sportivi', view: 'sportivi' },
             { label: 'Gestiune Familii', view: 'familii', roles: ['Admin', 'Instructor'] },
             { label: 'Acces Utilizatori', view: 'user-management', roles: ['Admin'] }
        ]
    },
    {
        label: 'Activități',
        icon: TrophyIcon,
        submenu: [
             { view: 'examene', label: 'Configurare Examene' },
             { view: 'grade', label: 'Nomenclator Grade' },
             { view: 'stagii', label: 'Listă Stagii' },
             { view: 'competitii', label: 'Listă Competiții' }
        ]
    },
    { 
        label: 'Antrenamente', 
        icon: ClipboardDocumentListIcon, 
        submenu: [ 
            { view: 'prezenta', label: 'Orar & Prezență' }, 
            { view: 'grupe', label: 'Gestiune Grupe' }, 
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
             { view: 'tipuri-abonament', label: 'Configurare Abonamente' }, 
             { view: 'configurare-preturi', label: 'Configurare Alte Prețuri' } 
        ] 
    },
];

export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'dashboard' },
    { label: 'Evenimentele Mele', icon: CalendarDaysIcon, view: 'evenimentele-mele' },
    { label: 'Profil & Securitate', icon: UserCircleIcon, view: 'editare-profil-personal' },
];