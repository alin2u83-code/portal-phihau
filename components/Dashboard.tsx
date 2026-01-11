import React from 'react';
import { View, User } from '../types';
import { Card } from './ui';
import { UsersIcon, BanknotesIcon, TrophyIcon, ClipboardDocumentListIcon, UserCircleIcon } from './icons';

interface DashboardProps {
  onNavigate: (view: View) => void;
  currentUser: User;
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
    view: 'examene',
    title: 'Activități & Evaluări',
    description: 'Definește examene, stagii și competiții.',
    tooltip: 'Management Examene, Stagii & Competiții',
    icon: TrophyIcon,
    color: 'bg-status-warning'
  },
  {
    view: 'prezenta',
    title: 'Antrenamente',
    description: 'Înregistrează prezența și configurează orarul.',
    tooltip: 'Monitorizare Prezență & Orar',
    icon: ClipboardDocumentListIcon,
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
];

const NavCard: React.FC<{ item: NavItem, onClick: () => void }> = ({ item, onClick }) => (
    <div 
      onClick={onClick} 
      className="group relative transform transition-all duration-300 hover:scale-105 cursor-pointer"
      title={item.tooltip}
    >
      <Card className="flex flex-col items-center justify-center text-center h-full border-slate-700 group-hover:border-brand-secondary/40 bg-slate-800/50 backdrop-blur-sm shadow-lg shadow-brand-primary/30 hover:shadow-brand-secondary/40">
        <div className={`p-4 rounded-full ${item.color} mb-4 shadow-lg group-hover:ring-4 group-hover:ring-white/10 transition-all`}>
          <item.icon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-secondary transition-colors">{item.title}</h3>
        <p className="text-slate-400 text-sm">{item.description}</p>
      </Card>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, currentUser }) => {
  const isAdminOrInstructor = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');

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
      
      {isAdminOrInstructor && (
        <div className="mt-12 pt-8 border-t border-slate-700">
            <h2 className="text-xl font-bold text-center text-slate-400 mb-6">Acces Personal</h2>
            <div className="max-w-xs mx-auto">
                 <NavCard item={{
                    view: 'portal-personal',
                    title: 'Statutul Meu ca Sportiv',
                    description: 'Vizualizează progresul, prezența și situația ta financiară.',
                    tooltip: 'Vezi propriul portal de sportiv',
                    icon: UserCircleIcon,
                    color: 'bg-status-success'
                 }} onClick={() => onNavigate('portal-personal')} />
            </div>
        </div>
      )}
    </div>
  );
};