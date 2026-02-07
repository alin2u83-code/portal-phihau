import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { View, Permissions, Sportiv } from './types';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import { Card, Button } from './components/ui';

// Import all view components
import { UnifiedDashboard } from './components/UnifiedDashboard';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { SportivDashboard } from './components/SportivDashboard';
import { FamiliiManagement } from './components/Familii';
import { UserManagement } from './components/UserManagement';
import { GestiuneExamene } from './components/Examene';
import { PlatiScadente } from './components/PlatiScadente';
import { JurnalIncasari } from './components/JurnalIncasari';
import { GrupeManagement } from './components/Grupe';
import { GradeManagement } from './components/Grade';
import { StagiiCompetitiiManagement } from './components/StagiiCompetitii';
import { FinancialDashboard } from './components/FinancialDashboard';
import { RaportFinanciar } from './components/RaportFinanciar';
import { FederationInvoices } from './components/FederationInvoices';
import { ClubSettings } from './components/ClubSettings';
import { TipuriAbonamentManagement } from './components/TipuriAbonament';
import { ConfigurarePreturi } from './components/ConfigurarePreturi';
import { TaxeAnuale } from './components/TaxeAnuale';
import { ReduceriManagement } from './components/Reduceri';
import { GestionareNomenclatoare } from './components/GestionareNomenclatoare';
import { CluburiManagement } from './components/CluburiManagement';
import { FederationStructure } from './components/FederationStructure';
import { Notificari } from './components/Notificari';
import { DataMaintenancePage } from './components/DataMaintenancePage';
import { AdminConsole } from './components/AdminConsole';
import { PrezentaManagement } from './components/PrezentaManagement';
import { RaportPrezenta } from './components/RaportPrezenta';
import { RaportLunarPrezenta } from './components/RaportLunarPrezenta';
import { RaportActivitate } from './components/RaportActivitate';
import { ProgramareActivitati } from './components/Activitati';
import { InstructorPrezentaPage } from './components/InstructorPrezentaPage';
import { EditareProfilPersonal } from './components/EditareProfilPersonal';
import { usePermissions } from './hooks/usePermissions';
import { GestiuneFacturi } from './components/GestiuneFacturi';
import { FisaDigitalaSportiv } from './components/FisaDigitalaSportiv';
import { FisaCompetitie } from './components/FisaCompetitie';
import { MartialAttendance } from './components/MartialAttendance';
import { IstoricPlati } from './components/FacturiPersonale';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { RoleSelectionPage } from './components/RoleSelectionPage';

const LoadingScreen: React.FC = () => (
    <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

const DataLoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full pt-16">
        <p>Se încarcă datele aplicației...</p>
    </div>
);

const DataErrorScreen: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="flex items-center justify-center h-full p-4 pt-16">
        <Card className="text-center p-8 border-red-500 border-2 bg-red-900/30">
            <h1 className="text-2xl font-bold text-red-300">Eroare la încărcarea datelor</h1>
            <p className="mt-2 text-red-200">{error}</p>
            <Button onClick={onRetry} className="mt-6" variant="secondary">Reîncearcă</Button>
        </Card>
    </div>
);

const AuthenticatedApp: React.FC = () => {
    const { userDetails } = useAuthStore();
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const appData = useAppStore();
    const { setData } = useAppStore.getState();
    const permissions = usePermissions(userDetails);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        if (!supabase || !permissions.hasAdminAccess) {
            setIsDataLoading(false);
            return;
        };
        setIsDataLoading(true);
        setFetchError(null);
        try {
            const { data, error } = await supabase.rpc('get_all_app_data');
            if (error) throw error;
            setData(data);
        } catch (err: any) {
            setFetchError(err.message || 'A apărut o eroare necunoscută.');
        } finally {
            setIsDataLoading(false);
        }
    }, [setData, permissions.hasAdminAccess]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleNavigate = (view: View, sportiv?: Sportiv) => {
        // This is a simplified navigation handler for components that still use it.
        // It's recommended to transition them to useNavigate.
        if (view === 'profil-sportiv' && sportiv) {
            // Special handling for profile view might be needed if it becomes a route
            console.warn("Profil sportiv navigation needs to be implemented via router.");
        } else {
            navigate(`/${view}`);
        }
    };
    
    if (isDataLoading && permissions.hasAdminAccess) return <AppLayout><DataLoadingScreen /></AppLayout>;
    if (fetchError) return <AppLayout><DataErrorScreen error={fetchError} onRetry={fetchData} /></AppLayout>;

    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={permissions.hasAdminAccess ? <UnifiedDashboard currentUser={userDetails} onNavigate={handleNavigate} deconturiFederatie={appData.deconturiFederatie} session={null} /> : <Navigate to="/dashboard-sportiv" replace />} />
                
                {/* Admin Routes */}
                <Route path="/sportivi" element={<SportiviManagement onBack={()=>navigate('/')} onViewSportiv={()=>{}} {...appData} setSportivi={(d)=>setData({sportivi: d})} setGrupe={(d)=>setData({grupe:d})} setFamilii={(d)=>setData({familii:d})} setAllRoles={(d)=>setData({allRoles:d})} setPlati={(d)=>setData({plati:d})} setTranzactii={(d)=>setData({tranzactii:d})} currentUser={userDetails!} permissions={permissions} />} />
                <Route path="/examene" element={<GestiuneExamene onBack={()=>navigate('/')} onNavigate={handleNavigate} onViewSportiv={()=>{}} {...appData} setSesiuni={(d)=>setData({sesiuniExamene:d})} setInscrieri={(d)=>setData({inscrieriExamene:d})} setSportivi={(d)=>setData({sportivi: d})} setLocatii={(d)=>setData({locatii: d})} setPlati={(d)=>setData({plati:d})} setDeconturiFederatie={(d)=>setData({deconturiFederatie: d})} currentUser={userDetails!} />} />
                <Route path="/familii" element={<FamiliiManagement onBack={()=>navigate('/')} {...appData} setFamilii={(d)=>setData({familii:d})} setSportivi={(d)=>setData({sportivi:d})} currentUser={userDetails!} />} />
                <Route path="/user-management" element={<UserManagement onBack={()=>navigate('/')} {...appData} setAllRoles={(d)=>setData({allRoles: d})} setSportivi={(d)=>setData({sportivi: d})} currentUser={userDetails!} setCurrentUser={()=>{}} permissions={permissions} />} />
                <Route path="/plati-scadente" element={<PlatiScadente onBack={()=>navigate('/')} onIncaseazaMultiple={()=>{}} onViewSportiv={()=>{}} {...appData} setPlati={(d)=>setData({plati: d})} currentUser={userDetails!} permissions={permissions} activeClubId={userDetails?.club_id || null} />} />
                <Route path="/jurnal-incasari" element={<JurnalIncasari onBack={()=>navigate('/')} onIncasareProcesata={fetchData} {...appData} setPlati={(d)=>setData({plati: d})} setTranzactii={(d)=>setData({tranzactii:d})} setTipuriPlati={(d)=>setData({tipuriPlati:d})} platiInitiale={[]} currentUser={userDetails!} />} />
                <Route path="/grupe" element={<GrupeManagement onBack={()=>navigate('/')} {...appData} setGrupe={(d)=>setData({grupe:d})} currentUser={userDetails!} />} />
                <Route path="/grade" element={<GradeManagement onBack={()=>navigate('/')} grade={appData.grade} setGrade={(d)=>setData({grade: d})} />} />
                <Route path="/stagii" element={<StagiiCompetitiiManagement type="Stagiu" onBack={()=>navigate('/')} {...appData} setEvenimente={(d)=>setData({evenimente:d})} setRezultate={(d)=>setData({rezultate:d})} setPlati={(d)=>setData({plati:d})} currentUser={userDetails!} permissions={permissions} />} />
                <Route path="/financial-dashboard" element={<FinancialDashboard onBack={()=>navigate('/')} {...appData} />} />
                <Route path="/raport-financiar" element={<RaportFinanciar onBack={()=>navigate('/')} {...appData} />} />
                <Route path="/deconturi-federatie" element={<FederationInvoices onBack={()=>navigate('/')} deconturi={appData.deconturiFederatie} setDeconturi={(d)=>setData({deconturiFederatie: d})} currentUser={userDetails!} permissions={permissions} />} />
                <Route path="/setari-club" element={<ClubSettings onBack={()=>navigate('/')} />} />
                <Route path="/tipuri-abonament" element={<TipuriAbonamentManagement onBack={()=>navigate('/')} {...appData} setTipuriAbonament={(d)=>setData({tipuriAbonament:d})} currentUser={userDetails!} />} />
                <Route path="/configurare-preturi" element={<ConfigurarePreturi onBack={()=>navigate('/')} grade={appData.grade} />} />
                <Route path="/taxe-anuale" element={<TaxeAnuale onBack={()=>navigate('/')} {...appData} setPlati={(d)=>setData({plati:d})} currentUser={userDetails!} />} />
                <Route path="/reduceri" element={<ReduceriManagement onBack={()=>navigate('/')} reduceri={appData.reduceri} setReduceri={(d)=>setData({reduceri: d})} />} />
                <Route path="/nomenclatoare" element={<GestionareNomenclatoare onBack={()=>navigate('/')} {...appData} setTipuriPlati={(d)=>setData({tipuriPlati:d})} />} />
                <Route path="/cluburi" element={<CluburiManagement onBack={()=>navigate('/')} {...appData} setClubs={(d)=>setData({clubs:d})} currentUser={userDetails!} permissions={permissions} />} />
                <Route path="/structura-federatie" element={<FederationStructure onBack={()=>navigate('/')} onNavigate={handleNavigate} {...appData} />} />
                <Route path="/notificari" element={<Notificari onBack={()=>navigate('/')} currentUser={userDetails!} />} />
                <Route path="/data-maintenance" element={<DataMaintenancePage onBack={()=>navigate('/')} onDataRestored={fetchData} {...appData} setSportivi={(d)=>setData({sportivi:d})} setPlati={(d)=>setData({plati:d})} onNavigate={handleNavigate} currentUser={userDetails!} />} />
                <Route path="/admin-console" element={<AdminConsole onBack={()=>navigate('/')} currentUser={userDetails!} userRoles={[]} activeRoleContext={null} {...appData} permissions={permissions} />} />
                <Route path="/prezenta" element={<PrezentaManagement onBack={()=>navigate('/')} currentUser={userDetails!} />} />
                <Route path="/prezenta-instructor" element={<InstructorPrezentaPage onBack={()=>navigate('/')} onNavigate={handleNavigate} allClubSportivi={appData.sportivi} currentUser={userDetails!} grade={appData.grade} />} />
                <Route path="/raport-prezenta" element={<RaportPrezenta onBack={()=>navigate('/')} onViewSportiv={()=>{}} {...appData} />} />
                <Route path="/raport-lunar-prezenta" element={<RaportLunarPrezenta onBack={()=>navigate('/')} {...appData} />} />
                <Route path="/raport-activitate" element={<RaportActivitate onBack={()=>navigate('/')} currentUser={userDetails!} />} />
                <Route path="/activitati" element={<ProgramareActivitati onBack={()=>navigate('/')} {...appData} setAntrenamente={(d)=>setData({antrenamente:d})} />} />
                <Route path="/gestiune-facturi" element={<GestiuneFacturi onBack={()=>navigate('/')} {...appData} setPlati={(d)=>setData({plati:d})} currentUser={userDetails!} />} />

                {/* Sportiv Routes */}
                <Route path="/dashboard-sportiv" element={<SportivDashboard currentUser={userDetails!} {...appData} setAnunturi={(d)=>setData({anunturiPrezenta:d})} appDataError={fetchError} onNavigate={handleNavigate} permissions={permissions} canSwitchRoles={false} activeRole={userDetails?.rol || ''} onSwitchRole={()=>{}} isSwitchingRole={false} />} />
                <Route path="/account-settings" element={<EditareProfilPersonal user={userDetails!} onBack={()=>navigate(permissions.hasAdminAccess ? '/' : '/dashboard-sportiv')} setCurrentUser={()=>{}} setSportivi={(d)=>setData({sportivi: d})} />} />
                <Route path="/fisa-digitala" element={<FisaDigitalaSportiv currentUser={userDetails!} onBack={()=>navigate('/dashboard-sportiv')} {...appData} />} />
                <Route path="/fisa-competitie" element={<FisaCompetitie currentUser={userDetails!} onBack={()=>navigate('/dashboard-sportiv')} {...appData} />} />
                <Route path="/istoric-prezenta" element={<MartialAttendance currentUser={userDetails!} onBack={()=>navigate('/dashboard-sportiv')} {...appData} />} />
                <Route path="/istoric-plati" element={<IstoricPlati viewedUser={userDetails!} onBack={()=>navigate('/dashboard-sportiv')} {...appData} />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

const App: React.FC = () => {
    const { userDetails, isLoading, initialize, logout } = useAuthStore();
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [isChoosingRole, setIsChoosingRole] = useState(false);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);

    useEffect(() => {
        if (!supabase) return;
        initialize();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            initialize();
        });
        return () => subscription.unsubscribe();
    }, [initialize]);

    useEffect(() => {
        const checkRoles = async () => {
            if (userDetails?.user_id) {
                const { data, error } = await supabase.rpc('get_user_contexts');
                if (error) { console.error("Error fetching multi-role contexts:", error); return; }
                
                if (data && data.length > 1 && !userDetails.rol_activ_context) {
                    setUserRoles(data);
                    setIsChoosingRole(true);
                } else {
                    setIsChoosingRole(false);
                }
            }
        };
        checkRoles();
    }, [userDetails]);
    
    const handleSelectRole = async (roleContext: any) => {
        if (!supabase) return;
        setIsSwitchingRole(true);
        const { error } = await supabase.rpc('set_primary_context', {
            p_sportiv_id: roleContext.sportiv_id,
            p_rol_denumire: roleContext.rol_denumire
        });
        if (error) {
            console.error(error);
            setIsSwitchingRole(false);
            return;
        }
        await initialize();
        setIsChoosingRole(false);
        setIsSwitchingRole(false);
    };

    if (isLoading) {
        return <LoadingScreen />;
    }
    
    if (userDetails && isChoosingRole) {
        return <RoleSelectionPage roles={userRoles} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={logout} />;
    }

    if (userDetails?.trebuie_schimbata_parola) {
        return <MandatoryPasswordChange currentUser={userDetails} onPasswordChanged={initialize} />;
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
