import React, { Suspense, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { View, Sportiv, Plata } from '../types';
import * as Lazy from './LazyComponents';
import AccessDenied from './AccessDenied';
import { MandatoryPasswordChange } from './MandatoryPasswordChange';
import { Card } from './ui';
import { MartialArtsSkeleton } from './MartialArtsSkeleton';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';

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

    // Scroll to top on page navigation; preserve position during saves (same view re-renders)
    const prevViewRef = useRef<View | null>(null);
    useEffect(() => {
        if (prevViewRef.current !== null && prevViewRef.current !== activeView) {
            // Cross-browser / cross-OS: both window and documentElement
            try {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
            } catch {
                window.scrollTo(0, 0);
            }
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0; // Safari fallback
        }
        prevViewRef.current = activeView;
    }, [activeView]);

    const handleIncaseazaMultiple = (platiSelectate: Plata[]) => {
        setPlatiPentruIncasare(platiSelectate);
        setActiveView('jurnal-incasari');
    };

    const { goBack, canGoBack } = useNavigation();
    const handleJurnalBack = () => {
        setPlatiPentruIncasare([]);
        if (canGoBack) {
            goBack();
        } else {
            setActiveView('plati-scadente');
        }
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

    const [sportivIdPentruRaport, setSportivIdPentruRaport] = useState<string | null>(null);

    const isAtLeastInstructor = permissions.isFederationAdmin || permissions.isAdminClub || permissions.isInstructor;
    const isAtLeastClubAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
    const isFederationAdmin = permissions.isFederationAdmin;
    const canManageFinances = permissions.canManageFinances;
    const onViewSportiv = (s: Sportiv) => { setSelectedSportiv(s); setActiveView('profil-sportiv'); };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
            >
                <Suspense fallback={<MartialArtsSkeleton count={5} />}>
                    {(() => {
                        switch (activeView) {
                            case 'legitimatii':
                                return renderProtected(<Lazy.LegitimatiiPage />, isAtLeastClubAdmin);
                            case 'import-sportivi':
                                return renderProtected(<Lazy.ImportSportiviPage onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
                            case 'istoric-activitate':
                                return renderProtected(<Lazy.IstoricActivitate onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'deduplicare-sportivi':
                                return renderProtected(<Lazy.DeduplicareSportivi onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
                            case 'admin-console':
                                return renderProtected(<Lazy.AdminConsole onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={userRoles} activeRoleContext={activeRoleContext} sportivi={filteredData.sportivi} allRoles={allRoles} clubs={clubs} permissions={permissions} />, permissions.hasAdminAccess || isEmergencyAdmin);
                            case 'federation-dashboard':
                                return renderProtected(<Lazy.FederationDashboard onNavigate={setActiveView} />, isFederationAdmin);
                            case 'admin-dashboard':
                                return renderProtected(<Lazy.AdminDashboard onNavigate={setActiveView} />, isFederationAdmin);
                            case 'dashboard':
                            case 'my-portal':
                                if (permissions.isFederationLevel) {
                                    return <Lazy.FederationDashboard onNavigate={setActiveView} />;
                                }
                                if (permissions.hasAdminAccess && activeRole !== 'SPORTIV') {
                                    if (sportivi.length === 0 && !isEmergencyAdmin && !loading) {
                                        return <Card className="text-center p-8"><p className="text-slate-400 italic">Așteptare autorizare date sau nu există date pentru contextul selectat...</p></Card>
                                    }
                                    return (
                                        <div className="space-y-6 animate-fade-in-down">
                                            <header>
                                                <h1 className="text-2xl font-bold text-white">Bună ziua{currentUser?.nume ? `, ${currentUser.nume}` : ''}!</h1>
                                                <p className="text-slate-400 text-sm">Ce facem azi?</p>
                                            </header>
                                            <Lazy.AdminMasterMap onNavigate={setActiveView} deconturiFederatie={filteredData.deconturiFederatie} inscrieriExamene={filteredData.inscrieriExamene} plati={filteredData.plati} currentUser={currentUser ?? null} />
                                        </div>
                                    );
                                }
                                return <Lazy.SportivDashboard currentUser={currentUser!} viewedUser={currentUser!} participari={filteredData.inscrieriExamene} examene={sesiuniExamene} grade={grade} istoricGrade={filteredData.istoricGrade} grupe={filteredData.grupe} plati={filteredData.plati} onNavigate={(view) => setActiveView(view)} antrenamente={filteredData.antrenamente} anunturi={anunturiPrezenta} setAnunturi={setAnunturiPrezenta} sportivi={filteredData.sportivi} permissions={permissions} canSwitchRoles={canSwitchRoles} activeRole={activeRole!} onSwitchRole={handleSwitchRole} isSwitchingRole={isSwitchingRole} />;
                            
                            case 'sportivi':
                                return renderProtected(<Lazy.SportiviManagement onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} permissions={permissions} />, isAtLeastInstructor);
                            case 'profil-sportiv': {
                                const currentSportiv = selectedSportiv
                                    ? (filteredData.sportivi.find(s => s.id === selectedSportiv.id) || selectedSportiv)
                                    : null;
                                return renderProtected(currentSportiv ? <Lazy.UserProfile sportiv={currentSportiv} onBack={() => setActiveView('sportivi')} onNavigate={setActiveView} onViewExameneRaport={(id) => { setSportivIdPentruRaport(id); setActiveView('rapoarte-examen'); }} onViewSportiv={onViewSportiv} /> : null, isAtLeastInstructor);
                            }
                            case 'structura-federatie':
                                return renderProtected(<Lazy.FederationStructure clubs={clubs} sportivi={sportivi} grupe={grupe} onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} />, isFederationAdmin);
                            case 'examene': {
                                const canManageExams = permissions.canGradeStudents;
                                return <Lazy.GestiuneExamene onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} onViewSportiv={onViewSportiv} isReadOnly={!canManageExams} />;
                            }
                            case 'stagii':
                                return renderProtected(<Lazy.StagiiManagement onBack={handleBackToDashboard} permissions={permissions}/>, permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin || permissions.isSuperAdmin);
                            case 'competitii':
                                return renderProtected(<Lazy.CompetitiiManagement onBack={handleBackToDashboard} permissions={permissions}/>, permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin || permissions.isSuperAdmin);
                            case 'prezenta':
                                return renderProtected(<Lazy.PrezentaManagement onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);
                            case 'prezenta-instructor':
                                return renderProtected(<Lazy.InstructorPrezentaPage onBack={handleBackToDashboard} onNavigate={setActiveView} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
                            case 'arhiva-prezente':
                                return renderProtected(<Lazy.ArhivaPrezente onBack={() => setActiveView('prezenta-instructor')} />, permissions.isInstructor);
                            case 'raport-activitate':
                                return renderProtected(<Lazy.RaportActivitate onBack={handleBackToDashboard} />, permissions.isInstructor);
                            case 'raport-lunar-prezenta':
                                return renderProtected(<Lazy.RaportLunarPrezenta onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'program-antrenamente':
                                return renderProtected(<Lazy.ProgramAntrenamenteManagement onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'rapoarte':
                                return renderProtected(<Lazy.ReportsDashboard onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'grupe':
                                return renderProtected(<Lazy.GrupeManagement onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'activitati':
                                return renderProtected(<Lazy.ProgramareActivitati onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'raport-prezenta':
                                return renderProtected(<Lazy.RaportPrezenta onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'calendar':
                                return <Lazy.CalendarView onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} permissions={permissions} />;
                            case 'financial-dashboard':
                                return renderProtected(<Lazy.FinancialDashboard onBack={handleBackToDashboard} plati={filteredData.plati} tranzactii={filteredData.tranzactii} sportivi={filteredData.sportivi} familii={filteredData.familii} />, isAtLeastClubAdmin);
                            case 'gestiune-facturi':
                                return renderProtected(<Lazy.GestiuneFacturi onBack={handleBackToDashboard} currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} setTranzactii={setTranzactii} tipuriPlati={tipuriPlati} familii={filteredData.familii} onViewSportiv={onViewSportiv} />, canManageFinances);
                            case 'deconturi-federatie':
                                return renderProtected(<Lazy.FederationInvoices onBack={handleBackToDashboard} deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} currentUser={currentUser!} permissions={permissions} />, isAtLeastClubAdmin);
                            case 'plati-scadente':
                                return renderProtected(<Lazy.PlatiScadente onIncaseazaMultiple={handleIncaseazaMultiple} onViewSportiv={onViewSportiv} permissions={permissions} onBack={handleBackToDashboard} />, canManageFinances);
                            case 'jurnal-incasari':
                                return renderProtected(<Lazy.JurnalIncasari currentUser={currentUser!} permissions={permissions} plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} preturiConfig={preturiConfig} tipuriAbonament={filteredData.tipuriAbonament} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} platiInitiale={platiPentruIncasare} onIncasareProcesata={handleIncasareProcesata} onBack={handleJurnalBack} reduceri={reduceri} onViewSportiv={onViewSportiv} />, canManageFinances);
                            case 'raport-financiar':
                                return renderProtected(<Lazy.RaportFinanciar onBack={handleBackToDashboard} istoricPlatiDetaliat={filteredData.istoricPlatiDetaliat} sportivi={filteredData.sportivi} familii={filteredData.familii} plati={filteredData.plati} setPlati={setPlati} setTranzactii={setTranzactii} onViewSportiv={onViewSportiv} />, isAtLeastClubAdmin);
                            case 'user-management':
                                return renderProtected(<Lazy.UserManagement onBack={handleBackToDashboard} sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser!} allRoles={allRoles} setAllRoles={setAllRoles} clubs={clubs} permissions={permissions} />, isAtLeastClubAdmin);
                            case 'cluburi':
                                return renderProtected(<Lazy.CluburiManagement onBack={handleBackToDashboard} clubs={clubs} setClubs={setClubs} currentUser={currentUser!} permissions={permissions} />, isFederationAdmin);
                            case 'data-maintenance':
                                return renderProtected(<Lazy.BackupManager onBack={handleBackToDashboard} onDataRestored={() => window.location.reload()} sportivi={sportivi} setSportivi={setSportivi} grade={grade} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} setPlati={setPlati} familii={familii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser!} />, isFederationAdmin);
                            case 'rapoarte-examen':
                                return renderProtected(<Lazy.RapoarteExamen onBack={() => { setSportivIdPentruRaport(null); setActiveView('rapoarte'); }} currentUser={currentUser!} clubs={clubs} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} onViewSportiv={onViewSportiv} initialSportivId={sportivIdPentruRaport} />, isAtLeastInstructor);
                            case 'setari-club':
                                return renderProtected(<Lazy.ClubSettings onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} setClubs={setClubs} />, isAtLeastClubAdmin);
                            case 'tipuri-abonament':
                                return renderProtected(<Lazy.TipuriAbonamentManagement onBack={handleBackToDashboard} tipuriAbonament={filteredData.tipuriAbonament} setTipuriAbonament={setTipuriAbonament} currentUser={currentUser!} clubs={clubs} activeRoleContext={activeRoleContext} permissions={permissions}/>, isAtLeastClubAdmin);
                            case 'configurare-preturi':
                                return renderProtected(<Lazy.ConfigurarePreturi grade={grade} onBack={handleBackToDashboard} />, permissions.isSuperAdmin);
                            case 'grade':
                                return renderProtected(<Lazy.GradeManagement grade={grade} setGrade={setGrade} onBack={handleBackToDashboard} canEdit={permissions.isSuperAdmin} />, isAtLeastClubAdmin);
                            case 'reduceri':
                                return renderProtected(<Lazy.ReduceriManagement onBack={handleBackToDashboard} reduceri={reduceri} setReduceri={setReduceri} />, isAtLeastClubAdmin);
                            case 'nomenclatoare':
                                return renderProtected(<Lazy.GestionareNomenclatoare onBack={handleBackToDashboard} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} plati={plati} />, isAtLeastClubAdmin);
                            case 'familii':
                                return renderProtected(<Lazy.FamiliiManagement onBack={handleBackToDashboard} familii={filteredData.familii} setFamilii={setFamilii} sportivi={filteredData.sportivi} setSportivi={setSportivi} tipuriAbonament={filteredData.tipuriAbonament} grupe={filteredData.grupe} currentUser={currentUser!} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);
                            case 'notificari':
                                return renderProtected(<Lazy.Notificari onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} grupe={filteredData.grupe} permissions={permissions} />, isAtLeastInstructor);
                            case 'taxe-anuale':
                                return renderProtected(<Lazy.TaxeAnuale onBack={handleBackToDashboard} currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} />, permissions.isSuperAdmin);
                            case 'istoric-prezenta':
                                return <Lazy.MartialAttendance onBack={handleBackToDashboard} currentUser={currentUser!} />;
                            case 'istoric-plati':
                                return <Lazy.IstoricPlati onBack={handleBackToDashboard} viewedUser={currentUser!} plati={filteredData.plati} tranzactii={filteredData.tranzactii} />;
                            case 'account-settings':
                                return <Lazy.AccountSettings onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={userRoles} setCurrentUser={setCurrentUser} setSportivi={setSportivi} />;
                            case 'fisa-digitala':
                                return <Lazy.FisaDigitalaSportiv onBack={handleBackToDashboard} currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} />;
                            case 'fisa-competitie':
                                return <Lazy.FisaCompetitie onBack={handleBackToDashboard} currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} />;
                            case 'backdoor-check':
                                return <Lazy.BackdoorCheck onBack={handleBackToDashboard} currentUser={currentUser!} />;
                            case 'backdoor-test':
                                return <Lazy.BackdoorTest onBack={handleBackToDashboard} currentUser={currentUser!} activeRole={activeRole!} userRoles={userRoles} />;
                            case 'debug':
                                return <Lazy.DebugPage />;
                            default:
                                return <div>Lipsește Vizualizarea</div>;
                        }
                    })()}
                </Suspense>
            </motion.div>
        </AnimatePresence>
    );
};

