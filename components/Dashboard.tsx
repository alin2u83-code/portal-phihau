import React, { useMemo, useEffect } from 'react';
import { View, User, Sportiv, Plata, Participare, Rezultat, Prezenta, PrezentaAntrenament, Examen, Grad } from '../types';
import { Card, Button } from './ui';
import { 
  ClipboardCheckIcon, AcademicCapIcon, BanknotesIcon, WrenchScrewdriverIcon, DownloadIcon 
} from './icons';
import { useNotification } from './NotificationProvider';

interface DashboardProps {
  onNavigate: (view: View) => void;
  currentUser: User;
  sportivi: Sportiv[];
  plati: Plata[];
  participari: Participare[];
  rezultate: Rezultat[];
  examene: Examen[];
  grade: Grad[];
}

const ActionCard: React.FC<{ title: string; icon: React.ElementType; onClick: () => void }> = ({ title, icon: Icon, onClick }) => (
  <button 
    onClick={onClick}
    className="group relative flex flex-col items-center justify-center p-6 text-center h-40 w-full bg-[#3D3D99] rounded-lg shadow-lg hover:shadow-brand-secondary/40 transform transition-all duration-300 hover:-translate-y-1 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-brand-secondary/50"
    style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.4)' }}
  >
    <Icon className="h-12 w-12 text-white mb-3 transition-transform duration-300 group-hover:scale-110" />
    <span className="text-lg font-semibold text-white">{title}</span>
  </button>
);


export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, sportivi, plati, participari, rezultate, examene, grade
}) => {
  const { showNotification } = useNotification();

  useEffect(() => {
    const sportiviFaraDataNasterii = sportivi.filter(s => !s.data_nasterii && s.status === 'Activ');
    if (sportiviFaraDataNasterii.length > 0) {
        showNotification({
            type: 'warning',
            title: 'Alertă Mentenanță',
            message: `${sportiviFaraDataNasterii.length} sportiv(i) activ(i) nu au data nașterii completată. Acest lucru poate bloca calculul eligibilității la examene.`
        });
    }
  }, [sportivi, showNotification]);


  const handleExportBackup = () => {
    const backupData = {
      sportivi,
      plati,
      participari,
      rezultate,
      grade,
      examene
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phi_hau_backup_complet_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification({ type: 'success', title: 'Backup Completat', message: 'Fișierul JSON cu datele critice a fost descărcat.'});
  };

  const actionItems = [
    { title: 'Înregistrare Prezență', icon: ClipboardCheckIcon, onClick: () => onNavigate('prezenta') },
    { title: 'Înscriere Examen', icon: AcademicCapIcon, onClick: () => onNavigate('examene') },
    { title: 'Gestionare Plăți', icon: BanknotesIcon, onClick: () => onNavigate('plati-scadente') },
    { title: 'Backup Date', icon: DownloadIcon, onClick: handleExportBackup },
    { title: 'Audit Sistem', icon: WrenchScrewdriverIcon, onClick: () => onNavigate('maintenance') }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-down">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">Centru de Comandă</h1>
            <p className="text-slate-300 mt-2">Accesați rapid cele mai importante module ale aplicației.</p>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {actionItems.map(item => (
          <ActionCard key={item.title} title={item.title} icon={item.icon} onClick={item.onClick} />
        ))}
      </div>
    </div>
  );
};