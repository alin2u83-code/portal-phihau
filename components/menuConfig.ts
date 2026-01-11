import React from 'react';
import { View, Rol } from '../types';
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
    ClipboardCheckIcon,
    BuildingIcon,
    HelpCircleIcon,
    ActivityIcon
} from './icons';

export interface MenuItem {
    label: string;
    icon: React.ElementType;
    view: View;
    roles?: Rol['nume'][];
}

export interface MenuGroup {
    title: string;
    items: MenuItem[];
}

export const adminMenu: MenuGroup[] = [
    {
        title: '',
        items: [
            { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
        ]
    },
    {
        title: 'OPERATIV',
        items: [
             { label: 'Antrenamente & Prezență', icon: ActivityIcon, view: 'prezenta' },
        ]
    },
    {
        title: 'EVOLUȚIE',
        items: [
            { label: 'Examene & Înscrieri', icon: AcademicCapIcon, view: 'examene' },
            { label: 'Grade & Tarife', icon: TrophyIcon, view: 'grade' },
        ]
    },
    {
        title: 'ADMIN',
        items: [
            { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
            { label: 'Grupe', icon: UsersIcon, view: 'grupe' },
            { label: 'Familii', icon: BuildingIcon, view: 'familii' }
        ]
    },
    {
        title: 'FINANCIAR',
        items: [
            { label: 'Facturi & Plăți', icon: BanknotesIcon, view: 'plati-scadente' },
            { label: 'Configurare Prețuri', icon: CogIcon, view: 'configurare-preturi', roles: ['Admin'] },
        ]
    },
    {
        title: 'SISTEM',
        items: [
            { label: 'Mentenanță & Audit', icon: WrenchScrewdriverIcon, view: 'maintenance', roles: ['Admin'] },
        ]
    }
];

export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'dashboard' },
    { label: 'Evenimentele Mele', icon: CalendarDaysIcon, view: 'evenimentele-mele' },
    { label: 'Profilul Meu', icon: UserCircleIcon, view: 'editare-profil-personal' },
];