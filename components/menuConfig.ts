import React from 'react';
import { View } from '../types';
import { 
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon, 
    UserCircleIcon, ClipboardCheckIcon, CogIcon, SitemapIcon, ArchiveBoxIcon, FileTextIcon, ChartBarIcon
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
    { label: 'Import Sportivi', icon: UsersIcon, view: 'import-sportivi' },
    { label: 'Legitimații', icon: FileTextIcon, view: 'legitimatii' },
    { label: 'Stagii', icon: TrophyIcon, view: 'stagii' },
    { label: 'Competiții', icon: TrophyIcon, view: 'competitii' },
    { label: 'Examene', icon: TrophyIcon, view: 'examene' },
    { label: 'Grupe', icon: ArchiveBoxIcon, view: 'grupe' },
    { label: 'Plăți', icon: BanknotesIcon, view: 'plati-scadente' },
    { label: 'Taxe Anuale', icon: BanknotesIcon, view: 'taxe-anuale' },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Raport Financiar', icon: ChartBarIcon, view: 'raport-financiar' },
    { label: 'Prezență', icon: CalendarDaysIcon, view: 'prezenta' },
    { label: 'Administrare', icon: CogIcon, view: 'user-management' },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'Mentenanță Date', icon: ArchiveBoxIcon, view: 'data-maintenance' },
    { label: 'Setări Globale', icon: CogIcon, view: 'setari-club' },
    { label: 'Structură Federație', icon: SitemapIcon, view: 'structura-federatie' },
    { label: 'Setări Cont', icon: CogIcon, view: 'account-settings' },
];

// Meniu pentru Instructori
export const instructorMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
    { label: 'Stagii', icon: TrophyIcon, view: 'stagii' },
    { label: 'Competiții', icon: TrophyIcon, view: 'competitii' },
    { label: 'Prezență', icon: ClipboardCheckIcon, view: 'prezenta-instructor' },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'Examene', icon: TrophyIcon, view: 'examene' },
    { label: 'Setări Cont', icon: CogIcon, view: 'account-settings' },
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
