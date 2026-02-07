
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { usePermissions } from './hooks/usePermissions';
import Login from './pages/Login';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SportiviManagement = lazy(() => import('./components/SportiviManagement').then(m => ({ default: m.SportiviManagement })));
const UserProfile = lazy(() => import('./components/UserProfile').then(m => ({ default: m.UserProfile })));
const SportivDashboard = lazy(() => import('./components/SportivDashboard').then(m => ({ default: m.SportivDashboard })));
const GestiuneExamene = lazy(() => import('./components/Examene').then(m => ({ default: m.GestiuneExamene })));

const LoadingScreen: React.FC = () => (
    <div className="h-screen w-screen bg-deep-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Phi Hau Iași</p>
        </div>
    </div>
);

const AuthenticatedApp: React.FC = () => {
    const { userDetails, initialize, isLoading } = useAuthStore();
    const appData = useAppStore();
    const permissions = usePermissions(userDetails);
    const navigate = useNavigate();

    if (isLoading) return <LoadingScreen />;

    if (userDetails?.trebuie_schimbata_parola) {
        return <MandatoryPasswordChange currentUser={userDetails} onPasswordChanged={initialize} />;
    }
    
    return (
        <DashboardLayout>
            <Routes>
                <Route path="/" element={
                    permissions.hasAdminAccess ? (
                        <AdminDashboard 
                            currentUser={userDetails}
                            sportivi={appData.sportivi}
                            onViewSportiv={(sportiv) => navigate(`/sportivi/${sportiv.id}`)}
                            {...appData}
                        />
                    ) : (
                        <SportivDashboard 
                            currentUser={userDetails!} 
                            {...appData}
                            viewedUser={userDetails!}
                            isViewingOwnProfile={true}
                            onNavigate={(view) => navigate(`/${view}`)}
                            permissions={permissions}
                        />
                    )
                }/>
                <Route path="/sportivi" element={
                    <ProtectedRoute permissions={permissions}>
                        <SportiviManagement 
                        onBack={() => navigate('/')} 
                        onViewSportiv={(sportiv) => navigate(`/sportivi/${sportiv.id}`)}
                        currentUser={userDetails!}
                        permissions={permissions}
                        {...appData}
                        />
                    </ProtectedRoute>
                }/>
                <Route path="/sportivi/:id" element={
                    <ProtectedRoute permissions={permissions}>
                        <UserProfile 
                            onBack={() => navigate('/sportivi')}
                            currentUser={userDetails!}
                            {...appData}
                        />
                    </ProtectedRoute>
                }/>
                <Route path="/examene" element={
                    <ProtectedRoute permissions={permissions}>
                        <GestiuneExamene
                            onBack={() => navigate('/')}
                            onViewSportiv={(s) => navigate(`/sportivi/${s.id}`)}
                            onNavigate={(v) => navigate(`/${v}`)}
                            currentUser={userDetails!}
                            {...appData}
                        />
                    </ProtectedRoute>
                }/>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </DashboardLayout>
    );
};

const App: React.FC = () => {
    const { userDetails, isLoading, initialize } = useAuthStore();
    
    useEffect(() => {
        if (!supabase) return;
        initialize();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
            initialize();
        });
        return () => subscription.unsubscribe();
    }, [initialize]);

    if (isLoading) return <LoadingScreen />;

    return (
        <Router>
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    <Route path="/login" element={!userDetails ? <Login /> : <Navigate to="/" replace />} />
                    <Route path="/*" element={userDetails ? <AuthenticatedApp /> : <Navigate to="/login" replace />} />
                </Routes>
            </Suspense>
        </Router>
    );
};

export default App;
