import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, View, Rol, Permissions, Plata, VizualizarePlata } from './types';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { GestiuneExamene } from './components/Examene';
import { GradeManagement } from './components/Grade';
import { PrezentaManagement } from './components/PrezentaManagement';
import { GrupeManagement } from './components/Grupe';
import { RaportPrezenta } from './components/RaportPrezenta';
import { StagiiCompetitiiManagement } from './components/StagiiCompetitii';
import { PlatiScadente } from './components/PlatiScadente';
import { JurnalIncasari } from './components/JurnalIncasari';
import { TipuriAbonamentManagement } from './components/TipuriAbonament';
import { ConfigurarePreturi } from './components/ConfigurarePreturi';
import { RaportFinanciar } from './components/RaportFinanciar';
import { FamiliiManagement } from './components/Familii';
import { AuthContainer } from './components/AuthContainer';
import { UserManagement } from './components/UserManagement';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { BackupManager } from './components/BackupManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ProgramareActivitati } from './components/Activitati';
import { ClubSettings } from './components/ClubSettings';
import { DataInspector } from './components/DataInspector';
import { ReduceriManagement } from './components/Reduceri';
import { Notificari } from './components/Notificari';
import { TaxeAnuale } from './components/TaxeAnuale';
import { GestionareNomenclatoare } from './components/GestionareNomenclatoare';
import { FinancialDashboard } from './components/FinancialDashboard';
import { GestiuneFacturi } from './components/GestiuneFacturi';
import { IstoricPlati } from './components/FacturiPersonale';
import { CalendarView } from './components/CalendarView';
import { RapoarteExamen } from './components/RapoarteExamen';
import { CluburiManagement } from './components/CluburiManagement';
import { FederationStructure } from './components/FederationStructure';
import { usePermissions } from './hooks/usePermissions';
import AccessDenied from './components/AccessDenied';
import { useClubFilter } from './hooks/useClubFilter';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import ErrorBoundary from './components/ErrorBoundary';
import { SystemGuardian } from './components/SystemGuardian';
import { AdminDebugFloatingPanel } from './components/AdminDebugFloatingPanel';
import { FederationInvoices } from './components/FederationInvoices';
import { MartialAttendance } from './components/MartialAttendance';
import { AccountSettings } from './components/AccountSettings';
import { GlobalContextSwitcher } from './components/GlobalContextSwitcher';
import { FederationDashboard } from './components/FederationDashboard';
import { FisaDigitalaSportiv } from './components/FisaDigitalaSportiv';
import { FisaCompetitie } from './components/FisaCompetitie';
import { InstructorPrezentaPage } from './components/InstructorPrezentaPage';
import { RaportActivitate } from './components/RaportActivitate';
import { BackdoorCheck } from './components/BackdoorCheck';
import { BackdoorTest } from './components/BackdoorTest';
import { AdminConsole } from './components/AdminConsole';
import { ArhivaPrezente } from './components/ArhivaPrezente';
import { AdminMasterMap } from './components/AdminMasterMap';
import { SportivDashboard } from './components/SportivDashboard';
import { Card } from './components/ui';
import { useRoleManager } from './hooks/useRoleManager';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { RaportLunarPrezenta } from './components/RaportLunarPrezenta';
import { Header } from './components/Header';
import { MainLayout } from './components/MainLayout';
import { AppRouter } from './components/AppRouter';
import { useDataProvider } from './hooks/useDataProvider';
import { useIsMobile } from './hooks/useIsMobile';
import { MartialArtsSkeleton } from './components/MartialArtsSkeleton';
import { DebugPage } from './components/DebugPage';
import { AdminDashboard } from './components/AdminDashboard';


function App() {
  const { showError } = useError();
  const isMobile = useIsMobile();
  const dataProvider = useDataProvider();

  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
  const [adminContext, setAdminContext] = useLocalStorage<'club' | 'federation'>('phi-hau-admin-context', 'club');
  const [switchingToRole, setSwitchingToRole] = useState<string>('');
  
  const {
      loading, error, needsRoleSelection, session, currentUser, userRoles, activeRoleContext,
      setCurrentUser, sportivi, sesiuniExamene, inscrieriExamene, grade, istoricGrade, antrenamente,
      grupe, plati, tranzactii, evenimente, rezultate, preturiConfig, tipuriAbonament,
      familii, allRoles, anunturiPrezenta, reduceri, tipuriPlati, locatii, clubs,
      deconturiFederatie, vizualizarePlati, setPlati, setSportivi, setSesiuniExamene, setInscrieriExamene,
      setAntrenamente, setGrupe, setTranzactii, setEvenimente, setRezultate, setFamilii,
      setAllRoles, setAnunturiPrezenta, setReduceri, setTipuriPlati, setLocatii, setClubs,
      setGrade, setTipuriAbonament, setDeconturiFederatie, setIstoricGrade
  } = dataProvider;

  const [platiPentruIncasare, setPlatiPentruIncasare] = useState<Plata[]>([]);


  const activeRole = useMemo((): Rol['nume'] | null => {
    const roleName = activeRoleContext?.roluri?.nume;
    return roleName || null;
  }, [activeRoleContext]);

  const handleRedirectToRoleSelection = useCallback(() => {
    // This function will be called by SystemGuardian if activeRole is null after timeout
    // It forces a re-evaluation of the role selection state.
    // In a real app, you might want to clear some local storage or trigger a re-fetch.
    console.log('Redirecting to role selection due to timeout...');
    // Forcing a re-render by updating a state or simply reloading the session context
    // For now, we'll just set needsRoleSelection to true if it's not already.
    // The dataProvider should handle the actual state change based on activeRole being null.
    // A simple window.location.reload() might also be an option for a hard reset.
    // Since needsRoleSelection is derived from activeRoleContext, we don't directly set it here.
    // The onSelect in RoleSelectionPage will handle setting the primary context.
    // We'll just ensure the RoleSelectionPage is shown.
    if (!needsRoleSelection) {
      // This is a bit of a hack, but it will force the App to render RoleSelectionPage
      // if the activeRole is null and the timeout has passed.
      // A more robust solution might involve a state in dataProvider to explicitly trigger this.
      // For now, we rely on the needsRoleSelection prop to the RoleSelectionPage.
      // The SystemGuardian will render RoleSelectionPrompt, which calls onRetry, which will trigger this.
      // The dataProvider's internal logic should then re-evaluate activeRoleContext.
      // Forcing a refresh of the session might be the most reliable way to re-sync JWT claims.
      supabase.auth.refreshSession();
    }
  }, [needsRoleSelection]);

  const { switchRole, loading: isSwitchingRole } = useRoleManager(currentUser?.user_id);

  const permissions = usePermissions(currentUser, activeRole);
  const { activeClubId, loading: clubFilterLoading, globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser, permissions);
  
  const handleBackToDashboard = useCallback(() => {
    const dashboardView = permissions.hasAdminAccess && activeRole !== 'SPORTIV' ? 'dashboard' : 'my-portal';
    setActiveView(dashboardView);
  }, [permissions.hasAdminAccess, activeRole, setActiveView]);

   const canSwitchRoles = useMemo(() => {
        if (!currentUser || !userRoles || userRoles.length <= 1) return false;
        return true;
    }, [currentUser, userRoles]);
    
  // NOUA funcție de comutare a rolului: atomică și cu hard refresh conform cerinței
  const handleSwitchRole = useCallback(async (targetContext: any) => {
      if (!targetContext?.id) {
          showError("Eroare la comutare", "Contextul selectat este invalid.");
          return;
      }
      await switchRole(targetContext.id);
  }, [switchRole, showError]);

  useEffect(() => {
    const savedRole = localStorage.getItem('activeRole');
    if (savedRole && savedRole !== 'undefined') {
      try {
        const role = JSON.parse(savedRole);
        if (role && role.roluri?.nume === 'SUPER_ADMIN_FEDERATIE') {
          setActiveView('federation-dashboard');
        }
      } catch (error) {
        console.error('Failed to parse activeRole from localStorage', error);
        localStorage.removeItem('activeRole');
      }
    }
  }, []);

  useEffect(() => {
    const redirectView = localStorage.getItem('phi-hau-redirect-after-role-switch');
    if (redirectView) {
        setActiveView(redirectView as View);
        localStorage.removeItem('phi-hau-redirect-after-role-switch');
    }
  }, [setActiveView]);

  useEffect(() => {
    if (loading) return; // Wait until dataProvider has finished loading

    if (currentUser && !permissions.hasAdminAccess && activeRoleContext) {
        const adminViews: View[] = [
            'sportivi', 'grade', 'prezenta', 'grupe', 'raport-prezenta', 'raport-lunar-prezenta',
            'stagii', 'competitii', 'plati-scadente', 'jurnal-incasari', 'raport-financiar',
            'configurare-preturi', 'tipuri-abonament', 'familii', 'user-management',
            'data-maintenance', 'activitati', 'setari-club', 'data-inspector', 'reduceri',
            'notificari', 'taxe-anuale', 'nomenclatoare', 'financial-dashboard',
            'finalizare-examen', 'rapoarte-examen', 'cluburi', 'structura-federatie', 'deconturi-federatie',
            'federation-dashboard', 'gestiune-facturi', 'prezenta-instructor', 'raport-activitate', 'admin-console'
        ];
        if (adminViews.includes(activeView)) {
            setActiveView('my-portal');
            showError('Acces Neautorizat', 'Nu aveți permisiunile necesare pentru a accesa această pagină.');
        }
    }
  }, [currentUser, permissions, activeView, setActiveView, activeRoleContext, showError, loading]);

  useEffect(() => {
    // Protection mechanism for SUPER_ADMIN_FEDERATIE
    if (permissions.isFederationLevel && activeView !== 'federation-dashboard') {
      console.warn('[Protection] Federation-level role is being redirected to the federation dashboard.');
      setActiveView('federation-dashboard');
    }
  }, [activeView, permissions.isFederationLevel, setActiveView]);

  const filteredData = useMemo(() => {
    // Dacă suntem Super Admin, NU aplicăm filtre de club_id
    if (activeRole === 'SUPER_ADMIN_FEDERATIE') {
        return {
            sportivi,
            sesiuniExamene,
            inscrieriExamene,
            antrenamente,
            grupe,
            plati,
            tranzactii,
            evenimente,
            rezultate,
            tipuriAbonament,
            familii,
            anunturiPrezenta,
            reduceri,
            deconturiFederatie,
            istoricGrade,
            vizualizarePlati,
        }; // Returnează array-urile complete
    }

    // Pentru restul, filtrăm normal
    if (!activeClubId) {
        // Dacă nu există un club activ, returnăm array-uri goale pentru a evita erorile de filtrare.
        return {
            sportivi: [], sesiuniExamene: [], inscrieriExamene: [], antrenamente: [], grupe: [], plati: [],
            tranzactii: [], evenimente: [], rezultate: [], tipuriAbonament: [], familii: [],
            anunturiPrezenta: [], reduceri: [], deconturiFederatie: [], istoricGrade: [], vizualizarePlati: []
        };
    }

    const fSportivi = (sportivi || []).filter((s) => s.club_id === activeClubId);
    const fGrupe = (grupe || []).filter((g) => g.club_id === activeClubId);

    const fSesiuniExamene = (sesiuniExamene || []).filter(
        (s) => s.club_id === activeClubId || s.club_id === null
    );
    const fEvenimente = (evenimente || []).filter(
        (e) => e.club_id === activeClubId || e.club_id === null
    );
    const fTipuriAbonament = (tipuriAbonament || []).filter(
        (t) => t.club_id === activeClubId || t.club_id === null
    );
    const fDeconturiFederatie = (deconturiFederatie || []).filter(
        (d) => d.club_id === activeClubId
    );
    const fVizualizarePlati = (vizualizarePlati || []).filter(
        (vp) => vp.club_id === activeClubId
    );

    const sportivIdsInClub = new Set(fSportivi.map((s) => s.id));
    const grupaIdsInClub = new Set(fGrupe.map((g) => g.id));

    const fFamilii = (familii || []).filter((fam) =>
        (sportivi || []).some(
            (s) => s.familie_id === fam.id && s.club_id === activeClubId
        )
    );
    const familieIdsInClub = new Set(fFamilii.map((f) => f.id));

    const fPlati = (plati || []).filter(
        (p) =>
            (p.sportiv_id && sportivIdsInClub.has(p.sportiv_id)) ||
            (p.familie_id && familieIdsInClub.has(p.familie_id))
    );
    const fTranzactii = (tranzactii || []).filter(
        (t) =>
            (t.sportiv_id && sportivIdsInClub.has(t.sportiv_id)) ||
            (t.familie_id && familieIdsInClub.has(t.familie_id))
    );
    const fAntrenamente = (antrenamente || []).filter(
        (a) => a.grupa_id === null || (a.grupa_id && grupaIdsInClub.has(a.grupa_id))
    );
    const fInscrieriExamene = (inscrieriExamene || []).filter((i) =>
        sportivIdsInClub.has(i.sportiv_id)
    );
    const fRezultate = (rezultate || []).filter((r) =>
        sportivIdsInClub.has(r.sportiv_id)
    );
    const fAnunturiPrezenta = (anunturiPrezenta || []).filter((a) =>
        sportivIdsInClub.has(a.sportiv_id)
    );
    const fIstoricGrade = (istoricGrade || []).filter((ig) =>
        sportivIdsInClub.has(ig.sportiv_id)
    );

    return {
        sportivi: fSportivi,
        sesiuniExamene: fSesiuniExamene,
        inscrieriExamene: fInscrieriExamene,
        antrenamente: fAntrenamente,
        grupe: fGrupe,
        plati: fPlati,
        tranzactii: fTranzactii,
        evenimente: fEvenimente,
        rezultate: fRezultate,
        tipuriAbonament: fTipuriAbonament,
        familii: fFamilii,
        anunturiPrezenta: fAnunturiPrezenta,
        reduceri,
        deconturiFederatie: fDeconturiFederatie,
        istoricGrade: fIstoricGrade,
        vizualizarePlati: fVizualizarePlati,
    };
}, [
    activeRole,
    activeClubId,
    sportivi,
    sesiuniExamene,
    inscrieriExamene,
    antrenamente,
    grupe,
    plati,
    tranzactii,
    evenimente,
    rezultate,
    tipuriAbonament,
    familii,
    anunturiPrezenta,
    reduceri,
    deconturiFederatie,
    istoricGrade,
    vizualizarePlati,
]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const handleSelectRole = async (role: any) => {
    // Salvăm imediat în storage pentru a "convinge" providerul de date
    localStorage.setItem('activeRole', JSON.stringify(role));
    localStorage.setItem('phi-hau-active-role-context-id', role.id);
    
    if (role.roluri?.nume === 'SUPER_ADMIN_FEDERATIE') {
        setActiveView('federation-dashboard');
        // Forțăm o stare care să ignore selecția
        window.location.href = '/?view=federation-dashboard'; // Resetare curată de sesiune
    } else {
        await handleSwitchRole(role);
    }
  };
  
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

  return (
    <SystemGuardian isLoading={loading || clubFilterLoading} currentUser={currentUser} permissions={permissions} error={error}>
      {isSwitchingRole && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
            <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-white text-lg font-bold">Se comută contextul pe {switchingToRole}...</p>
        </div>
      )}
      {!session ? <AuthContainer /> :
       needsRoleSelection ? <RoleSelectionPage user={session.user} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={handleLogout} /> :
       currentUser ? (
            <MainLayout
              currentUser={currentUser}
              onNavigate={setActiveView}
              onLogout={handleLogout}
              activeView={activeView}
              isSidebarExpanded={isSidebarExpanded}
              setIsSidebarExpanded={setIsSidebarExpanded}
              clubs={clubs}
              globalClubFilter={globalClubFilter}
              setGlobalClubFilter={setGlobalClubFilter}
              permissions={permissions}
              activeRole={activeRole!}
              canSwitchRoles={canSwitchRoles}
              onSwitchRole={handleSwitchRole}
              isSwitchingRole={isSwitchingRole}
              grade={grade}
              userRoles={userRoles}
            >
              <AppRouter
                activeView={activeView}
                currentUser={currentUser}
                permissions={permissions}
                sportivi={filteredData.sportivi}
                sesiuniExamene={filteredData.sesiuniExamene}
                inscrieriExamene={filteredData.inscrieriExamene}
                antrenamente={filteredData.antrenamente}
                grupe={filteredData.grupe}
                plati={filteredData.plati}
                tranzactii={filteredData.tranzactii}
                evenimente={filteredData.evenimente}
                rezultate={filteredData.rezultate}
                tipuriAbonament={filteredData.tipuriAbonament}
                familii={filteredData.familii}
                anunturiPrezenta={filteredData.anunturiPrezenta}
                reduceri={filteredData.reduceri}
                deconturiFederatie={filteredData.deconturiFederatie}
                istoricGrade={filteredData.istoricGrade}
                vizualizarePlati={filteredData.vizualizarePlati}
                grade={grade}
                allRoles={allRoles}
                clubs={clubs}
                locatii={locatii}
                tipuriPlati={tipuriPlati}
                preturiConfig={preturiConfig}
                setSportivi={setSportivi}
                setSesiuniExamene={setSesiuniExamene}
                setInscrieriExamene={setInscrieriExamene}
                setAntrenamente={setAntrenamente}
                setGrupe={setGrupe}
                setPlati={setPlati}
                setTranzactii={setTranzactii}
                setEvenimente={setEvenimente}
                setRezultate={setRezultate}
                setFamilii={setFamilii}
                setAllRoles={setAllRoles}
                setAnunturiPrezenta={setAnunturiPrezenta}
                setReduceri={setReduceri}
                setTipuriPlati={setTipuriPlati}
                setLocatii={setLocatii}
                setClubs={setClubs}
                setGrade={setGrade}
                setTipuriAbonament={setTipuriAbonament}
                setDeconturiFederatie={setDeconturiFederatie}
                setIstoricGrade={setIstoricGrade}
                handleBackToDashboard={handleBackToDashboard}
                setActiveView={setActiveView}
                selectedSportiv={selectedSportiv}
                setSelectedSportiv={setSelectedSportiv}
                handleIncaseazaMultiple={handleIncaseazaMultiple}
                platiPentruIncasare={platiPentruIncasare}
                handleJurnalBack={handleJurnalBack}
                handleIncasareProcesata={handleIncasareProcesata}
                userRoles={userRoles}
                activeRoleContext={activeRoleContext}
                activeRole={activeRole}
                loading={loading}
              />
            </MainLayout>
      ) : null}
    </SystemGuardian>
  );

  
  if ((loading || clubFilterLoading) && isMobile) {
      return <MartialArtsSkeleton />;
  }

  // The second SystemGuardian is likely a remnant or intended for a different flow.
  // Given the current structure, the first one wraps the entire app, so this one is redundant.
  // I will remove it to avoid confusion and potential issues.
  // If it was intended for a different purpose, it needs to be explicitly re-added with a clear use case.

  // Original second SystemGuardian block (removed):
  // return (
  //   <SystemGuardian isLoading={loading || clubFilterLoading} currentUser={currentUser} permissions={permissions} error={error}>
      {isSwitchingRole && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
            <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-white text-lg font-bold">Se comută contextul pe {switchingToRole}...</p>
        </div>
      )}
      {!session ? <AuthContainer /> :
       needsRoleSelection ? <RoleSelectionPage user={session.user} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={handleLogout} /> :
       currentUser ? (
            <div className="flex min-h-screen bg-[var(--bg-main)]">
              <Sidebar currentUser={currentUser} onNavigate={setActiveView} onLogout={handleLogout} activeView={activeView} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} clubs={clubs} globalClubFilter={globalClubFilter} setGlobalClubFilter={setGlobalClubFilter} permissions={permissions} activeRole={activeRole!} canSwitchRoles={canSwitchRoles} onSwitchRole={handleSwitchRole} isSwitchingRole={isSwitchingRole} grade={grade} userRoles={userRoles} />
              
              <Header 
                activeView={activeView}
                onBack={handleBackToDashboard}
                currentUser={currentUser}
                permissions={permissions}
                onNavigate={setActiveView}
                onLogout={handleLogout}
                isSidebarExpanded={isSidebarExpanded}
              />

              <main className={`flex-1 transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                  {permissions.isMultiContextAdmin && permissions.hasAdminAccess && <GlobalContextSwitcher activeContext={adminContext} onContextChange={setAdminContext} />}
                  <ErrorBoundary onNavigate={setActiveView}>
                    {renderContent()}
                  </ErrorBoundary>
                </div>
              </main>

              {(import.meta as any).env.DEV && currentUser && (<AdminDebugFloatingPanel currentUser={currentUser} userRoles={userRoles} onNavigate={(view) => setActiveView(view)} />)}
            </div>
      ) : null}
    </SystemGuardian>
  );
}

export default App;
