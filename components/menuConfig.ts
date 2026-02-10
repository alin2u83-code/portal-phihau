import React from 'react';
import { View } from '../types';
import { 
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon, 
    UserCircleIcon, ClipboardCheckIcon, CogIcon, SitemapIcon, WalletIcon, FileTextIcon
} from './icons';

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

// Meniu unificat pentru SUPER_ADMIN_FEDERATIE și Admin Club
export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { 
        label: 'Sportivi', 
        icon: UsersIcon,
        view: 'sportivi'
    },
    { 
        label: 'Antrenamente', 
        icon: CalendarDaysIcon,
        view: 'prezenta' // Link direct către managementul prezenței
    },
    { 
        label: 'Examene', 
        icon: TrophyIcon, 
        view: 'examene'
    },
    { 
        label: 'Facturi', 
        icon: BanknotesIcon,
        view: 'plati-scadente' // Link direct către lista de facturi
    },
    { label: 'Gestiune Cluburi', icon: CogIcon, view: 'cluburi' },
    { label: 'Structură Națională', icon: SitemapIcon, view: 'structura-federatie' },
    { label: 'Deconturi Globale', icon: WalletIcon, view: 'deconturi-federatie' },
];

export const instructorMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
    { label: 'Prezență', icon: ClipboardCheckIcon, view: 'prezenta-instructor' },
    { label: 'Examene', icon: TrophyIcon, view: 'examene' },
];

export const sportivMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'my-portal' },
    { label: 'Istoric Prezență', icon: ClipboardCheckIcon, view: 'istoric-prezenta' },
    { label: 'Istoric Plăți', icon: BanknotesIcon, view: 'istoric-plati' },
    { label: 'Fișa Digitală', icon: FileTextIcon, view: 'fisa-digitala' },
    { label: 'Fișa de Competiție', icon: TrophyIcon, view: 'fisa-competitie' },
    { label: 'Setări Cont', icon: CogIcon, view: 'account-settings' },
];
