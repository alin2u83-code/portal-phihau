import React from 'react';
import { View } from '../types';
import { 
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon, 
    UserCircleIcon, ClipboardCheckIcon, CogIcon, SitemapIcon, ArchiveBoxIcon, FileTextIcon
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

// Meniu complet pentru Adminii de Federație și de Club
export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
    { label: 'Examene', icon: TrophyIcon, view: 'examene' },
    { label: 'Grupe', icon: ArchiveBoxIcon, view: 'grupe' },
    { label: 'Plăți', icon: BanknotesIcon, view: 'plati-scadente' },
    { label: 'Prezență', icon: CalendarDaysIcon, view: 'prezenta' },
    { label: 'Administrare', icon: CogIcon, view: 'user-management' },
    { label: 'Setări Globale', icon: CogIcon, view: 'setari-club' },
    { label: 'Structură Federație', icon: SitemapIcon, view: 'structura-federatie' },
];

// Meniu pentru Instructori
export const instructorMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
    { label: 'Prezență', icon: ClipboardCheckIcon, view: 'prezenta-instructor' },
    { label: 'Examene', icon: TrophyIcon, view: 'examene' },
];

// Meniu pentru Sportivi
export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'my-portal' },
    { label: 'Istoric Prezență', icon: ClipboardCheckIcon, view: 'istoric-prezenta' },
    { label: 'Istoric Plăți', icon: BanknotesIcon, view: 'istoric-plati' },
    { label: 'Fișa Digitală', icon: FileTextIcon, view: 'fisa-digitala' },
    { label: 'Fișa de Competiție', icon: TrophyIcon, view: 'fisa-competitie' },
    { label: 'Setări Cont', icon: CogIcon, view: 'account-settings' },
];
