import React from 'react';
import { View } from '../types';
import {
    HomeIcon, UsersIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon,
    ClipboardCheckIcon, CogIcon, FileTextIcon, ChartBarIcon, BellIcon, BookOpenIcon,
} from './icons';

export interface MenuItem {
    label: string;
    icon: React.ElementType;
    view?: View;
    submenu?: SubMenuItem[];
    /** view-uri (tab-uri din același hub) care marchează acest item ca activ */
    aliases?: View[];
}

export interface SubMenuItem {
    label: string;
    view: View;
    /** antet de secțiune afișat deasupra acestui item (și a celor următoare până la următorul antet) */
    section?: string;
    /** view-uri (tab-uri din același hub) care marchează acest item ca activ */
    aliases?: View[];
    /** vizibilitate doar în UI (poarta reală rămâne renderProtected + RLS) */
    requires?: 'isFederationAdmin' | 'isSuperAdmin';
}

// Aliasuri comune hub-urilor (view-urile tab-urilor lor)
const ALIASES_SPORTIVI: View[] = ['familii', 'legitimatii', 'cereri-inscriere', 'cereri-gdpr', 'import-sportivi', 'deduplicare-sportivi'];
const ALIASES_EXAMENE: View[] = ['rapoarte-examen', 'audit-grade'];
const ALIASES_COMPETITII: View[] = ['activitati-nationale', 'template-probe'];
const ALIASES_ANTRENAMENTE: View[] = ['sezoane', 'prezenta', 'prezenta-instructor', 'program-antrenamente', 'calendar', 'activitati', 'raport-prezenta', 'raport-lunar-prezenta'];
const ALIASES_PLATI: View[] = [
    'plati-scadente', 'gestiune-facturi', 'facturi-fara-prezenta', 'jurnal-incasari', 'raport-financiar',
    'financial-dashboard', 'tipuri-abonament', 'configurare-preturi', 'reduceri', 'taxe-anuale', 'nomenclatoare',
    'deconturi-federatie', 'perioade-vacanta', 'produse', 'vanzari-produse',
];

const acasa: MenuItem = { label: 'Acasă', icon: HomeIcon, view: 'dashboard' };
const stagii: MenuItem = { label: 'Stagii', icon: BookOpenIcon, view: 'stagii' };

// Meniu pentru Adminii de Federație (8 intrări)
export const adminMenu: MenuItem[] = [
    acasa,
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi', aliases: ALIASES_SPORTIVI },
    { label: 'Examene', icon: ClipboardCheckIcon, view: 'examene', aliases: ALIASES_EXAMENE },
    { label: 'Competiții', icon: TrophyIcon, view: 'competitii', aliases: ALIASES_COMPETITII },
    stagii,
    { label: 'Plăți', icon: BanknotesIcon, view: 'plati-hub', aliases: ALIASES_PLATI },
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    {
        label: 'Administrare', icon: CogIcon,
        submenu: [
            { label: 'Gestiune Cluburi', view: 'cluburi', section: 'Federație' },
            { label: 'Structură Federație', view: 'structura-federatie' },
            { label: 'Administrare Staff', view: 'user-management' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Înlănțuiri', view: 'inlantuiri-admin' },
            { label: 'Anunțuri Federație', view: 'anunturi-federatie' },
            { label: 'Setări Club', view: 'setari-club', section: 'Sistem' },
            { label: 'Notificări', view: 'notificari' },
            { label: 'SMS', view: 'admin-sms' },
            { label: 'Mentenanță Date', view: 'data-maintenance' },
            { label: 'Jurnal Audit', view: 'jurnal-audit' },
            { label: 'Admin Dashboard', view: 'admin-dashboard', requires: 'isFederationAdmin' },
            { label: 'Button Catalog', view: 'button-catalog', requires: 'isSuperAdmin' },
        ]
    },
];

// Meniu pentru Admin Club (8 intrări)
export const adminClubMenu: MenuItem[] = [
    acasa,
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi', aliases: ALIASES_SPORTIVI },
    { label: 'Antrenamente', icon: CalendarDaysIcon, view: 'grupe', aliases: ALIASES_ANTRENAMENTE },
    { label: 'Examene', icon: ClipboardCheckIcon, view: 'examene', aliases: ALIASES_EXAMENE },
    { label: 'Competiții', icon: TrophyIcon, view: 'competitii', aliases: ALIASES_COMPETITII },
    stagii,
    { label: 'Plăți', icon: BanknotesIcon, view: 'plati-hub', aliases: ALIASES_PLATI },
    {
        label: 'Administrare', icon: CogIcon,
        submenu: [
            { label: 'Setări Club', view: 'setari-club' },
            { label: 'Administrare Staff', view: 'user-management' },
            { label: 'Nomenclator Grade', view: 'grade' },
            { label: 'Notificări', view: 'notificari' },
            { label: 'SMS', view: 'admin-sms' },
        ]
    },
];

// Meniu pentru Instructori (8 intrări)
export const instructorMenu: MenuItem[] = [
    acasa,
    { label: 'Sportivi', icon: UsersIcon, view: 'sportivi' },
    { label: 'Antrenamente', icon: CalendarDaysIcon, view: 'grupe', aliases: ALIASES_ANTRENAMENTE },
    { label: 'Examene', icon: ClipboardCheckIcon, view: 'examene' },
    { label: 'Competiții', icon: TrophyIcon, view: 'competitii', aliases: ['activitati-nationale'] },
    stagii,
    { label: 'Rapoarte', icon: ChartBarIcon, view: 'rapoarte' },
    { label: 'Notificări', icon: BellIcon, view: 'notificari' },
];

// Meniu pentru Sportivi (4 intrări)
export const sportivMenu: MenuItem[] = [
    { label: 'Portalul Meu', icon: HomeIcon, view: 'my-portal', aliases: ['dashboard'] },
    { label: 'Prezențe', icon: ClipboardCheckIcon, view: 'istoric-prezenta' },
    { label: 'Plăți', icon: BanknotesIcon, view: 'istoric-plati' },
    { label: 'Fișa mea', icon: FileTextIcon, view: 'fisa-digitala', aliases: ['fisa-competitie'] },
];
