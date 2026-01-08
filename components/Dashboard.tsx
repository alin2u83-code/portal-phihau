
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
  icon: React.ElementType;
  color: string;
}

const navItems: NavItem[] = [
  {
    menu: 'sportivi',
    view: 'sportivi',
    title: 'Sportivi',
    description: 'Gestionează baza de date, profilele și grupele.',
    icon: UsersIcon,
    color: 'bg-brand-primary'
  },
  {
    menu: 'financiar',
    view: 'plati-scadente',
    title: 'Plăți & Facturi',
    description: 'Vezi datoriile, încasează și configurează prețuri.',
    icon: BanknotesIcon,
    color: 'bg-status-success'
  },
  {
    menu: 'examene',
    view: 'examene',
    title: 'Examene',
    description: 'Planifică, înscrie sportivi și vezi istoricul.',
    icon: TrophyIcon,
    color: 'bg-status-warning'
  },
  {
    menu: 'antrenamente',
    view: 'prezenta',
    title: 'Antrenamente',
    description: 'Înregistrează prezența și configurează orarul.',
    icon: ClipboardDocumentListIcon,
    color: 'bg-brand-secondary'
  },
  {
    menu: 'stagii',
    view: 'stagii',
    title: 'Stagii',
    description: 'Listează stagii și gestionează participanții.',
    icon: AcademicCapIcon,
    color: 'bg-blue-600'
  },
  {
    menu: 'competitii',
    view: 'competitii',
    title: 'Competiții',
    description: 'Definește competiții și înregistrează probe.',
    icon: TrophyIcon,
    color: 'bg-purple-600'
  },
  {
    menu: 'setari',
    view: 'user-management',
    title: 'Setări & Acces',
    description: 'Gestionează utilizatorii și parolele de acces.',
    icon: CogIcon,
    color: 'bg-slate-600'
  },
];

const NavCard: React.FC<{ item: NavItem, onClick: () => void }> = ({ item, onClick }) => (
    <div onClick={onClick} className="transform transition-transform duration-300 hover:scale-105 cursor-pointer">
      <Card className="flex flex-col items-center justify-center text-center h-full">
        <div className={`p-4 rounded-full ${item.color} mb-4`}>
          <item.icon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
        <p className="text-slate-400 text-sm">{item.description}</p>
      </Card>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ onSelectMenu }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white text-center">Dashboard Principal</h1>
      <p className="text-center text-slate-400 mb-8 max-w-2xl mx-auto">
        Bun venit în panoul de administrare al clubului sportiv Phi Hau Iași. Selectați un modul de mai jos pentru a începe.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {navItems.map(item => (
          <NavCard key={item.view} item={item} onClick={() => onSelectMenu(item.menu)} />
        ))}
      </div>
    </div>
  );
};
