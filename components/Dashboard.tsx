import React, { useMemo, useEffect } from 'react';
import { View, User, Sportiv, Plata, Participare, Rezultat, Prezenta, PrezentaAntrenament, Examen, Grad, PretConfig } from '../types';
import { Card, Button } from './ui';
import { 
  ClipboardCheckIcon, AcademicCapIcon, BanknotesIcon, WrenchScrewdriverIcon, DownloadIcon, UsersIcon, TrophyIcon, CogIcon, ActivityIcon
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
  preturiConfig: PretConfig[];
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
  onNavigate, sportivi, plati, participari, rezultate, examene, grade, preturiConfig
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

   const pricesStatus = useMemo(() => {
    if (!grade || grade.length === 0) return { configured: true, message: 'N/A' };
    
    const gradesToCheck = grade.filter(g => !(g.nume.toLowerCase().includes('debutant') || g.ordine <= 1));
    if (gradesToCheck.length === 0) return { configured: true, message: 'N/A - Doar debutanți' };
    
    const gradesWithoutPrice = gradesToCheck.filter(g => {
        const data = new Date();
        const preturiValabile = preturiConfig
            .filter(p => p.categorie === 'Taxa Examen' && p.denumire_servisciu === g.nume && new Date(p.valabil_de_la_data) <= data);
        return preturiValabile.length === 0;
    });

    if (gradesWithoutPrice.length === 0) {
        return { configured: true, message: 'Configurat' };
    } else {
        return { configured: false, message: `${gradesWithoutPrice.length} ${gradesWithoutPrice.length === 1 ? 'grad' : 'grade'} fără preț` };
    }
}, [grade, preturiConfig]);

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
    { title: 'Antrenamente', icon: ActivityIcon, onClick: () => onNavigate('prezenta') },
    { title: 'Examene', icon: AcademicCapIcon, onClick: () => onNavigate('examene') },
    { title: 'Sportivi', icon: UsersIcon, onClick: () => onNavigate('sportivi') },
    { title: 'Facturi', icon: BanknotesIcon, onClick: () => onNavigate('plati-scadente') },
    { title: 'Mentenanță', icon: WrenchScrewdriverIcon, onClick: () => onNavigate('maintenance') }
  ];

  return (
    <div className="space-y-8 animate-fade-in-down">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold text-white tracking-tight">Centru de Comandă</h1>
                 <div className="flex items-center gap-4 mt-2 flex-wrap justify-center md:justify-start">
                    <p className="text-slate-300">Accesați rapid cele mai importante module ale aplicației.</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${pricesStatus.configured ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                        <span className={`text-xs font-bold ${pricesStatus.configured ? 'text-green-300' : 'text-amber-300'}`}>
                            Status Prețuri: {pricesStatus.message}
                        </span>
                    </div>
                </div>
            </div>
            <Button onClick={handleExportBackup} variant="secondary" className="bg-green-700/80 hover:bg-green-600 border border-green-500/50 shadow-lg">
                <DownloadIcon className="w-5 h-5 mr-2" />
                Export Backup Complet (Excel)
            </Button>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {actionItems.map(item => (
          <ActionCard key={item.title} title={item.title} icon={item.icon} onClick={item.onClick} />
        ))}
      </div>
    </div>
  );
};