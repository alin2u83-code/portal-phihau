import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Sportiv, SesiuneExamen, Grad, InscriereExamen, View, Antrenament, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol, AnuntPrezenta, Reducere, AnuntGeneral, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, Permissions } from './types';
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
import Login from './pages/Login';
import { UserManagement } from './components/UserManagement';
import { Session } from '@supabase/supabase-js';
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
import { getAuthenticatedUser } from './utils/auth';
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
import { SUPER_ADMIN_ROLE_ID, FEDERATIE_ID } from './constants';
import { AdminMasterMap } from './components/AdminMasterMap';
import { GeneralAttendanceWidget } from './components/GeneralAttendanceWidget';
import { SportivDashboard } from './components/SportivDashboard';
import { Card, Button } from './components/ui';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { NotificationBell } from './components/NotificationBell';
import { RaportLunarPrezenta } from './components/RaportLunarPrezenta';

const LoadingScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-deep-navy">
        <svg className="animate-spin h-12 w-12 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


const AuthenticatedApp: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [activeRoleContext, setActiveRoleContext] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const { showError } = useError();
    const navigate = useNavigate();

    // Data states
    const [sportivi, setSportivi] = useState<Sportiv[]>([]);
    const [sesiuniExamene, setSesiuniExamene] = useState<SesiuneExamen[]>([]);
    const [inscrieriExamene, setInscrieriExamene] = useState<InscriereExamen[]>([]);
    const [grade, setGrade] = useState<Grad[]>([]);
    const [istoricGrade, setIstoricGrade] = useState<IstoricGrade[]>([]);
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [grupe, setGrupe] = useState<Grupa[]>([]);
    const [plati, setPlati] = useState<Plata[]>([]);
    const [tranzactii, setTranzactii] = useState<Tranzactie[]>([]);
    const [evenimente, setEvenimente] = useState<Eveniment[]>([]);
    const [rezultate, setRezultate] = useState<Rezultat[]>([]);
    const [preturiConfig, setPreturiConfig] = useState<PretConfig[]>([]);
    const [tipuriAbonament, setTipuriAbonament] = useState<TipAbonament[]>([]);
    const [familii, setFamilii] = useState<Familie[]>([]);
    const [allRoles, setAllRoles] = useState<Rol[]>([]);
    const [anunturiPrezenta, setAnunturiPrezenta] = useState<AnuntPrezenta[]>([]);
    const [reduceri, setReduceri] = useState<Reducere[]>([]);
    const [tipuriPlati, setTipuriPlati] = useState<TipPlata[]>([]);
    const [locatii, setLocatii] = useState<Locatie[]>([]);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [deconturiFederatie, setDeconturiFederatie] = useState<DecontFederatie[]>([]);
    const [platiPentruIncasare, setPlatiPentruIncasare] = useState<Plata[]>([]);

    const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
    const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
    const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
    const [adminContext, setAdminContext] = useLocalStorage<'club' | 'federation'>('phi-hau-admin-context', 'club');
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [switchingToRole, setSwitchingToRole] = useState<string | null>(null);

    const permissions = usePermissions(currentUser);
    const { globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser, permissions, activeRoleContext);

    const initializeAndFetchData = useCallback(async () => {
      // Data fetching logic from old App.tsx
      setLoading(true);
      // ... (This would contain the large data fetching block from the original App component)
      setLoading(false);
    }, [showError]);
    
    useEffect(() => {
        initializeAndFetchData();
    }, [initializeAndFetchData]);
    
    const handleLogout = async () => {
        await supabase?.auth.signOut();
        navigate('/login');
    };
    
    // ... other handlers like handleSwitchRole, handleIncaseazaMultiple, etc. from original App.tsx
    
    if (loading) return <LoadingScreen />;
    if (!currentUser) return <Navigate to="/login" />;

    const renderContent = () => {
        // This function would contain the large switch statement from the original App component
        return <div>Rendered view: {activeView}</div>;
    };
    
    return (
       <SystemGuardian isLoading={loading} currentUser={currentUser} permissions={permissions} error={profileError}>
          {/* ... Role switching overlay, etc. */}
           <div className="flex min-h-screen bg-[var(--bg-main)]">
              <Sidebar 
                currentUser={currentUser} 
                onNavigate={setActiveView} 
                onLogout={handleLogout} 
                activeView={activeView} 
                isExpanded={isSidebarExpanded} 
                setIsExpanded={setIsSidebarExpanded} 
                clubs={clubs}
                globalClubFilter={globalClubFilter}
                setGlobalClubFilter={setGlobalClubFilter}
                permissions={permissions}
                activeRole={currentUser.rol_activ_context!}
                canSwitchRoles={userRoles.length > 1}
                onSwitchRole={() => {}}
                isSwitchingRole={isSwitchingRole}
                grade={grade}
              />
              <main className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <div className="absolute top-4 right-8 z-30">
                  {currentUser && permissions.hasAdminAccess && <NotificationBell currentUser={currentUser} />}
                </div>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                  {permissions.isSuperAdmin && activeView === 'dashboard' && <GlobalContextSwitcher activeContext={adminContext} onContextChange={setAdminContext} />}
                  <ErrorBoundary onNavigate={setActiveView}>
                    {renderContent()}
                  </ErrorBoundary>
                </div>
              </main>
              {(import.meta as any).env.DEV && currentUser && (
                <AdminDebugFloatingPanel 
                    currentUser={currentUser}
                    onNavigate={setActiveView}
                />
              )}
            </div>
      </SystemGuardian>
    );
}


function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
        setLoading(false);
        return;
    };
    
    const fetchSession = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/*" element={session ? <AuthenticatedApp /> : <Navigate to="/login" replace />} />
      </Routes>
  );
}

export default App;
