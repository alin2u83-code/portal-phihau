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
    HelpCircleIcon
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
        title: 'PRINCIPAL',
        items: [
            { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
        ]
    },
    {
        title: 'ACTIVITATE',
        items: [
             { label: 'Antrenamente', icon: ClipboardCheckIcon, view: 'prezenta' },
        ]
    },
    {
        title: 'MANAGEMENT',
        items: [
            { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
            { label: 'Grupe & Orar', icon: UsersIcon, view: 'grupe' },
            { label: 'Familii', icon: BuildingIcon, view: 'familii' }
        ]
    },
    {
        title: 'TEHNIC & EVALUĂRI',
        items: [
            { label: 'Examene & Sesiuni', icon: AcademicCapIcon, view: 'examene' },
            { label: 'Nomenclator Grade', icon: TrophyIcon, view: 'grade' },
        ]
    },
    {
        title: 'EVENIMENTE EXTERNE',
        items: [
            { label: 'Stagii', icon: CalendarDaysIcon, view: 'stagii' },
            { label: 'Competiții', icon: TrophyIcon, view: 'competitii' },
        ]
    },
    {
        title: 'FINANCIAR',
        items: [
            { label: 'Facturi & Plăți', icon: BanknotesIcon, view: 'plati-scadente' },
            { label: 'Jurnal Încasări', icon: BanknotesIcon, view: 'jurnal-incasari' },
            { label: 'Raport Financiar', icon: BanknotesIcon, view: 'raport-financiar', roles: ['Admin'] },
        ]
    },
    {
        title: 'SISTEM',
        items: [
            { label: 'Config. Abonamente', icon: CogIcon, view: 'tipuri-abonament', roles: ['Admin'] },
            { label: 'Config. Prețuri', icon: CogIcon, view: 'configurare-preturi', roles: ['Admin'] },
            { label: 'Utilizatori & Roluri', icon: ShieldCheckIcon, view: 'user-management', roles: ['Admin'] },
            { label: 'Mentenanță & Audit', icon: WrenchScrewdriverIcon, view: 'maintenance', roles: ['Admin'] },
        ]
    }
];

export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'dashboard' },
    { label: 'Evenimentele Mele', icon: CalendarDaysIcon, view: 'evenimentele-mele' },
    { label: 'Profilul Meu', icon: UserCircleIcon, view: 'editare-profil-personal' },
];