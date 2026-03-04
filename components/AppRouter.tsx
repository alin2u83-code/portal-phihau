import React from 'react';
import { View, Sportiv, Plata } from '../types';
import { SportiviManagement } from './SportiviManagement';
import { UserProfile } from './UserProfile';
import { GestiuneExamene } from './GestiuneExamene';
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
import { useData } from '../contexts/DataContext';

export interface AppRouterProps {
    activeView: View;
    setActiveView: (view: View) => void;
    currentUser: any;
    userRoles: any;
    activeRoleContext: any;
    permissions: any;
    activeRole: any;
    selectedSportiv: Sportiv | null;
    setSelectedSportiv: (s: Sportiv | null) => void;
    platiPentruIncasare: Plata[];
    setPlatiPentruIncasare: (plati: Plata[]) => void;
    handleBackToDashboard: () => void;
    handleSwitchRole: (role: any) => void;
    isSwitchingRole: boolean;
    canSwitchRoles: boolean;
    isEmergencyAdmin: boolean;
}

export const AppRouter: React.FC<AppRouterProps> = ({
    activeView, setActiveView, currentUser, userRoles, activeRoleContext, permissions, activeRole,
    selectedSportiv, setSelectedSportiv, platiPentruIncasare, setPlatiPentruIncasare,
    handleBackToDashboard, handleSwitchRole, isSwitchingRole, canSwitchRoles, isEmergencyAdmin
}) => {
    const {
        loading, sportivi, sesiuniExamene, inscrieriExamene, grade, istoricGrade,
        grupe, plati, tranzactii, evenimente, rezultate, preturiConfig, tipuriAbonament,
        familii, allRoles, reduceri, tipuriPlati, locatii, clubs,
        deconturiFederatie, setPlati, setSportivi, setSesiuniExamene, setInscrieriExamene,
        setGrupe, setTranzactii, setEvenimente, setRezultate, setFamilii,
        setAllRoles, setReduceri, setTipuriPlati, setLocatii, setClubs,
        setGrade, setTipuriAbonament, setDeconturiFederatie, setIstoricGrade,
        filteredData, antrenamente, setAntrenamente, anunturiPrezenta, setAnunturiPrezenta, setCurrentUser
    } = useData();

    const handleIncaseazaMultiple = (platiSelectate: Plata[]) => {
        setPlatiPentruIncasare(platiSelectate);
        setActiveView('jurnal-incasari');
    };

    const handleJurnalBack = () => {
        const previousView = platiPentruIncasare.length > 0 ? 'plati-scadente' : 'dashboard';
        setPlatiPentruIncasare([]);
        setActiveView(previousView);
    };

    const handleIncasareProcesata = () => {
        setPlatiPentruIncasare([]);
    };

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

    switch (activeView) {
        case 'debug':
            return <DebugPage />;

        case 'admin-console':
            return renderProtected(<AdminConsole onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={userRoles} activeRoleContext={activeRoleContext} sportivi={filteredData.sportivi} allRoles={allRoles} clubs={clubs} permissions={permissions} />, permissions.hasAdminAccess || isEmergencyAdmin);

        case 'federation-dashboard':
            return renderProtected(<FederationDashboard onNavigate={setActiveView} />, isFederationAdmin);

        case 'admin-dashboard':
            return renderProtected(<AdminDashboard onNavigate={setActiveView} />, isFederationAdmin);

        case 'dashboard':
        case 'my-portal':
            if (permissions.isFederationLevel) {
                return <FederationDashboard onNavigate={setActiveView} />;
            }
            if (permissions.hasAdminAccess && activeRole !== 'SPORTIV') {
                if (sportivi.length === 0 && !isEmergencyAdmin && !loading) {
                    return <Card className="text-center p-8"><p className="text-slate-400 italic">Așteptare autorizare date sau nu există date pentru contextul selectat...</p></Card>
                }
                return (
                    <div className="space-y-8 animate-fade-in-down">
                        <header><h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1><p className="text-slate-400">Selectează un modul pentru a începe.</p></header>
                        <AdminMasterMap onNavigate={setActiveView} deconturiFederatie={filteredData.deconturiFederatie} inscrieriExamene={filteredData.inscrieriExamene} plati={filteredData.plati} />
                    </div>
                );
            }
            return <SportivDashboard currentUser={currentUser!} viewedUser={currentUser!} participari={filteredData.inscrieriExamene} examene={sesiuniExamene} grade={grade} istoricGrade={filteredData.istoricGrade} grupe={filteredData.grupe} plati={filteredData.plati} onNavigate={(view) => setActiveView(view)} antrenamente={filteredData.antrenamente} anunturi={anunturiPrezenta} setAnunturi={setAnunturiPrezenta} sportivi={filteredData.sportivi} permissions={permissions} canSwitchRoles={canSwitchRoles} activeRole={activeRole!} onSwitchRole={handleSwitchRole} isSwitchingRole={isSwitchingRole} />;
        
        case 'sportivi':
            return renderProtected(<SportiviManagement onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} permissions={permissions} />, isAtLeastInstructor);

        case 'profil-sportiv':
            return renderProtected(selectedSportiv ? <UserProfile sportiv={selectedSportiv} onBack={() => setActiveView('sportivi')} /> : null, isAtLeastInstructor);

        case 'structura-federatie':
            return renderProtected(<FederationStructure clubs={clubs} sportivi={sportivi} grupe={grupe} onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} />, isFederationAdmin);

        case 'examene': {
            const canManageExams = permissions.canGradeStudents;
            return <GestiuneExamene onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} onViewSportiv={onViewSportiv} isReadOnly={!canManageExams} />;
        }
            
        case 'stagii': case 'competitii':
            return renderProtected(<StagiiCompetitiiManagement onBack={handleBackToDashboard} type={activeView === 'stagii' ? 'Stagiu' : 'Competitie'} permissions={permissions}/>, permissions.isInstructor);

        case 'prezenta':
            return renderProtected(<PrezentaManagement onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);
        
        case 'prezenta-instructor':
            return renderProtected(<InstructorPrezentaPage onBack={handleBackToDashboard} onNavigate={setActiveView} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
        
        case 'arhiva-prezente':
            return renderProtected(<ArhivaPrezente onBack={() => setActiveView('prezenta-instructor')} />, permissions.isInstructor);
            
        case 'raport-activitate':
            return renderProtected(<RaportActivitate onBack={handleBackToDashboard} />, permissions.isInstructor);
        
        case 'raport-lunar-prezenta':
            return renderProtected(<RaportLunarPrezenta onBack={handleBackToDashboard} />, isAtLeastInstructor);

        case 'grupe':
            return renderProtected(<GrupeManagement onBack={handleBackToDashboard} />, isAtLeastInstructor);

        case 'activitati':
            return renderProtected(<ProgramareActivitati onBack={handleBackToDashboard} />, isAtLeastInstructor);

        case 'raport-prezenta':
            return renderProtected(<RaportPrezenta onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} />, isAtLeastInstructor);

        case 'calendar':
            return <CalendarView onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} permissions={permissions} />;

        case 'financial-dashboard':
            return renderProtected(<FinancialDashboard onBack={handleBackToDashboard} plati={filteredData.plati} tranzactii={filteredData.tranzactii} sportivi={filteredData.sportivi} familii={filteredData.familii} />, isAtLeastClubAdmin);

        case 'gestiune-facturi':
            return renderProtected(<GestiuneFacturi onBack={handleBackToDashboard} currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} tipuriPlati={tipuriPlati} familii={filteredData.familii} />, canManageFinances);

        case 'deconturi-federatie':
            return renderProtected(<FederationInvoices onBack={handleBackToDashboard} deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} currentUser={currentUser!} permissions={permissions} />, isAtLeastClubAdmin);

        case 'plati-scadente':
            return renderProtected(<PlatiScadente onIncaseazaMultiple={handleIncaseazaMultiple} onViewSportiv={onViewSportiv} permissions={permissions} onBack={handleBackToDashboard} />, canManageFinances);

        case 'jurnal-incasari':
            return renderProtected(<JurnalIncasari currentUser={currentUser!} permissions={permissions} plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} preturiConfig={preturiConfig} tipuriAbonament={filteredData.tipuriAbonament} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} platiInitiale={platiPentruIncasare} onIncasareProcesata={handleIncasareProcesata} onBack={handleJurnalBack} reduceri={reduceri} />, canManageFinances);

        case 'raport-financiar':
            return renderProtected(<RaportFinanciar onBack={handleBackToDashboard} plati={filteredData.plati} sportivi={filteredData.sportivi} familii={filteredData.familii} tranzactii={filteredData.tranzactii} />, isAtLeastClubAdmin);

        case 'user-management':
            return renderProtected(<UserManagement onBack={handleBackToDashboard} sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser!} allRoles={allRoles} setAllRoles={setAllRoles} clubs={clubs} permissions={permissions} />, isAtLeastClubAdmin);

        case 'cluburi':
            return renderProtected(<CluburiManagement onBack={handleBackToDashboard} clubs={clubs} setClubs={setClubs} currentUser={currentUser!} permissions={permissions} />, isFederationAdmin);
        
        case 'data-maintenance':
            return renderProtected(<BackupManager onBack={handleBackToDashboard} onDataRestored={() => window.location.reload()} sportivi={sportivi} setSportivi={setSportivi} grade={grade} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} setPlati={setPlati} familii={familii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser!} />, isFederationAdmin);
        
        case 'rapoarte-examen':
            return renderProtected(<RapoarteExamen onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
        
        case 'setari-club':
            return renderProtected(<ClubSettings onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} setClubs={setClubs} />, isAtLeastClubAdmin);
            
        case 'tipuri-abonament':
            return renderProtected(<TipuriAbonamentManagement onBack={handleBackToDashboard} tipuriAbonament={filteredData.tipuriAbonament} setTipuriAbonament={setTipuriAbonament} currentUser={currentUser!} clubs={clubs}/>, isAtLeastClubAdmin);

        case 'configurare-preturi':
            return renderProtected(<ConfigurarePreturi grade={grade} onBack={handleBackToDashboard} />, isAtLeastClubAdmin);

        case 'grade':
            return renderProtected(<GradeManagement grade={grade} setGrade={setGrade} onBack={handleBackToDashboard} />, isAtLeastClubAdmin);

        case 'reduceri':
            return renderProtected(<ReduceriManagement onBack={handleBackToDashboard} reduceri={reduceri} setReduceri={setReduceri} />, isAtLeastClubAdmin);
        
        case 'nomenclatoare':
            return renderProtected(<GestionareNomenclatoare onBack={handleBackToDashboard} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} plati={plati} />, isAtLeastClubAdmin);

        case 'familii':
            return renderProtected(<FamiliiManagement onBack={handleBackToDashboard} familii={filteredData.familii} setFamilii={setFamilii} sportivi={filteredData.sportivi} setSportivi={setSportivi} tipuriAbonament={filteredData.tipuriAbonament} grupe={filteredData.grupe} currentUser={currentUser!} />, isAtLeastInstructor);
            
        case 'notificari':
            return renderProtected(<Notificari onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} grupe={filteredData.grupe} />, isAtLeastInstructor);
        
        case 'taxe-anuale':
            return renderProtected(<TaxeAnuale onBack={handleBackToDashboard} currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} />, isAtLeastClubAdmin);

        case 'istoric-prezenta':
            return <MartialAttendance onBack={handleBackToDashboard} currentUser={currentUser!} />;

        case 'istoric-plati':
            return <IstoricPlati onBack={handleBackToDashboard} viewedUser={currentUser!} plati={filteredData.plati} tranzactii={filteredData.tranzactii} />;

        case 'account-settings':
            return <AccountSettings onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={userRoles} setCurrentUser={setCurrentUser} setSportivi={setSportivi} />;
        
        case 'fisa-digitala':
            return <FisaDigitalaSportiv onBack={handleBackToDashboard} currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} />;

        case 'fisa-competitie':
            return <FisaCompetitie onBack={handleBackToDashboard} currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} />;

        case 'backdoor-check':
            return <BackdoorCheck onBack={handleBackToDashboard} currentUser={currentUser!} />;
            
        case 'backdoor-test':
            return <BackdoorTest onBack={handleBackToDashboard} currentUser={currentUser!} activeRole={activeRole!} userRoles={userRoles} />;

        default:
            return <div>Lipsește Vizualizarea</div>;
    }
};
