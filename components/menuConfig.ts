import React from 'react';
import { View, Rol, MenuItem } from '../types';
import { 
    HomeIcon, 
    UsersIcon, 
    TrophyIcon, 
    BanknotesIcon, 
    CalendarDaysIcon, 
    UserCircleIcon, 
    CogIcon, 
    AcademicCapIcon, 
    WrenchScrewdriverIcon,
    ShieldCheckIcon,
    ClipboardDocumentListIcon,
    BuildingIcon,
    ActivityIcon
} from './icons';

export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    {
        label: 'Management',
        icon: BuildingIcon,
        submenu: [
            { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
            { label: 'Grupe & Orar', icon: UsersIcon, view: 'grupe' },
            { label: 'Familii', icon: BuildingIcon, view: 'familii' }
        ]
    },
    {
        label: 'Activități',
        icon: ActivityIcon,
        submenu: [
            { label: 'Antrenamente', icon: ActivityIcon, view: 'prezenta' },
            { label: 'Examene', icon: AcademicCapIcon, view: 'examene' },
            { label: 'Stagii & Competiții', icon: TrophyIcon, view: 'stagii' },
        ]
    },
    {
        label: 'Financiar',
        icon: BanknotesIcon,
        submenu: [
            { label: 'Facturare & Datorii', icon: BanknotesIcon, view: 'plati-scadente' },
            { label: 'Raport Financiar', icon: ClipboardDocumentListIcon, view: 'raport-financiar' },
        ]

    },
    {
        label: 'Configurări',
        icon: CogIcon,
        submenu: [
            { label: 'Grade & Tarife', icon: TrophyIcon, view: 'grade' },
            { label: 'Tipuri Abonament', icon: BanknotesIcon, view: 'tipuri-abonament' },
            { label: 'Nomenclator Prețuri', icon: WrenchScrewdriverIcon, view: 'configurare-preturi' },
            { label: 'Utilizatori & Roluri', icon: ShieldCheckIcon, view: 'user-management', roles: ['Admin'] },
            { label: 'Mentenanță Sistem', icon: WrenchScrewdriverIcon, view: 'maintenance', roles: ['Admin'] },
        ]
    }
];

export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'dashboard' },
    { label: 'Evenimentele Mele', icon: CalendarDaysIcon, view: 'evenimentele-mele' },
    { label: 'Profilul Meu', icon: UserCircleIcon, view: 'editare-profil-personal' },
];