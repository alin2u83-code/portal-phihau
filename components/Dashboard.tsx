import React from 'react';
import { View } from '../types';
import { Card } from './ui';
import { UsersIcon, BanknotesIcon, TrophyIcon, CogIcon } from './icons';

interface DashboardProps {
  onNavigate: (view: View) => void;
}

interface NavItem {
  view: View; 
  title: string;
  description: string;
  tooltip: string;
  icon: React.ElementType;
  color: string;
}

const navItems: NavItem[] = [
  {
    view: 'sportivi',
    title: 'Sportivi & Utilizatori',
    description: 'Gestionează sportivi, familii și conturi de acces.',
    tooltip: 'Gestiune Date Sportivi, Familii & Conturi',
    icon: UsersIcon,
    color: 'bg-brand-primary'
  },
  {
    view: 'activitati',
    title: 'Activități Club',
    description: 'Gestionează antrenamente, examene, stagii și competiții.',
    tooltip: 'Gestiune Activități Club',
    icon: TrophyIcon,
    color: 'bg-brand-secondary'
  },
  {
    view: 'plati-scadente',
    title: 'Financiar',
    description: 'Gestionează plăți, facturi și rapoarte financiare.',
    tooltip: 'Management Financiar & Facturare',
    icon: BanknotesIcon,
    color: 'bg-status-success'
  },
   {
    view: 'configurare-preturi',
    title: 'Configurări',
    description: 'Setează prețuri, abonamente și alte opțiuni ale clubului.',
    tooltip: 'Setări Generale Club',
    icon: CogIcon,
    color: 'bg-slate-500'
  },
];

const NavCard: React.FC<{ item: NavItem, onClick: () => void }> = ({ item, onClick }) => (
    <div 
      onClick={onClick} 
      className="group relative transform transition-all duration-300 hover:scale-105 cursor-pointer rounded-2xl shadow-md shadow-brand-primary/40 hover:shadow-lg hover:shadow-brand-secondary/50"
      title={item.tooltip}
    >
      <Card className="flex flex-col items-center justify-center text-center h-full border-slate-700 group-hover:border-brand-secondary/40 rounded-2xl bg-slate-800/50 backdrop-blur-sm">
        <div className={`p-4 rounded-full ${item.color} mb-4 shadow-lg group-hover:ring-4 group-hover:ring-white/10 transition-all`}>
          <item.icon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-secondary transition-colors">{item.title}</h3>
        <p className="text-slate-400 text-sm">{item.description}</p>
      </Card>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white text-center" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>Clubul Phi Hau Iași</h1>
      <p className="text-center text-slate-300 mb-12 max-w-2xl mx-auto">
        Bun venit în panoul de administrare. Selectați un modul de mai jos pentru a începe gestionarea activității clubului.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        {navItems.map(item => (
          <NavCard key={item.view} item={item} onClick={() => onNavigate(item.view)} />
        ))}
      </div>
    </div>
  );
};