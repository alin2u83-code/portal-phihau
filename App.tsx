import React, { useCallback, useMemo, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './supabaseClient';
import { View, Rol, Plata, Sportiv } from './types';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { useNavigation } from './contexts/NavigationContext';
import { usePermissions } from './hooks/usePermissions';
import ErrorBoundary from './components/ErrorBoundary';
import { SystemGuardian } from './components/SystemGuardian';
import { useRoleManager } from './hooks/useRoleManager';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { Header } from './components/Header';
import { useData } from './contexts/DataContext';
import { useIsMobile } from './hooks/useIsMobile';
import { MartialArtsSkeleton } from './components/MartialArtsSkeleton';
import { AppRouter } from './components/AppRouter';
import { NotificationProvider } from './contexts/NotificationContext';
import { ClubGuard } from './components/ClubGuard';
import { useAppStore } from './src/store/useAppStore';
import { LoginPage } from './components/LoginPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { InscrierePublicPage } from './components/InscrierePublicPage';
import { useAppLogic } from './hooks/useAppLogic';
import { AppLayout } from './components/AppLayout';
import { AIAssistantProvider } from './contexts/AIAssistantContext';

function App() {
  const {
    session, currentUser, userRoles, activeRoleContext, loading, error,
    activeRole, canSwitchRoles, isSwitchingRole, effectiveNeedsRoleSelection,
    clubs, grade,
    handleLogout, handleSwitchRole, handleSelectRole, initializeAndFetchData
  } = useAppLogic();

  const permissions = usePermissions(activeRoleContext);

  const { activeView, setActiveView, goBack, canGoBack } = useNavigation();
  const { isSidebarExpanded, setIsSidebarExpanded } = useAppStore();
  
  const [selectedSportiv, setSelectedSportiv] = React.useState<Sportiv | null>(null);
  const [platiPentruIncasare, setPlatiPentruIncasare] = React.useState<Plata[]>([]);

  const handleBackToDashboard = React.useCallback(() => {
    if (canGoBack) {
      goBack();
    } else {
      const dashboardView = (permissions?.hasAdminAccess && activeRole !== 'SPORTIV') ? 'dashboard' : 'my-portal';
      setActiveView(dashboardView);
    }
  }, [canGoBack, goBack, permissions?.hasAdminAccess, activeRole, setActiveView]);

  if (loading) {
      return <MartialArtsSkeleton />;
  }

  return (
    <SystemGuardian 
        isLoading={loading} 
        currentUser={currentUser} 
        permissions={permissions} 
        error={error}
        onRetry={() => initializeAndFetchData()}
    >
      <NotificationProvider currentUser={currentUser}>
        <Toaster />
        {isSwitchingRole && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
                <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-white text-lg font-bold">Se comută contextul...</p>
            </div>
        )}
        {!session ? (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/inscriere" element={<InscrierePublicPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        ) : effectiveNeedsRoleSelection ? (
            <RoleSelectionPage user={session.user} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={handleLogout} />
        ) : currentUser ? (
            <AIAssistantProvider
                currentUser={currentUser}
                activeRole={activeRole || ''}
                permissions={permissions}
                clubs={clubs}
            >
                <AppLayout
                    currentUser={currentUser}
                    isSidebarExpanded={isSidebarExpanded}
                    setIsSidebarExpanded={setIsSidebarExpanded}
                    clubs={clubs}
                    permissions={permissions}
                    activeRole={activeRole || ''}
                    canSwitchRoles={canSwitchRoles}
                    onSwitchRole={handleSwitchRole}
                    isSwitchingRole={isSwitchingRole}
                    grade={grade}
                    userRoles={userRoles}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    handleBackToDashboard={handleBackToDashboard}
                    handleLogout={handleLogout}
                    selectedSportiv={selectedSportiv}
                    setSelectedSportiv={setSelectedSportiv}
                    platiPentruIncasare={platiPentruIncasare}
                    setPlatiPentruIncasare={setPlatiPentruIncasare}
                    activeRoleContext={activeRoleContext}
                />
            </AIAssistantProvider>
        ) : null}
      </NotificationProvider>
    </SystemGuardian>
  );
}

export default App;
