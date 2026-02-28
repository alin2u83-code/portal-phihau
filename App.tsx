import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sportiv, View, Rol, Plata } from './types';
import { AuthContainer } from './components/AuthContainer';
import { useError } from './components/ErrorProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePermissions } from './hooks/usePermissions';
import { useClubFilter } from './hooks/useClubFilter';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { SystemGuardian } from './components/SystemGuardian';
import { useRoleManager } from './hooks/useRoleManager';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { useDataProvider } from './hooks/useDataProvider';
import { useIsMobile } from './hooks/useIsMobile';
import { MartialArtsSkeleton } from './components/MartialArtsSkeleton';
import { useFilteredData } from './hooks/useFilteredData';
import { ViewRenderer } from './components/ViewRenderer';
import { Layout } from './components/Layout';
import { supabase } from './supabaseClient';

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
      setCurrentUser, clubs, grade, allRoles, initializeAndFetchData
  } = dataProvider;

  const [platiPentruIncasare, setPlatiPentruIncasare] = useState<Plata[]>([]);

  const activeRole = useMemo((): Rol['nume'] | null => {
    return activeRoleContext?.roluri?.nume || null;
  }, [activeRoleContext]);

  const { switchRole, loading: isSwitchingRole } = useRoleManager(currentUser?.user_id);
  const permissions = usePermissions(currentUser, activeRole);
  const { activeClubId, loading: clubFilterLoading, globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser, permissions);
  
  const filteredData = useFilteredData(dataProvider, activeRole, activeClubId);

  const handleBackToDashboard = useCallback(() => {
    const dashboardView = permissions.hasAdminAccess && activeRole !== 'SPORTIV' ? 'dashboard' : 'my-portal';
    setActiveView(dashboardView);
  }, [permissions.hasAdminAccess, activeRole, setActiveView]);

   const canSwitchRoles = useMemo(() => {
        return !!(currentUser && userRoles && userRoles.length > 1);
    }, [currentUser, userRoles]);
    
  const handleSwitchRole = useCallback(async (targetContext: any) => {
      if (!targetContext?.id) {
          showError("Eroare la comutare", "Contextul selectat este invalid.");
          return;
      }
      setSwitchingToRole(targetContext.rol_denumire || 'rol nou');
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
    if (loading) return;

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
    if (permissions.isFederationLevel && activeView !== 'federation-dashboard') {
      setActiveView('federation-dashboard');
    }
  }, [activeView, permissions.isFederationLevel, setActiveView]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const handleSelectRole = async (role: any) => {
    localStorage.setItem('activeRole', JSON.stringify(role));
    localStorage.setItem('phi-hau-active-role-context-id', role.id);
    
    if (role.roluri?.nume === 'SUPER_ADMIN_FEDERATIE') {
        setActiveView('federation-dashboard');
        window.location.href = '/?view=federation-dashboard';
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

  const renderContent = () => {
    if (currentUser && currentUser.trebuie_schimbata_parola) {
      return <MandatoryPasswordChange currentUser={currentUser} onPasswordChanged={() => {}} />;
    }
    
    return (
        <ViewRenderer 
            activeView={activeView}
            setActiveView={setActiveView}
            currentUser={currentUser!}
            activeRole={activeRole}
            permissions={permissions}
            filteredData={filteredData}
            dataProvider={dataProvider}
            selectedSportiv={selectedSportiv}
            setSelectedSportiv={setSelectedSportiv}
            handleBackToDashboard={handleBackToDashboard}
            platiPentruIncasare={platiPentruIncasare}
            handleIncaseazaMultiple={handleIncaseazaMultiple}
            handleJurnalBack={handleJurnalBack}
            handleIncasareProcesata={handleIncasareProcesata}
            handleSwitchRole={handleSwitchRole}
            isSwitchingRole={isSwitchingRole}
            canSwitchRoles={canSwitchRoles}
            userRoles={userRoles}
            activeRoleContext={activeRoleContext}
            allRoles={allRoles}
            clubs={clubs}
            loading={loading}
        />
    );
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
      {isSwitchingRole && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
            <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-white text-lg font-bold">Se comută contextul pe {switchingToRole}...</p>
        </div>
      )}
      {!session ? <AuthContainer /> :
       effectiveNeedsRoleSelection ? <RoleSelectionPage user={session.user} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={handleLogout} /> :
       currentUser ? (
            <Layout
                currentUser={currentUser}
                activeView={activeView}
                setActiveView={setActiveView}
                handleBackToDashboard={handleBackToDashboard}
                handleLogout={handleLogout}
                isSidebarExpanded={isSidebarExpanded}
                setIsSidebarExpanded={setIsSidebarExpanded}
                clubs={clubs}
                globalClubFilter={globalClubFilter}
                setGlobalClubFilter={setGlobalClubFilter}
                permissions={permissions}
                activeRole={activeRole!}
                canSwitchRoles={canSwitchRoles}
                handleSwitchRole={handleSwitchRole}
                isSwitchingRole={isSwitchingRole}
                grade={grade}
                userRoles={userRoles}
                adminContext={adminContext}
                setAdminContext={setAdminContext}
            >
                {renderContent()}
            </Layout>
      ) : null}
    </SystemGuardian>
  );
}

export default App;
