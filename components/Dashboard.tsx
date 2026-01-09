import React from 'react';
import { View } from '../types';
import { Card } from './ui';
import { UsersIcon, BanknotesIcon, TrophyIcon, ClipboardDocumentListIcon, AcademicCapIcon, CogIcon } from './icons';
import { MenuKey } from '../App';

interface DashboardProps {
  onSelectMenu: (menu: MenuKey) => void;
}

interface NavItem {
  menu: MenuKey;
  view: View;
  title: string;
  description: string;
  tooltip: string;
  icon: React.ElementType;
  color: string;
}

const navItems: NavItem[] = [
  {
    menu: 'sportivi',
    view: 'sportivi',
    title: 'Sportivi',
    description: 'Gestionează baza de date, profilele și grupele.',
    tooltip: 'Gestiune Date & Profile Sportivi',
    icon: UsersIcon,
    color: 'bg-brand-primary'
  },
  {
    menu: 'financiar',
    view: 'plati-scadente',
    title: 'Plăți & Facturi',
    description: 'Vezi datoriile, încasează și configurează prețuri.',
    tooltip: 'Management Financiar & Facturare',
    icon: BanknotesIcon,
    color: 'bg-status-success'
  },
  {
    menu: 'examene',
    view: 'examene',
    title: 'Examene',
    description: 'Planifică, înscrie sportivi și vezi istoricul.',
    tooltip: 'Organizare Examene de Grad',
    icon: TrophyIcon,
    color: 'bg-status-warning'
  },
  {
    menu: 'antrenamente',
    view: 'prezenta',
    title: 'Antrenamente',
    description: 'Înregistrează prezența și configurează orarul.',
    tooltip: 'Monitorizare Prezență & Orar',
    icon: ClipboardDocumentListIcon,
    color: 'bg-brand-secondary'
  },
  {
    menu: 'stagii',
    view: 'stagii',
    title: 'Stagii',
    description: 'Listează stagii și gestionează participanții.',
    tooltip: 'Evenimente de Perfecționare',
    icon: AcademicCapIcon,
    color: 'bg-blue-600'
  },
  {
    menu: 'competitii',
    view: 'competitii',
    title: 'Competiții',
    description: 'Definește competiții și înregistrează probe.',
    tooltip: 'Management Competiții & Rezultate',
    icon: TrophyIcon,
    color: 'bg-purple-600'
  },
  {
    menu: 'setari',
    view: 'user-management',
    title: 'Setări & Acces',
    description: 'Gestionează utilizatorii și parolele de acces.',
    tooltip: 'Configurări Globale & Securitate',
    icon: CogIcon,
    color: 'bg-slate-600'
  },
];

const NavCard: React.FC<{ item: NavItem, onClick: () => void }> = ({ item, onClick }) => (
    <div 
      onClick={onClick} 
      className="group relative transform transition-all duration-300 hover:scale-105 cursor-pointer rounded-2xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-secondary/30"
    >
      {/* Tooltip custom */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs py-2 px-3 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-600">
        {item.tooltip}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-700 rotate-45 border-r border-b border-slate-600"></div>
      </div>

      <Card className="flex flex-col items-center justify-center text-center h-full border border-slate-700/30 group-hover:border-brand-secondary/40 rounded-2xl bg-slate-800/80 backdrop-blur-sm">
        <div className={`p-4 rounded-full ${item.color} mb-4 shadow-lg group-hover:ring-4 group-hover:ring-white/10 transition-all`}>
          <item.icon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-secondary transition-colors">{item.title}</h3>
        <p className="text-slate-400 text-sm">{item.description}</p>
      </Card>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ onSelectMenu }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white text-center">Dashboard Principal</h1>
      <p className="text-center text-slate-400 mb-10 max-w-2xl mx-auto">
        Bun venit în panoul de administrare al clubului sportiv Phi Hau Iași. Selectați un modul de mai jos pentru a începe gestionarea activității.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {navItems.map(item => (
          <NavCard key={item.view} item={item} onClick={() => onSelectMenu(item.menu)} />
        ))}
      </div>
    </div>
  );
};