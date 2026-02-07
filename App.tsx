import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/Login';
import AdminDashboard from './components/AdminDashboard';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { SportivDashboard } from './components/SportivDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { GestiuneExamene } from './components/Examene';
import { usePermissions } from './hooks/usePermissions';

const LoadingScreen: React.FC = () => (
    <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

const AuthenticatedApp: React.FC = () => {
    const { userDetails, initialize, isLoading } = useAuthStore();
    const appData = useAppStore();
    const permissions = usePermissions(userDetails);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch all initial data needed for the app
        const fetchData = async () => {
            if (!supabase || !userDetails) return;
            // In a real app, you would fetch all necessary data here and populate the appStore
        };
        fetchData();
    }, [userDetails]);
    
    if (isLoading) {
        return <LoadingScreen />;
    }

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
                {/* Add other protected routes here */}
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

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!userDetails ? <Login /> : <Navigate to="/" replace />} />
                <Route path="/*" element={userDetails ? <AuthenticatedApp /> : <Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
