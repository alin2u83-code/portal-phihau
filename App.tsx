import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, SesiuneExamen, Grad, InscriereExamen, View, Antrenament, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol, AnuntPrezenta, Reducere, AnuntGeneral, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, Permissions } from './types';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { GestiuneExamene } from './components/Examene';
import { GradeManagement } from './components/Grade';
import { PrezentaManagement } from './components/PrezentaManagement';
import { GrupeManagement } from './components/Grupe';
import { RaportPrezenta } from './components/RaportPrezenta';
import { StagiiCompetitiiManagement } from './components/StagiiCompetitii';
import { PlatiScadente } from './components/PlatiScadente';
import { JurnalIncasari } from './components/JurnalIncasari';
import { TipuriAbonamentManagement } from './components/TipuriAbonament';
import { ConfigurarePreturi } from './components/ConfigurarePreturi';
import { RaportFinanciar } from './components/RaportFinanciar';
import { FamiliiManagement } from './components/Familii';
import { AuthContainer } from './components/AuthContainer';
import { UserManagement } from './components/UserManagement';
import { Session } from '@supabase/supabase-js';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { BackupManager } from './components/BackupManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ProgramareActivitati } from './components/Activitati';
import { ClubSettings } from './components/ClubSettings';
import { DataInspector } from './components/DataInspector';
import { ReduceriManagement } from './components/Reduceri';
import { Notificari } from './components/Notificari';
import { TaxeAnuale } from './components/TaxeAnuale';
import { GestionareNomenclatoare } from './components/GestionareNomenclatoare';
import { FinancialDashboard } from './components/FinancialDashboard';
import { GestiuneFacturi } from './components/GestiuneFacturi';
import { IstoricPlati } from './components/FacturiPersonale';
import { CalendarView } from './components/CalendarView';
import { RapoarteExamen } from './components/RapoarteExamen';
import { CluburiManagement } from './components/CluburiManagement';
import { FederationStructure } from './components/FederationStructure';
import { usePermissions } from './hooks/usePermissions';
import AccessDenied from './components/AccessDenied';
import { useClubFilter } from './hooks/useClubFilter';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import ErrorBoundary from './components/ErrorBoundary';
import { SystemGuardian } from './components/SystemGuardian';
import { AdminDebugFloatingPanel } from './components/AdminDebugFloatingPanel';
import { getAuthenticatedUser } from './utils/auth';
import { FederationInvoices } from './components/FederationInvoices';
import { MartialAttendance } from './components/MartialAttendance';
import { AccountSettings } from './components/AccountSettings';
import { GlobalContextSwitcher } from './components/GlobalContextSwitcher';
import { FederationDashboard } from './components/FederationDashboard';
import { FisaDigitalaSportiv } from './components/FisaDigitalaSportiv';
import { FisaCompetitie } from './components/FisaCompetitie';
import { InstructorPrezentaPage } from './components/InstructorPrezentaPage';
import { RaportActivitate } from './components/RaportActivitate';
import { BackdoorCheck } from './components/BackdoorCheck';
import { BackdoorTest } from './components/BackdoorTest';
import { AdminConsole } from './components/AdminConsole';
import { ArhivaPrezente } from './components/ArhivaPrezente';
import { SUPER_ADMIN_ROLE_ID, FEDERATIE_ID } from './constants';
import { AdminMasterMap } from './components/AdminMasterMap';
import { GeneralAttendanceWidget } from './components/GeneralAttendanceWidget';
import { SportivDashboard } from './components/SportivDashboard';
import { Card, Button } from './components/ui';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { InAppNotifications } from './components/InAppNotifications';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [activeRoleContext, setActiveRoleContext] = useState<any | null>(null);
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const { showError } = useError();

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
  
  const [platiPentruIncasare, setPlatiPentruIncasare] = useState<Plata[]>([]);

  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
  const [adminContext, setAdminContext] = useLocalStorage<'club' | 'federation'>('phi-hau-admin-context', 'club');
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [switchingToRole, setSwitchingToRole] = useState<string | null>(null);

  const activeRole = useMemo((): Rol['nume'] | null => {
    return activeRoleContext?.rol_denumire || null;
  }, [activeRoleContext]);

  const permissions = usePermissions(currentUser, activeRole);
  const { activeClubId, globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser, permissions, activeRoleContext);

   const canSwitchRoles = useMemo(() => {
        if (!currentUser || !userRoles || userRoles.length <= 1) return false;
        // Permite comutarea dacă există mai mult de un context de rol
        return true;
    }, [currentUser, userRoles]);
    
  const handleSwitchRole = useCallback(async (roleName: Rol['nume']) => {
      if (!supabase || !currentUser?.user_id) return;
      setIsSwitchingRole(true);
      setSwitchingToRole(roleName);
      
      const { error } = await supabase.rpc('set_active_role', { p_role_name: roleName });

      if (error) {
          showError("Eroare la comutarea rolului", error.message);
          setIsSwitchingRole(false);
          setSwitchingToRole(null);
      } else {
          if (roleName === 'Sportiv') {
              localStorage.setItem('phi-hau-redirect-after-role-switch', 'my-portal');
          } else {
              localStorage.removeItem('phi-hau-redirect-after-role-switch');
          }
          // The page will reload, so no need to reset state here
          setTimeout(() => window.location.reload(), 1200);
      }
  }, [currentUser, showError]);

  useEffect(() => {
    const redirectView = localStorage.getItem('phi-hau-redirect-after-role-switch');
    if (redirectView) {
        setActiveView(redirectView as View);
        localStorage.removeItem('phi-hau-redirect-after-role-switch');
    }
  }, [setActiveView]);

  useEffect(() => {
    if (currentUser && !permissions.hasAdminAccess && activeRoleContext) {
        const adminViews: View[] = [
            'sportivi', 'examene', 'grade', 'prezenta', 'grupe', 'raport-prezenta',
            'stagii', 'competitii', 'plati-scadente', 'jurnal-incasari', 'raport-financiar',
            'configurare-preturi', 'tipuri-abonament', 'familii', 'user-management',
            'data-maintenance', 'activitati', 'setari-club', 'data-inspector', 'reduceri',
            'notificari', 'taxe-anuale', 'nomenclatoare', 'financial-dashboard',
            'finalizare-examen', 'rapoarte-examen', 'cluburi', 'structura-federatie', 'deconturi-federatie',
            'federation-dashboard', 'gestiune-facturi', 'prezenta-instructor', 'raport-activitate', 'admin-console'
        ];
        if (adminViews.includes(activeView)) {
            setActiveView('my-portal');
        }
    }
  }, [currentUser, permissions, activeView, setActiveView, activeRoleContext]);

  const initializeAndFetchData = useCallback(async () => {
    if (!supabase) return;

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const isMasterAdminSession = currentSession?.user?.email === 'alin2u83@gmail.com';

    if (!currentSession) {
        setCurrentUser(null);
        setSession(null);
        setLoading(false);
        return;
    }

    if (!isMasterAdminSession) {
        setLoading(true);
    }
    
    setProfileError(null);
    setActiveRoleContext(null);

    const { user: profile, roles, error: profileFetchError } = await getAuthenticatedUser(supabase);

    if (profileFetchError) {
        showError("Eroare Critică la Preluarea Profilului", profileFetchError);
        setProfileError(profileFetchError.message);
        if (!isMasterAdminSession) {
            await supabase.auth.signOut();
            setCurrentUser(null);
            setSession(null);
        }
        setLoading(false);
        return;
    }

    if (!profile) {
        if (!isMasterAdminSession) {
            setCurrentUser(null);
            setSession(null);
        }
        setLoading(false);
        return;
    }

    setCurrentUser(profile);
    setUserRoles(roles || []);
    setSession(currentSession);
    
    if (roles && roles.length > 0) {
        if (roles.length === 1) {
            setActiveRoleContext(roles[0]);
        } else {
            const preferredRole = profile.rol_activ_context
                ? roles.find(r => r.rol_denumire === profile.rol_activ_context)
                : null;
            
            if (preferredRole) {
                setActiveRoleContext(preferredRole);
            } else {
                // FALLBACK: No active role set in DB, or the one set is invalid.
                // Automatically select the first role to unblock the user from the role selection page.
                const defaultRole = roles[0];
                setActiveRoleContext(defaultRole);
                
                // Asynchronously update the DB with this default choice for the next session.
                supabase.rpc('set_active_role', { p_role_name: defaultRole.rol_denumire })
                    .then(({ error: rpcError }) => {
                        if (rpcError) {
                            console.warn("Could not set default active role in DB:", rpcError.message);
                        }
                    });
            }
        }
    } else if (profile) {
        setProfileError("Contul dumneavoastră nu este asociat cu niciun rol. Vă rugăm contactați un administrator.");
    }


    if (profile.trebuie_schimbata_parola) {
        showError( "Securitate Cont", "Este necesar să vă schimbați parola. Aceasta este temporară sau a expirat.");
    }

    try {
        const queries = [
            supabase.from('cluburi').select('*'),
            supabase.from('roluri').select('*'),
            supabase.from('grade').select('*'),
            supabase.from('grupe').select('*, program_antrenamente!grupa_id(*)'),
            supabase.from('tipuri_abonament').select('*'),
            supabase.from('nom_locatii').select('*'),
            supabase.from('tipuri_plati').select('*'),
            supabase.from('reduceri').select('*'),
            supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))'),
            supabase.from('sesiuni_examene').select('*'),
            supabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)'),
            supabase.from('program_antrenamente').select('*, grupe(*), prezenta:prezenta_antrenament!antrenament_id(sportiv_id, status)'),
            supabase.from('plati').select('*'),
            supabase.from('tranzactii').select('*'),
            supabase.from('evenimente').select('*'),
            supabase.from('rezultate').select('*'),
            supabase.from('familii').select('*'),
            supabase.from('anunturi_prezenta').select('*'),
            supabase.from('preturi_config').select('*'),
            supabase.from('deconturi_federatie').select('*'),
            supabase.from('istoric_grade').select('*'),
        ];
        
        const settledResults = await Promise.allSettled(queries);
        
        const processedResults = settledResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                const { data, error } = result.value;
                if (error && (error.code === '42501' || String(error.code) === '403' || error.message.includes('permission denied'))) {
                    console.warn(`RLS a blocat accesul la tabelul ${index}. Se returnează un array gol.`, error.message);
                    return { data: [], error: null };
                }
                if (error) {
                    throw error;
                }
                return { data, error };
            } else {
                 const error = result.reason;
                 if (error.code === '42501' || String(error.code) === '403' || error.message.includes('permission denied')) {
                     console.warn(`RLS a blocat accesul la tabelul ${index}. Se returnează un array gol.`, error.message);
                    return { data: [], error: null };
                 }
                throw error;
            }
        });

        const [
            { data: clubsData }, { data: rolesData }, { data: gradesData }, { data: groupsData },
            { data: subscriptionTypesData }, { data: locatiiData }, { data: platiTypesData },
            { data: reduceriData }, { data: sportiviData }, { data: sessionsData },
            { data: registrationsData }, { data: trainingsData }, { data: platiData },
            { data: tranzactiiData }, { data: eventsData }, { data: resultsData },
            { data: familiesData }, { data: anunturiData }, { data: pricesData }, { data: deconturiData },
            { data: istoricGradeData }
        ] = processedResults;
        
        const clubsMap = new Map((clubsData || []).map(c => [c.id, c]));

        const allSportivi = sportiviData?.map(s => ({
            ...s,
            roluri: (((s as any).sportivi_roluri?.map((sr: any) => sr.roluri)) || []).filter(Boolean),
            cluburi: s.club_id ? (clubsMap.get(s.club_id) || { id: s.club_id, nume: 'Club Indisponibil' }) : null
        })) || [];
        
        const allGrupe = groupsData?.map(g => ({ ...g, program: g.program_antrenamente })) || [];

        setSportivi(allSportivi as Sportiv[]);
        setSesiuniExamene(sessionsData || []);
        setInscrieriExamene(registrationsData || []);
        setIstoricGrade(istoricGradeData || []);
        setAntrenamente(trainingsData?.map(t => {
            const prezentaRaw = (t as any).prezenta;
            const prezentaArray = prezentaRaw ? (Array.isArray(prezentaRaw) ? prezentaRaw : [prezentaRaw]) : [];
            return { ...t, prezenta: prezentaArray };
        }) || []);
        setPlati(platiData || []);
        setTranzactii(tranzactiiData || []);
        setEvenimente(eventsData || []);
        setRezultate(resultsData || []);
        setFamilii(familiesData || []);
        setAnunturiPrezenta(anunturiData || []);
        setPreturiConfig(pricesData || []);
        setClubs(clubsData || []);
        setAllRoles(rolesData || []);
        setGrade(gradesData || []);
        setGrupe(allGrupe || []);
        setTipuriAbonament(subscriptionTypesData || []);
        setLocatii(locatiiData || []);
        setTipuriPlati(platiTypesData || []);
        setReduceri(reduceriData || []);
        setDeconturiFederatie(deconturiData || []);

    } catch (err: any) {
        showError("Eroare la încărcarea datelor aplicației", err.message);
    } finally {
        setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            initializeAndFetchData();
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setUserRoles([]);
            setActiveRoleContext(null);
            setLoading(false);
        }
    });

    return () => subscription.unsubscribe();
  }, [initializeAndFetchData]);

  const filteredData = useMemo(() => {
    if (!permissions.isFederationAdmin || !activeClubId) {
        return {
            sportivi, sesiuniExamene, inscrieriExamene, antrenamente, grupe, plati,
            tranzactii, evenimente, rezultate, tipuriAbonament, familii,
            anunturiPrezenta, reduceri, deconturiFederatie, istoricGrade
        };
    }

    const fSportivi = sportivi.filter(s => s.club_id === activeClubId);
    const fGrupe = grupe.filter(g => g.club_id === activeClubId);
    
    const fSesiuniExamene = sesiuniExamene.filter(s => s.club_id === activeClubId || s.club_id === null);
    const fEvenimente = evenimente.filter(e => e.club_id === activeClubId || e.club_id === null);
    const fTipuriAbonament = tipuriAbonament.filter(t => t.club_id === activeClubId || t.club_id === null);
    const fDeconturiFederatie = deconturiFederatie.filter(d => d.club_id === activeClubId);

    const sportivIdsInClub = new Set(fSportivi.map(s => s.id));
    const grupaIdsInClub = new Set(fGrupe.map(g => g.id));
    
    const fFamilii = familii.filter(fam => sportivi.some(s => s.familie_id === fam.id && s.club_id === activeClubId));
    const familieIdsInClub = new Set(fFamilii.map(f => f.id));

    const fPlati = plati.filter(p => (p.sportiv_id && sportivIdsInClub.has(p.sportiv_id)) || (p.familie_id && familieIdsInClub.has(p.familie_id)));
    const fTranzactii = tranzactii.filter(t => (t.sportiv_id && sportivIdsInClub.has(t.sportiv_id)) || (t.familie_id && familieIdsInClub.has(t.familie_id)));
    const fAntrenamente = antrenamente.filter(a => a.grupa_id === null || (a.grupa_id && grupaIdsInClub.has(a.grupa_id)));
    const fInscrieriExamene = inscrieriExamene.filter(i => sportivIdsInClub.has(i.sportiv_id));
    const fRezultate = rezultate.filter(r => sportivIdsInClub.has(r.sportiv_id));
    const fAnunturiPrezenta = anunturiPrezenta.filter(a => sportivIdsInClub.has(a.sportiv_id));
    const fIstoricGrade = istoricGrade.filter(ig => sportivIdsInClub.has(ig.sportiv_id));

    return {
        sportivi: fSportivi,
        sesiuniExamene: fSesiuniExamene,
        inscrieriExamene: fInscrieriExamene,
        antrenamente: fAntrenamente,
        grupe: fGrupe,
        plati: fPlati,
        tranzactii: fTranzactii,
        evenimente: fEvenimente,
        rezultate: fRezultate,
        tipuriAbonament: fTipuriAbonament,
        familii: fFamilii,
        anunturiPrezenta: fAnunturiPrezenta,
        reduceri,
        deconturiFederatie: fDeconturiFederatie,
        istoricGrade: fIstoricGrade
    };
}, [
    activeClubId, permissions.isFederationAdmin, sportivi, sesiuniExamene, inscrieriExamene, antrenamente,
    grupe, plati, tranzactii, evenimente, rezultate, tipuriAbonament,
    familii, anunturiPrezenta, reduceri, deconturiFederatie, istoricGrade
]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const handleSelectRole = async (role: any) => {
    if (!supabase || !currentUser?.user_id) return;
    setIsSelectingRole(true);
    
    // Using the SECURITY DEFINER RPC function is the correct, robust way to bypass RLS for this specific update.
    const { error } = await supabase.rpc('set_active_role', { p_role_name: role.rol_denumire });

    if (error) {
        showError("Eroare la selectarea rolului", error.message);
        setIsSelectingRole(false);
    } else {
        // Reloading the page is the safest way to get the new JWT
        // with the updated metadata and refetch all data with the new permissions.
        window.location.reload();
    }
  };
  
  const handleIncaseazaMultiple = (platiSelectate: Plata[]) => {
    setPlatiPentruIncasare(platiSelectate);
    setActiveView('jurnal-incasari');
  };

  const handleJurnalBack = () => {
    const previousView = platiPentruIncasare.length > 0 ? 'plati-scadente' : 'dashboard';
    setPlatiPentruIncasare([]);
    setActiveView(previousView);
  };

  const handleIncasareProcesata = () => {
    setPlatiPentruIncasare([]);
    initializeAndFetchData();
  };

  const renderContent = () => {
    // This check is now redundant because it's handled by the top-level render logic
    // if (!currentUser) return <AuthContainer />;
    
    if (currentUser && currentUser.trebuie_schimbata_parola) {
      return <MandatoryPasswordChange currentUser={currentUser} onPasswordChanged={initializeAndFetchData} />;
    }
    
    const renderProtected = (view: React.ReactNode, hasAccess: boolean) => {
        return hasAccess ? view : <AccessDenied onBack={() => setActiveView('dashboard')} />;
    };

    const isAtLeastInstructor = permissions.hasAdminAccess;
    const isAtLeastClubAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
    const isFederationAdmin = permissions.isFederationAdmin;
    const canManageFinances = isAtLeastClubAdmin || permissions.isInstructor;
    const onViewSportiv = (s: Sportiv) => { setSelectedSportiv(s); setActiveView('profil-sportiv'); };
    const isEmergencyAdmin = currentUser?.email === 'alin2u83@gmail.com';

    switch (activeView) {
      case 'admin-console':
        return renderProtected(
            <AdminConsole 
                currentUser={currentUser!}
                userRoles={userRoles}
                activeRoleContext={activeRoleContext}
                onBack={() => setActiveView('dashboard')}
                sportivi={filteredData.sportivi}
                allRoles={allRoles}
                clubs={clubs}
                permissions={permissions}
            />, 
            permissions.hasAdminAccess || isEmergencyAdmin
        );

      case 'dashboard':
      case 'my-portal':
        if (permissions.hasAdminAccess) {
            if (sportivi.length === 0 && !isEmergencyAdmin && !loading) {
                return (
                    <div className="space-y-8 animate-fade-in-down">
                        <header>
                            <h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1>
                            <p className="text-slate-400">Selectează un modul pentru a începe.</p>
                        </header>
                        <Card className="text-center p-8">
                            <p className="text-slate-400 italic">Așteptare autorizare date sau nu există date pentru contextul selectat...</p>
                        </Card>
                    </div>
                )
            }
            if (permissions.isSuperAdmin && adminContext === 'federation') {
                return <FederationDashboard onNavigate={setActiveView} />;
            }
            return (
                <div className="space-y-8 animate-fade-in-down">
                    <header>
                        <h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1>
                        <p className="text-slate-400">Selectează un modul pentru a începe.</p>
                    </header>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
                        <div className="lg:col-span-2">
                            <AdminMasterMap 
                                onNavigate={setActiveView}
                                deconturiFederatie={filteredData.deconturiFederatie || []}
                                inscrieriExamene={filteredData.inscrieriExamene || []}
                                plati={filteredData.plati || []}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            {(permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin) && (
                                <GeneralAttendanceWidget currentUser={currentUser!} />
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        // Sportiv View
        return (
            <SportivDashboard
                currentUser={currentUser!}
                viewedUser={currentUser!}
                participari={filteredData.inscrieriExamene}
                examene={sesiuniExamene}
                grade={grade}
                istoricGrade={filteredData.istoricGrade}
                grupe={filteredData.grupe}
                plati={filteredData.plati}
                onNavigate={setActiveView}
                antrenamente={filteredData.antrenamente}
                anunturi={anunturiPrezenta}
                setAnunturi={setAnunturiPrezenta}
                sportivi={filteredData.sportivi}
                permissions={permissions}
                canSwitchRoles={canSwitchRoles}
                activeRole={activeRole!}
                onSwitchRole={handleSwitchRole}
                isSwitchingRole={isSwitchingRole}
            />
        );
      
      case 'sportivi':
        return renderProtected(<SportiviManagement onBack={() => setActiveView('dashboard')} sportivi={filteredData.sportivi} setSportivi={setSportivi} grupe={filteredData.grupe} setGrupe={setGrupe} tipuriAbonament={filteredData.tipuriAbonament} familii={filteredData.familii} setFamilii={setFamilii} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={currentUser!} plati={filteredData.plati} setPlati={setPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} onViewSportiv={onViewSportiv} clubs={clubs} grade={grade} permissions={permissions} />, isAtLeastInstructor);

      case 'profil-sportiv':
        return renderProtected(selectedSportiv ? <UserProfile sportiv={selectedSportiv} currentUser={currentUser!} participari={filteredData.inscrieriExamene} examene={filteredData.sesiuniExamene} grade={grade} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} antrenamente={filteredData.antrenamente} plati={filteredData.plati} tranzactii={filteredData.tranzactii} reduceri={filteredData.reduceri} grupe={filteredData.grupe} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} allRoles={allRoles} setSportivi={setSportivi} setPlati={setPlati} setTranzactii={setTranzactii} onBack={() => setActiveView('sportivi')} clubs={clubs} /> : null, isAtLeastInstructor);

      case 'structura-federatie':
        return renderProtected(<FederationStructure clubs={clubs} sportivi={sportivi} grupe={grupe} onBack={() => setActiveView('dashboard')} onNavigate={setActiveView} />, isFederationAdmin);

      case 'examene':
        return renderProtected(<GestiuneExamene currentUser={currentUser!} clubs={clubs} onBack={() => setActiveView('dashboard')} onNavigate={setActiveView} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} istoricGrade={istoricGrade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
        
      case 'stagii':
      case 'competitii':
        return renderProtected(<StagiiCompetitiiManagement type={activeView === 'stagii' ? 'Stagiu' : 'Competitie'} evenimente={filteredData.evenimente} setEvenimente={setEvenimente} rezultate={filteredData.rezultate} setRezultate={setRezultate} sportivi={filteredData.sportivi} preturiConfig={preturiConfig} inscrieriExamene={inscrieriExamene} examene={sesiuniExamene} grade={grade} setPlati={setPlati} onBack={() => setActiveView('dashboard')} currentUser={currentUser!} permissions={permissions}/>, permissions.isInstructor);

      case 'prezenta':
        return renderProtected(<PrezentaManagement sportivi={filteredData.sportivi} setSportivi={setSportivi} antrenamente={filteredData.antrenamente} setAntrenamente={setAntrenamente} grupe={filteredData.grupe} onBack={() => setActiveView('dashboard')} setPlati={setPlati} plati={filteredData.plati} tipuriAbonament={filteredData.tipuriAbonament} anunturi={filteredData.anunturiPrezenta} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);
      
      case 'prezenta-instructor':
        return renderProtected(<InstructorPrezentaPage onBack={() => setActiveView('dashboard')} onNavigate={setActiveView} allClubSportivi={filteredData.sportivi} currentUser={currentUser!} grade={grade} />, permissions.isInstructor);
      
      case 'arhiva-prezente':
        return renderProtected(<ArhivaPrezente onBack={() => setActiveView('prezenta-instructor')} />, permissions.isInstructor);
        
      case 'raport-activitate':
        return renderProtected(<RaportActivitate onBack={() => setActiveView('dashboard')} currentUser={currentUser!} />, permissions.isInstructor);

      case 'grupe':
        return renderProtected(<GrupeManagement grupe={filteredData.grupe} setGrupe={setGrupe} onBack={() => setActiveView('dashboard')} currentUser={currentUser!} clubs={clubs} />, isAtLeastInstructor);

      case 'activitati':
        return renderProtected(<ProgramareActivitati antrenamente={filteredData.antrenamente} setAntrenamente={setAntrenamente} grupe={filteredData.grupe} onBack={() => setActiveView('dashboard')} />, isAtLeastInstructor);

      case 'raport-prezenta':
        return renderProtected(<RaportPrezenta antrenamente={filteredData.antrenamente} sportivi={filteredData.sportivi} grupe={filteredData.grupe} onBack={() => setActiveView('dashboard')} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);

      case 'calendar':
        return <CalendarView 
            antrenamente={filteredData.antrenamente} 
            sesiuniExamene={filteredData.sesiuniExamene} 
            evenimente={filteredData.evenimente} 
            grupe={filteredData.grupe} 
            locatii={locatii} 
            onBack={() => setActiveView('dashboard')} 
            onNavigate={setActiveView} 
            currentUser={currentUser!} 
            sportivi={filteredData.sportivi} 
            rezultate={filteredData.rezultate} 
            setRezultate={setRezultate} 
            plati={filteredData.plati} 
            setPlati={setPlati} 
            preturiConfig={preturiConfig}
            permissions={permissions}
        />;

      case 'financial-dashboard':
        return renderProtected(<FinancialDashboard plati={filteredData.plati} tranzactii={filteredData.tranzactii} sportivi={filteredData.sportivi} familii={filteredData.familii} onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);

      case 'gestiune-facturi':
        return renderProtected(<GestiuneFacturi onBack={() => setActiveView('dashboard')} currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} tipuriPlati={tipuriPlati} familii={filteredData.familii} />, canManageFinances);

      case 'deconturi-federatie':
        return renderProtected(<FederationInvoices deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} currentUser={currentUser!} onBack={() => setActiveView('dashboard')} permissions={permissions} />, isAtLeastClubAdmin);

      case 'plati-scadente':
        return renderProtected(<PlatiScadente plati={filteredData.plati} inscrieriExamene={filteredData.inscrieriExamene} grade={grade} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} tranzactii={tranzactii} reduceri={reduceri} onIncaseazaMultiple={handleIncaseazaMultiple} onBack={() => setActiveView('dashboard')} onViewSportiv={onViewSportiv} currentUser={currentUser!} clubs={clubs} permissions={permissions} />, canManageFinances);

      case 'jurnal-incasari':
        return renderProtected(<JurnalIncasari currentUser={currentUser!} plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} preturiConfig={preturiConfig} tipuriAbonament={filteredData.tipuriAbonament} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} platiInitiale={platiPentruIncasare} onIncasareProcesata={handleIncasareProcesata} onBack={handleJurnalBack} reduceri={reduceri} />, canManageFinances);

      case 'raport-financiar':
        return renderProtected(<RaportFinanciar plati={filteredData.plati} sportivi={filteredData.sportivi} familii={filteredData.familii} tranzactii={filteredData.tranzactii} onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);

      case 'user-management':
        return renderProtected(<UserManagement sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser!} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} onBack={() => setActiveView('dashboard')} clubs={clubs} permissions={permissions} />, isAtLeastClubAdmin);

      case 'cluburi':
        return renderProtected(<CluburiManagement clubs={clubs} setClubs={setClubs} onBack={() => setActiveView('dashboard')} currentUser={currentUser!} permissions={permissions} />, isFederationAdmin);
      
      case 'data-maintenance':
        return renderProtected(<BackupManager onBack={() => setActiveView('dashboard')} onDataRestored={() => window.location.reload()} sportivi={sportivi} setSportivi={setSportivi} grade={grade} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} setPlati={setPlati} familii={familii} onNavigate={setActiveView} currentUser={currentUser!} />, isFederationAdmin);
      
      case 'rapoarte-examen':
        return renderProtected(<RapoarteExamen currentUser={currentUser!} clubs={clubs} onBack={() => setActiveView('dashboard')} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} istoricGrade={istoricGrade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
      
      case 'setari-club':
        return renderProtected(<ClubSettings onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);
        
      case 'tipuri-abonament':
        return renderProtected(<TipuriAbonamentManagement tipuriAbonament={filteredData.tipuriAbonament} setTipuriAbonament={setTipuriAbonament} onBack={() => setActiveView('dashboard')} currentUser={currentUser!} clubs={clubs}/>, isAtLeastClubAdmin);

      case 'configurare-preturi':
        return renderProtected(<ConfigurarePreturi grade={grade} onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);

      case 'grade':
        return renderProtected(<GradeManagement grade={grade} setGrade={setGrade} onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);

      case 'reduceri':
        return renderProtected(<ReduceriManagement reduceri={reduceri} setReduceri={setReduceri} onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);
      
      case 'nomenclatoare':
        return renderProtected(<GestionareNomenclatoare tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} plati={plati} onBack={() => setActiveView('dashboard')} />, isAtLeastClubAdmin);

      case 'familii':
        return renderProtected(<FamiliiManagement familii={filteredData.familii} setFamilii={setFamilii} sportivi={filteredData.sportivi} setSportivi={setSportivi} onBack={() => setActiveView('dashboard')} tipuriAbonament={filteredData.tipuriAbonament} grupe={filteredData.grupe} currentUser={currentUser!} />, isAtLeastInstructor);
        
      case 'notificari':
        return renderProtected(<Notificari onBack={() => setActiveView('dashboard')} currentUser={currentUser!}/>, isAtLeastInstructor);
      
      case 'taxe-anuale':
        return renderProtected(<TaxeAnuale onBack={() => setActiveView('dashboard')} currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} />, isAtLeastClubAdmin);

      case 'istoric-prezenta':
        return <MartialAttendance currentUser={currentUser!} antrenamente={antrenamente} grupe={grupe} onBack={() => setActiveView('my-portal')} />;

      case 'istoric-plati':
        return <IstoricPlati viewedUser={currentUser!} plati={plati} tranzactii={tranzactii} onBack={() => setActiveView('my-portal')} />;

      case 'account-settings':
        return <AccountSettings currentUser={currentUser!} onBack={() => setActiveView('my-portal')} />;
      
      case 'fisa-digitala':
        return <FisaDigitalaSportiv currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} onBack={() => setActiveView('my-portal')} />;

      case 'fisa-competitie':
        return <FisaCompetitie currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} onBack={() => setActiveView('my-portal')} />;

      case 'backdoor-check':
        return <BackdoorCheck currentUser={currentUser!} onBack={() => setActiveView('dashboard')} />;
        
      case 'backdoor-test':
        return <BackdoorTest currentUser={currentUser!} onBack={() => setActiveView('dashboard')} activeRole={activeRole!} />;

      default:
         return <div>Lipsește Vizualizarea</div>;
    }
  };

  return (
    <SystemGuardian isLoading={loading} currentUser={currentUser} permissions={permissions} error={profileError}>
      {isSwitchingRole && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
            <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-white text-lg font-bold">Se verifică gradul și permisiunile în contextul {switchingToRole}...</p>
        </div>
      )}
      {!session ? (
            <AuthContainer />
        ) : (currentUser && userRoles.length > 1 && !activeRoleContext) ? (
            <RoleSelectionPage
                roles={userRoles}
                onSelect={handleSelectRole}
                loading={isSwitchingRole}
                onLogout={handleLogout}
            />
        ) : currentUser ? (
            <div className="flex min-h-screen bg-[var(--bg-main)]">
              <Sidebar 
                currentUser={currentUser} 
                onNavigate={setActiveView} 
                onLogout={handleLogout} 
                activeView={activeView} 
                isExpanded={isSidebarExpanded} 
                setIsExpanded={setIsSidebarExpanded} 
                clubs={clubs}
                globalClubFilter={globalClubFilter}
                setGlobalClubFilter={setGlobalClubFilter}
                permissions={permissions}
                activeRole={activeRole!}
                canSwitchRoles={canSwitchRoles}
                onSwitchRole={handleSwitchRole}
                isSwitchingRole={isSwitchingRole}
                grade={grade}
              />
              <main className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
                <div className="absolute top-4 right-8 z-30">
                  {currentUser && permissions.hasAdminAccess && <InAppNotifications currentUser={currentUser} />}
                </div>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                  {permissions.isSuperAdmin && activeView === 'dashboard' && <GlobalContextSwitcher activeContext={adminContext} onContextChange={setAdminContext} />}
                  <ErrorBoundary onNavigate={setActiveView}>
                    {renderContent()}
                  </ErrorBoundary>
                </div>
              </main>
              {(import.meta as any).env.DEV && currentUser && (
                <AdminDebugFloatingPanel 
                    currentUser={currentUser}
                    onNavigate={setActiveView}
                />
              )}
            </div>
      ) : null}
    </SystemGuardian>
  );
}

export default App;