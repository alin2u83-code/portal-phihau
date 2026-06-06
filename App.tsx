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
import { useMFAGuard } from './hooks/useMFAGuard';
import { AppLayout } from './components/AppLayout';
import { AIAssistantProvider } from './contexts/AIAssistantContext';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const {
    session, currentUser, userRoles, activeRoleContext, loading, error,
    activeRole, canSwitchRoles, isSwitchingRole, effectiveNeedsRoleSelection,
    clubs, grade,
    handleLogout, handleSwitchRole, handleSelectRole, initializeAndFetchData
  } = useAppLogic();

  useMFAGuard(activeRoleContext);

  const permissions = usePermissions(activeRoleContext);

  const { activeView, setActiveView, goBack, canGoBack } = useNavigation();
  const { isSidebarExpanded, setIsSidebarExpanded } = useAppStore();

  const { filteredData, loading: dataLoading } = useData();

  const [selectedSportiv, setSelectedSportivState] = React.useState<Sportiv | null>(null);
  const [selectedSportivId, setSelectedSportivId] = useLocalStorage<string | null>('phi-hau-selected-sportiv-id', null);
  const [platiPentruIncasare, setPlatiPentruIncasare] = React.useState<Plata[]>([]);

  // La refresh: daca activeView === 'profil-sportiv' si selectedSportiv lipseste,
  // recupereaza sportivul dupa ID-ul salvat in localStorage
  useEffect(() => {
    if (activeView !== 'profil-sportiv') return;
    if (selectedSportiv !== null) return;
    if (dataLoading) return;
    if (!selectedSportivId) {
      setActiveView('sportivi');
      return;
    }
    const found = filteredData.sportivi.find(s => s.id === selectedSportivId);
    if (found) {
      setSelectedSportivState(found);
    } else {
      // ID-ul salvat nu mai exista sau nu e accesibil — curata si redirecteaza
      setSelectedSportivId(null);
      setActiveView('sportivi');
    }
  }, [activeView, selectedSportiv, selectedSportivId, filteredData.sportivi, dataLoading, setActiveView, setSelectedSportivId]);

  const setSelectedSportiv = React.useCallback((s: Sportiv | null) => {
    setSelectedSportivState(s);
    setSelectedSportivId(s ? s.id : null);
  }, [setSelectedSportivId]);

  const handleBackToDashboard = React.useCallback(() => {
    if (canGoBack) {
      goBack();
    } else {
      const dashboardView = (permissions?.hasAdminAccess && activeRole !== 'SPORTIV') ? 'dashboard' : 'my-portal';
      setActiveView(dashboardView);
    }
  }, [canGoBack, goBack, permissions?.hasAdminAccess, activeRole, setActiveView]);

  /**
   * Hardware back button (Android / browser history).
   * Interceptează popstate și navighează în contextul aplicației
   * în loc să lase browser-ul să iasă din SPA.
   */
  const [showExitDialog, setShowExitDialog] = React.useState(false);
  useEffect(() => {
    // Adaugă o intrare falsă în history pentru a putea intercepta popstate
    window.history.pushState({ spa: true }, '');

    const handlePopState = () => {
      // Re-push imediat pentru a putea intercepta viitoarele apăsări
      window.history.pushState({ spa: true }, '');

      if (activeView === 'dashboard' || activeView === 'my-portal') {
        // Suntem la rădăcină — întreabă dacă utilizatorul vrea să iasă
        setShowExitDialog(true);
      } else if (canGoBack) {
        goBack();
      } else {
        handleBackToDashboard();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeView, canGoBack, goBack, handleBackToDashboard]);

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

        {/* Dialog confirmare ieșire (hardware back la rădăcină) */}
        {showExitDialog && (
          <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2">Ieși din aplicație?</h3>
              <p className="text-sm text-slate-400 mb-5">Ești sigur că vrei să ieși din portalul PhiHau?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-600 text-slate-300 hover:border-slate-500 transition-colors"
                >
                  Rămân
                </button>
                <button
                  onClick={() => {
                    setShowExitDialog(false);
                    // Permite browser-ului să iasă normal
                    window.history.go(-2);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600/80 border border-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Da, ieși
                </button>
              </div>
            </div>
          </div>
        )}

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
                <Route path="/inscriere/:clubSlug" element={<InscrierePublicPage />} />
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
