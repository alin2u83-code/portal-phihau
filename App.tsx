import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { View, Permissions, Sportiv } from './types';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/Login';
import AdminDashboard from './components/AdminDashboard';
import { Card, Button } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { SportivDashboard } from './components/SportivDashboard';

const LoadingScreen: React.FC = () => (
    <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

const DataLoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <p>Se încarcă datele aplicației...</p>
    </div>
);

const DataErrorScreen: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="flex items-center justify-center h-full p-4">
        <Card className="text-center p-8 border-red-500 border-2 bg-red-900/30">
            <h1 className="text-2xl font-bold text-red-300">Eroare la încărcarea datelor</h1>
            <p className="mt-2 text-red-200">{error}</p>
            <Button onClick={onRetry} className="mt-6" variant="secondary">Reîncearcă</Button>
        </Card>
    </div>
);

const AuthenticatedApp: React.FC = () => {
    const { userDetails, roles, isAdmin } = useAuthStore();
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [viewingSportiv, setViewingSportiv] = useState<Sportiv | null>(null);
    const navigate = useNavigate();

    const appData = useAppStore();
    const { setData } = useAppStore.getState();

    const fetchData = useCallback(async () => {
        if (!supabase) return;

        setIsDataLoading(true);
        setFetchError(null);
        
        if (isAdmin) {
            try {
                const { data, error } = await supabase.rpc('get_all_app_data');
                if (error) throw error;
                setData(data);
            } catch (err: any) {
                const errorMessage = err.message || 'A apărut o eroare necunoscută.';
                setFetchError(errorMessage);
            } finally {
                setIsDataLoading(false);
            }
        } else {
            setIsDataLoading(false);
        }
    }, [isAdmin, setData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleViewSportiv = (sportiv: Sportiv) => {
        setViewingSportiv(sportiv);
        navigate('/profil-sportiv');
    };
    
    if (isDataLoading) {
        return <DashboardLayout><DataLoadingScreen /></DashboardLayout>;
    }
    
    return (
        <DashboardLayout>
            <ErrorBoundary onNavigate={() => navigate('/')}>
                 {fetchError ? <DataErrorScreen error={fetchError} onRetry={fetchData} /> : (
                    <Routes>
                        <Route path="/" element={
                            isAdmin ? (
                                <AdminDashboard
                                    currentUser={userDetails}
                                    sportivi={appData.sportivi}
                                    plati={appData.plati}
                                    grade={appData.grade}
                                    grupe={appData.grupe}
                                    onViewSportiv={handleViewSportiv}
                                />
                            ) : (
                                <Navigate to="/dashboard-sportiv" replace />
                            )
                        }/>
                         <Route path="/sportivi" element={
                            <SportiviManagement 
                                onBack={() => navigate('/')} 
                                onViewSportiv={handleViewSportiv}
                                {...appData} 
                                setSportivi={(d) => setData({sportivi: d})} 
                                setGrupe={(d) => setData({grupe: d})} 
                                setFamilii={(d) => setData({familii: d})}
                                setAllRoles={(d) => setData({allRoles: d})}
                                setPlati={(d) => setData({plati: d})}
                                setTranzactii={(d) => setData({tranzactii: d})}
                                currentUser={userDetails!}
                                permissions={{} as Permissions} // Placeholder, needs proper implementation
                                grade={appData.grade}
                            />
                        }/>
                        <Route path="/profil-sportiv" element={viewingSportiv ? <UserProfile sportiv={viewingSportiv} onBack={() => navigate(-1)} currentUser={userDetails!} {...appData} setIstoricGrade={(d) => setData({istoric_grade: d})} setSportivi={(d) => setData({sportivi: d})} setPlati={(d) => setData({plati: d})} setTranzactii={(d) => setData({tranzactii: d})} /> : <Navigate to="/sportivi" />} />
                        <Route path="/dashboard-sportiv" element={<SportivDashboard grade={appData.grade} grupe={appData.grupe} onNavigate={(v: View) => navigate(`/${v}`)} antrenamente={appData.antrenamente} anunturi={appData.anunturiPrezenta} setAnunturi={(d) => setData({anunturi_prezenta: d})} sportivi={appData.sportivi} permissions={{} as Permissions} canSwitchRoles={false} activeRole={userDetails?.rol || ''} onSwitchRole={() => {}} isSwitchingRole={false} appDataError={fetchError} currentUser={userDetails} />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                 )}
            </ErrorBoundary>
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