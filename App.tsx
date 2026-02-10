import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
// FIX: Added 'Plata' to imports to resolve 'Cannot find name' errors.
import { Sportiv, View, Rol, Permissions, Plata, VizualizarePlata } from './types';
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
import { AdminMasterMap } from './components/AdminMasterMap';
import { SportivDashboard } from './components/SportivDashboard';
import { Card } from './components/ui';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { RaportLunarPrezenta } from './components/RaportLunarPrezenta';
import { Header } from './components/Header';
import { useDataProvider } from './hooks/useDataProvider';
import { useIsMobile } from './hooks/useIsMobile';
import { MobileSkeletonLoader } from './components/MobileSkeletonLoader';
import { AdminDashboard } from './components/AdminDashboard';


function App() {
  const { showError } = useError();
  const isMobile = useIsMobile();
  const dataProvider = useDataProvider();

  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
  const [adminContext, setAdminContext] = useLocalStorage<'club' | 'federation'>('phi-hau-admin-context', 'club');
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [switchingToRole, setSwitchingToRole] = useState<string | null>(null);
  
  const {
      loading, error, needsRoleSelection, session, currentUser, userRoles, activeRoleContext,
      setCurrentUser, sportivi, sesiuniExamene, inscrieriExamene, grade, istoricGrade, antrenamente,
      grupe, plati, tranzactii, evenimente, rezultate, preturiConfig, tipuriAbonament,
      familii, allRoles, anunturiPrezenta, reduceri, tipuriPlati, locatii, clubs,
      deconturiFederatie, vizualizarePlati, setPlati, setSportivi, setSesiuniExamene, setInscrieriExamene,
      setAntrenamente, setGrupe, setTranzactii, setEvenimente, setRezultate, setFamilii,
      setAllRoles, setAnunturiPrezenta, setReduceri, setTipuriPlati, setLocatii, setClubs,
      setGrade, setTipuriAbonament, setDeconturiFederatie, setIstoricGrade
  } = dataProvider;

  const [platiPentruIncasare, setPlatiPentruIncasare] = useState<Plata[]>([]);


  const activeRole = useMemo((): Rol['nume'] | null => {
    return activeRoleContext?.rol_denumire || null;
  }, [activeRoleContext]);

  const permissions = usePermissions(currentUser, activeRole);
  const { activeClubId, loading: clubFilterLoading, globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser, permissions);
  
  const handleBackToDashboard = useCallback(() => {
    const dashboardView = permissions.hasAdminAccess && activeRole !== 'Sportiv' ? 'dashboard' : 'my-portal';
    setActiveView(dashboardView);
  }, [permissions.hasAdminAccess, activeRole, setActiveView]);

   const canSwitchRoles = useMemo(() => {
        if (!currentUser || !userRoles || userRoles.length <= 1) return false;
        return true;
    }, [currentUser, userRoles]);
    
  const handleSwitchRole = useCallback(async (roleName: Rol['nume']) => {
      if (!supabase || !currentUser?.user_id || !userRoles) return;
      
      let targetRoleContext: any = null;

      if (roleName === 'Sportiv') {
          targetRoleContext = userRoles.find(r => r.rol_denumire === 'Sportiv' && r.is_primary) || userRoles.find(r => r.rol_denumire === 'Sportiv');
      } else {
          targetRoleContext = userRoles.find(r => r.rol_denumire === roleName);
      }

      if (!targetRoleContext) {
          showError("Eroare la comutare", `Nu s-a găsit un context valid pentru rolul "${roleName}".`);
          return;
      }
      
      setIsSwitchingRole(true);
      setSwitchingToRole(roleName);
      
      const { error } = await supabase.rpc('set_primary_context', {
          p_sportiv_id: targetRoleContext.sportiv_id,
          p_rol_denumire: targetRoleContext.rol_denumire
      });

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
          setTimeout(() => window.location.reload(), 1200);
      }
  }, [currentUser, userRoles, showError]);

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
            'sportivi', 'grade', 'prezenta', 'grupe', 'raport-prezenta', 'raport-lunar-prezenta',
            'stagii', 'competitii', 'plati-scadente', 'jurnal-incasari', 'raport-financiar',
            'configurare-preturi', 'tipuri-abonament', 'familii', 'user-management',
            'data-maintenance', 'activitati', 'setari-club', 'data-inspector', 'reduceri',
            'notificari', 'taxe-anuale', 'nomenclatoare', 'financial-dashboard',
            'finalizare-examen', 'rapoarte-examen', 'cluburi', 'structura-federatie', 'deconturi-federatie',
            'federation-dashboard', 'gestiune-facturi', 'prezenta-instructor', 'raport-activitate', 'admin-console'
        ];
        if (adminViews.includes(activeView)) {
            setActiveView('my-portal');
            showError('Acces Neautorizat', 'Nu aveți permisiunile necesare pentru a accesa această pagină.');
        }
    }
  }, [currentUser, permissions, activeView, setActiveView, activeRoleContext, showError]);

  const filteredData = useMemo(() => {
    if (!permissions.isFederationAdmin || !activeClubId) {
        return {
            sportivi, sesiuniExamene, inscrieriExamene, antrenamente, grupe, plati,
            tranzactii, evenimente, rezultate, tipuriAbonament, familii,
            anunturiPrezenta, reduceri, deconturiFederatie, istoricGrade, vizualizarePlati
        };
    }

    const fSportivi = (sportivi || []).filter(s => s.club_id === activeClubId);
    const fGrupe = (grupe || []).filter(g => g.club_id === activeClubId);
    
    const fSesiuniExamene = (sesiuniExamene || []).filter(s => s.club_id === activeClubId || s.club_id === null);
    const fEvenimente = (evenimente || []).filter(e => e.club_id === activeClubId || e.club_id === null);
    const fTipuriAbonament = (tipuriAbonament || []).filter(t => t.club_id === activeClubId || t.club_id === null);
    const fDeconturiFederatie = (deconturiFederatie || []).filter(d => d.club_id === activeClubId);
    const fVizualizarePlati = (vizualizarePlati || []).filter(vp => vp.club_id === activeClubId);


    const sportivIdsInClub = new Set(fSportivi.map(s => s.id));
    const grupaIdsInClub = new Set(fGrupe.map(g => g.id));
    
    const fFamilii = (familii || []).filter(fam => (sportivi || []).some(s => s.familie_id === fam.id && s.club_id === activeClubId));
    const familieIdsInClub = new Set(fFamilii.map(f => f.id));

    const fPlati = (plati || []).filter(p => (p.sportiv_id && sportivIdsInClub.has(p.sportiv_id)) || (p.familie_id && familieIdsInClub.has(p.familie_id)));
    const fTranzactii = (tranzactii || []).filter(t => (t.sportiv_id && sportivIdsInClub.has(t.sportiv_id)) || (t.familie_id && familieIdsInClub.has(t.familie_id)));
    const fAntrenamente = (antrenamente || []).filter(a => a.grupa_id === null || (a.grupa_id && grupaIdsInClub.has(a.grupa_id)));
    const fInscrieriExamene = (inscrieriExamene || []).filter(i => sportivIdsInClub.has(i.sportiv_id));
    const fRezultate = (rezultate || []).filter(r => sportivIdsInClub.has(r.sportiv_id));
    const fAnunturiPrezenta = (anunturiPrezenta || []).filter(a => sportivIdsInClub.has(a.sportiv_id));
    const fIstoricGrade = (istoricGrade || []).filter(ig => sportivIdsInClub.has(ig.sportiv_id));

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
        istoricGrade: fIstoricGrade,
        vizualizarePlati: fVizualizarePlati
    };
}, [
    activeClubId, permissions.isFederationAdmin, sportivi, sesiuniExamene, inscrieriExamene, antrenamente,
    grupe, plati, tranzactii, evenimente, rezultate, tipuriAbonament,
    familii, anunturiPrezenta, reduceri, deconturiFederatie, istoricGrade, vizualizarePlati
]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const handleSelectRole = async (role: any) => {
    if (!supabase || !currentUser?.user_id) return;
    setIsSwitchingRole(true);
    
    const { error } = await supabase.rpc('set_primary_context', { p_sportiv_id: role.sportiv_id, p_rol_denumire: role.rol_denumire });

    if (error) {
        showError("Eroare la selectarea rolului", error.message);
        setIsSwitchingRole(false);
    } else {
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
  };

  const renderContent = () => {
    if (currentUser && currentUser.trebuie_schimbata_parola) {
      return <MandatoryPasswordChange currentUser={currentUser} onPasswordChanged={() => {}} />;
    }
    
    const renderProtected = (view: React.ReactNode, hasAccess: boolean) => {
        return hasAccess ? view : <AccessDenied onBack={() => setActiveView('dashboard')} />;
    };

    const isAtLeastInstructor = permissions.hasAdminAccess;
    const isAtLeastClubAdmin = permissions.isAdminClub || permissions.isFederationAdmin;
    const isFederationAdmin = permissions.isFederationAdmin;
    const canManageFinances = permissions.canManageFinances;
    const onViewSportiv = (s: Sportiv) => { setSelectedSportiv(s); setActiveView('profil-sportiv'); };
    const isEmergencyAdmin = currentUser?.email === 'alin2u83@gmail.com';

    switch (activeView) {
      case 'admin-console':
        return renderProtected(<AdminConsole currentUser={currentUser!} userRoles={userRoles} activeRoleContext={activeRoleContext} sportivi={filteredData.sportivi} allRoles={allRoles} clubs={clubs} permissions={permissions} />, permissions.hasAdminAccess || isEmergencyAdmin);

      case 'dashboard':
      case 'my-portal':
        if (permissions.hasAdminAccess && activeRole !== 'Sportiv') {
            if (sportivi.length === 0 && !isEmergencyAdmin && !loading) {
                return <Card className="text-center p-8"><p className="text-slate-400 italic">Așteptare autorizare date sau nu există date pentru contextul selectat...</p></Card>
            }
            if (permissions.isFederationLevel && adminContext === 'federation') {
                return <FederationDashboard onNavigate={setActiveView} />;
            }
            return (
                <div className="space-y-8 animate-fade-in-down">
                    <header><h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1><p className="text-slate-400">Selectează un modul pentru a începe.</p></header>
                    <AdminDashboard sportivi={filteredData.sportivi} plati={filteredData.plati} istoricGrade={filteredData.istoricGrade} />
                    <AdminMasterMap onNavigate={setActiveView} deconturiFederatie={filteredData.deconturiFederatie} inscrieriExamene={filteredData.inscrieriExamene} plati={filteredData.plati} />
                </div>
            );
        }
        return <SportivDashboard currentUser={currentUser!} viewedUser={currentUser!} participari={filteredData.inscrieriExamene} examene={sesiuniExamene} grade={grade} istoricGrade={filteredData.istoricGrade} grupe={filteredData.grupe} plati={filteredData.plati} onNavigate={(view) => setActiveView(view)} antrenamente={filteredData.antrenamente} anunturi={anunturiPrezenta} setAnunturi={setAnunturiPrezenta} sportivi={filteredData.sportivi} permissions={permissions} canSwitchRoles={canSwitchRoles} activeRole={activeRole!} onSwitchRole={handleSwitchRole} isSwitchingRole={isSwitchingRole} />;
      
      case 'sportivi':
        return renderProtected(<SportiviManagement sportivi={filteredData.sportivi} setSportivi={setSportivi} grupe={filteredData.grupe} setGrupe={setGrupe} tipuriAbonament={filteredData.tipuriAbonament} familii={filteredData.familii} setFamilii={setFamilii} currentUser={currentUser!} plati={filteredData.plati} setPlati={setPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} onViewSportiv={onViewSportiv} clubs={clubs} grade={grade} permissions={permissions} allRoles={allRoles} setAllRoles={setAllRoles} vizualizarePlati={filteredData.vizualizarePlati} />, isAtLeastInstructor);

      case 'profil-sportiv':
        {/* FIX: Pass sportivi prop to UserProfile to resolve 'Cannot find name' error. */}
        return renderProtected(selectedSportiv ? <UserProfile sportiv={selectedSportiv} currentUser={currentUser!} participari={filteredData.inscrieriExamene} examene={sesiuniExamene} grade={grade} istoricGrade={filteredData.istoricGrade} setIstoricGrade={setIstoricGrade} antrenamente={filteredData.antrenamente} plati={filteredData.plati} tranzactii={filteredData.tranzactii} reduceri={filteredData.reduceri} grupe={filteredData.grupe} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} setSportivi={setSportivi} setPlati={setPlati} setTranzactii={setTranzactii} onBack={() => setActiveView('sportivi')} clubs={clubs} vizualizarePlati={filteredData.vizualizarePlati} sportivi={filteredData.sportivi} /> : null, isAtLeastInstructor);

      case 'structura-federatie':
        return renderProtected(<FederationStructure clubs={clubs} sportivi={sportivi} grupe={grupe} onBack={() => setActiveView('dashboard')} onNavigate={(view) => setActiveView(view)} />, isFederationAdmin);

      case 'examene': {
        const canManageExams = permissions.canGradeStudents;
        return <GestiuneExamene currentUser={currentUser!} clubs={clubs} onNavigate={(view) => setActiveView(view)} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} istoricGrade={istoricGrade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={onViewSportiv} isReadOnly={!canManageExams} />;
      }
        
      case 'stagii': case 'competitii':
        return renderProtected(<StagiiCompetitiiManagement type={activeView === 'stagii' ? 'Stagiu' : 'Competitie'} evenimente={filteredData.evenimente} setEvenimente={setEvenimente} rezultate={filteredData.rezultate} setRezultate={setRezultate} sportivi={filteredData.sportivi} preturiConfig={preturiConfig} inscrieriExamene={inscrieriExamene} examene={sesiuniExamene} grade={grade} setPlati={setPlati} currentUser={currentUser!} permissions={permissions}/>, permissions.isInstructor);

      case 'prezenta':
        return renderProtected(<PrezentaManagement currentUser={currentUser!} />, isAtLeastInstructor);
      
      case 'prezenta-instructor':
        return renderProtected(<InstructorPrezentaPage onNavigate={setActiveView} allClubSportivi={filteredData.sportivi} currentUser={currentUser!} grade={grade} />, permissions.isInstructor);
      
      case 'arhiva-prezente':
        return renderProtected(<ArhivaPrezente onBack={() => setActiveView('prezenta-instructor')} />, permissions.isInstructor);
        
      case 'raport-activitate':
        return renderProtected(<RaportActivitate currentUser={currentUser!} />, permissions.isInstructor);
      
      case 'raport-lunar-prezenta':
        return renderProtected(<RaportLunarPrezenta sportivi={filteredData.sportivi} grupe={filteredData.grupe} antrenamente={filteredData.antrenamente} grade={grade} />, isAtLeastInstructor);

      case 'grupe':
        return renderProtected(<GrupeManagement grupe={filteredData.grupe} setGrupe={setGrupe} currentUser={currentUser!} clubs={clubs} sportivi={filteredData.sportivi} />, isAtLeastInstructor);

      case 'activitati':
        return renderProtected(<ProgramareActivitati antrenamente={filteredData.antrenamente} setAntrenamente={setAntrenamente} grupe={filteredData.grupe} />, isAtLeastInstructor);

      case 'raport-prezenta':
        return renderProtected(<RaportPrezenta antrenamente={filteredData.antrenamente} sportivi={filteredData.sportivi} grupe={filteredData.grupe} onViewSportiv={onViewSportiv} />, isAtLeastInstructor);

      case 'calendar':
        return <CalendarView antrenamente={filteredData.antrenamente} sesiuniExamene={filteredData.sesiuniExamene} evenimente={filteredData.evenimente} grupe={filteredData.grupe} locatii={locatii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser!} sportivi={filteredData.sportivi} rezultate={filteredData.rezultate} setRezultate={setRezultate} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} permissions={permissions} />;

      case 'financial-dashboard':
        return renderProtected(<FinancialDashboard plati={filteredData.plati} tranzactii={filteredData.tranzactii} sportivi={filteredData.sportivi} familii={filteredData.familii} />, isAtLeastClubAdmin);

      case 'gestiune-facturi':
        return renderProtected(<GestiuneFacturi currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} tipuriPlati={tipuriPlati} familii={filteredData.familii} />, canManageFinances);

      case 'deconturi-federatie':
        return renderProtected(<FederationInvoices deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} currentUser={currentUser!} permissions={permissions} />, isAtLeastClubAdmin);

      case 'plati-scadente':
        return renderProtected(<PlatiScadente plati={filteredData.plati} inscrieriExamene={filteredData.inscrieriExamene} grade={grade} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} tranzactii={tranzactii} reduceri={reduceri} onIncaseazaMultiple={handleIncaseazaMultiple} onViewSportiv={onViewSportiv} currentUser={currentUser!} clubs={clubs} permissions={permissions} />, canManageFinances);

      case 'jurnal-incasari':
        return renderProtected(<JurnalIncasari currentUser={currentUser!} plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} preturiConfig={preturiConfig} tipuriAbonament={filteredData.tipuriAbonament} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} platiInitiale={platiPentruIncasare} onIncasareProcesata={handleIncasareProcesata} onBack={handleJurnalBack} reduceri={reduceri} />, canManageFinances);

      case 'raport-financiar':
        return renderProtected(<RaportFinanciar plati={filteredData.plati} sportivi={filteredData.sportivi} familii={filteredData.familii} tranzactii={filteredData.tranzactii} />, isAtLeastClubAdmin);

      case 'user-management':
        return renderProtected(<UserManagement sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser!} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} clubs={clubs} permissions={permissions} />, isAtLeastClubAdmin);

      case 'cluburi':
        return renderProtected(<CluburiManagement clubs={clubs} setClubs={setClubs} currentUser={currentUser!} permissions={permissions} />, isFederationAdmin);
      
      case 'data-maintenance':
        return renderProtected(<BackupManager onDataRestored={() => window.location.reload()} sportivi={sportivi} setSportivi={setSportivi} grade={grade} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} setPlati={setPlati} familii={familii} onNavigate={(view) => setActiveView(view)} currentUser={currentUser!} />, isFederationAdmin);
      
      case 'rapoarte-examen':
        return renderProtected(<RapoarteExamen currentUser={currentUser!} clubs={clubs} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} onViewSportiv={onViewSportiv} />, permissions.isInstructor);
      
      case 'setari-club':
        return renderProtected(<ClubSettings />, isAtLeastClubAdmin);
        
      case 'tipuri-abonament':
        return renderProtected(<TipuriAbonamentManagement tipuriAbonament={filteredData.tipuriAbonament} setTipuriAbonament={setTipuriAbonament} currentUser={currentUser!} clubs={clubs}/>, isAtLeastClubAdmin);

      case 'configurare-preturi':
        return renderProtected(<ConfigurarePreturi grade={grade} />, isAtLeastClubAdmin);

      case 'grade':
        return renderProtected(<GradeManagement grade={grade} setGrade={setGrade} />, isAtLeastClubAdmin);

      case 'reduceri':
        return renderProtected(<ReduceriManagement reduceri={reduceri} setReduceri={setReduceri} />, isAtLeastClubAdmin);
      
      case 'nomenclatoare':
        return renderProtected(<GestionareNomenclatoare tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} plati={plati} />, isAtLeastClubAdmin);

      case 'familii':
        return renderProtected(<FamiliiManagement familii={filteredData.familii} setFamilii={setFamilii} sportivi={filteredData.sportivi} setSportivi={setSportivi} tipuriAbonament={filteredData.tipuriAbonament} grupe={filteredData.grupe} currentUser={currentUser!} />, isAtLeastInstructor);
        
      case 'notificari':
        return renderProtected(<Notificari currentUser={currentUser!}/>, isAtLeastInstructor);
      
      case 'taxe-anuale':
        return renderProtected(<TaxeAnuale currentUser={currentUser!} sportivi={filteredData.sportivi} plati={filteredData.plati} setPlati={setPlati} />, isAtLeastClubAdmin);

      case 'istoric-prezenta':
        return <MartialAttendance currentUser={currentUser!} antrenamente={antrenamente} grupe={grupe} />;

      case 'istoric-plati':
        return <IstoricPlati viewedUser={currentUser!} vizualizarePlati={vizualizarePlati} />;

      case 'account-settings':
        return <AccountSettings currentUser={currentUser!} userRoles={userRoles} />;
      
      case 'fisa-digitala':
        return <FisaDigitalaSportiv currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} />;

      case 'fisa-competitie':
        return <FisaCompetitie currentUser={currentUser!} grade={grade} participari={inscrieriExamene} examene={sesiuniExamene} />;

      case 'backdoor-check':
        return <BackdoorCheck currentUser={currentUser!} />;
        
      case 'backdoor-test':
        return <BackdoorTest currentUser={currentUser!} activeRole={activeRole!} userRoles={userRoles} />;

      default:
         return <div>Lipsește Vizualizarea</div>;
    }
  };
  
  if ((loading || clubFilterLoading) && isMobile) {
      return <MobileSkeletonLoader />;
  }

  return (
    <SystemGuardian isLoading={loading || clubFilterLoading} currentUser={currentUser} permissions={permissions} error={error}>
      {isSwitchingRole && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in-down">
            <svg className="animate-spin h-10 w-10 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-white text-lg font-bold">Se verifică gradul și permisiunile în contextul {switchingToRole}...</p>
        </div>
      )}
      {!session ? <AuthContainer /> :
       needsRoleSelection ? <RoleSelectionPage roles={userRoles} onSelect={handleSelectRole} loading={isSwitchingRole} onLogout={handleLogout} /> :
       currentUser ? (
            <div className="flex min-h-screen bg-[var(--bg-main)]">
              <Sidebar currentUser={currentUser} onNavigate={setActiveView} onLogout={handleLogout} activeView={activeView} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} clubs={clubs} globalClubFilter={globalClubFilter} setGlobalClubFilter={setGlobalClubFilter} permissions={permissions} activeRole={activeRole!} canSwitchRoles={canSwitchRoles} onSwitchRole={handleSwitchRole} isSwitchingRole={isSwitchingRole} grade={grade} />
              
              <Header 
                activeView={activeView}
                onBack={handleBackToDashboard}
                currentUser={currentUser}
                permissions={permissions}
                onNavigate={setActiveView}
                onLogout={handleLogout}
              />

              <main className={`flex-1 transition-all duration-300 pt-16 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                  {permissions.isMultiContextAdmin && permissions.hasAdminAccess && <GlobalContextSwitcher activeContext={adminContext} onContextChange={setAdminContext} />}
                  <ErrorBoundary onNavigate={setActiveView}>
                    {renderContent()}
                  </ErrorBoundary>
                </div>
              </main>

              {(import.meta as any).env.DEV && currentUser && (<AdminDebugFloatingPanel currentUser={currentUser} userRoles={userRoles} onNavigate={(view) => setActiveView(view)} />)}
            </div>
      ) : null}
    </SystemGuardian>
  );
}

export default App;
