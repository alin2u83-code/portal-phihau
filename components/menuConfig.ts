import React from 'react';
import { View, Rol } from '../types';
import { HomeIcon, UsersIcon, TrophyIcon, ClipboardDocumentListIcon, BanknotesIcon, CalendarDaysIcon, UserCircleIcon, ShieldCheckIcon, ClipboardCheckIcon, ArchiveBoxIcon, CogIcon } from './icons';

export interface MenuItem {
    label: string;
    icon: React.ElementType;
    view?: View;
    roles?: Rol['nume'][];
    submenu?: SubMenuItem[];
}

export interface SubMenuItem {
    label: string;
    view: View;
    roles?: Rol['nume'][];
}

export const adminMenu: MenuItem[] = [
    { label: 'Dashboard', icon: HomeIcon, view: 'dashboard' },
    { 
        label: 'Gestiune Membri', 
        icon: UsersIcon,
        submenu: [
             { label: 'Listă Sportivi', view: 'sportivi' },
             { label: 'Gestiune Familii', view: 'familii', roles: ['Admin', 'Instructor', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
             { label: 'Nomenclator Grade', view: 'grade', roles: ['Admin', 'Instructor', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
             { label: 'Administrare Staff', view: 'user-management', roles: ['Admin', 'SUPER_ADMIN_FEDERATIE', 'Admin Club'] }
        ]
    },
    {
        label: 'Activitate Sală',
        icon: ClipboardCheckIcon,
        submenu: [
            { label: 'Orar & Gestiune Grupe', view: 'grupe' },
            { label: 'Generator Program', view: 'activitati' },
            { label: 'Înregistrare Prezențe', view: 'prezenta' },
            { label: 'Raport Prezențe', view: 'raport-prezenta' } 
        ]
    },
    {
        label: 'Evenimente & Examene',
        icon: TrophyIcon,
        submenu: [
             { view: 'examene', label: 'Sesiuni Examene' },
             { view: 'stagii', label: 'Stagii & Competiții' },
             { view: 'rapoarte-examen', label: 'Rapoarte Examen' },
        ]
    },
    { 
        label: 'Administrativ & Plăți', 
        icon: BanknotesIcon, 
        submenu: [ 
            { view: 'financial-dashboard', label: 'Dashboard Financiar' },
            { view: 'plati-scadente', label: 'Facturi & Plăți' }, 
            { view: 'deconturi-federatie', label: 'Deconturi Federație', roles: ['Admin Club', 'SUPER_ADMIN_FEDERATIE', 'Admin'] },
            { view: 'tipuri-abonament', label: 'Config. Abonamente' }, 
            { view: 'configurare-preturi', label: 'Configurare Prețuri', roles: ['Admin', 'Instructor', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
        ] 
    },
];

export const sportivMenu: MenuItem[] = [
    { 
        label: 'Pagina Mea', 
        icon: UserCircleIcon, 
        submenu: [
            { label: 'Dashboard', view: 'my-portal' },
            { label: 'Evenimentele Mele', view: 'evenimentele-mele' },
            { label: 'Setări Cont', view: 'account-settings' },
        ]
    },
];