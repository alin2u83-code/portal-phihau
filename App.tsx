import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, SesiuneExamen, Grad, InscriereExamen, View, Antrenament, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol, AnuntPrezenta, Reducere, AnuntGeneral, TipPlata, Locatie, Club, DecontFederatie } from './types';
import { FinalUnifiedDashboard } from './components/FinalUnifiedDashboard';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { GestiuneExamene } from './components/Examene';
import { GradeManagement } from './components/Grade';
import { PrezentaManagement } from './components/Prezenta';
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
import { SportivDashboard } from './components/SportivDashboard';
import { UserManagement } from './components/UserManagement';
import { Session } from '@supabase/supabase-js';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { BackupManager } from './components/BackupManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ProgramareActivitati } from './components/Activitati';
import { ClubSettings } from './components/ClubSettings';
import { AdminHeader } from './components/AdminHeader';
import { DataInspector } from './components/DataInspector';
import { ReduceriManagement } from './components/Reduceri';
import { Notificari } from './components/Notificari';
import { TaxeAnuale } from './components/TaxeAnuale';
import { GestionareNomenclatoare } from './components/GestionareNomenclatoare';
import { FinancialDashboard } from './components/FinancialDashboard';
import { CalendarView } from './components/CalendarView';
import { RapoarteExamen } from './components/RapoarteExamen';
import { CluburiManagement } from './components/CluburiManagement';
import { FederationStructure } from './components/FederationStructure';
import { usePermissions, Permissions } from './hooks/usePermissions';
import AccessDenied from './components/AccessDenied';
import { useClubFilter } from './hooks/useClubFilter';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import ErrorBoundary from './components/ErrorBoundary';
import { SystemGuardian } from './components/SystemGuardian';
import { RoleSwitcher } from './components/RoleSwitcher';
import { getAuthenticatedUser } from './utils/auth';
import { FederationInvoices } from './components/FederationInvoices';
import { MartialAttendance } from './components/MartialAttendance';
import { AccountSettings } from './components/AccountSettings';
import { GlobalContextSwitcher } from './components/GlobalContextSwitcher';
import { FederationDashboard } from './components/FederationDashboard';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const { showError } = useError();

  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [sesiuniExamene, setSesiuniExamene] = useState<SesiuneExamen[]>([]);
  const [inscrieriExamene, setInscrieriExamene] = useState<InscriereExamen[]>([]);
  const [grade, setGrade] = useState<Grad[]>([]);
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

  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
  const [adminContext, setAdminContext] = useLocalStorage<'club' | 'federation'>('phi-hau-admin-context', 'club');

  const permissions = usePermissions(currentUser);
  const { activeClubId, globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser);

  const initializeAndFetchData = useCallback(async () => {
    if (!supabase) return;

    // Safety check: ensure a session exists before attempting to fetch user-specific data.
    // This helps prevent errors during logout transitions.
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
        setCurrentUser(null);
        setSession(null);
        setLoading(false); // Stop loading screen
        return;
    }

    setLoading(true);
    setProfileError(null);

    const { user: profile, error: profileFetchError } = await getAuthenticatedUser(supabase);

    if (profileFetchError) {
        showError("Eroare Critică la Preluarea Profilului", profileFetchError);
        setProfileError(profileFetchError.message);
        setLoading(false);
        await supabase.auth.signOut();
        setCurrentUser(null);
        setSession(null);
        return;
    }

    if (!profile) {
        setCurrentUser(null);
        setSession(null);
        setLoading(false);
        return;
    }

    setCurrentUser(profile);
    setSession(currentSession);

    if (profile.trebuie_schimbata_parola) {
        showError(
            "Securitate Cont",
            "Este necesar să vă schimbați parola. Aceasta este temporară sau a expirat."
        );
    }

    try {
        const [
            { data: clubsData }, { data: rolesData }, { data: gradesData }, { data: groupsData },
            { data: subscriptionTypesData }, { data: locatiiData }, { data: platiTypesData },
            { data: reduceriData }, { data: sportiviData }, { data: sessionsData },
            { data: registrationsData }, { data: trainingsData }, { data: platiData },
            { data: tranzactiiData }, { data: eventsData }, { data: resultsData },
            { data: familiesData }, { data: anunturiData }, { data: pricesData }, { data: deconturiData }
        ] = await Promise.all([
            supabase.from('cluburi').select('*'),
            supabase.from('roluri').select('*'),
            supabase.from('grade').select('*'),
            supabase.from('grupe').select('*'),
            supabase.from('tipuri_abonament').select('*'),
            supabase.from('nom_locatii').select('*'),
            supabase.from('tipuri_plati').select('*'),
            supabase.from('reduceri').select('*'),
            supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))'),
            supabase.from('sesiuni_examene').select('*'),
            supabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)'),
            supabase.from('program_antrenamente').select('*, prezenta_antrenament!antrenament_id(sportiv_id)'),
            supabase.from('plati').select('*'),
            supabase.from('tranzactii').select('*'),
            supabase.from('evenimente').select('*'),
            supabase.from('rezultate').select('*'),
            supabase.from('familii').select('*'),
            supabase.from('anunturi_prezenta').select('*'),
            supabase.from('preturi_config').select('*'),
            supabase.from('deconturi_federatie').select('*'),
        ]);
        
        const clubsMap = new Map((clubsData || []).map(c => [c.id, c]));

        const allSportivi = sportiviData?.map(s => ({
            ...s,
            roluri: (((s as any).sportivi_roluri?.map((sr: any) => sr.roluri)) || []).filter(Boolean),
            cluburi: s.club_id ? (clubsMap.get(s.club_id) || { id: s.club_id, nume: 'Club Indisponibil' }) : null
        })) || [];

        setSportivi(allSportivi as Sportiv[]);
        setSesiuniExamene(sessionsData || []);
        setInscrieriExamene(registrationsData || []);
        setAntrenamente(trainingsData?.map(t => ({ ...t, sportivi_prezenti_ids: (t as any).prezenta_antrenament?.map((p: any) => p.sportiv_id) || [] })) || []);
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
        setGrupe(groupsData || []);
        setTipuriAbonament(subscriptionTypesData || []);
        setLocatii(locatiiData || []);
        setTipuriPlati(platiTypesData || []);
        setReduceri(reduceriData || []);
        setDeconturiFederatie(deconturiData || []);

    } catch (err: any) {
        setProfileError(err.message);
        showError("Eroare la încărcarea datelor aplicației", err);
    } finally {
        setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!supabase) return;

    // Fetch data on initial component mount.
    initializeAndFetchData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // When the user signs out, `event` is 'SIGNED_OUT' and `session` is null.
        // We explicitly clear the user and session state to prevent any further
        // data fetching attempts for a logged-out user, thus avoiding AuthSessionMissingError.
        if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setSession(null);
        } 
        // For all other events (like SIGNED_IN, TOKEN_REFRESHED), `session` will be available.
        // We can safely update our local session state and trigger a data refresh.
        else if (session) {
            setSession(session);
            initializeAndFetchData();
        }
    });

    return () => subscription.unsubscribe();
  }, [initializeAndFetchData]);

  const filteredData = useMemo(() => {
    if (!activeClubId) {
        return {
            sportivi, sesiuniExamene, inscrieriExamene, antrenamente, grupe, plati,
            tranzactii, evenimente, rezultate, tipuriAbonament, familii,
            anunturiPrezenta, reduceri, deconturiFederatie
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
    };
}, [
    activeClubId, sportivi, sesiuniExamene, inscrieriExamene, antrenamente,
    grupe, plati, tranzactii, evenimente, rezultate, tipuriAbonament,
    familii, anunturiPrezenta, reduceri, deconturiFederatie
]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const renderContent = () => {
    if (!currentUser) return <AuthContainer />;
    if (currentUser.trebuie_schimbata_parola) return <MandatoryPasswordChange currentUser={currentUser} onPasswordChanged={initializeAndFetchData} />;
    
    switch (activeView) {
      case 'dashboard':
      case 'my-portal':
        if (permissions.isSuperAdmin && adminContext === 'federation') {
            return <FederationDashboard onNavigate={setActiveView} />;
        }
        return <FinalUnifiedDashboard 
            currentUser={currentUser} 
            onNavigate={setActiveView} 
            deconturiFederatie={filteredData.deconturiFederatie} 
            permissions={permissions} 
            inscrieriExamene={filteredData.inscrieriExamene}
            plati={filteredData.plati}
            antrenamente={filteredData.antrenamente}
            anunturi={filteredData.anunturiPrezenta}
            setAnunturi={setAnunturiPrezenta}
            sportivi={filteredData.sportivi}
            grade={grade}
            grupe={filteredData.grupe}
            sesiuniExamene={filteredData.sesiuniExamene}
        />;

      case 'sportivi':
        return <SportiviManagement onBack={() => setActiveView('dashboard')} sportivi={filteredData.sportivi} setSportivi={setSportivi} grupe={filteredData.grupe} setGrupe={setGrupe} tipuriAbonament={filteredData.tipuriAbonament} familii={filteredData.familii} setFamilii={setFamilii} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={currentUser} plati={filteredData.plati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} onViewSportiv={(s) => { setSelectedSportiv(s); setActiveView('profil-sportiv'); }} clubs={clubs} grade={grade} />;

      case 'profil-sportiv':
        return selectedSportiv ? <UserProfile sportiv={selectedSportiv} currentUser={currentUser} participari={inscrieriExamene} examene={sesiuniExamene} grade={grade} antrenamente={antrenamente} plati={plati} tranzactii={tranzactii} reduceri={reduceri} grupe={grupe} familii={familii} tipuriAbonament={tipuriAbonament} allRoles={allRoles} setSportivi={setSportivi} setPlati={setPlati} setTranzactii={setTranzactii} onBack={() => setActiveView('sportivi')} clubs={clubs} /> : null;

      case 'structura-federatie':
        return permissions.isFederationAdmin ? <FederationStructure clubs={clubs} sportivi={sportivi} grupe={grupe} onBack={() => setActiveView('dashboard')} onNavigate={setActiveView} /> : <AccessDenied onBack={() => setActiveView('dashboard')} />;

      case 'examene':
        return <GestiuneExamene currentUser={currentUser} clubs={clubs} onBack={() => setActiveView('dashboard')} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} />;

      case 'prezenta':
        return <PrezentaManagement sportivi={filteredData.sportivi} setSportivi={setSportivi} antrenamente={filteredData.antrenamente} setAntrenamente={setAntrenamente} grupe={filteredData.grupe} onBack={() => setActiveView('dashboard')} setPlati={setPlati} tipuriAbonament={filteredData.tipuriAbonament} anunturi={filteredData.anunturiPrezenta} />;

      case 'grupe':
        return <GrupeManagement grupe={filteredData.grupe} setGrupe={setGrupe} onBack={() => setActiveView('dashboard')} currentUser={currentUser} clubs={clubs} />;

      case 'calendar':
        return <CalendarView antrenamente={filteredData.antrenamente} sesiuniExamene={filteredData.sesiuniExamene} evenimente={filteredData.evenimente} grupe={filteredData.grupe} locatii={locatii} onBack={() => setActiveView('dashboard')} onNavigate={setActiveView} currentUser={currentUser} sportivi={filteredData.sportivi} rezultate={filteredData.rezultate} setRezultate={setRezultate} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} />;

      case 'financial-dashboard':
        return <FinancialDashboard plati={filteredData.plati} tranzactii={filteredData.tranzactii} sportivi={filteredData.sportivi} onBack={() => setActiveView('dashboard')} />;

      case 'deconturi-federatie':
        return <FederationInvoices deconturi={filteredData.deconturiFederatie} setDeconturi={setDeconturiFederatie} currentUser={currentUser} onBack={() => setActiveView('dashboard')} />;

      case 'plati-scadente':
        return <PlatiScadente plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} tipuriAbonament={filteredData.tipuriAbonament} tranzactii={filteredData.tranzactii} reduceri={reduceri} onIncaseazaMultiple={(p) => setActiveView('jurnal-incasari')} onBack={() => setActiveView('dashboard')} />;

      case 'jurnal-incasari':
        return <JurnalIncasari currentUser={currentUser} plati={filteredData.plati} setPlati={setPlati} sportivi={filteredData.sportivi} familii={filteredData.familii} preturiConfig={preturiConfig} tipuriAbonament={filteredData.tipuriAbonament} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={filteredData.tranzactii} setTranzactii={setTranzactii} platiInitiale={[]} onIncasareProcesata={initializeAndFetchData} onBack={() => setActiveView('dashboard')} reduceri={reduceri} />;

      case 'user-management':
        return <UserManagement sportivi={filteredData.sportivi} setSportivi={setSportivi} currentUser={currentUser} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} onBack={() => setActiveView('dashboard')} clubs={clubs} />;

      case 'cluburi':
        return <CluburiManagement clubs={clubs} setClubs={setClubs} onBack={() => setActiveView('dashboard')} currentUser={currentUser} />;
      
      case 'istoric-prezenta':
        return <MartialAttendance currentUser={currentUser} antrenamente={antrenamente} grupe={grupe} onBack={() => setActiveView('my-portal')} />;

      case 'account-settings':
        return <AccountSettings currentUser={currentUser} onBack={() => setActiveView('my-portal')} />;

      case 'data-maintenance':
        return <BackupManager onBack={() => setActiveView('dashboard')} onDataRestored={() => window.location.reload()} sportivi={sportivi} setSportivi={setSportivi} grade={grade} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} plati={plati} setPlati={setPlati} familii={familii} onNavigate={setActiveView} />;
      
      case 'rapoarte-examen':
        return <RapoarteExamen currentUser={currentUser} clubs={clubs} onBack={() => setActiveView('dashboard')} sesiuni={filteredData.sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={filteredData.inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={filteredData.sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={filteredData.plati} setPlati={setPlati} preturiConfig={preturiConfig} deconturiFederatie={filteredData.deconturiFederatie} setDeconturiFederatie={setDeconturiFederatie} />;
      
      case 'setari-club':
        return <ClubSettings onBack={() => setActiveView('dashboard')} />;

      default:
        return <FinalUnifiedDashboard 
            currentUser={currentUser} 
            onNavigate={setActiveView} 
            deconturiFederatie={deconturiFederatie} 
            permissions={permissions} 
            inscrieriExamene={inscrieriExamene}
            plati={plati}
            antrenamente={antrenamente}
            anunturi={anunturiPrezenta}
            setAnunturi={setAnunturiPrezenta}
            sportivi={sportivi}
            grade={grade}
            grupe={grupe}
            sesiuniExamene={sesiuniExamene}
        />;
    }
  };

  return (
    <SystemGuardian isLoading={loading} currentUser={currentUser} permissions={permissions} error={profileError}>
      {session ? (
        <div className="flex min-h-screen bg-[var(--bg-main)]">
          <Sidebar 
            currentUser={currentUser!} 
            onNavigate={setActiveView} 
            onLogout={handleLogout} 
            activeView={activeView} 
            isExpanded={isSidebarExpanded} 
            setIsExpanded={setIsSidebarExpanded} 
            plati={filteredData.plati}
            clubs={clubs}
            globalClubFilter={globalClubFilter}
            setGlobalClubFilter={setGlobalClubFilter}
            permissions={permissions}
          />
          <main className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
            <AdminHeader currentUser={currentUser!} onNavigate={setActiveView} onLogout={handleLogout} plati={filteredData.plati} permissions={permissions} />
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              {permissions.isSuperAdmin && activeView === 'dashboard' && <GlobalContextSwitcher activeContext={adminContext} onContextChange={setAdminContext} />}
              <ErrorBoundary onNavigate={setActiveView}>
                {renderContent()}
              </ErrorBoundary>
            </div>
          </main>
          {(import.meta as any).env.DEV && currentUser && (
            <RoleSwitcher 
                currentUser={currentUser} 
                onNavigate={setActiveView}
                activeView={activeView}
            />
          )}
        </div>
      ) : (
        <AuthContainer />
      )}
    </SystemGuardian>
  );
}

export default App;