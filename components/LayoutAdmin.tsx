import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { View, Permissions } from '../types';
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
// Import other page components as needed...

// A simple loading screen for data fetching
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

    // Get data and setters from the global Zustand store
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
            // For non-admins, no global data is needed, just finish loading.
            setIsDataLoading(false);
        }
    }, [showError, isAdmin, setData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [isExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);

    if (isDataLoading || !userDetails) {
        return <DataLoadingScreen />;
    }
    
    // Unified layout structure
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
            />

            <main className={`flex-1 transition-all duration-300 ${permissions.hasAdminAccess && isExpanded ? 'lg:ml-64' : (permissions.hasAdminAccess ? 'lg:ml-20' : 'lg:ml-0')}`}>
                 <div className="p-4 md:p-8">
                    {fetchError && (
                        <Card className="mb-6 bg-amber-900/30 border-amber-500 text-amber-300">
                            <p><strong>Atenție:</strong> Unele date nu au putut fi încărcate ({fetchError}). Anumite secțiuni pot fi indisponibile sau pot afișa informații incomplete.</p>
                        </Card>
                    )}
                    <ErrorBoundary>
                        <Routes>
                            {/* Admin Routes */}
                            <Route path="/sportivi" element={<ProtectedRoute><SportiviManagement onBack={() => {}} sportivi={appData.sportivi} setSportivi={(d) => setData({sportivi: d})} grupe={appData.grupe} setGrupe={(d) => setData({grupe: d})} tipuriAbonament={appData.tipuriAbonament} familii={appData.familii} setFamilii={(d) => setData({familii: d})} allRoles={appData.allRoles} setAllRoles={(d) => setData({allRoles: d})} currentUser={userDetails} plati={appData.plati} setPlati={(d) => setData({plati: d})} tranzactii={appData.tranzactii} setTranzactii={(d) => setData({tranzactii: d})} onViewSportiv={() => {}} clubs={appData.clubs} grade={appData.grade} permissions={permissions} /></ProtectedRoute>} />
                            <Route path="/examene" element={<ProtectedRoute><GestiuneExamene currentUser={userDetails} clubs={appData.clubs} onBack={() => {}} onNavigate={() => {}} sesiuni={appData.sesiuniExamene} setSesiuni={(d) => setData({sesiuni_examene: d})} inscrieri={appData.inscrieriExamene} setInscrieri={(d) => setData({inscrieri_examene: d})} sportivi={appData.sportivi} setSportivi={(d) => setData({sportivi: d})} grade={appData.grade} istoricGrade={appData.istoricGrade} locatii={appData.locatii} setLocatii={(d) => setData({locatii: d})} plati={appData.plati} setPlati={(d) => setData({plati: d})} preturiConfig={appData.preturiConfig} deconturiFederatie={appData.deconturiFederatie} setDeconturiFederatie={(d) => setData({deconturi_federatie: d})} onViewSportiv={()=>{}} /></ProtectedRoute>} />
                            {/* ... Add other admin routes here, wrapped in ProtectedRoute */}

                            {/* Sportiv Routes */}
                            <Route path="/dashboard-sportiv" element={<SportivDashboard grade={appData.grade} grupe={appData.grupe} onNavigate={(v: View) => {}} antrenamente={appData.antrenamente} anunturi={appData.anunturiPrezenta} setAnunturi={(d) => setData({anunturi_prezenta: d})} sportivi={appData.sportivi} permissions={permissions} canSwitchRoles={false} activeRole={userDetails.rol || ''} onSwitchRole={() => {}} isSwitchingRole={false} appDataError={fetchError} />} />
                            
                            {/* Default Route */}
                            <Route path="/" element={
                                isAdmin 
                                ? <ProtectedRoute><AdminDashboard currentUser={userDetails} /></ProtectedRoute>
                                : <Navigate to="/dashboard-sportiv" replace />
                            }/>

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ErrorBoundary>
                 </div>
            </main>
        </div>
    );
};