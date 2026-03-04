import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, View, Rol, Plata } from './types';
import { AuthContainer } from './components/AuthContainer';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePermissions } from './hooks/usePermissions';
import { useClubFilter } from './hooks/useClubFilter';
import ErrorBoundary from './components/ErrorBoundary';
import { SystemGuardian } from './components/SystemGuardian';
import { AdminDebugFloatingPanel } from './components/AdminDebugFloatingPanel';
import { useRoleManager } from './hooks/useRoleManager';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { Header } from './components/Header';
import { useData } from './contexts/DataContext';
import { useIsMobile } from './hooks/useIsMobile';
import { MartialArtsSkeleton } from './components/MartialArtsSkeleton';
import { AppRouter } from './components/AppRouter';
import { NotificationProvider } from './contexts/NotificationContext';

import { Routes, Route, Navigate } from 'react-router-dom';
import { RegisterPage } from './components/RegisterPage';
import { LoginPage } from './components/LoginPage';

function App() {
  const { showError } = useError();
  const isMobile = useIsMobile();
  const dataProvider = useData();

  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
  const [adminContext, setAdminContext] = useLocalStorage<'club' | 'federation'>('phi-hau-admin-context', 'club');
  const [switchingToRole, setSwitchingToRole] = useState<string>('');
  
  const {
      loading, error, needsRoleSelection, session, currentUser, userRoles, activeRoleContext,
      setCurrentUser, sportivi, sesiuniExamene, inscrieriExamene, grade, istoricGrade,
      grupe, plati, tranzactii, evenimente, rezultate, preturiConfig, tipuriAbonament,
      familii, allRoles, reduceri, tipuriPlati, locatii, clubs,
      deconturiFederatie, vizualizarePlati, istoricPlatiDetaliat, setPlati, setSportivi, setSesiuniExamene, setInscrieriExamene,
      setGrupe, setTranzactii, setEvenimente, setRezultate, setFamilii,
      setAllRoles, setReduceri, setTipuriPlati, setLocatii, setClubs,
      setGrade, setTipuriAbonament, setDeconturiFederatie, setIstoricGrade, initializeAndFetchData,
      filteredData, antrenamente, setAntrenamente, anunturiPrezenta, setAnunturiPrezenta
  } = dataProvider;

  const [platiPentruIncasare, setPlatiPentruIncasare] = useState<Plata[]>([]);


  const activeRole = useMemo((): Rol['nume'] | null => {
    const roleName = activeRoleContext?.roluri?.nume;
    return roleName || null;
  }, [activeRoleContext]);

  const { switchRole, loading: isSwitchingRole } = useRoleManager(currentUser?.user_id || session?.user?.id);

  const permissions = usePermissions(activeRoleContext);
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

    if (currentUser && activeRoleContext) {
        const isInstructorOrAbove = permissions.isFederationAdmin || permissions.isAdminClub || permissions.isInstructor;
        const isAdminOrAbove = permissions.isFederationAdmin || permissions.isAdminClub;

        const strictlyAdminViews: View[] = [
            'user-management', 'data-maintenance', 'setari-club', 'cluburi', 'structura-federatie', 
            'configurare-preturi', 'tipuri-abonament', 'reduceri', 'nomenclatoare', 'data-inspector',
            'taxe-anuale', 'financial-dashboard', 'gestiune-facturi', 'plati-scadente', 'jurnal-incasari',
            'raport-financiar', 'deconturi-federatie', 'federation-dashboard', 'admin-console'
        ];
        
        const instructorViews: View[] = [
            'sportivi', 'grade', 'prezenta', 'grupe', 'raport-prezenta', 'raport-lunar-prezenta',
            'stagii', 'competitii', 'familii', 'activitati', 'notificari',
            'finalizare-examen', 'rapoarte-examen', 'prezenta-instructor', 'raport-activitate', 'examene'
        ];

        if (!isInstructorOrAbove && (strictlyAdminViews.includes(activeView) || instructorViews.includes(activeView))) {
            setActiveView('my-portal');
            showError('Acces Neautorizat', 'Nu aveți permisiunile necesare pentru a accesa această pagină.');
        } else if (!isAdminOrAbove && strictlyAdminViews.includes(activeView)) {
            setActiveView('dashboard');
            showError('Acces Neautorizat', 'Această pagină este rezervată administratorilor.');
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

  const handleLogout = async () => {
    try {
        // Clear local storage first to ensure a clean state
        localStorage.removeItem('phi-hau-active-role-context-id');
        localStorage.removeItem('phi-hau-active-view');
        localStorage.removeItem('activeRole');
        
        if (supabase) {
            await supabase.auth.signOut();
        }
        
        // Force a full page reload to clear all React states
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        // Fallback reload
        window.location.href = '/';
    }
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
  
  const effectiveNeedsRoleSelection = useMemo(() => {
    return needsRoleSelection || (session && !loading && !activeRole);
  }, [needsRoleSelection, session, loading, activeRole]);

  if ((loading || clubFilterLoading) && isMobile) {
      return <MartialArtsSkeleton />;
  }

  return (
    <SystemGuardian 
        isLoading={loading || clubFilterLoading} 
        currentUser={currentUser} 
        permissions={permissions} 
        error={error}
        onRetry={() => initializeAndFetchData()}
    >
      <NotificationProvider currentUser={currentUser}>
        {isSwitchingRole && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
            <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-white text-lg font-bold">Se comută contextul pe {switchingToRole}...</p>
        </div>
      )}
      {!session ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) :
       effectiveNeedsRoleSelection ? <RoleSelectionPage user={session.user} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={handleLogout} /> :
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
                userRoles={userRoles}
                onSwitchRole={handleSwitchRole}
              />

              <main className={`flex-1 transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                  <ErrorBoundary onNavigate={setActiveView}>
                        <AppRouter
                            activeView={activeView}
                            setActiveView={setActiveView}
                            currentUser={currentUser}
                            userRoles={userRoles}
                            activeRoleContext={activeRoleContext}
                            permissions={permissions}
                            activeRole={activeRole}
                            selectedSportiv={selectedSportiv}
                            setSelectedSportiv={setSelectedSportiv}
                            platiPentruIncasare={platiPentruIncasare}
                            setPlatiPentruIncasare={setPlatiPentruIncasare}
                            handleBackToDashboard={handleBackToDashboard}
                            handleSwitchRole={handleSwitchRole}
                            isSwitchingRole={isSwitchingRole}
                            canSwitchRoles={canSwitchRoles}
                            isEmergencyAdmin={currentUser?.email === 'alin2u83@gmail.com'}
                        />
                  </ErrorBoundary>
                </div>
              </main>

              {(import.meta as any).env.DEV && currentUser && (<AdminDebugFloatingPanel currentUser={currentUser} userRoles={userRoles} onNavigate={(view) => setActiveView(view)} />)}
            </div>
      ) : null}
      </NotificationProvider>
    </SystemGuardian>
  );
}

export default App;
