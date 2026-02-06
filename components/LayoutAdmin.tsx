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


export const LayoutAdmin: React.FC = () => {
    const { isAdmin, user, roles } = useAuthStore();
    const { showError } = useError();
    const [isDataLoading, setIsDataLoading] = useState(true);

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
        if (!user) return { isSuperAdmin: false, isAdmin: false, isFederationAdmin: false, isAdminClub: false, isInstructor: false, isSportiv: true, hasAdminAccess: false, isFederationLevel: false, canManageFinances: false, canGradeStudents: false, visibleClubIds: [], };
        
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
            visibleClubIds: isFederationAdmin ? 'all' : (user.club_id ? [user.club_id] : []),
        };
    }, [user, roles, isAdmin]);

    const fetchData = useCallback(async () => {
        if (!supabase) return;
        setIsDataLoading(true);
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
            showError("Eroare la încărcarea datelor aplicației", err.message);
        } finally {
            setIsDataLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [isExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);

    if (isDataLoading || !user) {
        return <DataLoadingScreen />;
    }
    
    // Unified layout structure
    return (
        <div className="flex min-h-screen bg-[var(--bg-main)]">
            <Sidebar 
                currentUser={user} 
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
                            <Route path="/sportivi" element={<ProtectedRoute><SportiviManagement onBack={() => {}} sportivi={sportivi} setSportivi={setSportivi} grupe={grupe} setGrupe={setGrupe} tipuriAbonament={tipuriAbonament} familii={familii} setFamilii={setFamilii} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={user} plati={plati} setPlati={setPlati} tranzactii={tranzactii} setTranzactii={setTranzactii} onViewSportiv={() => {}} clubs={clubs} grade={grade} permissions={permissions} /></ProtectedRoute>} />
                            <Route path="/examene" element={<ProtectedRoute><GestiuneExamene currentUser={user} clubs={clubs} onBack={() => {}} onNavigate={() => {}} sesiuni={sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={sportivi} setSportivi={setSportivi} grade={grade} istoricGrade={istoricGrade} locatii={locatii} setLocatii={setLocatii} plati={plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={()=>{}} /></ProtectedRoute>} />
                            {/* ... Add other admin routes here, wrapped in ProtectedRoute */}

                            {/* Sportiv Routes */}
                            <Route path="/dashboard-sportiv" element={<SportivDashboard currentUser={user} viewedUser={user} participari={inscrieriExamene} examene={sesiuniExamene} grade={grade} istoricGrade={istoricGrade} grupe={grupe} plati={plati} onNavigate={() => {}} antrenamente={antrenamente} anunturi={anunturiPrezenta} setAnunturi={setAnunturiPrezenta} sportivi={sportivi} permissions={permissions} canSwitchRoles={false} activeRole={user.rol || ''} onSwitchRole={() => {}} isSwitchingRole={false} />} />
                            
                            {/* Default Route */}
                            <Route path="/" element={
                                isAdmin 
                                ? <ProtectedRoute><AdminDashboard currentUser={user} /></ProtectedRoute>
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
