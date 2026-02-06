import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { Sportiv, SesiuneExamen, Grad, InscriereExamen, View, Antrenament, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol, AnuntPrezenta, Reducere, AnuntGeneral, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, Permissions } from '../types';
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

    // All application data states
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

    // Permissions object derived from the new auth store state
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
        try {
            const { data, error } = await supabase.rpc('get_all_app_data');
            if (error) throw error;
            
            setSportivi(data.sportivi || []);
            setSesiuniExamene(data.sesiuni_examene || []);
            setInscrieriExamene(data.inscrieri_examene || []);
            setGrade(data.grade || []);
            setIstoricGrade(data.istoric_grade || []);
            setAntrenamente(data.antrenamente || []);
            setGrupe(data.grupe || []);
            setPlati(data.plati || []);
            setTranzactii(data.tranzactii || []);
            setEvenimente(data.evenimente || []);
            setRezultate(data.rezultate || []);
            setPreturiConfig(data.preturi_config || []);
            setTipuriAbonament(data.tipuri_abonament || []);
            setFamilii(data.familii || []);
            setAllRoles(data.all_roles || []);
            setAnunturiPrezenta(data.anunturi_prezenta || []);
            setReduceri(data.reduceri || []);
            setTipuriPlati(data.tipuri_plati || []);
            setLocatii(data.locatii || []);
            setClubs(data.clubs || []);
            setDeconturiFederatie(data.deconturi_federatie || []);

        } catch (err: any) {
            const errorMessage = err.message || 'A apărut o eroare necunoscută.';
            setFetchError(errorMessage);
            showError("Eroare la încărcarea datelor aplicației", errorMessage);
        } finally {
            setIsDataLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [isExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);

    if (isDataLoading || !userDetails) {
        return <DataLoadingScreen />;
    }
    
    if (fetchError && isAdmin) {
        return (
            <div className="flex min-h-screen bg-[var(--bg-main)]">
                <Sidebar 
                    currentUser={userDetails} 
                    permissions={permissions} 
                    clubs={clubs} 
                    globalClubFilter={null} 
                    setGlobalClubFilter={() => {}} 
                    activeRole={roles[0]} 
                    canSwitchRoles={false} 
                    onSwitchRole={() => {}} 
                    isSwitchingRole={false}
                    grade={grade}
                    userRoles={[]}
                    activeRoleContext={null}
                />
                <main className={`flex-1 transition-all duration-300 ${permissions.hasAdminAccess && isExpanded ? 'lg:ml-64' : (permissions.hasAdminAccess ? 'lg:ml-20' : 'lg:ml-0')}`}>
                    <div className="p-4 md:p-8">
                         <DataErrorScreen error={fetchError} onRetry={fetchData} />
                    </div>
                </main>
            </div>
        );
    }
    
    // Unified layout structure
    return (
        <div className="flex min-h-screen bg-[var(--bg-main)]">
            <Sidebar 
                currentUser={userDetails} 
                permissions={permissions} 
                clubs={clubs} 
                globalClubFilter={null} 
                setGlobalClubFilter={() => {}} 
                activeRole={roles[0]} 
                canSwitchRoles={false} 
                onSwitchRole={() => {}} 
                isSwitchingRole={false}
                grade={grade}
                userRoles={[]}
                activeRoleContext={null}
            />

            <main className={`flex-1 transition-all duration-300 ${permissions.hasAdminAccess && isExpanded ? 'lg:ml-64' : (permissions.hasAdminAccess ? 'lg:ml-20' : 'lg:ml-0')}`}>
                 <div className="p-4 md:p-8">
                    <ErrorBoundary>
                        <Routes>
                            {/* Admin Routes */}
                            <Route path="/sportivi" element={<ProtectedRoute><SportiviManagement onBack={() => {}} sportivi={sportivi} setSportivi={setSportivi} grupe={grupe} setGrupe={setGrupe} tipuriAbonament={tipuriAbonament} familii={familii} setFamilii={setFamilii} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={userDetails} plati={plati} setPlati={setPlati} tranzactii={tranzactii} setTranzactii={setTranzactii} onViewSportiv={() => {}} clubs={clubs} grade={grade} permissions={permissions} /></ProtectedRoute>} />
                            <Route path="/examene" element={<ProtectedRoute><GestiuneExamene currentUser={userDetails} clubs={clubs} onBack={() => {}} onNavigate={() => {}} sesiuni={sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={sportivi} setSportivi={setSportivi} grade={grade} istoricGrade={istoricGrade} locatii={locatii} setLocatii={setLocatii} plati={plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={()=>{}} /></ProtectedRoute>} />
                            {/* ... Add other admin routes here, wrapped in ProtectedRoute */}

                            {/* Sportiv Routes */}
                            <Route path="/dashboard-sportiv" element={<SportivDashboard grade={grade} grupe={grupe} onNavigate={() => {}} antrenamente={antrenamente} anunturi={anunturiPrezenta} setAnunturi={setAnunturiPrezenta} sportivi={sportivi} permissions={permissions} canSwitchRoles={false} activeRole={userDetails.rol || ''} onSwitchRole={() => {}} isSwitchingRole={false} appDataError={fetchError} />} />
                            
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
