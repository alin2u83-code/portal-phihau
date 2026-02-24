import React from 'react';
import { View, Sportiv, Rol, Permissions, Plata, VizualizarePlata, Club, Grad, SesiuneExamen, InscriereExamen, Antrenament, Grupa, Tranzactie, Eveniment, Rezultat, TipAbonament, Familie, Reducere, TipPlata, Locatie, DecontFederatie, IstoricGrade } from '../types';
import { SportiviManagement } from './SportiviManagement';
import { UserProfile } from './UserProfile';
import { GestiuneExamene } from './Examene';
import { GradeManagement } from './Grade';
import { PrezentaManagement } from './PrezentaManagement';
import { GrupeManagement } from './Grupe';
import { RaportPrezenta } from './RaportPrezenta';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';
import { PlatiScadente } from './PlatiScadente';
import { JurnalIncasari } from './JurnalIncasari';
import { TipuriAbonamentManagement } from './TipuriAbonament';
import { ConfigurarePreturi } from './ConfigurarePreturi';
import { RaportFinanciar } from './RaportFinanciar';
import { FamiliiManagement } from './Familii';
import { UserManagement } from './UserManagement';
import { BackupManager } from './BackupManager';
import { ProgramareActivitati } from './Activitati';
import { ClubSettings } from './ClubSettings';
import { DataInspector } from './DataInspector';
import { ReduceriManagement } from './Reduceri';
import { Notificari } from './Notificari';
import { TaxeAnuale } from './TaxeAnuale';
import { GestionareNomenclatoare } from './GestionareNomenclatoare';
import { FinancialDashboard } from './FinancialDashboard';
import { GestiuneFacturi } from './GestiuneFacturi';
import { IstoricPlati } from './FacturiPersonale';
import { CalendarView } from './CalendarView';
import { RapoarteExamen } from './RapoarteExamen';
import { CluburiManagement } from './CluburiManagement';
import { FederationStructure } from './FederationStructure';
import AccessDenied from './AccessDenied';
import { MandatoryPasswordChange } from './MandatoryPasswordChange';
import { FederationInvoices } from './FederationInvoices';
import { MartialAttendance } from './MartialAttendance';
import { AccountSettings } from './AccountSettings';
import { FederationDashboard } from './FederationDashboard';
import { FisaDigitalaSportiv } from './FisaDigitalaSportiv';
import { FisaCompetitie } from './FisaCompetitie';
import { InstructorPrezentaPage } from './InstructorPrezentaPage';
import { RaportActivitate } from './RaportActivitate';
import { BackdoorCheck } from './BackdoorCheck';
import { BackdoorTest } from './BackdoorTest';
import { AdminConsole } from './AdminConsole';
import { ArhivaPrezente } from './ArhivaPrezente';
import { AdminMasterMap } from './AdminMasterMap';
import { SportivDashboard } from './SportivDashboard';
import { Card } from './ui';
import { RaportLunarPrezenta } from './RaportLunarPrezenta';
import { DebugPage } from './DebugPage';
import { AdminDashboard } from './AdminDashboard';

interface AppRouterProps {
  activeView: View;
  currentUser: Sportiv;
  permissions: Permissions;
  sportivi: Sportiv[];
  sesiuniExamene: SesiuneExamen[];
  inscrieriExamene: InscriereExamen[];
  antrenamente: Antrenament[];
  grupe: Grupa[];
  plati: Plata[];
  tranzactii: Tranzactie[];
  evenimente: Eveniment[];
  rezultate: Rezultat[];
  tipuriAbonament: TipAbonament[];
  familii: Familie[];
  anunturiPrezenta: any[];
  reduceri: Reducere[];
  deconturiFederatie: DecontFederatie[];
  istoricGrade: IstoricGrade[];
  vizualizarePlati: VizualizarePlata[];
  grade: Grad[];
  allRoles: Rol[];
  clubs: Club[];
  locatii: Locatie[];
  tipuriPlati: TipPlata[];
  preturiConfig: any[];
  setSportivi: (sportivi: Sportiv[]) => void;
  setSesiuniExamene: (sesiuni: SesiuneExamen[]) => void;
  setInscrieriExamene: (inscrieri: InscriereExamen[]) => void;
  setAntrenamente: (antrenamente: Antrenament[]) => void;
  setGrupe: (grupe: Grupa[]) => void;
  setPlati: (plati: Plata[]) => void;
  setTranzactii: (tranzactii: Tranzactie[]) => void;
  setEvenimente: (evenimente: Eveniment[]) => void;
  setRezultate: (rezultate: Rezultat[]) => void;
  setFamilii: (familii: Familie[]) => void;
  setAllRoles: (roles: Rol[]) => void;
  setAnunturiPrezenta: (anunturi: any[]) => void;
  setReduceri: (reduceri: Reducere[]) => void;
  setTipuriPlati: (tipuri: TipPlata[]) => void;
  setLocatii: (locatii: Locatie[]) => void;
  setClubs: (clubs: Club[]) => void;
  setGrade: (grade: Grad[]) => void;
  setTipuriAbonament: (tipuri: TipAbonament[]) => void;
  setDeconturiFederatie: (deconturi: DecontFederatie[]) => void;
  setIstoricGrade: (istoric: IstoricGrade[]) => void;
  handleBackToDashboard: () => void;
  setActiveView: (view: View) => void;
  selectedSportiv: Sportiv | null;
  setSelectedSportiv: (sportiv: Sportiv | null) => void;
  handleIncaseazaMultiple: (plati: Plata[]) => void;
  platiPentruIncasare: Plata[];
  handleJurnalBack: () => void;
  handleIncasareProcesata: () => void;
  userRoles: any[];
  activeRoleContext: any;
  activeRole: Rol['nume'] | null;
  loading: boolean;
}

export const AppRouter: React.FC<AppRouterProps> = (props) => {
  const { activeView, currentUser, permissions, handleBackToDashboard, setActiveView, selectedSportiv, setSelectedSportiv } = props;

  if (currentUser && currentUser.trebuie_schimbata_parola) {
    return <MandatoryPasswordChange currentUser={currentUser} onPasswordChanged={() => {}} />;
  }

  const renderProtected = (view: React.ReactNode, hasAccess: boolean) => {
    return hasAccess ? view : <AccessDenied onBack={() => setActiveView('dashboard')} />;
  };

  const isAtLeastInstructor = permissions.isFederationAdmin || permissions.isAdminClub || permissions.isInstructor;
  const isAtLeastClubAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
  const isFederationAdmin = permissions.isFederationAdmin;
  const canManageFinances = permissions.canManageFinances;
  const onViewSportiv = (s: Sportiv) => { setSelectedSportiv(s); setActiveView('profil-sportiv'); };
  const isEmergencyAdmin = currentUser?.email === 'alin2u83@gmail.com';

  switch (activeView) {
    case 'debug':
      return <DebugPage />;

    case 'admin-console':
      return renderProtected(<AdminConsole onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={props.userRoles} activeRoleContext={props.activeRoleContext} sportivi={props.sportivi} allRoles={props.allRoles} clubs={props.clubs} permissions={permissions} />, permissions.hasAdminAccess || isEmergencyAdmin);

    case 'federation-dashboard':
      return renderProtected(<FederationDashboard onNavigate={setActiveView} />, isFederationAdmin);

    case 'admin-dashboard':
      return renderProtected(<AdminDashboard onNavigate={setActiveView} />, isFederationAdmin);

    case 'dashboard':
    case 'my-portal':
      if (permissions.isFederationLevel) {
        return <FederationDashboard onNavigate={setActiveView} />;
      }
      if (permissions.hasAdminAccess && props.activeRole !== 'SPORTIV') {
        if (props.sportivi.length === 0 && !isEmergencyAdmin && !props.loading) {
          return <Card className="text-center p-8"><p className="text-slate-400 italic">Așteptare autorizare date sau nu există date pentru contextul selectat...</p></Card>
        }
        return (
          <div className="space-y-8 animate-fade-in-down">
            <header><h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1><p className="text-slate-400">Selectează un modul pentru a începe.</p></header>
            <AdminMasterMap onNavigate={setActiveView} deconturiFederatie={props.deconturiFederatie} inscrieriExamene={props.inscrieriExamene} plati={props.plati} />
          </div>
        );
      }
      return <SportivDashboard currentUser={currentUser!} viewedUser={currentUser!} participari={props.inscrieriExamene} examene={props.sesiuniExamene} grade={props.grade} istoricGrade={props.istoricGrade} grupe={props.grupe} plati={props.plati} onNavigate={(view) => setActiveView(view)} antrenamente={props.antrenamente} anunturi={props.anunturiPrezenta} setAnunturi={props.setAnunturiPrezenta} sportivi={props.sportivi} permissions={permissions} canSwitchRoles={false} activeRole={props.activeRole!} onSwitchRole={() => {}} isSwitchingRole={false} />;

    case 'sportivi':
      return renderProtected(<SportiviManagement onBack={handleBackToDashboard} sportivi={props.sportivi} setSportivi={props.setSportivi} grupe={props.grupe} setGrupe={props.setGrupe} tipuriAbonament={props.tipuriAbonament} familii={props.familii} setFamilii={props.setFamilii} currentUser={currentUser!} plati={props.plati} setPlati={props.setPlati} tranzactii={props.tranzactii} setTranzactii={props.setTranzactii} onViewSportiv={onViewSportiv} clubs={props.clubs} grade={props.grade} permissions={permissions} allRoles={props.allRoles} setAllRoles={props.setAllRoles} vizualizarePlati={props.vizualizarePlati} loading={props.loading} />, isAtLeastInstructor);

    case 'profil-sportiv':
      return renderProtected(selectedSportiv ? <UserProfile sportiv={selectedSportiv} currentUser={currentUser!} participari={props.inscrieriExamene} examene={props.sesiuniExamene} grade={props.grade} istoricGrade={props.istoricGrade} setIstoricGrade={props.setIstoricGrade} antrenamente={props.antrenamente} plati={props.plati} tranzactii={props.tranzactii} reduceri={props.reduceri} grupe={props.grupe} familii={props.familii} tipuriAbonament={props.tipuriAbonament} setSportivi={props.setSportivi} setPlati={props.setPlati} setTranzactii={props.setTranzactii} onBack={() => setActiveView('sportivi')} clubs={props.clubs} vizualizarePlati={props.vizualizarePlati} sportivi={props.sportivi} /> : null, isAtLeastInstructor);

    default:
      return <div>Lipsește Vizualizarea</div>;
  }
};
