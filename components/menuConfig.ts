import React from 'react';
import { View, Rol } from '../types';
import { HomeIcon, UsersIcon, TrophyIcon, ClipboardDocumentListIcon, BanknotesIcon, CalendarDaysIcon, UserCircleIcon, CogIcon, AcademicCapIcon, WrenchScrewdriverIcon } from './icons';

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
        label: 'Gestiune Club', 
        icon: UsersIcon,
        submenu: [
             { label: 'Sportivi', view: 'sportivi' },
             { label: 'Grupe', view: 'grupe' }, 
             { label: 'Familii', view: 'familii', roles: ['Admin', 'Instructor'] },
             { label: 'Utilizatori', view: 'user-management', roles: ['Admin'] }
        ]
    },
    { label: 'Antrenamente', icon: ClipboardDocumentListIcon, view: 'prezenta' },
    { label: 'Examene', icon: AcademicCapIcon, view: 'examene' },
    { label: 'Grade', icon: TrophyIcon, view: 'grade' },
    { 
        label: 'Evenimente', 
        icon: CalendarDaysIcon, 
        submenu: [
             { view: 'stagii', label: 'Stagii' },
             { view: 'competitii', label: 'Competiții' }
        ] 
    },
    { 
        label: 'Financiar', 
        icon: BanknotesIcon, 
        submenu: [ 
            { view: 'plati-scadente', label: 'Facturi' }, 
            { view: 'jurnal-incasari', label: 'Încasări' }, 
            { view: 'raport-financiar', label: 'Raport' }, 
        ] 
    },
     { 
        label: 'Configurări', 
        icon: CogIcon, 
        roles: ['Admin'],
        submenu: [ 
             { view: 'tipuri-abonament', label: 'Abonamente' }, 
             { view: 'configurare-preturi', label: 'Prețuri' } 
        ] 
    },
    { label: 'Mentenanță', icon: WrenchScrewdriverIcon, view: 'maintenance', roles: ['Admin'] },
];

export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'dashboard' },
    { label: 'Evenimentele Mele', icon: CalendarDaysIcon, view: 'evenimentele-mele' },
    { label: 'Profilul Meu', icon: UserCircleIcon, view: 'editare-profil-personal' },
];