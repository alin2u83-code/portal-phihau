import React from 'react';
import { Sportiv, View, Plata, User, Rol, Permissions } from '../types';
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
import { RaportLunarPrezenta } from './RaportLunarPrezenta';
import { DebugPage } from './DebugPage';
import { AdminDashboard } from './AdminDashboard';
import AccessDenied from './AccessDenied';
import { Card } from './ui';

interface ViewRendererProps {
    activeView: View;
    setActiveView: (view: View) => void;
    currentUser: User;
    activeRole: Rol['nume'] | null;
    permissions: Permissions;
    filteredData: any;
    dataProvider: any;
    selectedSportiv: Sportiv | null;
    setSelectedSportiv: (s: Sportiv | null) => void;
    handleBackToDashboard: () => void;
    platiPentruIncasare: Plata[];
    handleIncaseazaMultiple: (plati: Plata[]) => void;
    handleJurnalBack: () => void;
    handleIncasareProcesata: () => void;
    handleSwitchRole: (role: any) => Promise<void>;
    isSwitchingRole: boolean;
    canSwitchRoles: boolean;
    userRoles: any[];
    activeRoleContext: any;
    allRoles: any[];
    clubs: any[];
    loading: boolean;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({
    activeView, setActiveView, currentUser, activeRole, permissions,
    filteredData, dataProvider, selectedSportiv, setSelectedSportiv,
    handleBackToDashboard, platiPentruIncasare, handleIncaseazaMultiple,
    handleJurnalBack, handleIncasareProcesata, handleSwitchRole,
    isSwitchingRole, canSwitchRoles, userRoles, activeRoleContext,
    allRoles, clubs, loading
}) => {
    const {
        setPlati, setSportivi, setSesiuniExamene, setInscrieriExamene,
        setAntrenamente, setGrupe, setTranzactii, setEvenimente, setRezultate, setFamilii,
        setAllRoles, setAnunturiPrezenta, setReduceri, setTipuriPlati, setLocatii, setClubs,
        setGrade, setTipuriAbonament, setDeconturiFederatie, setIstoricGrade
    } = dataProvider;

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
            return renderProtected(<AdminConsole onBack={handleBackToDashboard} currentUser={currentUser} userRoles={userRoles} activeRoleContext={activeRoleContext} sportivi={filteredData.sportivi} allRoles={allRoles} clubs={clubs} permissions={permissions} />, permissions.hasAdminAccess || isEmergencyAdmin);

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
                if (filteredData.sportivi.length === 0 && !isEmergencyAdmin && !loading) {
                    return <Card className="text-center p-8"><p className="text-slate-400 italic">Așteptare autorizare date sau nu există date pentru contextul selectat...</p></Card>
                }
                return (
                    <div className="space-y-8 animate-fade-in-down">
                        <header><h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1><p className="text-slate-400">Selectează un modul pentru a începe.</p></header>
                        <AdminMasterMap onNavigate={setActiveView} deconturiFederatie={filteredData.deconturiFederatie} inscrieriExamene={filteredData.inscrieriExamene} plati={filteredData.plati} />
                    </div>
                );
            }
            return <SportivDashboard currentUser={currentUser} viewedUser={currentUser} participari={filteredData.inscrieriExamene} examene={dataProvider.sesiuniExamene} grade={dataProvider.grade} istoricGrade={filteredData.istoricGrade} grupe={filteredData.grupe} plati={filteredData.plati} onNavigate={(view) => setActiveView(view)} antrenamente={filteredData.antrenamente} anunturi={dataProvider.anunturiPrezenta} setAnunturi={setAnunturiPrezenta} sportivi={filteredData.sportivi} permissions={permissions} canSwitchRoles={canSwitchRoles} activeRole={activeRole!} onSwitchRole={handleSwitchRole} isSwitchingRole={isSwitchingRole} />;

        case 'sportivi':
            return renderProtected(<SportiviManagement onBack={handleBackToDashboard} sportivi={filteredData.sportivi} setSportivi={setSportivi} grupe={filteredData.grupe} setGrupe={setGrupe} tipuriAbonament={filteredData.tipuriAbonament} familii={filteredData.familii} setFamilii={setFamilii} currentUser={currentUser} plati={filteredData.plati} setPlati={setPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} onViewSportiv={onViewSportiv} clubs={clubs} grade={dataProvider.grade} permissions={permissions} allRoles={allRoles} setAllRoles={setAllRoles} vizualizarePlati={filteredData.vizualizarePlati} loading={loading} />, isAtLeastInstructor);

        case 'profil-sportiv':
            return renderProtected(selectedSportiv ? <UserProfile sportiv={selectedSportiv} currentUser={currentUser} participari={filteredData.inscrieriExamene} examene={dataProvider.sesiuniExamene} grade={dataProvider.grade} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} antrenamente={filteredData.antrenamente} plati={filteredData.plati} tranzactii={filteredData.tranzactii} reduceri={filteredData.reduceri} grupe={filteredData.grupe} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} setSportivi={setSportivi} setPlati={setPlati} setTranzactii={setTranzactii} onBack={() => setActiveView('sportivi')} clubs={clubs} vizualizarePlati={filteredData.vizualizarePlati} sportivi={filteredData.sportivi} /> : null, isAtLeastInstructor);

        case 'structura-federatie':
            return renderProtected(<FederationStructure clubs={clubs} sportivi={dataProvider.sportivi} grupe={dataProvider.grupe} onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} />, isFederationAdmin);

        case 'examene': {
            const canManageExams = permissions.canGradeStudents;
            return <GestiuneExamene onBack={handleBackToDashboard} currentUser={currentUser} clubs={clubs} onNavigate={(view) => setActiveView(view)} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={dataProvider.grade} istoricGrade={dataProvider.istoricGrade} locatii={dataProvider.locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={dataProvider.preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={onViewSportiv} isReadOnly={!canManageExams} loading={loading} />;
        }

        case 'stagii': case 'competitii':
            return renderProtected(<StagiiCompetitiiManagement onBack={handleBackToDashboard} type={activeView === 'stagii' ? 'Stagiu' : 'Competitie'} evenimente={filteredData.evenimente} setEvenimente={setEvenimente} rezultate={filteredData.rezultate} setRezultate={setRezultate} sportivi={filteredData.sportivi} preturiConfig={dataProvider.preturiConfig} inscrieriExamene={filteredData.inscrieriExamene} examene={filteredData.sesiuniExamene} grade={dataProvider.grade} setPlati={setPlati} currentUser={currentUser} permissions={permissions} />, permissions.isInstructor);

        case 'prezenta':
            return renderProtected(<PrezentaManagement onBack={handleBackToDashboard} currentUser={currentUser} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);

        case 'prezenta-instructor':
            return renderProtected(<InstructorPrezentaPage onBack={handleBackToDashboard} onNavigate={setActiveView} allClubSportivi={filteredData.sportivi} currentUser={currentUser} grade={dataProvider.grade} onViewSportiv={onViewSportiv} />, permissions.isInstructor);

        case 'arhiva-prezente':
            return renderProtected(<ArhivaPrezente onBack={() => setActiveView('prezenta-instructor')} />, permissions.isInstructor);

        case 'raport-activitate':
            return renderProtected(<RaportActivitate onBack={handleBackToDashboard} currentUser={currentUser} />, permissions.isInstructor);

        case 'raport-lunar-prezenta':
            return renderProtected(<RaportLunarPrezenta onBack={handleBackToDashboard} sportivi={filteredData.sportivi} grupe={filteredData.grupe} antrenamente={filteredData.antrenamente} grade={dataProvider.grade} />, isAtLeastInstructor);

        case 'grupe':
            return renderProtected(<GrupeManagement onBack={handleBackToDashboard} grupe={filteredData.grupe} setGrupe={setGrupe} currentUser={currentUser} clubs={clubs} sportivi={filteredData.sportivi} />, isAtLeastInstructor);

        case 'activitati':
            return renderProtected(<ProgramareActivitati onBack={handleBackToDashboard} antrenamente={filteredData.antrenamente} setAntrenamente={setAntrenamente} grupe={filteredData.grupe} />, isAtLeastInstructor);

        case 'raport-prezenta':
            return renderProtected(<RaportPrezenta antrenamente={filteredData.antrenamente} sportivi={filteredData.sportivi} grupe={filteredData.grupe} onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} />, isAtLeastInstructor);

        case 'calendar':
            return <CalendarView onBack={handleBackToDashboard} antrenamente={filteredData.antrenamente} sesiuniExamene={filteredData.sesiuniExamene} evenimente={filteredData.evenimente} grupe={filteredData.grupe} locatii={dataProvider.locatii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser} sportivi={filteredData.sportivi} rezultate={filteredData.rezultate} setRezultate={setRezultate} plati={filteredData.plati} setPlati={setPlati} preturiConfig={dataProvider.preturiConfig} permissions={permissions} />;

        case 'financial-dashboard':
            return renderProtected(<FinancialDashboard onBack={handleBackToDashboard} plati={filteredData.plati} tranzactii={filteredData.tranzactii} sportivi={filteredData.sportivi} familii={filteredData.familii} />, isAtLeastClubAdmin);

        case 'gestiune-facturi':
            return renderProtected(<GestiuneFacturi onBack={handleBackToDashboard} currentUser={currentUser} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} tipuriPlati={dataProvider.tipuriPlati} familii={filteredData.familii} />, canManageFinances);

        case 'deconturi-federatie':
            return renderProtected(<FederationInvoices onBack={handleBackToDashboard} deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} currentUser={currentUser} permissions={permissions} />, isAtLeastClubAdmin);

        case 'plati-scadente':
            return renderProtected(<PlatiScadente plati={filteredData.plati} inscrieriExamene={filteredData.inscrieriExamene} grade={dataProvider.grade} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} tranzactii={filteredData.tranzactii} reduceri={filteredData.reduceri} onIncaseazaMultiple={handleIncaseazaMultiple} onViewSportiv={onViewSportiv} currentUser={currentUser} clubs={clubs} permissions={permissions} onBack={handleBackToDashboard} />, canManageFinances);

        case 'jurnal-incasari':
            return renderProtected(<JurnalIncasari currentUser={currentUser} plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} preturiConfig={dataProvider.preturiConfig} tipuriAbonament={filteredData.tipuriAbonament} tipuriPlati={dataProvider.tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} platiInitiale={platiPentruIncasare} onIncasareProcesata={handleIncasareProcesata} onBack={handleJurnalBack} reduceri={filteredData.reduceri} />, canManageFinances);

        case 'raport-financiar':
            return renderProtected(<RaportFinanciar onBack={handleBackToDashboard} plati={filteredData.plati} sportivi={filteredData.sportivi} familii={filteredData.familii} tranzactii={filteredData.tranzactii} />, isAtLeastClubAdmin);

        case 'user-management':
            return renderProtected(<UserManagement onBack={handleBackToDashboard} sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser} allRoles={allRoles} setAllRoles={setAllRoles} clubs={clubs} permissions={permissions} />, isAtLeastClubAdmin);

        case 'cluburi':
            return renderProtected(<CluburiManagement onBack={handleBackToDashboard} clubs={clubs} setClubs={setClubs} currentUser={currentUser} permissions={permissions} />, isFederationAdmin);

        case 'data-maintenance':
            return renderProtected(<BackupManager onBack={handleBackToDashboard} onDataRestored={() => window.location.reload()} sportivi={dataProvider.sportivi} setSportivi={setSportivi} grade={dataProvider.grade} preturiConfig={dataProvider.preturiConfig} participari={filteredData.inscrieriExamene} examene={filteredData.sesiuniExamene} plati={filteredData.plati} setPlati={setPlati} familii={filteredData.familii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser} />, isFederationAdmin);

        case 'rapoarte-examen':
            return renderProtected(<RapoarteExamen onBack={handleBackToDashboard} currentUser={currentUser} clubs={clubs} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={dataProvider.grade} locatii={dataProvider.locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={dataProvider.preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} onViewSportiv={onViewSportiv} />, permissions.isInstructor);

        case 'setari-club':
            return renderProtected(<ClubSettings onBack={handleBackToDashboard} />, isAtLeastClubAdmin);

        case 'tipuri-abonament':
            return renderProtected(<TipuriAbonamentManagement onBack={handleBackToDashboard} tipuriAbonament={filteredData.tipuriAbonament} setTipuriAbonament={setTipuriAbonament} currentUser={currentUser} clubs={clubs} />, isAtLeastClubAdmin);

        case 'configurare-preturi':
            return renderProtected(<ConfigurarePreturi grade={dataProvider.grade} onBack={handleBackToDashboard} />, isAtLeastClubAdmin);

        case 'grade':
            return renderProtected(<GradeManagement grade={dataProvider.grade} setGrade={setGrade} onBack={handleBackToDashboard} />, isAtLeastClubAdmin);

        case 'reduceri':
            return renderProtected(<ReduceriManagement onBack={handleBackToDashboard} reduceri={filteredData.reduceri} setReduceri={setReduceri} />, isAtLeastClubAdmin);

        case 'nomenclatoare':
            return renderProtected(<GestionareNomenclatoare onBack={handleBackToDashboard} tipuriPlati={dataProvider.tipuriPlati} setTipuriPlati={setTipuriPlati} plati={filteredData.plati} />, isAtLeastClubAdmin);

        case 'familii':
            return renderProtected(<FamiliiManagement onBack={handleBackToDashboard} familii={filteredData.familii} setFamilii={setFamilii} sportivi={filteredData.sportivi} setSportivi={setSportivi} tipuriAbonament={filteredData.tipuriAbonament} grupe={filteredData.grupe} currentUser={currentUser} />, isAtLeastInstructor);

        case 'notificari':
            return renderProtected(<Notificari onBack={handleBackToDashboard} currentUser={currentUser} />, isAtLeastInstructor);

        case 'taxe-anuale':
            return renderProtected(<TaxeAnuale onBack={handleBackToDashboard} currentUser={currentUser} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} />, isAtLeastClubAdmin);

        case 'istoric-prezenta':
            return <MartialAttendance onBack={handleBackToDashboard} currentUser={currentUser} antrenamente={dataProvider.antrenamente} grupe={dataProvider.grupe} />;

        case 'istoric-plati':
            return <IstoricPlati onBack={handleBackToDashboard} viewedUser={currentUser} istoricPlatiDetaliat={filteredData.istoricPlatiDetaliat} />;

        case 'account-settings':
            return <AccountSettings onBack={handleBackToDashboard} currentUser={currentUser} userRoles={userRoles} setCurrentUser={dataProvider.setCurrentUser} setSportivi={setSportivi} />;

        case 'fisa-digitala':
            return <FisaDigitalaSportiv onBack={handleBackToDashboard} currentUser={currentUser} grade={dataProvider.grade} participari={filteredData.inscrieriExamene} examene={filteredData.sesiuniExamene} plati={filteredData.plati} />;

        case 'fisa-competitie':
            return <FisaCompetitie onBack={handleBackToDashboard} currentUser={currentUser} grade={dataProvider.grade} participari={filteredData.inscrieriExamene} examene={filteredData.sesiuniExamene} />;

        case 'backdoor-check':
            return <BackdoorCheck onBack={handleBackToDashboard} currentUser={currentUser} />;

        case 'backdoor-test':
            return <BackdoorTest onBack={handleBackToDashboard} currentUser={currentUser} activeRole={activeRole!} userRoles={userRoles} />;

        default:
            return <div>Lipsește Vizualizarea</div>;
    }
};
