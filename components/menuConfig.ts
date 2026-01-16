import React from 'react';
import { View, Rol } from '../types';
import { HomeIcon, UsersIcon, TrophyIcon, ClipboardDocumentListIcon, BanknotesIcon, CalendarDaysIcon, ArchiveBoxIcon, UserCircleIcon, ChatBubbleLeftEllipsisIcon } from './icons';

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
        label: 'Sportivi', 
        icon: UsersIcon,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi' },
             { label: 'Gestiune Familii', view: 'familii', roles: ['Admin', 'Instructor'] },
             { label: 'Acces Utilizatori', view: 'user-management', roles: ['Admin'] }
        ]
    },
    {
        label: 'Evenimente',
        icon: TrophyIcon,
        submenu: [
             { view: 'examene', label: 'Examene & Înscrieri' },
             { view: 'stagii', label: 'Stagii' },
             { view: 'competitii', label: 'Competiții' },
             { view: 'grade', label: 'Nomenclator Grade' },
        ]
    },
    { 
        label: 'Antrenamente', 
        icon: ClipboardDocumentListIcon, 
        submenu: [ 
            { view: 'prezenta', label: 'Înregistrare Prezențe' }, 
            { view: 'grupe', label: 'Orar & Gestiune Grupe' }, 
            { view: 'activitati', label: 'Generator Program' },
            { view: 'raport-prezenta', label: 'Raport Prezențe' } 
        ] 
    },
    { 
        label: 'Administrativ', 
        icon: BanknotesIcon, 
        submenu: [ 
            { view: 'plati-scadente', label: 'Facturi & Plăți' }, 
            { view: 'jurnal-incasari', label: 'Jurnal Încasări' }, 
            { view: 'raport-financiar', label: 'Raport Financiar' },
            { view: 'tipuri-abonament', label: 'Config. Abonamente' }, 
            { view: 'configurare-preturi', label: 'Config. Prețuri' },
            { view: 'reduceri', label: 'Config. Reduceri' },
            { view: 'notificari', label: 'Trimite Anunțuri' }
        ] 
    },
    { 
        label: 'Mentenanță', 
        icon: ArchiveBoxIcon, 
        roles: ['Admin'],
        submenu: [
            { view: 'data-maintenance', label: 'Backup & Audit' },
            { view: 'data-inspector', label: 'Inspector Date (Debug)' }
        ]
    },
];

export const sportivMenu: MenuItem[] = [
    { 
        label: 'Pagina Mea', 
        icon: UserCircleIcon, 
        submenu: [
            { label: 'Panou Principal', view: 'dashboard' },
            { label: 'Situație Financiară', view: 'profil-sportiv' },
            { label: 'Evenimentele Mele', view: 'evenimentele-mele' },
        ]
    },
];