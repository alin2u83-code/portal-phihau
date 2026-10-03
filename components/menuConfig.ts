import React from 'react';
import { View } from '../types';
import {
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon,
    ClipboardCheckIcon, CogIcon, SitemapIcon, ArchiveBoxIcon, FileTextIcon,
    ChartBarIcon, UserPlusIcon, BookOpenIcon, BookMarkedIcon, WalletIcon,
    ClockIcon, ClipboardListIcon, MessageSquareIcon, CalendarIcon, PackageIcon,
    ShieldCheckIcon,
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
    /** antet de secțiune afișat deasupra acestui item (și a celor următoare până la următorul antet) */
    section?: string;
    /** view-uri (tab-uri din același hub) care marchează acest item ca activ */
    aliases?: View[];
}

// Meniu complet pentru Adminii de Federație
export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    {
        label: 'Gestiune Membri', icon: UsersIcon,
        submenu: [
            { label: 'Sportivi', view: 'sportivi', section: 'Sportivi' },
            { label: 'Familii', view: 'familii' },
            { label: 'Legitimații', view: 'legitimatii' },
            { label: 'Cereri Înscriere', view: 'cereri-inscriere', section: 'Cereri' },
            { label: 'Cereri GDPR', view: 'cereri-gdpr' },
            { label: 'Import Sportivi', view: 'import-sportivi', section: 'Instrumente date' },
            { label: 'Deduplicare Sportivi', view: 'deduplicare-sportivi' },
        ]
    },
    {
        label: 'Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Sesiuni Examene', view: 'examene' },
            { label: 'Rapoarte Examen', view: 'rapoarte-examen' },
            { label: 'Audit Grade', view: 'audit-grade' },
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
            { label: 'Plăți & Facturi', view: 'plati-hub' },
            { label: 'Vacanțe Antrenamente', view: 'perioade-vacanta' },
            { label: 'Deconturi Federație', view: 'deconturi-federatie' },
        ]
    },
    {
        label: 'Setări & Admin', icon: CogIcon,
        submenu: [
            { label: 'Gestiune Cluburi', view: 'cluburi' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Administrare Staff', view: 'user-management' },
            { label: 'Structură Federație', view: 'structura-federatie' },
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Mentenanță Date', view: 'data-maintenance' },
            { label: 'Înlănțuiri', view: 'inlantuiri-admin' },
            { label: 'Setări Cont', view: 'account-settings' },
            { label: 'Protecția datelor', view: 'protectia-datelor' },
            { label: 'Jurnal Audit', view: 'jurnal-audit' },
        ]
    },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'SMS', icon: MessageSquareIcon, view: 'admin-sms' },
    { label: 'Istoric Activitate', icon: ClockIcon, view: 'istoric-activitate' },
];

// Meniu pentru Admin Club (fara sectiuni federative)
export const adminClubMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    {
        label: 'Gestiune Membri', icon: UsersIcon,
        submenu: [
            { label: 'Sportivi', view: 'sportivi', section: 'Sportivi' },
            { label: 'Familii', view: 'familii' },
            { label: 'Legitimații', view: 'legitimatii' },
            { label: 'Cereri Înscriere', view: 'cereri-inscriere', section: 'Cereri' },
            { label: 'Cereri GDPR', view: 'cereri-gdpr' },
            { label: 'Import Sportivi', view: 'import-sportivi', section: 'Instrumente date' },
            { label: 'Deduplicare Sportivi', view: 'deduplicare-sportivi' },
        ]
    },
    {
        label: 'Activitate Sală', icon: CalendarDaysIcon,
        submenu: [
            { label: 'Grupe & Sezoane', view: 'grupe', aliases: ['sezoane'] },
            { label: 'Prezențe & Antrenamente', view: 'prezenta', aliases: ['prezenta-instructor', 'program-antrenamente', 'calendar'] },
            { label: 'Rapoarte Prezențe', view: 'raport-prezenta', aliases: ['raport-lunar-prezenta'] },
        ]
    },
    {
        label: 'Examene', icon: TrophyIcon,
        submenu: [
            { label: 'Sesiuni Examene', view: 'examene' },
            { label: 'Rapoarte Examen', view: 'rapoarte-examen' },
            { label: 'Audit Grade', view: 'audit-grade' },
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
        label: 'Echipamente', icon: PackageIcon,
        submenu: [
            { label: 'Catalog Produse', view: 'produse' },
            { label: 'Vânzări', view: 'vanzari-produse' },
        ]
    },
    {
        label: 'Financiar & Plăți', icon: BanknotesIcon,
        submenu: [
            { label: 'Plăți & Facturi', view: 'plati-hub' },
            { label: 'Vacanțe Antrenamente', view: 'perioade-vacanta' },
            { label: 'Deconturi Federație', view: 'deconturi-federatie' },
        ]
    },
    {
        label: 'Setări & Admin', icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Administrare Staff', view: 'user-management' },
            { label: 'Setări Cont', view: 'account-settings' },
            { label: 'Protecția datelor', view: 'protectia-datelor' },
        ]
    },
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'SMS', icon: MessageSquareIcon, view: 'admin-sms' },
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
            { label: 'Prezențe & Antrenamente', view: 'prezenta-instructor', aliases: ['prezenta', 'program-antrenamente', 'calendar'] },
            { label: 'Rapoarte Prezențe', view: 'raport-prezenta', aliases: ['raport-lunar-prezenta'] },
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
    { label: 'Notificări', icon: ClipboardCheckIcon, view: 'notificari' },
    { label: 'Istoric Activitate', icon: ClockIcon, view: 'istoric-activitate' },
    { label: 'Setări Cont', icon: CogIcon, view: 'account-settings' },
    { label: 'Protecția datelor', icon: ShieldCheckIcon, view: 'protectia-datelor' },
];

// Meniu pentru Sportivi
export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'my-portal' },
    { label: 'Istoric Prezență', icon: ClipboardCheckIcon, view: 'istoric-prezenta' },
    { label: 'Istoric Plăți', icon: BanknotesIcon, view: 'istoric-plati' },
    { label: 'Fișa Digitală', icon: FileTextIcon, view: 'fisa-digitala' },
    { label: 'Fișa de Competiție', icon: TrophyIcon, view: 'fisa-competitie' },
    { label: 'Setări Cont', icon: CogIcon, view: 'account-settings' },
    { label: 'Protecția datelor', icon: ShieldCheckIcon, view: 'protectia-datelor' },
];
