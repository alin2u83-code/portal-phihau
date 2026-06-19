import React from 'react';
import { View } from '../types';
import {
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon,
    ClipboardCheckIcon, CogIcon, SitemapIcon, ArchiveBoxIcon, FileTextIcon,
    ChartBarIcon, UserPlusIcon, BookOpenIcon, BookMarkedIcon, WalletIcon,
    ClockIcon, ClipboardListIcon, MessageSquareIcon, CalendarIcon,
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

// Meniu complet pentru Adminii de Federație
export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    {
        label: 'Gestiune Membri', icon: UsersIcon,
        submenu: [
            { label: 'Sportivi', view: 'sportivi' },
            { label: 'Import Sportivi', view: 'import-sportivi' },
            { label: 'Deduplicare Sportivi', view: 'deduplicare-sportivi' },
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
            { label: 'Calendar', view: 'calendar' },
        ]
    },
    {
        label: 'Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Sesiuni Examene', view: 'examene' },
            { label: 'Rapoarte Examen', view: 'rapoarte-examen' },
        ]
    },
    {
        label: 'Activități Naționale', icon: TrophyIcon,
        submenu: [
            { label: 'Activități Naționale', view: 'activitati-nationale' },
            { label: 'Competiții', view: 'competitii' },
            { label: 'Stagii', view: 'stagii' },
            { label: 'Template Probe', view: 'template-probe' },
        ]
    },
    {
        label: 'Financiar & Plăți', icon: BanknotesIcon,
        submenu: [
            { label: 'Dashboard Financiar', view: 'financial-dashboard' },
            { label: 'Facturi & Plăți', view: 'plati-scadente' },
            { label: 'Gestiune Facturi', view: 'gestiune-facturi' },
            { label: 'Jurnal Încasări', view: 'jurnal-incasari' },
            { label: 'Raport Financiar', view: 'raport-financiar' },
            { label: 'Taxe Anuale', view: 'taxe-anuale' },
            { label: 'Config. Abonamente', view: 'tipuri-abonament' },
            { label: 'Configurare Prețuri', view: 'configurare-preturi' },
            { label: 'Reduceri', view: 'reduceri' },
            { label: 'Deconturi Federație', view: 'deconturi-federatie' },
        ]
    },
    {
        label: 'Setări & Admin', icon: CogIcon,
        submenu: [
            { label: 'Gestiune Cluburi', view: 'cluburi' },
            { label: 'Structură Federație', view: 'structura-federatie' },
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Mentenanță Date', view: 'data-maintenance' },
            { label: 'Nomenclatoare', view: 'nomenclatoare' },
            { label: 'Înlănțuiri', view: 'inlantuiri-admin' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'SMS', icon: MessageSquareIcon, view: 'admin-sms' },
    { label: 'Cereri Înscriere', icon: UserPlusIcon, view: 'cereri-inscriere' },
    { label: 'Istoric Activitate', icon: ClockIcon, view: 'istoric-activitate' },
];

// Meniu pentru Admin Club (fara sectiuni federative)
export const adminClubMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    {
        label: 'Gestiune Membri', icon: UsersIcon,
        submenu: [
            { label: 'Sportivi', view: 'sportivi' },
            { label: 'Import Sportivi', view: 'import-sportivi' },
            { label: 'Deduplicare Sportivi', view: 'deduplicare-sportivi' },
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
            { label: 'Calendar', view: 'calendar' },
        ]
    },
    {
        label: 'Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Sesiuni Examene', view: 'examene' },
            { label: 'Rapoarte Examen', view: 'rapoarte-examen' },
        ]
    },
    {
        label: 'Activități Naționale', icon: TrophyIcon,
        submenu: [
            { label: 'Activități Naționale', view: 'activitati-nationale' },
            { label: 'Competiții', view: 'competitii' },
            { label: 'Stagii', view: 'stagii' },
        ]
    },
    {
        label: 'Financiar & Plăți', icon: BanknotesIcon,
        submenu: [
            { label: 'Dashboard Financiar', view: 'financial-dashboard' },
            { label: 'Facturi & Plăți', view: 'plati-scadente' },
            { label: 'Gestiune Facturi', view: 'gestiune-facturi' },
            { label: 'Jurnal Încasări', view: 'jurnal-incasari' },
            { label: 'Raport Financiar', view: 'raport-financiar' },
            { label: 'Taxe Anuale', view: 'taxe-anuale' },
            { label: 'Config. Abonamente', view: 'tipuri-abonament' },
            { label: 'Configurare Prețuri', view: 'configurare-preturi' },
            { label: 'Reduceri', view: 'reduceri' },
            { label: 'Deconturi Federație', view: 'deconturi-federatie' },
        ]
    },
    {
        label: 'Setări & Admin', icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Nomenclatoare', view: 'nomenclatoare' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'SMS', icon: MessageSquareIcon, view: 'admin-sms' },
    { label: 'Cereri Înscriere', icon: UserPlusIcon, view: 'cereri-inscriere' },
    { label: 'Istoric Activitate', icon: ClockIcon, view: 'istoric-activitate' },
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
            { label: 'Arhivă Prezențe', view: 'arhiva-prezente' },
            { label: 'Program Antrenamente', view: 'program-antrenamente' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' },
            { label: 'Raport Activitate', view: 'raport-activitate' },
        ]
    },
    {
        label: 'Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Examene', view: 'examene' },
        ]
    },
    {
        label: 'Activități Naționale', icon: TrophyIcon,
        submenu: [
            { label: 'Activități Naționale', view: 'activitati-nationale' },
            { label: 'Competiții', view: 'competitii' },
            { label: 'Stagii', view: 'stagii' },
        ]
    },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Calendar', icon: CalendarIcon, view: 'calendar' },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'Istoric Activitate', icon: ClockIcon, view: 'istoric-activitate' },
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
