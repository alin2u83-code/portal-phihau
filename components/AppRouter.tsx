import React, { Suspense, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { View, Sportiv, Plata } from '../types';
import * as Lazy from './LazyComponents';
import AccessDenied from './AccessDenied';
import { MandatoryPasswordChange } from './MandatoryPasswordChange';
import { OnboardingCompletare } from './OnboardingCompletare';
import { SetupMFAPage } from './SetupMFAPage';
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
        decontSportivi, setDecontSportivi,
        filteredData, antrenamente, setAntrenamente, anunturiPrezenta, setAnunturiPrezenta, setCurrentUser
    } = useData();

    // Scroll to top on page navigation; preserve position during saves (same view re-renders)
    // Excepție: revenire din profil-sportiv → sportivi păstrează scroll-ul (restaurat de Sportivi.tsx)
    const prevViewRef = useRef<View | null>(null);
    useEffect(() => {
        if (prevViewRef.current !== null && prevViewRef.current !== activeView) {
            const isBackFromProfile =
                prevViewRef.current === 'profil-sportiv' && activeView === 'sportivi';
            if (!isBackFromProfile) {
                try {
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
                } catch {
                    window.scrollTo(0, 0);
                }
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0; // Safari fallback
            }
        }
        prevViewRef.current = activeView;
    }, [activeView]);

    // Faza 31 (31-08): logica fluxului de încasare multiplă (F1-F4) și a
    // navigării hub-ului "Plăți & Facturi" a fost mutată în
    // components/Plati/hub/PlatiHub.tsx. `goBack`/`canGoBack` rămân folosite
    // aici de vederea 'profil-sportiv'.
    const { goBack, canGoBack } = useNavigation();

    // Hook-urile trebuie declarate necondiționat, înaintea oricărui return
    // timpuriu (Rules of Hooks) — altfel o schimbare a trebuie_schimbata_parola
    // fără remount produce „Rendered fewer hooks than during the previous
    // render" (CR-03, 26-REVIEW.md).
    const [sportivIdPentruRaport, setSportivIdPentruRaport] = useState<string | null>(null);
    const [sportivProfilTab, setSportivProfilTab] = useState<'profil' | 'contact' | 'grade' | 'financiar' | 'familie' | 'grupe-istoric' | undefined>(undefined);

    if (currentUser && currentUser.email?.endsWith('@frqkd.ro')) {
        return <OnboardingCompletare currentUser={currentUser} onCompleted={() => window.location.reload()} />;
    }

    if (currentUser && currentUser.trebuie_schimbata_parola) {
        return <MandatoryPasswordChange currentUser={currentUser} onPasswordChanged={() => window.location.reload()} />;
    }

    const renderProtected = (view: React.ReactNode, hasAccess: boolean) => {
        return hasAccess ? view : <AccessDenied onBack={() => setActiveView('dashboard')} />;
    };

    const isAtLeastInstructor = permissions.isFederationAdmin || permissions.isAdminClub || permissions.isInstructor;
    const isAtLeastClubAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
    const isFederationAdmin = permissions.isFederationAdmin;
    const canManageFinances = permissions.canManageFinances;
    const onViewSportiv = (s: Sportiv, tab?: 'profil' | 'contact' | 'grade' | 'financiar' | 'familie' | 'grupe-istoric') => {
        setSelectedSportiv(s);
        setSportivProfilTab(tab);
        setActiveView('profil-sportiv');
    };

    // Faza 31 (31-08): un singur element pentru hub-ul "Plăți & Facturi",
    // construit o singură dată. Crearea unui element JSX nu îl randează —
    // e returnat doar din ramurile de mai jos (vederea hub + alias-urile
    // legacy, și din ramura canManageFinances a lui 'istoric-plati'). Definit
    // DUPĂ return-urile timpurii (OnboardingCompletare/MandatoryPasswordChange)
    // și nu introduce niciun hook nou (Rules of Hooks — vezi CR-03 mai sus).
    const platiHubElement = (
        <Lazy.PlatiHub
            currentUser={currentUser!}
            permissions={permissions}
            activeRoleContext={activeRoleContext}
            onViewSportiv={onViewSportiv}
            onBack={handleBackToDashboard}
            platiPentruIncasare={platiPentruIncasare}
            setPlatiPentruIncasare={setPlatiPentruIncasare}
        />
    );

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
                            case 'jurnal-audit':
                                return renderProtected(<Lazy.JurnalAudit onBack={handleBackToDashboard} />, permissions.isSuperAdmin);
                            case 'deduplicare-sportivi':
                                return renderProtected(<Lazy.DeduplicareSportivi onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
                            case 'cereri-inscriere':
                                return renderProtected(<Lazy.CereriInscriere onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
                            case 'protectia-datelor':
                                // Fara renderProtected — D-15 cere accesibilitate pentru TOATE rolurile autentificate.
                                return <Lazy.ProtectiaDatelor onBack={handleBackToDashboard} sportivId={activeRoleContext?.sportiv_id ?? null} />;
                            case 'cereri-gdpr':
                                return renderProtected(<Lazy.CereriGDPR onBack={handleBackToDashboard} />, isAtLeastClubAdmin);
                            case 'admin-console':
                                return renderProtected(<Lazy.AdminConsole onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={userRoles} activeRoleContext={activeRoleContext} sportivi={filteredData.sportivi} allRoles={allRoles} clubs={clubs} permissions={permissions} />, permissions.hasAdminAccess || isEmergencyAdmin);
                            case 'federation-dashboard':
                                return renderProtected(<Lazy.FederationDashboard onNavigate={setActiveView} />, isFederationAdmin);
                            case 'admin-dashboard':
                                return renderProtected(<Lazy.AdminDashboard onNavigate={setActiveView} />, isFederationAdmin);
                            case 'dashboard':
                            case 'my-portal':
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
                                return renderProtected(currentSportiv ? <Lazy.UserProfile sportiv={currentSportiv} onBack={() => canGoBack ? goBack() : setActiveView('sportivi')} onNavigate={setActiveView} onViewExameneRaport={(id) => { setSportivIdPentruRaport(id); setActiveView('rapoarte-examen'); }} onViewSportiv={onViewSportiv} initialTab={sportivProfilTab} /> : null, isAtLeastInstructor);
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
                            case 'template-probe':
                                return renderProtected(<Lazy.CategoriiTemplateManager permissions={permissions} />, permissions.isFederationAdmin || permissions.isSuperAdmin || permissions.isAdminClub);
                            case 'activitati-nationale':
                                return renderProtected(<Lazy.ActivitatiNationale onNavigate={setActiveView} onBack={handleBackToDashboard} />, permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin || permissions.isSuperAdmin);
                            case 'inlantuiri-admin':
                                return renderProtected(<Lazy.InlantuciriAdmin onBack={handleBackToDashboard} permissions={permissions} />, isFederationAdmin);
                            case 'admin-sms': {
                                const smsClubId = activeRoleContext?.club_id || activeRoleContext?.club?.id || currentUser?.club_id || '';
                                return renderProtected(
                                    <Lazy.AdminSMS activeClubId={smsClubId} activeRoleContext={activeRoleContext} />,
                                    isAtLeastClubAdmin
                                );
                            }
                            case 'prezenta':
                                return renderProtected(<Lazy.PrezentaManagement onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'prezenta-instructor':
                                return renderProtected(<Lazy.InstructorPrezentaPage onBack={handleBackToDashboard} onNavigate={setActiveView} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
                            case 'arhiva-prezente':
                                return renderProtected(<Lazy.ArhivaPrezente onBack={() => setActiveView('prezenta-instructor')} />, permissions.isInstructor);
                            case 'raport-activitate':
                                return renderProtected(<Lazy.RaportActivitate onBack={handleBackToDashboard} onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'raport-lunar-prezenta':
                                return renderProtected(<Lazy.RaportLunarPrezenta onBack={handleBackToDashboard} onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'program-antrenamente':
                                return renderProtected(<Lazy.ProgramAntrenamenteManagement onBack={handleBackToDashboard} onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'rapoarte':
                                return renderProtected(<Lazy.ReportsDashboard onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'grupe':
                                return renderProtected(<Lazy.GrupeManagement onBack={handleBackToDashboard} onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'activitati':
                                return renderProtected(<Lazy.ProgramareActivitati onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'raport-prezenta':
                                return renderProtected(<Lazy.RaportPrezenta onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} onNavigate={setActiveView} />, isAtLeastInstructor);
                            case 'raport-interval-examen':
                                return renderProtected(<Lazy.RaportIntervalExamen onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} />, isAtLeastInstructor);
                            case 'calendar':
                                return <Lazy.CalendarView onBack={handleBackToDashboard} onNavigate={(view) => setActiveView(view)} permissions={permissions} onViewSportiv={onViewSportiv} />;
                            // Faza 31 (D-01..D-04): un singur hub înlocuiește cele 12 vederi
                            // financiare de mai jos; literalele vechi rămân alias-uri (localStorage
                            // `phi-hau-active-view`, favorite, link-uri adânci) — toate deschid
                            // același `PlatiHub`, care citește tab-ul/secțiunea din viewParams.
                            // Guard `canManageFinances` ≡ vechiul `isAtLeastClubAdmin`; guard-ul
                            // special pentru 'taxe-anuale' e aplicat în interiorul hub-ului (TabConfigurare).
                            case 'plati-hub':
                            case 'plati-scadente':
                            case 'gestiune-facturi':
                            case 'facturi-fara-prezenta':
                            case 'jurnal-incasari':
                            case 'raport-financiar':
                            case 'financial-dashboard':
                            case 'tipuri-abonament':
                            case 'configurare-preturi':
                            case 'reduceri':
                            case 'taxe-anuale':
                            case 'nomenclatoare':
                                return renderProtected(platiHubElement, canManageFinances);
                            case 'deconturi-federatie':
                                return renderProtected(<Lazy.FederationInvoices onBack={handleBackToDashboard} deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} decontSportivi={decontSportivi} currentUser={currentUser!} permissions={permissions} />, isAtLeastClubAdmin);
                            case 'user-management':
                                return renderProtected(<Lazy.UserManagement onBack={handleBackToDashboard} sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser!} allRoles={allRoles} setAllRoles={setAllRoles} clubs={clubs} permissions={permissions} />, isAtLeastClubAdmin);
                            case 'cluburi':
                                return renderProtected(<Lazy.CluburiManagement onBack={handleBackToDashboard} clubs={clubs} setClubs={setClubs} currentUser={currentUser!} permissions={permissions} allRoles={allRoles} />, isFederationAdmin);
                            case 'anunturi-federatie':
                                return renderProtected(<Lazy.AnunturiFederatie onBack={handleBackToDashboard} clubs={clubs} currentUser={currentUser!} />, isFederationAdmin);
                            case 'data-maintenance':
                                return renderProtected(<Lazy.BackupManager onBack={handleBackToDashboard} onDataRestored={() => window.location.reload()} sportivi={sportivi} setSportivi={setSportivi} grade={grade} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} setPlati={setPlati} familii={familii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser!} />, isFederationAdmin);
                            case 'rapoarte-examen':
                                return renderProtected(<Lazy.RapoarteExamen onBack={() => { setSportivIdPentruRaport(null); setActiveView('rapoarte'); }} currentUser={currentUser!} clubs={clubs} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} onViewSportiv={onViewSportiv} initialSportivId={sportivIdPentruRaport} />, isAtLeastInstructor);
                            case 'setari-club':
                                return renderProtected(<Lazy.ClubSettings onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} setClubs={setClubs} />, isAtLeastClubAdmin);
                            case 'grade':
                                return renderProtected(<Lazy.GradeManagement grade={grade} setGrade={setGrade} onBack={handleBackToDashboard} canEdit={permissions.isSuperAdmin} />, isAtLeastClubAdmin);
                            case 'audit-grade':
                                return renderProtected(<Lazy.AuditGrade onBack={handleBackToDashboard} onViewSportiv={onViewSportiv} />, isAtLeastClubAdmin);
                            case 'familii':
                                return renderProtected(<Lazy.FamiliiManagement onBack={handleBackToDashboard} familii={filteredData.familii} setFamilii={setFamilii} sportivi={filteredData.sportivi} setSportivi={setSportivi} tipuriAbonament={filteredData.tipuriAbonament} grupe={filteredData.grupe} currentUser={currentUser!} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);
                            case 'notificari':
                                return renderProtected(<Lazy.Notificari onBack={handleBackToDashboard} currentUser={currentUser!} clubs={clubs} grupe={filteredData.grupe} permissions={permissions} />, isAtLeastInstructor);
                            case 'perioade-vacanta':
                                return renderProtected(
                                    <Lazy.PerioadaVacantaView onBack={handleBackToDashboard} />,
                                    isAtLeastClubAdmin
                                );
                            case 'sezoane':
                                return renderProtected(
                                    <Lazy.SezoaneView onBack={handleBackToDashboard} />,
                                    isAtLeastClubAdmin
                                );
                            case 'istoric-prezenta':
                                return <Lazy.MartialAttendance onBack={handleBackToDashboard} currentUser={currentUser!} />;
                            case 'istoric-plati':
                                // Faza 31: canManageFinances → hub (tab Încasări, secțiune Istoric
                                // Plăți Personale); altfel ramură IDENTICĂ cu cea veche (rolul
                                // SPORTIV își vede propriul istoric, fără acces la hub).
                                return canManageFinances ? platiHubElement : <Lazy.IstoricPlati onBack={handleBackToDashboard} viewedUser={currentUser!} plati={filteredData.plati} tranzactii={filteredData.tranzactii} />;
                            case 'account-settings':
                                return <Lazy.AccountSettings onBack={handleBackToDashboard} currentUser={currentUser!} userRoles={userRoles} setCurrentUser={setCurrentUser} setSportivi={setSportivi} />;
                            case 'fisa-digitala':
                                return <Lazy.FisaDigitalaSportiv onBack={handleBackToDashboard} currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} />;
                            case 'fisa-competitie':
                                return <Lazy.FisaCompetitie onBack={handleBackToDashboard} currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} />;
                            case 'button-catalog':
                                return renderProtected(<Lazy.ButtonCatalog />, isFederationAdmin);
                            case 'produse':
                                return renderProtected(
                                    <Lazy.ProduseManagement
                                        currentUser={currentUser!}
                                        permissions={permissions}
                                        onBack={handleBackToDashboard}
                                    />,
                                    isAtLeastClubAdmin
                                );
                            case 'setup-mfa':
                                return <SetupMFAPage />;
                            default:
                                return <div>Lipsește Vizualizarea</div>;
                        }
                    })()}
                </Suspense>
            </motion.div>
        </AnimatePresence>
    );
};

