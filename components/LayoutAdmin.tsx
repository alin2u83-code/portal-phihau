import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { View, Permissions, Sportiv } from '../types';
import { Sidebar } from './Sidebar';
import ErrorBoundary from './ErrorBoundary';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ProtectedRoute } from './ProtectedRoute';
import { Card, Button } from './ui';

// Import page components
import AdminDashboard from './AdminDashboard';
import { SportivDashboard } from './SportivDashboard';
import { SportiviManagement } from './SportiviManagement';
import { GestiuneExamene } from './Examene';
import { UserProfile } from './UserProfile';

const DataLoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <p>Se încarcă datele aplicației...</p>
    </div>
);

const DataErrorScreen: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="min-h-[80vh] flex items-center justify-center bg-[var(--bg-main)] p-4">
        <Card className="text-center p-8 border-red-500 border-2 bg-red-900/30">
            <h1 className="text-2xl font-bold text-red-300">Eroare la încărcarea datelor</h1>
            <p className="mt-2 text-red-200">{error}</p>
            <Button onClick={onRetry} className="mt-6" variant="secondary">Reîncearcă</Button>
        </Card>
    </div>
);

export const LayoutAdmin: React.FC = () => {
    const { isAdmin, userDetails, roles } = useAuthStore();
    const { showError } = useError();
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [viewingSportiv, setViewingSportiv] = useState<Sportiv | null>(null);
    const navigate = useNavigate();

    const appData = useAppStore();
    const { setData } = useAppStore.getState();

    const permissions = useMemo((): Permissions => {
        if (!userDetails) return { isSuperAdmin: false, isAdmin: false, isFederationAdmin: false, isAdminClub: false, isInstructor: false, isSportiv: true, hasAdminAccess: false, isFederationLevel: false, canManageFinances: false, canGradeStudents: false, visibleClubIds: [], };
        
        const roleSet = new Set(roles);
        const isSuperAdmin = roleSet.has('SUPER_ADMIN_FEDERATIE');
        const isAdminRole = roleSet.has('Admin');
        const isFederationAdmin = isSuperAdmin || isAdminRole;
        const isAdminClub = roleSet.has('Admin Club');
        const isInstructor = roleSet.has('INSTRUCTOR');

        return {
            isSuperAdmin,
            isAdmin: isAdminRole,
            isFederationAdmin,
            isAdminClub,
            isInstructor,
            isSportiv: roleSet.has('SPORTIV'),
            hasAdminAccess: isAdmin,
            isFederationLevel: isFederationAdmin,
            canManageFinances: isFederationAdmin || isAdminClub,
            canGradeStudents: isFederationAdmin || isAdminClub || isInstructor,
            visibleClubIds: isFederationAdmin ? 'all' : (userDetails.club_id ? [userDetails.club_id] : []),
        };
    }, [userDetails, roles, isAdmin]);

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
                showError("Eroare la încărcarea datelor aplicației", errorMessage);
            } finally {
                setIsDataLoading(false);
            }
        } else {
            setIsDataLoading(false);
        }
    }, [showError, isAdmin, setData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleViewSportiv = (sportiv: Sportiv) => {
        setViewingSportiv(sportiv);
        navigate('/profil-sportiv');
    };

    const [isExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);

    if (isDataLoading || !userDetails) {
        return <DataLoadingScreen />;
    }
    
    return (
        <div className="flex min-h-screen bg-[var(--bg-main)]">
            <Sidebar 
                currentUser={userDetails} 
                permissions={permissions} 
                clubs={appData.clubs} 
                globalClubFilter={null} 
                setGlobalClubFilter={() => {}} 
                activeRole={roles[0]} 
                canSwitchRoles={false} 
                onSwitchRole={() => {}} 
                isSwitchingRole={false}
                grade={appData.grade}
                userRoles={[]}
                activeRoleContext={null}
                onSyncData={fetchData}
                isDataLoading={isDataLoading}
            />

            <main className={`flex-1 transition-all duration-300 ${permissions.hasAdminAccess && isExpanded ? 'lg:ml-64' : (permissions.hasAdminAccess ? 'lg:ml-20' : 'lg:ml-0')}`}>
                 <div className="p-4 md:p-8">
                    {fetchError && (
                        <Card className="mb-6 bg-amber-900/30 border-amber-500 text-amber-300">
                            <p><strong>Atenție:</strong> Unele date nu au putut fi încărcate ({fetchError}). Anumite secțiuni pot fi indisponibile sau pot afișa informații incomplete.</p>
                        </Card>
                    )}
                    <ErrorBoundary onNavigate={(view) => navigate(`/${view}`)}>
                        <Routes>
                            <Route path="/sportivi" element={<ProtectedRoute><SportiviManagement onBack={() => navigate('/')} onViewSportiv={handleViewSportiv} {...appData} setSportivi={(d) => setData({sportivi: d})} setGrupe={(d) => setData({grupe: d})} setFamilii={(d) => setData({familii: d})} setAllRoles={(d) => setData({allRoles: d})} setPlati={(d) => setData({plati: d})} setTranzactii={(d) => setData({tranzactii: d})} currentUser={userDetails} permissions={permissions} grade={appData.grade} /></ProtectedRoute>} />
                            <Route path="/examene" element={<ProtectedRoute><GestiuneExamene onBack={() => navigate('/')} onNavigate={(v) => navigate(`/${v}`)} onViewSportiv={handleViewSportiv} {...appData} setSesiuni={(d) => setData({sesiuni_examene: d})} setInscrieri={(d) => setData({inscrieri_examene: d})} setSportivi={(d) => setData({sportivi: d})} setLocatii={(d) => setData({locatii: d})} setPlati={(d) => setData({plati: d})} setDeconturiFederatie={(d) => setData({deconturi_federatie: d})} currentUser={userDetails} /></ProtectedRoute>} />
                             <Route path="/profil-sportiv" element={<ProtectedRoute>{viewingSportiv ? <UserProfile sportiv={viewingSportiv} onBack={() => navigate(-1)} currentUser={userDetails} {...appData} setIstoricGrade={(d) => setData({istoric_grade: d})} setSportivi={(d) => setData({sportivi: d})} setPlati={(d) => setData({plati: d})} setTranzactii={(d) => setData({tranzactii: d})} /> : <Navigate to="/sportivi" />}</ProtectedRoute>} />

                            <Route path="/dashboard-sportiv" element={<SportivDashboard grade={appData.grade} grupe={appData.grupe} onNavigate={(v: View) => navigate(`/${v}`)} antrenamente={appData.antrenamente} anunturi={appData.anunturiPrezenta} setAnunturi={(d) => setData({anunturi_prezenta: d})} sportivi={appData.sportivi} permissions={permissions} canSwitchRoles={false} activeRole={userDetails.rol || ''} onSwitchRole={() => {}} isSwitchingRole={false} appDataError={fetchError} currentUser={userDetails} />} />
                            
                            <Route path="/" element={
                                isAdmin 
                                ? <ProtectedRoute><AdminDashboard currentUser={userDetails} sportivi={appData.sportivi} plati={appData.plati} grade={appData.grade} onViewSportiv={handleViewSportiv} /></ProtectedRoute>
                                : <Navigate to="/dashboard-sportiv" replace />
                            }/>

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ErrorBoundary>
                 </div>
            </main>
        </div>
    );
};
