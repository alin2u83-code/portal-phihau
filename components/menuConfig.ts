import React from 'react';
import { View } from '../types';
import {
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon,
    ClipboardCheckIcon, CogIcon, SitemapIcon, ArchiveBoxIcon, FileTextIcon,
    ChartBarIcon, UserPlusIcon, BookOpenIcon, BookMarkedIcon, WalletIcon,
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
    {
        label: 'Gestiune Membri', icon: UsersIcon,
        submenu: [
            { label: 'Sportivi', view: 'sportivi' },
            { label: 'Import Sportivi', view: 'import-sportivi' },
            { label: 'Familii', view: 'familii' },
            { label: 'Legitimații', view: 'legitimatii' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Administrare Staff', view: 'user-management' },
        ]
    },
    {
        label: 'Activitate Sală', icon: CalendarDaysIcon,
        submenu: [
            { label: 'Grupe & Orar', view: 'grupe' },
            { label: 'Program Antrenamente', view: 'program-antrenamente' },
            { label: 'Înregistrare Prezențe', view: 'prezenta' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' },
            { label: 'Raport Lunar Prezențe', view: 'raport-lunar-prezenta' },
        ]
    },
    {
        label: 'Evenimente & Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Sesiuni Examene', view: 'examene' },
            { label: 'Stagii', view: 'stagii' },
            { label: 'Competiții', view: 'competitii' },
            { label: 'Rapoarte Examen', view: 'rapoarte-examen' },
            { label: 'Rapoarte', view: 'rapoarte' },
        ]
    },
    {
        label: 'Financiar & Plăți', icon: BanknotesIcon,
        submenu: [
            { label: 'Facturi & Plăți', view: 'plati-scadente' },
            { label: 'Jurnal Încasări', view: 'jurnal-incasari' },
            { label: 'Raport Financiar', view: 'raport-financiar' },
            { label: 'Taxe Anuale', view: 'taxe-anuale' },
            { label: 'Facturi Federale', view: 'deconturi-federatie' },
            { label: 'Config. Abonamente', view: 'tipuri-abonament' },
            { label: 'Configurare Prețuri', view: 'configurare-preturi' },
        ]
    },
    {
        label: 'Setări & Admin', icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Structură Federație', view: 'structura-federatie' },
            { label: 'Mentenanță Date', view: 'data-maintenance' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
];

// Meniu pentru Admin Club (fara sectiuni federative)
export const adminClubMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    {
        label: 'Gestiune Membri', icon: UsersIcon,
        submenu: [
            { label: 'Sportivi', view: 'sportivi' },
            { label: 'Familii', view: 'familii' },
            { label: 'Legitimații', view: 'legitimatii' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Administrare Staff', view: 'user-management' },
        ]
    },
    {
        label: 'Activitate Sală', icon: CalendarDaysIcon,
        submenu: [
            { label: 'Grupe & Orar', view: 'grupe' },
            { label: 'Program Antrenamente', view: 'program-antrenamente' },
            { label: 'Înregistrare Prezențe', view: 'prezenta' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' },
            { label: 'Raport Lunar Prezențe', view: 'raport-lunar-prezenta' },
        ]
    },
    {
        label: 'Evenimente & Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Sesiuni Examene', view: 'examene' },
            { label: 'Stagii', view: 'stagii' },
            { label: 'Competiții', view: 'competitii' },
            { label: 'Rapoarte Examen', view: 'rapoarte-examen' },
            { label: 'Rapoarte', view: 'rapoarte' },
        ]
    },
    {
        label: 'Financiar & Plăți', icon: BanknotesIcon,
        submenu: [
            { label: 'Facturi & Plăți', view: 'plati-scadente' },
            { label: 'Jurnal Încasări', view: 'jurnal-incasari' },
            { label: 'Raport Financiar', view: 'raport-financiar' },
            { label: 'Taxe Anuale', view: 'taxe-anuale' },
            { label: 'Config. Abonamente', view: 'tipuri-abonament' },
            { label: 'Configurare Prețuri', view: 'configurare-preturi' },
        ]
    },
    {
        label: 'Setări & Admin', icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
];

// Meniu pentru Instructori
export const instructorMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
    {
        label: 'Activitate Sală', icon: CalendarDaysIcon,
        submenu: [
            { label: 'Grupe & Orar', view: 'grupe' },
            { label: 'Înregistrare Prezențe', view: 'prezenta-instructor' },
            { label: 'Program Antrenamente', view: 'program-antrenamente' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' },
        ]
    },
    {
        label: 'Evenimente & Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Examene', view: 'examene' },
            { label: 'Stagii', view: 'stagii' },
            { label: 'Competiții', view: 'competitii' },
        ]
    },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
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
