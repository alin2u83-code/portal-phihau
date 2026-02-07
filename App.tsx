import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { View, Sportiv } from './types';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/Login';
import AdminDashboard from './components/AdminDashboard';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { SportivDashboard } from './components/SportivDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { RoleSelectionPage } from './components/RoleSelectionPage';

const LoadingScreen: React.FC = () => (
    <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

const AuthenticatedApp: React.FC = () => {
    const { userDetails, initialize, isLoading } = useAuthStore();
    const navigate = useNavigate();

    // The logic for handling multi-role selection and mandatory password change
    // has been moved here to control the top-level routing for authenticated users.

    if (isLoading) {
        return <LoadingScreen />;
    }

    // Force password change if required
    if (userDetails?.trebuie_schimbata_parola) {
        return <MandatoryPasswordChange currentUser={userDetails} onPasswordChanged={initialize} />;
    }

    // Handle users with multiple roles but no primary one selected
    if (userDetails && userDetails.roles.length > 1 && !userDetails.rol_activ_context) {
        // This is a placeholder for a multi-role selection component
        // For now, we'll just log it and proceed.
        console.warn("User has multiple roles but no active context. Defaulting...");
        // In a real scenario, you would render a RoleSelectionPage here.
    }
    
    return (
        <DashboardLayout>
            <Routes>
                <Route path="/" element={
                    <ProtectedRoute>
                        <AdminDashboard 
                            currentUser={userDetails}
                            sportivi={useAppStore.getState().sportivi}
                            plati={useAppStore.getState().plati}
                            grade={useAppStore.getState().grade}
                            grupe={useAppStore.getState().grupe}
                            onViewSportiv={(sportiv) => navigate(`/sportivi/${sportiv.id}`)}
                        />
                    </ProtectedRoute>
                }/>
                <Route path="/sportivi" element={
                    <ProtectedRoute>
                        <SportiviManagement 
                           onBack={() => navigate('/')} 
                           onViewSportiv={(sportiv) => navigate(`/sportivi/${sportiv.id}`)}
                           {...useAppStore.getState()}
                           currentUser={userDetails!}
                        />
                    </ProtectedRoute>
                }/>
                <Route path="/sportivi/:id" element={
                    <ProtectedRoute>
                        <UserProfile 
                            onBack={() => navigate('/sportivi')}
                            currentUser={userDetails!}
                            {...useAppStore.getState()}
                        />
                    </ProtectedRoute>
                }/>
                 <Route path="/dashboard-sportiv" element={<SportivDashboard currentUser={userDetails!} grade={useAppStore.getState().grade} grupe={useAppStore.getState().grupe} antrenamente={useAppStore.getState().antrenamente} anunturi={useAppStore.getState().anunturiPrezenta} setAnunturi={() => {}} sportivi={useAppStore.getState().sportivi} onNavigate={(view) => navigate(`/${view}`)} />} />

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
