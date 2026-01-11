import React, { useMemo } from 'react';
import { View, User, Sportiv, Plata, Participare, Rezultat, Prezenta, PrezentaAntrenament } from '../types';
import { Card, Button } from './ui';
import { 
  UsersIcon, BanknotesIcon, AcademicCapIcon, ClipboardCheckIcon, WrenchScrewdriverIcon, DownloadIcon
} from './icons';

interface DashboardProps {
  onNavigate: (view: View) => void;
  currentUser: User;
  sportivi: Sportiv[];
  plati: Plata[];
  participari: Participare[];
  rezultate: Rezultat[];
  programAntrenamente: Prezenta[];
  prezentaAntrenament: PrezentaAntrenament[];
}

// Card pentru statistici rapide
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <Card className="flex items-center p-4 bg-slate-800/50">
    <div className="p-3 bg-brand-secondary/10 rounded-full mr-4">
      <Icon className="w-6 h-6 text-brand-secondary" />
    </div>
    <div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </Card>
);

// Buton de acțiune principal
const ActionButton: React.FC<{ title: string; icon: React.ElementType; onClick: () => void }> = ({ title, icon: Icon, onClick }) => (
  <button 
    onClick={onClick}
    className="group relative flex flex-col items-center justify-center p-6 text-center h-full w-full bg-[#3D3D99] rounded-lg shadow-lg hover:shadow-brand-secondary/40 transform transition-all duration-300 hover:scale-105 hover:bg-brand-primary focus:outline-none focus:ring-4 focus:ring-brand-secondary/50"
  >
    <Icon className="h-12 w-12 text-white mb-3 transition-transform duration-300 group-hover:scale-110" />
    <span className="text-lg font-semibold text-white">{title}</span>
  </button>
);


export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, currentUser, sportivi, plati, participari, rezultate, programAntrenamente, prezentaAntrenament 
}) => {

  const handleExportBackup = () => {
    const backupData = {
      sportivi,
      plati,
      participari,
      rezultate,
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phi_hau_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculare statistici
  const sportiviActivi = sportivi.filter(s => s.status === 'Activ').length;

  const prezentiAzi = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTrainingsIds = new Set(
      programAntrenamente.filter(p => p.data === today).map(p => p.id)
    );
    const uniqueSportivi = new Set(prezentaAntrenament
        .filter(p => todayTrainingsIds.has(p.antrenament_id))
        .map(p => p.sportiv_id)
    );
    return uniqueSportivi.size;
  }, [programAntrenamente, prezentaAntrenament]);

  const taxeNeachitate = useMemo(() => {
    return plati
      .filter(p => p.status !== 'Achitat' && p.tip === 'Taxa Examen')
      .reduce((sum, p) => sum + p.suma, 0)
      .toFixed(2);
  }, [plati]);

  const actionItems = [
    { title: 'Prezență Rapidă', icon: ClipboardCheckIcon, view: 'prezenta' as View },
    { title: 'Adaugă Membru Nou', icon: UsersIcon, view: 'sportivi' as View },
    { title: 'Înscrieri Examen', icon: AcademicCapIcon, view: 'examene' as View },
    { title: 'Vezi Restanțieri', icon: BanknotesIcon, view: 'plati-scadente' as View },
    { title: 'Mentenanță & Audit', icon: WrenchScrewdriverIcon, view: 'maintenance' as View }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-down">
      {/* 1. Bara de Backup */}
      <Card className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-xl font-bold text-white">Acțiuni Globale</h2>
            <p className="text-sm text-slate-400">Operațiuni de administrare a întregului sistem.</p>
        </div>
        <Button onClick={handleExportBackup} variant="secondary" className="bg-slate-700 hover:bg-slate-600">
          <DownloadIcon className="w-5 h-5 mr-2" />
          Export Backup Complet (JSON)
        </Button>
      </Card>

      {/* 2. Grila de Acțiuni */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {actionItems.map(item => (
          <ActionButton key={item.view} title={item.title} icon={item.icon} onClick={() => onNavigate(item.view)} />
        ))}
      </div>

      {/* 3. Statistici Rapide */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Status Rapid</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Sportivi Activi" value={sportiviActivi} icon={UsersIcon} />
          <StatCard title="Prezenți Azi" value={prezentiAzi} icon={ClipboardCheckIcon} />
          <StatCard title="Taxe Examen Neachitate" value={`${taxeNeachitate} RON`} icon={BanknotesIcon} />
        </div>
      </div>
    </div>
  );
};